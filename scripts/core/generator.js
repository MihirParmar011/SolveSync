/**
 * SolveSync File Generator
 * Pure generator functions for solution files, problem READMEs, and commit messages.
 * No side effects or API calls.
 */

export class FileGenerator {
  /**
   * Generates all files for a given normalized submission
   * @param {Object} submission Normalized Submission
   * @param {Object} options Configuration options
   * @returns {Array<{ path: string, content: string, type: string }>}
   */
  static generate(submission, options = {}) {
    const files = [];
    const folder = this.getFolderPath(submission, options);

    // 1. Solution source file
    const solutionPath = `${folder}${submission.problem.slug}${
      submission.submission.languageExtension || '.txt'
    }`;
    files.push({
      path: solutionPath,
      content: submission.submission.code || '',
      type: 'solution',
    });

    // 2. Problem README.md
    const readmePath = `${folder}README.md`;
    const readmeContent = this.generateReadme(submission);
    files.push({
      path: readmePath,
      content: readmeContent,
      type: 'readme',
    });

    return files;
  }

  /**
   * Constructs the directory path for the problem
   */
  static getFolderPath(submission, options = {}) {
    let parts = [];
    if (options.directoryPrefix) {
      parts.push(options.directoryPrefix.replace(/^\/+|\/+$/g, ''));
    }
    if (options.groupByPlatform) {
      parts.push(submission.platform);
    }
    parts.push(submission.problem.slug);
    return `${parts.join('/')}/`;
  }

  /**
   * Formats the Markdown README for the problem
   */
  static generateReadme(submission) {
    const { problem, performance } = submission;
    const lines = [];

    // Title and Link
    if (problem.url) {
      lines.push(`<h2><a href="${problem.url}">${problem.title}</a></h2>`);
    } else {
      lines.push(`<h2>${problem.title}</h2>`);
    }

    // Badges: Difficulty & Platform
    const badges = [];
    if (problem.difficulty) {
      const diff = problem.difficulty.toLowerCase();
      let color = 'brightgreen';
      if (diff === 'medium') color = 'orange';
      if (diff === 'hard') color = 'red';
      const capDiff = diff.charAt(0).toUpperCase() + diff.slice(1);
      badges.push(
        `<h3><img src='https://img.shields.io/badge/Difficulty-${capDiff}-${color}' alt='Difficulty: ${capDiff}' /></h3>`
      );
    }

    if (badges.length > 0) {
      lines.push(badges.join(' '));
    }

    lines.push('<hr>');

    // Problem Description
    if (problem.description) {
      lines.push(problem.description.trim());
      lines.push('<hr>');
    }

    // Performance Details if present
    if (performance && (performance.runtime || performance.memory)) {
      const perfParts = [];
      if (performance.runtime) {
        perfParts.push(
          `**Time:** ${performance.runtime}${
            performance.runtimePercentile ? ` (${performance.runtimePercentile}%)` : ''
          }`
        );
      }
      if (performance.memory) {
        perfParts.push(
          `**Memory:** ${performance.memory}${
            performance.memoryPercentile ? ` (${performance.memoryPercentile}%)` : ''
          }`
        );
      }
      lines.push(`### Performance\n${perfParts.join(' | ')}`);
      lines.push('<hr>');
    }

    // Topics / Tags
    if (problem.topics && problem.topics.length > 0) {
      lines.push(`**Topics:** ${problem.topics.map(t => `\`${t}\``).join(', ')}`);
      lines.push('<hr>');
    }

    // Footer
    lines.push(
      '<sub>Synchronized by [SolveSync](https://github.com/MihirParmar011/SolveSync)</sub>'
    );

    return lines.join('\n\n');
  }

  /**
   * Generates a descriptive git commit message
   */
  static generateCommitMessage(submission) {
    const { problem, performance } = submission;
    const diff = problem.difficulty ? ` [${problem.difficulty.toUpperCase()}]` : '';
    let msg = `Added solution - ${problem.title}${diff}`;

    if (performance?.runtime && performance?.memory) {
      msg = `Time: ${performance.runtime}, Memory: ${performance.memory} - SolveSync`;
    }

    return msg;
  }
}
