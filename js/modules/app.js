/**
 * GITREP26 V6 — App bootstrap (loads full logic + polyfills)
 */
import { i18n } from './i18n.js';
import { storage } from './storage.js';
import { analyzer } from './analyzer.js';
import { github } from './github.js';
import { translator } from './translator.js';
import { readmeInsight } from './readmeInsight.js';
import { APP_VERSION, APP_NAME, APP_BUILD } from './version.js';
import { installLandingHelpers } from './landingHelpers.js';

window.storage = storage;
window.i18n = i18n;
window.github = github;
window.translator = translator;
window.readmeInsight = readmeInsight;

class App {
  constructor() {
    this.repos = [];
    this.categories = [];
    this.filtered = [];
    this.view = 'home';
    this.currentCat = null;
    this.currentRepo = null;
    this.filters = { q:'', category:null, language:null, minStars:0, offline:false, lightweight:false, beginner:false, active:false };
    this.sort = 'stars';
    try { this.settings = storage.getSettings(); } catch (_) {
      this.settings = { theme:'dark', language:'en', token:'', anim:'full', accent:'purple' };
    }
    this.page = 1;
    this.liveResults = [];
    this.defaultCollapsed = false;
    this.pageSize = 8;
    this.maxPages = 13;
    this.searchPage = 1;
    this.searchTotal = 0;
    this.searching = false;
  }

  async init() {
    const hideLoader = () => { try { document.getElementById('loader')?.classList.add('hidden'); } catch (_) {} };
    const forceTimer = setTimeout(hideLoader, 4000);
    try {
      await Promise.race([storage.init().catch(()=>{}), new Promise(r => setTimeout(r, 2500))]);
      try { i18n.init(); } catch (_) {}
      try { translator.loadShowOriginal(); } catch (_) {}
      const token = storage.getToken();
      this.settings = storage.getSettings();
      this.settings.token = token;
      if (token) github.setToken(token);
      try {
        this.applyTheme(this.settings.theme);
        this.applyAccent(this.settings.accent || 'purple');
        this.applyAnim(this.settings.anim || 'full');
      } catch (_) {}
      this.online = navigator.onLine;
      try { await this.loadData(); } catch (_) { this.repos = this.repos || []; this.filtered = [...this.repos]; }
      try { this.bind(); } catch (e) { console.warn('bind', e); }
      try { this.render(); } catch (e) { console.warn('render', e); }
      try {
        const ver = document.getElementById('app-version-label');
        if (ver) ver.textContent = APP_NAME + ' v' + APP_VERSION + ' · ' + APP_BUILD;
        this.updateThemeToggleIcon();
        if (!sessionStorage.getItem('gitrep26_entered')) this.showLanding();
        else this.hideLanding();
      } catch (e) { console.warn('landing', e); }
      try { this.setupPWA(); } catch (_) {}
      if (token) {
        github.validateToken(undefined, { keepOnFailure: true }).then(r => {
          this.updateAuthUI?.(r);
          this.updateRateUI?.(r.rate || github.rate);
        }).catch(()=>{});
      }
    } catch (e) {
      console.error('GITREP26 init failed', e);
    } finally {
      clearTimeout(forceTimer);
      setTimeout(hideLoader, 350);
    }
  }

  async loadData() {
    const [catRes, repoRes] = await Promise.all([
      fetch('data/categories.json'),
      fetch('data/sample-repos.json')
    ]);
    this.categories = (await catRes.json()).categories;
    let repos = await repoRes.json();
    repos = repos.map(r => r.quality_score == null ? { ...r, ...analyzer.analyze(r) } : r);
    this.repos = repos;
    this.filtered = [...repos];
    try { await storage.saveRepos(repos); } catch (_) {}
  }

