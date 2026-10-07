/**
 * GitHub Project Explorer - Main Application
 */

class App {
  constructor() {
    this.repos = [];
    this.categories = [];
    this.filtered = [];
    this.currentView = 'home';
    this.currentCategory = null;
    this.filters = {
      search: '',
      category: null,
      language: null,
      minStars: 0,
      offline: false,
      lightweight: false,
      beginner: false,
      active: false
    };
    this.settings = storage.getSettings();
  }

  async init() {
    await storage.init();
    i18n.init();
    
    // Load settings
    if (this.settings.githubToken) {
      github.setToken(this.settings.githubToken);
    }
    this.applyTheme(this.settings.theme);

    // Load data
    await this.loadData();
    
    // Bind UI
    this.bindEvents();
    this.render();
    
    // PWA
    this.setupPWA();
    
    // Hide loader
    setTimeout(() => {
      document.getElementById('app-loader')?.classList.add('hidden');
    }, 800);
  }

  async loadData() {
    try {
      // Categories
      const catRes = await fetch('data/categories.json');
      const catData = await catRes.json();
      this.categories = catData.categories;

      // Repos - try local sample
      const repoRes = await fetch('data/sample-repos.json');
      let repos = await repoRes.json();
      
      // Ensure analysis
      repos = repos.map(r => {
        if (!r.quality_score) {
          const analysis = analyzer.analyze(r);
          return { ...r, ...analysis };
        }
        return r;
      });

      this.repos = repos;
      this.filtered = [...repos];
      
      // Cache in IndexedDB
      await storage.saveRepos(repos);
    } catch (e) {
      console.warn('Failed to load sample data, trying IndexedDB', e);
      this.repos = await storage.getAllRepos();
      this.filtered = [...this.repos];
    }
  }

