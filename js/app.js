/**
 * App Orchestrator v5.0
 * Clean UI + state management. Delegates intelligence & search to modules.
 */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const els = {
    input: $('searchInput'),
    btn: $('searchBtn'),
    results: $('results'),
    resultsBox: $('resultsContainer'),
    loading: $('loadingState'),
    empty: $('emptyState'),
    error: $('errorState'),
    errorMsg: $('errorMessage'),
    count: $('resultCount'),
    clearInput: $('clearInput'),
    clearResults: $('clearResults'),
    historySection: $('historySection'),
    historyList: $('historyList'),
    googleLink: $('googleLink'),
    themeToggle: $('themeToggle'),
    themeIcon: $('themeIcon'),
    retryBtn: $('retryBtn')
  };

  let currentResults = [];
  let activeFilter = 'all';
  let resultLimit = 5;
  let lastQuery = '';

  const KEYS = {
    history: 'ss_history_v50',
    theme: 'ss_theme_v50',
    cache: 'ss_cache_v50',
    limit: 'ss_limit_v50'
  };
  const CACHE_TTL = 8 * 60 * 1000;

  function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t || '';
    return d.innerHTML;
  }

  function normalizeTitle(t) {
    return (t || '').toLowerCase().replace(/[\s\-_]+/g, ' ').trim();
  }

  function hideAll() {
    els.loading.classList.add('hidden');
    els.resultsBox.classList.add('hidden');
    els.empty.classList.add('hidden');
    els.error.classList.add('hidden');
  }

  function showLoading() {
    hideAll();
    els.loading.classList.remove('hidden');
  }

  function showError(msg) {
    hideAll();
    els.error.classList.remove('hidden');
    els.errorMsg.textContent = msg;
  }

  function initTheme() {
    const saved = localStorage.getItem(KEYS.theme);
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      els.themeIcon.className = 'fas fa-sun text-yellow-300 text-lg';
    }
  }

  els.themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    document.body.classList.toggle('dark');
    els.themeIcon.className = isDark ? 'fas fa-sun text-yellow-300 text-lg' : 'fas fa-moon text-purple-600 text-lg';
    localStorage.setItem(KEYS.theme, isDark ? 'dark' : 'light');
  });

  document.querySelectorAll('.limit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.limit-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      resultLimit = parseInt(btn.dataset.limit, 10);
      localStorage.setItem(KEYS.limit, resultLimit);
      if (currentResults.length) renderResults(currentResults);
    });
  });

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.source;
      if (currentResults.length) renderResults(currentResults);
    });
  });

  function getHistory() {
    try { return JSON.parse(localStorage.getItem(KEYS.history) || '[]'); } catch { return []; }
  }

  function saveHistory(q) {
    const h = getHistory().filter(x => x !== q);
    h.unshift(q);
    localStorage.setItem(KEYS.history, JSON.stringify(h.slice(0, 10)));
    renderHistory();
  }

  function renderHistory() {
    const h = getHistory();
    if (!h.length) {
      els.historySection.classList.add('hidden');
      return;
    }
    els.historySection.classList.remove('hidden');
    els.historyList.innerHTML = h.map(q =>
      `<button class="history-item text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-indigo-900/40 text-gray-700 dark:text-indigo-200 border border-gray-200 dark:border-indigo-800">${escapeHtml(q)}</button>`
    ).join('');
    els.historyList.querySelectorAll('button').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        els.input.value = h[i];
        performSearch();
      });
    });
  }

  $('clearHistory').addEventListener('click', () => {
    localStorage.removeItem(KEYS.history);
    renderHistory();
  });

  function getCache(q) {
    try {
      const c = JSON.parse(localStorage.getItem(KEYS.cache) || '{}');
      const e = c[q];
      if (e && Date.now() - e.time < CACHE_TTL) return e.data;
    } catch {}
    return null;
  }

  function setCache(q, data) {
    try {
      const c = JSON.parse(localStorage.getItem(KEYS.cache) || '{}');
      const keys = Object.keys(c);
      if (keys.length > 30) {
        keys.sort((a, b) => c[a].time - c[b].time)
          .slice(0, keys.length - 30)
          .forEach(k => delete c[k]);
      }
      c[q] = { data, time: Date.now() };
      localStorage.setItem(KEYS.cache, JSON.stringify(c));
    } catch {}
  }

  function renderResults(data) {
    hideAll();
    els.resultsBox.classList.remove('hidden');
    els.results.innerHTML = '';

    let list = activeFilter === 'all' ? data : data.filter(r => r.source === activeFilter);
    list = list.slice(0, resultLimit);
    els.count.textContent = `${list.length} نتیجه`;

    if (!list.length) {
      els.results.innerHTML = `<div class="col-span-full glass rounded-xl p-8 text-center"><p class="text-gray-600 dark:text-indigo-300">با این فیلتر نتیجه‌ای یافت نشد</p></div>`;
      return;
    }

    list.forEach((item, i) => {
      const card = document.createElement('div');
      card.className = 'glass rounded-xl shadow-lg p-5 card-hover fade-in anim-scale';
      card.style.animationDelay = `${i * 0.05}s`;
      card.innerHTML = `
        <div class="flex items-start justify-between mb-2.5">
          <span class="source-badge ${item.color}"><i class="${item.sourceIcon} ml-1"></i>${item.source}</span>
        </div>
        <h3 class="text-base font-bold text-gray-800 dark:text-indigo-100 mb-2 line-clamp-2">${escapeHtml(item.title)}</h3>
        <p class="text-gray-600 dark:text-indigo-300 text-sm mb-3 line-clamp-3 leading-relaxed">${escapeHtml(item.summary)}</p>
        <div class="flex items-center justify-between">
          <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-purple-600 dark:text-purple-400 hover:text-purple-700 font-medium text-sm">
            مشاهده <i class="fas fa-external-link-alt text-xs"></i>
          </a>
          <button class="copy-btn text-gray-400 hover:text-purple-500 text-sm" title="کپی لینک" data-url="${item.url}">
            <i class="fas fa-link"></i>
          </button>
        </div>`;
      card.querySelector('.copy-btn').addEventListener('click', e => {
        navigator.clipboard.writeText(e.currentTarget.dataset.url).then(() => {
          const icon = e.currentTarget.querySelector('i');
          icon.className = 'fas fa-check text-green-500';
          setTimeout(() => { icon.className = 'fas fa-link'; }, 1400);
        });
      });
      els.results.appendChild(card);
    });
  }

  async function performSearch() {
    const query = els.input.value.trim();
    if (!query) {
      showError('لطفاً یک عبارت وارد کنید');
      return;
    }
    lastQuery = query;
    showLoading();
    saveHistory(query);
    els.googleLink.href = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=fa`;

    const cached = getCache(query);
    if (cached) {
      currentResults = cached;
      renderResults(cached);
      return;
    }

    try {
      const variants = SmartEngine.combine(query);
      console.log('[App] Smart variants:', variants);

      const raw = await SearchEngines.searchAll(query, {
        limit: resultLimit,
        variants
      });

      const seen = new Set();
      let all = raw.filter(item => {
        const key = normalizeTitle(item.title);
        if (!item.title || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      all.sort((a, b) => {
        const score = (item) => {
          let s = SmartEngine.fuzzyScore(query, item.title) * 12;
          const t = (item.title || '').toLowerCase();
          const q = query.toLowerCase();
          if (t.includes(q)) s += 4; // full phrase boost
          if (item.source.includes('فارسی')) s += 2.5;
          if (item.source === 'دانشنامه') s += 2;
          if (item.engine === 'wikidata') s += 1.2;
          if (item.engine === 'openlibrary') s += 1;
          if (item.engine === 'hackernews') s += 0.8;
          return s;
        };
        return score(b) - score(a);
      });

      if (!all.length) {
        showError('نتیجه‌ای یافت نشد. عبارت دیگری را امتحان کنید یا از گوگل استفاده کنید.');
        return;
      }

      currentResults = all;
      setCache(query, all);
      renderResults(all);
    } catch (err) {
      console.error(err);
      showError('خطا در دریافت اطلاعات. اتصال اینترنت را بررسی کنید.');
    }
  }

  els.input.addEventListener('keypress', e => { if (e.key === 'Enter') performSearch(); });
  els.input.addEventListener('input', () => {
    els.clearInput.classList.toggle('hidden', !els.input.value.trim());
  });
  els.clearInput.addEventListener('click', () => {
    els.input.value = '';
    els.clearInput.classList.add('hidden');
    els.input.focus();
  });
  els.btn.addEventListener('click', performSearch);
  els.clearResults.addEventListener('click', () => {
    currentResults = [];
    hideAll();
    els.empty.classList.remove('hidden');
  });
  els.retryBtn.addEventListener('click', () => { if (lastQuery) performSearch(); });

  window.addEventListener('load', async () => {
    initTheme();
    renderHistory();

    const savedLimit = localStorage.getItem(KEYS.limit);
    if (savedLimit) {
      resultLimit = parseInt(savedLimit, 10);
      document.querySelectorAll('.limit-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.limit === savedLimit);
      });
    }

    SmartEngine.load().then(() => {
      const st = SmartEngine.getStatus();
      console.log('[App] SmartEngine ready:', st.ready, 'keywords:', st.count);
    });

    els.input.focus();
  });
})();