  bind() {
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); this.navigate(el.dataset.nav); });
    });
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      let t;
      searchInput.addEventListener('input', e => {
        clearTimeout(t);
        t = setTimeout(() => {
          this.filters.q = e.target.value.trim();
          if (this.filters.q) storage.addSearch(this.filters.q);
          this.applyFilters();
          if (this.view !== 'explore') this.navigate('explore');
        }, 320);
      });
      searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          this.filters.q = searchInput.value.trim();
          this.liveSearch();
        }
      });
    }
    document.querySelectorAll('[data-lang]').forEach(b => {
      b.addEventListener('click', () => {
        i18n.setLang(b.dataset.lang);
        this.settings.language = b.dataset.lang;
        storage.saveSettings(this.settings);
        this.render();
      });
    });
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const next = (this.settings.theme === 'dark') ? 'light' : 'dark';
      this.applyTheme(next);
      this.settings.theme = next;
      storage.saveSettings(this.settings);
      this.updateThemeToggleIcon();
    });
    document.getElementById('page-prev')?.addEventListener('click', () => this.goPage(-1));
    document.getElementById('page-next')?.addEventListener('click', () => this.goPage(1));
    document.getElementById('landing-go')?.addEventListener('click', () => this.submitLanding());
    document.getElementById('landing-search')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.submitLanding();
      if (e.key === 'Escape') this.enterAppFromLanding();
    });
    document.getElementById('menu-btn')?.addEventListener('click', () => {
      document.getElementById('side-nav')?.classList.toggle('open');
    });
  }

  navigate(view, params = {}) {
    this.view = view;
    if (params.category) this.currentCat = params.category;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${view}`)?.classList.add('active');
    sessionStorage.setItem('gitrep26_entered', '1');
    this.hideLanding();
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.classList.toggle('active', el.dataset.nav === view);
    });
    document.getElementById('side-nav')?.classList.remove('open');
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  sortList(list) {
    const s = this.sort;
    return [...list].sort((a, b) => {
      if (s === 'stars') return (b.stargazers_count||0) - (a.stargazers_count||0);
      if (s === 'forks') return (b.forks_count||0) - (a.forks_count||0);
      if (s === 'updated') return new Date(b.updated_at||0) - new Date(a.updated_at||0);
      return (b.quality_score||0) - (a.quality_score||0);
    });
  }

  async liveSearch(startPage = 1) {
    const q = (this.filters.q || '').trim();
    if (!q) return;
    if (!navigator.onLine) {
      this.liveResults = [];
      this.applyFilters();
      this.navigate('explore');
      return;
    }
    const sort = this.sort === 'updated' ? 'updated' : (this.sort === 'forks' ? 'forks' : 'stars');
    const perPage = this.pageSize;
    const pagesToFetch = Math.min(this.maxPages, 13);
    const all = [];
    let totalCount = 0;
    this.setSearchProgress(2, i18n.t('search_progress'));
    this.navigate('explore');
    this.hideLanding();
    try {
      for (let page = 1; page <= pagesToFetch; page++) {
        const pct = Math.round((page - 1) / pagesToFetch * 90) + 5;
        this.setSearchProgress(pct, `${i18n.t('search_progress')} ${page}/${pagesToFetch}`);
        try {
          const result = await github.search(q, page, perPage, sort);
          totalCount = result.total || totalCount;
          const items = (result.items || []).map(r => ({ ...r, ...analyzer.analyze(r) }));
          all.push(...items);
          if (items.length < perPage) break;
        } catch (e) {
          if (e.code === 'RATE_LIMIT') { this.toast(i18n.t('rate_limited')); break; }
          if (page === 1) throw e;
          break;
        }
      }
      all.sort((a, b) => {
        const d = (b.stargazers_count||0) - (a.stargazers_count||0);
        if (d) return d;
        return (b.forks_count||0) - (a.forks_count||0);
      });
      this.liveResults = all;
      this.searchTotal = totalCount || all.length;
      this.searchPage = startPage;
      this.setSearchProgress(100, `${all.length} ${i18n.t('search_results_count')}`);
      this.applyFilters();
      this.renderPagination();
      setTimeout(() => this.setSearchProgress(null), 900);
    } catch (e) {
      console.warn(e);
      this.liveResults = [];
      this.applyFilters();
      this.toast(i18n.t('search_error'));
      this.setSearchProgress(null);
    }
  }

  renderPagination() {
    const el = document.getElementById('explore-pagination');
    const info = document.getElementById('page-info');
    if (!el) return;
    const totalItems = this.filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / this.pageSize));
    if (totalItems <= this.pageSize && !this.liveResults.length) { el.hidden = true; return; }
    el.hidden = false;
    this.searchPage = Math.min(Math.max(1, this.searchPage || 1), totalPages);
    if (info) info.textContent = `${i18n.t('search_page')} ${this.searchPage} ${i18n.t('search_of')} ${totalPages} · ${totalItems} ${i18n.t('search_results_count')}`;
    const prev = document.getElementById('page-prev');
    const next = document.getElementById('page-next');
    if (prev) prev.disabled = this.searchPage <= 1;
    if (next) next.disabled = this.searchPage >= totalPages;
  }

  goPage(delta) {
    const totalPages = Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    this.searchPage = Math.min(totalPages, Math.max(1, (this.searchPage || 1) + delta));
    this.renderExplorePage();
    this.renderPagination();
  }

  renderExplorePage() {
    const grid = document.getElementById('explore-grid');
    if (!grid) return;
    const page = this.searchPage || 1;
    const start = (page - 1) * this.pageSize;
    const slice = this.filtered.slice(start, start + this.pageSize);
    grid.innerHTML = slice.length
      ? slice.map((r, i) => this.card(r, i)).join('')
      : `<div class="empty-state"><h3>${i18n.t('search_empty')}</h3></div>`;
  }

  card(r, i = 0) {
    const desc = translator.display(r.description || '', i18n.lang);
    return `<article class="repo-card" style="--d:${i*0.04}s" onclick="app.showDetail(${r.id})">
      <div class="card-top">
        <img class="avatar" src="${r.owner?.avatar_url || ''}" alt="" width="38" height="38" loading="lazy">
        <div class="card-title">
          <strong>${this.esc(r.full_name || r.name)}</strong>
          <span class="chip">${this.esc(r.language || '')}</span>
        </div>
      </div>
      <p class="card-desc">${this.esc(desc)}</p>
      <div class="card-meta">
        <span>★ ${this.fmt(r.stargazers_count)}</span>
        <span>⑂ ${this.fmt(r.forks_count)}</span>
      </div>
    </article>`;
  }

  render() {
    i18n.apply();
    this.renderDynamic();
    this.renderSettings();
  }

  renderDynamic() {
    if (this.view === 'explore') this.renderExplorePage();
  }

  renderSettings() {
    const ver = document.getElementById('app-version-label');
    if (ver) ver.textContent = APP_NAME + ' v' + APP_VERSION + ' · ' + APP_BUILD;
  }

  showDetail(id) {
    const r = this.repos.find(x => x.id === id) || this.liveResults.find(x => x.id === id);
    if (!r) return;
    this.currentRepo = r;
    this.navigate('detail');
  }

  openCat(id) {
    this.filters.category = id;
    this.applyFilters();
    this.navigate('categories');
  }

  applyTheme(theme) {
    if (theme === 'system') {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }
  applyAnim(level) { document.documentElement.setAttribute('data-anim', level || 'full'); }
  applyAccent(accent) {
    document.documentElement.setAttribute('data-accent', accent || 'purple');
    const map = { purple:['#8b5cf6','#06b6d4'], turquoise:['#06b6d4','#22d3ee'], green:['#10b981','#34d399'], blue:['#3b82f6','#60a5fa'], orange:['#f97316','#fb923c'], red:['#ef4444','#f87171'] };
    const pair = map[accent] || map.purple;
    document.documentElement.style.setProperty('--accent', pair[0]);
    document.documentElement.style.setProperty('--accent2', pair[1]);
  }
  setupPWA() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      const btn = document.getElementById('install-btn');
      if (btn) {
        btn.hidden = false;
        btn.onclick = async () => { e.prompt(); await e.userChoice; btn.hidden = true; };
      }
    });
  }
  toast(msg) {
    let el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2500);
  }
  fmt(n) {
    if (n >= 1e6) return (n/1e6).toFixed(1)+'M';
    if (n >= 1e3) return (n/1e3).toFixed(1)+'k';
    return String(n||0);
  }
  esc(s) {
    const d = document.createElement('div');
    d.textContent = s||'';
    return d.innerHTML;
  }
  closeModal() { document.getElementById('modal')?.classList.remove('open'); }
}

const app = new App();
try { installLandingHelpers(App.prototype); } catch (e) { console.warn(e); }
window.app = app;
document.addEventListener('DOMContentLoaded', () => {
  try { app.init(); } catch (e) {
    console.error(e);
    document.getElementById('loader')?.classList.add('hidden');
  }
});
window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('loader')?.classList.add('hidden'), 5000);
});
export default app;
