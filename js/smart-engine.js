/**
 * Smart Engine v6.0 — Phrase-aware (much stronger for multi-word queries)
 * "ساخت سایت" stays about website building, not split into unrelated parts.
 */
const SmartEngine = (() => {
  'use strict';

  let keywordsData = null;
  let allKeywords = [];
  let expansions = {};
  let isReady = false;

  const KW_CACHE_KEY = 'ss_kw_cache_v60';
  const MAX_VARIANTS = 6;

  function normalizePersian(text) {
    if (!text) return '';
    return String(text)
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/آ/g, 'ا')
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/[‌‍]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const prev = new Array(n + 1);
    const curr = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      }
      for (let j = 0; j <= n; j++) prev[j] = curr[j];
    }
    return prev[n];
  }

  function fuzzyScore(query, candidate) {
    const q = normalizePersian(query);
    const c = normalizePersian(candidate);
    if (!q || !c) return 0;
    if (q === c) return 1.0;
    if (c.includes(q)) return 0.95;
    if (q.includes(c) && c.length > 3) return 0.82;

    const qTokens = q.split(/\s+/).filter(Boolean);
    const cTokens = c.split(/\s+/).filter(Boolean);

    let orderedHits = 0;
    let ci = 0;
    for (const qt of qTokens) {
      while (ci < cTokens.length) {
        if (cTokens[ci].includes(qt) || qt.includes(cTokens[ci]) || levenshtein(qt, cTokens[ci]) <= 1) {
          orderedHits++;
          ci++;
          break;
        }
        ci++;
      }
    }
    const orderedRatio = orderedHits / Math.max(qTokens.length, 1);

    const maxLen = Math.max(q.length, c.length);
    const dist = levenshtein(q, c);
    let base = 1 - dist / maxLen;

    let overlap = 0;
    qTokens.forEach(t => {
      if (cTokens.some(ct => ct.includes(t) || t.includes(ct) || levenshtein(t, ct) <= 1)) overlap++;
    });
    const overlapRatio = overlap / Math.max(qTokens.length, 1);

    let score = base * 0.25 + orderedRatio * 0.55 + overlapRatio * 0.20;

    if (qTokens.length >= 2 && cTokens.length === 1 && c.length < 8) {
      score *= 0.35;
    }
    return Math.min(1, Math.max(0, score));
  }

  function fuzzyMatch(query, limit = 10) {
    if (!allKeywords.length) return [];
    return allKeywords
      .map(kw => ({ keyword: kw, score: fuzzyScore(query, kw) }))
      .filter(x => x.score >= 0.48)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  function detectIntent(query) {
    const q = normalizePersian(query);
    const map = [
      { intent: 'webdev', re: /ساخت\s*سایت|طراحی\s*سایت|توسعه\s*وب|فرانت|بک.?اند|وردپرس|html|css|javascript|react/ },
      { intent: 'ai', re: /هوش\s*مصنوعی|یادگیری\s*ماشین|چت\s*جی\s*پی|مدل\s*زبانی|ربات/ },
      { intent: 'science', re: /فضا|سیاه.?چاله|فیزیک|شیمی|ژنتیک|کوانتوم|نجوم/ },
      { intent: 'health', re: /سلامت|تغذیه|ورزش|روان|خواب|رژیم|درمان/ },
      { intent: 'history', re: /تاریخ|هخامنشی|شعر|حافظ|شاهنامه|ادبیات|فرهنگ/ },
      { intent: 'business', re: /استارتاپ|سرمایه|بازار|اقتصاد|فروش|بازاریابی|بورس/ }
    ];
    for (const { intent, re } of map) {
      if (re.test(q)) return intent;
    }
    return 'general';
  }

  const PHRASE_EXPANSIONS = {
    'ساخت سایت': ['website development', 'web development', 'طراحی وبسایت', 'ساخت وبسایت', 'توسعه وب'],
    'طراحی سایت': ['web design', 'website design', 'طراحی وب', 'ui ux'],
    'هوش مصنوعی': ['artificial intelligence', 'AI', 'machine learning'],
    'یادگیری ماشین': ['machine learning', 'ML'],
    'سلامت روان': ['mental health', 'psychology'],
    'تغییر اقلیم': ['climate change', 'global warming'],
    'امنیت سایبری': ['cybersecurity', 'infoSec'],
    'برنامه نویسی': ['programming', 'coding', 'software development'],
    'تاریخ ایران': ['history of Iran', 'Persian history']
  };

  function getPhraseExpansions(query) {
    const q = normalizePersian(query);
    const out = [];
    Object.entries(PHRASE_EXPANSIONS).forEach(([phrase, vals]) => {
      const p = normalizePersian(phrase);
      if (q.includes(p) || p.includes(q) || fuzzyScore(q, p) > 0.75) {
        out.push(...vals);
      }
    });
    return out;
  }

  function isTooSimilar(a, b) {
    return fuzzyScore(a, b) > 0.78;
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

  function combine(query) {
    const raw = query.trim();
    if (!raw) return [];

    const variants = new Set([raw]);
    const qNorm = normalizePersian(raw);

    getPhraseExpansions(raw).forEach(v => variants.add(v));

    Object.entries(expansions).forEach(([key, vals]) => {
      const k = normalizePersian(key);
      if (qNorm.includes(k) || (k.length > 4 && fuzzyScore(qNorm, k) > 0.7)) {
        vals.forEach(v => variants.add(v));
      }
    });

    const hits = fuzzyMatch(raw, 12);
    hits.forEach(h => {
      if (h.score >= 0.55) variants.add(h.keyword);
    });

    const intent = detectIntent(raw);
    if (keywordsData?.groups && intent !== 'general') {
      keywordsData.groups.forEach(g => {
        const related =
          (intent === 'webdev' && g.id === 'programming') ||
          (intent === 'ai' && g.id === 'ai-tech') ||
          (intent === 'science' && g.id === 'science') ||
          (intent === 'health' && g.id === 'health') ||
          (intent === 'history' && g.id === 'iran') ||
          (intent === 'business' && g.id === 'business');
        if (!related) return;
        g.keywords
          .filter(k => fuzzyScore(raw, k) > 0.5)
          .slice(0, 4)
          .forEach(k => variants.add(k));
      });
    }

    const qTokens = qNorm.split(/\s+/).filter(Boolean);
    if (qTokens.length >= 2) {
      [...variants].forEach(v => {
        const vt = normalizePersian(v).split(/\s+/);
        if (vt.length === 1 && vt[0].length < 7) {
          const isStrong = Object.values(expansions).some(arr => arr.includes(v)) ||
            Object.values(PHRASE_EXPANSIONS).some(arr => arr.includes(v));
          if (!isStrong) variants.delete(v);
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
        const timer = setTimeout(() => controller.abort(), 10000);
        const res = await fetch('data/keywords.json', { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!Array.isArray(data.groups)) throw new Error('Invalid format');
        keywordsData = data;
        expansions = data.expansions || {};
        allKeywords = data.groups.flatMap(g => g.keywords);
        isReady = true;
        try { localStorage.setItem(KW_CACHE_KEY, JSON.stringify(data)); } catch (_) {}
        return true;
      } catch (err) {
        console.warn('[SmartEngine] attempt ' + attempt + ':', err.message);
        if (attempt === maxRetries) {
          isReady = false;
          return false;
        }
        await new Promise(r => setTimeout(r, 300 * attempt));
      }
    }
    return false;
  }

  function getStatus() {
    return { ready: isReady, count: allKeywords.length };
  }

  return {
    load,
    combine,
    fuzzyScore,
    fuzzyMatch,
    normalizePersian,
    detectIntent,
    getStatus
  };
})();
