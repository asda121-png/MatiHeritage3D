(function () {
  "use strict";

  const GALLERY_HOME = document.documentElement.dataset.galleryHome || null;
  const INITIAL_CATEGORY = document.documentElement.dataset.galleryCategory || null;

  function getInitialState() {
    const base = {
      lightboxIndex: 0,
      lightboxItems: [],
    };

    if (INITIAL_CATEGORY === "intangible" || INITIAL_CATEGORY === "natural") {
      return {
        ...base,
        step: "sites",
        category: INITIAL_CATEGORY,
        siteId: null,
        folder: null,
      };
    }

    return {
      ...base,
      step: "category",
      category: null,
      siteId: null,
      folder: null,
    };
  }

  const state = getInitialState();

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

  const PILE_PRINT_FILTERS = ["none", "sepia(0.35)", "grayscale(1)", "saturate(1.2)"];

  function getPilePhotos(siteId, cover) {
    const fromMedia = getSiteMedia(siteId)
      .filter((item) => item.type === "photo")
      .map((item) => item.src);
    const photos = [...new Set([cover, ...fromMedia])];
    while (photos.length < 4) photos.push(cover);
    return photos.slice(0, 4);
  }

  function renderPilePrints(siteId, cover) {
    return getPilePhotos(siteId, cover)
      .map((src, index) => {
        return `
          <span
            class="gal-print gal-print--${index + 1}"
            style="--print-i: ${index}"
            data-print="${index}"
          >
            <img
              src="${escapeHtml(src)}"
              alt=""
              loading="lazy"
              style="filter: ${PILE_PRINT_FILTERS[index]}"
            />
          </span>`;
      })
      .join("");
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
    } else if (state.step === "sites" && GALLERY_HOME) {
      window.location.href = getGalleryHomeUrl();
    } else if (state.step === "sites") {
      setState({
        step: "category",
        category: null,
        siteId: null,
        folder: null,
      });
    }
  }

  function getGalleryHomeUrl() {
    if (!GALLERY_HOME) return null;
    const base = GALLERY_HOME.split("#")[0];
    return `${base}#heritage-collections`;
  }

  function scrollToHeritageCollections() {
    const target = document.getElementById("heritage-collections");
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleGalleryHomeHash() {
    if (INITIAL_CATEGORY) return;
    if (location.hash === "#heritage-collections") {
      const scroll = () => scrollToHeritageCollections();
      requestAnimationFrame(scroll);
      setTimeout(scroll, 120);
    }
  }

  function renderCategoryBack() {
    if (!GALLERY_HOME || state.step === "category") return "";
    const homeUrl = getGalleryHomeUrl();
    return `
      <div class="gal-category-nav">
        <a href="${escapeHtml(homeUrl)}" class="gal-category-back">← Choose a Heritage Collection</a>
      </div>`;
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
        links: "Videos",
        recordings: "Recordings",
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
        if (target === "home") {
          if (GALLERY_HOME) {
            window.location.href = getGalleryHomeUrl();
            return;
          }
          setState({
            step: "category",
            category: null,
            siteId: null,
            folder: null,
          });
        }
        if (target === "category" && state.category)
          setState({ step: "sites", siteId: null, folder: null });
        if (target === "site" && state.siteId)
          setState({ step: "site", folder: null });
      });
    });
  }

  function renderCategoryView() {
    function categoryCard(key, desc, image, reverse, href) {
      const reverseClass = reverse ? " is-reverse" : "";
      const panel = `
          <div class="gal-category-panel">
            <div class="gal-category-media">
              <img class="gal-category-image" src="${escapeHtml(image)}" alt="" loading="lazy" />
              <div class="gal-category-media-edge" aria-hidden="true"></div>
            </div>
            <div class="gal-category-body">
              <h3 class="gal-category-name">${escapeHtml(CATEGORY_LABELS[key])}</h3>
              <p class="gal-category-desc">${escapeHtml(desc)}</p>
              <span class="gal-category-cta">Explore collection</span>
            </div>
          </div>`;

      if (href) {
        return `<a class="gal-category-card gal-category-card--${key}${reverseClass}" href="${escapeHtml(href)}">${panel}</a>`;
      }

      return `<button type="button" class="gal-category-card gal-category-card--${key}${reverseClass}" data-category="${key}">${panel}</button>`;
    }

    return `
      <div class="gal-view gal-view--category">
        <div class="gal-category-stage" id="heritage-collections">
          <div class="gal-category-intro">
            <p class="gal-category-eyebrow">Mati Heritage Gallery</p>
            <h2 class="gal-category-prompt">Choose a Heritage Collection</h2>
            <p class="gal-category-hint">
              Select <strong>Intangible Cultural Heritage</strong> or
              <strong>Natural Heritage</strong> below to begin exploring.
            </p>
          </div>
          <div class="gal-category-grid">
            ${categoryCard(
              "intangible",
              "Festivals, music, and creative works passed down through generations.",
              "data/Intangible Cultural Heritage/Sambuokan Festival/Photographs/0M8A2763.jpg",
              false,
              "galleryintangibleculturalheritage.html",
            )}
            <div class="gal-category-or" aria-hidden="true"><span>or</span></div>
            ${categoryCard(
              "natural",
              "Islands, coastlines, and landscapes that define Mati's natural legacy.",
              "data/Natural Heritage/Pujada Island/Photographs/pujada island 1.jpg",
              true,
              "gallerynaturalheritage.html",
            )}
          </div>
        </div>
      </div>`;
  }

  function renderSitesView() {
    const sites = getSitesByCategory(state.category);
    const isShowcase =
      state.category === "intangible" || state.category === "natural";

    if (isShowcase) {
      const piles = sites
        .map((site, index) => {
          const order = String(index + 1).padStart(2, "0");
          return `
          <div
            class="gal-pile"
            data-site="${site.id}"
            role="button"
            tabindex="0"
            style="--pile-i: ${index}"
          >
            <span class="gal-pile-num" aria-hidden="true">${order}</span>
            <div class="gal-pile-stack-wrap">
              <div class="gal-pile-stack-shadow" aria-hidden="true"></div>
              <div class="gal-pile-stack" aria-hidden="true">
                ${renderPilePrints(site.id, site.cover)}
              </div>
            </div>
            <div class="gal-pile-caption">
              <h3 class="gal-pile-title">${escapeHtml(site.albumName || site.name)}</h3>
              <span class="gal-pile-cta">Open collection <span aria-hidden="true">→</span></span>
            </div>
          </div>`;
        })
        .join("");

      return `
        <div class="gal-view gal-view--sites gal-view--album">
          <div class="gal-album-stage">
            <p class="gal-album-hint">
              <span class="gal-album-hint-chip">Drag prints to sift</span>
              <span class="gal-album-hint-chip">Double-click to open</span>
            </p>
            <div class="gal-album-grid">${piles}</div>
          </div>
        </div>`;
    }

    const folders = sites
      .map((site) => {
        return `
          <button type="button" class="gal-heritage-folder" data-site="${site.id}">
            <div class="gal-folder-visual">
              <div class="gal-folder-tab"></div>
              <div class="gal-folder-body">
                <img class="gal-folder-cover" src="${escapeHtml(site.cover)}" alt="" loading="lazy" />
                <div class="gal-folder-shade"></div>
              </div>
            </div>
            <div class="gal-folder-meta">
              <h3 class="gal-folder-name">${escapeHtml(site.name)}</h3>
              <p class="gal-folder-location">${escapeHtml(site.location)}</p>
            </div>
          </button>`;
      })
      .join("");

    return `
      <div class="gal-view gal-view--sites">
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

    if (stats.videos > 0 || site.category === "natural") {
      subfolders.push(`
        <button type="button" class="gal-subfolder gal-subfolder--videos" data-folder="videos">
          <span class="gal-subfolder-icon">🎬</span>
          <span class="gal-subfolder-label">Videos</span>
          <span class="gal-subfolder-count">${stats.videos} ${stats.videos === 1 ? "item" : "items"}</span>
        </button>`);
    }

    if (stats.links > 0) {
      subfolders.push(`
        <button type="button" class="gal-subfolder gal-subfolder--links" data-folder="links">
          <span class="gal-subfolder-icon">🎬</span>
          <span class="gal-subfolder-label">Videos</span>
          <span class="gal-subfolder-count">${stats.links} videos</span>
        </button>`);
    }

    if (stats.recordings > 0) {
      subfolders.push(`
        <button type="button" class="gal-subfolder gal-subfolder--recordings" data-folder="recordings">
          <span class="gal-subfolder-icon">🎵</span>
          <span class="gal-subfolder-label">Recordings</span>
          <span class="gal-subfolder-count">${stats.recordings} recordings</span>
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
      <div class="gal-view gal-view--site">
        <div class="gal-site-header">
          <img class="gal-site-cover" src="${escapeHtml(site.cover)}" alt="${escapeHtml(site.name)}" loading="lazy" />
          <div>
            <h2 class="gal-site-name">${escapeHtml(site.name)}</h2>
            <p class="gal-site-desc">${escapeHtml(site.description)}</p>
            ${site.location ? `<p class="gal-site-location">📍 ${escapeHtml(site.location)}</p>` : ""}
          </div>
        </div>
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

    const typeMap = { photos: "photo", videos: "video", links: "link", recordings: "audio" };
    const type = typeMap[state.folder];
    const items = getSiteMedia(site.id).filter((m) => m.type === type);

    const folderTitles = {
      photos: "Photographs",
      videos: "Videos",
      links: "Videos",
      recordings: "recordings",
    };

    if (items.length === 0) {
      return `
        <div class="gal-view gal-view--media">
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
        if (item.type === "audio") {
          return `
            <button type="button" class="gal-media-item gal-media-item--audio" data-index="${index}" aria-label="${escapeHtml(item.title)}">
              <img src="${escapeHtml(site.cover)}" alt="" loading="lazy" />
              <span class="gal-media-item-audio" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg></span>
              <span class="gal-media-item-audio-label">${escapeHtml(item.title)}</span>
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
      <div class="gal-view gal-view--media">
        <div class="gal-media-toolbar">
          <button type="button" class="gal-back-btn" data-back>← Back to folders</button>
          <span class="gal-media-count">${items.length} ${folderTitles[state.folder]?.toLowerCase() || "items"}</span>
        </div>
        <div class="gal-media-grid">${grid}</div>
      </div>`;
  }

  function renderTimelineView(site) {
    const festival = getFestivalForSite(site.id);
    if (!festival) return "";

    const entries = festival.timeline
      .map((entry, index) => {
        const side = index % 2 === 0 ? "left" : "right";
        const yearClass =
          entry.period.length > 8 || /[a-z]/i.test(entry.period)
            ? " gal-timeline-chapter-year--long"
            : "";

        const visual = entry.image
          ? `
          <figure class="gal-timeline-chapter-figure">
            <img src="${escapeHtml(entry.image)}" alt="${escapeHtml(entry.imageAlt || entry.title)}" loading="lazy" decoding="async" />
            ${entry.imageCaption ? `<figcaption>${escapeHtml(entry.imageCaption)}</figcaption>` : ""}
          </figure>`
          : `<div class="gal-timeline-chapter-placeholder" aria-hidden="true"></div>`;

        return `
        <article class="gal-timeline-chapter gal-timeline-chapter--${side}" id="timeline-${index}" style="--entry-i: ${index}">
          <div class="gal-timeline-chapter-row">
            <div class="gal-timeline-chapter-copy">
              <p class="gal-timeline-chapter-year${yearClass}">${escapeHtml(entry.period)}</p>
              <h3 class="gal-timeline-chapter-title">${escapeHtml(entry.title)}</h3>
              <p class="gal-timeline-chapter-text">${escapeHtml(entry.text)}</p>
            </div>
            <div class="gal-timeline-chapter-axis" aria-hidden="true">
              <span class="gal-timeline-node"></span>
            </div>
            <div class="gal-timeline-chapter-visual">
              ${visual}
            </div>
          </div>
        </article>`;
      })
      .join("");

    const highlights = festival.highlights
      .map(
        (item) => `
        <article class="gal-timeline-highlight-card">
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.text)}</p>
        </article>`,
      )
      .join("");

    const refs = festival.references
      .map(
        (ref) =>
          `<a href="${escapeHtml(ref.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ref.label)}</a>`,
      )
      .join("");

    return `
      <div class="gal-view gal-view--timeline" style="--timeline-accent: ${festival.accent}">
        <div class="gal-media-toolbar">
          <button type="button" class="gal-back-btn" data-back>← Back to folders</button>
        </div>

        <header class="gal-timeline-hero" id="gal-timeline-top">
          <p class="gal-timeline-eyebrow">Festival Timeline</p>
          <h2 class="gal-timeline-hero-title">A Walk through Time</h2>
          <p class="gal-timeline-hero-name">${escapeHtml(festival.name)}</p>
          <dl class="gal-timeline-meta">
            <div><dt>Culmination</dt><dd>${escapeHtml(festival.culmination)}</dd></div>
            <div><dt>Theme</dt><dd>${escapeHtml(festival.theme)}</dd></div>
          </dl>
          <p class="gal-timeline-etymology">${escapeHtml(festival.etymology)}</p>
        </header>

        <section class="gal-timeline-walk" aria-label="Historical timeline">
          ${entries}
        </section>

        <section class="gal-timeline-highlights-section" aria-label="Festival highlights">
          <h3 class="gal-timeline-section-title">Festival Highlights</h3>
          <div class="gal-timeline-highlights-grid">${highlights}</div>
        </section>

        ${refs ? `<nav class="gal-timeline-refs" aria-label="References">${refs}</nav>` : ""}
      </div>`;
  }

  function bindPileInteraction(container) {
    container.querySelectorAll(".gal-pile").forEach((pile) => {
      const siteId = pile.dataset.site;

      pile.querySelectorAll(".gal-print").forEach((print) => {
        let startX = 0;
        let startY = 0;
        let baseX = 0;
        let baseY = 0;
        let moved = false;

        print.addEventListener("pointerdown", (event) => {
          event.stopPropagation();
          moved = false;
          startX = event.clientX;
          startY = event.clientY;
          print.setPointerCapture(event.pointerId);
          print.classList.add("is-dragging");
          pile.classList.add("is-sifting");
        });

        print.addEventListener("pointermove", (event) => {
          if (!print.hasPointerCapture(event.pointerId)) return;
          const dx = event.clientX - startX;
          const dy = event.clientY - startY;
          if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
          print.style.setProperty("--print-dx", `${baseX + dx}px`);
          print.style.setProperty("--print-dy", `${baseY + dy}px`);
          print.style.setProperty(
            "--print-drag-rot",
            `${Math.max(-10, Math.min(10, dx * 0.05))}deg`,
          );
        });

        const endDrag = (event) => {
          if (!print.hasPointerCapture(event.pointerId)) return;
          baseX += event.clientX - startX;
          baseY += event.clientY - startY;
          print.style.setProperty("--print-dx", `${baseX}px`);
          print.style.setProperty("--print-dy", `${baseY}px`);
          print.style.setProperty("--print-drag-rot", "0deg");
          print.releasePointerCapture(event.pointerId);
          print.classList.remove("is-dragging");
          pile.classList.remove("is-sifting");
        };

        print.addEventListener("pointerup", endDrag);
        print.addEventListener("pointercancel", endDrag);

        print.addEventListener("dblclick", (event) => {
          event.stopPropagation();
          goSite(siteId);
        });

        print.addEventListener("click", (event) => {
          if (moved) event.stopPropagation();
        });
      });

      pile.querySelector(".gal-pile-title")?.addEventListener("click", (event) => {
        event.stopPropagation();
        goSite(siteId);
      });

      pile.querySelector(".gal-pile-cta")?.addEventListener("click", (event) => {
        event.stopPropagation();
        goSite(siteId);
      });

      pile.addEventListener("dblclick", (event) => {
        if (!event.target.closest(".gal-print")) goSite(siteId);
      });

      pile.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goSite(siteId);
        }
      });
    });
  }

  function bindViewEvents(container) {
    container.querySelectorAll("[data-category]").forEach((btn) => {
      btn.addEventListener("click", () => goCategory(btn.dataset.category));
    });

    container.querySelectorAll("[data-site]:not(.gal-pile)").forEach((btn) => {
      btn.addEventListener("click", () => goSite(btn.dataset.site));
    });

    bindPileInteraction(container);

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
    const typeMap = { photos: "photo", videos: "video", links: "link", recordings: "audio" };
    const type = typeMap[state.folder];
    const items = getSiteMedia(state.siteId).filter((m) => m.type === type);
    const item = items[index];
    if (!item) return;

    if (item.type === "link") {
      window.open(item.src, "_blank", "noopener,noreferrer");
      return;
    }

    state.lightboxItems = items.filter(
      (i) => i.type === "photo" || i.type === "video" || i.type === "audio",
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
    } else if (item.type === "audio") {
      media.innerHTML = `<audio src="${escapeHtml(item.src)}" controls autoplay></audio>`;
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
      media.querySelector("audio")?.pause();
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
    if (state.step !== "category") {
      html += renderCategoryBack();
      html += renderBreadcrumb();
    }
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

  function revealExplorer() {
    const explorer = document.getElementById("galExplorer");
    if (
      !explorer ||
      !document.querySelector(".gal-hero") ||
      explorer.classList.contains("gal-explorer--unveiled")
    ) {
      return;
    }

    explorer.classList.add("gal-explorer--unveiled");

    requestAnimationFrame(() => {
      explorer.querySelectorAll(".gal-category-card").forEach((el, i) => {
        el.style.setProperty("--gal-i", i + 1);
        el.classList.add("gal-reveal");
      });
    });
  }

  function initHeroReveal() {
    const hero = document.querySelector(".gal-hero");
    if (!hero) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      hero.classList.remove("gal-hero--loading");
      hero.classList.add("gal-hero--revealed");
      revealExplorer();
      return;
    }

    const stage = hero.querySelector(".gal-hero-stage");
    const images = Array.from(hero.querySelectorAll(".gal-hero-stage img"));
    const waitForImage = (img) =>
      new Promise((resolve) => {
        const finish = async () => {
          if (typeof img.decode === "function") {
            try {
              await img.decode();
            } catch (_err) {
              /* decoded or unsupported */
            }
          }
          resolve();
        };

        if (img.complete && img.naturalWidth > 0) {
          finish();
          return;
        }

        const done = () => {
          img.removeEventListener("load", done);
          img.removeEventListener("error", done);
          finish();
        };
        img.addEventListener("load", done);
        img.addEventListener("error", done);
      });

    const revealHero = () => {
      if (!hero.classList.contains("gal-hero--loading")) return;

      images.forEach((img) => {
        void img.offsetWidth;
      });
      void hero.offsetWidth;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            hero.classList.remove("gal-hero--loading");
            hero.classList.add("gal-hero--revealed");

            if (stage) {
              stage.addEventListener(
                "animationend",
                (event) => {
                  if (event.animationName === "galHeroStageReveal") {
                    revealExplorer();
                  }
                },
                { once: true },
              );
            } else {
              setTimeout(revealExplorer, 1700);
            }
          }, 60);
        });
      });
    };

    const minDelay = new Promise((resolve) => setTimeout(resolve, 120));
    const imagesReady = Promise.all(images.map(waitForImage));

    Promise.all([minDelay, imagesReady]).then(revealHero);

    setTimeout(revealHero, 6000);
  }

  function init() {
    if (document.querySelector(".gal-hero")) {
      window.scrollTo(0, 0);
    }
    initLightbox();
    if (document.querySelector(".gal-hero")) initHeroReveal();
    render();
    handleGalleryHomeHash();
    loadHeaderAndFooter();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
