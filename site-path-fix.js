/**
 * Production path fix — load with absolute URL: /site-path-fix.js
 * Must run before CSS/JS so relative assets resolve under /Front%20End/.
 */
(function () {
  const host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return;

  const canonicalPrefix = "/Front%20End/";
  const canonicalBase = `${location.origin}${canonicalPrefix}`;

  if (!document.querySelector("base[data-mati-base]")) {
    const base = document.createElement("base");
    base.href = canonicalBase;
    base.setAttribute("data-mati-base", "1");
    document.head.insertBefore(base, document.head.firstChild);
  }

  const path = location.pathname;
  const lower = path.toLowerCase();
  const lowerPrefix = "/front%20end/";

  if (path === "/" || lower === "/index.html") {
    location.replace(
      `${canonicalPrefix}index.html${location.search}${location.hash}`,
    );
    return;
  }

  if (lower.startsWith(lowerPrefix) && !path.startsWith(canonicalPrefix)) {
    const rest = path.slice(lowerPrefix.length);
    const suffix =
      rest && !rest.includes(".") && !rest.endsWith("/") ? ".html" : "";
    location.replace(
      `${canonicalPrefix}${rest}${suffix}${location.search}${location.hash}`,
    );
    return;
  }

  if (path.startsWith(canonicalPrefix)) {
    const rest = path.slice(canonicalPrefix.length);
    if (rest && !rest.includes(".") && !rest.endsWith("/")) {
      location.replace(
        `${canonicalPrefix}${rest}.html${location.search}${location.hash}`,
      );
    }
  }
})();
