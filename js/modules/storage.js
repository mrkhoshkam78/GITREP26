/**
 * GPE V2 — LocalStorage + IndexedDB
 */
const DB = 'GPE_V2';
const VER = 1;

class Storage {
  constructor() {
    this.db = null;
  }
  async init() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, VER);
      r.onerror = () => rej(r.error);
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onupgradeneeded = e => {
        const db = e.target.result;
        ['repos','cache','favorites','history','collections','searches'].forEach(s => {
          if (!db.objectStoreNames.contains(s)) {
            db.createObjectStore(s, { keyPath: s === 'repos' || s === 'favorites' || s === 'history' ? 'id' : 'key' });
          }
        });
      };
    });
  }
  get(key, fb = null) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; }
  }
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  getSettings() {
    return this.get('gpe_settings', {
      theme: 'dark', language: 'en', token: '', anim: 'full',
      dataSource: 'local', imageQuality: 'high'
    });
  }
  saveSettings(s) { this.set('gpe_settings', s); }
  getFavorites() { return this.get('gpe_favs', []); }
  toggleFav(id) {
    const f = this.getFavorites();
    const i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.push(id);
    this.set('gpe_favs', f);
    return f;
  }
  isFav(id) { return this.getFavorites().includes(id); }
  getHistory() { return this.get('gpe_history', []); }
  addHistory(repo) {
    let h = this.getHistory().filter(r => r.id !== repo.id);
    h.unshift({ id: repo.id, name: repo.name, full_name: repo.full_name, avatar: repo.owner?.avatar_url, ts: Date.now() });
    this.set('gpe_history', h.slice(0, 50));
  }
  getSearchHistory() { return this.get('gpe_searches', []); }
  addSearch(q) {
    if (!q.trim()) return;
    let s = this.getSearchHistory().filter(x => x !== q);
    s.unshift(q);
    this.set('gpe_searches', s.slice(0, 20));
  }
  async saveRepos(repos) {
    if (!this.db) await this.init();
    const tx = this.db.transaction('repos', 'readwrite');
    const store = tx.objectStore('repos');
    repos.forEach(r => store.put(r));
    return new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
  }
  async getRepos() {
    if (!this.db) await this.init();
    return new Promise((res, rej) => {
      const r = this.db.transaction('repos','readonly').objectStore('repos').getAll();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => rej(r.error);
    });
  }
  async setCache(key, data, ttl = 3600000) {
    if (!this.db) await this.init();
    const tx = this.db.transaction('cache','readwrite');
    tx.objectStore('cache').put({ key, data, exp: Date.now() + ttl });
    return new Promise(res => { tx.oncomplete = () => res(); });
  }
  async getCache(key) {
    if (!this.db) await this.init();
    return new Promise((res) => {
      const r = this.db.transaction('cache','readonly').objectStore('cache').get(key);
      r.onsuccess = () => {
        const v = r.result;
        if (v && v.exp > Date.now()) res(v.data); else res(null);
      };
      r.onerror = () => res(null);
    });
  }
  async clearCache() {
    if (!this.db) await this.init();
    const tx = this.db.transaction('cache','readwrite');
    tx.objectStore('cache').clear();
    return new Promise(res => { tx.oncomplete = () => res(); });
  }
  exportData() {
    return {
      version: 2, exported: new Date().toISOString(),
      settings: this.getSettings(),
      favorites: this.getFavorites(),
      history: this.getHistory(),
      searches: this.getSearchHistory()
    };
  }
  importData(data) {
    if (data.settings) this.saveSettings(data.settings);
    if (data.favorites) this.set('gpe_favs', data.favorites);
    if (data.history) this.set('gpe_history', data.history);
    if (data.searches) this.set('gpe_searches', data.searches);
  }
}
export const storage = new Storage();
window.storage = storage;
