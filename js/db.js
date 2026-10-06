/* IndexedDB persistence — prompts, components, settings */
const DB_NAME = "atelier-prompt-studio";
const DB_VERSION = 2;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("prompts")) {
        const store = db.createObjectStore("prompts", { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
        store.createIndex("category", "category");
      }
      if (!db.objectStoreNames.contains("components")) {
        db.createObjectStore("components", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("profiles")) {
        db.createObjectStore("profiles", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("aborted"));
  });
}

const Store = {
  async all(storeName) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },
  async put(storeName, value) {
    const db = await openDb();
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value);
    await txDone(tx);
    return value;
  },
  async del(storeName, id) {
    const db = await openDb();
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(id);
    await txDone(tx);
  },
  async getMeta(key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("meta", "readonly");
      const req = tx.objectStore("meta").get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => reject(req.error);
    });
  },
  async setMeta(key, value) {
    const db = await openDb();
    const tx = db.transaction("meta", "readwrite");
    tx.objectStore("meta").put({ key, value });
    await txDone(tx);
  },
  async clearAll() {
    const db = await openDb();
    const tx = db.transaction(["prompts", "components", "meta", "profiles"], "readwrite");
    tx.objectStore("prompts").clear();
    tx.objectStore("components").clear();
    tx.objectStore("meta").clear();
    if (db.objectStoreNames.contains("profiles")) tx.objectStore("profiles").clear();
    await txDone(tx);
  }
};

function uid() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

async function ensureSeed() {
  const seeded = await Store.getMeta("seeded");
  if (seeded) return;
  const now = Date.now();
  for (const p of seedPrompts()) {
    const id = uid();
    await Store.put("prompts", {
      id,
      title: p.title,
      category: p.category,
      tags: p.tags,
      folder: p.folder,
      favorite: p.favorite,
      body: p.body,
      meta: { origin: "seed" },
      versions: [{ id: uid(), body: p.body, note: "Initial", createdAt: now }],
      createdAt: now,
      updatedAt: now
    });
  }
  for (const c of seedComponents()) {
    await Store.put("components", { id: uid(), ...c, createdAt: now });
  }
  for (const profile of seedProfiles()) {
    await Store.put("profiles", { id: uid(), ...profile, createdAt: now });
  }
  await Store.setMeta("seeded", true);
}

async function ensureProfiles() {
  const existing = await Store.all("profiles");
  if (existing.length) return;
  const now = Date.now();
  for (const profile of seedProfiles()) {
    await Store.put("profiles", { id: uid(), ...profile, createdAt: now });
  }
}
