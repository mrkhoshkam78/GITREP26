/**
 * Smart Engine v7.0 — Real 10x phrase intelligence
 * Focus: treat multi-word queries as atomic meaning units.
 * "ساخت سایت" must stay about website building, never split into unrelated singles.
 */
const SmartEngine = (() => {
  'use strict';

  let keywordsData = null;
  let allKeywords = [];
  let expansions = {};
  let isReady = false;

  const KW_CACHE_KEY = 'ss_kw_cache_v70';
  const MAX_VARIANTS = 5;

  // Strong Persian normalization
  function normalize(text) {
    if (!text) return '';
    return String(text)
      .replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/آ/g, 'ا')
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/[‌‍]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function tokens(text) {
    return normalize(text).split(/\s+/).filter(Boolean);
  }

  // Compact Levenshtein
  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    const row = new Array(n + 1);
    for (let j = 0; j <= n; j++) row[j] = j;
    for (let i = 1; i <= m; i++) {
      let prev = i, tmp;
      for (let j = 1; j <= n; j++) {
        tmp = row[j];
        row[j] = a[i-1] === b[j-1] ? prev : Math.min(prev + 1, row[j] + 1, row[j-1] + 1);
        prev = tmp;
      }
    }
    return row[n];
  }

  /**
   * Phrase-first score (much stricter on multi-word)
   * Priority: full phrase > ordered tokens > partial overlap
   */
  function fuzzyScore(query, candidate) {
    const q = normalize(query);
    const c = normalize(candidate);
    if (!q || !c) return 0;
    if (q === c) return 1.0;
    if (c.includes(q)) return 0.96;
    if (q.includes(c) && c.length >= 4) return 0.78;

    const qt = tokens(query);
    const ct = tokens(candidate);

    // Ordered coverage (core of phrase intelligence)
    let ordered = 0, ci = 0;
    for (const t of qt) {
      while (ci < ct.length) {
        if (ct[ci].includes(t) || t.includes(ct[ci]) || lev(t, ct[ci]) <= 1) {
          ordered++; ci++; break;
        }
        ci++;
      }
    }
    const orderedRatio = ordered / Math.max(qt.length, 1);

    // Unordered overlap
    let overlap = 0;
    qt.forEach(t => {
      if (ct.some(x => x.includes(t) || t.includes(x) || lev(t, x) <= 1)) overlap++;
    });
    const overlapRatio = overlap / Math.max(qt.length, 1);

    // Full-string similarity
    const maxL = Math.max(q.length, c.length) || 1;
    const base = 1 - lev(q, c) / maxL;

    // Weighted: ordered phrase match dominates
    let score = orderedRatio * 0.60 + overlapRatio * 0.25 + base * 0.15;

    // Heavy penalty: multi-word query vs single short word
    if (qt.length >= 2 && ct.length === 1 && c.length < 9) {
      score *= 0.22;
    }
    // Bonus when candidate also multi-word and high ordered
    if (qt.length >= 2 && ct.length >= 2 && orderedRatio >= 0.8) {
      score = Math.min(1, score + 0.12);
    }
    return Math.min(1, Math.max(0, score));
  }

  function fuzzyMatch(query, limit = 12) {
    if (!allKeywords.length) return [];
    return allKeywords
      .map(kw => ({ keyword: kw, score: fuzzyScore(query, kw) }))
      .filter(x => x.score >= 0.52)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Rich phrase expansions (keep meaning intact)
  const PHRASE_MAP = {
    'ساخت سایت': ['website development', 'web development', 'طراحی وبسایت', 'ساخت وبسایت', 'توسعه وب', 'website builder', 'طراحی سایت'],
    'طراحی سایت': ['web design', 'website design', 'UI UX design', 'طراحی وب', 'رابط کاربری سایت'],
    'ساخت وبسایت': ['website development', 'web development', 'ساخت سایت'],
    'توسعه وب': ['web development', 'frontend development', 'backend development'],
    'هوش مصنوعی': ['artificial intelligence', 'AI', 'machine learning', 'deep learning'],
    'یادگیری ماشین': ['machine learning', 'ML', 'supervised learning'],
    'سلامت روان': ['mental health', 'psychology', 'wellbeing'],
    'تغییر اقلیم': ['climate change', 'global warming'],
    'امنیت سایبری': ['cybersecurity', 'information security'],
    'برنامه نویسی': ['programming', 'coding', 'software development'],
    'تاریخ ایران': ['history of Iran', 'Persian history', 'Iranian history'],
    'هوش مصنوعی در پزشکی': ['AI in medicine', 'medical AI', 'هوش مصنوعی پزشکی'],
    'ساخت سایت با وردپرس': ['wordpress website', 'ساخت سایت وردپرس'],
    'یادگیری عمیق': ['deep learning', 'neural networks']
  };

  function getPhraseExpansions(query) {
    const q = normalize(query);
    const out = [];
    Object.entries(PHRASE_MAP).forEach(([phrase, vals]) => {
      const p = normalize(phrase);
      if (q === p || q.includes(p) || p.includes(q) || fuzzyScore(q, p) > 0.72) {
        out.push(...vals);
        out.push(phrase);
      }
    });
    return [...new Set(out)];
  }

  function detectIntent(query) {
    const q = normalize(query);
    const rules = [
      { intent: 'webdev', re: /ساخت\s*سایت|طراحی\s*سایت|توسعه\s*وب|وردپرس|فرانت|بک\s*اند|html|css|javascript|react|vue/ },
      { intent: 'ai', re: /هوش\s*مصنوعی|یادگیری\s*ماشین|چت\s*جی|مدل\s*زبانی|ربات|deep\s*learning|machine\s*learning/ },
      { intent: 'science', re: /فضا|سیاه\s*چاله|فیزیک|شیمی|ژنتیک|کوانتوم|نجوم|ناسا/ },
      { intent: 'health', re: /سلامت|تغذیه|ورزش|روان|خواب|رژیم|درمان|اضطراب/ },
      { intent: 'history', re: /تاریخ|هخامنشی|شعر|حافظ|شاهنامه|ادبیات|فرهنگ\s*ایران/ },
      { intent: 'business', re: /استارتاپ|سرمایه|بازار|اقتصاد|فروش|بازاریابی|بورس|سئو/ }
    ];
    for (const { intent, re } of rules) {
      if (re.test(q)) return intent;
    }
    return 'general';
  }

  function isTooSimilar(a, b) {
    return fuzzyScore(a, b) > 0.80;
  }

  function selectDiverse(list, max = MAX_VARIANTS) {
    const selected = [];
    for (const v of list) {
      if (selected.every(s => !isTooSimilar(s, v))) {
        selected.push(v);
        if (selected.length >= max) break;
      }
    }
    return selected;
  }

  /**
   * Main combine — phrase-first, aggressive single-word rejection
   */
  function combine(query) {
    const raw = (query || '').trim();
    if (!raw) return [];

    const variants = new Set([raw]);
    const qNorm = normalize(raw);
    const qTokens = tokens(raw);
    const isMulti = qTokens.length >= 2;

    // 1. High-priority phrase expansions (never break meaning)
    getPhraseExpansions(raw).forEach(v => variants.add(v));

    // 2. Dictionary expansions only on strong match
    Object.entries(expansions).forEach(([key, vals]) => {
      const k = normalize(key);
      if (qNorm.includes(k) || fuzzyScore(qNorm, k) > 0.70) {
        vals.forEach(v => variants.add(v));
      }
    });

    // 3. Fuzzy hits — require higher score for multi-word
    const minScore = isMulti ? 0.58 : 0.50;
    fuzzyMatch(raw, 14).forEach(h => {
      if (h.score >= minScore) variants.add(h.keyword);
    });

    // 4. Intent-guided group boost (still phrase-scored)
    const intent = detectIntent(raw);
    if (keywordsData?.groups && intent !== 'general') {
      const intentGroup = {
        webdev: 'programming', ai: 'ai-tech', science: 'science',
        health: 'health', history: 'iran', business: 'business'
      }[intent];
      const g = keywordsData.groups.find(x => x.id === intentGroup);
      if (g) {
        g.keywords
          .filter(k => fuzzyScore(raw, k) > 0.55)
          .slice(0, 5)
          .forEach(k => variants.add(k));
      }
    }

    // 5. Critical filter: kill weak single-word breakups of multi-word queries
    if (isMulti) {
      [...variants].forEach(v => {
        const vt = tokens(v);
        if (vt.length === 1 && vt[0].length < 10) {
          const strong = Object.values(PHRASE_MAP).some(arr => arr.includes(v)) ||
                         Object.values(expansions).some(arr => arr.includes(v));
          if (!strong) variants.delete(v);
        }
      });
    }

    return selectDiverse([...variants], MAX_VARIANTS);
  }

  async function load(maxRetries = 3) {
    try {
      const cached = localStorage.getItem(KW_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.version && parsed?.groups) {
          keywordsData = parsed;
          expansions = parsed.expansions || {};
          allKeywords = parsed.groups.flatMap(g => g.keywords);
          isReady = true;
          return true;
        }
      }
    } catch (_) {}

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 12000);
        const res = await fetch('data/keywords.json', { signal: controller.signal });
        clearTimeout(t);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!Array.isArray(data.groups)) throw new Error('Invalid');
        keywordsData = data;
        expansions = data.expansions || {};
        allKeywords = data.groups.flatMap(g => g.keywords);
        isReady = true;
        try { localStorage.setItem(KW_CACHE_KEY, JSON.stringify(data)); } catch (_) {}
        return true;
      } catch (err) {
        console.warn('[SmartEngine] attempt', attempt, err.message);
        if (attempt === maxRetries) { isReady = false; return false; }
        await new Promise(r => setTimeout(r, 350 * attempt));
      }
    }
    return false;
  }

  function getStatus() {
    return { ready: isReady, count: allKeywords.length };
  }

  return { load, combine, fuzzyScore, fuzzyMatch, normalize, detectIntent, getStatus };
})();
