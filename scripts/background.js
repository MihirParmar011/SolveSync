/**
 * SolveSync Background Service Worker
 * Handles authentication callbacks, alarms, and offline queue retries.
 */

import { defaultEngine } from './core/engine.js';

let api = isChrome() ? chrome : isFirefox() ? browser : undefined;

api.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    api.storage.local.set({ sync_stats: true });
  }
});

// Periodic retry of pending/offline submissions
if (api.alarms) {
  api.alarms.create('solvesync_queue_check', { periodInMinutes: 10 });
  api.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === 'solvesync_queue_check') {
      defaultEngine.processQueue().catch(err => {
        console.warn('SolveSync: Background queue check encountered an issue:', err);
      });
    }
  });
}

api.runtime.onMessage.addListener(handleMessage);

function handleMessage(request, sender, sendResponse) {
  if (request && request.closeWebPage === true && request.isSuccess === true) {
    /* Set username, token, and close auth pipe */
    api.storage.local.set(
      {
        solvesync_username: request.username,
        solvesync_token: request.token,
        pipe_solvesync: false,
      },
      () => {
        console.log('SolveSync: Successfully authenticated as', request.username);
        // Process any queued jobs now that user is authenticated
        defaultEngine.processQueue().catch(console.warn);

        /* Navigate the tab that completed auth to welcome.html */
        const urlOnboarding = api.runtime.getURL('welcome.html');
        if (sender?.tab?.id) {
          api.tabs.update(sender.tab.id, { url: urlOnboarding });
        } else {
          api.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
            if (tabs && tabs[0]) {
              api.tabs.update(tabs[0].id, { url: urlOnboarding });
            } else {
              api.tabs.create({ url: urlOnboarding, active: true });
            }
          });
        }
      }
    );
  } else if (request && request.closeWebPage === true && request.isSuccess === false) {
    console.error('SolveSync: Authentication failed:', request.error || 'Unknown error');
    api.storage.local.set({ pipe_solvesync: false });

    api.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
      if (tabs && tabs[0]) {
        api.tabs.remove(tabs[0].id);
      }
    });
  } else if (request.type === 'PROCESS_QUEUE') {
    defaultEngine
      .processQueue()
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  } else if (request.type === 'LEETCODE_SUBMISSION') {
    api.webNavigation.onHistoryStateUpdated.addListener(
      (e = function (details) {
        const submissionId = details.url.match(/\/submissions\/(\d+)\//)[1];
        sendResponse({ submissionId });
        api.webNavigation.onHistoryStateUpdated.removeListener(e);
      }),
      { url: [{ hostSuffix: 'leetcode.com' }, { pathContains: 'submissions' }] }
    );
  }
  return true;
}

function isChrome() {
  return typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined';
}

function isFirefox() {
  return typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined';
}
