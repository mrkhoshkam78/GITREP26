/**
 * GPE V2 — GitHub API client (browser-side, optional PAT)
 */
class GitHub {
  constructor() {
    this.base = 'https://api.github.com';
    this.token = '';
    this.rate = { remaining: null, limit: null, reset: null };
  }
  setToken(t) { this.token = (t||'').trim(); }
  hasToken() { return !!this.token; }
  headers() {
    const h = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }
  _updateRate(res) {
    const rem = res.headers.get('X-RateLimit-Remaining');
    const lim = res.headers.get('X-RateLimit-Limit');
    const reset = res.headers.get('X-RateLimit-Reset');
    if (rem !== null) this.rate.remaining = parseInt(rem, 10);
    if (lim !== null) this.rate.limit = parseInt(lim, 10);
    if (reset !== null) this.rate.reset = parseInt(reset, 10) * 1000;
    window.dispatchEvent(new CustomEvent('ratelimit', { detail: { ...this.rate } }));
  }
  async _fetch(url) {
    const res = await fetch(url, { headers: this.headers() });
    this._updateRate(res);
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
  async rateLimit() {
    try {
      const data = await this._fetch(`${this.base}/rate_limit`);
      const core = data.resources?.core || data.rate || {};
      this.rate = {
        remaining: core.remaining ?? null,
        limit: core.limit ?? null,
        reset: core.reset ? core.reset * 1000 : null
      };
      window.dispatchEvent(new CustomEvent('ratelimit', { detail: { ...this.rate } }));
      return this.rate;
    } catch {
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
