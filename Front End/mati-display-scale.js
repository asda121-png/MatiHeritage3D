/**
 * Match published site density to local Live Server (Front End/index.html).
 * Skips localhost so local browser zoom is not double-scaled.
 */
(function () {
  "use strict";

  const host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return;
  if (/admin\.html$/i.test(location.pathname)) return;

  const SCALE = "0.8";
  document.documentElement.style.zoom = SCALE;

  function refreshMapLayout() {
    const map = window.matiMapInstance;
    if (map && typeof map.invalidateSize === "function") {
      map.invalidateSize();
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    refreshMapLayout();
    setTimeout(refreshMapLayout, 200);
    setTimeout(refreshMapLayout, 800);
  });
})();
