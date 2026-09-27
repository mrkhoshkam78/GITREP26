/**
 * Search Engines Module v5.0
 * Clean wrappers for multiple free public APIs
 * Engines: Wikipedia (FA/EN), DuckDuckGo, Open Library, Wikidata, Hacker News
 */

const SearchEngines = (() => {
  'use strict';

  const DEFAULT_TIMEOUT = 7000;

  async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  function stripHtml(html) {
    const d = document.createElement('div');
    d.innerHTML = html || '';
    let t = (d.textContent || '').replace(/\s+/g, ' ').trim();
    return t;
  }

  function smartSummary(text, max = 160) {
    text = stripHtml(text);
    if (!text) return 'توضیحی در دسترس نیست';
    if (text.length <= max) return text;
    // cut at last space before max
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut) + '…';
  }

  // ---------- Wikipedia ----------
  async function wikipedia(query, lang = 'fa', limit = 5) {
    try {
      const base = lang === 'fa' ? 'https://fa.wikipedia.org' : 'https://en.wikipedia.org';
      const url = `${base}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=${Math.min(limit, 10)}&srprop=snippet`;
      const data = await fetchWithTimeout(url);
      if (!data.query?.search) return [];
      const source = lang === 'fa' ? 'ویکی‌پدیا فارسی' : 'ویکی‌پدیا انگلیسی';
      const color = lang === 'fa'
        ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
      return data.query.search.map(item => ({
        title: item.title,
        summary: smartSummary(item.snippet),
        url: `${base}/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
        source,
        sourceIcon: 'fa-brands fa-wikipedia-w',
        color,
        engine: 'wikipedia'
      }));
    } catch (e) {
      console.warn('Wikipedia error', lang, e.message);
      return [];
    }
  }

  // ---------- DuckDuckGo Instant Answer ----------
  async function duckduckgo(query) {
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&pretty=1&no_html=1&skip_disambig=1`;
      const data = await fetchWithTimeout(url);
      const results = [];
      if (data.AbstractText) {
        results.push({
          title: data.Heading || query,
          summary: data.AbstractText,
          url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          source: 'دانشنامه',
          sourceIcon: 'fa-solid fa-book',
          color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
          engine: 'duckduckgo'
        });
      }
      (data.RelatedTopics || []).slice(0, 4).forEach(topic => {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || 'موضوع مرتبط',
            summary: topic.Text,
            url: topic.FirstURL,
            source: 'وب',
            sourceIcon: 'fa-solid fa-globe',
            color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
            engine: 'duckduckgo'
          });
        } else if (topic.Topics) {
          topic.Topics.slice(0, 1).forEach(sub => {
            if (sub.Text && sub.FirstURL) {
              results.push({
                title: sub.Text.split(' - ')[0] || 'موضوع مرتبط',
                summary: sub.Text,
                url: sub.FirstURL,
                source: 'وب',
                sourceIcon: 'fa-solid fa-globe',
                color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
                engine: 'duckduckgo'
              });
            }
          });
        }
      });
      return results;
    } catch (e) {
      console.warn('DuckDuckGo error', e.message);
      return [];
    }
  }

  // ---------- NEW 1: Open Library ----------
  async function openLibrary(query, limit = 4) {
    try {
      const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}`;
      const data = await fetchWithTimeout(url);
      if (!data.docs) return [];
      return data.docs.slice(0, limit).map(doc => ({
        title: doc.title || 'کتاب',
        summary: [doc.author_name?.join(', '), doc.first_publish_year, doc.subject?.slice(0, 3).join(', ')].filter(Boolean).join(' · ') || 'منبع کتابخانه باز',
        url: doc.key ? `https://openlibrary.org${doc.key}` : `https://openlibrary.org/search?q=${encodeURIComponent(query)}`,
        source: 'کتابخانه باز',
        sourceIcon: 'fa-solid fa-book-open',
        color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
        engine: 'openlibrary'
      }));
    } catch (e) {
      console.warn('OpenLibrary error', e.message);
      return [];
    }
  }

  // ---------- NEW 2: Wikidata ----------
  async function wikidata(query, limit = 4) {
    try {
      const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=fa&uselang=fa&format=json&origin=*&limit=${limit}`;
      const data = await fetchWithTimeout(url);
      if (!data.search) return [];
      return data.search.map(item => ({
        title: item.label || item.id,
        summary: item.description || 'موجودیت ویکی‌داده',
        url: `https://www.wikidata.org/wiki/${item.id}`,
        source: 'ویکی‌داده',
        sourceIcon: 'fa-solid fa-database',
        color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
        engine: 'wikidata'
      }));
    } catch (e) {
      console.warn('Wikidata error', e.message);
      return [];
    }
  }

  // ---------- NEW 3: Hacker News (Algolia) ----------
  async function hackerNews(query, limit = 4) {
    try {
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=${limit}&tags=story`;
      const data = await fetchWithTimeout(url);
      if (!data.hits) return [];
      return data.hits.map(hit => ({
        title: hit.title || 'بحث',
        summary: `امتیاز ${hit.points || 0} · ${hit.num_comments || 0} نظر · ${hit.author || ''}`,
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        source: 'هکر نیوز',
        sourceIcon: 'fa-brands fa-hacker-news',
        color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
        engine: 'hackernews'
      }));
    } catch (e) {
      console.warn('HackerNews error', e.message);
      return [];
    }
  }

  // ---------- Orchestrated multi-search ----------
  async function searchAll(query, options = {}) {
    const {
      limit = 5,
      variants = [query]
    } = options;

    const tasks = [
      wikipedia(query, 'fa', Math.ceil(limit * 0.4)),
      wikipedia(query, 'en', Math.ceil(limit * 0.25)),
      duckduckgo(query),
      openLibrary(query, 3),
      wikidata(query, 3),
      hackerNews(query, 3)
    ];

    // Extra variant searches (limited)
    variants.slice(1, 3).forEach(v => {
      if (v && v !== query) {
        tasks.push(wikipedia(v, 'en', 2));
      }
    });

    const settled = await Promise.allSettled(tasks);
    const all = [];
    settled.forEach(s => {
      if (s.status === 'fulfilled' && Array.isArray(s.value)) {
        all.push(...s.value);
      }
    });
    return all;
  }

  return {
    wikipedia,
    duckduckgo,
    openLibrary,
    wikidata,
    hackerNews,
    searchAll
  };
})();
