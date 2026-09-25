/**
 * SolveSync CodeChef Content Script
 * Listens for successful CodeChef submissions and synchronizes them via SyncEngine.
 */

import { CodeChefAdapter } from './core/adapters/codechef.js';
import { defaultEngine } from './core/engine.js';

const adapter = new CodeChefAdapter();

if (adapter.matches(window.location.href)) {
  document.addEventListener('click', e => {
    const target = e.target;
    if (
      target &&
      (target.textContent?.trim() === 'Submit' ||
        target.closest('button')?.textContent?.trim() === 'Submit')
    ) {
      adapter.startMonitoring(async submission => {
        try {
          console.log(
            'SolveSync: Detected successful CodeChef submission:',
            submission.problem.title
          );
          await defaultEngine.sync(submission);
          console.log('SolveSync: Successfully synchronized CodeChef solution to GitHub!');
        } catch (err) {
          console.error('SolveSync: Failed to sync CodeChef solution:', err);
        }
      });
    }
  });
}
