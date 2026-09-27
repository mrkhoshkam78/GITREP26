(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const layoutShell = $('layoutShell');
  const layoutNova = $('layoutNova');
  const layoutDense = $('layoutDense');

  // Shell nodes
  const homePanel = $('homePanel');
  const resultsPanel = $('resultsPanel');
  const qInput = $('qInput');
  const resultsList = $('resultsList');
  const loadingState = $('loadingState');
  const emptyState = $('emptyState');
  const errorState = $('errorState');
  const errorMsg = $('errorMessage');
  const resultMeta = $('resultMeta');
  const sidebar = $('sidebar');
  const sideBackdrop = $('sideBackdrop');

  // Nova nodes
  const nvStageHome = $('nvStageHome');
  const nvStageResults = $('nvStageResults');
  const nvInputHome = $('nvInputHome');
  const nvInputResults = $('nvInputResults');
  const nvList = $('nvList');
  const nvLoading = $('nvLoading');
  const nvEmpty = $('nvEmpty');
  const nvError = $('nvError');
  const nvErrorMsg = $('nvErrorMsg');
  const nvMeta = $('nvMeta');

  const I18N = {
    fa: {
      title: 'جستجوی هوشمند', search: 'جستجو', searchPh: 'جستجو در ۵۰ منبع...',
      all: 'همه منابع', web: 'وب', wiki: 'دانشنامه', code: 'کد', science: 'علم',
      loading: 'در حال جستجو...', empty: 'نتیجه‌ای یافت نشد',
      error: 'خطایی رخ داد', retry: 'تلاش مجدد', settings: 'تنظیمات',
      theme: 'تم', lang: 'زبان', limit: 'تعداد نتایج', source: 'فیلتر پیش‌فرض',
      about: 'درباره', navHome: 'خانه', layout: 'قالب',
      layoutShell: 'Shell', layoutShellD: 'سایدبار · ورک‌اسپیس',
      layoutNova: 'Nova', layoutNovaD: 'جستجوی مدرن ۲۰۲۶',
      layoutDense: 'Dense', layoutDenseD: 'شلوغ · چندستونه · KPI',
      dnLive: 'آماده', dnQuick: 'میانبر', dnSources: 'منابع فعال',
      dnHomeTitle: 'جستجوی تمام‌صفحه', dnHomeSub: 'یک صحنه بزرگ، رنگ زیاد، و نتایج در همان فضای immersive.',
      dnKpiTotal: 'کل', dnKpiShown: 'نمایش', dnKeys: 'کلیدواژه', dnLocal: 'کلاینت‌ساید',
      welcome: 'جستجو کنید. عمیق‌تر پیدا کنید.',
      welcomeSub: '۵۰ منبع · روی دستگاه شما',
      novaLead: 'از دانشنامه تا کد و مقالات علمی — یک جعبه، پنجاه منبع.',
      novaPh: 'سؤال یا عبارت خود را بنویسید...',
      novaHint: 'برای جستجو Enter بزنید',
      novaResults: 'نتیجه',
      tileAi: 'هوش مصنوعی', tileAiD: 'مدل‌ها، ابزارها، مقالات',
      tileCode: 'برنامه‌نویسی', tileCodeD: 'Stack Overflow و مستندات',
      tileHist: 'تاریخ ایران', tileHistD: 'دانشنامه و منابع',
      tileMl: 'یادگیری ماشین', tileMlD: 'arXiv و مقالات',
      tileWeb: 'ساخت سایت', tileWebD: 'راهنما، ابزار، نمونه',
      aboutHtml: '<p>دو قالب مستقل: <b>Shell</b> و <b>Nova</b>.</p><ul><li>۵۰ منبع عمومی</li><li>~۸۶ هزار کلیدواژه</li><li>کاملاً کلاینت‌ساید</li></ul>'
    },
    en: {
      title: 'Smart Search', search: 'Search', searchPh: 'Search 50 sources...',
      all: 'All sources', web: 'Web', wiki: 'Encyclopedia', code: 'Code', science: 'Science',
      loading: 'Searching...', empty: 'No results found',
      error: 'Something went wrong', retry: 'Retry', settings: 'Settings',
      theme: 'Theme', lang: 'Language', limit: 'Result count', source: 'Default filter',
      about: 'About', navHome: 'Home', layout: 'Layout',
      layoutShell: 'Shell', layoutShellD: 'Sidebar · workspace',
      layoutNova: 'Nova', layoutNovaD: 'Modern 2026 search',
      layoutDense: 'Dense', layoutDenseD: 'Busy · multi-column · KPIs',
      dnLive: 'Ready', dnQuick: 'Shortcuts', dnSources: 'Active sources',
      dnHomeTitle: 'Fullscreen search', dnHomeSub: 'Large scene, rich color, results in the same immersive space.',
      dnKpiTotal: 'Total', dnKpiShown: 'Shown', dnKeys: 'keywords', dnLocal: 'Client-side',
      welcome: 'Search deeper. Find more.',
      welcomeSub: '50 sources · on-device',
      novaLead: 'Encyclopedias, code, papers — one box, fifty sources.',
      novaPh: 'Type a question or query...',
      novaHint: 'Press Enter to search',
      novaResults: 'results',
      tileAi: 'Artificial Intelligence', tileAiD: 'Models, tools, papers',
      tileCode: 'Programming', tileCodeD: 'Stack Overflow & docs',
      tileHist: 'History of Iran', tileHistD: 'Encyclopedia & refs',
      tileMl: 'Machine Learning', tileMlD: 'arXiv & papers',
      tileWeb: 'Build a website', tileWebD: 'Guides, tools, examples',
      aboutHtml: '<p>Two independent layouts: <b>Shell</b> and <b>Nova</b>.</p><ul><li>50 public sources</li><li>~86k keywords</li><li>Fully client-side</li></ul>'
    }
  };

  const STORE = { theme: 'ss_t21', lang: 'ss_l21', limit: 'ss_n21', source: 'ss_s21', cache: 'ss_c21', layout: 'ss_layout21' };
  let lang = localStorage.getItem(STORE.lang) || 'fa';
  let theme = localStorage.getItem(STORE.theme) || 'midnight';
  let layout = localStorage.getItem(STORE.layout) || 'shell';
  let resultLimit = parseInt(localStorage.getItem(STORE.limit) || '5', 10);
  let activeSource = localStorage.getItem(STORE.source) || 'all';
  let currentResults = [], lastQuery = '';

  const WEIGHT = {
    stackoverflow: 3.2, wikipedia: 2.8, duckduckgo: 2.4, hackernews: 2.2,
    reddit: 1.8, arxiv: 2.6, crossref: 2.3, openlibrary: 1.6, wikidata: 1.5,
    archive: 1.4, gutenberg: 1.3, dictionary: 1.7, geo: 1.1, musicbrainz: 1.2, quotable: 1, europepmc: 2.5
  };
  const THEME_COLOR = {
    midnight: '#0a0a0b', ivory: '#f4f4f5', ocean: '#02141a', ember: '#140c08',
    aurora: '#0b0f1a', forge: '#0c0a09', day: '#eef2ff'
  };

  const esc = t => { const d = document.createElement('div'); d.textContent = t || ''; return d.innerHTML; };
  const normTitle = t => (t || '').toLowerCase().replace(/[\s\-_]+/g, ' ').trim();

  function applyI18n() {
    const p = I18N[lang] || I18N.fa;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      if (p[k]) el.textContent = p[k];
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const k = el.getAttribute('data-i18n-ph');
      if (p[k]) el.placeholder = p[k];
    });

    const ab = $('aboutBody');
    if (ab) ab.innerHTML = p.aboutHtml;
  }


  function setCseBadge(on, text) {
    const b = $('cseBadge');
    if (!b) return;
    b.dataset.state = on ? 'on' : 'off';
    b.textContent = text || (on ? 'متصل' : 'خاموش');
  }
  function setCseStatus(msg, ok) {
    const s = $('cseStatus');
    if (!s) return;
    s.hidden = !msg;
    s.textContent = msg || '';
    s.dataset.ok = ok ? '1' : '0';
  }
  function loadGoogleCse() {
    try {
      const key = localStorage.getItem('ss_gkey') || '';
      const cx = localStorage.getItem('ss_gcx') || '';
      const connected = localStorage.getItem('ss_gok') === '1';
      const k = $('googleCseKey');
      const c = $('googleCseCx');
      if (k) k.value = key;
      if (c) c.value = cx;
      window.GOOGLE_CSE = (connected && key && cx) ? { key: key.trim(), cx: cx.trim() } : null;
      setCseBadge(!!window.GOOGLE_CSE);
    } catch {}
  }
  function saveGoogleCse(connected) {
    const key = (($('googleCseKey') || {}).value || '').trim();
    const cx = (($('googleCseCx') || {}).value || '').trim();
    localStorage.setItem('ss_gkey', key);
    localStorage.setItem('ss_gcx', cx);
    if (connected === true) localStorage.setItem('ss_gok', '1');
    if (connected === false) localStorage.setItem('ss_gok', '0');
    const ok = localStorage.getItem('ss_gok') === '1' && key && cx;
    window.GOOGLE_CSE = ok ? { key, cx } : null;
    setCseBadge(!!window.GOOGLE_CSE);
  }
  async function connectGoogleCse() {
    const key = (($('googleCseKey') || {}).value || '').trim();
    const cx = (($('googleCseCx') || {}).value || '').trim();
    setCseStatus('در حال اتصال...', true);
    const btn = $('cseConnectBtn');
    if (btn) btn.disabled = true;
    try {
      if (!SearchEngines || !SearchEngines.testGoogleCSE) {
        setCseStatus('موتور جستجو بارگذاری نشده', false);
        return;
      }
      const res = await SearchEngines.testGoogleCSE(key, cx);
      if (res.ok) {
        saveGoogleCse(true);
        setCseStatus(res.message, true);
        setCseBadge(true, 'متصل');
      } else {
        saveGoogleCse(false);
        setCseStatus(res.message, false);
        setCseBadge(false, 'خطا');
      }
    } catch (e) {
      saveGoogleCse(false);
      setCseStatus(String(e.message || e), false);
    } finally {
      if (btn) btn.disabled = false;
    }
  }
  function disconnectGoogleCse() {
    localStorage.setItem('ss_gok', '0');
    window.GOOGLE_CSE = null;
    setCseBadge(false, 'خاموش');
    setCseStatus('قطع شد', true);
  }

  function applyTheme(name) {
    theme = name;
    document.documentElement.setAttribute('data-theme', name);
    localStorage.setItem(STORE.theme, name);
    document.querySelectorAll('.dot').forEach(b => b.classList.toggle('is-on', b.dataset.theme === name));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = THEME_COLOR[name] || '#000';
  }

  function applyLayout(name) {
    layout = (name === 'nova' || name === 'dense') ? name : 'shell';
    document.documentElement.setAttribute('data-layout', layout);
    localStorage.setItem(STORE.layout, layout);
    layoutShell.hidden = layout !== 'shell';
    layoutNova.hidden = layout !== 'nova';
    if (layoutDense) layoutDense.hidden = layout !== 'dense';
    document.querySelectorAll('.layout-pick').forEach(b => b.classList.toggle('is-on', b.dataset.layout === layout));
    document.body.style.overflow = layout === 'shell' ? 'hidden' : 'auto';
    applyI18n();
    if (lastQuery && currentResults.length) {
      showResultsView();
      render(currentResults);
    } else {
      showHomeView();
    }
  }

  function openSide() {
    sidebar.classList.add('is-open');
    sideBackdrop.hidden = false;
  }
  function closeSide() {
    sidebar.classList.remove('is-open');
    sideBackdrop.hidden = true;
  }

  function showHomeView() {
    if (layout === 'shell') {
      homePanel.hidden = false;
      resultsPanel.hidden = true;
      resultMeta.textContent = '';
      document.querySelectorAll('.side-link').forEach(l => {
        l.classList.toggle('is-active', l.dataset.go === 'home');
      });
      closeSide();
      qInput.focus();
    } else if (layout === 'nova') {
      nvStageHome.hidden = false;
      nvStageResults.hidden = true;
      nvMeta.textContent = '';
      nvInputHome.focus();
    } else {
      const home = $('dnHome');
      const wrap = $('dnResultsWrap');
      if (home) home.hidden = false;
      if (wrap) wrap.hidden = true;
      if ($('dnKpis')) $('dnKpis').hidden = true;
      if ($('dnLoading')) $('dnLoading').hidden = true;
      if ($('dnEmpty')) $('dnEmpty').hidden = true;
      if ($('dnError')) $('dnError').hidden = true;
      if ($('dnList')) $('dnList').innerHTML = '';
      if ($('dnLive')) $('dnLive').textContent = (I18N[lang] || I18N.fa).dnLive || 'Ready';
      if ($('dnInput')) $('dnInput').focus();
    }
  }

  function showResultsView() {
    if (layout === 'shell') {
      homePanel.hidden = true;
      resultsPanel.hidden = false;
    } else if (layout === 'nova') {
      nvStageHome.hidden = true;
      nvStageResults.hidden = false;
    } else {
      if ($('dnHome')) $('dnHome').hidden = true;
      if ($('dnResultsWrap')) $('dnResultsWrap').hidden = false;
      if ($('dnList')) $('dnList').hidden = false;
    }
  }

  function hideStates() {
    if (layout === 'shell') {
      loadingState.hidden = true;
      emptyState.hidden = true;
      errorState.hidden = true;
      resultsList.innerHTML = '';
    } else if (layout === 'nova') {
      nvLoading.hidden = true;
      nvEmpty.hidden = true;
      nvError.hidden = true;
      nvList.innerHTML = '';
    } else {
      $('dnLoading').hidden = true;
      $('dnEmpty').hidden = true;
      $('dnError').hidden = true;
      $('dnList').innerHTML = '';
    }
  }

  function kindOf(item) {
    if (item.kind) return item.kind;
    if (item.engine === 'stackoverflow' || item.engine === 'hackernews') return 'code';
    if (item.engine === 'arxiv' || item.engine === 'crossref' || item.engine === 'europepmc') return 'science';
    if (['wikipedia', 'wikidata', 'duckduckgo', 'openlibrary', 'dictionary'].includes(item.engine)) return 'wiki';
    return 'web';
  }

  function rankResults(list, query) {
    const q = (query || '').toLowerCase().trim();
    const qTokens = q.split(/\s+/).filter(Boolean);
    const tech = /program|code|api|python|js|react|bug|error|stack|dev|ساخت|برنامه|کد|خطا/i.test(query);
    const scored = list.map(item => {
      let s = 0;
      const title = (item.title || '').toLowerCase();
      const summary = (item.summary || '').toLowerCase();
      if (typeof SmartEngine !== 'undefined' && SmartEngine.fuzzyScore) s += SmartEngine.fuzzyScore(query, item.title) * 18;
      if (title === q) s += 12;
      else if (title.startsWith(q)) s += 8;
      else if (title.includes(q)) s += 6;
      if (qTokens.length > 1) s += (qTokens.filter(t => title.includes(t)).length / qTokens.length) * 5;
      s += WEIGHT[item.engine] || 1.2;
      if (tech && (item.engine === 'stackoverflow' || item.engine === 'hackernews')) s += 3.5;
      if (summary.includes(q)) s += 2;
      return { item, s };
    }).sort((a, b) => b.s - a.s);

    const seenHost = new Map(), out = [], defer = [];
    for (const row of scored) {
      let host = '';
      try { host = new URL(row.item.url).hostname.replace(/^www\./, ''); } catch {}
      const n = seenHost.get(host) || 0;
      if (n < 2) { out.push(row.item); seenHost.set(host, n + 1); }
      else defer.push(row.item);
    }
    return [...out, ...defer];
  }

  function filterBySource(list) {
    if (activeSource === 'all') return list;
    return list.filter(i => kindOf(i) === activeSource);
  }

  function render(list) {
    hideStates();
    const filtered = filterBySource(list).slice(0, resultLimit);
    const count = filtered.length ? String(filtered.length) : '';
    resultMeta.textContent = count;
    nvMeta.textContent = count;

    if (!filtered.length) {
      if (layout === 'shell') emptyState.hidden = false;
      else if (layout === 'nova') nvEmpty.hidden = false;
      else { $('dnEmpty').hidden = false; $('dnKpis').hidden = true; }
      return;
    }

    if (layout === 'shell') {
      resultsList.innerHTML = filtered.map((item, idx) => {
        const host = (item.url || '').replace(/^https?:\/\//, '').split('/')[0];
        return `<a class="row" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" style="animation-delay:${idx * 0.03}s">
          <div class="row-src"><i class="${item.sourceIcon || 'fa-solid fa-link'}"></i>${esc(item.source)}</div>
          <div class="row-body">
            <div class="row-title">${esc(item.title)}</div>
            <div class="row-url">${esc(host)}</div>
            <p class="row-snip">${esc(item.summary || '')}</p>
          </div>
        </a>`;
      }).join('');
    } else if (layout === 'nova') {
      nvList.innerHTML = filtered.map((item, idx) => {
        const host = (item.url || '').replace(/^https?:\/\//, '').split('/')[0];
        return `<a class="nv-item" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" style="animation-delay:${idx * 0.04}s">
          <div class="nv-item-idx">${idx + 1}</div>
          <div class="nv-item-body">
            <div class="nv-item-src"><i class="${item.sourceIcon || 'fa-solid fa-link'}"></i> ${esc(item.source)}</div>
            <div class="nv-item-title">${esc(item.title)}</div>
            <div class="nv-item-url">${esc(host)}</div>
            <p class="nv-item-snip">${esc(item.summary || '')}</p>
          </div>
        </a>`;
      }).join('');
    } else {
      // Dense grid + KPIs
      const all = list; // unfiltered for kpi
      const counts = { web: 0, wiki: 0, code: 0, science: 0 };
      all.forEach(it => { const k = kindOf(it); if (counts[k] != null) counts[k]++; });
      $('dnKpiTotal').textContent = String(all.length);
      $('dnKpiWeb').textContent = String(counts.web);
      $('dnKpiWiki').textContent = String(counts.wiki);
      $('dnKpiCode').textContent = String(counts.code);
      $('dnKpiScience').textContent = String(counts.science);
      $('dnKpiShown').textContent = String(filtered.length);
      $('dnKpis').hidden = false;
      $('dnLive').textContent = filtered.length ? String(filtered.length) : '0';
      $('dnList').hidden = false;
      $('dnList').innerHTML = filtered.map((item, idx) => {
        const host = (item.url || '').replace(/^https?:\/\//, '').split('/')[0];
        return `<a class="dn-card" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">
          <div class="dn-card-src"><i class="${item.sourceIcon || 'fa-solid fa-link'}"></i> ${esc(item.source)}</div>
          <div class="dn-card-title">${esc(item.title)}</div>
          <div class="dn-card-url">${esc(host)}</div>
          <p class="dn-card-snip">${esc(item.summary || '')}</p>
        </a>`;
      }).join('');
    }
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
      const keys = Object.keys(c);
      if (keys.length > 40) keys.slice(0, keys.length - 30).forEach(k => delete c[k]);
      localStorage.setItem(STORE.cache, JSON.stringify(c));
    } catch {}
  }

  async function performSearch(query) {
    query = (query || '').trim();
    if (!query) return;
    lastQuery = query;
    qInput.value = query;
    nvInputHome.value = query;
    nvInputResults.value = query;
    if ($('dnInput')) $('dnInput').value = query;
    if ($('dnInput2')) $('dnInput2').value = query;
    showResultsView();
    hideStates();
    if (layout === 'shell') loadingState.hidden = false;
    else if (layout === 'nova') nvLoading.hidden = false;
    else {
      if ($('dnHome')) $('dnHome').hidden = true;
      if ($('dnResultsWrap')) $('dnResultsWrap').hidden = false;
      if ($('dnLoading')) $('dnLoading').hidden = false;
      if ($('dnList')) { $('dnList').hidden = true; $('dnList').innerHTML = ''; }
      if ($('dnKpis')) $('dnKpis').hidden = true;
      if ($('dnLive')) $('dnLive').textContent = '...';
    }
    closeSide();

    document.querySelectorAll('.side-link').forEach(l => {
      if (l.dataset.go === 'home') l.classList.remove('is-active');
      else if (l.dataset.source) l.classList.toggle('is-active', l.dataset.source === activeSource);
    });

    const cached = getCache(query);
    if (cached) { currentResults = cached; render(cached); return; }

    try {
      const variants = (typeof SmartEngine !== 'undefined' && SmartEngine.combine) ? SmartEngine.combine(query) : [query];
      const raw = await SearchEngines.searchAll(query, { limit: Math.max(resultLimit, 8), variants });
      const seen = new Set();
      let all = raw.filter(item => {
        const key = normTitle(item.title);
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
      if (layout === 'shell') {
        errorState.hidden = false;
        errorMsg.textContent = I18N[lang].error;
      } else if (layout === 'nova') {
        nvError.hidden = false;
        nvErrorMsg.textContent = I18N[lang].error;
      } else {
        $('dnError').hidden = false;
        $('dnErrorMsg').textContent = I18N[lang].error;
      }
    }
  }

  function setSource(src) {
    activeSource = src;
    localStorage.setItem(STORE.source, src);
    $('sourceSelect').value = src;
    document.querySelectorAll('.side-link[data-source]').forEach(l => {
      l.classList.toggle('is-active', l.dataset.source === src);
    });
    document.querySelectorAll('.side-link[data-go]').forEach(l => l.classList.remove('is-active'));
    document.querySelectorAll('.nv-tab').forEach(c => {
      c.classList.toggle('is-on', c.dataset.source === src);
    });
    document.querySelectorAll('.dn-f[data-source]').forEach(c => {
      c.classList.toggle('is-on', c.dataset.source === src);
    });
    if (currentResults.length) {
      showResultsView();
      render(currentResults);
    }
    closeSide();
  }

  function bindModal(openBtn, overlay, closeBtn) {
    if (!openBtn) return;
    openBtn.addEventListener('click', () => { overlay.hidden = false; closeSide(); });
    closeBtn.addEventListener('click', () => { overlay.hidden = true; });
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.hidden = true; });
  }

  // Shell events
  $('searchForm').addEventListener('submit', e => { e.preventDefault(); performSearch(qInput.value); });
  $('retryBtn').addEventListener('click', () => lastQuery && performSearch(lastQuery));
  $('navHome').addEventListener('click', showHomeView);
  $('menuBtn').addEventListener('click', openSide);
  $('sideClose').addEventListener('click', closeSide);
  sideBackdrop.addEventListener('click', closeSide);
  document.querySelectorAll('.side-link[data-source]').forEach(btn => {
    btn.addEventListener('click', () => setSource(btn.dataset.source));
  });
  document.querySelectorAll('.tile[data-q]').forEach(tile => {
    tile.addEventListener('click', () => performSearch(tile.dataset.q));
  });

  // Nova events
  $('nvFormHome').addEventListener('submit', e => { e.preventDefault(); performSearch(nvInputHome.value); });
  $('nvFormResults').addEventListener('submit', e => { e.preventDefault(); performSearch(nvInputResults.value); });
  $('nvHome').addEventListener('click', showHomeView);
  $('nvRetry').addEventListener('click', () => lastQuery && performSearch(lastQuery));
  document.querySelectorAll('.nv-pill').forEach(b => {
    b.addEventListener('click', () => performSearch(b.dataset.q));
  });
  document.querySelectorAll('.nv-tab').forEach(chip => {
    chip.addEventListener('click', () => setSource(chip.dataset.source));
  });

  // Shared
  document.querySelectorAll('.dot[data-theme]').forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
  });

  // Dense events
  if ($('dnForm')) {
    $('dnForm').addEventListener('submit', e => { e.preventDefault(); performSearch($('dnInput').value); });
    if ($('dnForm2')) $('dnForm2').addEventListener('submit', e => { e.preventDefault(); performSearch(($('dnInput2') || $('dnInput')).value); });
    $('dnHome') && $('dnHome');
    $('dnRetry') && $('dnRetry').addEventListener('click', () => lastQuery && performSearch(lastQuery));
    document.querySelectorAll('.dn-q[data-q], .dn-pill[data-q], .dn-cat[data-q], .dn-home-card[data-q], .dn-hero-actions [data-q]').forEach(b => b.addEventListener('click', () => performSearch(b.dataset.q)));
    document.querySelectorAll('.dn-f[data-source]').forEach(b => b.addEventListener('click', () => setSource(b.dataset.source)));
    const dnHomeBtn = $('dnHome');
    if (dnHomeBtn) dnHomeBtn.addEventListener('click', showHomeView);
    bindModal($('dnSettings'), $('settingsOverlay'), $('closeSettings'));
    bindModal($('dnAbout'), $('aboutOverlay'), $('closeAbout'));
  }

  document.querySelectorAll('.layout-pick').forEach(btn => {
    btn.addEventListener('click', () => applyLayout(btn.dataset.layout));
  });
  bindModal($('settingsBtn'), $('settingsOverlay'), $('closeSettings'));
  bindModal($('aboutBtn'), $('aboutOverlay'), $('closeAbout'));
  bindModal($('nvSettings'), $('settingsOverlay'), $('closeSettings'));
  bindModal($('nvAbout'), $('aboutOverlay'), $('closeAbout'));

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
  $('sourceSelect').addEventListener('change', e => setSource(e.target.value));

  window.addEventListener('DOMContentLoaded', () => {
    loadGoogleCse();
    const cseBtn = $('cseConnectBtn');
    const cseOff = $('cseDisconnectBtn');
    if (cseBtn) cseBtn.addEventListener('click', connectGoogleCse);
    if (cseOff) cseOff.addEventListener('click', disconnectGoogleCse);
    applyTheme(theme);
    applyLayout(layout);
    $('langSelect').value = lang;
    $('limitSelect').value = String(resultLimit);
    $('sourceSelect').value = activeSource;
    applyI18n();
    showHomeView();
    if (typeof SmartEngine !== 'undefined') {
      SmartEngine.load().then(() => {
        const st = SmartEngine.getStatus();
        console.log('[v17]', st.ready, st.count, 'layout', layout);
      });
    }
  });
})();
