/**
 * GITREP26 V5 — Main Application Controller
 */
import { i18n } from './i18n.js';
import { storage } from './storage.js';
import { analyzer } from './analyzer.js';
import { github } from './github.js';
import { translator } from './translator.js';
import { readmeInsight } from './readmeInsight.js';

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
    this.defaultCollapsed = false; // new cards expanded by default
  }

  async init() {
    // Always dismiss loader — even if something throws
    const hideLoader = () => {
      try {
        const el = document.getElementById('loader');
        if (el) el.classList.add('hidden');
      } catch (_) {}
    };
    // Safety: force-hide after 4s no matter what
    const forceTimer = setTimeout(hideLoader, 4000);

    try {
      // IndexedDB with timeout so a locked DB cannot freeze the app
      await Promise.race([
        storage.init().catch(e => console.warn('IDB init', e)),
        new Promise(r => setTimeout(r, 2500))
      ]);

      try { i18n.init(); } catch (e) { console.warn('i18n', e); }
      try { translator.loadShowOriginal(); } catch (_) {}

      const token = storage.getToken();
      this.settings = storage.getSettings();
      this.settings.token = token;
      if (token) github.setToken(token);

      try {
        this.applyTheme(this.settings.theme);
        this.applyAccent(this.settings.accent || 'purple');
        this.applyAnim(this.settings.anim || 'full');
      } catch (e) { console.warn('theme', e); }

      this.online = navigator.onLine;

      try { await this.loadData(); } catch (e) {
        console.warn('loadData', e);
        this.repos = this.repos || [];
        this.filtered = [...this.repos];
      }

      try { this.bind(); } catch (e) { console.warn('bind', e); }
      try { this.render(); } catch (e) { console.warn('render', e); }
      try { this.setupPWA(); } catch (_) {}

      // Token validation is non-blocking
      if (token) {
        github.setToken(token);
        github.validateToken(undefined, { keepOnFailure: true }).then(r => {
          this.updateAuthUI(r);
          this.updateRateUI(r.rate || github.rate);
          this._fillTokenInput(storage.getToken());
          this.renderSettings();
        }).catch(() => {
          this._fillTokenInput(storage.getToken());
          this.updateAuthUI({ status: 'error', ok: false, message: 'Offline / network' });
        });
      } else {
        this.updateAuthUI({ status: 'guest', ok: true });
      }
    } catch (e) {
      console.error('GITREP26 init failed', e);
    } finally {
      clearTimeout(forceTimer);
      // Brief polish delay then hide
      setTimeout(hideLoader, 350);
    }
  }

  async loadData() {
    try {
      const [catRes, repoRes] = await Promise.all([
        fetch('data/categories.json'),
        fetch('data/sample-repos.json')
      ]);
      this.categories = (await catRes.json()).categories;
      let repos = await repoRes.json();
      repos = repos.map(r => {
        if (r.quality_score == null) return { ...r, ...analyzer.analyze(r) };
        return r;
      });
      this.repos = repos;
      this.filtered = [...repos];
      await storage.saveRepos(repos);
    } catch (e) {
      console.warn('Sample load failed, trying IDB', e);
      this.repos = await storage.getRepos();
      this.filtered = [...this.repos];
    }
  }

  bind() {
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); this.navigate(el.dataset.nav); });
    });
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', e => {
        const val = e.target.value.trim();
        this.updateSuggestions(e.target.value);
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.filters.q = val;
          if (this.filters.q) storage.addSearch(this.filters.q);
          this.applyFilters();
          if (this.view !== 'explore') this.navigate('explore');
        }, 320);
      });
      searchInput.addEventListener('keydown', e => {
        this.suggestKey(e);
        if (e.key === 'Enter') {
          this.filters.q = searchInput.value.trim();
          this.hideSuggestions();
          this.liveSearch();
        }
      });
      searchInput.addEventListener('blur', () => setTimeout(() => this.hideSuggestions(), 150));
      searchInput.addEventListener('focus', () => this.updateSuggestions(searchInput.value));
    }
    document.querySelectorAll('[data-lang]').forEach(b => {
      b.addEventListener('click', () => {
        i18n.setLang(b.dataset.lang);
        this.settings.language = b.dataset.lang;
        storage.saveSettings(this.settings);
        this.render();
      });
    });
    document.querySelectorAll('[data-theme]').forEach(b => {
      b.addEventListener('click', () => {
        this.applyTheme(b.dataset.theme);
        this.settings.theme = b.dataset.theme;
        storage.saveSettings(this.settings);
        this.renderSettings();
      });
    });
    document.querySelectorAll('[data-anim]').forEach(b => {
      b.addEventListener('click', () => {
        this.applyAnim(b.dataset.anim);
        this.settings.anim = b.dataset.anim;
        storage.saveSettings(this.settings);
        this.renderSettings();
      });
    });
    document.getElementById('settings-form')?.addEventListener('submit', e => {
      e.preventDefault();
      this.saveTokenFromInput();
    });
    document.getElementById('btn-save-token')?.addEventListener('click', () => this.saveTokenFromInput());
    document.getElementById('btn-save-settings')?.addEventListener('click', () => this.saveNonTokenSettings());
    document.getElementById('btn-clear-token')?.addEventListener('click', () => this.clearToken());
    document.getElementById('btn-export')?.addEventListener('click', () => this.exportData());
    document.getElementById('btn-import')?.addEventListener('click', () => document.getElementById('import-file')?.click());
    document.getElementById('import-file')?.addEventListener('change', e => this.importData(e));
    document.getElementById('btn-clear-cache')?.addEventListener('click', async () => {
      await storage.clearCache();
      this.toast(i18n.t('toast_cache_cleared'));
    });
    document.getElementById('desc-orig-toggle')?.addEventListener('change', e => {
      this.toggleDescOriginal(e.target.checked);
    });
    document.getElementById('btn-collapse-all')?.addEventListener('click', () => this.collapseAll(true));
    document.getElementById('btn-expand-all')?.addEventListener('click', () => this.collapseAll(false));
    document.querySelectorAll('[data-accent]').forEach(b => {
      b.addEventListener('click', () => {
        this.applyAccent(b.dataset.accent);
        this.settings.accent = b.dataset.accent;
        storage.saveSettings(this.settings);
        this.renderSettings();
      });
    });
    document.getElementById('btn-new-collection')?.addEventListener('click', () => {
      const name = prompt(i18n.t('collections_new') + ':');
      if (name) { storage.createCollection(name); this.renderCollections(); }
    });
    window.addEventListener('online', () => { this.online = true; this.toast(i18n.t('online_mode')); });
    window.addEventListener('offline', () => { this.online = false; this.toast(i18n.t('offline_mode')); });
    window.addEventListener('langchange', () => this.render());
    window.addEventListener('ratelimit', e => {
      this.updateRateUI(e.detail);
      if (e.detail?.authStatus) this.updateAuthUI({ status: e.detail.authStatus });
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.closeModal(); });
    // Mobile menu
    document.getElementById('menu-btn')?.addEventListener('click', () => {
      document.getElementById('side-nav')?.classList.toggle('open');
    });
  }

  navigate(view, params = {}) {
    this.view = view;
    if (params.category) this.currentCat = params.category;
    else if (view !== 'category') this.currentCat = null;
    if (params.repo) this.currentRepo = params.repo;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${view}`)?.classList.add('active');
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.classList.toggle('active', el.dataset.nav === view);
    });
    document.getElementById('side-nav')?.classList.remove('open');
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  applyFilters() {
    let list = this.liveResults.length ? [...this.liveResults] : [...this.repos];
    const f = this.filters;
    const q = f.q.toLowerCase();
    if (q) {
      list = list.filter(r => {
        const t = `${r.name} ${r.description} ${(r.topics||[]).join(' ')} ${(r.tags||[]).join(' ')} ${(r.categories||[]).join(' ')} ${r.language}`.toLowerCase();
        return t.includes(q);
      });
    }
    if (f.category) {
      list = list.filter(r => (r.categories||[]).some(c =>
        c.toLowerCase().includes(f.category.toLowerCase()) || f.category.toLowerCase().includes(c.toLowerCase())
      ));
    }
    if (f.language) list = list.filter(r => (r.language||'').toLowerCase() === f.language.toLowerCase());
    if (f.minStars > 0) list = list.filter(r => (r.stargazers_count||0) >= f.minStars);
    if (f.offline) list = list.filter(r => r.is_offline);
    if (f.lightweight) list = list.filter(r => r.is_lightweight);
    if (f.beginner) list = list.filter(r => (r.beginner_score||0) >= 70);
    if (f.active) list = list.filter(r => (r.activity_score||0) >= 80);
    list = this.sortList(list);
    this.filtered = list;
    this.renderDynamic();
  }

  sortList(list) {
    const s = this.sort;
    return [...list].sort((a, b) => {
      if (s === 'stars') return (b.stargazers_count||0) - (a.stargazers_count||0);
      if (s === 'forks') return (b.forks_count||0) - (a.forks_count||0);
      if (s === 'updated') return new Date(b.updated_at||0) - new Date(a.updated_at||0);
      if (s === 'activity') return (b.activity_score||0) - (a.activity_score||0);
      return (b.quality_score||0) - (a.quality_score||0);
    });
  }

  async liveSearch() {
    if (!this.filters.q) return;
    if (!github.hasToken() && !navigator.onLine) {
      this.applyFilters();
      return;
    }
    try {
      this.showLoading(true);
      const result = await github.search(this.filters.q, 1, 30, this.sort === 'updated' ? 'updated' : 'stars');
      this.liveResults = result.items.map(r => ({ ...r, ...analyzer.analyze(r) }));
      this.applyFilters();
      this.navigate('explore');
    } catch (e) {
      console.warn('Live search failed, using local', e);
      this.liveResults = [];
      this.applyFilters();
      if (e.code === 'RATE_LIMIT') this.toast(i18n.t('rate_limited'));
    } finally {
      this.showLoading(false);
    }
  }

  section(key) {
    const r = this.repos;
    switch (key) {
      case 'trending': return r.filter(x => x.is_trending).sort((a,b)=>b.stargazers_count-a.stargazers_count).slice(0,8);
      case 'hidden': return r.filter(x => (x.categories||[]).includes('Hidden Gems') || ((x.stargazers_count||0)<30000 && (x.quality_score||0)>=85)).slice(0,8);
      case 'recent': return [...r].sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at)).slice(0,8);
      case 'offline': return r.filter(x => x.is_offline).sort((a,b)=>b.quality_score-a.quality_score).slice(0,8);
      case 'lightweight': return r.filter(x => x.is_lightweight).sort((a,b)=>b.quality_score-a.quality_score).slice(0,8);
      case 'beginner': return r.filter(x => (x.beginner_score||0)>=70).sort((a,b)=>b.beginner_score-a.beginner_score).slice(0,8);
      case 'popular': return [...r].sort((a,b)=>b.stargazers_count-a.stargazers_count).slice(0,8);
      case 'maintained': return r.filter(x => x.maintenance==='active').sort((a,b)=>b.activity_score-a.activity_score).slice(0,8);
      case 'rising': return r.filter(x => { const d=(Date.now()-new Date(x.updated_at||0))/(864e5); return d<30 && (x.stargazers_count||0)>10000; }).slice(0,8);
      case 'editors': return r.filter(x => (x.quality_score||0)>=93 && (x.activity_score||0)>=90).slice(0,8);
      default: return this.filtered;
    }
  }

  render() {
    this.renderCategories();
    this.renderDynamic();
    this.renderSettings();
    this.renderFavorites();
    this.renderDashboard();
    this.renderCollections();
    this.renderCompare();
    i18n.apply();
  }

  renderDynamic() {
    ['trending','hidden','recent','offline','lightweight','beginner','popular','maintained','rising','editors'].forEach(sec => {
      const el = document.getElementById(`sec-${sec}`);
      if (el) el.innerHTML = this.section(sec).map((r,i) => this.card(r,i)).join('') || this.empty();
    });
    const grid = document.getElementById('explore-grid');
    if (grid) {
      grid.innerHTML = this.filtered.map((r,i) => this.card(r,i)).join('') || this.empty();
      const cnt = document.getElementById('explore-count');
      if (cnt) cnt.textContent = `${this.filtered.length} ${i18n.t('projects')}`;
    }
    if (this.view === 'category' && this.currentCat) {
      const cat = this.categories.find(c => c.id === this.currentCat);
      const title = document.getElementById('cat-title');
      if (title && cat) title.textContent = i18n.lang==='fa' ? cat.name_fa : cat.name_en;
      const g = document.getElementById('cat-grid');
      if (g && cat) {
        const name = cat.name_en;
        const repos = this.repos.filter(r => (r.categories||[]).some(c =>
          c === name || c.toLowerCase().includes(name.toLowerCase().split('&')[0].trim().toLowerCase()) ||
          (cat.subcategories||[]).some(s => c.toLowerCase().includes(s.name_en.toLowerCase()))
        ));
        g.innerHTML = repos.map((r,i) => this.card(r,i)).join('') || this.empty();
      }
    }
    document.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle('active', b.dataset.lang === i18n.lang));
  }

  renderCategories() {
    const html = this.categories.map((cat, i) => {
      const name = i18n.lang==='fa' ? cat.name_fa : cat.name_en;
      const count = this.repos.filter(r => (r.categories||[]).some(c =>
        c === cat.name_en || c.toLowerCase().includes(cat.name_en.toLowerCase().split('&')[0].trim().toLowerCase())
      )).length;
      return `<button class="cat-card" style="--c:${cat.color};--g:${cat.gradient};--d:${i*0.04}s" onclick="app.openCat('${cat.id}')">
        <span class="cat-icon-wrap"><svg class="icon"><use href="#icon-${cat.icon}"></use></svg></span>
        <span class="cat-name">${name}</span>
        <span class="cat-count">${count}</span>
        <span class="cat-glow"></span>
      </button>`;
    }).join('');
    ['categories-grid','categories-grid-full'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    });
  }

  renderFavorites() {
    const el = document.getElementById('fav-grid');
    if (!el) return;
    const favs = storage.getFavorites();
    const repos = this.repos.filter(r => favs.includes(r.id));
    el.innerHTML = repos.length
      ? repos.map((r,i) => this.card(r,i)).join('')
      : `<div class="empty-state"><svg class="icon empty-icon"><use href="#icon-heart"></use></svg><h3 data-i18n="empty_favorites">${i18n.t('empty_favorites')}</h3><p data-i18n="empty_favorites_sub">${i18n.t('empty_favorites_sub')}</p></div>`;
  }

  renderSettings() {
    const token = document.getElementById('token-input');
    const saved = storage.getToken();
    this.settings.token = saved;
    // Never overwrite input while user is focused/typing
    if (token && document.activeElement !== token) {
      token.value = saved || '';
      token.setAttribute('value', saved || '');
      token.dataset.saved = saved ? '1' : '0';
    }
    document.querySelectorAll('[data-theme]').forEach(b => b.classList.toggle('active', b.dataset.theme === this.settings.theme));
    document.querySelectorAll('[data-anim]').forEach(b => b.classList.toggle('active', b.dataset.anim === (this.settings.anim||'full')));
    document.querySelectorAll('[data-accent]').forEach(b => b.classList.toggle('active', b.dataset.accent === (this.settings.accent||'purple')));
    document.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle('active', b.dataset.lang === i18n.lang));
    this.updateAuthUI({
      status: github.authStatus,
      user: github.authUser,
      rate: github.rate,
      ok: github.authStatus === 'authenticated' || github.authStatus === 'guest'
    });
    this.updateRateUI(github.rate);
    // Description toggle
    const tog = document.getElementById('desc-orig-toggle');
    if (tog) tog.checked = translator.showOriginal;
  }

  updateAuthUI(info = {}) {
    const mode = document.getElementById('auth-mode');
    const detail = document.getElementById('auth-detail');
    const status = info.status || github.authStatus || 'guest';
    if (mode) {
      mode.className = 'auth-badge ' + status;
      const labels = {
        authenticated: i18n.t('auth_ok'),
        invalid: i18n.t('auth_invalid'),
        error: i18n.t('auth_error'),
        guest: i18n.t('auth_guest')
      };
      mode.textContent = labels[status] || status;
    }
    if (detail) {
      if (status === 'authenticated' && (info.user || github.authUser)) {
        const u = info.user || github.authUser;
        detail.textContent = `@${u.login}` + (github.isAuthHeaderAttached() ? ' · ' + i18n.t('auth_header_ok') : '');
      } else if (status === 'invalid') {
        detail.textContent = info.message || i18n.t('auth_invalid');
      } else if (status === 'guest') {
        detail.textContent = i18n.t('settings_guest');
      } else {
        detail.textContent = info.message || '';
      }
    }
  }

  updateRateUI(rate = {}) {
    const el = document.getElementById('rate-display');
    if (!el) return;
    const r = rate.remaining != null ? rate : github.rate;
    if (r.remaining == null) {
      el.textContent = github.hasToken() ? i18n.t('rate_unlimited') : '—';
      el.classList.remove('low');
      return;
    }
    el.textContent = `${r.remaining} / ${r.limit}`;
    el.classList.toggle('low', r.remaining < 10);
    // Reset time hint
    const resetEl = document.getElementById('rate-reset');
    if (resetEl && r.reset) {
      const mins = Math.max(0, Math.ceil((r.reset - Date.now()) / 60000));
      resetEl.textContent = mins > 0 ? `↻ ${mins}m` : '';
    }
  }

  card(repo, idx = 0) {
    const stars = this.fmt(repo.stargazers_count);
    const forks = this.fmt(repo.forks_count);
    const updated = this.fmtDate(repo.updated_at);
    const cats = (repo.categories||[]).slice(0,2);
    const avatar = repo.owner?.avatar_url || '';
    const fav = storage.isFav(repo.id);
    const collapsed = storage.isCollapsed(repo.id);
    const desc = translator.display(repo.description || '', i18n.lang);
    const primaryCat = cats[0] || '';
    return `<article class="repo-card ${collapsed ? 'collapsed' : 'expanded'}" style="--d:${idx * 0.05}s" data-id="${repo.id}">
      <div class="card-top">
        <img class="avatar" src="${avatar}" alt="" loading="lazy" width="40" height="40" onerror="this.style.opacity=0">
        <div class="card-titles">
          <h3 class="rname">${this.esc(repo.name)}</h3>
          <span class="rowner">${this.esc(repo.owner?.login || '')}</span>
        </div>
        <button class="icon-btn collapse-btn" onclick="app.toggleCollapse(${repo.id},event)" title="${collapsed ? i18n.t('expand') : i18n.t('collapse')}" aria-label="Collapse">
          <svg class="icon chevron ${collapsed ? '' : 'open'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <button class="icon-btn fav ${fav ? 'on' : ''}" onclick="app.toggleFav(${repo.id},event)" aria-label="Favorite">
          <svg class="icon"><use href="#icon-heart${fav ? '-fill' : ''}"></use></svg>
        </button>
      </div>
      <div class="card-essential">
        ${primaryCat ? `<span class="chip chip-cat">${this.esc(primaryCat)}</span>` : ''}
        <span class="m-item lang">${this.esc(repo.language || '—')}</span>
        <span class="m-item"><svg class="icon sm"><use href="#icon-star"></use></svg> <span class="stat-num" data-val="${repo.stargazers_count || 0}">${stars}</span></span>
        ${repo.is_offline ? `<span class="badge-inline offline">Offline</span>` : ''}
        ${repo.is_trending ? `<span class="badge-inline trend">Hot</span>` : ''}
      </div>
      <div class="card-body">
        <p class="rdesc">${this.esc(desc)}</p>
        <div class="chips">${cats.map(c => `<span class="chip chip-cat">${this.esc(c)}</span>`).join('')}</div>
        <div class="meta">
          <span class="m-item"><svg class="icon sm"><use href="#icon-star"></use></svg> ${stars}</span>
          <span class="m-item"><svg class="icon sm"><use href="#icon-fork"></use></svg> ${forks}</span>
          <span class="m-item lang">${this.esc(repo.language || '—')}</span>
          <span class="m-item">${updated}</span>
        </div>
        <div class="scores">
          <div class="sc" title="${i18n.t('card_quality')}"><span>Q</span><div class="bar"><i style="width:${repo.quality_score || 0}%"></i></div><b class="stat-num" data-val="${repo.quality_score || 0}">${repo.quality_score || 0}</b></div>
          <div class="sc" title="${i18n.t('card_activity')}"><span>A</span><div class="bar"><i class="act" style="width:${repo.activity_score || 0}%"></i></div><b>${repo.activity_score || 0}</b></div>
          <div class="sc" title="${i18n.t('card_beginner')}"><span>B</span><div class="bar"><i class="beg" style="width:${repo.beginner_score || 0}%"></i></div><b>${repo.beginner_score || 0}</b></div>
        </div>
        <div class="card-acts">
          <button class="btn btn-ghost btn-sm" onclick="app.showDetail(${repo.id})">${i18n.t('card_details')}</button>
          <a class="btn btn-primary btn-sm" href="${repo.html_url}" target="_blank" rel="noopener">${i18n.t('card_view')}</a>
        </div>
      </div>
    </article>`;
  }

  toggleCollapse(id, e) {
    e?.stopPropagation();
    storage.toggleCollapsed(id);
    const card = document.querySelector(`.repo-card[data-id="${id}"]`);
    if (card) {
      card.classList.toggle('collapsed');
      card.classList.toggle('expanded');
      const chev = card.querySelector('.chevron');
      if (chev) chev.classList.toggle('open');
    } else {
      this.renderDynamic();
    }
  }

  collapseAll(collapsed = true) {
    const ids = this.filtered.map(r => r.id);
    // Also include section repos currently visible
    this.repos.forEach(r => { if (!ids.includes(r.id)) ids.push(r.id); });
    storage.setAllCollapsed(ids, collapsed);
    this.renderDynamic();
  }

  empty() {
    return `<div class="empty-state"><svg class="icon empty-icon"><use href="#icon-search"></use></svg>
      <h3 data-i18n="empty_title">${i18n.t('empty_title')}</h3>
      <p data-i18n="empty_subtitle">${i18n.t('empty_subtitle')}</p></div>`;
  }

  showDetail(id) {
    const repo = this.repos.find(r => r.id === id) || this.liveResults.find(r => r.id === id);
    if (!repo) return;
    storage.addHistory(repo);
    const modal = document.getElementById('modal');
    const body = document.getElementById('modal-body');
    if (!modal || !body) return;
    this.currentRepo = repo;
    const cats = (repo.categories||[]).map(c=>`<span class="chip chip-cat">${this.esc(c)}</span>`).join('');
    const tags = (repo.tags||repo.topics||[]).map(t=>`<span class="chip">${this.esc(t)}</span>`).join('');
    const similar = this.repos.filter(r => r.id !== repo.id && (r.categories||[]).some(c => (repo.categories||[]).includes(c))).slice(0,3);
    const pTags = storage.getTags(repo.id);
    const monitored = storage.isMonitored(repo.id);
    const inCompare = storage.getCompare().includes(repo.id);
    body.innerHTML = `
      <button class="modal-close icon-btn" onclick="app.closeModal()"><svg class="icon"><use href="#icon-close"></use></svg></button>
      <div class="d-header">
        <img src="${repo.owner?.avatar_url||''}" class="d-avatar" alt="" width="56" height="56" onerror="this.style.display='none'">
        <div>
          <h2>${this.esc(repo.full_name)}</h2>
          <p class="d-desc">${this.esc(translator.display(repo.description||'', i18n.lang))}</p>
          <p class="insight-quick-summary" id="insight-quick-summary"></p>
        </div>
      </div>
      <div class="d-sec chips">
        <button class="btn btn-ghost btn-sm" onclick="app.toggleCompare(${repo.id})">${inCompare ? '✓ Compare' : '+ Compare'}</button>
        <button class="btn btn-ghost btn-sm" onclick="app.toggleMonitor(${repo.id})">${monitored ? '✓ Monitor' : '+ Monitor'}</button>
        <button class="btn btn-ghost btn-sm" onclick="app.addPersonalTag(${repo.id})">+ Tag</button>
        <button class="btn btn-primary btn-sm" id="btn-analyze-readme" onclick="app.analyzeReadme(${repo.id}, false)">${i18n.t('insight_analyze')}</button>
        <button class="btn btn-ghost btn-sm" id="btn-reanalyze-readme" onclick="app.analyzeReadme(${repo.id}, true)">${i18n.t('insight_reanalyze')}</button>
      </div>
      ${pTags.length ? `<div class="d-sec"><h4>Personal tags</h4><div class="chips">${pTags.map(tg => `<span class="chip">${this.esc(tg)}</span>`).join('')}</div></div>` : ''}

      <div class="d-sec insight-panel" id="insight-panel">
        <div class="insight-head">
          <h3>${i18n.t('insight_title')}</h3>
          <span class="insight-status" id="insight-status">${i18n.t('insight_pending')}</span>
        </div>
        <div id="insight-body" class="insight-body">
          <div class="insight-loading" id="insight-loading" hidden>
            <div class="insight-spinner"></div>
            <p>${i18n.t('insight_analyzing')}</p>
          </div>
          <div id="insight-content"></div>
        </div>
      </div>

      <div class="d-sec">
        <div class="insight-head">
          <h4>${i18n.t('insight_original_readme')}</h4>
          <button class="btn btn-ghost btn-sm" type="button" onclick="app.toggleReadmeRaw()">${i18n.t('insight_toggle_readme')}</button>
        </div>
        <div class="readme-preview" id="readme-box" hidden>…</div>
      </div>

      <div class="d-stats">
        <div class="stat"><b>⭐ ${this.fmt(repo.stargazers_count)}</b><small>${i18n.t('card_stars')}</small></div>
        <div class="stat"><b>🍴 ${this.fmt(repo.forks_count)}</b><small>${i18n.t('card_forks')}</small></div>
        <div class="stat"><b>${this.esc(repo.language||'—')}</b><small>${i18n.t('details_language')}</small></div>
        <div class="stat"><b>${this.esc(repo.license||'—')}</b><small>${i18n.t('details_license')}</small></div>
      </div>
      <div class="d-scores">
        <h4>${i18n.t('details_scores')}</h4>
        <div class="big-scores">
          <div><span>${repo.quality_score||0}</span><small>${i18n.t('card_quality')}</small></div>
          <div><span>${repo.activity_score||0}</span><small>${i18n.t('card_activity')}</small></div>
          <div><span>${repo.beginner_score||0}</span><small>${i18n.t('card_beginner')}</small></div>
          <div><span>${repo.popularity_score||0}</span><small>Pop</small></div>
        </div>
      </div>
      <div class="d-sec"><h4>${i18n.t('details_categories')}</h4><div class="chips">${cats}</div></div>
      <div class="d-sec"><h4>${i18n.t('details_tags')}</h4><div class="chips">${tags}</div></div>
      ${similar.length?`<div class="d-sec"><h4>${i18n.t('details_similar')}</h4><div class="similar-list">${similar.map(s=>`<button class="similar-item" onclick="app.showDetail(${s.id})"><img src="${s.owner?.avatar_url||''}" width="24" height="24" alt=""><span>${this.esc(s.name)}</span></button>`).join('')}</div></div>`:''}
      <div class="d-acts">
        <a class="btn btn-primary" href="${repo.html_url}" target="_blank" rel="noopener">${i18n.t('card_view')}</a>
        <a class="btn btn-ghost" href="${repo.html_url}#readme" target="_blank" rel="noopener">${i18n.t('insight_open_github')}</a>
        <button class="btn btn-ghost" onclick="app.closeModal()">${i18n.t('close')}</button>
      </div>`;
    modal.classList.add('open');

    const parts = (repo.full_name || '').split('/');
    if (parts.length === 2) {
      // Auto-start analysis
      this.analyzeReadme(repo.id, false);
      github.getContents(parts[0], parts[1]).then(files => {
        if (!files.length) return;
        const sec = document.createElement('div');
        sec.className = 'd-sec';
        sec.innerHTML = '<h4>Files</h4><ul class="file-tree">' +
          files.slice(0, 15).map(f => '<li>' + (f.type === 'dir' ? '📁 ' : '📄 ') + this.esc(f.name) + '</li>').join('') +
          '</ul>';
        body.appendChild(sec);
      }).catch(() => {});
    }
  }

  toggleReadmeRaw() {
    const box = document.getElementById('readme-box');
    if (box) box.hidden = !box.hidden;
  }

  async analyzeReadme(repoId, force = false) {
    const repo = this.repos.find(r => r.id === repoId) || this.liveResults.find(r => r.id === repoId) || this.currentRepo;
    if (!repo) return;
    const parts = (repo.full_name || '').split('/');
    if (parts.length !== 2) return;

    const status = document.getElementById('insight-status');
    const loading = document.getElementById('insight-loading');
    const content = document.getElementById('insight-content');
    const box = document.getElementById('readme-box');
    if (loading) loading.hidden = false;
    if (status) status.textContent = i18n.t('insight_analyzing');
    if (content) content.innerHTML = '';

    let md = null;
    try {
      // Try cache first for raw readme
      const cacheKey = 'readme:' + repo.full_name;
      if (!force) {
        md = await storage.getCache(cacheKey);
      }
      if (!md) {
        md = await github.getReadme(parts[0], parts[1]);
        if (md) await storage.setCache(cacheKey, md, 24 * 3600 * 1000);
      }
    } catch (e) {
      md = null;
    }

    if (box) {
      box.textContent = md ? md.slice(0, 8000) : (i18n.t('insight_no_readme'));
    }

    try {
      const result = await readmeInsight.process(md || '', repo, { force, lang: i18n.lang });
      this._lastInsight = result;
      this.renderInsight(result.insight, result.raw, result.fromCache);
      if (status) {
        status.textContent = result.fromCache
          ? i18n.t('insight_cached')
          : i18n.t('insight_done');
      }
    } catch (e) {
      if (content) content.innerHTML = `<p class="insight-miss">${this.esc(e.message || 'Analysis failed')}</p>`;
      if (status) status.textContent = i18n.t('insight_error');
    } finally {
      if (loading) loading.hidden = true;
    }
  }

  renderInsight(insight, raw, fromCache) {
    const content = document.getElementById('insight-content');
    const quick = document.getElementById('insight-quick-summary');
    if (!content || !insight) return;

    if (quick) quick.textContent = insight.summary || '';

    const nd = insight.notDoc || 'Not documented in README.';
    const sec = (title, bodyHtml, sourceKey) => {
      const src = raw?.sources?.[sourceKey];
      const srcHtml = src
        ? `<button type="button" class="insight-src" data-src="${this.esc(src)}">${i18n.t('insight_view_source')}</button>`
        : '';
      return `<details class="insight-sec" open>
        <summary>${title} ${srcHtml}</summary>
        <div class="insight-sec-body">${bodyHtml}</div>
      </details>`;
    };

    const list = (arr) => {
      if (!arr || !arr.length || (arr.length === 1 && arr[0] === nd))
        return `<p class="insight-miss">${this.esc(nd)}</p>`;
      return '<ul>' + arr.map(i => `<li>${this.esc(i)}</li>`).join('') + '</ul>';
    };

    const cmds = (insight.commands || []);
    const cmdHtml = cmds.length
      ? `<ul class="insight-cmds">${cmds.map(c => `
          <li>
            <code class="insight-code">${this.esc(c.cmd)}</code>
            <button type="button" class="btn btn-ghost btn-sm insight-copy" data-copy="${this.esc(c.cmd)}">${i18n.t('insight_copy')}</button>
            <span class="insight-cmd-exp">${this.esc(c.explain || '')}</span>
          </li>`).join('')}</ul>`
      : `<p class="insight-miss">${this.esc(nd)}</p>`;

    const ts = raw?.analyzedAt ? new Date(raw.analyzedAt).toLocaleString() : '';
    content.innerHTML = `
      <p class="insight-meta">${fromCache ? '📦 ' + i18n.t('insight_cached') : '✨ ' + i18n.t('insight_done')}${ts ? ' · ' + ts : ''}${raw?.level ? ' · ' + raw.level : ''}</p>
      ${sec('🎯 ' + i18n.t('insight_what'), `<p>${this.esc(insight.whatIsIt || nd)}</p>`, 'whatIsIt')}
      ${sec('💡 ' + i18n.t('insight_does'), `<p>${this.esc(insight.whatDoesItDo || nd)}</p>`, 'whatIsIt')}
      ${sec('👤 ' + i18n.t('insight_who'), `<p>${this.esc(insight.whoIsItFor || nd)}</p>`, null)}
      ${sec('✨ ' + i18n.t('insight_features'), list(insight.features), 'features')}
      ${sec('⚙️ ' + i18n.t('insight_requirements'), list(insight.requirements), 'requirements')}
      ${sec('📦 ' + i18n.t('insight_install'), list(insight.installSteps), 'install')}
      ${sec('🚀 ' + i18n.t('insight_usage'), list(insight.usageSteps), 'usage')}
      ${sec('🛠️ ' + i18n.t('insight_commands'), cmdHtml, 'install')}
      ${sec('🔧 ' + i18n.t('insight_config'), list(insight.configuration), 'configuration')}
      ${insight.notes && insight.notes.length ? sec('⚠️ ' + i18n.t('insight_notes'), list(insight.notes), 'notes') : ''}
      ${sec('📌 ' + i18n.t('insight_summary'), `<p>${this.esc(insight.summary || nd)}</p>`, 'whatIsIt')}
    `;

    content.querySelectorAll('.insight-copy').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(btn.getAttribute('data-copy') || '');
          this.toast(i18n.t('insight_copied'));
        } catch {
          this.toast('Copy failed');
        }
      });
    });
    content.querySelectorAll('.insight-src').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        this.toast(btn.getAttribute('data-src') || '');
      });
    });
  }

  closeModal() { document.getElementById('modal')?.classList.remove('open'); }

  openCat(id) { this.navigate('category', { category: id }); }

  toggleFav(id, e) {
    e?.stopPropagation();
    const was = storage.isFav(id);
    storage.toggleFav(id);
    this.toast(was ? i18n.t('toast_fav_remove') : i18n.t('toast_fav_add'));
    this.renderDynamic();
    this.renderFavorites();
  }

  toggleFilter(el, key) {
    el.classList.toggle('active');
    this.filters[key] = el.classList.contains('active');
    this.applyFilters();
  }

  clearFilters() {
    this.filters = { q:'', category:null, language:null, minStars:0, offline:false, lightweight:false, beginner:false, active:false };
    this.liveResults = [];
    const s = document.getElementById('search-input');
    if (s) s.value = '';
    document.querySelectorAll('.f-chip').forEach(c => c.classList.remove('active'));
    this.applyFilters();
  }

  setSort(val) {
    this.sort = val;
    this.applyFilters();
  }

  /** Save language/theme/anim/accent only — never touches PAT */
  saveNonTokenSettings() {
    const s = storage.getSettings();
    s.theme = this.settings.theme || s.theme;
    s.language = this.settings.language || s.language;
    s.anim = this.settings.anim || s.anim;
    s.accent = this.settings.accent || s.accent || 'purple';
    // NEVER overwrite token from this path
    s.token = storage.getToken();
    storage.saveSettings(s);
    this.settings = s;
    this.toast(i18n.t('toast_saved'));
    this.renderSettings();
  }

  /**
   * Validate & Save token from input.
   * - Always reads input value synchronously first
   * - Saves to localStorage on success OR network error (so CORS/offline does not wipe work)
   * - Only rejects persist on explicit AUTH_INVALID (401)
   * - Never clears an existing good token unless user hits Clear
   */
  async saveTokenFromInput() {
    const input = document.getElementById('token-input');
    const typed = input ? String(input.value || '').trim() : '';
    const existing = storage.getToken();

    const statusEl = document.getElementById('auth-detail');
    if (statusEl) statusEl.textContent = i18n.t('auth_checking');

    // Empty field → keep existing token, do not clear
    if (!typed) {
      if (existing) {
        this._fillTokenInput(existing);
        github.setToken(existing);
        try {
          const r = await github.validateToken(existing, { keepOnFailure: true });
          this.updateAuthUI(r);
          this.updateRateUI(r.rate || github.rate);
        } catch (_) {}
        this.toast(i18n.t('toast_token_saved') + ' (kept)');
      } else {
        this.updateAuthUI({ status: 'guest', ok: true });
        this.toast(i18n.t('auth_guest'));
      }
      return;
    }

    // Looks like a token — set in memory and try validate
    github.setToken(typed);
    let result;
    try {
      result = await github.validateToken(typed, { keepOnFailure: true });
    } catch (e) {
      result = { ok: false, status: 'error', message: e.message || 'Error', networkError: true, token: typed };
    }

    if (result.ok && result.status === 'authenticated') {
      storage.saveToken(typed);
      this.settings.token = typed;
      github.setToken(typed);
      this._fillTokenInput(typed);
      this.updateAuthUI(result);
      this.updateRateUI(result.rate || github.rate);
      this.toast(i18n.t('toast_token_saved') + (result.user ? ' (@' + result.user.login + ')' : ''));
      return;
    }

    if (result.status === 'invalid') {
      // Explicitly bad token from GitHub — do NOT save, keep previous
      if (existing) {
        github.setToken(existing);
        this.settings.token = existing;
        this._fillTokenInput(typed); // keep what they typed so they can fix
      } else {
        github.setToken('');
        this._fillTokenInput(typed);
      }
      this.updateAuthUI(result);
      this.toast(i18n.t('auth_invalid'));
      return;
    }

    // Network / CORS / rate-limit: STILL SAVE the token so it survives reload
    // User can use it when online; prevents the "clears on save" bug offline
    storage.saveToken(typed);
    this.settings.token = typed;
    github.setToken(typed);
    this._fillTokenInput(typed);
    this.updateAuthUI({ status: 'error', ok: false, message: result.message });
    this.updateRateUI(result.rate || github.rate);
    this.toast(i18n.t('toast_token_saved') + ' — ' + (result.message || 'saved locally, validate when online'));
  }

  _fillTokenInput(value) {
    const input = document.getElementById('token-input');
    if (!input) return;
    // Use both property and attribute so it survives any re-render quirks
    input.value = value || '';
    try { input.setAttribute('value', value || ''); } catch (_) {}
  }

  async clearToken() {
    storage.clearToken();
    this.settings.token = '';
    github.setToken('');
    this._fillTokenInput('');
    this.updateAuthUI({ status: 'guest', ok: true });
    this.updateRateUI({});
    this.toast(i18n.t('token_cleared'));
  }

  // Back-compat alias
  async saveSettings() {
    await this.saveTokenFromInput();
  }

  toggleDescOriginal(checked) {
    translator.setShowOriginal(checked);
    this.renderDynamic();
  }

  exportData() {
    const data = storage.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gpe-export-${Date.now()}.json`;
    a.click();
    this.toast(i18n.t('toast_export'));
  }

  importData(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        storage.importData(JSON.parse(reader.result));
        this.settings = storage.getSettings();
        this.toast(i18n.t('toast_import'));
        this.render();
      } catch { this.toast(i18n.t('toast_error')); }
    };
    reader.readAsText(file);
  }

  applyTheme(theme) {
    if (theme === 'system') {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  applyAnim(level) {
    document.documentElement.setAttribute('data-anim', level || 'full');
  }

  setupPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(()=>{});
    }
    let deferred;
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferred = e;
      const btn = document.getElementById('install-btn');
      if (btn) {
        btn.hidden = false;
        btn.onclick = async () => { deferred.prompt(); await deferred.userChoice; deferred = null; btn.hidden = true; };
      }
    });
  }

  showLoading(on) {
    document.getElementById('search-loading')?.classList.toggle('show', on);
  }

  toast(msg) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => el.classList.remove('show'), 2500);
  }

  fmt(n) {
    if (n >= 1e6) return (n/1e6).toFixed(1)+'M';
    if (n >= 1e3) return (n/1e3).toFixed(1)+'k';
    return String(n||0);
  }
  fmtDate(iso) {
    if (!iso) return '—';
    const d = Math.floor((Date.now()-new Date(iso))/(864e5));
    if (d===0) return 'Today'; if (d===1) return 'Yesterday';
    if (d<30) return d+'d'; if (d<365) return Math.floor(d/30)+'mo';
    return Math.floor(d/365)+'y';
  }
  esc(s) {
    const d = document.createElement('div');
    d.textContent = s||'';
    return d.innerHTML;
  }

  applyAccent(accent) {
    document.documentElement.setAttribute('data-accent', accent || 'purple');
    const map = {
      purple: ['#8b5cf6', '#06b6d4'],
      turquoise: ['#06b6d4', '#22d3ee'],
      green: ['#10b981', '#34d399'],
      blue: ['#3b82f6', '#60a5fa'],
      orange: ['#f97316', '#fb923c'],
      red: ['#ef4444', '#f87171']
    };
    const pair = map[accent] || map.purple;
    document.documentElement.style.setProperty('--accent', pair[0]);
    document.documentElement.style.setProperty('--accent2', pair[1]);
    document.documentElement.style.setProperty('--glow', pair[0] + '55');
  }

  updateSuggestions(q) {
    const box = document.getElementById('suggest-box');
    if (!box) return;
    q = (q || '').trim().toLowerCase();
    if (q.length < 1) { box.hidden = true; return; }
    const items = [];
    this.categories.forEach(c => {
      const name = i18n.lang === 'fa' ? c.name_fa : c.name_en;
      if (name.toLowerCase().includes(q) || c.name_en.toLowerCase().includes(q))
        items.push({ type: 'category', label: name, id: c.id, icon: 'categories' });
      (c.subcategories || []).forEach(s => {
        const sn = i18n.lang === 'fa' ? s.name_fa : s.name_en;
        if (sn.toLowerCase().includes(q)) items.push({ type: 'sub', label: sn, id: c.id, icon: 'categories' });
      });
    });
    [...new Set(this.repos.map(r => r.language).filter(Boolean))].forEach(l => {
      if (l.toLowerCase().includes(q)) items.push({ type: 'language', label: l, icon: 'code' });
    });
    this.repos.forEach(r => {
      if ((r.name || '').toLowerCase().includes(q) || (r.full_name || '').toLowerCase().includes(q))
        items.push({ type: 'repo', label: r.full_name || r.name, id: r.id, icon: 'explore' });
    });
    const ranked = items.slice(0, 10);
    if (!ranked.length) { box.hidden = true; return; }
    box.innerHTML = ranked.map((it, i) =>
      `<button type="button" class="suggest-item" data-type="${it.type}" data-id="${it.id || ''}" data-label="${this.esc(it.label)}">
        <svg class="icon sm"><use href="#icon-${it.icon || 'search'}"></use></svg>
        <span>${this.esc(it.label)}</span><small>${it.type}</small>
      </button>`
    ).join('');
    box.hidden = false;
    box.querySelectorAll('.suggest-item').forEach(el => {
      el.addEventListener('mousedown', e => {
        e.preventDefault();
        this.applySuggestion(el.dataset.type, el.dataset.id, el.dataset.label);
      });
    });
    this._suggestIdx = -1;
  }

  applySuggestion(type, id, label) {
    const searchEl = document.getElementById('search-input');
    if (type === 'category' || type === 'sub') this.openCat(id);
    else if (type === 'repo') this.showDetail(Number(id));
    else {
      if (searchEl) searchEl.value = label;
      this.filters.q = label;
      if (type === 'language') this.filters.language = label;
      this.applyFilters();
      this.navigate('explore');
    }
    this.hideSuggestions();
  }

  hideSuggestions() {
    const box = document.getElementById('suggest-box');
    if (box) box.hidden = true;
  }

  suggestKey(e) {
    const box = document.getElementById('suggest-box');
    if (!box || box.hidden) return;
    const items = [...box.querySelectorAll('.suggest-item')];
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); this._suggestIdx = Math.min((this._suggestIdx || -1) + 1, items.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this._suggestIdx = Math.max((this._suggestIdx || 0) - 1, 0); }
    else if (e.key === 'Enter' && this._suggestIdx >= 0) { e.preventDefault(); items[this._suggestIdx].dispatchEvent(new Event('mousedown')); return; }
    else if (e.key === 'Escape') { this.hideSuggestions(); return; }
    else return;
    items.forEach((el, i) => el.classList.toggle('active', i === this._suggestIdx));
  }

  renderDashboard() {
    const el = document.getElementById('dash-grid');
    if (!el) return;
    const favs = storage.getFavorites();
    const hist = storage.getHistory().slice(0, 8);
    const searches = storage.getSearchHistory().slice(0, 8);
    const cols = storage.getCollections();
    const langs = {};
    this.repos.forEach(r => { if (r.language) langs[r.language] = (langs[r.language] || 0) + 1; });
    const topLangs = Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 5);
    el.innerHTML = `
      <div class="dash-card"><h3>${i18n.t('section_favorites')}</h3><p class="dash-num">${favs.length}</p></div>
      <div class="dash-card"><h3>${i18n.t('section_history')}</h3><p class="dash-num">${hist.length}</p></div>
      <div class="dash-card"><h3>${i18n.t('nav_collections')}</h3><p class="dash-num">${cols.length}</p></div>
      <div class="dash-card wide"><h3>${i18n.t('section_history')}</h3>
        <ul class="dash-list">${hist.map(h => `<li><button onclick="app.showDetail(${h.id})">${this.esc(h.full_name || h.name)}</button></li>`).join('') || '<li>—</li>'}</ul></div>
      <div class="dash-card wide"><h3>Searches</h3>
        <ul class="dash-list">${searches.map(s => `<li><button type="button" data-q="${this.esc(s)}">${this.esc(s)}</button></li>`).join('') || '<li>—</li>'}</ul></div>
      <div class="dash-card wide"><h3>Languages</h3>
        <div class="chips">${topLangs.map(([l, n]) => `<span class="chip">${this.esc(l)} · ${n}</span>`).join('')}</div></div>`;
    el.querySelectorAll('[data-q]').forEach(btn => {
      btn.addEventListener('click', () => {
        const q = btn.getAttribute('data-q');
        const inp = document.getElementById('search-input');
        if (inp) inp.value = q;
        this.filters.q = q;
        this.applyFilters();
        this.navigate('explore');
      });
    });
  }

  renderCollections() {
    const el = document.getElementById('collections-list');
    if (!el) return;
    const list = storage.getCollections();
    if (!list.length) {
      el.innerHTML = `<div class="empty-state"><p>${i18n.t('collections_empty')}</p></div>`;
      return;
    }
    el.innerHTML = list.map(c => `
      <div class="collection-card">
        <div class="col-head">
          <h3>${this.esc(c.name)}</h3>
          <span class="cat-count">${(c.repoIds || []).length}</span>
          <button class="btn btn-ghost btn-sm" data-rename="${c.id}">Rename</button>
          <button class="btn btn-ghost btn-sm" data-del="${c.id}">Delete</button>
        </div>
        <p class="col-notes">${this.esc(c.notes || '')}</p>
        <div class="chips">${(c.repoIds || []).map(id => {
          const r = this.repos.find(x => x.id === id);
          return r ? `<button class="chip" onclick="app.showDetail(${id})">${this.esc(r.name)}</button>` : '';
        }).join('')}</div>
      </div>`).join('');
    el.querySelectorAll('[data-rename]').forEach(b => b.addEventListener('click', () => {
      const id = b.getAttribute('data-rename');
      const c = storage.getCollections().find(x => x.id === id);
      const name = prompt('Name', c?.name || '');
      if (name) { storage.updateCollection(id, { name }); this.renderCollections(); }
    }));
    el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      storage.deleteCollection(b.getAttribute('data-del'));
      this.renderCollections();
    }));
  }

  renderCompare() {
    const el = document.getElementById('compare-table');
    if (!el) return;
    const ids = storage.getCompare();
    const repos = ids.map(id => this.repos.find(r => r.id === id) || this.liveResults.find(r => r.id === id)).filter(Boolean);
    if (repos.length < 2) {
      el.innerHTML = `<div class="empty-state"><p>Select 2–3 projects to compare</p></div>`;
      return;
    }
    const rows = [
      ['Name', r => r.full_name],
      ['Stars', r => r.stargazers_count],
      ['Forks', r => r.forks_count],
      ['Language', r => r.language],
      ['License', r => r.license || '—'],
      ['Quality', r => r.quality_score],
      ['Activity', r => r.activity_score],
      ['Updated', r => this.fmtDate(r.updated_at)],
    ];
    el.innerHTML = `<table class="cmp"><thead><tr><th></th>${repos.map(r => `<th>${this.esc(r.name)}</th>`).join('')}</tr></thead><tbody>${
      rows.map(([label, fn]) => {
        const vals = repos.map(fn);
        const nums = vals.map(v => typeof v === 'number' ? v : -1);
        const max = Math.max(...nums);
        return `<tr><td>${label}</td>${vals.map((v, i) => `<td class="${nums[i]===max && max>0?'best':''}">${this.esc(String(typeof v==='number'?this.fmt(v):v))}</td>`).join('')}</tr>`;
      }).join('')
    }</tbody></table>`;
  }


  addPersonalTag(repoId) {
    const tag = prompt('Tag:');
    if (tag && tag.trim()) {
      storage.addTag(repoId, tag.trim());
      this.showDetail(repoId);
    }
  }

  toggleMonitor(repoId, e) {
    e?.stopPropagation();
    const repo = this.repos.find(r => r.id === repoId) || this.liveResults.find(r => r.id === repoId);
    if (!repo) return;
    const on = storage.toggleMonitor(repo);
    this.toast(on ? 'Monitoring on' : 'Monitoring off');
    this.showDetail(repoId);
  }

  toggleCompare(id, e) {
    e?.stopPropagation();
    storage.toggleCompare(id);
    this.toast('Compare ' + storage.getCompare().length + '/3');
    if (storage.getCompare().length >= 2) this.navigate('compare');
  }
}

const app = new App();
window.app = app;
document.addEventListener('DOMContentLoaded', () => {
  try {
    app.init();
  } catch (e) {
    console.error(e);
    document.getElementById('loader')?.classList.add('hidden');
  }
});
// If module evaluated but init never reached, still clear loader
window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('loader')?.classList.add('hidden'), 5000);
});
export default app;
