/**
 * SolveSync Desktop Dashboard Controller
 * Pure vanilla JavaScript controller for stats overview, history, and settings.
 */

import { defaultStorage } from './core/storage.js';
import { StatsService } from './core/stats.js';

// DOM Nav Elements
const navOverview = document.getElementById('nav_overview');
const navSubmissions = document.getElementById('nav_submissions');
const navSettings = document.getElementById('nav_settings');

// Views
const viewOverview = document.getElementById('view_overview');
const viewSubmissions = document.getElementById('view_submissions');
const viewSettings = document.getElementById('view_settings');
const pageHeading = document.getElementById('page_heading');

// User & Repo Elements
const userLogin = document.getElementById('user_login');
const userAvatar = document.getElementById('user_avatar');
const dashRepoName = document.getElementById('dash_repo_name');
const dashRepoLink = document.getElementById('dash_repo_link');
const dashRepoChangeBtn = document.getElementById('dash_repo_change_btn');
const repoSetupBanner = document.getElementById('repo_setup_banner');
const bannerUsername = document.getElementById('banner_username');

// Sidebar Quick Actions
const sidebarSwitchBtn = document.getElementById('sidebar_switch_btn');
const sidebarLogoutBtn = document.getElementById('sidebar_logout_btn');

// Metric Elements
const dashTotal = document.getElementById('dash_total');
const dashEasy = document.getElementById('dash_easy');
const dashMedium = document.getElementById('dash_medium');
const dashHard = document.getElementById('dash_hard');

const dashPlatLc = document.getElementById('dash_plat_lc');
const dashPlatGfg = document.getElementById('dash_plat_gfg');
const dashPlatCodechef = document.getElementById('dash_plat_codechef');
const dashPlatHr = document.getElementById('dash_plat_hr');

// Tables
const overviewTableBody = document.getElementById('overview_table_body');
const fullHistoryTableBody = document.getElementById('full_history_table_body');

// Settings Elements
const settingsUserAvatar = document.getElementById('settings_user_avatar');
const settingsUserLogin = document.getElementById('settings_user_login');
const settingsSwitchAccountBtn = document.getElementById('settings_switch_account_btn');
const settingsLogoutBtn = document.getElementById('settings_logout_btn');

const settingsRepoName = document.getElementById('settings_repo_name');
const settingsRepoLink = document.getElementById('settings_repo_link');
const settingsRepoDesc = document.getElementById('settings_repo_desc');
const settingsChangeRepoBtn = document.getElementById('settings_change_repo_btn');
const settingUnlinkBtn = document.getElementById('setting_unlink_btn');

const settingAutosync = document.getElementById('setting_autosync');
const settingGroupPlatform = document.getElementById('setting_group_platform');
const settingStatsJson = document.getElementById('setting_stats_json');

/**
 * Switch view
 */
function setView(viewName) {
  const views = [
    { name: 'overview', btn: navOverview, el: viewOverview, title: 'Overview' },
    { name: 'submissions', btn: navSubmissions, el: viewSubmissions, title: 'Sync History' },
    { name: 'settings', btn: navSettings, el: viewSettings, title: 'Settings' },
  ];

  views.forEach(v => {
    const isActive = v.name === viewName;
    if (v.btn) v.btn.className = `menu-item ${isActive ? 'active' : ''}`;
    if (v.el) v.el.style.display = isActive ? 'flex' : 'none';
    if (isActive && pageHeading) pageHeading.textContent = v.title;
  });
}

if (navOverview) navOverview.addEventListener('click', () => setView('overview'));
if (navSubmissions) navSubmissions.addEventListener('click', () => setView('submissions'));
if (navSettings) navSettings.addEventListener('click', () => setView('settings'));

// Check hash for direct deep links e.g. #settings
if (window.location.hash === '#settings') {
  setView('settings');
} else if (window.location.hash === '#submissions') {
  setView('submissions');
}

/**
 * Render table rows
 */
