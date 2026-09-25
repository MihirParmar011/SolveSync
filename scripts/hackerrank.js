/**
 * SolveSync HackerRank Content Script
 * Listens for successful HackerRank challenge submissions and synchronizes them via SyncEngine.
 */

import { HackerRankAdapter } from './core/adapters/hackerrank.js';
import { defaultEngine } from './core/engine.js';

const adapter = new HackerRankAdapter();

if (adapter.matches(window.location.href)) {
  document.addEventListener('click', e => {
    const target = e.target;
    if (
      target &&
      (target.textContent?.trim() === 'Submit Code' ||
        target.closest('button')?.textContent?.trim() === 'Submit Code')
    ) {
      adapter.startMonitoring(async submission => {
        try {
          console.log(
            'SolveSync: Detected successful HackerRank submission:',
            submission.problem.title
          );
          await defaultEngine.sync(submission);
          console.log('SolveSync: Successfully synchronized HackerRank solution to GitHub!');
        } catch (err) {
          console.error('SolveSync: Failed to sync HackerRank solution:', err);
        }
      });
    }
  });
}
