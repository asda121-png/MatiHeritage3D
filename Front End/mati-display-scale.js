/**
 * Match published site density to local Live Server at ~75% browser zoom.
 * Skips localhost so local dev is not double-scaled.
 */
(function () {
  "use strict";

  const host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return;
  if (/admin\.html$/i.test(location.pathname)) return;

  document.documentElement.style.zoom = "0.75";
})();