function renderTableRows(tbody, items) {
  if (!tbody) return;
  if (!items || items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 24px;">
          No submissions recorded yet.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';
  items.forEach(item => {
    const tr = document.createElement('tr');

    const diff = (item.difficulty || 'easy').toLowerCase();
    const diffLabel = diff.charAt(0).toUpperCase() + diff.slice(1);
    const dateFormatted = item.timestamp
      ? new Date(item.timestamp).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Recently';

    const platformName = item.platform
      ? item.platform.charAt(0).toUpperCase() + item.platform.slice(1)
      : 'LeetCode';

    tr.innerHTML = `
      <td>
        <strong style="color: var(--text-primary);">${item.title || 'Solution'}</strong>
      </td>
      <td>
        <span style="font-family: var(--font-label); font-size: 12px; color: var(--text-secondary);">${platformName}</span>
      </td>
      <td>
        <span class="badge-diff ${diff}">${diffLabel}</span>
      </td>
      <td style="font-family: var(--font-label); font-size: 12px; color: var(--text-muted);">
        ${dateFormatted}
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/**
 * Load dashboard data
 */
/**
 * Account Actions
 */
async function handleSwitchAccount() {
  if (
    confirm(
      'Switch GitHub Account?\n\nThis will disconnect your current session and open the onboarding wizard so you can connect a different GitHub account.'
    )
  ) {
    await defaultStorage.clearAuth();
    window.location.href = 'welcome.html';
  }
}

async function handleLogout() {
  if (
    confirm(
      'Log Out of SolveSync?\n\nThis will clear your local GitHub credentials and session. Your repositories and solutions on GitHub remain untouched.'
    )
  ) {
    await defaultStorage.clearAuth();
    window.location.href = 'welcome.html';
  }
}

async function handleUnlinkRepo() {
  if (
    confirm(
      'Unlink Destination Repository?\n\nThis will disconnect this repository from SolveSync. Your GitHub authentication remains active so you can choose or create another repository.'
    )
  ) {
    await defaultStorage.unlinkRepo();
    window.location.href = 'welcome.html#step2';
  }
}

/**
 * Load dashboard data
 */
async function loadDashboard() {
  const token = await defaultStorage.getToken();
  const username = await defaultStorage.getUsername();
  const hook = await defaultStorage.getHook();

  if (!token) {
    window.location.href = 'welcome.html';
    return;
  }

  // User Profile
  const displayName = username ? `@${username}` : 'GitHub User';
  const initial = (username ? username.charAt(0) : 'U').toUpperCase();

  if (userLogin) userLogin.textContent = username || 'GitHub User';
  if (userAvatar) userAvatar.textContent = initial;

  if (settingsUserLogin) settingsUserLogin.textContent = displayName;
  if (settingsUserAvatar) settingsUserAvatar.textContent = initial;

  // Repo Hook
  if (hook) {
    if (dashRepoName) dashRepoName.textContent = hook;
    if (dashRepoLink) {
      dashRepoLink.href = `https://github.com/${hook}`;
      dashRepoLink.target = '_blank';
      dashRepoLink.className = 'repo-badge';
    }
    if (dashRepoChangeBtn) dashRepoChangeBtn.style.display = 'inline-block';
    if (repoSetupBanner) repoSetupBanner.style.display = 'none';

    if (settingsRepoName) settingsRepoName.textContent = hook;
    if (settingsRepoLink) {
      settingsRepoLink.href = `https://github.com/${hook}`;
      settingsRepoLink.style.display = 'inline';
    }
    if (settingsRepoDesc) {
      settingsRepoDesc.textContent =
        'All accepted submissions are synced directly to this repository.';
    }
    if (settingUnlinkBtn) settingUnlinkBtn.style.display = 'inline-flex';
  } else {
    if (dashRepoName) dashRepoName.textContent = 'Link a repository';
    if (dashRepoLink) {
      dashRepoLink.href = 'welcome.html#step2';
      dashRepoLink.target = '_self';
      dashRepoLink.className = 'repo-badge repo-badge-warning';
    }
    if (dashRepoChangeBtn) dashRepoChangeBtn.style.display = 'none';
    if (repoSetupBanner) repoSetupBanner.style.display = 'flex';
    if (bannerUsername) bannerUsername.textContent = username || 'user';

    if (settingsRepoName) settingsRepoName.textContent = 'No repository linked yet';
    if (settingsRepoLink) settingsRepoLink.removeAttribute('href');
    if (settingsRepoDesc) {
      settingsRepoDesc.textContent =
        'Select or create a repository to enable auto-syncing solutions.';
    }
    if (settingUnlinkBtn) settingUnlinkBtn.style.display = 'none';
  }

  // Statistics
  const rawStats = await defaultStorage.getStats();
  const stats = StatsService.normalizeStats(rawStats);

  const lc = stats.platforms.leetcode || { solved: 0, easy: 0, medium: 0, hard: 0 };
  const gfg = stats.platforms.geeksforgeeks || { solved: 0 };
  const codechef = stats.platforms.codechef || { solved: 0 };
  const hr = stats.platforms.hackerrank || { solved: 0 };

  if (dashTotal) dashTotal.textContent = stats.totals.solved || 0;
  if (dashEasy) dashEasy.textContent = lc.easy || 0;
  if (dashMedium) dashMedium.textContent = lc.medium || 0;
  if (dashHard) dashHard.textContent = lc.hard || 0;

  if (dashPlatLc) dashPlatLc.textContent = lc.solved || 0;
  if (dashPlatGfg) dashPlatGfg.textContent = gfg.solved || 0;
  if (dashPlatCodechef) dashPlatCodechef.textContent = codechef.solved || 0;
  if (dashPlatHr) dashPlatHr.textContent = hr.solved || 0;

  // History Tables
  const history = await defaultStorage.getHistory();
  renderTableRows(overviewTableBody, history.slice(0, 5));
  renderTableRows(fullHistoryTableBody, history);

  // Settings
  const settings = await defaultStorage.getSettings();
  if (settingAutosync) settingAutosync.checked = settings.autoSync !== false;
  if (settingGroupPlatform) settingGroupPlatform.checked = Boolean(settings.groupByPlatform);
  if (settingStatsJson) settingStatsJson.checked = settings.includeStatsJson !== false;
}

// Sidebar Action Listeners
if (sidebarSwitchBtn) sidebarSwitchBtn.addEventListener('click', handleSwitchAccount);
if (sidebarLogoutBtn) sidebarLogoutBtn.addEventListener('click', handleLogout);

// Settings Action Listeners
if (settingsSwitchAccountBtn)
  settingsSwitchAccountBtn.addEventListener('click', handleSwitchAccount);
if (settingsLogoutBtn) settingsLogoutBtn.addEventListener('click', handleLogout);
if (settingUnlinkBtn) settingUnlinkBtn.addEventListener('click', handleUnlinkRepo);

// Settings Preferences Change Listeners
if (settingAutosync) {
  settingAutosync.addEventListener('change', async () => {
    await defaultStorage.updateSettings({ autoSync: settingAutosync.checked });
  });
}

if (settingGroupPlatform) {
  settingGroupPlatform.addEventListener('change', async () => {
    await defaultStorage.updateSettings({ groupByPlatform: settingGroupPlatform.checked });
  });
}

if (settingStatsJson) {
  settingStatsJson.addEventListener('change', async () => {
    await defaultStorage.updateSettings({ includeStatsJson: settingStatsJson.checked });
  });
}

loadDashboard();
