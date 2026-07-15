(function () {
  "use strict";

  const NAV_ROUTES = {
    home: "index.html",
    about: "about_us.html",
    games: "game.html",
    "3d": "3dexplore.html",
    gallery: "gallery.html",
  };

  async function injectHeader(pageKey) {
    const headerResponse = await fetch("header.html");
    const headerHtml = await headerResponse.text();
    const headerDoc = new DOMParser().parseFromString(headerHtml, "text/html");
    const header = headerDoc.querySelector("header");
    const headerStyles = headerDoc.querySelector("style");
    const settingsModal = headerDoc.getElementById("settings-modal");

    if (headerStyles) document.head.appendChild(headerStyles.cloneNode(true));
    if (header) {
      document.getElementById("header-placeholder")?.replaceWith(header);
    }

    const headerScript = Array.from(headerDoc.scripts).find(
      (s) => !s.src,
    )?.textContent;
    if (headerScript) {
      const s = document.createElement("script");
      s.textContent = headerScript;
      document.body.appendChild(s);
    }

    const brandTitle = document.querySelector(".site-brand__title");
    if (brandTitle) brandTitle.textContent = "Mati Heritage 3D";

    const brandTagline = document.querySelector(".site-brand__tagline");
    if (brandTagline) brandTagline.textContent = "Visitor Portal";

    const brandLink = document.querySelector(".site-brand");
    if (brandLink) brandLink.href = "index.html";

    document.querySelectorAll(".site-nav__link").forEach((link) => {
      const key = link.getAttribute("data-nav");
      if (key && NAV_ROUTES[key]) link.href = NAV_ROUTES[key];
    });

    document
      .querySelectorAll(".site-nav__link, .site-mobile-nav__link")
      .forEach((link) => {
        if (link.getAttribute("data-nav") === pageKey) {
          link.classList.add("is-active");
        }
      });

    // Move the settings modal from the fetched content to the main document body
    if (settingsModal) document.body.appendChild(settingsModal);

    if (typeof window.initSiteHeader === "function") {
      window.initSiteHeader();
    }
    // Note: initGlobalSettings() is called by the individual pages after this runs.
  }

  async function injectFooter(pageKey) {
    const footerResponse = await fetch("footer.html");
    const footerDoc = new DOMParser().parseFromString(
      await footerResponse.text(),
      "text/html",
    );
    const footerStyles = footerDoc.querySelector("style");
    if (footerStyles) document.head.appendChild(footerStyles.cloneNode(true));
    const footer = footerDoc.querySelector("footer");
    if (footer)
      document.getElementById("footer-placeholder")?.replaceWith(footer);

    const footerScript = Array.from(footerDoc.scripts).find(
      (s) => !s.src,
    )?.textContent;
    if (footerScript) {
      const s = document.createElement("script");
      s.textContent = footerScript;
      document.body.appendChild(s);
    }

    if (typeof window.initSiteFooter === "function") {
      window.initSiteFooter(pageKey);
    }
  }

  async function loadVisitorHeaderAndFooter(pageKey) {
    try {
      await injectHeader(pageKey);
      await injectFooter(pageKey);
    } catch (err) {
      console.warn("Header/footer load failed:", err);
    }
  }

  window.loadVisitorHeaderAndFooter = loadVisitorHeaderAndFooter;
})();
