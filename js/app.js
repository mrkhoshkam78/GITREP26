// ===================== State =====================
const $ = id => document.getElementById(id);
const searchInput = $('searchInput');
const searchBtn = $('searchBtn');
const resultsEl = $('results');
const resultsContainer = $('resultsContainer');
const loadingState = $('loadingState');
const emptyState = $('emptyState');
const errorState = $('errorState');
const resultCount = $('resultCount');
const clearInput = $('clearInput');
const clearResults = $('clearResults');
const historySection = $('historySection');
const historyList = $('historyList');
const googleLink = $('googleLink');
const themeToggle = $('themeToggle');
const themeIcon = $('themeIcon');
const retryBtn = $('retryBtn');

let currentResults = [];
let activeFilter = 'all';
let resultLimit = 5;
let lastQuery = '';
let KEYWORDS_DATA = null;
let ALL_KEYWORDS = [];
let EXPANSIONS = {};

const CACHE_TTL = 8 * 60 * 1000;
const HISTORY_KEY = 'ss_history_v40';
const THEME_KEY = 'ss_theme_v40';
const CACHE_KEY = 'ss_cache_v40';
const LIMIT_KEY = 'ss_limit_v40';
const KW_CACHE_KEY = 'ss_keywords_cache_v40';

// ===================== Fuzzy Search Algorithm =====================
function levenshtein(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function fuzzyScore(query, candidate) {
  if (!query || !candidate) return 0;
  const q = query.toLowerCase().trim();
  const c = candidate.toLowerCase().trim();
  if (q === c) return 1;
  if (c.includes(q) || q.includes(c)) return 0.85;

  const maxLen = Math.max(q.length, c.length);
  if (maxLen === 0) return 0;
  const dist = levenshtein(q, c);
  let score = 1 - dist / maxLen;

  const qTokens = q.split(/\s+/);
  const cTokens = c.split(/\s+/);
  let overlap = 0;
  qTokens.forEach(t => {
    if (cTokens.some(ct => ct.includes(t) || t.includes(ct))) overlap++;
  });
  score += (overlap / Math.max(qTokens.length, 1)) * 0.15;

  return Math.min(1, Math.max(0, score));
}

function fuzzyMatchKeywords(query, limit = 8) {
  if (!ALL_KEYWORDS.length || !query.trim()) return [];
  return ALL_KEYWORDS
    .map(kw => ({ keyword: kw, score: fuzzyScore(query, kw) }))
    .filter(x => x.score >= 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ===================== Smart Keyword Combination Engine =====================
function smartCombine(query) {
  const variants = new Set();
  variants.add(query.trim());

  const qLower = query.toLowerCase();
  for (const [key, vals] of Object.entries(EXPANSIONS)) {
    if (qLower.includes(key.toLowerCase()) || key.toLowerCase().includes(qLower)) {
      vals.forEach(v => variants.add(v));
    }
  }

  const fuzzyHits = fuzzyMatchKeywords(query, 6);
  fuzzyHits.forEach(h => {
    variants.add(h.keyword);
    if (EXPANSIONS[h.keyword]) {
      EXPANSIONS[h.keyword].slice(0, 2).forEach(v => variants.add(v));
    }
  });

  if (KEYWORDS_DATA && KEYWORDS_DATA.groups) {
    const relatedGroups = new Set();
    fuzzyHits.forEach(h => {
      KEYWORDS_DATA.groups.forEach(g => {
        if (g.keywords.includes(h.keyword)) relatedGroups.add(g.id);
      });
    });
    relatedGroups.forEach(gid => {
      const g = KEYWORDS_DATA.groups.find(x => x.id === gid);
      if (g) {
        const extras = g.keywords.filter(k => fuzzyScore(query, k) > 0.3).slice(0, 2);
        extras.forEach(e => variants.add(e));
        if (extras.length) {
          variants.add(`${query} ${extras[0].split(' ').pop()}`);
        }
      }
    });
  }

  return [...variants].slice(0, 7);
}

// ===================== Improved JSON Loading =====================
async function loadKeywordsWithRetry(maxRetries = 3) {
  try {
    const cached = localStorage.getItem(KW_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.version && parsed.groups) {
        KEYWORDS_DATA = parsed;
        EXPANSIONS = parsed.expansions || {};
        ALL_KEYWORDS = parsed.groups.flatMap(g => g.keywords);
        console.log('[Keywords] Loaded from cache:', ALL_KEYWORDS.length);
        return true;
      }
    }
  } catch (e) {}

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('data/keywords.json', { signal: controller.signal, cache: 'default' });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.groups || !Array.isArray(data.groups)) throw new Error('Invalid keywords format');

      KEYWORDS_DATA = data;
      EXPANSIONS = data.expansions || {};
      ALL_KEYWORDS = data.groups.flatMap(g => g.keywords);

      try { localStorage.setItem(KW_CACHE_KEY, JSON.stringify(data)); } catch (e) {}
      console.log('[Keywords] Loaded from network:', ALL_KEYWORDS.length, 'keywords');
      return true;
    } catch (err) {
      console.warn(`[Keywords] Attempt ${attempt} failed:`, err.message);
      if (attempt === maxRetries) {
        console.error('[Keywords] All retries failed. Continuing without smart expansion.');
        KEYWORDS_DATA = null;
        ALL_KEYWORDS = [];
        EXPANSIONS = {};
        return false;
      }
      await new Promise(r => setTimeout(r, 400 * attempt));
    }
  }
  return false;
}

