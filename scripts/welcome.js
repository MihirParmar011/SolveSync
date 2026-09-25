/**
 * SolveSync Onboarding & Settings Wizard
 * Pure vanilla JavaScript controller implementing the 3-step setup flow.
 */

import { defaultStorage } from './core/storage.js';
import { GitHubClient } from './core/github.js';

// Elements - Steps & Indicators
const step1Indicator = document.getElementById('step1_indicator');
const step2Indicator = document.getElementById('step2_indicator');
const step3Indicator = document.getElementById('step3_indicator');

const step1Panel = document.getElementById('step1_panel');
const step2Panel = document.getElementById('step2_panel');
const step3Panel = document.getElementById('step3_panel');

// Alerts
const feedbackError = document.getElementById('feedback_error');
const feedbackErrorText = document.getElementById('feedback_error_text');
const feedbackSuccess = document.getElementById('feedback_success');
const feedbackSuccessText = document.getElementById('feedback_success_text');

// Step 1 Controls
const oauthConnectBtn = document.getElementById('oauth_connect_btn');
const patInput = document.getElementById('pat_input');
const patConnectBtn = document.getElementById('pat_connect_btn');

// Step 2 Controls
const step2Username = document.getElementById('step2_username');
const step2DisconnectBtn = document.getElementById('step2_disconnect_btn');
const repoActionSelect = document.getElementById('repo_action_select');
const repoNameGroup = document.getElementById('repo_name_group');
const repoExistingGroup = document.getElementById('repo_existing_group');
const repoNameInput = document.getElementById('repo_name_input');
const repoExistingSelect = document.getElementById('repo_existing_select');
const setupRepoBtn = document.getElementById('setup_repo_btn');
const step2BackBtn = document.getElementById('step2_back_btn');

// Step 3 Controls
const step3Username = document.getElementById('step3_username');
const connectedRepoDisplay = document.getElementById('connected_repo_display');
const connectedRepoLink = document.getElementById('connected_repo_link');
const step3ChangeRepoBtn = document.getElementById('step3_change_repo_btn');
const step3SwitchBtn = document.getElementById('step3_switch_btn');
const unlinkBtn = document.getElementById('unlink_btn');

const github = new GitHubClient();

function showError(msg) {
  if (feedbackSuccess) feedbackSuccess.style.display = 'none';
  if (feedbackError) {
    feedbackErrorText.textContent = msg;
    feedbackError.style.display = 'flex';
  }
}

function showSuccess(msg) {
  if (feedbackError) feedbackError.style.display = 'none';
  if (feedbackSuccess) {
    feedbackSuccessText.textContent = msg;
    feedbackSuccess.style.display = 'flex';
  }
}

function clearAlerts() {
  if (feedbackError) feedbackError.style.display = 'none';
  if (feedbackSuccess) feedbackSuccess.style.display = 'none';
}

async function setStep(step) {
  clearAlerts();

  // Reset panels
  if (step1Panel) step1Panel.style.display = step === 1 ? 'flex' : 'none';
  if (step2Panel) step2Panel.style.display = step === 2 ? 'flex' : 'none';
  if (step3Panel) step3Panel.style.display = step === 3 ? 'flex' : 'none';

  // Update indicators
  if (step1Indicator) {
    step1Indicator.className = `stepper-item ${
      step === 1 ? 'active' : step > 1 ? 'completed' : ''
    }`;
  }
  if (step2Indicator) {
    step2Indicator.className = `stepper-item ${
      step === 2 ? 'active' : step > 2 ? 'completed' : ''
    }`;
  }
  if (step3Indicator) {
    step3Indicator.className = `stepper-item ${step === 3 ? 'active' : ''}`;
  }

  // Populate username
  if (step >= 2) {
    const username = await defaultStorage.getUsername();
    if (step2Username && username) step2Username.textContent = `@${username}`;
    if (step3Username && username) step3Username.textContent = `@${username}`;
  }
}

/**
 * Loads user repositories into the select dropdown
 */
async function loadUserRepositories() {
  if (!repoExistingSelect) return;
  repoExistingSelect.innerHTML = '<option value="">Loading repositories...</option>';

  try {
    const repos = await github.getRepositories({ per_page: 100, sort: 'updated' });
    repoExistingSelect.innerHTML = '<option value="">Choose an existing repository...</option>';

    if (!repos || repos.length === 0) {
      repoExistingSelect.innerHTML = '<option value="">No existing repositories found</option>';
      return;
    }

    repos.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.full_name;
      opt.textContent = `${r.full_name} (${r.private ? 'private' : 'public'})`;
      repoExistingSelect.appendChild(opt);
    });
  } catch (err) {
    console.warn('Could not load user repos:', err);
    repoExistingSelect.innerHTML = '<option value="">Failed to load repositories</option>';
  }
}

// Initial Flow
async function init() {
  const token = await defaultStorage.getToken();
  const hook = await defaultStorage.getHook();
  const username = await defaultStorage.getUsername();

  if (!token) {
    await setStep(1);
    return;
  }

  github.setToken(token);

  // If username is missing, fetch it
  if (!username) {
    try {
      const user = await github.getUser();
      await defaultStorage.setUsername(user.login);
    } catch (e) {
      console.warn('Failed to refresh user:', e);
    }
  }

  if (!hook || window.location.hash === '#step2') {
    await setStep(2);
    loadUserRepositories();
    return;
  }

  // Already authenticated and hooked
  if (connectedRepoDisplay) {
    connectedRepoDisplay.textContent = hook;
  }
  if (connectedRepoLink) {
    connectedRepoLink.href = `https://github.com/${hook}`;
  }
  await setStep(3);
}

