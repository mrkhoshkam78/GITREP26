/**
 * GPE V3 — Main Application Controller
 */
import { i18n } from './i18n.js';
import { storage } from './storage.js';
import { analyzer } from './analyzer.js';
import { github } from './github.js';
import { translator } from './translator.js';

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
    this.settings = storage.getSettings();
    this.page = 1;
    this.liveResults = [];
    this.defaultCollapsed = false; // new cards expanded by default
  }

  async init() {
    await storage.init();
    i18n.init();
    translator.loadShowOriginal();
    // Robust token restore from dedicated storage key
    const token = storage.getToken();
    this.settings.token = token;
    if (token) {
      github.setToken(token);
    }
    this.applyTheme(this.settings.theme);
    this.applyAnim(this.settings.anim || 'full');
    await this.loadData();
    this.bind();
    this.render();
    this.setupPWA();
    // Validate token & refresh rate limit without blocking UI
    if (github.hasToken()) {
      github.validateToken().then(r => {
        this.updateAuthUI(r);
        this.renderSettings();
      }).catch(() => {});
    } else {
      this.updateAuthUI({ status: 'guest', ok: true });
    }
    setTimeout(() => document.getElementById('loader')?.classList.add('hidden'), 700);
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
    const search = document.getElementById('search-input');
    if (search) {
      let t;
      search.addEventListener('input', e => {
        clearTimeout(t);
        t = setTimeout(() => {
          this.filters.q = e.target.value.trim();
          if (this.filters.q) storage.addSearch(this.filters.q);
          this.applyFilters();
          if (this.view !== 'explore') this.navigate('explore');
        }, 320);
      });
      search.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          this.filters.q = search.value.trim();
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
      this.saveSettings();
    });
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
    // Restore from dedicated key every time settings view renders
    const saved = storage.getToken();
    this.settings.token = saved;
    if (token) {
      token.value = saved || '';
      token.dataset.saved = saved ? '1' : '0';
    }
    document.querySelectorAll('[data-theme]').forEach(b => b.classList.toggle('active', b.dataset.theme === this.settings.theme));
    document.querySelectorAll('[data-anim]').forEach(b => b.classList.toggle('active', b.dataset.anim === (this.settings.anim||'full')));
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
    const cats = (repo.categories||[]).map(c=>`<span class="chip chip-cat">${this.esc(c)}</span>`).join('');
    const tags = (repo.tags||repo.topics||[]).map(t=>`<span class="chip">${this.esc(t)}</span>`).join('');
    const similar = this.repos.filter(r => r.id !== repo.id && (r.categories||[]).some(c => (repo.categories||[]).includes(c))).slice(0,3);
    body.innerHTML = `
      <button class="modal-close icon-btn" onclick="app.closeModal()"><svg class="icon"><use href="#icon-close"></use></svg></button>
      <div class="d-header">
        <img src="${repo.owner?.avatar_url||''}" class="d-avatar" alt="" width="56" height="56" onerror="this.style.display='none'">
        <div><h2>${this.esc(repo.full_name)}</h2><p class="d-desc">${this.esc(translator.display(repo.description||'', i18n.lang))}</p></div>
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
        <button class="btn btn-ghost" onclick="app.closeModal()">${i18n.t('close')}</button>
      </div>`;
    modal.classList.add('open');
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

  async saveSettings() {
    const raw = document.getElementById('token-input')?.value || '';
    const token = raw.trim();
    // Persist via dedicated key first
    storage.saveToken(token);
    this.settings.token = token;
    storage.saveSettings(this.settings);
    github.setToken(token);

    const statusEl = document.getElementById('auth-detail');
    if (statusEl) statusEl.textContent = i18n.t('auth_checking');

    if (token) {
      const result = await github.validateToken(token);
      this.updateAuthUI(result);
      this.updateRateUI(result.rate || github.rate);
      if (result.ok && result.status === 'authenticated') {
        this.toast(i18n.t('toast_token_saved') + (result.user ? ` (@${result.user.login})` : ''));
      } else if (result.status === 'invalid') {
        this.toast(i18n.t('auth_invalid'));
      } else {
        this.toast(result.message || i18n.t('toast_error'));
      }
    } else {
      github.setToken('');
      this.updateAuthUI({ status: 'guest', ok: true });
      this.updateRateUI({});
      this.toast(i18n.t('token_cleared'));
    }
    this.renderSettings();
  }

  async clearToken() {
    storage.clearToken();
    this.settings.token = '';
    github.setToken('');
    const input = document.getElementById('token-input');
    if (input) input.value = '';
    this.updateAuthUI({ status: 'guest', ok: true });
    this.updateRateUI({});
    this.toast(i18n.t('token_cleared'));
    this.renderSettings();
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
}

const app = new App();
window.app = app;
document.addEventListener('DOMContentLoaded', () => app.init());
export default app;
