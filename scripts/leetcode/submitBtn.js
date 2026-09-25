import { getBrowser } from './util.js';

let api = getBrowser();

/**
 * Robustly locate the action buttons container on LeetCode's submission page
 */
const getSubmissionPageBtns = () => {
  // Strategy 1: Find container by locating the 'Solution' or 'Analysis' action buttons (modern LeetCode UI)
  const buttons = Array.from(document.querySelectorAll('button, a'));
  const actionBtn = buttons.find(b => {
    if (b.id === 'solvesync-manual-sync-btn') return false;
    const txt = (b.textContent || '').trim();
    return (
      (txt.includes('Solution') || txt.includes('Analysis')) &&
      !txt.includes('SolveSync') &&
      b.offsetParent !== null // visible
    );
  });

  if (actionBtn && actionBtn.parentElement) {
    return actionBtn.parentElement;
  }

  // Strategy 2: Look for button group near the submission status (Accepted)
  const statusContainer = document.querySelector(
    '[data-e2e-locator="submission-result"], .text-green-s, .dark\\:text-dark-green-s'
  );
  if (statusContainer) {
    const parentRow = statusContainer.closest('.flex');
    if (parentRow) {
      const btnBar = parentRow.querySelector('.flex.gap-2, .flex.gap-3, div[class*="gap-"]');
      if (btnBar) return btnBar;
    }
  }

  // Strategy 3: Common flex containers in submission detail pane
  const candidates = document.querySelectorAll(
    '.flex.flex-none.gap-2, .flex.gap-2, .flex.items-center.gap-2, .flex.items-center.gap-3'
  );
  for (const c of candidates) {
    if (c.textContent.includes('Solution') || c.textContent.includes('Analysis')) {
      return c;
    }
  }

  // Strategy 4: Legacy fallback selector
  return document.querySelector('.flex.flex-none.gap-2:not(.justify-center):not(.justify-between)');
};

const createToolTip = () => {
  const toolTip = document.createElement('div');
  toolTip.id = 'solvesync-upload-tooltip';
  toolTip.textContent =
    'Upload this submission to GitHub via SolveSync.\nUpdates code, README, and submission analytics.';
  toolTip.className =
    'fixed bg-sd-popover text-sd-popover-foreground rounded-sd-md z-modal text-xs text-left font-normal whitespace-pre-line shadow p-3 border-sd-border border cursor-default translate-y-20 transition-opacity opacity-0 transition-delay-1000 duration-300 group-hover:opacity-100 pointer-events-none';
  return toolTip;
};

const createGitIcon = () => {
  const uploadIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  uploadIcon.setAttribute('id', 'solvesync-upload-icon');
  uploadIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  uploadIcon.setAttribute('width', '15');
  uploadIcon.setAttribute('height', '15');
  uploadIcon.setAttribute('viewBox', '0 0 24 24');
  uploadIcon.setAttribute('fill', 'none');
  uploadIcon.setAttribute('stroke', 'currentColor');
  uploadIcon.setAttribute('stroke-width', '2.5');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67');
  uploadIcon.appendChild(path);

  return uploadIcon;
};

function addManualSubmitBtn(eventHandler) {
  if (document.getElementById('solvesync-manual-sync-btn')) return;

  const btns = getSubmissionPageBtns();
  if (!btns) return;

  const btn = document.createElement('button');
  btn.id = 'solvesync-manual-sync-btn';
  btn.type = 'button';
  btn.innerText = 'Sync w/ SolveSync';
  btn.setAttribute(
    'style',
    'background-color: #0f766e !important; color: #ffffff !important; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; border: none; z-index: 10; transition: all 150ms ease; box-shadow: 0 1px 3px rgba(0,0,0,0.3);'
  );
  btn.setAttribute(
    'class',
    'group whitespace-nowrap focus:outline-none hover:opacity-90 flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold'
  );

  btn.prepend(createGitIcon());
  btn.appendChild(createToolTip());

  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    eventHandler(e);
  });

  btns.appendChild(btn);
}

function setupManualSubmitBtn(submitBtnHandler) {
  const checkAndInject = () => {
    const url = window.location.href;
    if (url.includes('/submissions/')) {
      addManualSubmitBtn(submitBtnHandler);
    }
  };

  // 1. Check immediately
  checkAndInject();

  // 2. Continuous check every 700ms for SPA navigation & tab changes
  setInterval(checkAndInject, 700);

  // 3. MutationObserver on document.body for instant DOM updates
  const observer = new MutationObserver(() => {
    checkAndInject();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

export default setupManualSubmitBtn;
