/**
 * Admin file uploads — Supabase Storage when configured, IndexedDB local fallback.
 * Deployed sites should always return public https Storage URLs.
 */
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

  function isHttpUrl(uri) {
    return /^https?:\/\//i.test(String(uri || ""));
  }

  function supabaseUploadsEnabled() {
    return (
      typeof MatiSupabase !== "undefined" &&
      MatiSupabase.isConfigured() &&
      typeof MatiSupabaseApi !== "undefined" &&
      typeof MatiSupabaseApi.uploadSiteMedia === "function"
    );
  }

  function inferTypeFromKey(key) {
    const lower = String(key || "").toLowerCase();
    if (lower.includes("/map") || lower.endsWith("/map") || /\/map(\/|$)/.test(lower)) {
      return "map";
    }
    if (lower.includes("/model") || lower.endsWith(".glb")) return "model3d";
    if (lower.includes("/video") || /\.(mp4|webm|mov)$/i.test(lower)) return "video";
    if (lower.includes("/audio") || /\.(mp3|wav|ogg|m4a)$/i.test(lower)) return "audio";
    return "photo";
  }

  function siteIdFromKey(key) {
    const first = String(key || "").split("/")[0];
    return first || "uploads";
  }

  async function putLocal(key, file) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(file, key);
      tx.oncomplete = () => resolve(toUri(key));
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * @param {string} key storage key (also used for IndexedDB fallback)
   * @param {File|Blob} file
   * @param {{ type?: string, siteId?: string, onProgress?: (pct:number, loadedBytes?:number)=>void }} [options]
   */
  async function put(key, file, options = {}) {
    const type = options.type || inferTypeFromKey(key);
    const siteId = options.siteId || siteIdFromKey(key);
    const fileSize = file.size || 0;

    if (supabaseUploadsEnabled()) {
      console.log('Uploading to Supabase:', { siteId, type, key, fileSize });
      try {
        const publicUrl = await MatiSupabaseApi.uploadSiteMedia(
          siteId,
          type,
          file,
          {
            onProgress: options.onProgress,
            signal: options.signal,
          },
        );
        if (!publicUrl) {
          throw new Error("Supabase Storage did not return a public URL.");
        }
        console.log('Supabase upload successful:', publicUrl);
        return publicUrl;
      } catch (error) {
        console.error('Supabase upload failed, falling back to IndexedDB:', error);
        // Fall through to IndexedDB fallback
      }
    } else {
      console.log('Supabase uploads not enabled, using IndexedDB fallback');
    }

    // IndexedDB fallback with simulated progress
    if (typeof options.onProgress === "function") {
      const loaded15 = Math.round(fileSize * 0.15);
      options.onProgress(15, loaded15);
      await new Promise((resolve) => setTimeout(resolve, 80));
      const loaded55 = Math.round(fileSize * 0.55);
      options.onProgress(55, loaded55);
    }
    const uri = await putLocal(key, file);
    if (typeof options.onProgress === "function") options.onProgress(100, fileSize);
    console.log('IndexedDB upload successful:', uri);
    return uri;
  }

  async function get(keyOrUri) {
    if (isHttpUrl(keyOrUri)) return null;
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
    if (isHttpUrl(keyOrUri)) return String(keyOrUri);
    const blob = await get(keyOrUri);
    return blob ? URL.createObjectURL(blob) : null;
  }

  async function remove(keyOrUri) {
    if (isHttpUrl(keyOrUri)) return;
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
    isHttpUrl,
    parseKey,
    toUri,
  };
})();
