/**
 * Tracks public page visits using a cookie-backed visitor session id.
 * Each browser gets mati_visitor_session (30 days) + localStorage fallback.
 */
const MatiVisitorAnalytics = (() => {
  const COOKIE = "mati_visitor_session";
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
  const DEBOUNCE_MS = 30_000;

  function readCookie(name) {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`),
    );
    return match ? decodeURIComponent(match[1]) : null;
  }

  function writeCookie(name, value, maxAge) {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
  }

  function newSessionId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
      const rand = (Math.random() * 16) | 0;
      const val = ch === "x" ? rand : (rand & 0x3) | 0x8;
      return val.toString(16);
    });
  }

  function isValidSessionId(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(value || ""),
    );
  }

  function getSessionId() {
    let id = readCookie(COOKIE);
    if (!isValidSessionId(id)) {
      try {
        id = localStorage.getItem(COOKIE);
      } catch {
        id = null;
      }
    }
    if (!isValidSessionId(id)) {
      id = newSessionId();
    }
    writeCookie(COOKIE, id, COOKIE_MAX_AGE);
    try {
      localStorage.setItem(COOKIE, id);
    } catch {
      /* ignore */
    }
    return id;
  }

  function shouldTrackPage() {
    const path = location.pathname.toLowerCase();
    if (path.includes("admin.html")) return false;
    if (path.includes("/back end/")) return false;
    return true;
  }

  async function trackCurrentPage() {
    if (!shouldTrackPage()) return null;
    if (
      typeof MatiSupabase === "undefined" ||
      !MatiSupabase.isConfigured?.() ||
      typeof MatiSupabaseApi === "undefined" ||
      typeof MatiSupabaseApi.recordPageVisit !== "function"
    ) {
      return null;
    }

    const pagePath = `${location.pathname}${location.search}`;
    const debounceKey = `mati_visit_${pagePath}`;
    let lastTracked = 0;
    try {
      lastTracked = Number(sessionStorage.getItem(debounceKey) || 0);
    } catch {
      /* ignore */
    }
    if (Date.now() - lastTracked < DEBOUNCE_MS) return null;

    try {
      sessionStorage.setItem(debounceKey, String(Date.now()));
    } catch {
      /* ignore */
    }

    return MatiSupabaseApi.recordPageVisit(getSessionId(), pagePath);
  }

  function boot() {
    void trackCurrentPage();
  }

  return {
    getSessionId,
    trackCurrentPage,
    boot,
  };
})();

window.MatiVisitorAnalytics = MatiVisitorAnalytics;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => MatiVisitorAnalytics.boot());
} else {
  MatiVisitorAnalytics.boot();
}
