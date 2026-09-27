/** Smart Engine v9.1 — indexed, compact */
const SmartEngine = (() => {
  'use strict';
  let keywordsData = null, allKeywords = [], expansions = {}, isReady = false;
  let prefixIndex = null, tokenIndex = null;
  const CACHE = 'ss_kw_v91', MAX_V = 10;
  const STOP = new Set(['و','در','به','از','که','این','را','با','برای','یک','شد','است','های','می','تا','the','a','an','of','to','in','for','on','and','or','is','are','with','by']);

  const normalize = t => !t ? '' : String(t).replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/آ/g,'ا')
    .replace(/[\u064B-\u065F\u0670]/g,'').replace(/[‌‍]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  const tokens = t => normalize(t).split(/\s+/).filter(x => x && !STOP.has(x));

  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    if (Math.abs(m - n) > 6) return Math.max(m, n);
    const row = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      let prev = i, tmp;
      for (let j = 1; j <= n; j++) {
        tmp = row[j];
        row[j] = a[i - 1] === b[j - 1] ? prev : Math.min(prev + 1, row[j] + 1, row[j - 1] + 1);
        prev = tmp;
      }
    }
    return row[n];
  }

  function buildIndexes() {
    prefixIndex = new Map();
    tokenIndex = new Map();
    for (let i = 0; i < allKeywords.length; i++) {
      const n = normalize(allKeywords[i]);
      if (!n) continue;
      const p2 = n.slice(0, 2);
      if (!prefixIndex.has(p2)) prefixIndex.set(p2, []);
      prefixIndex.get(p2).push(i);
      n.split(/\s+/).filter(t => t.length >= 2 && !STOP.has(t)).forEach(t => {
        const k = t.slice(0, Math.min(4, t.length));
        if (!tokenIndex.has(k)) tokenIndex.set(k, []);
        const arr = tokenIndex.get(k);
        if (arr.length < 400) arr.push(i);
      });
    }
  }

  function candidates(query, maxCand = 800) {
    if (!prefixIndex || !allKeywords.length) return allKeywords.slice(0, maxCand);
    const q = normalize(query), qt = tokens(query), ids = new Set();
    const p2 = q.slice(0, 2);
    (prefixIndex.get(p2) || []).forEach(i => ids.add(i));
    for (const t of qt) {
      (tokenIndex.get(t.slice(0, Math.min(4, t.length))) || []).forEach(i => ids.add(i));
      if (ids.size > maxCand * 2) break;
    }
    if (!ids.size) {
      const step = Math.max(1, Math.floor(allKeywords.length / maxCand));
      const out = [];
      for (let i = 0; i < allKeywords.length && out.length < maxCand; i += step) out.push(allKeywords[i]);
      return out;
    }
    return [...ids].slice(0, maxCand).map(i => allKeywords[i]);
  }

  function fuzzyScore(query, candidate) {
    const q = normalize(query), c = normalize(candidate);
    if (!q || !c) return 0;
    if (q === c) return 1;
    if (c.includes(q)) return 0.97;
    if (q.includes(c) && c.length >= 5) return 0.82;
    const qt = tokens(query), ct = tokens(candidate);
    if (!qt.length || !ct.length) return 0;
    let ordered = 0, ci = 0;
    for (const t of qt) {
      while (ci < ct.length) {
        if (ct[ci].includes(t) || t.includes(ct[ci]) || lev(t, ct[ci]) <= 1) { ordered++; ci++; break; }
        ci++;
      }
    }
    const orderedRatio = ordered / qt.length;
    let overlap = 0;
    qt.forEach(t => { if (ct.some(x => x.includes(t) || t.includes(x) || lev(t, x) <= 1)) overlap++; });
    const overlapRatio = overlap / qt.length;
    let jaccard = 0;
    if (qt.length >= 2 && ct.length >= 2) {
      const bg = s => {
        const t = tokens(s), set = new Set();
        for (let i = 0; i < t.length - 1; i++) set.add(t[i] + ' ' + t[i + 1]);
        return set;
      };
      const A = bg(q), B = bg(c);
      let inter = 0;
      A.forEach(x => { if (B.has(x)) inter++; });
      jaccard = inter / (A.size + B.size - inter || 1);
    }
    const base = 1 - lev(q, c) / (Math.max(q.length, c.length) || 1);
    let score = orderedRatio * 0.48 + overlapRatio * 0.22 + jaccard * 0.18 + base * 0.12;
    if (qt.length >= 2 && ct.length === 1 && c.length < 11) score *= 0.15;
    if (qt.length >= 2 && ct.length >= 2 && orderedRatio >= 0.75) score = Math.min(1, score + 0.14);
    return Math.min(1, Math.max(0, score));
  }

  function fuzzyMatch(query, limit = 18) {
    if (!allKeywords.length) return [];
    const min = tokens(query).length >= 2 ? 0.5 : 0.48;
    return candidates(query, 900)
      .map(kw => ({ keyword: kw, score: fuzzyScore(query, kw) }))
      .filter(x => x.score >= min)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  const PHRASE_MAP = {
    'ساخت سایت': ['website development', 'web development', 'طراحی وبسایت', 'توسعه وب'],
    'طراحی سایت': ['web design', 'UI UX design', 'طراحی وب'],
    'هوش مصنوعی': ['artificial intelligence', 'AI', 'machine learning', 'LLM'],
    'یادگیری ماشین': ['machine learning', 'ML', 'scikit-learn'],
    'برنامه نویسی': ['programming', 'coding', 'software development'],
    'سئو': ['SEO', 'search engine optimization'],
    'استارتاپ': ['startup', 'entrepreneurship', 'MVP'],
    'پایتون': ['Python', 'Django', 'FastAPI'],
    'جاوا اسکریپت': ['JavaScript', 'TypeScript', 'Node.js', 'React'],
    'چت جی پی تی': ['ChatGPT', 'GPT', 'OpenAI', 'prompt engineering'],
    'سلامت روان': ['mental health', 'psychology'],
    'تاریخ ایران': ['history of Iran', 'Persian history']
  };

  function getPhraseExpansions(query) {
    const q = normalize(query), out = [];
    Object.entries(PHRASE_MAP).forEach(([phrase, vals]) => {
      const p = normalize(phrase);
      if (q === p || q.includes(p) || p.includes(q) || fuzzyScore(q, p) > 0.68) out.push(...vals, phrase);
    });
    return [...new Set(out)];
  }

  function detectIntent(query) {
    const q = normalize(query);
    const rules = [
      ['webdev', /ساخت\s*سایت|طراحی\s*سایت|وردپرس|react|javascript|wordpress/],
      ['ai', /هوش\s*مصنوعی|یادگیری\s*ماشین|chatgpt|gpt|llm|machine\s*learning/],
      ['science', /فضا|فیزیک|شیمی|کوانتوم|arxiv|physics|biology/],
      ['health', /سلامت|روان|تغذیه|mental\s*health|fitness/],
      ['history', /تاریخ|هخامنشی|حافظ|شاهنامه/],
      ['business', /استارتاپ|سئو|بازاریابی|startup|seo|marketing/],
      ['code', /برنامه|کد|python|bug|error|stack|api|docker/]
    ];
    for (const [intent, re] of rules) if (re.test(q)) return intent;
    return 'general';
  }

  function selectDiverse(list, max = MAX_V) {
    const selected = [];
    for (const v of list) {
      if (!v || STOP.has(normalize(v))) continue;
      if (selected.every(s => fuzzyScore(s, v) <= 0.82)) {
        selected.push(v);
        if (selected.length >= max) break;
      }
    }
    return selected;
  }

  function combine(query) {
    const raw = (query || '').trim();
    if (!raw) return [];
    const variants = new Set([raw]);
    const qNorm = normalize(raw), qTokens = tokens(raw), isMulti = qTokens.length >= 2;
    getPhraseExpansions(raw).forEach(v => variants.add(v));
    Object.entries(expansions).forEach(([key, vals]) => {
      const k = normalize(key);
      if (qNorm.includes(k) || fuzzyScore(qNorm, k) > 0.66) (vals || []).forEach(v => variants.add(v));
    });
    const minScore = isMulti ? 0.52 : 0.48;
    fuzzyMatch(raw, 20).forEach(h => { if (h.score >= minScore) variants.add(h.keyword); });
    const intent = detectIntent(raw);
    if (keywordsData?.groups && intent !== 'general') {
      const map = { webdev: 'programming', code: 'programming', ai: 'ai-tech', science: 'science', health: 'health', history: 'iran', business: 'business' };
      const g = keywordsData.groups.find(x => x.id === map[intent]);
      if (g) g.keywords.filter(k => fuzzyScore(raw, k) > 0.52).slice(0, 8).forEach(k => variants.add(k));
    }
    if (isMulti) {
      [...variants].forEach(v => {
        const vt = tokens(v);
        if (vt.length === 1 && vt[0].length < 11) {
          const strong = Object.values(PHRASE_MAP).some(a => a.includes(v));
          if (!strong) variants.delete(v);
        }
      });
    }
    return selectDiverse([raw, ...[...variants].filter(v => v !== raw)], MAX_V);
  }

  async function load(maxRetries = 3) {
    try {
      const cached = localStorage.getItem(CACHE);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.version && parsed?.groups) {
          keywordsData = parsed;
          expansions = parsed.expansions || {};
          allKeywords = parsed.groups.flatMap(g => g.keywords);
          buildIndexes();
          isReady = true;
          return true;
        }
      }
    } catch {}
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 20000);
        const res = await fetch('data/keywords.json', { signal: c.signal });
        clearTimeout(t);
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        if (!Array.isArray(data.groups)) throw new Error('Invalid');
        keywordsData = data;
        expansions = data.expansions || {};
        allKeywords = data.groups.flatMap(g => g.keywords);
        buildIndexes();
        isReady = true;
        try { localStorage.setItem(CACHE, JSON.stringify(data)); } catch {}
        return true;
      } catch (err) {
        if (attempt === maxRetries) { isReady = false; return false; }
        await new Promise(r => setTimeout(r, 400 * attempt));
      }
    }
    return false;
  }

  return {
    load, combine, fuzzyScore, fuzzyMatch, normalize, detectIntent,
    getStatus: () => ({ ready: isReady, count: allKeywords.length, indexed: !!prefixIndex })
  };
})();
