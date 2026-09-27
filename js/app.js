/**
 * App v8.0 — Immersive home + search-engine results view
 * Ranking: Web results first, then Wikipedia / encyclopedia
 * Defaults: 3 results, source=all
 */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const homeView = $('homeView');
  const resultsView = $('resultsView');
  const homeInput = $('homeInput');
  const resultsInput = $('resultsInput');
  const homeBtn = $('homeSearchBtn');
  const resultsBtn = $('resultsSearchBtn');
  const resultsList = $('resultsList');
  const loadingState = $('loadingState');
  const emptyState = $('emptyState');
  const errorState = $('errorState');
  const errorMsg = $('errorMessage');
  const resultMeta = $('resultMeta');
  const logoHome = $('logoHome');
  const retryBtn = $('retryBtn');

  let currentResults = [];
  let activeSource = 'all';   // all | web | wiki
  let resultLimit = 3;
  let lastQuery = '';

  const KEYS = { history: 'ss_h_v8', cache: 'ss_c_v8' };
  const CACHE_TTL = 8 * 60 * 1000;

  // Web-like sources first
  const WEB_ENGINES = new Set(['duckduckgo', 'hackernews', 'openlibrary']);
  const WIKI_ENGINES = new Set(['wikipedia', 'wikidata']);

  function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t || '';
    return d.innerHTML;
  }

  function normalizeTitle(t) {
    return (t || '').toLowerCase().replace(/[\s\-_]+/g, ' ').trim();
  }

  function showHome() {
    homeView.style.display = 'flex';
    resultsView.classList.remove('active');
    homeInput.focus();
  }

  function showResults() {
    homeView.style.display = 'none';
    resultsView.classList.add('active');
  }

  function hideStates() {
    loadingState.classList.add('hidden');
    emptyState.classList.add('hidden');
    errorState.classList.add('hidden');
    resultsList.innerHTML = '';
  }

  function showLoading() {
    hideStates();
    loadingState.classList.remove('hidden');
  }

  function showError(msg) {
    hideStates();
    errorState.classList.remove('hidden');
    errorMsg.textContent = msg;
  }

  // Ranking: Web first, then Wiki/Encyclopedia. Strong phrase boost.
  function rankResults(list, query) {
    const scored = list.map(item => {
      let s = 0;
      const title = (item.title || '').toLowerCase();
      const q = query.toLowerCase();

      // Phrase / fuzzy
      if (typeof SmartEngine !== 'undefined' && SmartEngine.fuzzyScore) {
        s += SmartEngine.fuzzyScore(query, item.title) * 14;
      }
      if (title.includes(q)) s += 7;

      // Source priority: Web-like first
      if (WEB_ENGINES.has(item.engine)) s += 5;
      else if (item.source === 'وب' || item.source === 'هکر نیوز' || item.source === 'کتابخانه باز') s += 5;
      else if (WIKI_ENGINES.has(item.engine) || (item.source || '').includes('ویکی') || item.source === 'دانشنامه') s += 1.5;

      // Small boosts
      if ((item.summary || '').toLowerCase().includes(q)) s += 1.5;
      return { item, s };
    });

    scored.sort((a, b) => b.s - a.s);

    // Stable partition: web group first, then wiki group (while keeping internal score order)
    const web = [];
    const wiki = [];
    const other = [];
    scored.forEach(({ item }) => {
      const isWeb = WEB_ENGINES.has(item.engine) || item.source === 'وب' || item.source === 'هکر نیوز' || item.source === 'کتابخانه باز';
      const isWiki = WIKI_ENGINES.has(item.engine) || (item.source || '').includes('ویکی') || item.source === 'دانشنامه';
      if (isWeb) web.push(item);
      else if (isWiki) wiki.push(item);
      else other.push(item);
    });
    return [...web, ...other, ...wiki];
  }

  function filterBySource(list) {
    if (activeSource === 'all') return list;
    if (activeSource === 'web') {
      return list.filter(i =>
        WEB_ENGINES.has(i.engine) || i.source === 'وب' || i.source === 'هکر نیوز' || i.source === 'کتابخانه باز'
      );
    }
    // wiki
    return list.filter(i =>
      WIKI_ENGINES.has(i.engine) || (i.source || '').includes('ویکی') || i.source === 'دانشنامه'
    );
  }

  function render(list) {
    hideStates();
    const filtered = filterBySource(list).slice(0, resultLimit);
    resultMeta.textContent = filtered.length ? `${filtered.length} نتیجه` : '';

    if (!filtered.length) {
      emptyState.classList.remove('hidden');
      return;
    }

    resultsList.innerHTML = filtered.map((item, idx) => {
      const urlDisplay = (item.url || '').replace(/^https?:\/\//, '').split('/')[0];
      return `
        <article class="result-item" style="animation-delay:${idx * 0.04}s">
          <div class="source"><i class="${item.sourceIcon || 'fa-solid fa-link'}"></i> ${escapeHtml(item.source || '')}</div>
          <a class="title" href="${item.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
          <div class="url">${escapeHtml(urlDisplay)}</div>
          <p class="snippet">${escapeHtml(item.summary || '')}</p>
        </article>`;
    }).join('');
  }

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
      c[q] = { data, time: Date.now() };
      localStorage.setItem(KEYS.cache, JSON.stringify(c));
    } catch {}
  }

  async function performSearch(query) {
    query = (query || '').trim();
    if (!query) return;
    lastQuery = query;
    resultsInput.value = query;
    homeInput.value = query;
    showResults();
    showLoading();

    const cached = getCache(query);
    if (cached) {
      currentResults = cached;
      render(cached);
      return;
    }

    try {
      const variants = (typeof SmartEngine !== 'undefined' && SmartEngine.combine)
        ? SmartEngine.combine(query) : [query];

      const raw = await SearchEngines.searchAll(query, { limit: Math.max(resultLimit, 8), variants });

      const seen = new Set();
      let all = raw.filter(item => {
        const key = normalizeTitle(item.title);
        if (!item.title || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      all = rankResults(all, query);
      currentResults = all;
      setCache(query, all);
      render(all);
    } catch (err) {
      console.error(err);
      showError('خطا در دریافت نتایج. اتصال اینترنت را بررسی کنید.');
    }
  }

  // Events
  homeBtn.addEventListener('click', () => performSearch(homeInput.value));
  resultsBtn.addEventListener('click', () => performSearch(resultsInput.value));
  homeInput.addEventListener('keypress', e => { if (e.key === 'Enter') performSearch(homeInput.value); });
  resultsInput.addEventListener('keypress', e => { if (e.key === 'Enter') performSearch(resultsInput.value); });
  logoHome.addEventListener('click', showHome);
  retryBtn.addEventListener('click', () => { if (lastQuery) performSearch(lastQuery); });

  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (chip.dataset.source) {
        document.querySelectorAll('.chip[data-source]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeSource = chip.dataset.source;
      }
      if (chip.dataset.limit) {
        document.querySelectorAll('.chip[data-limit]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        resultLimit = parseInt(chip.dataset.limit, 10);
      }
      if (currentResults.length) render(currentResults);
    });
  });

  // Init
  window.addEventListener('load', () => {
    if (typeof SmartEngine !== 'undefined') {
      SmartEngine.load().then(() => {
        const st = SmartEngine.getStatus();
        console.log('[v8] SmartEngine:', st.ready, st.count);
      });
    }
    homeInput.focus();
  });
})();
