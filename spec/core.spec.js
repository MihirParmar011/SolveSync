import {
  PLATFORMS,
  SUBMISSION_STATUS,
  createSubmission,
  createSyncJob,
  toKebabCase,
  getLanguageExtension,
} from '../scripts/core/models.js';
import { StorageService } from '../scripts/core/storage.js';
import { FileGenerator } from '../scripts/core/generator.js';
import { StatsService } from '../scripts/core/stats.js';
import { SyncQueue } from '../scripts/core/queue.js';
import { GitHubClient } from '../scripts/core/github.js';
import { LeetCodeAdapter } from '../scripts/core/adapters/leetcode.js';
import { GFGAdapter } from '../scripts/core/adapters/gfg.js';
import { CodeChefAdapter } from '../scripts/core/adapters/codechef.js';
import { HackerRankAdapter } from '../scripts/core/adapters/hackerrank.js';

describe('SolveSync Core Architecture', () => {
  describe('Models & Utilities', () => {
    it('toKebabCase should correctly format problem titles', () => {
      expect(toKebabCase('Two Sum')).toBe('two-sum');
      expect(toKebabCase('3Sum Closest')).toBe('3sum-closest');
      expect(toKebabCase('Merge k Sorted Lists')).toBe('merge-k-sorted-lists');
      expect(toKebabCase('Special @#$ Characters!')).toBe('special-characters');
    });

    it('getLanguageExtension should return correct file extension', () => {
      expect(getLanguageExtension('Python3')).toBe('.py');
      expect(getLanguageExtension('C++')).toBe('.cpp');
      expect(getLanguageExtension('Java')).toBe('.java');
      expect(getLanguageExtension('Javascript')).toBe('.js');
      expect(getLanguageExtension('Rust')).toBe('.rs');
      expect(getLanguageExtension('Go')).toBe('.go');
    });

    it('createSubmission should produce a normalized structure', () => {
      const sub = createSubmission({
        platform: PLATFORMS.LEETCODE,
        problem: {
          title: 'Two Sum',
          difficulty: 'Easy',
          topics: ['Array', 'Hash Table'],
        },
        submission: {
          language: 'Python3',
          code: 'class Solution:\n    pass',
        },
        performance: {
          runtime: '45 ms',
          memory: '16.5 MB',
        },
      });

      expect(sub.platform).toBe('leetcode');
      expect(sub.problem.slug).toBe('two-sum');
      expect(sub.problem.difficulty).toBe('easy');
      expect(sub.submission.languageExtension).toBe('.py');
      expect(sub.submission.status).toBe(SUBMISSION_STATUS.ACCEPTED);
      expect(sub.problem.topics).toContain('Hash Table');
    });

    it('createSyncJob should create a queue job with pending state', () => {
      const sub = createSubmission({
        platform: PLATFORMS.LEETCODE,
        problem: { title: 'Two Sum' },
      });
      const job = createSyncJob(sub);

      expect(job.id).toMatch(/^job_/);
      expect(job.state).toBe('pending');
      expect(job.attempts).toBe(0);
      expect(job.submission.problem.title).toBe('Two Sum');
    });
  });

  describe('StorageService', () => {
    let storage;

    beforeEach(() => {
      storage = new StorageService({}); // Uses memory store fallback
    });

    it('should set and get values', async () => {
      await storage.set({ testKey: 'testVal' });
      const res = await storage.get('testKey');
      expect(res.testKey).toBe('testVal');
    });

    it('should handle convenience token and hook accessors', async () => {
      await storage.setToken('mock_token_123');
      expect(await storage.getToken()).toBe('mock_token_123');

      await storage.setHook('user/my-solutions');
      expect(await storage.getHook()).toBe('user/my-solutions');
    });

    it('should record and truncate history to 50 items', async () => {
      for (let i = 1; i <= 55; i++) {
        await storage.recordHistory({ title: `Problem ${i}` });
      }
      const history = await storage.getHistory();
      expect(history.length).toBe(50);
      expect(history[0].title).toBe('Problem 55');
    });
  });

  describe('FileGenerator', () => {
    const mockSubmission = createSubmission({
      platform: PLATFORMS.LEETCODE,
      problem: {
        title: 'Reverse Linked List',
        slug: 'reverse-linked-list',
        url: 'https://leetcode.com/problems/reverse-linked-list/',
        difficulty: 'Easy',
        topics: ['Linked List', 'Recursion'],
        description: 'Given the head of a singly linked list, reverse the list.',
      },
      submission: {
        language: 'Java',
        code: 'class Solution { public ListNode reverseList(ListNode head) {} }',
      },
      performance: {
        runtime: '0 ms',
        runtimePercentile: 100,
        memory: '42 MB',
        memoryPercentile: 75,
      },
    });

    it('should generate solution file and README.md', () => {
      const files = FileGenerator.generate(mockSubmission);
      expect(files.length).toBe(2);

      const solution = files.find(f => f.type === 'solution');
      expect(solution).toBeDefined();
      expect(solution.path).toBe('reverse-linked-list/reverse-linked-list.java');
      expect(solution.content).toContain('class Solution');

      const readme = files.find(f => f.type === 'readme');
      expect(readme).toBeDefined();
      expect(readme.path).toBe('reverse-linked-list/README.md');
      expect(readme.content).toContain('Reverse Linked List');
      expect(readme.content).toContain('Difficulty-Easy-brightgreen');
      expect(readme.content).toContain('Linked List');
      expect(readme.content).toContain('SolveSync');
    });

    it('should generate informative commit messages', () => {
      const msg = FileGenerator.generateCommitMessage(mockSubmission);
      expect(msg).toContain('Time: 0 ms');
      expect(msg).toContain('Memory: 42 MB');
      expect(msg).toContain('SolveSync');
    });
  });

  describe('StatsService', () => {
    it('should create initial empty platform-aware stats', () => {
      const stats = StatsService.createEmptyStats();
      expect(stats.version).toBe(1);
      expect(stats.totals.solved).toBe(0);
      expect(stats.platforms.leetcode.solved).toBe(0);
      expect(stats.platforms.geeksforgeeks.solved).toBe(0);
    });

    it('should record submissions and increment platform and difficulty counters', () => {
      let stats = StatsService.createEmptyStats();

      const sub1 = createSubmission({
        platform: PLATFORMS.LEETCODE,
        problem: { title: 'Two Sum', difficulty: 'Easy' },
      });
      stats = StatsService.recordSubmission(stats, sub1);

      expect(stats.totals.solved).toBe(1);
      expect(stats.platforms.leetcode.solved).toBe(1);
      expect(stats.platforms.leetcode.easy).toBe(1);

      const sub2 = createSubmission({
        platform: PLATFORMS.GEEKSFORGEEKS,
        problem: { title: 'Array Search', difficulty: 'Medium' },
      });
      stats = StatsService.recordSubmission(stats, sub2);

      expect(stats.totals.solved).toBe(2);
      expect(stats.platforms.geeksforgeeks.solved).toBe(1);
      expect(stats.platforms.geeksforgeeks.medium).toBe(1);
    });

    it('should merge local and remote stats accurately', () => {
      const local = {
        version: 1,
        totals: { solved: 5 },
        platforms: {
          leetcode: { solved: 5, easy: 3, medium: 2, hard: 0 },
        },
      };

      const remote = {
        version: 1,
        totals: { solved: 7 },
        platforms: {
          leetcode: { solved: 4, easy: 2, medium: 2, hard: 0 },
          geeksforgeeks: { solved: 3, easy: 2, medium: 1, hard: 0 },
        },
      };

      const merged = StatsService.mergeStats(local, remote);
      expect(merged.platforms.leetcode.solved).toBe(5);
      expect(merged.platforms.geeksforgeeks.solved).toBe(3);
      expect(merged.totals.solved).toBe(8);
    });

    it('should support legacy format conversion for backwards compatibility', () => {
      const stats = {
        version: 1,
        totals: { solved: 10 },
        platforms: {
          leetcode: { solved: 10, easy: 5, medium: 4, hard: 1 },
        },
      };
      const legacy = StatsService.toLegacyFormat(stats);
      expect(legacy.solved).toBe(10);
      expect(legacy.easy).toBe(5);
      expect(legacy.medium).toBe(4);
      expect(legacy.hard).toBe(1);
    });
  });

  describe('SyncQueue', () => {
    let storage;
    let queue;

    beforeEach(() => {
      storage = new StorageService({});
      queue = new SyncQueue(storage);
    });

    it('should enqueue, update, and retrieve jobs', async () => {
      const sub = createSubmission({
        platform: PLATFORMS.LEETCODE,
        problem: { title: 'Merge Two Sorted Lists' },
      });

      const job = await queue.enqueue(sub);
      expect(job.state).toBe('pending');

      const next = await queue.getNextEligibleJob();
      expect(next).toBeDefined();
      expect(next.id).toBe(job.id);

      await queue.markUploading(job.id);
      const uploadingJob = (await queue.getAll())[0];
      expect(uploadingJob.state).toBe('uploading');

      await queue.markSuccess(job.id);
      const successJob = (await queue.getAll())[0];
      expect(successJob.state).toBe('success');
    });

    it('should handle retries on failure', async () => {
      const sub = createSubmission({
        platform: PLATFORMS.LEETCODE,
        problem: { title: 'Test Problem' },
      });

      const job = await queue.enqueue(sub);
      await queue.markFailed(job.id, new Error('Network timeout'));

      const failedJob = (await queue.getAll())[0];
      expect(failedJob.state).toBe('failed');
      expect(failedJob.attempts).toBe(1);
      expect(failedJob.lastError).toContain('Network timeout');

      // Still eligible for retry since attempts < 3
      const next = await queue.getNextEligibleJob();
      expect(next).not.toBeNull();
    });
  });

  describe('GitHubClient Utilities', () => {
    it('should correctly encode and decode UTF-8 content to base64', () => {
      const original = 'Hello world! 🚀 SolveSync multi-platform coding sync.';
      const encoded = GitHubClient.utf8ToBase64(original);
      const decoded = GitHubClient.base64ToUtf8(encoded);
      expect(decoded).toBe(original);
    });
  });

  describe('LeetCodeAdapter', () => {
    const adapter = new LeetCodeAdapter();

    it('matches should identify LeetCode problem URLs', () => {
      expect(adapter.matches('https://leetcode.com/problems/two-sum/')).toBe(true);
      expect(
        adapter.matches('https://leetcode.com/problems/add-two-numbers/submissions/12345/')
      ).toBe(true);
      expect(adapter.matches('https://leetcode.com/explore/')).toBe(false);
      expect(adapter.matches('https://geeksforgeeks.org')).toBe(false);
    });

    it('addLeadingZeros should correctly format numbers with 4 digits', () => {
      expect(LeetCodeAdapter.addLeadingZeros(1)).toBe('0001');
      expect(LeetCodeAdapter.addLeadingZeros(25)).toBe('0025');
      expect(LeetCodeAdapter.addLeadingZeros(300)).toBe('0300');
      expect(LeetCodeAdapter.addLeadingZeros(4000)).toBe('4000');
    });

    it('createNormalizedSubmission should transform raw GraphQL data correctly', () => {
      const mockRawData = {
        code: 'def twoSum(nums, target):\n    return []',
        timestamp: 1672531199,
        runtimeDisplay: '55 ms',
        runtimePercentile: 88.5,
        memoryDisplay: '17.2 MB',
        memoryPercentile: 72.1,
        lang: { name: 'python3', verboseName: 'Python3' },
        question: {
          questionId: '1',
          questionFrontendId: '1',
          title: 'Two Sum',
          titleSlug: 'two-sum',
          difficulty: 'Easy',
          content: '<p>Given an array of integers nums and an integer target...</p>',
          topicTags: [
            { name: 'Array', slug: 'array' },
            { name: 'Hash Table', slug: 'hash-table' },
          ],
        },
      };

      const normalized = adapter.createNormalizedSubmission(mockRawData, '999999');

      expect(normalized.platform).toBe('leetcode');
      expect(normalized.problem.id).toBe('1');
      expect(normalized.problem.slug).toBe('0001-two-sum');
      expect(normalized.problem.title).toBe('1. Two Sum');
      expect(normalized.problem.difficulty).toBe('easy');
      expect(normalized.problem.topics).toContain('Array');
      expect(normalized.problem.topics).toContain('Hash Table');
      expect(normalized.submission.code).toContain('def twoSum');
      expect(normalized.submission.language).toBe('python3');
      expect(normalized.performance.runtime).toBe('55 ms');
      expect(normalized.performance.runtimePercentile).toBe(89);
      expect(normalized.performance.memory).toBe('17.2 MB');
      expect(normalized.performance.memoryPercentile).toBe(72);
    });
  });

  describe('GFGAdapter', () => {
    const adapter = new GFGAdapter();

    it('matches should identify GeeksForGeeks problem URLs', () => {
      expect(
        adapter.matches('https://practice.geeksforgeeks.org/problems/reverse-an-array/1')
      ).toBe(true);
      expect(
        adapter.matches(
          'https://www.geeksforgeeks.org/problems/subarray-with-given-sum-1587115621/1'
        )
      ).toBe(true);
      expect(adapter.matches('https://leetcode.com/problems/')).toBe(false);
      expect(adapter.matches('https://github.com/')).toBe(false);
    });

    it('should initialize with geeksforgeeks platform identifier', () => {
      expect(adapter.platform).toBe('geeksforgeeks');
    });
  });

  describe('CodeChefAdapter', () => {
    const adapter = new CodeChefAdapter();

    it('matches should identify CodeChef URLs', () => {
      expect(adapter.matches('https://www.codechef.com/problems/FLOW001')).toBe(true);
      expect(adapter.matches('https://www.codechef.com/submit/TEST')).toBe(true);
      expect(adapter.matches('https://leetcode.com/problems/')).toBe(false);
    });

    it('should initialize with codechef platform identifier', () => {
      expect(adapter.platform).toBe('codechef');
    });
  });

  describe('HackerRankAdapter', () => {
    const adapter = new HackerRankAdapter();

    it('matches should identify HackerRank challenge URLs', () => {
      expect(
        adapter.matches('https://www.hackerrank.com/challenges/simple-array-sum/problem')
      ).toBe(true);
      expect(
        adapter.matches('https://www.hackerrank.com/challenges/diagonal-difference/submissions')
      ).toBe(true);
      expect(adapter.matches('https://leetcode.com/problems/')).toBe(false);
    });

    it('should initialize with hackerrank platform identifier', () => {
      expect(adapter.platform).toBe('hackerrank');
    });
  });
});
