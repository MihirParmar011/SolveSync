<h1 align="center">
  <img src="assets/octocode.png" alt="SolveSync - Automatically sync your code to GitHub." width="400">
  <br>
  SolveSync — Autonomous Competitive Programming Synchronization
  <br>
</h1>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-teal.svg" alt="version 0.1.0"/>
  <img src="https://img.shields.io/badge/manifest-v3-blue.svg" alt="Manifest V3"/>
  <img src="https://img.shields.io/badge/browsers-Chrome%20%7C%20Firefox%20%7C%20Brave%20%7C%20Edge-purple.svg" alt="Browser Support"/>
  <img src="https://img.shields.io/badge/platforms-LeetCode%20%7C%20GFG%20%7C%20HackerRank%20%7C%20CodeChef-orange.svg" alt="Supported Platforms"/>
</p>

---

## Table of Contents

- [What is SolveSync?](#what-is-solvesync)
- [Key Features](#key-features)
- [Supported Platforms](#supported-platforms)
- [How to Install SolveSync](#how-to-install-solvesync)
- [Complete Walkthrough: How to Use SolveSync](#complete-walkthrough-how-to-use-solvesync)
  - [Step 1: Authenticate with GitHub](#step-1-authenticate-with-github)
  - [Step 2: Connect or Create a Repository](#step-2-connect-or-create-a-repository)
  - [Step 3: Solve Problems & Auto-Sync](#step-3-solve-problems--auto-sync)
  - [Step 4: Manual Synchronization](#step-4-manual-synchronization)
  - [Step 5: Track Progress in the Analytics Dashboard](#step-5-track-progress-in-the-analytics-dashboard)
- [How Your GitHub Repository is Structured](#how-your-github-repository-is-structured)
- [Local Development & Building from Source](#local-development--building-from-source)
- [Project Architecture](#project-architecture)

---

## What is SolveSync?

**SolveSync** is a modern browser extension built on WebExtensions Manifest V3 that automatically synchronizes your accepted coding solutions from competitive programming platforms directly to your personal GitHub repository.

When you practice Data Structures and Algorithms on platforms like LeetCode, GeeksforGeeks, HackerRank, or CodeChef, your solutions normally stay isolated inside those websites. SolveSync eliminates this friction by instantly capturing your code, problem descriptions, constraints, difficulty levels, and performance metrics (runtime and memory percentiles), committing them directly to a clean, structured GitHub repository.

Whether you are preparing for technical interviews or building a public portfolio of algorithmic problem solving, SolveSync maintains your version-controlled repository on autopilot.

---

## Key Features

- **Autonomous Background Synchronization:** The moment your code passes all test cases, SolveSync detects the accepted status and immediately pushes your solution to GitHub with zero clicks required.
- **Rich Problem Documentation:** Generates a dedicated `README.md` for each problem featuring the official problem description, constraints, topic tags, difficulty badges, and custom notes.
- **Performance-Indexed Commits:** Commit messages record your exact runtime speed, memory consumption, and percentile rankings (e.g., `Time: 42 ms (87.5%), Space: 16.5 MB (74.2%) - SolveSync`).
- **Modern Analytics Dashboard:** Includes a full-page glassmorphism analytics dashboard (`dashboard.html`) displaying solved problems categorized by difficulty (Easy, Medium, Hard), platform breakdowns, historical logs, and settings toggles.
- **Manual "Sync w/ SolveSync" Action:** Revisit any previous submission page on supported platforms and click the injected manual sync button to upload or update historical solutions without having to re-solve the problem.
- **Offline Resilient Queue & Conflict Resolution:** Implements an automated retry pipeline with SHA reconciliation to gracefully handle GitHub HTTP 409 conflict errors, plus an offline sync queue that saves pending submissions if your connection drops.
- **Multi-Language Support:** Automatically maps file extensions for over 25 programming languages including C++, Python, Java, JavaScript, TypeScript, Go, Rust, C#, Kotlin, Swift, SQL, and more.
- **Cross-Browser Manifest V3 Standard:** Fully compatible with Google Chrome, Brave, Microsoft Edge, and Mozilla Firefox.

---

## Supported Platforms

| Platform | Status | Features Supported |
| :--- | :--- | :--- |
| **LeetCode** | Full Support | Dynamic GraphQL submissions, legacy UI scraping, keyboard shortcuts (`Ctrl+Enter` / `Cmd+Enter`), manual submission sync button |
| **GeeksforGeeks** | Full Support | Ace editor extraction, problem statement scraping, automated commit on accepted status |
| **HackerRank** | Ready | Domain adapter integration, problem parsing, code submission sync |
| **CodeChef** | Ready | Domain adapter integration, problem parsing, code submission sync |

---

## How to Install SolveSync

### In Google Chrome, Brave, or Microsoft Edge

1. Clone or download this repository to your local machine:
   ```bash
   git clone https://github.com/MihirParmar011/SolveSync.git
   cd SolveSync
   ```
2. Install dependencies and compile the production build:
   ```bash
   npm install
   npm run build
   ```
3. Open your browser and navigate to the extensions management page:
   - **Chrome / Brave:** `chrome://extensions`
   - **Edge:** `edge://extensions`
4. Toggle on **Developer mode** in the top-right corner.
5. Click the **Load unpacked** button.
6. Select the `./dist/chrome` folder inside this project directory.
7. Pin **SolveSync** to your browser toolbar for quick access.

### In Mozilla Firefox

1. Build the extension if you haven't already:
   ```bash
   npm run build
   ```
2. In Firefox, open a new tab and enter: `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on...**
4. Navigate into the `./dist/firefox` directory and select the `manifest.json` file.
5. SolveSync is now active in Firefox.

---

## Complete Walkthrough: How to Use SolveSync

### Step 1: Authenticate with GitHub

1. Click on the **SolveSync** extension icon in your browser toolbar to open the popup.
2. Click the **Authenticate with GitHub** button.
3. A GitHub authorization window will open. Review and approve permissions for SolveSync to access repository operations.
4. Once authorized, the tab will automatically close and you will be redirected to the SolveSync setup page (`welcome.html`).

---

### Step 2: Connect or Create a Repository

On the setup screen, choose how you want SolveSync to store your code:

- **Create a New Repository:**
  Enter a repository name (for example, `competitive-programming` or `leetcode-solutions`) and choose whether it should be **Public** or **Private**. SolveSync will create the repository on your GitHub account automatically.
- **Link an Existing Repository:**
  If you already have a repository where you track your solutions, type its name (e.g., `my-dsa-solutions`) and click **Link Repository**. SolveSync will verify write access and link it immediately.

---

### Step 3: Solve Problems & Auto-Sync

1. Open [LeetCode](https://leetcode.com/) (or any supported platform) and select a problem.
2. Write your solution and click **Submit** (or use `Ctrl+Enter` / `Cmd+Enter`).
3. When the platform evaluates your code and displays **Accepted**, SolveSync triggers in the background:
   - A subtle progress indicator appears next to the submit button.
   - SolveSync queries the problem details, constraints, topic tags, and your execution percentiles.
   - It commits your code file and a formatted `README.md` to your GitHub repository.
   - Once completed, the indicator turns into a green checkmark confirming a successful sync.

---

### Step 4: Manual Synchronization

Want to sync a problem you solved in the past or re-sync an updated version?

1. Go to your submission history for any problem on the platform (e.g., `leetcode.com/problems/<problem-slug>/submissions/<id>/`).
2. SolveSync injects a **Sync w/ SolveSync** button with a GitHub icon into the action bar.
3. Click the button, and SolveSync will fetch the submission details and commit the solution to GitHub immediately.

---

### Step 5: Track Progress in the Analytics Dashboard

Click the SolveSync icon in your browser toolbar and click **Open Dashboard** (or navigate to `dashboard.html`):

- **Overview Cards:** View your total solved count alongside clear breakdowns for **Easy**, **Medium**, and **Hard** problems.
- **Platform Breakdown:** Check problem statistics categorized per platform (LeetCode, GeeksforGeeks, CodeChef, HackerRank).
- **Submissions Log:** Inspect your chronological submission history with timestamps, difficulty tags, and direct links to the problem and repository.
- **Settings & Preferences:**
  - **Auto-Sync Toggle:** Turn instant auto-sync on or off.
  - **Group by Platform:** Toggle whether solutions are stored in root directories (e.g., `0001-two-sum/`) or nested under platform subfolders (e.g., `leetcode/0001-two-sum/`).
  - **Stats.json Generation:** Toggle automatic generation of a root `stats.json` file in your repository, which can be used to generate dynamic profile README stats and badges.
  - **Account Management:** Switch GitHub accounts or unlink/relink target repositories at any time.

---

## How Your GitHub Repository is Structured

When SolveSync pushes solutions to GitHub, it keeps your repository clean, navigable, and portfolio-ready:

```text
my-coding-solutions/
├── README.md               # Root index with problem tables organized by topic tags
├── stats.json              # Machine-readable sync metrics and difficulty counters
└── 0001-two-sum/
    ├── README.md           # Problem statement, difficulty badge, examples, constraints
    ├── NOTES.md            # Personal problem notes (if provided)
    └── 0001-two-sum.py     # Clean solution source code in your chosen language
```

### Problem README Sample

Each problem folder includes a formatted `README.md`:

```markdown
<h2><a href="https://leetcode.com/problems/two-sum/">1. Two Sum</a></h2>
<h3>Easy</h3>
<hr>
<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return <em>indices of the two numbers such that they add up to <code>target</code></em>.</p>
...
```

### Commit Message Format

Commits are detailed and descriptive:

```text
Time: 42 ms (89.24%), Space: 16.4 MB (71.35%) - SolveSync
```

---

## Local Development & Building from Source

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or later recommended)
- `npm` (bundled with Node.js)

### Available NPM Scripts

```bash
# Install dependencies
npm install

# Build production bundles for Chrome and Firefox into ./dist/
npm run build

# Run build in watch mode for active development
npm run dev

# Run automated test suite
npm test

# Check code formatting with Prettier
npm run format-test

# Auto-format codebase with Prettier
npm run format

# Run ESLint validation
npm run lint-test
```

---

## Project Architecture

SolveSync is engineered with a modular, maintainable codebase:

```text
.
├── manifest-chrome.json         # Manifest V3 for Chromium browsers
├── manifest-firefox.json        # Manifest V3 for Firefox
├── webpack.config.js            # Multi-target build and asset packaging pipeline
├── dashboard.html               # Glassmorphism analytics dashboard
├── popup.html                   # Extension toolbar action popup
├── welcome.html                 # OAuth and repository configuration onboarding
├── css/
│   ├── design-tokens.css        # Central color palette, typography, and spacing tokens
│   ├── dashboard.css            # Styles for the full-page analytics dashboard
│   ├── popup.css                # Styles for the toolbar popup UI
│   └── welcome.css              # Styles for the onboarding screen
└── scripts/
    ├── background.js            # Service worker handling navigation and tab lifecycles
    ├── dashboard.js             # Dashboard UI logic and stats visualizer
    ├── popup.js                 # Toolbar popup logic and state management
    ├── welcome.js               # Repository creation and linking flows
    └── core/
        ├── models.js            # Normalized submission models and language mapping
        ├── adapter.js           # Base platform adapter interface
        ├── adapters/            # Platform-specific parsers (LeetCode, GFG, HackerRank, CodeChef)
        ├── engine.js            # Core synchronization coordinator
        ├── generator.js         # Problem markdown and directory tree generator
        ├── github.js            # GitHub REST API v3 client with 409 conflict handling
        ├── queue.js             # Persistent offline sync queue
        ├── stats.js             # Statistics calculation and merging service
        └── storage.js           # Cross-browser chrome.storage abstraction
```
