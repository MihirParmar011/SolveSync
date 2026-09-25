/**
 * SolveSync Synchronization Engine
 * Central orchestrator connecting Platform Adapters -> Normalized Submission -> File Generator -> GitHub Client.
 */

import { FileGenerator } from './generator.js';
import { StatsService } from './stats.js';
import { defaultStorage } from './storage.js';
import { GitHubClient } from './github.js';
import { SyncQueue } from './queue.js';

export class SyncEngine {
  constructor({ storage = defaultStorage, githubClient = null, queue = null } = {}) {
    this.storage = storage;
    this.github = githubClient || new GitHubClient();
    this.queue = queue || new SyncQueue(this.storage);
  }

  /**
   * Validates a submission before attempting to synchronize
   */
  validateSubmission(submission) {
    if (!submission) throw new Error('Submission is null or undefined');
    if (!submission.problem?.title) throw new Error('Problem title is missing');
    if (!submission.problem?.slug) throw new Error('Problem slug is missing');
    if (!submission.submission?.code) throw new Error('Submission code is missing');
  }

  /**
   * Primary entry point: Synchronizes a submission to the user's GitHub repository
   * @param {Object} submission Normalized Submission
   * @returns {Promise<{ success: boolean, filesUploaded: string[], error?: string }>}
   */
  async sync(submission) {
    this.validateSubmission(submission);

    const token = await this.storage.getToken();
    if (!token) {
      throw new Error('SolveSync: Not authenticated with GitHub. Please log in.');
    }

    const hook = await this.storage.getHook();
    if (!hook) {
      throw new Error('SolveSync: No repository linked. Please select a repository.');
    }

    const [owner, repo] = hook.split('/');
    if (!owner || !repo) {
      throw new Error(`SolveSync: Invalid repository hook '${hook}'`);
    }

    this.github.setToken(token);
    const settings = await this.storage.getSettings();

    // Generate files
    const files = FileGenerator.generate(submission, {
      directoryPrefix: settings.directoryPrefix,
      groupByPlatform: settings.groupByPlatform,
    });
    const commitMsg = FileGenerator.generateCommitMessage(submission);

    const uploaded = [];

    try {
      // 1. Upload solution file and problem README
      for (const file of files) {
        await this.github.createOrUpdateFile(owner, repo, file.path, file.content, commitMsg);
        uploaded.push(file.path);
      }

      // 2. Update stats.json in repository if enabled
      if (settings.includeStatsJson !== false) {
        await this.syncRepositoryStats(owner, repo, submission);
      }

      // 3. Record in local history
      await this.storage.recordHistory({
        platform: submission.platform,
        title: submission.problem.title,
        difficulty: submission.problem.difficulty,
        url: submission.problem.url,
        timestamp: new Date().toISOString(),
        files: uploaded,
      });

      return {
        success: true,
        filesUploaded: uploaded,
      };
    } catch (err) {
      console.error('SolveSync: Sync failed, enqueueing for retry...', err);
      // Enqueue job for background retry
      await this.queue.enqueue(submission);
      throw err;
    }
  }

  /**
   * Syncs and updates the stats.json file in the repository root
   */
  async syncRepositoryStats(owner, repo, submission) {
    try {
      const statsFile = await this.github.getFile(owner, repo, 'stats.json');
      let currentStats = null;
      let existingSha = null;

      if (statsFile.exists && statsFile.decodedContent) {
        try {
          currentStats = JSON.parse(statsFile.decodedContent);
          existingSha = statsFile.sha;
        } catch (e) {
          console.warn('Could not parse remote stats.json; starting fresh');
        }
      }

      // Also merge with local storage stats
      const localStats = await this.storage.getStats();
      const merged = StatsService.mergeStats(localStats, currentStats);
      const updatedStats = StatsService.recordSubmission(merged, submission);

      // Save locally
      await this.storage.setStats(updatedStats);

      // Commit updated stats.json
      await this.github.createOrUpdateFile(
        owner,
        repo,
        'stats.json',
        JSON.stringify(updatedStats, null, 2),
        `Update stats.json - SolveSync`,
        null,
        existingSha
      );
    } catch (err) {
      console.warn('SolveSync: Non-fatal error while updating stats.json:', err);
    }
  }

  /**
   * Flushes and retries pending jobs from the sync queue
   */
  async processQueue() {
    let job = await this.queue.getNextEligibleJob();
    while (job) {
      await this.queue.markUploading(job.id);
      try {
        await this.sync(job.submission);
        await this.queue.markSuccess(job.id);
      } catch (err) {
        await this.queue.markFailed(job.id, err);
      }
      job = await this.queue.getNextEligibleJob();
    }
  }
}

export const defaultEngine = new SyncEngine();