// ===================== Theme =====================
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
    themeIcon.className = 'fas fa-sun text-yellow-300 text-lg';
  }
}
themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.classList.toggle('dark');
  document.body.classList.toggle('dark');
  themeIcon.className = isDark ? 'fas fa-sun text-yellow-300 text-lg' : 'fas fa-moon text-purple-600 text-lg';
  localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
});

// ===================== Limit & Filter =====================
document.querySelectorAll('.limit-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.limit-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    resultLimit = parseInt(btn.dataset.limit, 10);
    localStorage.setItem(LIMIT_KEY, resultLimit);
    if (currentResults.length) displayResults(currentResults);
  });
});
document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.source;
    if (currentResults.length) displayResults(currentResults);
  });
});

// ===================== History & Cache =====================
function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveToHistory(q) {
  let h = getHistory().filter(x => x !== q);
  h.unshift(q);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 10)));
  renderHistory();
}
function renderHistory() {
  const h = getHistory();
  if (!h.length) { historySection.classList.add('hidden'); return; }
  historySection.classList.remove('hidden');
  historyList.innerHTML = h.map(q => `<button class="history-item text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-indigo-900/40 text-gray-700 dark:text-indigo-200 border border-gray-200 dark:border-indigo-800">${escapeHtml(q)}</button>`).join('');
  historyList.querySelectorAll('button').forEach((btn, i) => {
    btn.addEventListener('click', () => { searchInput.value = h[i]; performSearch(); });
  });
}
$('clearHistory').addEventListener('click', () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

function getCached(q) {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const e = c[q];
    if (e && Date.now() - e.time < CACHE_TTL) return e.data;
  } catch {}
  return null;
}
function setCache(q, data) {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const keys = Object.keys(c);
    if (keys.length > 25) {
      keys.sort((a, b) => c[a].time - c[b].time).slice(0, keys.length - 25).forEach(k => delete c[k]);
    }
    c[q] = { data, time: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {}
}

// ===================== Core Search =====================
searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') performSearch(); });
searchInput.addEventListener('input', () => clearInput.classList.toggle('hidden', !searchInput.value.trim()));
clearInput.addEventListener('click', () => { searchInput.value = ''; clearInput.classList.add('hidden'); searchInput.focus(); });
searchBtn.addEventListener('click', performSearch);
clearResults.addEventListener('click', () => { currentResults = []; hideAll(); emptyState.classList.remove('hidden'); });
retryBtn.addEventListener('click', () => { if (lastQuery) performSearch(); });

async function performSearch() {
  const query = searchInput.value.trim();
  if (!query) { showError('لطفاً یک عبارت وارد کنید'); return; }
  lastQuery = query;
  showLoading();
  saveToHistory(query);
  googleLink.href = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=fa`;

  const cached = getCached(query);
  if (cached) {
    currentResults = cached;
    displayResults(cached);
    return;
  }

  try {
    const variants = smartCombine(query);
    console.log('[SmartEngine] Variants:', variants);

    const tasks = [
      searchWikipedia(query, 'fa', Math.ceil(resultLimit * 0.55)),
      searchWikipedia(query, 'en', Math.ceil(resultLimit * 0.35)),
      searchDuckDuckGo(query)
    ];
    variants.slice(1, 3).forEach(v => {
      if (v !== query) tasks.push(searchWikipedia(v, 'en', 2));
    });

    const settled = await Promise.allSettled(tasks);
    let all = [];
    settled.forEach(s => {
      if (s.status === 'fulfilled' && Array.isArray(s.value)) all.push(...s.value);
    });

    const seen = new Set();
    all = all.filter(item => {
      const key = normalizeTitle(item.title);
      if (seen.has(key) || !item.title) return false;
      seen.add(key);
      return true;
    });

    all.sort((a, b) => {
      const scoreA = fuzzyScore(query, a.title) * 8 + (a.source.includes('فارسی') ? 2 : 0) + (a.source === 'دانشنامه' ? 1.5 : 0);
      const scoreB = fuzzyScore(query, b.title) * 8 + (b.source.includes('فارسی') ? 2 : 0) + (b.source === 'دانشنامه' ? 1.5 : 0);
      return scoreB - scoreA;
    });

    if (all.length === 0) {
      showError('نتیجه‌ای یافت نشد. عبارت دیگری را امتحان کنید یا از گوگل استفاده کنید.');
      return;
    }

    currentResults = all;
    setCache(query, all);
    displayResults(all);
  } catch (err) {
    console.error(err);
    showError('خطا در دریافت اطلاعات. اتصال اینترنت را بررسی کنید.');
  }
}

function normalizeTitle(t) {
  return (t || '').toLowerCase().replace(/[\s\-_]+/g, ' ').trim();
}

async function searchWikipedia(query, lang = 'fa', limit = 6) {
  try {
    const base = lang === 'fa' ? 'https://fa.wikipedia.org' : 'https://en.wikipedia.org';
    const url = `${base}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=${Math.min(limit, 10)}&srprop=snippet`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.query?.search) return [];
    const sourceName = lang === 'fa' ? 'ویکی‌پدیا فارسی' : 'ویکی‌پدیا انگلیسی';
    const color = lang === 'fa'
      ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    return data.query.search.map(item => ({
      title: item.title,
      summary: stripHtml(item.snippet) + '...',
      url: `${base}/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
      source: sourceName,
      sourceIcon: 'fa-brands fa-wikipedia-w',
      color
    }));
  } catch (e) {
    console.error('Wiki error', lang, e);
    return [];
  }
}

