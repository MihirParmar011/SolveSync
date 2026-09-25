/**
 * SolveSync GeeksForGeeks Content Script
 * Listens for successful submissions and synchronizes them via SyncEngine.
 */

import { GFGAdapter } from './core/adapters/gfg.js';
import { defaultEngine } from './core/engine.js';

const adapter = new GFGAdapter();

if (adapter.matches(window.location.href)) {
  // Listen for submit button click or observe DOM directly
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
            'SolveSync: Detected successful GeeksForGeeks submission:',
            submission.problem.title
          );
          await defaultEngine.sync(submission);
          console.log('SolveSync: Successfully synchronized GFG solution to GitHub!');
        } catch (err) {
          console.error('SolveSync: Failed to sync GFG solution:', err);
        }
      });
    }
  });
}
