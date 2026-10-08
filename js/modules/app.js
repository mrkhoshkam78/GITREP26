/**
 * GITREP26 V6 — Main Application Controller (restored)
 */
import { i18n } from './i18n.js';
import { storage } from './storage.js';
import { analyzer } from './analyzer.js';
import { github } from './github.js';
import { translator } from './translator.js';
import { readmeInsight } from './readmeInsight.js';
import { APP_VERSION, APP_NAME, APP_BUILD } from './version.js';

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

  renderDynamic() {
    ['trending','hidden','recent','offline','lightweight','beginner','popular','maintained','rising','editors'].forEach(sec => {
      const el = document.getElementById(`sec-${sec}`);
      if (el) el.innerHTML = this.section(sec).map((r,i) => this.card(r,i)).join('') || this.empty();
    });
    const grid = document.getElementById('explore-grid');
    if (grid) {
      const cnt = document.getElementById('explore-count');
      if (cnt) cnt.textContent = `${this.filtered.length} ${i18n.t('projects')}`;
      if (this.view === 'explore') {
        this.renderExplorePage();
        this.renderPagination();
      } else {
        grid.innerHTML = this.filtered.map((r,i) => this.card(r,i)).join('') || this.empty();
      }
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

  openCat(id) { this.navigate('category', { category: id }); }

  toggleFav(id, e) {
    e?.stopPropagation();
    const was = storage.isFav(id);
    storage.toggleFav(id);
    this.toast(was ? i18n.t('toast_fav_remove') : i18n.t('toast_fav_add'));
    this.renderDynamic();
    this.renderFavorites();
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

  async clearToken() {
    storage.clearToken();
    this.settings.token = '';
    github.setToken('');
    this._fillTokenInput('');
    this.updateAuthUI({ status: 'guest', ok: true });
    this.updateRateUI({});
    this.toast(i18n.t('token_cleared'));
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

  _fillTokenInput(value) {
    const input = document.getElementById('token-input');
    if (!input) return;
    // Use both property and attribute so it survives any re-render quirks
    input.value = value || '';
    try { input.setAttribute('value', value || ''); } catch (_) {}
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

  collapseAll(collapsed = true) {
    const ids = this.filtered.map(r => r.id);
    // Also include section repos currently visible
    this.repos.forEach(r => { if (!ids.includes(r.id)) ids.push(r.id); });
    storage.setAllCollapsed(ids, collapsed);
    this.renderDynamic();
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

  empty() {
    return `<div class="empty-state"><svg class="icon empty-icon"><use href="#icon-search"></use></svg>
      <h3 data-i18n="empty_title">${i18n.t('empty_title')}</h3>
      <p data-i18n="empty_subtitle">${i18n.t('empty_subtitle')}</p></div>`;
  }

  fmtDate(iso) {
    if (!iso) return '—';
    const d = Math.floor((Date.now()-new Date(iso))/(864e5));
    if (d===0) return 'Today'; if (d===1) return 'Yesterday';
    if (d<30) return d+'d'; if (d<365) return Math.floor(d/30)+'mo';
    return Math.floor(d/365)+'y';
  }

  showLanding() {
    const el = document.getElementById('landing');
    if (!el) return;
    el.classList.remove('hidden');
    document.body.classList.add('landing-active');
    this.fillLandingCats();
    requestAnimationFrame(() => {
      document.getElementById('landing-search')?.focus();
    });
  }

  hideLanding() {
    const el = document.getElementById('landing');
    if (!el) return;
    el.classList.add('hidden');
    document.body.classList.remove('landing-active');
  }

  submitLanding() {
    const inp = document.getElementById('landing-search');
    const q = (inp?.value || '').trim();
    sessionStorage.setItem('gitrep26_entered', '1');
    this.hideLanding();
    if (q) {
      this.filters.q = q;
      const headerInp = document.getElementById('search-input');
      if (headerInp) headerInp.value = q;
      storage.addSearch(q);
      this.liveSearch(1);
    } else {
      this.navigate('explore');
    }
  }

  enterAppFromLanding() {
    sessionStorage.setItem('gitrep26_entered', '1');
    this.hideLanding();
    this.navigate('home');
  }

  fillLandingCats() {
    const box = document.getElementById('landing-cats');
    if (!box || !this.categories?.length) return;
    const top = this.categories.slice(0, 8);
    box.innerHTML = top.map(c => {
      const name = i18n.lang === 'fa' ? (c.name_fa || c.name_en) : c.name_en;
      return `<button type="button" class="landing-cat" data-cat="${this.esc(c.id)}">${this.esc(name)}</button>`;
    }).join('');
    box.querySelectorAll('[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        sessionStorage.setItem('gitrep26_entered', '1');
        this.hideLanding();
        this.openCat(btn.dataset.cat);
      });
    });
  }

  updateThemeToggleIcon() {
    const darkIcon = document.querySelector('.theme-icon-dark');
    const lightIcon = document.querySelector('.theme-icon-light');
    if (!darkIcon || !lightIcon) return;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    document.body.classList.add('theme-switching');
    darkIcon.hidden = isLight;
    lightIcon.hidden = !isLight;
    setTimeout(() => document.body.classList.remove('theme-switching'), 450);
  }

  setSearchProgress(pct, label) {
    const wrap = document.getElementById('search-progress');
    const bar = document.getElementById('search-progress-bar');
    const lab = document.getElementById('search-progress-label');
    if (!wrap) return;
    if (pct == null || pct < 0) {
      wrap.setAttribute('hidden', '');
      wrap.hidden = true;
      if (bar) {
        bar.style.width = '0%';
        bar.style.setProperty('width', '0%');
      }
      this.searching = false;
      return;
    }
    wrap.removeAttribute('hidden');
    wrap.hidden = false;
    this.searching = true;
    const w = Math.min(100, Math.max(0, Number(pct) || 0));
    if (bar) {
      bar.style.width = w + '%';
      bar.style.setProperty('width', w + '%');
    }
    if (lab) lab.textContent = label || i18n.t('search_progress');
  }

  applyFilters() {
    // Live GitHub results already ranked — skip text re-filter
    let list = this.liveResults.length ? [...this.liveResults] : [...this.repos];
    const f = this.filters;
    const q = (f.q || '').toLowerCase();
    if (q && !this.liveResults.length) {
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

  renderPagination() {
    const el = document.getElementById('explore-pagination');
    const info = document.getElementById('page-info');
    if (!el) return;
    const totalItems = this.filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / this.pageSize));
    if (totalItems <= this.pageSize && !this.liveResults.length) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    this.searchPage = Math.min(Math.max(1, this.searchPage || 1), totalPages);
    if (info) {
      info.textContent = `${i18n.t('search_page')} ${this.searchPage} ${i18n.t('search_of')} ${totalPages} · ${totalItems} ${i18n.t('search_results_count')}`;
    }
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
    document.getElementById('explore-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  renderExplorePage() {
    const grid = document.getElementById('explore-grid');
    if (!grid || this.view !== 'explore') return;
    const page = this.searchPage || 1;
    const start = (page - 1) * this.pageSize;
    const slice = this.filtered.slice(start, start + this.pageSize);
    grid.innerHTML = slice.length
      ? slice.map((r, i) => this.card(r, i)).join('')
      : `<div class="empty-state"><h3 data-i18n="search_empty">${i18n.t('search_empty')}</h3></div>`;
    i18n.apply(grid);
  }

  async liveSearch(startPage = 1) {
    const q = (this.filters.q || '').trim();
    if (!q) return;

    // Local-only offline without token
    if (!navigator.onLine) {
      this.liveResults = [];
      this.searchPage = 1;
      this.applyFilters();
      this.navigate('explore');
      this.renderPagination();
      return;
    }

    const sort = this.sort === 'updated' ? 'updated' : (this.sort === 'forks' ? 'forks' : 'stars');
    const perPage = this.pageSize; // 8
    const maxPages = this.maxPages; // 13
    const pagesToFetch = Math.min(maxPages, 13);
    const all = [];
    let totalCount = 0;

    this.setSearchProgress(2, i18n.t('search_progress'));
    this.navigate('explore');
    this.hideLanding();

    try {
      // Fetch pages sequentially to respect rate limits; stop early if fewer results
      for (let page = 1; page <= pagesToFetch; page++) {
        const pct = Math.round((page - 1) / pagesToFetch * 90) + 5;
        this.setSearchProgress(pct, `${i18n.t('search_progress')} ${page}/${pagesToFetch}`);
        try {
          const result = await github.search(q, page, perPage, sort);
          totalCount = result.total || totalCount;
          const items = (result.items || []).map(r => ({ ...r, ...analyzer.analyze(r) }));
          all.push(...items);
          // Cache page
          try { await storage.setCache(`search:${q}:${page}:${sort}`, items, 30 * 60 * 1000); } catch (_) {}
          if (items.length < perPage) break; // no more pages
        } catch (e) {
          if (e.code === 'RATE_LIMIT') {
            this.toast(i18n.t('rate_limited'));
            break;
          }
          if (page === 1) throw e;
          break;
        }
      }

      // Rank: stars, forks, activity, quality
      all.sort((a, b) => {
        const sa = (a.stargazers_count || 0);
        const sb = (b.stargazers_count || 0);
        if (sb !== sa) return sb - sa;
        const fa = (a.forks_count || 0);
        const fb = (b.forks_count || 0);
        if (fb !== fa) return fb - fa;
        const ua = new Date(a.pushed_at || a.updated_at || 0).getTime();
        const ub = new Date(b.pushed_at || b.updated_at || 0).getTime();
        if (ub !== ua) return ub - ua;
        return (b.quality_score || 0) - (a.quality_score || 0);
      });

      this.liveResults = all;
      this.searchTotal = totalCount || all.length;
      this.searchPage = startPage;
      const doneLabel = `${all.length} ${i18n.t('search_results_count')}` +
        (totalCount > all.length ? ` · ${totalCount.toLocaleString()} total` : '');
      this.setSearchProgress(100, doneLabel);
      this.applyFilters();
      this.renderPagination();
      setTimeout(() => this.setSearchProgress(null), 900);
    } catch (e) {
      console.warn('Live search failed', e);
      this.liveResults = [];
      this.applyFilters();
      this.toast(i18n.t('search_error'));
      this.setSearchProgress(null);
    }
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

  navigate(view, params = {}) {
    this.view = view;
    if (params.category) this.currentCat = params.category;
    else if (view !== 'category') this.currentCat = null;
    if (params.repo) this.currentRepo = params.repo;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${view}`)?.classList.add('active');
    if (view !== 'home' || arguments.length) {
      sessionStorage.setItem('gitrep26_entered', '1');
      this.hideLanding();
    }
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.classList.toggle('active', el.dataset.nav === view);
    });
    document.getElementById('side-nav')?.classList.remove('open');
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const next = (this.settings.theme === 'dark' || (!this.settings.theme && !window.matchMedia('(prefers-color-scheme: light)').matches)) ? 'light' : 'dark';
      this.applyTheme(next);
      this.settings.theme = next;
      storage.saveSettings(this.settings);
      this.updateThemeToggleIcon();
    });
    document.getElementById('page-prev')?.addEventListener('click', () => this.goPage(-1));
    document.getElementById('page-next')?.addEventListener('click', () => this.goPage(1));
    // Landing
    const landSearch = document.getElementById('landing-search');
    const landGo = document.getElementById('landing-go');
    landGo?.addEventListener('click', () => this.submitLanding());
    landSearch?.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.submitLanding();
      if (e.key === 'Escape') this.enterAppFromLanding();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !document.getElementById('landing')?.classList.contains('hidden')) {
        this.enterAppFromLanding();
      }
    });
    
    document.getElementById('menu-btn')?.addEventListener('click', () => {
      document.getElementById('side-nav')?.classList.toggle('open');
    });
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
      try {
        const ver = document.getElementById('app-version-label');
        if (ver) ver.textContent = APP_NAME + ' v' + APP_VERSION + ' · ' + APP_BUILD;
        this.updateThemeToggleIcon();
        // Show immersive landing on first load of session
        if (!sessionStorage.getItem('gitrep26_entered')) {
          this.showLanding();
        } else {
          this.hideLanding();
        }
      } catch (e) { console.warn('landing', e); }
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

  esc(s) {
    const d = document.createElement('div');
    d.textContent = s||'';
    return d.innerHTML;
  }

  closeModal() { document.getElementById('modal')?.classList.remove('open'); }

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
window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('loader')?.classList.add('hidden'), 5000);
});
export default app;