async function searchDuckDuckGo(query) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&pretty=1&no_html=1&skip_disambig=1`;
    const res = await fetch(url);
    const data = await res.json();
    const results = [];
    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        summary: data.AbstractText,
        url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        source: 'دانشنامه',
        sourceIcon: 'fa-solid fa-book',
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
      });
    }
    if (data.RelatedTopics?.length) {
      data.RelatedTopics.slice(0, 5).forEach(topic => {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || 'موضوع مرتبط',
            summary: topic.Text,
            url: topic.FirstURL,
            source: 'وب',
            sourceIcon: 'fa-solid fa-globe',
            color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
          });
        } else if (topic.Topics) {
          topic.Topics.slice(0, 2).forEach(sub => {
            if (sub.Text && sub.FirstURL) {
              results.push({
                title: sub.Text.split(' - ')[0] || 'موضوع مرتبط',
                summary: sub.Text,
                url: sub.FirstURL,
                source: 'وب',
                sourceIcon: 'fa-solid fa-globe',
                color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
              });
            }
          });
        }
      });
    }
    return results;
  } catch (e) {
    console.error('DDG error', e);
    return [];
  }
}

function displayResults(data) {
  hideAll();
  resultsContainer.classList.remove('hidden');
  resultsEl.innerHTML = '';
  let filtered = activeFilter === 'all' ? data : data.filter(r => r.source === activeFilter);
  filtered = filtered.slice(0, resultLimit);
  resultCount.textContent = `${filtered.length} نتیجه`;
  if (!filtered.length) {
    resultsEl.innerHTML = `<div class="col-span-full glass rounded-xl p-8 text-center"><p class="text-gray-600 dark:text-indigo-300">با این فیلتر یا تعداد نتیجه‌ای یافت نشد</p></div>`;
    return;
  }
  filtered.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'glass rounded-xl shadow-lg p-5 card-hover fade-in';
    card.style.animationDelay = `${i * 0.06}s`;
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
        setTimeout(() => icon.className = 'fas fa-link', 1400);
      });
    });
    resultsEl.appendChild(card);
  });
}

function showLoading() { hideAll(); loadingState.classList.remove('hidden'); }
function showError(msg) { hideAll(); errorState.classList.remove('hidden'); $('errorMessage').textContent = msg; }
function hideAll() {
  loadingState.classList.add('hidden');
  resultsContainer.classList.add('hidden');
  emptyState.classList.add('hidden');
  errorState.classList.add('hidden');
}
function stripHtml(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent || '';
}
function escapeHtml(t) {
  const d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}

// ===================== Init =====================
window.addEventListener('load', async () => {
  initTheme();
  renderHistory();
  const savedLimit = localStorage.getItem(LIMIT_KEY);
  if (savedLimit) {
    resultLimit = parseInt(savedLimit, 10);
    document.querySelectorAll('.limit-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.limit === savedLimit);
    });
  }
  // Load keywords in background – does not block UI
  loadKeywordsWithRetry().then(ok => {
    if (ok) console.log('[Init] Smart engine ready with', ALL_KEYWORDS.length, 'keywords');
  });
  searchInput.focus();
});
