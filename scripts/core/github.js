/**
 * SolveSync GitHub API Client
 * Clean, isolated transport layer for GitHub REST API v3 with automatic 409 conflict retries.
 */

export class GitHubClient {
  constructor(token = null, baseUrl = 'https://api.github.com') {
    this.token = token;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  setToken(token) {
    this.token = token;
  }

  _getHeaders(additional = {}) {
    const headers = {
      Accept: 'application/vnd.github.v3+json',
      ...additional,
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Safe UTF-8 Base64 encoder
   */
  static utf8ToBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  /**
   * Safe UTF-8 Base64 decoder
   */
  static base64ToUtf8(b64) {
    return decodeURIComponent(escape(atob(b64.replace(/\s/g, ''))));
  }

  /**
   * Fetches authenticated user profile
   */
  async getUser() {
    const res = await fetch(`${this.baseUrl}/user`, {
      method: 'GET',
      headers: this._getHeaders(),
    });
    if (!res.ok) {
      throw new Error(`GitHub getUser failed (${res.status}): ${res.statusText}`);
    }
    return await res.json();
  }

  /**
   * Fetches list of repositories accessible to the user
   */
  async getRepositories({ per_page = 100, sort = 'updated' } = {}) {
    const res = await fetch(
      `${this.baseUrl}/user/repos?per_page=${per_page}&sort=${sort}&type=all`,
      {
        method: 'GET',
        headers: this._getHeaders(),
      }
    );
    if (!res.ok) {
      throw new Error(`GitHub getRepositories failed (${res.status}): ${res.statusText}`);
    }
    return await res.json();
  }

  /**
   * Fetches repository metadata
   */
  async getRepository(owner, repo) {
    const res = await fetch(`${this.baseUrl}/repos/${owner}/${repo}`, {
      method: 'GET',
      headers: this._getHeaders(),
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`GitHub getRepository failed (${res.status}): ${res.statusText}`);
    }
    return await res.json();
  }

  /**
   * Creates a new repository
   */
  async createRepository({ name, description = '', isPrivate = true, autoInit = true }) {
    const res = await fetch(`${this.baseUrl}/user/repos`, {
      method: 'POST',
      headers: this._getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        name,
        description,
        private: isPrivate,
        auto_init: autoInit,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errorMsg = err.message || `Failed to create repo (${res.status})`;
      const error = new Error(errorMsg);
      if (
        res.status === 422 ||
        errorMsg.toLowerCase().includes('already exists') ||
        (Array.isArray(err.errors) && err.errors.some(e => e.message?.includes('already exists')))
      ) {
        error.code = 'REPO_EXISTS';
      }
      throw error;
    }
    return await res.json();
  }

  /**
   * Retrieves a file from the repository
   * @returns {Promise<{ exists: boolean, sha: string|null, content: string|null, decodedContent: string|null }>}
   */
  async getFile(owner, repo, path, branch = null) {
    const cleanPath = path.replace(/^\//, '');
    let url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${cleanPath}`;
    if (branch) {
      url += `?ref=${encodeURIComponent(branch)}`;
    }

    const res = await fetch(url, {
      method: 'GET',
      headers: this._getHeaders(),
    });

    if (res.status === 404) {
      return { exists: false, sha: null, content: null, decodedContent: null };
    }

    if (!res.ok) {
      throw new Error(`GitHub getFile '${cleanPath}' failed (${res.status}): ${res.statusText}`);
    }

    const data = await res.json();
    let decoded = null;
    if (data.content) {
      try {
        decoded = GitHubClient.base64ToUtf8(data.content);
      } catch (e) {
        decoded = atob(data.content.replace(/\s/g, ''));
      }
    }

    return {
      exists: true,
      sha: data.sha,
      content: data.content,
      decodedContent: decoded,
    };
  }

  /**
   * Creates or updates a file with automatic 409 conflict resolution
   */
  async createOrUpdateFile(
    owner,
    repo,
    path,
    content,
    message,
    branch = null,
    sha = null,
    maxRetries = 3
  ) {
    const cleanPath = path.replace(/^\//, '');
    let currentSha = sha;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      if (!currentSha && attempt === 0) {
        const existing = await this.getFile(owner, repo, cleanPath, branch);
        if (existing.exists) {
          currentSha = existing.sha;
        }
      }

      const body = {
        message,
        content: GitHubClient.utf8ToBase64(content),
      };

      if (currentSha) {
        body.sha = currentSha;
      }
      if (branch) {
        body.branch = branch;
      }

      const res = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/contents/${cleanPath}`, {
        method: 'PUT',
        headers: this._getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });

      if (res.ok) {
        return await res.json();
      }

      // Handle 409 Conflict: another commit occurred simultaneously
      if (res.status === 409 && attempt < maxRetries) {
        console.warn(
          `SolveSync: 409 Conflict on ${cleanPath}, retrying (attempt ${attempt + 1})...`
        );
        const latest = await this.getFile(owner, repo, cleanPath, branch);
        currentSha = latest.sha;
        // Exponential backoff
        await new Promise(r => setTimeout(r, 300 * Math.pow(2, attempt)));
        continue;
      }

      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to commit file '${cleanPath}' (${res.status})`);
    }
  }

  /**
   * Retrieves branches for a repository
   */
  async getBranches(owner, repo) {
    const res = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/branches`, {
      method: 'GET',
      headers: this._getHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to get branches (${res.status})`);
    }
    return await res.json();
  }

  /**
   * Validates if user has write access to a given repository
   */
  async checkAccess(owner, repo) {
    try {
      const data = await this.getRepository(owner, repo);
      if (!data) return { hasAccess: false, reason: 'Repository not found' };
      const canPush = data.permissions ? data.permissions.push : true;
      return {
        hasAccess: true,
        canPush,
        fullName: data.full_name,
        htmlUrl: data.html_url,
        defaultBranch: data.default_branch || 'main',
      };
    } catch (err) {
      return { hasAccess: false, reason: err.message };
    }
  }
}
