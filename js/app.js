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
const toggleKeywords = $('toggleKeywords');
const kwSection = $('kwSection');
const kwArrow = $('kwArrow');
const keywordsContainer = $('keywordsContainer');
const kwCount = $('kwCount');

let currentResults = [];
let activeFilter = 'all';
let resultLimit = 5;
let lastQuery = '';
let EXPANSIONS = {};

const CACHE_TTL = 8 * 60 * 1000;
const HISTORY_KEY = 'ss_history_v32';
const THEME_KEY = 'ss_theme_v32';
const CACHE_KEY = 'ss_cache_v32';
const LIMIT_KEY = 'ss_limit_v32';

// ===================== Load Keywords =====================
async function loadKeywords() {
  try {
    const res = await fetch('data/keywords.json');
    if (!res.ok) throw new Error('Failed to load keywords');
    const data = await res.json();

    EXPANSIONS = data.expansions || {};

    let total = 0;
    keywordsContainer.innerHTML = '';

    data.groups.forEach(group => {
      total += group.keywords.length;
      const colorClass = `kw-${group.color}`;
      const div = document.createElement('div');
      div.innerHTML = `
        <p class="text-xs text-gray-400 dark:text-indigo-400 mb-1.5 font-medium">${escapeHtml(group.title)}</p>
        <div class="flex flex-wrap gap-1.5">
          ${group.keywords.map(kw => `
            <span class="kw-chip px-2.5 py-1 rounded-lg border text-sm ${colorClass}">${escapeHtml(kw)}</span>
          `).join('')}
        </div>
      `;
      keywordsContainer.appendChild(div);
    });

    kwCount.textContent = `(${total} کلیدواژه)`;

    document.querySelectorAll('.kw-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        searchInput.value = chip.textContent.trim();
        performSearch();
      });
    });
  } catch (err) {
    console.error('Keywords load error:', err);
    keywordsContainer.innerHTML = `
      <div class="col-span-full text-center text-amber-600 dark:text-amber-400 py-4 text-sm">
        <i class="fas fa-exclamation-circle ml-1"></i>
        خطا در بارگذاری کلیدواژه‌ها. فایل <code>data/keywords.json</code> را بررسی کنید.
      </div>`;
  }
}

// ===================== Query Intelligence =====================
function expandQuery(query) {
  const q = query.trim().toLowerCase();
  const extras = [];
  for (const [key, vals] of Object.entries(EXPANSIONS)) {
    if (q.includes(key.toLowerCase()) || key.toLowerCase().includes(q)) {
      extras.push(...vals);
    }
  }
  extras.push(query);
  return [...new Set(extras)].slice(0, 4);
}

function normalizeTitle(t) {
  return (t || '').toLowerCase().replace(/[\s\-_]+/g, ' ').trim();
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

// ===================== Keywords Toggle =====================
toggleKeywords.addEventListener('click', () => {
  kwSection.classList.toggle('open');
  kwArrow.classList.toggle('rotate-180');
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
      keys.sort((a,b) => c[a].time - c[b].time).slice(0, keys.length-25).forEach(k => delete c[k]);
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
    const variants = expandQuery(query);
    const tasks = [
      searchWikipedia(query, 'fa', Math.ceil(resultLimit * 0.6)),
      searchWikipedia(query, 'en', Math.ceil(resultLimit * 0.4)),
      searchDuckDuckGo(query)
    ];
    if (variants.length > 1) {
      tasks.push(searchWikipedia(variants[1], 'en', 3));
    }

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
      const qa = normalizeTitle(query);
      const score = (item) => {
        let s = 0;
        const t = normalizeTitle(item.title);
        if (t === qa) s += 10;
        if (t.includes(qa) || qa.includes(t)) s += 5;
        if (item.source.includes('فارسی')) s += 3;
        if (item.source === 'دانشنامه') s += 2;
        return s;
      };
      return score(b) - score(a);
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
  if (window.innerWidth >= 768) {
    kwSection.classList.add('open');
    kwArrow.classList.add('rotate-180');
  }
  await loadKeywords();
  searchInput.focus();
});