// Event Listeners - Step 1: OAuth
if (oauthConnectBtn) {
  oauthConnectBtn.addEventListener('click', () => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const state = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');

    const clientId = 'Ov23liL0tT1sHz8GcCYe';
    const redirectUri = encodeURIComponent('https://github.com/');
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo&state=${state}`;

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ pipe_solvesync: true, solvesync_oauth_state: state }, () => {
        if (chrome.tabs) {
          chrome.tabs.create({ url, active: true });
        } else {
          window.location.href = url;
        }
      });
    } else {
      window.location.href = url;
    }
  });
}

// Event Listeners - Step 1: PAT
if (patConnectBtn) {
  patConnectBtn.addEventListener('click', async () => {
    const token = patInput ? patInput.value.trim() : '';
    if (!token) {
      showError('Please enter a valid Personal Access Token');
      return;
    }

    patConnectBtn.disabled = true;
    patConnectBtn.textContent = 'Verifying token...';

    try {
      github.setToken(token);
      const user = await github.getUser();

      await defaultStorage.setToken(token);
      await defaultStorage.setUsername(user.login);

      showSuccess(`Connected as @${user.login}! Proceeding to repository setup.`);
      setTimeout(async () => {
        await setStep(2);
        loadUserRepositories();
      }, 500);
    } catch (err) {
      showError(`Validation failed: ${err.message}. Ensure your token has 'repo' scope.`);
    } finally {
      patConnectBtn.disabled = false;
      patConnectBtn.textContent = 'Validate & Connect Token';
    }
  });
}

// Event Listeners - Step 2: Switch / Disconnect Account
if (step2DisconnectBtn) {
  step2DisconnectBtn.addEventListener('click', async () => {
    if (
      confirm(
        'Switch GitHub Account?\n\nThis will disconnect your current session and return to Step 1.'
      )
    ) {
      await defaultStorage.clearAuth();
      github.setToken(null);
      clearAlerts();
      await setStep(1);
    }
  });
}

// Event Listeners - Step 2: Repo Action Toggle
if (repoActionSelect) {
  repoActionSelect.addEventListener('change', () => {
    const isCreate = repoActionSelect.value === 'create';
    if (repoNameGroup) repoNameGroup.style.display = isCreate ? 'flex' : 'none';
    if (repoExistingGroup) repoExistingGroup.style.display = isCreate ? 'none' : 'flex';
  });
}

if (step2BackBtn) {
  step2BackBtn.addEventListener('click', async () => {
    await setStep(1);
  });
}

// Event Listeners - Step 2: Setup Repo
if (setupRepoBtn) {
  setupRepoBtn.addEventListener('click', async () => {
    const isCreate = repoActionSelect.value === 'create';
    setupRepoBtn.disabled = true;
    setupRepoBtn.textContent = 'Configuring repository...';

    try {
      let repoFullName = '';

      if (isCreate) {
        const name = repoNameInput.value.trim();
        if (!name) throw new Error('Repository name cannot be empty');

        try {
          const newRepo = await github.createRepository({
            name,
            description: 'A collection of coding solutions synchronized by SolveSync',
            isPrivate: true,
            autoInit: true,
          });
          repoFullName = newRepo.full_name;
        } catch (createErr) {
          // If repository already exists on user's account, automatically link to it!
          if (
            createErr.code === 'REPO_EXISTS' ||
            createErr.message?.toLowerCase().includes('already exists')
          ) {
            const user = await defaultStorage.getUsername();
            const existingFullName = `${user}/${name}`;
            const access = await github.checkAccess(user, name);
            if (access.hasAccess) {
              repoFullName = existingFullName;
            } else {
              throw createErr;
            }
          } else {
            throw createErr;
          }
        }
      } else {
        repoFullName = repoExistingSelect.value;
        if (!repoFullName) throw new Error('Please select an existing repository from the list');

        const [owner, repo] = repoFullName.split('/');
        const access = await github.checkAccess(owner, repo);
        if (!access.hasAccess) {
          throw new Error(`Cannot access repository: ${access.reason}`);
        }
      }

      await defaultStorage.setHook(repoFullName);

      if (connectedRepoDisplay) {
        connectedRepoDisplay.textContent = repoFullName;
      }
      if (connectedRepoLink) {
        connectedRepoLink.href = `https://github.com/${repoFullName}`;
      }

      showSuccess(`Repository ${repoFullName} connected successfully!`);
      setTimeout(async () => {
        await setStep(3);
      }, 500);
    } catch (err) {
      showError(err.message);
    } finally {
      setupRepoBtn.disabled = false;
      setupRepoBtn.textContent = 'Complete Setup';
    }
  });
}

// Event Listeners - Step 3: Change Repo & Switch Account
if (step3ChangeRepoBtn) {
  step3ChangeRepoBtn.addEventListener('click', async () => {
    await setStep(2);
    loadUserRepositories();
  });
}

if (step3SwitchBtn) {
  step3SwitchBtn.addEventListener('click', async () => {
    if (
      confirm(
        'Switch GitHub Account?\n\nThis will disconnect your current session and return to Step 1.'
      )
    ) {
      await defaultStorage.clearAuth();
      github.setToken(null);
      clearAlerts();
      await setStep(1);
    }
  });
}

if (unlinkBtn) {
  unlinkBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to unlink this repository from SolveSync?')) {
      await defaultStorage.unlinkRepo();
      await setStep(2);
      loadUserRepositories();
    }
  });
}

window.addEventListener('hashchange', async () => {
  const token = await defaultStorage.getToken();
  if (token && window.location.hash === '#step2') {
    await setStep(2);
    loadUserRepositories();
  }
});

init();
