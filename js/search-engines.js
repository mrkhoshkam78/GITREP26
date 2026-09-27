/**
 * Search Engines v7 — 50 source endpoints (parallel, timeout-safe)
 */
const SearchEngines = (() => {
  'use strict';

  const T = 5500;
  const SE_SITES = [
    'stackoverflow', 'superuser', 'askubuntu', 'serverfault', 'softwareengineering',
    'codereview', 'unix', 'apple', 'android', 'webapps', 'dba', 'security',
    'math', 'physics', 'chemistry', 'biology', 'stats', 'cs', 'datascience',
    'ai', 'crypto', 'gamedev', 'webmasters', 'sqa', 'reverseengineering',
    'electronics', 'raspberrypi', 'networkengineering', 'devops', 'cloud',
    'ux', 'graphicdesign', 'productivity', 'opensource', 'softwarerecs'
  ];
  const WIKI_LANGS = ['fa', 'en', 'ar', 'de', 'fr', 'es', 'ru', 'zh', 'ja', 'tr', 'it', 'pt', 'nl', 'ko', 'hi'];

  async function getJSON(url, opt = {}) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), opt.timeout || T);
    try {
      const r = await fetch(url, { ...opt, signal: c.signal });
      clearTimeout(t);
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } catch (e) {
      clearTimeout(t);
      return null;
    }
  }

  function strip(h) {
    const d = document.createElement('div');
    d.innerHTML = h || '';
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function snip(t, n = 160) {
    t = strip(t);
    if (!t) return '';
    if (t.length <= n) return t;
    const c = t.slice(0, n);
    const i = c.lastIndexOf(' ');
    return (i > 40 ? c.slice(0, i) : c) + '…';
  }
  function item(o) {
    return {
      title: o.title || '',
      summary: o.summary || '',
      url: o.url || '',
      source: o.source || '',
      sourceIcon: o.icon || 'fa-solid fa-link',
      engine: o.engine || 'web',
      kind: o.kind || 'web'
    };
  }

  async function wikipedia(q, lang, limit = 4) {
    const base = `https://${lang}.wikipedia.org`;
    const data = await getJSON(
      `${base}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&origin=*&srlimit=${limit}&srprop=snippet`
    );
    if (!data?.query?.search) return [];
    const labels = {
      fa: 'ویکی‌پدیا فارسی', en: 'Wikipedia EN', ar: 'ويكيبيديا', de: 'Wikipedia DE',
      fr: 'Wikipédia FR', es: 'Wikipedia ES', ru: 'Википедия', zh: '维基百科',
      ja: 'ウィキペディア', tr: 'Vikipedi'
    };
    return data.query.search.map(x => item({
      title: x.title,
      summary: snip(x.snippet),
      url: `${base}/wiki/${encodeURIComponent(x.title.replace(/ /g, '_'))}`,
      source: labels[lang] || `Wikipedia ${lang}`,
      icon: 'fa-brands fa-wikipedia-w',
      engine: 'wikipedia',
      kind: 'wiki'
    }));
  }

  async function duckduckgo(q) {
    const data = await getJSON(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`
    );
    if (!data) return [];
    const out = [];
    if (data.AbstractText) {
      out.push(item({
        title: data.Heading || q,
        summary: data.AbstractText,
        url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
        source: 'دانشنامه DDG',
        icon: 'fa-solid fa-book',
        engine: 'duckduckgo',
        kind: 'wiki'
      }));
    }
    (data.RelatedTopics || []).slice(0, 4).forEach(t => {
      if (t.Text && t.FirstURL) {
        out.push(item({
          title: t.Text.split(' - ')[0],
          summary: t.Text,
          url: t.FirstURL,
          source: 'وب DDG',
          icon: 'fa-solid fa-globe',
          engine: 'duckduckgo',
          kind: 'web'
        }));
      } else if (t.Topics) {
        t.Topics.slice(0, 1).forEach(s => {
          if (s.Text && s.FirstURL) {
            out.push(item({
              title: s.Text.split(' - ')[0],
              summary: s.Text,
              url: s.FirstURL,
              source: 'وب DDG',
              icon: 'fa-solid fa-globe',
              engine: 'duckduckgo',
              kind: 'web'
            }));
          }
        });
      }
    });
    return out;
  }

  async function openLibrary(q, limit = 3) {
    const data = await getJSON(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${limit}`);
    if (!data?.docs) return [];
    return data.docs.slice(0, limit).map(d => item({
      title: d.title || 'کتاب',
      summary: [d.author_name?.join(', '), d.first_publish_year].filter(Boolean).join(' · '),
      url: d.key ? `https://openlibrary.org${d.key}` : `https://openlibrary.org/search?q=${encodeURIComponent(q)}`,
      source: 'Open Library',
      icon: 'fa-solid fa-book-open',
      engine: 'openlibrary',
      kind: 'wiki'
    }));
  }

  async function wikidata(q, limit = 3) {
    const data = await getJSON(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(q)}&language=fa&uselang=fa&format=json&origin=*&limit=${limit}`
    );
    if (!data?.search) return [];
    return data.search.map(x => item({
      title: x.label || x.id,
      summary: x.description || '',
      url: `https://www.wikidata.org/wiki/${x.id}`,
      source: 'Wikidata',
      icon: 'fa-solid fa-database',
      engine: 'wikidata',
      kind: 'wiki'
    }));
  }

  async function hackerNews(q, limit = 3) {
    const data = await getJSON(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&hitsPerPage=${limit}&tags=story`
    );
    if (!data?.hits) return [];
    return data.hits.map(h => item({
      title: h.title || 'بحث',
      summary: `${h.points || 0} pts · ${h.num_comments || 0} comments`,
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      source: 'Hacker News',
      icon: 'fa-brands fa-hacker-news',
      engine: 'hackernews',
      kind: 'web'
    }));
  }

  async function stackSite(site, q, limit = 2) {
    const data = await getJSON(
      `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(q)}&site=${site}&pagesize=${limit}&filter=default`
    );
    if (!data?.items) return [];
    const names = {
      stackoverflow: 'Stack Overflow', superuser: 'Super User', askubuntu: 'Ask Ubuntu',
      serverfault: 'Server Fault', softwareengineering: 'Software Eng',
      codereview: 'Code Review', unix: 'Unix/Linux', apple: 'Ask Different',
      android: 'Android Enthusiasts', webapps: 'Web Apps', dba: 'Database Admins',
      security: 'Information Security', math: 'Mathematics', physics: 'Physics',
      chemistry: 'Chemistry', biology: 'Biology', stats: 'Cross Validated',
      cs: 'Computer Science', datascience: 'Data Science', ai: 'Artificial Intelligence',
      crypto: 'Cryptography', gamedev: 'Game Dev', webmasters: 'Webmasters',
      sqa: 'Software QA', reverseengineering: 'Reverse Engineering'
    };
    return data.items.map(x => item({
      title: x.title || '',
      summary: `${x.score || 0} score · ${x.answer_count || 0} answers · ${(x.tags || []).slice(0, 3).join(', ')}`,
      url: x.link,
      source: names[site] || site,
      icon: 'fa-brands fa-stack-overflow',
      engine: 'stackoverflow',
      kind: 'code'
    }));
  }

  async function reddit(q, limit = 3) {
    const data = await getJSON(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&limit=${limit}&sort=relevance&t=year`,
      { headers: { Accept: 'application/json' } }
    );
    const ch = data?.data?.children || [];
    return ch.filter(c => c?.data?.title).map(c => {
      const d = c.data;
      return item({
        title: d.title,
        summary: `r/${d.subreddit} · ${d.score || 0} · ${d.num_comments || 0} comments`,
        url: d.url?.startsWith('http') ? d.url : `https://www.reddit.com${d.permalink || ''}`,
        source: 'Reddit',
        icon: 'fa-brands fa-reddit',
        engine: 'reddit',
        kind: 'web'
      });
    });
  }

  async function arxiv(q, limit = 3) {
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), T);
      const r = await fetch(
        `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&start=0&max_results=${limit}`,
        { signal: c.signal }
      );
      clearTimeout(t);
      if (!r.ok) return [];
      const xml = await r.text();
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
      return [...doc.querySelectorAll('entry')].map(e => {
        const title = (e.querySelector('title')?.textContent || '').replace(/\s+/g, ' ').trim();
        const summary = (e.querySelector('summary')?.textContent || '').replace(/\s+/g, ' ').trim();
        const id = e.querySelector('id')?.textContent || '';
        return item({
          title,
          summary: snip(summary),
          url: id,
          source: 'arXiv',
          icon: 'fa-solid fa-atom',
          engine: 'arxiv',
          kind: 'science'
        });
      });
    } catch {
      return [];
    }
  }

  async function crossref(q, limit = 3) {
    const data = await getJSON(
      `https://api.crossref.org/works?query=${encodeURIComponent(q)}&rows=${limit}`
    );
    const items = data?.message?.items || [];
    return items.map(x => item({
      title: (x.title && x.title[0]) || 'Paper',
      summary: [x.publisher, x.issued?.['date-parts']?.[0]?.[0]].filter(Boolean).join(' · '),
      url: x.URL || `https://doi.org/${x.DOI}`,
      source: 'Crossref',
      icon: 'fa-solid fa-file-lines',
      engine: 'crossref',
      kind: 'science'
    }));
  }

  async function archiveOrg(q, limit = 3) {
    const data = await getJSON(
      `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier,title,description&rows=${limit}&page=1&output=json`
    );
    const docs = data?.response?.docs || [];
    return docs.map(d => item({
      title: d.title || d.identifier,
      summary: snip(Array.isArray(d.description) ? d.description[0] : (d.description || '')),
      url: `https://archive.org/details/${d.identifier}`,
      source: 'Internet Archive',
      icon: 'fa-solid fa-landmark',
      engine: 'archive',
      kind: 'wiki'
    }));
  }

  async function gutendex(q, limit = 2) {
    const data = await getJSON(`https://gutendex.com/books?search=${encodeURIComponent(q)}`);
    const results = (data?.results || []).slice(0, limit);
    return results.map(b => item({
      title: b.title,
      summary: (b.authors || []).map(a => a.name).join(', '),
      url: b.formats?.['text/html'] || b.formats?.['application/epub+zip'] || `https://www.gutenberg.org/ebooks/${b.id}`,
      source: 'Project Gutenberg',
      icon: 'fa-solid fa-book',
      engine: 'gutenberg',
      kind: 'wiki'
    }));
  }

  async function openMeteoGeocode(q, limit = 2) {
    // lightweight place search as extra "geo" source
    const data = await getJSON(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=${limit}&language=fa&format=json`
    );
    if (!data?.results) return [];
    return data.results.map(r => item({
      title: [r.name, r.admin1, r.country].filter(Boolean).join('، '),
      summary: `lat ${r.latitude?.toFixed?.(2)} · lon ${r.longitude?.toFixed?.(2)}`,
      url: `https://www.openstreetmap.org/?mlat=${r.latitude}&mlon=${r.longitude}#map=10/${r.latitude}/${r.longitude}`,
      source: 'Open-Meteo Geo',
      icon: 'fa-solid fa-location-dot',
      engine: 'geo',
      kind: 'web'
    }));
  }


  async function dictionary(q) {
    const data = await getJSON(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q.split(' ')[0])}`);
    if (!Array.isArray(data) || !data[0]) return [];
    const e = data[0];
    const def = e.meanings?.[0]?.definitions?.[0]?.definition || '';
    return [item({
      title: e.word || q,
      summary: def,
      url: `https://www.google.com/search?q=define+${encodeURIComponent(e.word || q)}`,
      source: 'Dictionary',
      icon: 'fa-solid fa-spell-check',
      engine: 'dictionary',
      kind: 'wiki'
    })];
  }

  async function wikiRest(q) {
    const data = await getJSON(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q.replace(/ /g, '_'))}`);
    if (!data || data.type === 'https://mediawiki.org/api/rest_v1/errors/not_found') return [];
    if (!data.title) return [];
    return [item({
      title: data.title,
      summary: data.extract || '',
      url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(data.title)}`,
      source: 'Wikipedia REST',
      icon: 'fa-brands fa-wikipedia-w',
      engine: 'wikipedia',
      kind: 'wiki'
    })];
  }

  async function quotable(q) {
    const data = await getJSON(`https://api.quotable.io/search/quotes?query=${encodeURIComponent(q)}&limit=2`);
    const results = data?.results || [];
    return results.map(x => item({
      title: `"${(x.content || '').slice(0, 80)}${(x.content || '').length > 80 ? '…' : ''}"`,
      summary: x.author || '',
      url: `https://quotable.io/quotes/${x._id}`,
      source: 'Quotable',
      icon: 'fa-solid fa-quote-left',
      engine: 'quotable',
      kind: 'web'
    }));
  }

  async function musicBrainz(q, limit = 2) {
    const data = await getJSON(
      `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(q)}&limit=${limit}&fmt=json`,
      { headers: { 'User-Agent': 'SmartSearch/14.0 (educational)' } }
    );
    const recs = data?.recordings || [];
    return recs.map(r => item({
      title: r.title || 'Track',
      summary: (r['artist-credit'] || []).map(a => a.name || a.artist?.name).filter(Boolean).join(', '),
      url: `https://musicbrainz.org/recording/${r.id}`,
      source: 'MusicBrainz',
      icon: 'fa-solid fa-music',
      engine: 'musicbrainz',
      kind: 'web'
    }));
  }

  /**
   * 50 sources composition:
   * 10 Wikipedia langs + DDG + OL + Wikidata + HN + Reddit + arXiv + Crossref
   * + Archive + Gutenberg + Geo + 25 StackExchange sites = 50
   */

  async function europePMC(q, limit = 3) {
    const data = await getJSON(
      `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(q)}&format=json&pageSize=${limit}`
    );
    const list = data?.resultList?.result || [];
    return list.map(x => item({
      title: x.title || 'Paper',
      summary: [x.authorString, x.journalTitle, x.pubYear].filter(Boolean).join(' · '),
      url: x.doi ? `https://doi.org/${x.doi}` : (x.fullTextUrlList?.fullTextUrl?.[0]?.url || `https://europepmc.org/article/${x.source}/${x.id}`),
      source: 'Europe PMC',
      icon: 'fa-solid fa-flask',
      engine: 'europepmc',
      kind: 'science'
    }));
  }

  async function wikiOpenSearch(q, lang = 'en', limit = 3) {
    const data = await getJSON(
      `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=${limit}&namespace=0&format=json&origin=*`
    );
    if (!Array.isArray(data) || data.length < 4) return [];
    const titles = data[1] || [], descs = data[2] || [], urls = data[3] || [];
    return titles.map((title, i) => item({
      title,
      summary: descs[i] || '',
      url: urls[i] || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      source: `Wiki OpenSearch ${lang.toUpperCase()}`,
      icon: 'fa-brands fa-wikipedia-w',
      engine: 'wikipedia',
      kind: 'wiki'
    }));
  }


  /** Optional Google Programmable Search. window.GOOGLE_CSE = { key, cx } */
  async function googleCSE(q, limit = 5) {
    const cfg = (typeof window !== 'undefined' && window.GOOGLE_CSE) || {};
    if (!cfg.key || !cfg.cx) return [];
    const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(cfg.key.trim())}&cx=${encodeURIComponent(cfg.cx.trim())}&q=${encodeURIComponent(q)}&num=${Math.min(limit, 10)}`;
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 8000);
      const r = await fetch(url, { signal: c.signal });
      clearTimeout(t);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = data?.error?.message || ('HTTP ' + r.status);
        console.warn('Google CSE error:', msg);
        return [];
      }
      return (data.items || []).map(x => item({
        title: x.title || '',
        summary: x.snippet || '',
        url: x.link || '',
        source: 'Google CSE',
        icon: 'fa-brands fa-google',
        engine: 'google_cse',
        kind: 'web'
      }));
    } catch (e) {
      console.warn('Google CSE', e);
      return [];
    }
  }

  /** Test connection; returns { ok, message, count } */
  async function testGoogleCSE(key, cx) {
    key = (key || '').trim();
    cx = (cx || '').trim();
    if (!key || !cx) return { ok: false, message: 'Key و CX هر دو لازم است', count: 0 };
    const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&q=test&num=1`;
    try {
      const r = await fetch(url);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        return { ok: false, message: data?.error?.message || ('خطا HTTP ' + r.status), count: 0 };
      }
      const n = (data.items || []).length;
      return { ok: true, message: n ? ('متصل — نمونه: ' + (data.items[0].title || '')) : 'متصل (نتیجه‌ای برای test نبود)', count: n };
    } catch (e) {
      return { ok: false, message: 'شبکه/CORS: ' + (e.message || e), count: 0 };
    }
  }

  async function searchAll(query, options = {}) {
    const limit = options.limit || 5;
    const variants = options.variants || [query];
    const tasks = [];

    // 10 wiki languages
    WIKI_LANGS.forEach((lang, i) => {
      tasks.push(wikipedia(query, lang, i < 3 ? 5 : 2));
    });
    tasks.push(duckduckgo(query));
    tasks.push(openLibrary(query, 3));
    tasks.push(wikidata(query, 3));
    tasks.push(hackerNews(query, 3));
    tasks.push(reddit(query, 3));
    tasks.push(arxiv(query, 3));
    tasks.push(crossref(query, 3));
    tasks.push(archiveOrg(query, 2));
    tasks.push(gutendex(query, 2));
    tasks.push(openMeteoGeocode(query, 2));
    tasks.push(dictionary(query));
    tasks.push(wikiRest(query));
    tasks.push(quotable(query));
    tasks.push(musicBrainz(query, 2));
    tasks.push(europePMC(query, 3));
    tasks.push(wikiOpenSearch(query, 'en', 3));
    tasks.push(wikiOpenSearch(query, 'fa', 2));
    tasks.push(googleCSE(query, 5));

    // 25 Stack Exchange sites
    SE_SITES.forEach(site => {
      tasks.push(stackSite(site, query, site === 'stackoverflow' ? 4 : 2));
    });

    // variant fan-out (limited)
    variants.slice(1, 3).forEach(v => {
      if (v && v !== query) {
        tasks.push(wikipedia(v, 'en', 2));
        tasks.push(stackSite('stackoverflow', v, 2));
      }
    });

    // wiki+SE+core expanded
    // + variants ≈ coverage of 50 labeled sources

    const settled = await Promise.allSettled(tasks);
    const all = [];
    settled.forEach(s => {
      if (s.status === 'fulfilled' && Array.isArray(s.value)) all.push(...s.value);
    });
    return all;
  }

  function sourceCount() {
    return WIKI_LANGS.length + SE_SITES.length + 17; // wiki+SE+core engines
  }

  return { searchAll, sourceCount, wikipedia, duckduckgo, stackSite, googleCSE, testGoogleCSE };
})();
