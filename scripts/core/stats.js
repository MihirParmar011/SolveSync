/**
 * SolveSync Statistics Service
 * Manages platform-aware problem solving metrics and repository stats.json synchronization.
 */

export class StatsService {
  /**
   * Creates initial empty stats object
   */
  static createEmptyStats() {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      totals: {
        solved: 0,
      },
      platforms: {
        leetcode: { solved: 0, easy: 0, medium: 0, hard: 0 },
        geeksforgeeks: { solved: 0, easy: 0, medium: 0, hard: 0 },
        codechef: { solved: 0, easy: 0, medium: 0, hard: 0 },
        hackerrank: { solved: 0, easy: 0, medium: 0, hard: 0 },
      },
    };
  }

  /**
   * Normalizes incoming raw or legacy stats into the platform-aware format
   */
  static normalizeStats(raw) {
    if (!raw) return this.createEmptyStats();

    // Already in version 1 format
    if (raw.version === 1 && raw.platforms) {
      return {
        ...this.createEmptyStats(),
        ...raw,
        totals: { ...raw.totals },
        platforms: {
          ...this.createEmptyStats().platforms,
          ...raw.platforms,
        },
      };
    }

    // Convert legacy format { solved, easy, medium, hard, sha }
    const base = this.createEmptyStats();
    if (typeof raw.solved === 'number') {
      base.totals.solved = raw.solved;
      base.platforms.leetcode = {
        solved: raw.solved || 0,
        easy: raw.easy || 0,
        medium: raw.medium || 0,
        hard: raw.hard || 0,
      };
      if (raw.sha) base.sha = raw.sha;
    }

    return base;
  }

  /**
   * Records a new accepted problem submission into stats
   * @param {Object} currentStats
   * @param {Object} submission Normalized Submission
   * @returns {Object} Updated stats
   */
  static recordSubmission(currentStats, submission) {
    const stats = this.normalizeStats(currentStats);
    const platform = (submission.platform || 'leetcode').toLowerCase();
    const difficulty = submission.problem?.difficulty?.toLowerCase();

    // Ensure platform entry exists
    if (!stats.platforms[platform]) {
      stats.platforms[platform] = { solved: 0, easy: 0, medium: 0, hard: 0 };
    }

    // Increment counts
    stats.totals.solved = (stats.totals.solved || 0) + 1;
    stats.platforms[platform].solved = (stats.platforms[platform].solved || 0) + 1;

    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      stats.platforms[platform][difficulty] = (stats.platforms[platform][difficulty] || 0) + 1;
    }

    stats.updatedAt = new Date().toISOString();
    return stats;
  }

  /**
   * Merges remote stats from GitHub with local stats (taking the higher counts)
   */
  static mergeStats(local, remote) {
    const normLocal = this.normalizeStats(local);
    const normRemote = this.normalizeStats(remote);

    const merged = this.createEmptyStats();
    merged.updatedAt = new Date().toISOString();
    if (normRemote.sha) merged.sha = normRemote.sha;

    const allPlatforms = new Set([
      ...Object.keys(normLocal.platforms),
      ...Object.keys(normRemote.platforms),
    ]);

    let totalSolved = 0;

    for (const p of allPlatforms) {
      const l = normLocal.platforms[p] || { solved: 0, easy: 0, medium: 0, hard: 0 };
      const r = normRemote.platforms[p] || { solved: 0, easy: 0, medium: 0, hard: 0 };

      merged.platforms[p] = {
        solved: Math.max(l.solved || 0, r.solved || 0),
        easy: Math.max(l.easy || 0, r.easy || 0),
        medium: Math.max(l.medium || 0, r.medium || 0),
        hard: Math.max(l.hard || 0, r.hard || 0),
      };

      totalSolved += merged.platforms[p].solved;
    }

    merged.totals.solved = totalSolved;
    return merged;
  }

  /**
   * Exports stats in legacy format for backward compatibility with existing UI
   */
  static toLegacyFormat(stats) {
    const normalized = this.normalizeStats(stats);
    const lc = normalized.platforms.leetcode || { solved: 0, easy: 0, medium: 0, hard: 0 };
    return {
      solved: normalized.totals.solved || lc.solved || 0,
      easy: lc.easy || 0,
      medium: lc.medium || 0,
      hard: lc.hard || 0,
      sha: normalized.sha || null,
    };
  }
}
