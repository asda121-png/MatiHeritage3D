/** Client-side file storage for admin uploads (IndexedDB) */
const MatiAdminUploads = (() => {
  const DB_NAME = "MatiAdminUploads";
  const STORE = "files";
  const PREFIX = "admin-upload://";

  let dbPromise = null;

  function openDb() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          req.result.createObjectStore(STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  function toUri(key) {
    return `${PREFIX}${key}`;
  }

  function parseKey(uri) {
    if (!uri || !uri.startsWith(PREFIX)) return null;
    return uri.slice(PREFIX.length);
  }

  function isUploadUri(uri) {
    return Boolean(uri && uri.startsWith(PREFIX));
  }

  async function put(key, file) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(file, key);
      tx.oncomplete = () => resolve(toUri(key));
      tx.onerror = () => reject(tx.error);
    });
  }

  async function get(keyOrUri) {
    const key = parseKey(keyOrUri) || keyOrUri;
    if (!key) return null;
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function createObjectUrl(keyOrUri) {
    const blob = await get(keyOrUri);
    return blob ? URL.createObjectURL(blob) : null;
  }

  async function remove(keyOrUri) {
    const key = parseKey(keyOrUri) || keyOrUri;
    if (!key) return;
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  return {
    put,
    get,
    createObjectUrl,
    remove,
    isUploadUri,
    parseKey,
    toUri,
  };
})();
