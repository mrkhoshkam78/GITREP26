/**
 * GITREP26 V4 — GitHub API client (browser-side, optional PAT)
 * Token is never hardcoded; loaded from storage only.
 */
class GitHub {
  constructor() {
    this.base = 'https://api.github.com';
    this.token = '';
    this.rate = { remaining: null, limit: null, reset: null };
    this.authStatus = 'guest'; // guest | authenticated | invalid | error
    this.authUser = null;
  }

  setToken(t) {
    this.token = (t || '').trim();
    if (!this.token) {
      this.authStatus = 'guest';
      this.authUser = null;
    }
  }

  hasToken() { return !!this.token; }

  headers() {
    const h = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  isAuthHeaderAttached() {
    return !!(this.headers().Authorization);
  }

  _updateRate(res) {
    const rem = res.headers.get('X-RateLimit-Remaining');
    const lim = res.headers.get('X-RateLimit-Limit');
    const reset = res.headers.get('X-RateLimit-Reset');
    if (rem !== null) this.rate.remaining = parseInt(rem, 10);
    if (lim !== null) this.rate.limit = parseInt(lim, 10);
    if (reset !== null) this.rate.reset = parseInt(reset, 10) * 1000;
    window.dispatchEvent(new CustomEvent('ratelimit', {
      detail: { ...this.rate, authStatus: this.authStatus }
    }));
  }

  async _fetch(url) {
    const res = await fetch(url, { headers: this.headers() });
    this._updateRate(res);
    if (res.status === 401) {
      const err = new Error('Invalid or expired token');
      err.code = 'AUTH_INVALID';
      throw err;
    }
    if (res.status === 403 || res.status === 429) {
      const err = new Error('Rate limited');
      err.code = 'RATE_LIMIT';
      throw err;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `GitHub API ${res.status}`);
    }
    return res.json();
  }

  /**
   * Validate a candidate token WITHOUT mutating persisted storage.
   * Temporarily uses the candidate for the request, restores previous on failure if requested.
   * @param {string} candidate
   * @param {{ keepOnFailure?: boolean }} opts
   */
  async validateToken(candidate, opts = {}) {
    const keepOnFailure = opts.keepOnFailure !== false;
    const prev = this.token;
    const test = (candidate || '').trim();

    if (!test) {
      this.authStatus = 'guest';
      this.authUser = null;
      this.token = '';
      return { ok: true, status: 'guest', user: null, rate: this.rate, message: 'Guest mode' };
    }

    this.setToken(test);
    try {
      const user = await this._fetch(`${this.base}/user`);
      this.authUser = { login: user.login, avatar_url: user.avatar_url, name: user.name };
      this.authStatus = 'authenticated';
      await this.rateLimit();
      return {
        ok: true,
        status: 'authenticated',
        user: this.authUser,
        rate: { ...this.rate },
        message: `Authenticated as @${user.login}`,
        authHeader: this.isAuthHeaderAttached(),
        token: test
      };
    } catch (e) {
      if (e.code === 'AUTH_INVALID') {
        this.authStatus = 'invalid';
        this.authUser = null;
        if (keepOnFailure && prev) {
          this.setToken(prev);
          this.authStatus = 'authenticated'; // previous may still be valid; re-check later
        } else if (!keepOnFailure) {
          this.setToken('');
        }
        return { ok: false, status: 'invalid', user: null, rate: this.rate, message: e.message, token: test };
      }
      // Network / rate limit: do not discard previous token
      if (keepOnFailure && prev) this.setToken(prev);
      this.authStatus = e.code === 'RATE_LIMIT' ? 'error' : 'error';
      return {
        ok: false,
        status: 'error',
        user: null,
        rate: this.rate,
        message: e.message || 'Validation failed',
        token: test
      };
    }
  }

  async search(query, page = 1, perPage = 30, sort = 'stars') {
    const q = encodeURIComponent(query);
    const url = `${this.base}/search/repositories?q=${q}&sort=${sort}&order=desc&page=${page}&per_page=${perPage}`;
    const data = await this._fetch(url);
    return {
      total: data.total_count || 0,
      items: (data.items || []).map(i => this.normalize(i))
    };
  }

  async getRepo(owner, name) {
    return this.normalize(await this._fetch(`${this.base}/repos/${owner}/${name}`));
  }

  async getReadme(owner, name) {
    try {
      const data = await this._fetch(`${this.base}/repos/${owner}/${name}/readme`);
      if (data.content) {
        return decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
      }
    } catch { /* ignore */ }
    return null;
  }

  async getLanguages(owner, name) {
    try {
      return await this._fetch(`${this.base}/repos/${owner}/${name}/languages`);
    } catch { return {}; }
  }

  async getContents(owner, name, path = '') {
    try {
      const data = await this._fetch(`${this.base}/repos/${owner}/${name}/contents/${path}`);
      return Array.isArray(data) ? data : [data];
    } catch { return []; }
  }

  async getReleases(owner, name) {
    try {
      return await this._fetch(`${this.base}/repos/${owner}/${name}/releases?per_page=5`);
    } catch { return []; }
  }

  async rateLimit() {
    try {
      const data = await this._fetch(`${this.base}/rate_limit`);
      const core = data.resources?.core || data.rate || {};
      this.rate = {
        remaining: core.remaining ?? null,
        limit: core.limit ?? null,
        reset: core.reset ? core.reset * 1000 : null
      };
      window.dispatchEvent(new CustomEvent('ratelimit', {
        detail: { ...this.rate, authStatus: this.authStatus }
      }));
      return this.rate;
    } catch (e) {
      if (e.code === 'AUTH_INVALID') this.authStatus = 'invalid';
      return this.rate;
    }
  }

  normalize(item) {
    return {
      id: item.id,
      name: item.name,
      full_name: item.full_name,
      description: item.description || '',
      html_url: item.html_url,
      stargazers_count: item.stargazers_count || 0,
      forks_count: item.forks_count || 0,
      language: item.language || 'Unknown',
      license: item.license ? (item.license.spdx_id || item.license.name) : null,
      updated_at: item.updated_at,
      pushed_at: item.pushed_at || item.updated_at,
      topics: item.topics || [],
      owner: { login: item.owner?.login || '', avatar_url: item.owner?.avatar_url || '' },
      open_issues_count: item.open_issues_count || 0,
      size: item.size || 0,
      default_branch: item.default_branch || 'main'
    };
  }
}

export const github = new GitHub();
window.github = github;
