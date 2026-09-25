/**
 * SolveSync Synchronization Queue
 * Manages reliable asynchronous submission delivery, retries, and offline queueing.
 */

import { createSyncJob } from './models.js';

export class SyncQueue {
  constructor(storageService) {
    this.storage = storageService;
    this.maxAttempts = 3;
  }

  async getAll() {
    return await this.storage.getQueue();
  }

  async saveAll(queue) {
    await this.storage.setQueue(queue);
  }

  /**
   * Adds a new submission to the queue
   * @param {Object} submission Normalized Submission
   * @returns {Promise<Object>} Created SyncJob
   */
  async enqueue(submission) {
    const queue = await this.getAll();
    const job = createSyncJob(submission);
    queue.push(job);
    await this.saveAll(queue);
    return job;
  }

  /**
   * Finds the next eligible job to process
   */
  async getNextEligibleJob() {
    const queue = await this.getAll();
    return (
      queue.find(
        j => j.state === 'pending' || (j.state === 'failed' && j.attempts < this.maxAttempts)
      ) || null
    );
  }

  /**
   * Updates state and attempts for a job
   */
  async updateJob(jobId, updates = {}) {
    const queue = await this.getAll();
    const index = queue.findIndex(j => j.id === jobId);
    if (index === -1) return null;

    queue[index] = {
      ...queue[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.saveAll(queue);
    return queue[index];
  }

  /**
   * Marks a job as in-progress (uploading)
   */
  async markUploading(jobId) {
    return await this.updateJob(jobId, { state: 'uploading' });
  }

  /**
   * Marks a job as successfully uploaded
   */
  async markSuccess(jobId) {
    return await this.updateJob(jobId, { state: 'success', lastError: null });
  }

  /**
   * Marks a job as failed, recording error and incrementing attempts
   */
  async markFailed(jobId, error) {
    const queue = await this.getAll();
    const job = queue.find(j => j.id === jobId);
    if (!job) return null;

    const attempts = (job.attempts || 0) + 1;
    return await this.updateJob(jobId, {
      state: 'failed',
      attempts,
      lastError: error?.message || String(error),
    });
  }

  /**
   * Removes a job from the queue
   */
  async removeJob(jobId) {
    const queue = await this.getAll();
    const filtered = queue.filter(j => j.id !== jobId);
    await this.saveAll(filtered);
  }

  /**
   * Purges successfully completed jobs
   */
  async clearCompleted() {
    const queue = await this.getAll();
    const pendingOnly = queue.filter(j => j.state !== 'success');
    await this.saveAll(pendingOnly);
  }
}