  bindEvents() {
    // Nav
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const view = el.getAttribute('data-nav');
        this.navigate(view);
      });
    });

    // Search
    const searchInput = document.getElementById('global-search');
    if (searchInput) {
      let debounce;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          this.filters.search = e.target.value.trim();
          this.applyFilters();
        }, 300);
      });
    }

    // Language switch
    document.querySelectorAll('[data-lang]').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang');
        i18n.setLanguage(lang);
        this.settings.language = lang;
        storage.saveSettings(this.settings);
        this.render();
      });
    });

    // Theme
    document.querySelectorAll('[data-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-theme');
        this.applyTheme(theme);
        this.settings.theme = theme;
        storage.saveSettings(this.settings);
      });
    });

    // Settings form
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveSettings();
      });
    }

    // Language change re-render
    window.addEventListener('languageChanged', () => this.renderDynamic());

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  }

  navigate(view, params = {}) {
    this.currentView = view;
    if (params.category) this.currentCategory = params.category;
    else if (view !== 'category') this.currentCategory = null;
    
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`view-${view}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('[data-nav]').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-nav') === view);
    });

    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  applyFilters() {
    let list = [...this.repos];
    const f = this.filters;
    const q = f.search.toLowerCase();

    if (q) {
      list = list.filter(r => {
        const text = `${r.name} ${r.description} ${(r.topics||[]).join(' ')} ${(r.tags||[]).join(' ')} ${(r.categories||[]).join(' ')} ${r.language}`.toLowerCase();
        return text.includes(q);
      });
    }

    if (f.category) {
      list = list.filter(r => (r.categories || []).some(c => 
        c.toLowerCase().includes(f.category.toLowerCase()) || 
        f.category.toLowerCase().includes(c.toLowerCase())
      ));
    }

    if (f.language) {
      list = list.filter(r => (r.language || '').toLowerCase() === f.language.toLowerCase());
    }

    if (f.minStars > 0) {
      list = list.filter(r => (r.stargazers_count || 0) >= f.minStars);
    }

    if (f.offline) list = list.filter(r => r.is_offline);
    if (f.lightweight) list = list.filter(r => r.is_lightweight);
    if (f.beginner) list = list.filter(r => (r.beginner_score || 0) >= 70);
    if (f.active) list = list.filter(r => (r.activity_score || 0) >= 80);

    this.filtered = list;
    this.renderDynamic();
  }

  getSectionRepos(section) {
    switch (section) {
      case 'trending':
        return this.repos.filter(r => r.is_trending).sort((a,b) => b.stargazers_count - a.stargazers_count).slice(0, 8);
      case 'hidden':
        return this.repos.filter(r => (r.categories||[]).includes('Hidden Gems') || (r.stargazers_count < 30000 && r.quality_score >= 85)).slice(0, 8);
      case 'recent':
        return [...this.repos].sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 8);
      case 'offline':
        return this.repos.filter(r => r.is_offline).sort((a,b) => b.quality_score - a.quality_score).slice(0, 8);
      case 'lightweight':
        return this.repos.filter(r => r.is_lightweight).sort((a,b) => b.quality_score - a.quality_score).slice(0, 8);
      case 'beginner':
        return this.repos.filter(r => (r.beginner_score||0) >= 70).sort((a,b) => b.beginner_score - a.beginner_score).slice(0, 8);
      default:
        return this.filtered;
    }
  }

  render() {
    this.renderCategories();
    this.renderDynamic();
    this.renderSettings();
  }

  renderDynamic() {
    // Home sections
    ['trending', 'hidden', 'recent', 'offline', 'lightweight', 'beginner'].forEach(sec => {
      const container = document.getElementById(`section-${sec}`);
      if (container) {
        const repos = this.getSectionRepos(sec);
        container.innerHTML = repos.map((r, i) => this.cardHTML(r, i)).join('') || this.emptyHTML();
      }
    });

    // Explore / all
    const exploreGrid = document.getElementById('explore-grid');
    if (exploreGrid) {
      exploreGrid.innerHTML = this.filtered.map((r, i) => this.cardHTML(r, i)).join('') || this.emptyHTML();
      const countEl = document.getElementById('explore-count');
      if (countEl) countEl.textContent = `${this.filtered.length} ${i18n.t('projects')}`;
    }

    // Category view
    if (this.currentView === 'category' && this.currentCategory) {
      const cat = this.categories.find(c => c.id === this.currentCategory);
      const titleEl = document.getElementById('category-title');
      if (titleEl && cat) {
        titleEl.textContent = i18n.lang === 'fa' ? cat.name_fa : cat.name_en;
      }
      const catGrid = document.getElementById('category-grid');
      if (catGrid) {
        const name = i18n.lang === 'fa' ? cat.name_fa : cat.name_en;
        const repos = this.repos.filter(r => (r.categories||[]).some(c => 
          c.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(c.toLowerCase()) ||
          (cat.subcategories||[]).some(s => c.toLowerCase().includes((i18n.lang==='fa'?s.name_fa:s.name_en).toLowerCase()))
        ));
        catGrid.innerHTML = repos.map((r, i) => this.cardHTML(r, i)).join('') || this.emptyHTML();
      }
    }

    // Language buttons active state
    document.querySelectorAll('[data-lang]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === i18n.lang);
    });
  }

  renderCategories() {
    const html = this.categories.map((cat, i) => {
      const name = i18n.lang === 'fa' ? cat.name_fa : cat.name_en;
      const count = this.repos.filter(r => (r.categories || []).some(c =>
        c === cat.name_en || c.toLowerCase().includes(cat.name_en.toLowerCase().split(' ')[0])
      )).length;
      return `
        <button class="category-card" style="--cat-color:${cat.color};--cat-gradient:${cat.gradient};animation-delay:${i * 0.05}s"
                data-category="${cat.id}" onclick="app.openCategory('${cat.id}')">
          <span class="cat-icon">${cat.icon}</span>
          <span class="cat-name">${name}</span>
          <span class="cat-count">${count}</span>
          <div class="cat-glow"></div>
        </button>
      `;
    }).join('');
    const grid = document.getElementById('categories-grid');
    const gridFull = document.getElementById('categories-grid-full');
    if (grid) grid.innerHTML = html;
    if (gridFull) gridFull.innerHTML = html;
  }

  renderSettings() {
    const tokenInput = document.getElementById('github-token');
    if (tokenInput) tokenInput.value = this.settings.githubToken || '';
    const themeBtns = document.querySelectorAll('[data-theme]');
    themeBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-theme') === this.settings.theme));
  }

  cardHTML(repo, index = 0) {
    const lang = i18n.lang;
    const stars = this.formatNumber(repo.stargazers_count);
    const forks = this.formatNumber(repo.forks_count);
    const updated = this.formatDate(repo.updated_at);
    const cats = (repo.categories || []).slice(0, 2);
    const tags = (repo.tags || repo.topics || []).slice(0, 3);
    const avatar = repo.owner?.avatar_url || '';
    const isFav = storage.isFavorite(repo.id);

    return `
      <article class="repo-card" style="animation-delay:${index * 0.04}s" data-id="${repo.id}">
        <div class="card-header">
          <img class="repo-avatar" src="${avatar}" alt="" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22%3E%3Crect fill=%22%23334155%22 width=%2240%22 height=%2240%22 rx=%228%22/%3E%3C/svg%3E'">
          <div class="repo-title-wrap">
            <h3 class="repo-name">${this.escape(repo.name)}</h3>
            <span class="repo-owner">${this.escape(repo.owner?.login || '')}</span>
          </div>
          <button class="fav-btn ${isFav ? 'active' : ''}" onclick="app.toggleFav(${repo.id}, event)" title="Favorite">
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
        </div>
        <p class="repo-desc">${this.escape(repo.description || '')}</p>
        <div class="repo-cats">
          ${cats.map(c => `<span class="chip cat-chip">${this.escape(c)}</span>`).join('')}
        </div>
        <div class="repo-meta">
          <span class="meta-item" title="${i18n.t('card_stars')}">⭐ ${stars}</span>
          <span class="meta-item" title="${i18n.t('card_forks')}">🍴 ${forks}</span>
          <span class="meta-item lang">${this.escape(repo.language || '—')}</span>
          <span class="meta-item">${updated}</span>
        </div>
        <div class="repo-scores">
          <div class="score" title="${i18n.t('card_quality')}">
            <span class="score-label">Q</span>
            <div class="score-bar"><div class="score-fill" style="width:${repo.quality_score||0}%"></div></div>
            <span class="score-val">${repo.quality_score||0}</span>
          </div>
          <div class="score" title="${i18n.t('card_activity')}">
            <span class="score-label">A</span>
            <div class="score-bar"><div class="score-fill activity" style="width:${repo.activity_score||0}%"></div></div>
            <span class="score-val">${repo.activity_score||0}</span>
          </div>
          <div class="score" title="${i18n.t('card_beginner')}">
            <span class="score-label">B</span>
            <div class="score-bar"><div class="score-fill beginner" style="width:${repo.beginner_score||0}%"></div></div>
            <span class="score-val">${repo.beginner_score||0}</span>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn btn-ghost btn-sm" onclick="app.showDetails(${repo.id})">${i18n.t('card_details')}</button>
          <a class="btn btn-primary btn-sm" href="${repo.html_url}" target="_blank" rel="noopener">${i18n.t('card_view')}</a>
        </div>
        ${repo.is_offline ? '<span class="badge offline">Offline</span>' : ''}
        ${repo.is_trending ? '<span class="badge trending">🔥</span>' : ''}
      </article>
    `;
  }

  emptyHTML() {
    return `
      <div class="empty-state">
        <div class="empty-icon">🔭</div>
        <h3 data-i18n="empty_title">${i18n.t('empty_title')}</h3>
        <p data-i18n="empty_subtitle">${i18n.t('empty_subtitle')}</p>
      </div>
    `;
  }

  showDetails(id) {
    const repo = this.repos.find(r => r.id === id);
    if (!repo) return;
    const modal = document.getElementById('detail-modal');
    const body = document.getElementById('detail-body');
    if (!modal || !body) return;

    const cats = (repo.categories || []).map(c => `<span class="chip">${this.escape(c)}</span>`).join('');
    const tags = (repo.tags || repo.topics || []).map(t => `<span class="chip tag">${this.escape(t)}</span>`).join('');

    body.innerHTML = `
      <div class="detail-header">
        <img src="${repo.owner?.avatar_url || ''}" class="detail-avatar" alt="" onerror="this.style.display='none'">
        <div>
          <h2>${this.escape(repo.full_name)}</h2>
          <p class="detail-desc">${this.escape(repo.description || '')}</p>
        </div>
      </div>
      <div class="detail-stats">
        <div class="stat"><span class="stat-val">⭐ ${this.formatNumber(repo.stargazers_count)}</span><span class="stat-label">${i18n.t('card_stars')}</span></div>
        <div class="stat"><span class="stat-val">🍴 ${this.formatNumber(repo.forks_count)}</span><span class="stat-label">${i18n.t('card_forks')}</span></div>
        <div class="stat"><span class="stat-val">${this.escape(repo.language || '—')}</span><span class="stat-label">${i18n.t('details_language')}</span></div>
        <div class="stat"><span class="stat-val">${this.escape(repo.license || '—')}</span><span class="stat-label">${i18n.t('details_license')}</span></div>
      </div>
      <div class="detail-scores">
        <h4>${i18n.t('details_scores')}</h4>
        <div class="scores-row">
          <div class="big-score"><span>${repo.quality_score||0}</span><small>${i18n.t('card_quality')}</small></div>
          <div class="big-score"><span>${repo.activity_score||0}</span><small>${i18n.t('card_activity')}</small></div>
          <div class="big-score"><span>${repo.beginner_score||0}</span><small>${i18n.t('card_beginner')}</small></div>
        </div>
      </div>
      <div class="detail-section"><h4>${i18n.t('details_categories')}</h4><div class="chips">${cats}</div></div>
      <div class="detail-section"><h4>${i18n.t('details_tags')}</h4><div class="chips">${tags}</div></div>
      <div class="detail-actions">
        <a class="btn btn-primary" href="${repo.html_url}" target="_blank" rel="noopener">${i18n.t('card_view')}</a>
        <button class="btn btn-ghost" onclick="app.closeModal()">${i18n.t('close')}</button>
      </div>
    `;
    modal.classList.add('open');
  }

  closeModal() {
    document.getElementById('detail-modal')?.classList.remove('open');
  }

  openCategory(id) {
    this.navigate('category', { category: id });
  }

  toggleFav(id, e) {
    e?.stopPropagation();
    storage.toggleFavorite(id);
    this.renderDynamic();
  }

  setFilter(key, value) {
    this.filters[key] = value;
    this.applyFilters();
  }

  clearFilters() {
    this.filters = { search: '', category: null, language: null, minStars: 0, offline: false, lightweight: false, beginner: false, active: false };
    const search = document.getElementById('global-search');
    if (search) search.value = '';
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    this.applyFilters();
  }

  toggleFilterChip(el, key) {
    el.classList.toggle('active');
    this.filters[key] = el.classList.contains('active');
    this.applyFilters();
  }

  saveSettings() {
    const token = document.getElementById('github-token')?.value || '';
    this.settings.githubToken = token;
    storage.saveSettings(this.settings);
    github.setToken(token);
    const msg = document.getElementById('settings-msg');
    if (msg) {
      msg.textContent = i18n.t('settings_saved');
      msg.classList.add('show');
      setTimeout(() => msg.classList.remove('show'), 2500);
    }
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  }

  setupPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      const btn = document.getElementById('install-btn');
      if (btn) {
        btn.style.display = 'inline-flex';
        btn.onclick = async () => {
          deferredPrompt.prompt();
          await deferredPrompt.userChoice;
          deferredPrompt = null;
          btn.style.display = 'none';
        };
      }
    });
  }

  formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n || 0);
  }

  formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const now = new Date();
    const days = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  }

  escape(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
}

const app = new App();
window.app = app;

document.addEventListener('DOMContentLoaded', () => app.init());
