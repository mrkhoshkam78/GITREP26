(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const homeView = $('homeView');
  const resultsView = $('resultsView');
  const homeInput = $('homeInput');
  const resultsInput = $('resultsInput');
  const resultsList = $('resultsList');
  const loadingState = $('loadingState');
  const emptyState = $('emptyState');
  const errorState = $('errorState');
  const errorMsg = $('errorMessage');
  const resultMeta = $('resultMeta');

  const I18N = {
    fa: {
      title: 'جستجوی هوشمند', search: 'جستجو', searchPh: 'جستجو کنید...',
      all: 'همه', web: 'وب', wiki: 'ویکی‌پدیا و دانشنامه',
      loading: 'در حال جستجو...', empty: 'نتیجه‌ای یافت نشد',
      error: 'خطایی رخ داد', retry: 'تلاش مجدد', settings: 'تنظیمات',
      theme: 'تم', lang: 'زبان سایت', limit: 'تعداد نتایج', source: 'منبع',
      about: 'درباره پروژه',
      aboutHtml: '<p>جستجوی هوشمند یک موتور تجمیعی <b>کاملاً کلاینت‌ساید</b> است که نتایج را از چند منبع معتبر جمع می‌کند.</p><ul><li>موتور ترکیب عبارت‌محور برای حفظ معنای جستجو</li><li>شش منبع: ویکی‌پدیا، دانشنامه، کتابخانه باز، ویکی‌داده، هکر نیوز و وب</li><li>رتبه‌بندی وب‌اول و سپس دانشنامه</li><li>تم‌های Midnight، Ivory، Ocean و Ember</li><li>۱۵ هزار کلیدواژه پنهان برای گسترش هوشمند</li><li>بدون سرور و مناسب GitHub Pages</li></ul>'
    },
    en: {
      title: 'Smart Search', search: 'Search', searchPh: 'Type a query...',
      all: 'All', web: 'Web', wiki: 'Wikipedia & encyclopedia',
      loading: 'Searching...', empty: 'No results found',
      error: 'Something went wrong', retry: 'Retry', settings: 'Settings',
      theme: 'Theme', lang: 'Language', limit: 'Result count', source: 'Source',
      about: 'About',
      aboutHtml: '<p>Smart Search is a fully <b>client-side</b> aggregator that gathers results from several public sources.</p><ul><li>Phrase-aware combination engine</li><li>Six sources: Wikipedia, encyclopedia, Open Library, Wikidata, Hacker News and the web</li><li>Web-first ranking, then encyclopedic results</li><li>Themes: Midnight, Ivory, Ocean, Ember</li><li>15,000 hidden keywords for smart expansion</li><li>No server. Works on GitHub Pages</li></ul>'
    }
  };

  const STORE = { theme: 'ss_theme_v9', lang: 'ss_lang_v9', limit: 'ss_limit_v9', source: 'ss_src_v9', cache: 'ss_c_v9' };
  let lang = localStorage.getItem(STORE.lang) || 'fa';
  let theme = localStorage.getItem(STORE.theme) || 'midnight';
  let resultLimit = parseInt(localStorage.getItem(STORE.limit) || '3', 10);
  let activeSource = localStorage.getItem(STORE.source) || 'all';
  let currentResults = [];
  let lastQuery = '';

  const WEB = new Set(['duckduckgo', 'hackernews', 'openlibrary']);
  const WIKI = new Set(['wikipedia', 'wikidata']);

  function applyI18n() {
    const pack = I18N[lang] || I18N.fa;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      if (pack[k]) el.textContent = pack[k];
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const k = el.getAttribute('data-i18n-ph');
      if (pack[k]) el.placeholder = pack[k];
    });
    $('aboutBody').innerHTML = pack.aboutHtml;
  }

  function applyTheme(name) {
    theme = name;
    document.documentElement.setAttribute('data-theme', name);
    localStorage.setItem(STORE.theme, name);
    document.querySelectorAll('.theme-swatch').forEach(b => {
      b.classList.toggle('active', b.dataset.theme === name);
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    const colors = { midnight:'#000000', ivory:'#fafafa', ocean:'#031018', ember:'#140b07' };
    if (meta) meta.setAttribute('content', colors[name] || '#000');
  }

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

  function isWeb(item) {
    return WEB.has(item.engine) || item.source === 'وب' || item.source === 'هکر نیوز' || item.source === 'کتابخانه باز';
  }
  function isWiki(item) {
    return WIKI.has(item.engine) || (item.source || '').includes('ویکی') || item.source === 'دانشنامه';
  }

  function rankResults(list, query) {
    const scored = list.map(item => {
      let s = 0;
      if (typeof SmartEngine !== 'undefined' && SmartEngine.fuzzyScore) {
        s += SmartEngine.fuzzyScore(query, item.title) * 14;
      }
      const title = (item.title || '').toLowerCase();
      const q = query.toLowerCase();
      if (title.includes(q)) s += 7;
      if (isWeb(item)) s += 5;
      else if (isWiki(item)) s += 1.5;
      if ((item.summary || '').toLowerCase().includes(q)) s += 1.5;
      return { item, s };
    }).sort((a, b) => b.s - a.s);

    const web = [], wiki = [], other = [];
    scored.forEach(({ item }) => {
      if (isWeb(item)) web.push(item);
      else if (isWiki(item)) wiki.push(item);
      else other.push(item);
    });
    return [...web, ...other, ...wiki];
  }

  function filterBySource(list) {
    if (activeSource === 'web') return list.filter(isWeb);
    if (activeSource === 'wiki') return list.filter(isWiki);
    return list;
  }

  function render(list) {
    hideStates();
    const filtered = filterBySource(list).slice(0, resultLimit);
    resultMeta.textContent = filtered.length ? `${filtered.length}` : '';
    if (!filtered.length) {
      emptyState.classList.remove('hidden');
      return;
    }
    resultsList.innerHTML = filtered.map((item, idx) => {
      const host = (item.url || '').replace(/^https?:\/\//, '').split('/')[0];
      return `<article class="result-item a-up" style="animation-delay:${idx * 0.04}s">
        <div class="source"><i class="${item.sourceIcon || 'fa-solid fa-link'}"></i> ${escapeHtml(item.source || '')}</div>
        <a class="title" href="${item.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
        <div class="url">${escapeHtml(host)}</div>
        <p class="snippet">${escapeHtml(item.summary || '')}</p>
      </article>`;
    }).join('');
  }

  function getCache(q) {
    try {
      const c = JSON.parse(localStorage.getItem(STORE.cache) || '{}');
      const e = c[q];
      if (e && Date.now() - e.time < 8 * 60 * 1000) return e.data;
    } catch {}
    return null;
  }
  function setCache(q, data) {
    try {
      const c = JSON.parse(localStorage.getItem(STORE.cache) || '{}');
      c[q] = { data, time: Date.now() };
      localStorage.setItem(STORE.cache, JSON.stringify(c));
    } catch {}
  }

  async function performSearch(query) {
    query = (query || '').trim();
    if (!query) return;
    lastQuery = query;
    resultsInput.value = query;
    homeInput.value = query;
    showResults();
    hideStates();
    loadingState.classList.remove('hidden');

    const cached = getCache(query);
    if (cached) { currentResults = cached; render(cached); return; }

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
      hideStates();
      errorState.classList.remove('hidden');
      errorMsg.textContent = I18N[lang].error;
    }
  }

  function bindPopup(openBtn, overlay, closeBtn) {
    openBtn.addEventListener('click', () => overlay.classList.add('open'));
    closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
  }

  $('homeSearchBtn').addEventListener('click', () => performSearch(homeInput.value));
  $('resultsSearchBtn').addEventListener('click', () => performSearch(resultsInput.value));
  homeInput.addEventListener('keypress', e => { if (e.key === 'Enter') performSearch(homeInput.value); });
  resultsInput.addEventListener('keypress', e => { if (e.key === 'Enter') performSearch(resultsInput.value); });
  $('logoHome').addEventListener('click', showHome);
  $('retryBtn').addEventListener('click', () => lastQuery && performSearch(lastQuery));

  document.querySelectorAll('.chip[data-source]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip[data-source]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeSource = chip.dataset.source;
      localStorage.setItem(STORE.source, activeSource);
      $('sourceSelect').value = activeSource;
      if (currentResults.length) render(currentResults);
    });
  });

  bindPopup($('settingsBtn'), $('settingsOverlay'), $('closeSettings'));
  bindPopup($('aboutBtn'), $('aboutOverlay'), $('closeAbout'));

  document.querySelectorAll('.theme-swatch').forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
  });
  $('langSelect').addEventListener('change', e => {
    lang = e.target.value;
    localStorage.setItem(STORE.lang, lang);
    applyI18n();
  });
  $('limitSelect').addEventListener('change', e => {
    resultLimit = parseInt(e.target.value, 10);
    localStorage.setItem(STORE.limit, String(resultLimit));
    if (currentResults.length) render(currentResults);
  });
  $('sourceSelect').addEventListener('change', e => {
    activeSource = e.target.value;
    localStorage.setItem(STORE.source, activeSource);
    document.querySelectorAll('.chip[data-source]').forEach(c => {
      c.classList.toggle('active', c.dataset.source === activeSource);
    });
    if (currentResults.length) render(currentResults);
  });

  window.addEventListener('load', () => {
    applyTheme(theme);
    $('langSelect').value = lang;
    $('limitSelect').value = String(resultLimit);
    $('sourceSelect').value = activeSource;
    document.querySelectorAll('.chip[data-source]').forEach(c => {
      c.classList.toggle('active', c.dataset.source === activeSource);
    });
    applyI18n();
    if (typeof SmartEngine !== 'undefined') {
      SmartEngine.load().then(() => {
        const st = SmartEngine.getStatus();
        console.log('[v9] engine', st.ready, st.count);
      });
    }
    homeInput.focus();
  });
})();
