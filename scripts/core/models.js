/**
 * SolveSync Normalized Data Models
 * Consistent representation across all competitive programming platforms.
 */

export const PLATFORMS = {
  LEETCODE: 'leetcode',
  GEEKSFORGEEKS: 'geeksforgeeks',
  CODECHEF: 'codechef',
  HACKERRANK: 'hackerrank',
};

export const SUBMISSION_STATUS = {
  ACCEPTED: 'accepted',
  WRONG_ANSWER: 'wrong_answer',
  ERROR: 'error',
  UNKNOWN: 'unknown',
};

export const DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

export const LANGUAGE_EXTENSIONS = {
  c: '.c',
  'c++': '.cpp',
  cpp: '.cpp',
  java: '.java',
  python: '.py',
  python3: '.py',
  py: '.py',
  javascript: '.js',
  js: '.js',
  typescript: '.ts',
  ts: '.ts',
  csharp: '.cs',
  'c#': '.cs',
  cs: '.cs',
  go: '.go',
  golang: '.go',
  rust: '.rs',
  ruby: '.rb',
  swift: '.swift',
  kotlin: '.kt',
  scala: '.scala',
  php: '.php',
  sql: '.sql',
  mysql: '.sql',
  bash: '.sh',
};

/**
 * Normalizes language string to file extension
 * @param {string} lang
 * @returns {string} File extension including leading dot
 */
export function getLanguageExtension(lang) {
  if (!lang) return '.txt';
  const clean = lang.trim().toLowerCase();
  return LANGUAGE_EXTENSIONS[clean] || `.${clean.replace(/[^a-z0-9]/g, '') || 'txt'}`;
}

/**
 * Converts a title to kebab-case slug
 * @param {string} str
 * @returns {string}
 */
export function toKebabCase(str) {
  if (!str) return '';
  return str
    .toString()
    .trim()
    .replace(/[^a-zA-Z0-9\s-_.]/g, '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Factory function for creating a normalized Submission object
 * @param {Object} params
 * @returns {Object} Normalized Submission
 */
export function createSubmission({
  platform,
  problem = {},
  submission = {},
  performance = {},
  source = {},
}) {
  return {
    platform: platform || PLATFORMS.LEETCODE,
    problem: {
      id: problem.id ? String(problem.id) : undefined,
      slug: problem.slug || toKebabCase(problem.title || ''),
      title: problem.title || '',
      url: problem.url || '',
      difficulty: problem.difficulty ? problem.difficulty.toLowerCase() : undefined,
      topics: Array.isArray(problem.topics) ? problem.topics : [],
      description: problem.description || '',
    },
    submission: {
      id: submission.id ? String(submission.id) : undefined,
      status: submission.status || SUBMISSION_STATUS.ACCEPTED,
      language: submission.language || 'Unknown',
      languageExtension: submission.languageExtension || getLanguageExtension(submission.language),
      code: submission.code || '',
      submittedAt: submission.submittedAt || new Date().toISOString(),
    },
    performance: {
      runtime: performance.runtime || undefined,
      runtimePercentile: performance.runtimePercentile || undefined,
      memory: performance.memory || undefined,
      memoryPercentile: performance.memoryPercentile || undefined,
    },
    source: {
      pageUrl: source.pageUrl || '',
      extractedAt: source.extractedAt || new Date().toISOString(),
    },
  };
}

/**
 * Factory function for creating a SyncJob queue item
 * @param {Object} params
 * @returns {Object}
 */
export function createSyncJob(submission, state = 'pending') {
  return {
    id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    submission,
    state, // 'pending' | 'uploading' | 'success' | 'failed'
    attempts: 0,
    maxAttempts: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastError: null,
  };
}
