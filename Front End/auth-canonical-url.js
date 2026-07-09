/**
 * On production hosts, normalize auth page URLs to /Front%20End/page.html
 * so relative CSS/JS and the 3D login preview load correctly.
 */
(function () {
  const host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return;

  const path = location.pathname;
  const lower = path.toLowerCase();
  const canonicalPrefix = "/Front%20End/";
  const lowerPrefix = "/front%20end/";

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
