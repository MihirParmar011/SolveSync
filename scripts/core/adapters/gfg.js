/**
 * SolveSync GeeksForGeeks Platform Adapter
 * Integrates GeeksForGeeks practice portal into the SolveSync PlatformAdapter contract.
 */

import { PlatformAdapter } from '../adapter.js';
import {
  PLATFORMS,
  SUBMISSION_STATUS,
  createSubmission,
  getLanguageExtension,
  toKebabCase,
} from '../models.js';

export class GFGAdapter extends PlatformAdapter {
  constructor() {
    super(PLATFORMS.GEEKSFORGEEKS);
    this.monitoring = false;
  }

  matches(url) {
    return (
      typeof url === 'string' &&
      (url.includes('geeksforgeeks.org/problems') || url.includes('practice.geeksforgeeks.org'))
    );
  }

  /**
   * Finds problem title from GeeksForGeeks DOM
   */
  findTitle() {
    const el =
      document.querySelector('[class*="problem-tab__name"]') ||
      document.querySelector('[class*="problems_header_content__title"] h3') ||
      document.querySelector('h3.problem-tab__name');
    return el ? el.innerText.trim() : 'Unknown GFG Problem';
  }

  /**
   * Finds difficulty level from GeeksForGeeks DOM
   */
  findDifficulty() {
    const el =
      document.querySelector('[class*="problem-tab__difficulty"]') ||
      document.querySelector('[class*="problems_header_description"]');

    if (!el) return 'medium';

    const text = el.innerText.trim();
    if (text.includes('Basic') || text.includes('School') || text.includes('Easy')) {
      return 'easy';
    }
    if (text.includes('Hard')) {
      return 'hard';
    }
    return 'medium';
  }

  /**
   * Extracts problem statement HTML
   */
  findProblemStatement() {
    const el =
      document.querySelector('[class*="problem-statement"]') ||
      document.querySelector('[class*="problems_problem_content"]');
    return el ? el.innerHTML : '';
  }

  /**
   * Detects the selected programming language
   */
  findLanguage() {
    const el =
      document.querySelector('[class*="divider text"]') ||
      document.querySelector('.divider.text') ||
      document.querySelector('[class*="language-select"]');

    if (el) {
      const raw = el.innerText.split('(')[0].trim();
      return raw || 'cpp';
    }
    return 'cpp';
  }

  /**
   * Extracts user code from Ace editor or fallback element
   */
  extractCode() {
    // 1. Check window.ace if exposed
    if (typeof window !== 'undefined' && window.ace) {
      try {
        const editor = window.ace.edit('ace-editor');
        if (editor) return editor.getValue();
      } catch (e) {
        // Fallback
      }
    }

    // 2. Query ace lines in DOM
    const aceLines = document.querySelectorAll('.ace_line');
    if (aceLines && aceLines.length > 0) {
      return Array.from(aceLines)
        .map(l => l.textContent)
        .join('\n');
    }

    // 3. Fallback pre or code element
    const codeEl = document.querySelector('#ace-editor, pre.code, code');
    return codeEl ? codeEl.innerText : '';
  }

  /**
   * Generates normalized submission object
   */
  createNormalizedSubmission() {
    const title = this.findTitle();
    const slug = toKebabCase(title);
    const difficulty = this.findDifficulty();
    const description = this.findProblemStatement();
    const language = this.findLanguage();
    const code = this.extractCode();

    return createSubmission({
      platform: PLATFORMS.GEEKSFORGEEKS,
      problem: {
        title,
        slug,
        url: typeof window !== 'undefined' ? window.location?.href : '',
        difficulty,
        topics: ['Data Structures', 'Algorithms'],
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
   * Starts monitoring for submission result banner
   */
  startMonitoring(onAccepted = () => {}) {
    if (this.monitoring) return;
    this.monitoring = true;

    const observer = new MutationObserver(() => {
      const output = document.querySelector(
        '[class*="problems_content"], [class*="output-container"]'
      );
      if (output && output.innerText.includes('Problem Solved Successfully')) {
        observer.disconnect();
        this.monitoring = false;

        const sub = this.createNormalizedSubmission();
        onAccepted(sub);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }
}
