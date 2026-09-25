/**
 * SolveSync Base Platform Adapter
 * Base class defining the contract for platform-specific submission extractors.
 */

export class PlatformAdapter {
  /**
   * @param {string} platform Identifier ('leetcode', 'geeksforgeeks', etc.)
   */
  constructor(platform) {
    if (!platform) throw new Error('PlatformAdapter requires a platform identifier');
    this.platform = platform;
  }

  /**
   * Returns true if this adapter handles the given URL
   * @param {string} url
   * @returns {boolean}
   */
  matches(url) {
    throw new Error('PlatformAdapter.matches(url) must be implemented');
  }

  /**
   * Initialize platform listeners, observers, or hooks
   * @returns {Promise<void>}
   */
  async initialize() {
    // Default implementation: no-op
  }

  /**
   * Detects whether a successful submission was just completed on the page
   * @returns {Promise<Object|null>} Submission event or null
   */
  async detectSubmission() {
    throw new Error('PlatformAdapter.detectSubmission() must be implemented');
  }

  /**
   * Extracts problem metadata (title, slug, url, difficulty, topics, description)
   * @returns {Promise<Object>} Problem metadata
   */
  async getProblem() {
    throw new Error('PlatformAdapter.getProblem() must be implemented');
  }

  /**
   * Extracts full code and submission statistics, returning a normalized Submission object
   * @param {Object} event Event detected by detectSubmission
   * @returns {Promise<Object>} Normalized Submission
   */
  async getSubmission(event) {
    throw new Error('PlatformAdapter.getSubmission(event) must be implemented');
  }

  /**
   * Injects the manual "Sync w/ SolveSync" trigger button into the platform UI
   */
  injectSyncButton() {
    // Default implementation: optional
  }
}
