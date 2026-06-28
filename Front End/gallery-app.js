(function () {
  "use strict";

  const state = {
    step: "category",
    category: null,
    siteId: null,
    folder: null,
    lightboxIndex: 0,
    lightboxItems: [],
  };

  const CATEGORY_LABELS = {
    intangible: "Intangible Cultural Heritage",
    natural: "Natural Heritage",
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setState(patch) {
    Object.assign(state, patch);
    render();
  }

  function goCategory(category) {
    setState({ step: "sites", category, siteId: null, folder: null });
  }

  function goSite(siteId) {
    setState({ step: "site", siteId, folder: null });
  }

  function goFolder(folder) {
    setState({ step: "media", folder });
  }

  function goBack() {
    if (state.step === "media") {
      setState({ step: "site", folder: null });
    } else if (state.step === "site") {
      setState({ step: "sites", siteId: null, folder: null });
    } else if (state.step === "sites") {
      setState({
        step: "category",
        category: null,
        siteId: null,
        folder: null,
      });
    }
  }

  function renderBreadcrumb() {
    const parts = [
      `<button type="button" class="gal-crumb-btn${state.step === "category" ? " is-current" : ""}" data-crumb="home"></button>`,
    ];

    if (state.category) {
      parts.push('<span class="gal-crumb-sep">/</span>');
      parts.push(
        `<button type="button" class="gal-crumb-btn${state.step === "sites" ? " is-current" : ""}" data-crumb="category">${escapeHtml(CATEGORY_LABELS[state.category])}</button>`,
      );
    }

    if (state.siteId) {
      const site = getSiteById(state.siteId);
      parts.push('<span class="gal-crumb-sep">/</span>');
      parts.push(
        `<button type="button" class="gal-crumb-btn${state.step === "site" ? " is-current" : ""}" data-crumb="site">${escapeHtml(site?.name || "Site")}</button>`,
      );
    }

    if (state.folder) {
      const folderLabels = {
        photos: "Photographs",
        videos: "Videos",
        links: "External Media",
        timeline: "Timeline",
      };
      parts.push('<span class="gal-crumb-sep">/</span>');
      parts.push(
        `<span class="gal-crumb-btn is-current">${folderLabels[state.folder] || state.folder}</span>`,
      );
    }

    return `<nav class="gal-crumb" aria-label="Gallery navigation">${parts.join("")}</nav>`;
  }

  function bindBreadcrumb(container) {
    container.querySelectorAll("[data-crumb]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.crumb;
        if (target === "home")
          setState({
            step: "category",
            category: null,
            siteId: null,
            folder: null,
          });
        if (target === "category" && state.category)
          setState({ step: "sites", siteId: null, folder: null });
        if (target === "site" && state.siteId)
          setState({ step: "site", folder: null });
      });
    });
  }

  function renderCategoryView() {
    const intangible = getCategoryStats("intangible");
    const natural = getCategoryStats("natural");

    return `
      <div class="gal-view">
        <div class="gal-category-grid">
          <button type="button" class="gal-category-card gal-category-card--intangible" data-category="intangible">
            <h3 class="gal-category-name">Intangible Cultural Heritage</h3>
          </button>
          <button type="button" class="gal-category-card gal-category-card--natural" data-category="natural">
            <h3 class="gal-category-name">Natural Heritage</h3>
          </button>
        </div>
      </div>`;
  }

  function renderSitesView() {
    const sites = getSitesByCategory(state.category);
    const label = CATEGORY_LABELS[state.category];

    const folders = sites
      .map((site) => {
        const stats = getSiteStats(site.id);
        return `
          <button type="button" class="gal-heritage-folder" data-site="${site.id}">
            <div class="gal-folder-visual">
              <div class="gal-folder-tab"></div>
              <div class="gal-folder-body">
                <img class="gal-folder-cover" src="${escapeHtml(site.cover)}" alt="" loading="lazy" />
                <div class="gal-folder-shade"></div>
                <div class="gal-folder-counts">
                  ${stats.photos ? `<span>${stats.photos} Photos</span>` : ""}
                  ${stats.videos ? `<span>${stats.videos} Videos</span>` : ""}
                  ${stats.links ? `<span>${stats.links} Links</span>` : ""}
                </div>
              </div>
            </div>
            <h3 class="gal-folder-name">${escapeHtml(site.name)}</h3>
            <p class="gal-folder-location">${escapeHtml(site.location)}</p>
          </button>`;
      })
      .join("");

    return `
      <div class="gal-view">
        <p class="gal-step-label">Step 2</p>
        <h2 class="gal-step-title">${escapeHtml(label)}</h2>
        <p class="gal-step-desc">Open a heritage folder to view its photographs, videos, and archives.</p>
        <div class="gal-folder-grid">${folders}</div>
      </div>`;
  }

  function renderSiteView() {
    const site = getSiteById(state.siteId);
    if (!site) return renderCategoryView();

    const stats = getSiteStats(site.id);
    const festival = getFestivalForSite(site.id);
    const subfolders = [];

    if (stats.photos > 0) {
      subfolders.push(`
        <button type="button" class="gal-subfolder gal-subfolder--photos" data-folder="photos">
          <span class="gal-subfolder-icon">📷</span>
          <span class="gal-subfolder-label">Photographs</span>
          <span class="gal-subfolder-count">${stats.photos} items</span>
        </button>`);
    }

    if (stats.videos > 0) {
      subfolders.push(`
        <button type="button" class="gal-subfolder gal-subfolder--videos" data-folder="videos">
          <span class="gal-subfolder-icon">🎬</span>
          <span class="gal-subfolder-label">Videos</span>
          <span class="gal-subfolder-count">${stats.videos} items</span>
        </button>`);
    }

    if (stats.links > 0) {
      subfolders.push(`
        <button type="button" class="gal-subfolder gal-subfolder--links" data-folder="links">
          <span class="gal-subfolder-icon">🔗</span>
          <span class="gal-subfolder-label">External Media</span>
          <span class="gal-subfolder-count">${stats.links} links</span>
        </button>`);
    }

    if (festival) {
      subfolders.push(`
        <button type="button" class="gal-subfolder gal-subfolder--timeline" data-folder="timeline">
          <span class="gal-subfolder-icon">📅</span>
          <span class="gal-subfolder-label">Festival Timeline</span>
          <span class="gal-subfolder-count">${festival.timeline.length} milestones</span>
        </button>`);
    }

    return `
      <div class="gal-view">
        <div class="gal-site-header">
          <img class="gal-site-cover" src="${escapeHtml(site.cover)}" alt="${escapeHtml(site.name)}" loading="lazy" />
          <div>
            <p class="gal-step-label">${escapeHtml(site.categoryLabel)}</p>
            <h2 class="gal-site-name">${escapeHtml(site.name)}</h2>
            <p class="gal-site-desc">${escapeHtml(site.description)}</p>
            <p class="gal-site-location">📍 ${escapeHtml(site.location)}</p>
          </div>
        </div>
        <p class="gal-step-label">Step 3</p>
        <h3 class="gal-step-title" style="font-size:1.5rem;margin-bottom:1.25rem;">Open a folder</h3>
        <div class="gal-subfolder-grid">${subfolders.join("")}</div>
      </div>`;
  }

  function renderMediaView() {
    const site = getSiteById(state.siteId);
    if (!site) return "";

    if (state.folder === "timeline") {
      return renderTimelineView(site);
    }

    const typeMap = { photos: "photo", videos: "video", links: "link" };
    const type = typeMap[state.folder];
    const items = getSiteMedia(site.id).filter((m) => m.type === type);

    const folderTitles = {
      photos: "Photographs",
      videos: "Videos",
      links: "External Media",
    };

    if (items.length === 0) {
      return `
        <div class="gal-view">
          <div class="gal-media-toolbar">
            <button type="button" class="gal-back-btn" data-back>← Back to folders</button>
          </div>
          <div class="gal-empty">
            <div class="gal-empty-icon">📁</div>
            <p>This folder is empty.</p>
          </div>
        </div>`;
    }

    const grid = items
      .map((item, index) => {
        if (item.type === "photo") {
          return `
            <button type="button" class="gal-media-item" data-index="${index}" aria-label="${escapeHtml(item.title)}">
              <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.title)}" loading="lazy" />
            </button>`;
        }
        if (item.type === "video") {
          return `
            <button type="button" class="gal-media-item" data-index="${index}" aria-label="${escapeHtml(item.title)}">
              <img src="${escapeHtml(site.cover)}" alt="" loading="lazy" />
              <span class="gal-media-item-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>
            </button>`;
        }
        return `
          <button type="button" class="gal-media-item" data-index="${index}" aria-label="${escapeHtml(item.title)}">
            <div class="gal-link-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              <span>${escapeHtml(item.title)}</span>
            </div>
          </button>`;
      })
      .join("");

    return `
      <div class="gal-view">
        <div class="gal-media-toolbar">
          <button type="button" class="gal-back-btn" data-back>← Back to folders</button>
          <span class="gal-media-count">${items.length} ${folderTitles[state.folder]?.toLowerCase() || "items"}</span>
        </div>
        <h3 class="gal-step-title" style="font-size:1.5rem;margin-bottom:1rem;">${escapeHtml(site.name)} — ${folderTitles[state.folder]}</h3>
        <div class="gal-media-grid">${grid}</div>
      </div>`;
  }

  function renderTimelineView(site) {
    const festival = getFestivalForSite(site.id);
    if (!festival) return "";

    const highlights = festival.highlights
      .map(
        (h) =>
          `<div class="gal-timeline-highlight"><strong>${escapeHtml(h.title)}</strong><span>${escapeHtml(h.text)}</span></div>`,
      )
      .join("");

    const timeline = festival.timeline
      .map(
        (t) => `
        <article class="gal-timeline-row">
          <time>${escapeHtml(t.period)}</time>
          <h4>${escapeHtml(t.title)}</h4>
          <p>${escapeHtml(t.text)}</p>
        </article>`,
      )
      .join("");

    const refs = festival.references
      .map(
        (r) =>
          `<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.label)}</a>`,
      )
      .join("");

    return `
      <div class="gal-view">
        <div class="gal-media-toolbar">
          <button type="button" class="gal-back-btn" data-back>← Back to folders</button>
        </div>
        <h3 class="gal-step-title" style="font-size:1.5rem;margin-bottom:0.5rem;">${escapeHtml(festival.name)}</h3>
        <p class="gal-step-desc" style="margin-bottom:1.5rem;">Culmination: ${escapeHtml(festival.culmination)} · ${escapeHtml(festival.location)}</p>
        <div class="gal-timeline-highlights">${highlights}</div>
        <h4 style="font-family:'Cormorant Garamond',serif;font-size:1.25rem;margin-bottom:1rem;">Historical Timeline</h4>
        <div class="gal-timeline-compact">${timeline}</div>
        ${refs ? `<div class="gal-ref-links" style="margin-top:1.5rem;display:flex;flex-wrap:wrap;gap:0.5rem;">${refs}</div>` : ""}
      </div>`;
  }

  function bindViewEvents(container) {
    container.querySelectorAll("[data-category]").forEach((btn) => {
      btn.addEventListener("click", () => goCategory(btn.dataset.category));
    });

    container.querySelectorAll("[data-site]").forEach((btn) => {
      btn.addEventListener("click", () => goSite(btn.dataset.site));
    });

    container.querySelectorAll("[data-folder]").forEach((btn) => {
      btn.addEventListener("click", () => goFolder(btn.dataset.folder));
    });

    container.querySelectorAll("[data-back]").forEach((btn) => {
      btn.addEventListener("click", goBack);
    });

    container.querySelectorAll(".gal-media-item").forEach((btn) => {
      btn.addEventListener("click", () =>
        openMediaItem(parseInt(btn.dataset.index, 10)),
      );
    });

    bindBreadcrumb(container);
  }

  function openMediaItem(index) {
    const typeMap = { photos: "photo", videos: "video", links: "link" };
    const type = typeMap[state.folder];
    const items = getSiteMedia(state.siteId).filter((m) => m.type === type);
    const item = items[index];
    if (!item) return;

    if (item.type === "link") {
      window.open(item.src, "_blank", "noopener,noreferrer");
      return;
    }

    state.lightboxItems = items.filter(
      (i) => i.type === "photo" || i.type === "video",
    );
    state.lightboxIndex = state.lightboxItems.findIndex(
      (i) => i.id === item.id,
    );
    showLightbox();
  }

  function showLightbox() {
    const item = state.lightboxItems[state.lightboxIndex];
    const box = $("galLightbox");
    const media = $("galLightboxMedia");
    const title = $("galLightboxTitle");
    const meta = $("galLightboxMeta");
    if (!item || !box || !media) return;

    if (item.type === "photo") {
      media.innerHTML = `<img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.title)}" />`;
    } else {
      media.innerHTML = `<video src="${escapeHtml(item.src)}" controls autoplay playsinline></video>`;
    }

    title.textContent = item.title;
    meta.textContent = item.siteName;
    box.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    const box = $("galLightbox");
    const media = $("galLightboxMedia");
    if (media) {
      media.querySelector("video")?.pause();
      media.innerHTML = "";
    }
    box?.classList.remove("active");
    document.body.style.overflow = "";
  }

  function navigateLightbox(dir) {
    if (!state.lightboxItems.length) return;
    state.lightboxIndex =
      (state.lightboxIndex + dir + state.lightboxItems.length) %
      state.lightboxItems.length;
    showLightbox();
  }

  function render() {
    const explorer = $("galExplorer");
    const panel = $("galPanel");
    if (!explorer || !panel) return;

    explorer.dataset.category = state.category || "";
    explorer.dataset.view = state.step;

    let html = "";
    if (state.step !== "category") html += renderBreadcrumb();
    if (state.step === "category") html += renderCategoryView();
    else if (state.step === "sites") html += renderSitesView();
    else if (state.step === "site") html += renderSiteView();
    else if (state.step === "media") html += renderMediaView();

    panel.innerHTML = html;
    bindViewEvents(panel);
  }

  function initLightbox() {
    $("galLightboxClose")?.addEventListener("click", closeLightbox);
    $("galLightboxPrev")?.addEventListener("click", () => navigateLightbox(-1));
    $("galLightboxNext")?.addEventListener("click", () => navigateLightbox(1));
    $("galLightbox")?.addEventListener("click", (e) => {
      if (e.target.id === "galLightbox") closeLightbox();
    });
    document.addEventListener("keydown", (e) => {
      if (!$("galLightbox")?.classList.contains("active")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") navigateLightbox(-1);
      if (e.key === "ArrowRight") navigateLightbox(1);
    });
  }

  async function loadHeaderAndFooter() {
    try {
      const headerResponse = await fetch("header.html");
      const headerDoc = new DOMParser().parseFromString(
        await headerResponse.text(),
        "text/html",
      );
      const header = headerDoc.querySelector("header");
      const headerStyles = headerDoc.querySelector("style");
      if (headerStyles) document.head.appendChild(headerStyles.cloneNode(true));
      if (header) {
        $("header-placeholder")?.replaceWith(header);
      }

      const headerScript = Array.from(headerDoc.scripts).find(
        (s) => !s.src,
      )?.textContent;
      if (headerScript) {
        const s = document.createElement("script");
        s.textContent = headerScript;
        document.body.appendChild(s);
      }

      const navRoutes = {
        home: "index.html",
        about: "about_us.html",
        games: "game.html",
        "3d": "3dexplore.html",
        gallery: "gallery.html",
      };

      document.querySelectorAll(".site-nav__link").forEach((link) => {
        const key = link.getAttribute("data-nav");
        if (key && navRoutes[key]) link.href = navRoutes[key];
        if (key === "gallery") link.classList.add("is-active");
      });

      document.getElementById("site-header-utilities")?.remove();

      const authActions = document.createElement("div");
      authActions.className =
        "visitor-auth-actions hidden lg:flex items-center";
      authActions.innerHTML = `
        <a href="login.html" class="visitor-auth-btn visitor-auth-login">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/>
          </svg>
          <span>Login</span>
        </a>
        <a href="userregistration.html" class="visitor-auth-btn visitor-auth-register">
          <span>Register</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        </a>`;
      document.querySelector(".site-header__end")?.appendChild(authActions);

      const mobileAuth = document.getElementById("site-mobile-auth");
      if (mobileAuth) {
        mobileAuth.innerHTML = `
          <a href="login.html" class="site-mobile-nav__link">Login</a>
          <a href="userregistration.html" class="site-mobile-nav__link">Register</a>`;
      }

      document
        .querySelectorAll(".site-nav__link, .site-mobile-nav__link")
        .forEach((link) => {
          if (link.getAttribute("data-nav") === "gallery")
            link.classList.add("is-active");
        });

      document.getElementById("settings-modal")?.remove();

      if (typeof window.initSiteHeader === "function") {
        window.initSiteHeader();
      }

      const footerResponse = await fetch("footer.html");
      const footerDoc = new DOMParser().parseFromString(
        await footerResponse.text(),
        "text/html",
      );
      const footerStyles = footerDoc.querySelector("style");
      if (footerStyles) document.head.appendChild(footerStyles.cloneNode(true));
      const footer = footerDoc.querySelector("footer");
      if (footer) $("footer-placeholder")?.replaceWith(footer);

      const footerScript = Array.from(footerDoc.scripts).find(
        (s) => !s.src,
      )?.textContent;
      if (footerScript) {
        const s = document.createElement("script");
        s.textContent = footerScript;
        document.body.appendChild(s);
      }

      if (typeof window.initSiteFooter === "function") {
        window.initSiteFooter("gallery");
      }
    } catch (err) {
      console.warn("Header/footer load failed:", err);
    }
  }

  function init() {
    initLightbox();
    render();
    loadHeaderAndFooter();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
