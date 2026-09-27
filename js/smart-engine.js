/**
 * Smart Engine v5.0
 * Clean, modular keyword intelligence + fuzzy matching
 * Upgrades applied:
 *  1. Persian text normalization
 *  2. Improved fuzzy (Levenshtein + token overlap + length penalty)
 *  3. Weighted group-aware combination
 *  4. Simple intent detection for better variants
 *  5. Diversity-aware variant selection (avoid near-duplicates)
 */

const SmartEngine = (() => {
  'use strict';

  let keywordsData = null;
  let allKeywords = [];
  let expansions = {};
  let isReady = false;

  const KW_CACHE_KEY = 'ss_kw_cache_v50';
  const MAX_VARIANTS = 8;

  // ---------- 1. Persian Normalization ----------
  function normalizePersian(text) {
    if (!text) return '';
    return text
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/[\u064B-\u065F]/g, '') // remove diacritics
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  // ---------- 2. Improved Fuzzy Score ----------
  function levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
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
    if (c.includes(q) || q.includes(c)) return 0.88;

    const maxLen = Math.max(q.length, c.length);
    const dist = levenshtein(q, c);
    let score = 1 - dist / maxLen;

    // Token overlap
    const qTokens = q.split(/\s+/).filter(Boolean);
    const cTokens = c.split(/\s+/).filter(Boolean);
    let overlap = 0;
    qTokens.forEach(t => {
      if (cTokens.some(ct => ct.includes(t) || t.includes(ct) || levenshtein(t, ct) <= 1)) {
        overlap += 1;
      }
    });
    score += (overlap / Math.max(qTokens.length, 1)) * 0.18;

    // Length similarity penalty
    const lenRatio = Math.min(q.length, c.length) / Math.max(q.length, c.length);
    score *= (0.7 + 0.3 * lenRatio);

    return Math.min(1, Math.max(0, score));
  }

  function fuzzyMatch(query, limit = 10) {
    if (!allKeywords.length) return [];
    return allKeywords
      .map(kw => ({ keyword: kw, score: fuzzyScore(query, kw) }))
      .filter(x => x.score >= 0.42)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // ---------- 3 & 4. Weighted Group + Intent ----------
  function detectIntent(query) {
    const q = normalizePersian(query);
    const intents = {
      tech: /هوش|یادگیری|ربات|برنامه|کد|داده|ابری|بلاک|متاورس|الگوریتم/,
      science: /فضا|سیاه|مریخ|فیزیک|شیمی|ژنتیک|کوانتوم|نجوم|بیولوژی/,
      health: /سلامت|تغذیه|ورزش|روان|خواب|رژیم|بیماری|درمان/,
      history: /تاریخ|هخامنشی|شعر|حافظ|شاهنامه|ایران|فرهنگ|ادبیات/,
      business: /استارتاپ|سرمایه|بازار|اقتصاد|فروش|بازاریابی|بورس/
    };
    for (const [intent, re] of Object.entries(intents)) {
      if (re.test(q)) return intent;
    }
    return 'general';
  }

  function getRelatedGroupIds(fuzzyHits) {
    const ids = new Set();
    if (!keywordsData?.groups) return ids;
    fuzzyHits.forEach(h => {
      keywordsData.groups.forEach(g => {
        if (g.keywords.includes(h.keyword)) ids.add(g.id);
      });
    });
    return ids;
  }

  // ---------- 5. Diversity-aware variant selection ----------
  function isTooSimilar(a, b) {
    return fuzzyScore(a, b) > 0.82;
  }

  function selectDiverse(variants, max = MAX_VARIANTS) {
    const selected = [];
    for (const v of variants) {
      if (selected.every(s => !isTooSimilar(s, v))) {
        selected.push(v);
        if (selected.length >= max) break;
      }
    }
    return selected;
  }

  // ---------- Main combine ----------
  function combine(query) {
    const variants = new Set([query.trim()]);
    const qNorm = normalizePersian(query);

    // Expansions
    Object.entries(expansions).forEach(([key, vals]) => {
      if (qNorm.includes(normalizePersian(key)) || normalizePersian(key).includes(qNorm)) {
        vals.forEach(v => variants.add(v));
      }
    });

    // Fuzzy hits
    const hits = fuzzyMatch(query, 8);
    hits.forEach(h => {
      variants.add(h.keyword);
      if (expansions[h.keyword]) {
        expansions[h.keyword].slice(0, 2).forEach(v => variants.add(v));
      }
    });

    // Group-aware + intent boost
    const intent = detectIntent(query);
    const groupIds = getRelatedGroupIds(hits);
    if (keywordsData?.groups) {
      keywordsData.groups.forEach(g => {
        const weight = groupIds.has(g.id) ? 1.0 : (intent !== 'general' && g.id.includes(intent) ? 0.6 : 0.2);
        if (weight < 0.5) return;
        g.keywords
          .filter(k => fuzzyScore(query, k) > 0.35)
          .slice(0, 3)
          .forEach(k => variants.add(k));
      });
    }

    // Simple smart combo
    hits.slice(0, 2).forEach(h => {
      const last = h.keyword.split(' ').pop();
      if (last && last.length > 2) variants.add(`${query} ${last}`);
    });

    return selectDiverse([...variants], MAX_VARIANTS);
  }

  // ---------- Load with retry + cache ----------
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
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data.groups)) throw new Error('Invalid format');

        keywordsData = data;
        expansions = data.expansions || {};
        allKeywords = data.groups.flatMap(g => g.keywords);
        isReady = true;

        try { localStorage.setItem(KW_CACHE_KEY, JSON.stringify(data)); } catch (_) {}
        return true;
      } catch (err) {
        console.warn(`[SmartEngine] load attempt ${attempt}:`, err.message);
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

  // Public API
  return {
    load,
    combine,
    fuzzyScore,
    fuzzyMatch,
    normalizePersian,
    getStatus
  };
})();
