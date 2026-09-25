/**
 * SolveSync LeetCode Platform Adapter
 * Integrates LeetCode's modern dynamic UI and GraphQL API into the SolveSync PlatformAdapter contract.
 */

import { PlatformAdapter } from '../adapter.js';
import { PLATFORMS, SUBMISSION_STATUS, createSubmission } from '../models.js';

export class LeetCodeAdapter extends PlatformAdapter {
  constructor() {
    super(PLATFORMS.LEETCODE);
    this.progressSpinnerId = 'solvesync_progress_elem';
    this.progressSpinnerClass = 'solvesync_progress';
  }

  matches(url) {
    return typeof url === 'string' && url.includes('leetcode.com/problems/');
  }

  async initialize() {
    this.injectSpinnerStyle();
    this.setupKeyboardShortcuts();
  }

  /**
   * Helper to format problem ID with leading zeros (e.g. 1 -> '0001')
   */
  static addLeadingZeros(id) {
    if (!id) return '0000';
    const s = String(id);
    return s.padStart(4, '0');
  }

  /**
   * Queries LeetCode GraphQL API for submission details
   */
  async fetchSubmissionGraphQL(submissionId) {
    const detailsQuery = {
      query: `
        query submissionDetails($submissionId: Int!) {
          submissionDetails(submissionId: $submissionId) {
            runtime
            runtimeDisplay
            runtimePercentile
            memory
            memoryDisplay
            memoryPercentile
            code
            timestamp
            statusCode
            lang {
              name
              verboseName
            }
            question {
              questionId
              title
              titleSlug
              content
              difficulty
              topicTags {
                name
                slug
              }
            }
          }
        }
      `,
      variables: { submissionId: parseInt(submissionId, 10) },
      operationName: 'submissionDetails',
    };

    const res = await fetch('https://leetcode.com/graphql/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(detailsQuery),
    });

    if (!res.ok) {
      throw new Error(`LeetCode submission GraphQL query failed (${res.status})`);
    }

    const json = await res.json();
    const details = json?.data?.submissionDetails;
    if (!details) {
      throw new Error('LeetCode GraphQL returned no submissionDetails');
    }

    // Also fetch frontend question ID (e.g. "1" for "Two Sum")
    const questionFrontendId = await this.fetchQuestionFrontendId(details.question.titleSlug);
    details.question.questionFrontendId = questionFrontendId;

    return details;
  }

  /**
   * Queries LeetCode GraphQL for frontend ID
   */
  async fetchQuestionFrontendId(titleSlug) {
    try {
      const qQuery = {
        query: `
          query questionDetail($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
              questionFrontendId
            }
          }
        `,
        variables: { titleSlug },
        operationName: 'questionDetail',
      };

      const res = await fetch('https://leetcode.com/graphql/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(qQuery),
      });

      if (res.ok) {
        const json = await res.json();
        return json?.data?.question?.questionFrontendId || null;
      }
    } catch (e) {
      console.warn('Could not fetch questionFrontendId:', e);
    }
    return null;
  }

  /**
   * Transforms raw LeetCode submission data into a normalized Submission object
   */
  createNormalizedSubmission(data, submissionId) {
    const q = data.question;
    const frontendId = q.questionFrontendId || q.questionId;
    const paddedId = LeetCodeAdapter.addLeadingZeros(frontendId);
    const slug = `${paddedId}-${q.titleSlug}`;
    const formattedTitle = `${frontendId ? `${frontendId}. ` : ''}${q.title}`;

    return createSubmission({
      platform: PLATFORMS.LEETCODE,
      problem: {
        id: String(frontendId),
        slug,
        title: formattedTitle,
        url: `https://leetcode.com/problems/${q.titleSlug}/`,
        difficulty: q.difficulty?.toLowerCase(),
        topics: (q.topicTags || []).map(t => t.name),
        description: q.content || '',
      },
      submission: {
        id: String(submissionId),
        status: SUBMISSION_STATUS.ACCEPTED,
        language: data.lang?.name || data.lang?.verboseName || 'Unknown',
        code: data.code || '',
        submittedAt: data.timestamp
          ? new Date(data.timestamp * 1000).toISOString()
          : new Date().toISOString(),
      },
      performance: {
        runtime: data.runtimeDisplay || (data.runtime ? `${data.runtime} ms` : undefined),
        runtimePercentile: data.runtimePercentile ? Math.round(data.runtimePercentile) : undefined,
        memory:
          data.memoryDisplay ||
          (data.memory ? `${(data.memory / (1024 * 1024)).toFixed(1)} MB` : undefined),
        memoryPercentile: data.memoryPercentile ? Math.round(data.memoryPercentile) : undefined,
      },
      source: {
        pageUrl: typeof window !== 'undefined' ? window.location?.href || '' : '',
        extractedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Injects CSS for the loading spinner and success tick
   */
  injectSpinnerStyle() {
    if (document.getElementById('solvesync-spinner-style')) return;
    const style = document.createElement('style');
    style.id = 'solvesync-spinner-style';
    style.textContent = `
      .${this.progressSpinnerClass} {
        pointer-events: none;
        width: 1.5em;
        height: 1.5em;
        border: 0.25em solid rgba(15, 118, 110, 0.2);
        border-top-color: #0F766E;
        border-radius: 50%;
        animation: solvesync_spin 0.8s linear infinite;
        display: inline-block;
        vertical-align: middle;
      }
      @keyframes solvesync_spin {
        100% { transform: rotate(360deg); }
      }
      .solvesync-tick-success {
        display: inline-block;
        transform: rotate(45deg);
        height: 18px;
        width: 9px;
        border-bottom: 3.5px solid #16A34A;
        border-right: 3.5px solid #16A34A;
        vertical-align: middle;
      }
      .solvesync-tick-fail {
        display: inline-block;
        transform: rotate(45deg);
        height: 18px;
        width: 9px;
        border-bottom: 3.5px solid #EF4444;
        border-right: 3.5px solid #EF4444;
        vertical-align: middle;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Shows upload progress spinner
   */
  startSpinner() {
    let elem = document.getElementById(this.progressSpinnerId);
    if (!elem) {
      elem = document.createElement('span');
      elem.id = this.progressSpinnerId;
      elem.style.marginRight = '12px';

      // Find action buttons container in LeetCode UI
      const action = document.querySelector('[data-e2e-locator="console-submit-button"]')
        ?.parentElement;
      if (action) {
        action.prepend(elem);
      }
    }
    elem.className = this.progressSpinnerClass;
  }

  /**
   * Marks status as uploaded successfully
   */
  markUploaded() {
    const elem = document.getElementById(this.progressSpinnerId);
    if (elem) {
      elem.className = 'solvesync-tick-success';
    }
  }

  /**
   * Marks status as upload failed
   */
  markUploadFailed() {
    const elem = document.getElementById(this.progressSpinnerId);
    if (elem) {
      elem.className = 'solvesync-tick-fail';
    }
  }

  /**
   * Listens for Ctrl+Enter / Cmd+Enter shortcuts
   */
  setupKeyboardShortcuts(onShortcutTriggered = () => {}) {
    window.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        onShortcutTriggered();
      }
    });
  }
}
