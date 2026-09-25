/**
 * SolveSync CodeChef Platform Adapter
 * Integrates CodeChef problem pages and submissions into the SolveSync PlatformAdapter contract.
 */

import { PlatformAdapter } from '../adapter.js';
import {
  PLATFORMS,
  SUBMISSION_STATUS,
  createSubmission,
  getLanguageExtension,
  toKebabCase,
} from '../models.js';

export class CodeChefAdapter extends PlatformAdapter {
  constructor() {
    super(PLATFORMS.CODECHEF);
    this.monitoring = false;
  }

  matches(url) {
    return (
      typeof url === 'string' &&
      (url.includes('codechef.com/problems') ||
        url.includes('codechef.com/submit') ||
        url.includes('codechef.com/practice'))
    );
  }

  /**
   * Finds problem title from CodeChef DOM
   */
  findTitle() {
    const el =
      document.querySelector('h1.problem-title') ||
      document.querySelector('[class*="ProblemTitle"]') ||
      document.querySelector('.problem-code') ||
      document.querySelector('h1');
    return el ? el.innerText.trim() : 'CodeChef Problem';
  }

  /**
   * Finds problem slug/code
   */
  findSlug() {
    // Check URL e.g. codechef.com/problems/FLOW001
    const match = window.location.pathname.match(/\/problems\/([A-Za-z0-9_]+)/);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
    return toKebabCase(this.findTitle());
  }

  /**
   * Finds difficulty rating / level
   */
  findDifficulty() {
    const el =
      document.querySelector('[class*="difficulty-rating"]') ||
      document.querySelector('[class*="ProblemDifficulty"]');
    if (!el) return 'medium';

    const text = el.innerText.toLowerCase();
    if (text.includes('easy') || text.includes('beginner')) return 'easy';
    if (text.includes('hard') || text.includes('challenge')) return 'hard';
    return 'medium';
  }

  /**
   * Extracts problem statement HTML
   */
  findProblemStatement() {
    const el =
      document.querySelector('#problem-statement') ||
      document.querySelector('[class*="problem-statement"]') ||
      document.querySelector('.problem-statement');
    return el ? el.innerHTML : '';
  }

  /**
   * Detects the selected programming language
   */
  findLanguage() {
    const el =
      document.querySelector('[class*="language-select"]') ||
      document.querySelector('#select-language') ||
      document.querySelector('.select__single-value');
    if (el) {
      return el.innerText.trim().split(' ')[0] || 'cpp';
    }
    return 'cpp';
  }

  /**
   * Extracts submitted code from Monaco or CodeMirror editor
   */
  extractCode() {
    // 1. Monaco Editor (CodeChef uses Monaco)
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

    // 2. DOM Editor lines
    const lines = document.querySelectorAll('.view-lines .view-line, .CodeMirror-line');
    if (lines && lines.length > 0) {
      return Array.from(lines)
        .map(l => l.textContent)
        .join('\n');
    }

    // 3. Textarea fallback
    const textarea = document.querySelector('textarea#code, textarea.code-area');
    return textarea ? textarea.value : '';
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
      platform: PLATFORMS.CODECHEF,
      problem: {
        title,
        slug,
        url: typeof window !== 'undefined' ? window.location?.href : '',
        difficulty,
        topics: ['Competitive Programming'],
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
   * Observes submission response banner on CodeChef
   */
  startMonitoring(onAccepted = () => {}) {
    if (this.monitoring) return;
    this.monitoring = true;

    const observer = new MutationObserver(() => {
      const banner = document.querySelector(
        '[class*="submission-status"], [class*="verdict"], .alert'
      );
      if (
        banner &&
        (banner.innerText.includes('Correct Answer') ||
          banner.innerText.includes('100 pts') ||
          banner.innerText.includes('AC'))
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
