/**
 * SolveSync HackerRank Platform Adapter
 * Integrates HackerRank challenges and submissions into the SolveSync PlatformAdapter contract.
 */

import { PlatformAdapter } from '../adapter.js';
import {
  PLATFORMS,
  SUBMISSION_STATUS,
  createSubmission,
  getLanguageExtension,
  toKebabCase,
} from '../models.js';

export class HackerRankAdapter extends PlatformAdapter {
  constructor() {
    super(PLATFORMS.HACKERRANK);
    this.monitoring = false;
  }

  matches(url) {
    return typeof url === 'string' && url.includes('hackerrank.com/challenges');
  }

  /**
   * Finds problem title from HackerRank challenge DOM
   */
  findTitle() {
    const el =
      document.querySelector('h1.ui-icon-label') ||
      document.querySelector('.challenge-title') ||
      document.querySelector('h1');
    return el ? el.innerText.trim() : 'HackerRank Challenge';
  }

  /**
   * Finds problem slug
   */
  findSlug() {
    const match = window.location.pathname.match(/\/challenges\/([A-Za-z0-9_-]+)/);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
    return toKebabCase(this.findTitle());
  }

  /**
   * Finds challenge difficulty
   */
  findDifficulty() {
    const el = document.querySelector('.difficulty-tag, [data-analytics="ChallengeDifficulty"]');
    if (!el) return 'medium';

    const text = el.innerText.toLowerCase();
    if (text.includes('easy')) return 'easy';
    if (text.includes('hard') || text.includes('expert')) return 'hard';
    return 'medium';
  }

  /**
   * Extracts problem statement HTML
   */
  findProblemStatement() {
    const el =
      document.querySelector('.challenge-body-html') ||
      document.querySelector('.challenge-problem-statement');
    return el ? el.innerHTML : '';
  }

  /**
   * Detects the selected programming language
   */
  findLanguage() {
    const el =
      document.querySelector('[data-analytics="EditorLanguageSelect"]') ||
      document.querySelector('.select-language');
    if (el) {
      return el.innerText.trim().split(' ')[0] || 'python3';
    }
    return 'python3';
  }

  /**
   * Extracts code from Monaco editor
   */
  extractCode() {
    if (typeof window !== 'undefined' && window.monaco?.editor) {
      try {
        const models = window.monaco.editor.getModels();
        if (models && models.length > 0) {
          return models[0].getValue();
        }
      } catch (e) {
        // Fallback
      }
    }

    const lines = document.querySelectorAll('.view-lines .view-line');
    if (lines && lines.length > 0) {
      return Array.from(lines)
        .map(l => l.textContent)
        .join('\n');
    }

    return '';
  }

  /**
   * Generates normalized submission object
   */
  createNormalizedSubmission() {
    const title = this.findTitle();
    const slug = this.findSlug();
    const difficulty = this.findDifficulty();
    const description = this.findProblemStatement();
    const language = this.findLanguage();
    const code = this.extractCode();

    return createSubmission({
      platform: PLATFORMS.HACKERRANK,
      problem: {
        title,
        slug,
        url: typeof window !== 'undefined' ? window.location?.href : '',
        difficulty,
        topics: ['Algorithms'],
        description,
      },
      submission: {
        status: SUBMISSION_STATUS.ACCEPTED,
        language,
        languageExtension: getLanguageExtension(language),
        code,
        submittedAt: new Date().toISOString(),
      },
      source: {
        pageUrl: typeof window !== 'undefined' ? window.location?.href : '',
        extractedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Observes submission response banner on HackerRank
   */
  startMonitoring(onAccepted = () => {}) {
    if (this.monitoring) return;
    this.monitoring = true;

    const observer = new MutationObserver(() => {
      const banner = document.querySelector('.congratulations-heading, [class*="congratulations"]');
      if (
        banner &&
        (banner.innerText.includes('Congratulations') || banner.innerText.includes('Success'))
      ) {
        observer.disconnect();
        this.monitoring = false;

        const sub = this.createNormalizedSubmission();
        onAccepted(sub);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }
}
