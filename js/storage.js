/**
 * Local Storage & IndexedDB Manager
 */

const DB_NAME = 'GitHubProjectExplorer';
const DB_VERSION = 1;
const STORE_REPOS = 'repos';
const STORE_SETTINGS = 'settings';
const STORE_FAVORITES = 'favorites';

class StorageManager {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_REPOS)) {
          db.createObjectStore(STORE_REPOS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_FAVORITES)) {
          db.createObjectStore(STORE_FAVORITES, { keyPath: 'id' });
        }
      };
    });
  }

  // LocalStorage helpers
  getLocal(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  }

  setLocal(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Settings
  getSettings() {
    return this.getLocal('gpe_settings', {
      theme: 'dark',
      language: 'en',
      githubToken: '',
      dataSource: 'local'
    });
  }

  saveSettings(settings) {
    this.setLocal('gpe_settings', settings);
  }

  // Favorites
  getFavorites() {
    return this.getLocal('gpe_favorites', []);
  }

  toggleFavorite(repoId) {
    const favs = this.getFavorites();
    const idx = favs.indexOf(repoId);
    if (idx >= 0) favs.splice(idx, 1);
    else favs.push(repoId);
    this.setLocal('gpe_favorites', favs);
    return favs;
  }

  isFavorite(repoId) {
    return this.getFavorites().includes(repoId);
  }

  // IndexedDB repos
  async saveRepos(repos) {
    if (!this.db) await this.init();
    const tx = this.db.transaction(STORE_REPOS, 'readwrite');
    const store = tx.objectStore(STORE_REPOS);
    for (const repo of repos) {
      store.put(repo);
    }
    return new Promise((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }

  async getAllRepos() {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_REPOS, 'readonly');
      const store = tx.objectStore(STORE_REPOS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async clearRepos() {
    if (!this.db) await this.init();
    const tx = this.db.transaction(STORE_REPOS, 'readwrite');
    tx.objectStore(STORE_REPOS).clear();
    return new Promise((res) => { tx.oncomplete = () => res(); });
  }
}

const storage = new StorageManager();
window.storage = storage;
