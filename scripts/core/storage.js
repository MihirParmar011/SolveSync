/**
 * SolveSync Storage Service
 * Unified abstraction over Chrome/Firefox extension storage with memory fallback.
 */

export class StorageService {
  constructor(customBackend = null) {
    this._backend = customBackend || this._resolveBackend();
    this._memoryStore = {};
  }

  _resolveBackend() {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return chrome.storage.local;
    }
    if (typeof browser !== 'undefined' && browser.storage?.local) {
      return browser.storage.local;
    }
    return null;
  }

  /**
   * Retrieves one or more keys from storage
   * @param {string|string[]|Object} keys
   * @returns {Promise<Object>}
   */
  async get(keys) {
    if (this._backend && typeof this._backend.get === 'function') {
      return new Promise((resolve, reject) => {
        try {
          this._backend.get(keys, result => {
            if (chrome?.runtime?.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(result || {});
            }
          });
        } catch (err) {
          reject(err);
        }
      });
    }

    // Memory fallback
    if (typeof keys === 'string') {
      return { [keys]: this._memoryStore[keys] };
    }
    if (Array.isArray(keys)) {
      const res = {};
      keys.forEach(k => {
        if (this._memoryStore[k] !== undefined) res[k] = this._memoryStore[k];
      });
      return res;
    }
    return { ...this._memoryStore };
  }

  /**
   * Sets one or more key-value pairs in storage
   * @param {Object} items
   * @returns {Promise<void>}
   */
  async set(items) {
    if (this._backend && typeof this._backend.set === 'function') {
      return new Promise((resolve, reject) => {
        try {
          this._backend.set(items, () => {
            if (chrome?.runtime?.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        } catch (err) {
          reject(err);
        }
      });
    }

    // Memory fallback
    Object.assign(this._memoryStore, items);
  }

  /**
   * Removes one or more keys from storage
   * @param {string|string[]} keys
   * @returns {Promise<void>}
   */
  async remove(keys) {
    if (this._backend && typeof this._backend.remove === 'function') {
      return new Promise((resolve, reject) => {
        try {
          this._backend.remove(keys, () => {
            if (chrome?.runtime?.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        } catch (err) {
          reject(err);
        }
      });
    }

    const keyList = Array.isArray(keys) ? keys : [keys];
    keyList.forEach(k => delete this._memoryStore[k]);
  }

  /**
   * Clear all stored values
   * @returns {Promise<void>}
   */
  async clear() {
    if (this._backend && typeof this._backend.clear === 'function') {
      return new Promise((resolve, reject) => {
        this._backend.clear(() => resolve());
      });
    }
    this._memoryStore = {};
  }

  // --- Convenience Accessors ---

  async getToken() {
    const data = await this.get('solvesync_token');
    return data.solvesync_token || null;
  }

  async setToken(token) {
    await this.set({ solvesync_token: token });
  }

  async getUsername() {
    const data = await this.get('solvesync_username');
    return data.solvesync_username || null;
  }

  async setUsername(username) {
    await this.set({ solvesync_username: username });
  }

  async getHook() {
    const data = await this.get('solvesync_hook');
    return data.solvesync_hook || null;
  }

  async setHook(hook) {
    await this.set({ solvesync_hook: hook, mode_type: 'commit' });
  }

  async getStats() {
    const data = await this.get(['solvesync_stats', 'stats']);
    return data.solvesync_stats || data.stats || null;
  }

  async setStats(stats) {
    // Save both the platform-aware model and legacy 'stats' for backward compatibility
    await this.set({
      solvesync_stats: stats,
      stats: stats.platforms?.leetcode || stats,
    });
  }

  async getQueue() {
    const data = await this.get('solvesync_queue');
    return Array.isArray(data.solvesync_queue) ? data.solvesync_queue : [];
  }

  async setQueue(queue) {
    await this.set({ solvesync_queue: queue });
  }

  async getHistory() {
    const data = await this.get('solvesync_history');
    return Array.isArray(data.solvesync_history) ? data.solvesync_history : [];
  }

  async recordHistory(item) {
    const history = await this.getHistory();
    history.unshift({
      ...item,
      id: item.id || `hist_${Date.now()}`,
      timestamp: item.timestamp || new Date().toISOString(),
    });
    // Keep last 50 entries
    await this.set({ solvesync_history: history.slice(0, 50) });
  }

  async getSettings() {
    const data = await this.get('solvesync_settings');
    return {
      autoSync: true,
      directoryPrefix: '',
      includeStatsJson: true,
      platforms: {
        leetcode: true,
        geeksforgeeks: true,
        codechef: true,
        hackerrank: true,
      },
      ...(data.solvesync_settings || {}),
    };
  }

  async updateSettings(updates) {
    const current = await this.getSettings();
    await this.set({ solvesync_settings: { ...current, ...updates } });
  }

  async clearAuth() {
    await this.remove([
      'solvesync_token',
      'solvesync_username',
      'solvesync_hook',
      'mode_type',
      'pipe_solvesync',
      'solvesync_oauth_state',
    ]);
  }

  async unlinkRepo() {
    await this.remove(['solvesync_hook', 'mode_type']);
  }
}

export const defaultStorage = new StorageService();
