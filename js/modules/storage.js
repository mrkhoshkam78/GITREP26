/**
 * GITREP26 V5 — LocalStorage + IndexedDB
 * Token stored in dedicated key; never wiped on failed validation from caller.
 */
const DB = 'GITREP26_V4';
const VER = 1;
const TOKEN_KEY = 'gitrep26_pat_token';

class Storage {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;
    return new Promise((res) => {
      let done = false;
      const finish = (db) => {
        if (done) return;
        done = true;
        if (db) this.db = db;
        res(this.db);
      };
      // Hard timeout — never block app boot
      const timer = setTimeout(() => {
        console.warn('IndexedDB init timeout — continuing without IDB');
        finish(null);
      }, 2000);
      try {
        const r = indexedDB.open(DB, VER);
        r.onerror = () => { clearTimeout(timer); finish(null); };
        r.onsuccess = () => { clearTimeout(timer); finish(r.result); };
        r.onupgradeneeded = e => {
          const db = e.target.result;
          const stores = [
            ['repos', 'id'], ['cache', 'key'], ['favorites', 'id'],
            ['history', 'id'], ['collections', 'id'], ['searches', 'key'],
            ['tags', 'repoId'], ['monitor', 'id'], ['translations', 'key']
          ];
          stores.forEach(([name, keyPath]) => {
            if (!db.objectStoreNames.contains(name)) {
              db.createObjectStore(name, { keyPath });
            }
          });
        };
        r.onblocked = () => { clearTimeout(timer); finish(null); };
      } catch (e) {
        clearTimeout(timer);
        finish(null);
      }
    });
  }

  get(key, fb = null) {
    try {
      const v = localStorage.getItem(key);
      return v != null ? JSON.parse(v) : fb;
    } catch { return fb; }
  }
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota */ }
  }

  /* ─── Token (dedicated, never JSON-double-encoded) ─── */
  getToken() {
    try {
      // Migrate from V3 key if present
      const v3 = localStorage.getItem('gpe_pat_token');
      if (v3 && !localStorage.getItem(TOKEN_KEY)) {
        localStorage.setItem(TOKEN_KEY, v3);
        localStorage.removeItem('gpe_pat_token');
      }
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch { return ''; }
  }

  /** Save only a non-empty validated token, or clear when explicitly empty string after user clears */
  saveToken(token, { allowClear = false } = {}) {
    const t = (token || '').trim();
    if (t) {
      localStorage.setItem(TOKEN_KEY, t);
      const s = this.get('gitrep26_settings', this._defaultSettings());
      s.token = t;
      this.set('gitrep26_settings', s);
      return t;
    }
    if (allowClear) {
      localStorage.removeItem(TOKEN_KEY);
      const s = this.get('gitrep26_settings', this._defaultSettings());
      s.token = '';
      this.set('gitrep26_settings', s);
    }
    return this.getToken();
  }

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('gpe_pat_token');
    const s = this.get('gitrep26_settings', this._defaultSettings());
    s.token = '';
    this.set('gitrep26_settings', s);
  }

  _defaultSettings() {
    return {
      theme: 'dark', language: 'en', token: '', anim: 'full',
      dataSource: 'local', imageQuality: 'high', accent: 'purple',
      layout: 'grid'
    };
  }

  getSettings() {
    // Migrate V3 settings
    let s = this.get('gitrep26_settings', null);
    if (!s) {
      const old = this.get('gpe_settings', null);
      s = old ? { ...this._defaultSettings(), ...old } : this._defaultSettings();
      this.set('gitrep26_settings', s);
    }
    s.token = this.getToken() || s.token || '';
    return s;
  }

  saveSettings(s) {
    const copy = { ...(s || this.getSettings()) };
    // Token is ONLY written via saveToken / clearToken — never wipe from settings save
    const existing = this.getToken();
    if (copy.token && String(copy.token).trim()) {
      // Keep dedicated key in sync if settings carries a real token
      this.saveToken(String(copy.token).trim());
    }
    // Always mirror existing dedicated token into the blob (never blank it)
    copy.token = this.getToken() || existing || '';
    this.set('gitrep26_settings', copy);
  }

  /* ─── Favorites / History / Searches ─── */
  getFavorites() { return this.get('gitrep26_favs', this.get('gpe_favs', [])); }
  toggleFav(id) {
    const f = this.getFavorites();
    const i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.push(id);
    this.set('gitrep26_favs', f);
    return f;
  }
  isFav(id) { return this.getFavorites().includes(id); }

  getHistory() { return this.get('gitrep26_history', this.get('gpe_history', [])); }
  addHistory(repo) {
    let h = this.getHistory().filter(r => r.id !== repo.id);
    h.unshift({
      id: repo.id, name: repo.name, full_name: repo.full_name,
      avatar: repo.owner?.avatar_url, ts: Date.now()
    });
    this.set('gitrep26_history', h.slice(0, 80));
  }

  getSearchHistory() { return this.get('gitrep26_searches', this.get('gpe_searches', [])); }
  addSearch(q) {
    if (!q.trim()) return;
    let s = this.getSearchHistory().filter(x => x !== q);
    s.unshift(q);
    this.set('gitrep26_searches', s.slice(0, 30));
  }

  /* ─── Collapse ─── */
  getCollapsed() { return this.get('gitrep26_collapsed', {}); }
  setCollapsed(map) { this.set('gitrep26_collapsed', map); }
  isCollapsed(id) { return !!this.getCollapsed()[String(id)]; }
  toggleCollapsed(id) {
    const m = this.getCollapsed();
    const k = String(id);
    if (m[k]) delete m[k]; else m[k] = true;
    this.setCollapsed(m);
    return !!m[k];
  }
  setAllCollapsed(ids, collapsed) {
    const m = collapsed ? Object.fromEntries(ids.map(id => [String(id), true])) : {};
    this.setCollapsed(m);
  }

  /* ─── Personal tags { [repoId]: string[] } ─── */
  getAllTags() { return this.get('gitrep26_tags', {}); }
  getTags(repoId) { return this.getAllTags()[String(repoId)] || []; }
  setTags(repoId, tags) {
    const all = this.getAllTags();
    all[String(repoId)] = [...new Set(tags.map(t => t.trim()).filter(Boolean))];
    this.set('gitrep26_tags', all);
  }
  addTag(repoId, tag) {
    const tags = this.getTags(repoId);
    if (!tags.includes(tag)) tags.push(tag);
    this.setTags(repoId, tags);
    return tags;
  }
  removeTag(repoId, tag) {
    this.setTags(repoId, this.getTags(repoId).filter(t => t !== tag));
  }

  /* ─── Collections [{id,name,notes,repoIds,created}] ─── */
  getCollections() { return this.get('gitrep26_collections', []); }
  saveCollections(list) { this.set('gitrep26_collections', list); }
  createCollection(name, notes = '') {
    const list = this.getCollections();
    const c = {
      id: 'col_' + Date.now(),
      name: name || 'Untitled',
      notes: notes || '',
      repoIds: [],
      created: Date.now()
    };
    list.push(c);
    this.saveCollections(list);
    return c;
  }
  updateCollection(id, patch) {
    const list = this.getCollections().map(c => c.id === id ? { ...c, ...patch } : c);
    this.saveCollections(list);
  }
  deleteCollection(id) {
    this.saveCollections(this.getCollections().filter(c => c.id !== id));
  }
  toggleInCollection(colId, repoId) {
    const list = this.getCollections();
    const c = list.find(x => x.id === colId);
    if (!c) return;
    const i = c.repoIds.indexOf(repoId);
    if (i >= 0) c.repoIds.splice(i, 1); else c.repoIds.push(repoId);
    this.saveCollections(list);
  }

  /* ─── Monitor { [repoId]: { full_name, lastPushed, lastChecked, lastRelease } } ─── */
  getMonitor() { return this.get('gitrep26_monitor', {}); }
  setMonitor(map) { this.set('gitrep26_monitor', map); }
  isMonitored(id) { return !!this.getMonitor()[String(id)]; }
  toggleMonitor(repo) {
    const m = this.getMonitor();
    const k = String(repo.id);
    if (m[k]) delete m[k];
    else {
      m[k] = {
        id: repo.id,
        full_name: repo.full_name,
        lastPushed: repo.pushed_at || repo.updated_at,
        lastChecked: Date.now(),
        notified: false
      };
    }
    this.setMonitor(m);
    return !!m[k];
  }

  /* ─── Compare selection ─── */
  getCompare() { return this.get('gitrep26_compare', []); }
  setCompare(ids) { this.set('gitrep26_compare', ids.slice(0, 3)); }
  toggleCompare(id) {
    let ids = this.getCompare();
    if (ids.includes(id)) ids = ids.filter(x => x !== id);
    else if (ids.length < 3) ids.push(id);
    this.setCompare(ids);
    return ids;
  }

  /* ─── IndexedDB helpers ─── */
  async saveRepos(repos) {
    if (!this.db) await this.init();
    if (!this.db) return;
    const tx = this.db.transaction('repos', 'readwrite');
    const store = tx.objectStore('repos');
    repos.forEach(r => store.put(r));
    return new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
  }
  async getRepos() {
    if (!this.db) await this.init();
    if (!this.db) return [];
    return new Promise((res, rej) => {
      const r = this.db.transaction('repos', 'readonly').objectStore('repos').getAll();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => rej(r.error);
    });
  }
  async setCache(key, data, ttl = 3600000) {
    if (!this.db) await this.init();
    if (!this.db) return;
    const tx = this.db.transaction('cache', 'readwrite');
    tx.objectStore('cache').put({ key, data, exp: Date.now() + ttl });
    return new Promise(res => { tx.oncomplete = () => res(); });
  }
  async getCache(key) {
    if (!this.db) await this.init();
    if (!this.db) return null;
    return new Promise(res => {
      const r = this.db.transaction('cache', 'readonly').objectStore('cache').get(key);
      r.onsuccess = () => {
        const v = r.result;
        if (v && v.exp > Date.now()) res(v.data); else res(null);
      };
      r.onerror = () => res(null);
    });
  }
  async clearCache() {
    if (!this.db) await this.init();
    if (!this.db) return;
    const tx = this.db.transaction('cache', 'readwrite');
    tx.objectStore('cache').clear();
    return new Promise(res => { tx.oncomplete = () => res(); });
  }

  async setTranslation(key, value) {
    if (!this.db) await this.init();
    const tx = this.db.transaction('translations', 'readwrite');
    tx.objectStore('translations').put({ key, value, ts: Date.now() });
    return new Promise(res => { tx.oncomplete = () => res(); });
  }
  async getTranslation(key) {
    if (!this.db) await this.init();
    return new Promise(res => {
      const r = this.db.transaction('translations', 'readonly').objectStore('translations').get(key);
      r.onsuccess = () => res(r.result?.value || null);
      r.onerror = () => res(null);
    });
  }

  exportData() {
    return {
      version: 4,
      app: 'GITREP26',
      exported: new Date().toISOString(),
      settings: this.getSettings(),
      favorites: this.getFavorites(),
      history: this.getHistory(),
      searches: this.getSearchHistory(),
      collections: this.getCollections(),
      tags: this.getAllTags(),
      monitor: this.getMonitor(),
      compare: this.getCompare()
    };
  }

  importData(data) {
    if (data.settings) {
      const t = data.settings.token || this.getToken();
      this.saveSettings({ ...data.settings, token: t });
      if (t) this.saveToken(t);
    }
    if (data.favorites) this.set('gitrep26_favs', data.favorites);
    if (data.history) this.set('gitrep26_history', data.history);
    if (data.searches) this.set('gitrep26_searches', data.searches);
    if (data.collections) this.saveCollections(data.collections);
    if (data.tags) this.set('gitrep26_tags', data.tags);
    if (data.monitor) this.setMonitor(data.monitor);
  }
}

export const storage = new Storage();
window.storage = storage;
