/**
 * Shared Realtime hub for Mati Heritage 3D.
 * Keeps admin, visitors, and players synced on sites, media, and leaderboard.
 */
const MatiHeritageRealtime = (() => {
  const TOPIC = {
    sites: "heritage:sites",
    media: "heritage:media",
    catalog: "heritage:catalog",
    leaderboard: "heritage:leaderboard",
    any: "heritage:any",
  };

  const listeners = new Map();
  let started = false;
  let channel = null;
  let debounceTimer = null;
  let pending = {
    sites: false,
    media: false,
    leaderboard: false,
  };

  function client() {
    return typeof MatiSupabase !== "undefined"
      ? MatiSupabase.getClient?.()
      : null;
  }

  function on(topic, handler) {
    if (!topic || typeof handler !== "function") return () => {};
    if (!listeners.has(topic)) listeners.set(topic, new Set());
    listeners.get(topic).add(handler);
    return () => off(topic, handler);
  }

  function off(topic, handler) {
    listeners.get(topic)?.delete(handler);
  }

  function emit(topic, detail) {
    listeners.get(topic)?.forEach((handler) => {
      try {
        handler(detail);
      } catch (error) {
        console.warn("MatiHeritageRealtime listener error:", error);
      }
    });
  }

  function flush() {
    debounceTimer = null;
    const detail = {
      sites: pending.sites,
      media: pending.media,
      leaderboard: pending.leaderboard,
      at: Date.now(),
    };
    pending = { sites: false, media: false, leaderboard: false };

    if (detail.sites) emit(TOPIC.sites, detail);
    if (detail.media) emit(TOPIC.media, detail);
    if (detail.sites || detail.media) emit(TOPIC.catalog, detail);
    if (detail.leaderboard) emit(TOPIC.leaderboard, detail);
    emit(TOPIC.any, detail);
  }

  function queue(kind) {
    pending[kind] = true;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flush, 350);
  }

  function start() {
    if (started) return true;
    const sb = client();
    if (!sb) return false;

    started = true;
    channel = sb
      .channel("mati-heritage-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "heritage_sites" },
        () => queue("sites"),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "heritage_media" },
        () => queue("media"),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leaderboard_entries" },
        () => queue("leaderboard"),
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("MatiHeritageRealtime: channel error");
        }
      });

    return true;
  }

  function stop() {
    const sb = client();
    if (sb && channel) {
      try {
        sb.removeChannel(channel);
      } catch {
        /* ignore */
      }
    }
    channel = null;
    started = false;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  /** Auto-start when Supabase is ready; safe to call many times. */
  function ensure() {
    if (started) return true;
    if (typeof MatiSupabase === "undefined" || !MatiSupabase.isConfigured?.()) {
      return false;
    }
    return start();
  }

  const BUMP_KEY = "matiHeritageCatalogBump";
  let catalogChannel = null;

  function getCatalogChannel() {
    if (catalogChannel) return catalogChannel;
    if (typeof BroadcastChannel === "undefined") return null;
    try {
      catalogChannel = new BroadcastChannel("mati-heritage-catalog");
      catalogChannel.addEventListener("message", (event) => {
        if (event?.data?.type === "catalog") {
          emit(TOPIC.catalog, {
            sites: true,
            media: true,
            leaderboard: false,
            at: Date.now(),
            source: "broadcast",
          });
        }
      });
    } catch {
      catalogChannel = null;
    }
    return catalogChannel;
  }

  /** Notify other tabs/windows (admin → visitor) that catalog data changed. */
  function bumpCatalog(detail = {}) {
    const payload = {
      type: "catalog",
      sites: true,
      media: true,
      at: Date.now(),
      ...detail,
    };
    try {
      getCatalogChannel()?.postMessage(payload);
    } catch {
      /* ignore */
    }
    try {
      localStorage.setItem(BUMP_KEY, String(payload.at));
    } catch {
      /* ignore */
    }
    // Same-tab listeners (rare) also refresh.
    emit(TOPIC.catalog, {
      sites: true,
      media: true,
      leaderboard: false,
      at: payload.at,
      source: "local-bump",
    });
  }

  function listenForCatalogBump() {
    getCatalogChannel();
    window.addEventListener("storage", (event) => {
      if (event.key !== BUMP_KEY || event.newValue == null) return;
      emit(TOPIC.catalog, {
        sites: true,
        media: true,
        leaderboard: false,
        at: Number(event.newValue) || Date.now(),
        source: "storage-bump",
      });
    });
  }

  return {
    TOPIC,
    BUMP_KEY,
    on,
    off,
    emit,
    start,
    stop,
    ensure,
    bumpCatalog,
    listenForCatalogBump,
    isStarted: () => started,
  };
})();

window.MatiHeritageRealtime = MatiHeritageRealtime;

// Kick off as soon as the script loads on pages that already have Supabase.
MatiHeritageRealtime.listenForCatalogBump();
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    MatiHeritageRealtime.ensure();
  });
} else {
  MatiHeritageRealtime.ensure();
}
