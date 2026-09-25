/**
 * SolveSync Extension Popup Script
 * Modern, dependency-free vanilla JS controller for the 360px toolbar popup.
 */

import { defaultStorage } from './core/storage.js';
import { StatsService } from './core/stats.js';

function getBrowserApi() {
  if (typeof chrome !== 'undefined' && chrome.runtime) return chrome;
  if (typeof browser !== 'undefined' && browser.runtime) return browser;
  return null;
}

const api = getBrowserApi();

// DOM Elements
const authContainer = document.getElementById('auth_container');
const mainContainer = document.getElementById('main_container');
const authBtn = document.getElementById('auth_btn');
const repoPill = document.getElementById('repo_pill');
const repoName = document.getElementById('repo_name');
const statusDot = document.getElementById('status_dot');
const statusLabel = document.getElementById('status_label');
const statTotal = document.getElementById('stat_total');
const statLc = document.getElementById('stat_lc');
const statGfg = document.getElementById('stat_gfg');
const statCodechef = document.getElementById('stat_codechef');
const statHr = document.getElementById('stat_hr');
const statEasy = document.getElementById('stat_easy');
const statMedium = document.getElementById('stat_medium');
const statHard = document.getElementById('stat_hard');
const recentList = document.getElementById('recent_list');
const openDashboardBtn = document.getElementById('open_dashboard_btn');
const navDashboardBtn = document.getElementById('nav_dashboard_btn');
const openSettingsBtn = document.getElementById('open_settings_btn');
const historyLink = document.getElementById('history_link');

/**
 * Format relative time
 */
function formatRelativeTime(dateStr) {
  if (!dateStr) return 'recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/**
 * Render recent syncs
 */
function renderRecentSyncs(history) {
  if (!recentList) return;
  if (!history || history.length === 0) {
    recentList.innerHTML = '<div class="recent-empty">No syncs yet. Start solving problems!</div>';
    return;
  }

  recentList.innerHTML = '';
  // Show top 3 recent syncs
  const items = history.slice(0, 3);

  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'recent-item';

    const platformName = item.platform
      ? item.platform.charAt(0).toUpperCase() + item.platform.slice(1)
      : 'LeetCode';
    const lang = item.language ? ` · ${item.language}` : '';
    const relTime = formatRelativeTime(item.timestamp);

    row.innerHTML = `
      <div class="recent-left">
        <svg class="recent-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <div class="recent-info">
          <span class="recent-title">${item.title || 'Solution'}</span>
          <span class="recent-meta">${platformName}${lang} · ${relTime}</span>
        </div>
      </div>
    `;

    if (item.url) {
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        if (api?.tabs) {
          api.tabs.create({ url: item.url });
        } else {
          window.open(item.url, '_blank');
        }
      });
    }

    recentList.appendChild(row);
  });
}

/**
 * Update UI with current state and metrics
 */
async function loadState() {
  const token = await defaultStorage.getToken();
  const hook = await defaultStorage.getHook();

  if (!token) {
    if (authContainer) authContainer.style.display = 'flex';
    if (mainContainer) mainContainer.style.display = 'none';
    return;
  }

  if (authContainer) authContainer.style.display = 'none';
  if (mainContainer) mainContainer.style.display = 'flex';

  const user = await defaultStorage.getUsername();

  // Repo hook
  if (hook) {
    if (repoName) repoName.textContent = hook;
    if (repoPill) repoPill.href = `https://github.com/${hook}`;
    if (statusDot) {
      statusDot.className = 'status-dot pulse';
    }
    if (statusLabel) statusLabel.textContent = user ? `@${user} (Synced)` : 'GitHub connected';
  } else {
    if (repoName) repoName.textContent = 'Link repository';
    if (repoPill)
      repoPill.href = api ? api.runtime.getURL('welcome.html#step2') : 'welcome.html#step2';
    if (statusDot) {
      statusDot.className = 'status-dot pulse';
    }
    if (statusLabel) statusLabel.textContent = user ? `@${user} (Setup repo)` : 'Link repository';
  }

  // Load and normalize stats
  const rawStats = await defaultStorage.getStats();
  const stats = StatsService.normalizeStats(rawStats);

  const lc = stats.platforms.leetcode || { solved: 0, easy: 0, medium: 0, hard: 0 };
  const gfg = stats.platforms.geeksforgeeks || { solved: 0 };
  const codechef = stats.platforms.codechef || { solved: 0 };
  const hr = stats.platforms.hackerrank || { solved: 0 };

  if (statTotal) statTotal.textContent = stats.totals.solved || 0;
  if (statLc) statLc.textContent = lc.solved || 0;
  if (statGfg) statGfg.textContent = gfg.solved || 0;
  if (statCodechef) statCodechef.textContent = codechef.solved || 0;
  if (statHr) statHr.textContent = hr.solved || 0;

  if (statEasy) statEasy.textContent = lc.easy || 0;
  if (statMedium) statMedium.textContent = lc.medium || 0;
  if (statHard) statHard.textContent = lc.hard || 0;

  // History
  const history = await defaultStorage.getHistory();
  renderRecentSyncs(history);
}

// Navigation Handlers
function openDashboard() {
  const url = api ? api.runtime.getURL('dashboard.html') : 'dashboard.html';
  if (api?.tabs) {
    api.tabs.create({ url });
  } else {
    window.open(url, '_blank');
  }
}

function openWelcome() {
  const url = api ? api.runtime.getURL('welcome.html') : 'welcome.html';
  if (api?.tabs) {
    api.tabs.create({ url });
  } else {
    window.open(url, '_blank');
  }
}

if (authBtn) {
  authBtn.addEventListener('click', openWelcome);
}

if (openDashboardBtn) {
  openDashboardBtn.addEventListener('click', openDashboard);
}

if (navDashboardBtn) {
  navDashboardBtn.addEventListener('click', openDashboard);
}

if (historyLink) {
  historyLink.addEventListener('click', e => {
    e.preventDefault();
    openDashboard();
  });
}

function openSettings() {
  const url = api ? api.runtime.getURL('dashboard.html#settings') : 'dashboard.html#settings';
  if (api?.tabs) {
    api.tabs.create({ url });
  } else {
    window.open(url, '_blank');
  }
}

if (openSettingsBtn) {
  openSettingsBtn.addEventListener('click', openSettings);
}

// Initial load
loadState();
