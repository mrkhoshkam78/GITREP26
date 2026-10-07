/**
 * Optional GitHub API client (browser-side with user token)
 */

class GitHubClient {
  constructor() {
    this.base = 'https://api.github.com';
    this.token = '';
  }

  setToken(token) {
    this.token = token || '';
  }

  _headers() {
    const h = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  async searchRepos(query, page = 1, perPage = 30) {
    const url = `${this.base}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&page=${page}&per_page=${perPage}`;
    const res = await fetch(url, { headers: this._headers() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `GitHub API error: ${res.status}`);
    }
    const data = await res.json();
    return (data.items || []).map(item => this._normalize(item));
  }

  async getRepo(owner, name) {
    const url = `${this.base}/repos/${owner}/${name}`;
    const res = await fetch(url, { headers: this._headers() });
    if (!res.ok) throw new Error(`Repo not found: ${res.status}`);
    const item = await res.json();
    return this._normalize(item);
  }

  _normalize(item) {
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
      owner: {
        login: item.owner?.login || '',
        avatar_url: item.owner?.avatar_url || ''
      },
      open_issues_count: item.open_issues_count || 0,
      size: item.size || 0
    };
  }
}

const github = new GitHubClient();
window.github = github;
