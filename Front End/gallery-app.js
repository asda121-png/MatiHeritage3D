(function () {
  "use strict";

  const GALLERY_EMBED = Boolean(document.querySelector(".admin-gallery-host"));
  const GALLERY_HOME = GALLERY_EMBED
    ? null
    : document.documentElement.dataset.galleryHome || null;
  const INITIAL_CATEGORY =
    document.documentElement.dataset.galleryCategory || null;
  const MEDIA_BATCH_SIZE = 12;

  function getInitialState() {
    const base = {
      lightboxIndex: 0,
      lightboxItems: [],
      mediaVisibleCount: MEDIA_BATCH_SIZE,
      siteEditing: false,
      siteDraft: null,
      mediaSelectMode: false,
      selectedMediaIds: [],
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

  function resolveSiteById(siteId) {
    if (GALLERY_EMBED && typeof MatiAdminStore !== "undefined") {
      return MatiAdminStore.getSiteById(siteId) || getSiteById(siteId);
    }
    return getSiteById(siteId);
  }

  function resolveSitesByCategory(category) {
    if (GALLERY_EMBED && typeof MatiAdminStore !== "undefined") {
      return MatiAdminStore.getSitesByCategory(category);
    }
    return getSitesByCategory(category);
  }

  function resolveSiteMedia(siteId) {
    if (GALLERY_EMBED && typeof MatiAdminStore !== "undefined") {
      return MatiAdminStore.getSiteMedia(siteId);
    }
    return getSiteMedia(siteId);
  }

  function readSharedMediaOrder(siteId, type) {
    try {
      // Admin drag order is stored here; same-browser visitor pages can mirror it.
      const raw = localStorage.getItem("matiAdminHeritageStore");
      if (!raw) return null;
      const store = JSON.parse(raw);
      const order = store?.mediaOrder?.[`${siteId}:${type}`];
      return Array.isArray(order) && order.length ? order : null;
    } catch {
      return null;
    }
  }

  function applyMediaOrder(items, orderedIds) {
    if (!orderedIds?.length) return items;
    const rank = new Map(orderedIds.map((id, index) => [id, index]));
    return [...items].sort((a, b) => {
      const ra = rank.has(a.id) ? rank.get(a.id) : orderedIds.length;
      const rb = rank.has(b.id) ? rank.get(b.id) : orderedIds.length;
      if (ra !== rb) return ra - rb;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
  }

  function resolveOrderedSiteMedia(siteId, type) {
    if (
      GALLERY_EMBED &&
      typeof MatiAdminStore !== "undefined" &&
      MatiAdminStore.getOrderedSiteMedia
    ) {
      return MatiAdminStore.getOrderedSiteMedia(siteId, type);
    }

    const items = resolveSiteMedia(siteId).filter((item) => item.type === type);
    const sharedOrder = readSharedMediaOrder(siteId, type);
    if (sharedOrder?.length) {
      return applyMediaOrder(items, sharedOrder);
    }

    const sortValues = items
      .map((item) => Number(item.sortOrder))
      .filter((value) => Number.isFinite(value));
    const hasMeaningfulSort =
      sortValues.some((value) => value > 0) || new Set(sortValues).size > 1;

    if (!hasMeaningfulSort) return items;

    return [...items].sort((a, b) => {
      const bySort = (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
      if (bySort) return bySort;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
  }

  function resolveSiteStats(siteId) {
    if (GALLERY_EMBED && typeof MatiAdminStore !== "undefined") {
      const stats = MatiAdminStore.getSiteStats(siteId);
      return {
        ...stats,
        recordings: stats.recordings ?? stats.audio ?? 0,
      };
    }
    return getSiteStats(siteId);
  }

  function folderToMediaType(folder) {
    if (folder === "photos") return "photo";
    if (folder === "videos") return "video";
    if (folder === "recordings") return "audio";
    if (folder === "links") return "link";
    return null;
  }

  function folderToPresetType(folder) {
    return folderToMediaType(folder);
  }

  function galleryMediaActionLabel(siteId, folder) {
    const mediaType = folderToMediaType(folder);
    if (
      mediaType &&
      typeof MatiAdminStore !== "undefined" &&
      MatiAdminStore.siteMediaHasAdminEdits(siteId, mediaType)
    ) {
      return "Update";
    }
    return "Manage";
  }

  const SELECTABLE_MEDIA_FOLDERS = new Set([
    "photos",
    "videos",
    "links",
    "recordings",
  ]);

  function folderSupportsBulkSelect(folder) {
    return SELECTABLE_MEDIA_FOLDERS.has(folder);
  }

  function mediaDeleteNoun(folder, count) {
    const nouns = {
      photos: count === 1 ? "photograph" : "photographs",
      videos: count === 1 ? "video" : "videos",
      links: count === 1 ? "video" : "videos",
      recordings: count === 1 ? "recording" : "recordings",
    };
    return nouns[folder] || (count === 1 ? "item" : "items");
  }

  function clearMediaSelection() {
    state.mediaSelectMode = false;
    state.selectedMediaIds = [];
  }

  function toggleMediaSelection(mediaId) {
    const ids = new Set(state.selectedMediaIds);
    if (ids.has(mediaId)) ids.delete(mediaId);
    else ids.add(mediaId);
    state.selectedMediaIds = [...ids];
    render();
  }

  function renderGalleryMediaSelectActions(folder) {
    if (!GALLERY_EMBED || !folderSupportsBulkSelect(folder)) return "";

    const count = state.selectedMediaIds.length;
    if (state.mediaSelectMode) {
      return `
        <button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-media-select-cancel>Cancel</button>
        <button
          type="button"
          class="admin-btn admin-btn--danger admin-btn--sm"
          data-media-delete-selected
          ${count ? "" : "disabled"}
        >Delete${count ? ` (${count})` : ""}</button>`;
    }

    return `<button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-media-select-toggle>Select</button>`;
  }

  function renderGalleryMediaManageBtn(site, folder) {
    if (!GALLERY_EMBED || typeof MatiAdminStore === "undefined") return "";
    const mediaType = folderToMediaType(folder);
    if (!mediaType) return "";

    return `
      <button
        type="button"
        class="admin-btn admin-btn--primary admin-btn--sm gal-media-manage-btn"
        data-manage-media="${mediaType}"
      >${galleryMediaActionLabel(site.id, folder)}</button>`;
  }

  function renderGalleryMediaToolbar(site, folder, countHtml) {
    return `
      <div class="gal-media-toolbar${GALLERY_EMBED ? " gal-media-toolbar--admin" : ""}">
        <div class="gal-media-toolbar__actions">
          ${countHtml}
          ${renderGalleryMediaSelectActions(folder)}
          ${renderGalleryMediaManageBtn(site, folder)}
        </div>
      </div>`;
  }

  function clearSiteEditState() {
    state.siteEditing = false;
    state.siteDraft = null;
  }

  function isSiteDraftDirty() {
    if (!state.siteDraft || !state.siteId) return false;
    const site = resolveSiteById(state.siteId);
    if (!site) return false;
    return (
      state.siteDraft.heritageCategory !== (site.heritageCategory || "") ||
      state.siteDraft.name !== (site.name || "") ||
      state.siteDraft.description !== (site.description || "")
    );
  }

  function gallerySiteActionLabel(siteId) {
    if (state.siteEditing && state.siteId === siteId) {
      return isSiteDraftDirty() ? "Update" : "Manage";
    }
    if (
      typeof MatiAdminStore !== "undefined" &&
      MatiAdminStore.siteHasAdminEdits(siteId)
    ) {
      return "Update";
    }
    return "Manage";
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function mediaUrl(src) {
    const value = String(src || "");
    if (/^https?:\/\//i.test(value)) return value;
    return encodeURI(value);
  }

  function linkifyCitation(text) {
    return String(text)
      .split(/(https?:\/\/[^\s]+)/g)
      .map((part) =>
        /^https?:\/\//.test(part)
          ? `<a href="${escapeHtml(part)}" target="_blank" rel="noopener noreferrer">${escapeHtml(part)}</a>`
          : escapeHtml(part),
      )
      .join("");
  }

  function parseYouTubeId(url) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes("youtu.be")) {
        return parsed.pathname.slice(1).split("/")[0] || null;
      }
      if (parsed.hostname.includes("youtube.com")) {
        if (parsed.pathname.startsWith("/embed/")) {
          return parsed.pathname.split("/")[2] || null;
        }
        return parsed.searchParams.get("v");
      }
    } catch {
      return null;
    }
    return null;
  }

  function isFacebookUrl(url) {
    try {
      const parsed = new URL(url);
      return (
        parsed.hostname.includes("facebook.com") ||
        parsed.hostname.includes("fb.watch")
      );
    } catch {
      return false;
    }
  }

  function isFacebookPostUrl(url) {
    return /\/share\/p\//i.test(url);
  }

  function getLinkEmbed(url) {
    const youtubeId = parseYouTubeId(url);
    if (youtubeId) {
      return {
        provider: "youtube",
        embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`,
      };
    }
    if (isFacebookUrl(url)) {
      if (isFacebookPostUrl(url)) {
        return {
          provider: "facebook",
          embedUrl: `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=false&width=1280`,
        };
      }
      return {
        provider: "facebook",
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=1280&height=720`,
      };
    }
    // Sketchfab 3D model embed
    if (url.includes("sketchfab.com")) {
      const sketchfabMatch = url.match(
        /sketchfab\.com\/models\/([a-zA-Z0-9\-]+)/,
      );
      if (sketchfabMatch) {
        return {
          provider: "sketchfab",
          embedUrl: `https://sketchfab.com/models/${sketchfabMatch[1]}/embed?autostart=1&ui_controls=1&ui_infos=1&ui_inspector=0&ui_help=0&ui_watermark=1`,
        };
      }
    }
    return null;
  }

  function isEmbeddableLink(item) {
    return item?.type === "link" && Boolean(getLinkEmbed(item.src));
  }

  function getLightboxItems(items) {
    return items.filter(
      (item) =>
        item.type === "photo" ||
        item.type === "video" ||
        item.type === "audio" ||
        isEmbeddableLink(item),
    );
  }

  function getYouTubeThumbnail(url) {
    const youtubeId = parseYouTubeId(url);
    return youtubeId
      ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
      : null;
  }

  const embedMetaCache = new Map();

  function getEmbedMeta(url) {
    if (embedMetaCache.has(url)) {
      const cached = embedMetaCache.get(url);
      return cached instanceof Promise ? cached : Promise.resolve(cached);
    }

    const promise = fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(url)}`,
    )
      .then((response) => (response.ok ? response.json() : {}))
      .then((data) => ({
        thumbnail: data.thumbnail_url || null,
        author: data.author_name || data.provider_name || null,
        authorUrl: data.author_url || data.provider_url || null,
        title: data.title || null,
      }))
      .catch(() => ({
        thumbnail: null,
        author: null,
        authorUrl: null,
        title: null,
      }))
      .then((meta) => {
        embedMetaCache.set(url, meta);
        return meta;
      });

    embedMetaCache.set(url, promise);
    return promise;
  }

  const PILE_PRINT_FILTERS = [
    "none",
    "sepia(0.35)",
    "grayscale(1)",
    "saturate(1.2)",
  ];

  function getPilePhotos(siteId, cover) {
    const fromMedia = resolveSiteMedia(siteId)
      .filter((item) => item.type === "photo")
      .map((item) => item.src);
    const photos = [...new Set([cover, ...fromMedia].filter(Boolean))];
    if (!photos.length) return [];
    while (photos.length < 4) photos.push(photos[0]);
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
    if (patch.step && patch.step !== "site") clearSiteEditState();
    if (patch.siteId !== undefined && patch.siteId !== state.siteId) {
      clearSiteEditState();
      clearMediaSelection();
    }
    if (patch.step !== undefined && patch.step !== "media") {
      clearMediaSelection();
    }
    if (patch.folder !== undefined && patch.folder !== state.folder) {
      clearMediaSelection();
    }
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
    setState({ step: "media", folder, mediaVisibleCount: MEDIA_BATCH_SIZE });
    if (
      GALLERY_EMBED &&
      typeof MatiAdminStore?.publishSiteMediaOrder === "function"
    ) {
      const type = folderToMediaType(folder);
      if (type && state.siteId) {
        void MatiAdminStore.publishSiteMediaOrder(state.siteId, type);
      }
    }
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
    if (state.step === "category") return "";

    if (GALLERY_EMBED) {
      const addCategory =
        state.category === "intangible" ? "intangible" : "natural";
      const addLabel =
        addCategory === "intangible"
          ? "Add intangible cultural heritage"
          : "Add natural heritage";
      return `
        <div class="gal-category-nav gal-category-nav--admin">
          <button type="button" class="gal-category-back" data-crumb="home">← Choose a Heritage Collection</button>
          <button type="button" class="admin-btn admin-btn--primary" data-admin-add-site-category="${addCategory}">
            <span aria-hidden="true">+</span>
            ${addLabel}
          </button>
        </div>`;
    }

    if (!GALLERY_HOME) return "";
    const homeUrl = getGalleryHomeUrl();
    return `
      <div class="gal-category-nav">
        <a href="${escapeHtml(homeUrl)}" class="gal-category-back">← Gallery</a>
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
      const site = resolveSiteById(state.siteId);
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

    const categoryIntro = GALLERY_EMBED
      ? `
          <div class="gal-category-intro gal-category-intro--admin">
            <h2 class="gal-category-prompt">Choose a Heritage Collection</h2>
          </div>`
      : `
          <div class="gal-category-intro">
            <h2 class="gal-category-prompt">Choose a Heritage Collection</h2>
            <p class="gal-category-hint">
              Select <strong>Intangible Cultural Heritage</strong> or
              <strong>Natural Heritage</strong> below to begin exploring.
            </p>
          </div>`;

    return `
      <div class="gal-view gal-view--category">
        <div class="gal-category-stage${GALLERY_EMBED ? " gal-category-stage--admin" : ""}" id="heritage-collections">
          ${categoryIntro}
          <div class="gal-category-grid">
            ${categoryCard(
              "intangible",
              "Festivals, music, and creative works passed down through generations.",
              "data/Intangible Cultural Heritage/Sambuokan Festival/Photographs/0M8A2763.jpg",
              false,
              GALLERY_EMBED ? null : "galleryintangibleculturalheritage.html",
            )}
            ${categoryCard(
              "natural",
              "Islands, coastlines, and landscapes that define Mati's natural legacy.",
              "data/Natural Heritage/Pujada Island/Photographs/pujada island 1.jpg",
              true,
              GALLERY_EMBED ? null : "gallerynaturalheritage.html",
            )}
          </div>
        </div>
      </div>`;
  }

  function renderSitesView() {
    const sites = [...resolveSitesByCategory(state.category)].sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), undefined, {
        sensitivity: "base",
      }),
    );
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
              ${site.heritageCategory ? `<span class="gal-pile-category">${escapeHtml(site.heritageCategory)}</span>` : ""}
              <h3 class="gal-pile-title">${escapeHtml(site.albumName || site.name)}</h3>
              <span class="gal-pile-cta">Open collection <span aria-hidden="true">→</span></span>
            </div>
          </div>`;
        })
        .join("");

      return `
        <div class="gal-view gal-view--sites gal-view--album">
          <div class="gal-album-stage">
            <div class="gal-album-grid">${piles}</div>
          </div>
        </div>`;
    }

    // Filter out sites that have no media for built heritage as well
    const sitesWithMedia = sites.filter((site) => {
      const media = resolveSiteMedia(site.id);
      return media && media.length > 0;
    });

    const folders = sitesWithMedia
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

  function renderSiteHeaderContent(site) {
    const editing =
      GALLERY_EMBED && state.siteEditing && state.siteId === site.id;
    const draft = state.siteDraft || {
      heritageCategory: site.heritageCategory || "",
      name: site.name || "",
      description: site.description || "",
    };

    if (editing) {
      return `
        <div class="gal-site-admin-fields">
          <div class="gal-site-admin-topbar">
            <label class="gal-site-admin-field gal-site-admin-field--type">
              <span class="gal-site-admin-label">Heritage type</span>
              <input
                type="text"
                class="gal-site-admin-input"
                id="gal-site-heritage-type"
                value="${escapeHtml(draft.heritageCategory)}"
              />
            </label>
            ${renderSiteAdminActions(site)}
          </div>
          <label class="gal-site-admin-field">
            <span class="gal-site-admin-label">Site name</span>
            <input
              type="text"
              class="gal-site-admin-input gal-site-admin-input--title"
              id="gal-site-name"
              value="${escapeHtml(draft.name)}"
            />
          </label>
          <label class="gal-site-admin-field gal-site-admin-field--desc">
            <span class="gal-site-admin-label">Description</span>
            <textarea
              class="gal-site-admin-textarea"
              id="gal-site-desc"
              rows="6"
            >${escapeHtml(draft.description)}</textarea>
          </label>
        </div>`;
    }

    const latitude = Number(site.lat);
    const longitude = Number(site.lng);
    const hasRealCoordinates =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      !(latitude === 0 && longitude === 0);
    const coordinates = hasRealCoordinates
      ? `<span class="gal-site-coordinates">Latitude ${latitude} · Longitude ${longitude}</span>`
      : "";

    return `
      <div class="gal-site-header__copy">
        <div class="gal-site-header__topbar">
          ${site.heritageCategory ? `<p class="gal-site-category">${escapeHtml(site.heritageCategory)}</p>` : "<span></span>"}
          ${renderSiteAdminActions(site)}
        </div>
        <h2 class="gal-site-name">${escapeHtml(site.name)}</h2>
        <p class="gal-site-desc">${escapeHtml(site.description)}</p>
        ${site.location || coordinates ? `<p class="gal-site-location"><span>📍 ${escapeHtml(site.location || "")}</span>${coordinates}</p>` : ""}
      </div>`;
  }

  function renderSiteAdminActions(site) {
    if (!GALLERY_EMBED || typeof MatiAdminStore === "undefined") return "";
    return `
      <div class="gal-site-admin-actions">
        <button
          type="button"
          class="admin-btn admin-btn--primary admin-btn--sm"
          id="gal-site-manage-btn"
        >${gallerySiteActionLabel(site.id)}</button>
      </div>`;
  }

  function renderSiteView() {
    const site = resolveSiteById(state.siteId);
    if (!site) return renderCategoryView();

    const stats = resolveSiteStats(site.id);
    const festival = getFestivalForSite(site.id);
    const subfolders = [];

    if (stats.photos > 0 || site.category === "natural") {
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

    if (stats.links > 0 || festival) {
      const linkCount = stats.links;
      const linkCountLabel =
        linkCount === 0
          ? "No videos yet"
          : `${linkCount} ${linkCount === 1 ? "video" : "videos"}`;
      subfolders.push(`
        <button type="button" class="gal-subfolder gal-subfolder--links" data-folder="links">
          <span class="gal-subfolder-icon">🎬</span>
          <span class="gal-subfolder-label">Videos</span>
          <span class="gal-subfolder-count">${linkCountLabel}</span>
        </button>`);
    }

    if (stats.recordings > 0 && site.category === "intangible") {
      subfolders.push(`
        <button type="button" class="gal-subfolder gal-subfolder--recordings" data-folder="recordings">
          <span class="gal-subfolder-icon">🎵</span>
          <span class="gal-subfolder-label">Audio Recordings</span>
          <span class="gal-subfolder-count">${stats.recordings} ${stats.recordings === 1 ? "recording" : "recordings"}</span>
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
      <div class="gal-view gal-view--site${GALLERY_EMBED ? " gal-view--site-admin" : ""}">
        <div class="gal-site-header${GALLERY_EMBED ? " gal-site-header--admin" : ""}">
          <img class="gal-site-cover" src="${escapeHtml(site.cover)}" alt="${escapeHtml(site.name)}" loading="lazy" />
          <div class="gal-site-header__main">
            ${renderSiteHeaderContent(site)}
          </div>
        </div>
        <h3 class="gal-step-title" style="font-size:1.5rem;margin-bottom:1.25rem;">Open a folder</h3>
        <div class="gal-subfolder-grid">${subfolders.join("")}</div>
      </div>`;
  }

  function renderMediaItemLabel(item) {
    return `
      <span class="gal-media-item-media-label">
        <span class="gal-media-item-media-title">${escapeHtml(item.title)}</span>
      </span>`;
  }

  function renderEmbedThumbAttrs(item) {
    const youtubeThumb = getYouTubeThumbnail(item.src);
    if (youtubeThumb) {
      return `data-src="${escapeHtml(youtubeThumb)}"`;
    }
    return `data-embed-url="${escapeHtml(item.src)}"`;
  }

  function renderMediaGridItem(item, index, site) {
    const inSelectMode =
      GALLERY_EMBED &&
      state.mediaSelectMode &&
      folderSupportsBulkSelect(state.folder);
    const itemSelected =
      inSelectMode && state.selectedMediaIds.includes(item.id);
    const adminWrapStart = GALLERY_EMBED
      ? `<div class="gal-media-item-wrap${
          inSelectMode ? "" : " gal-media-item-wrap--draggable"
        }${itemSelected ? " is-selected" : ""}"${
          inSelectMode ? "" : ' draggable="true"'
        } data-media-id="${escapeHtml(item.id)}">`
      : "";
    const adminWrapEnd = GALLERY_EMBED ? `</div>` : "";
    const adminEditBtn =
      GALLERY_EMBED && !inSelectMode
        ? `<button type="button" class="gal-media-edit-btn" data-edit-media="${escapeHtml(item.id)}" aria-label="Edit ${escapeHtml(item.title)}">Edit</button>`
        : "";
    const adminSelectCheck = inSelectMode
      ? `<label class="gal-media-select-check" aria-label="Select ${escapeHtml(item.title)}"><input type="checkbox" class="gal-media-select-input" data-media-select="${escapeHtml(item.id)}"${
          itemSelected ? " checked" : ""
        } /><span class="gal-media-select-mark" aria-hidden="true"></span></label>`
      : "";

    if (item.type === "photo") {
      const photoSrc = escapeHtml(mediaUrl(item.src));
      const photoImg = GALLERY_EMBED
        ? `<img src="${photoSrc}" alt="${escapeHtml(item.title)}" class="gal-media-img-lazy is-loaded" decoding="async" loading="eager" />`
        : `<img data-src="${escapeHtml(item.src)}" alt="${escapeHtml(item.title)}" class="gal-media-img-lazy" decoding="async" loading="lazy" />`;
      return `
        ${adminWrapStart}
        ${adminSelectCheck}
        <button type="button" class="gal-media-item gal-media-item--photo" data-index="${index}" aria-label="${escapeHtml(item.title)}" style="--gal-i: ${index % MEDIA_BATCH_SIZE}">
          ${photoImg}
        </button>
        ${adminEditBtn}
        ${adminWrapEnd}`;
    }
    if (item.type === "video") {
      return `
        ${adminWrapStart}
        ${adminSelectCheck}
        <button type="button" class="gal-media-item gal-media-item--video" data-index="${index}" aria-label="${escapeHtml(item.title)}" style="--gal-i: ${index % MEDIA_BATCH_SIZE}">
          <video class="gal-media-video-preview" muted playsinline preload="metadata" src="${escapeHtml(mediaUrl(item.src))}" aria-hidden="true"></video>
          <span class="gal-media-item-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>
          ${renderMediaItemLabel(item)}
        </button>
        ${adminEditBtn}
        ${adminWrapEnd}`;
    }
    if (item.type === "audio") {
      const hasLyrics = Boolean(
        item.lyrics?.sections?.length ||
        (typeof getAudioLyrics === "function" && getAudioLyrics(item)),
      );
      return `
        ${adminWrapStart}
        ${adminSelectCheck}
        <button type="button" class="gal-media-item gal-media-item--audio${hasLyrics ? " gal-media-item--has-lyrics" : ""}" data-index="${index}" aria-label="${escapeHtml(item.title)}${hasLyrics ? " — with lyrics" : ""}" style="--gal-i: ${index % MEDIA_BATCH_SIZE}">
          <img data-src="${escapeHtml(site.cover)}" alt="" class="gal-media-img-lazy" decoding="async" />
          <span class="gal-media-item-audio" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg></span>
          ${hasLyrics ? `<span class="gal-media-lyrics-badge">Lyrics</span>` : ""}
          ${renderMediaItemLabel(item)}
        </button>
        ${adminEditBtn}
        ${adminWrapEnd}`;
    }
    if (item.type === "link" && isEmbeddableLink(item)) {
      return `
        ${adminWrapStart}
        ${adminSelectCheck}
        <button type="button" class="gal-media-item gal-media-item--video gal-media-item--embed" data-index="${index}" aria-label="${escapeHtml(item.title)}" style="--gal-i: ${index % MEDIA_BATCH_SIZE}">
          <img alt="" class="gal-media-img-lazy gal-media-embed-thumb" decoding="async" ${renderEmbedThumbAttrs(item)} />
          <span class="gal-media-item-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>
          ${renderMediaItemLabel(item)}
        </button>
        ${adminEditBtn}
        ${adminWrapEnd}`;
    }
    return `
      ${adminWrapStart}
      ${adminSelectCheck}
      <button type="button" class="gal-media-item" data-index="${index}" aria-label="${escapeHtml(item.title)}" style="--gal-i: ${index % MEDIA_BATCH_SIZE}">
        <div class="gal-link-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          <span>${escapeHtml(item.title)}</span>
        </div>
      </button>
      ${adminEditBtn}
      ${adminWrapEnd}`;
  }

  function renderMediaView() {
    const site = resolveSiteById(state.siteId);
    if (!site) return "";

    if (state.folder === "timeline") {
      return renderTimelineView(site);
    }

    const typeMap = {
      photos: "photo",
      videos: "video",
      links: "link",
      recordings: "audio",
    };
    const type = typeMap[state.folder];
    const items = resolveOrderedSiteMedia(site.id, type);

    const folderTitles = {
      photos: "Photographs",
      videos: "Videos",
      links: "Videos",
      recordings: "Audio recordings",
    };

    if (items.length === 0) {
      return `
        <div class="gal-view gal-view--media${GALLERY_EMBED ? " gal-view--media-admin" : ""}">
          ${renderGalleryMediaToolbar(site, state.folder, "")}
          <div class="gal-empty">
            <div class="gal-empty-icon">📁</div>
            <p>This folder is empty.</p>
          </div>
        </div>`;
    }

    const visibleCount = Math.min(state.mediaVisibleCount, items.length);
    const visibleItems = items.slice(0, visibleCount);
    const remaining = items.length - visibleCount;
    const loadMoreLabel =
      state.folder === "photos"
        ? `Load more photographs (${remaining} remaining)`
        : `Load more (${remaining} remaining)`;

    const grid = visibleItems
      .map((item, index) => renderMediaGridItem(item, index, site))
      .join("");

    return `
      <div class="gal-view gal-view--media${GALLERY_EMBED ? " gal-view--media-admin" : ""}">
        ${renderGalleryMediaToolbar(
          site,
          state.folder,
          `<span class="gal-media-count">${visibleCount} of ${items.length} ${folderTitles[state.folder]?.toLowerCase() || "items"}</span>`,
        )}
        <div class="gal-media-grid" data-media-type="${escapeHtml(type)}">${grid}</div>
        ${
          remaining > 0
            ? `<div class="gal-media-more-wrap">
                <button type="button" class="gal-load-more" data-load-more>${escapeHtml(loadMoreLabel)}</button>
              </div>`
            : ""
        }
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
            <div class="gal-timeline-chapter-frame">
              <div class="gal-timeline-lifted-photo">
                <div class="gal-timeline-lifted-photo__mat">
                  <img src="${escapeHtml(entry.image)}" alt="${escapeHtml(entry.imageAlt || entry.title)}" loading="lazy" decoding="async" />
                </div>
              </div>
            </div>
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

      pile
        .querySelector(".gal-pile-title")
        ?.addEventListener("click", (event) => {
          event.stopPropagation();
          goSite(siteId);
        });

      pile
        .querySelector(".gal-pile-cta")
        ?.addEventListener("click", (event) => {
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

  function bindLazyMediaImages(container) {
    const images = [...container.querySelectorAll("img[data-src]")];
    if (!images.length) return;

    const loadImage = (img) => {
      const src = img.dataset.src;
      if (!src || img.dataset.loaded === "true") return;

      img.dataset.loaded = "pending";
      img.classList.add("is-loading");

      const loader = new Image();
      loader.decoding = "async";
      loader.onload = () => {
        img.src = src;
        img.removeAttribute("data-src");
        img.dataset.loaded = "true";
        img.classList.remove("is-loading");
        img.classList.add("is-loaded");
      };
      loader.onerror = () => {
        img.dataset.loaded = "error";
        img.classList.remove("is-loading");
        img.classList.add("is-error");
      };
      loader.src = mediaUrl(src);
    };

    if (!("IntersectionObserver" in window)) {
      images.forEach(loadImage);
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          loadImage(entry.target);
          obs.unobserve(entry.target);
        });
      },
      { rootMargin: "480px 0px", threshold: 0.01 },
    );

    const startObserving = () => {
      images.forEach((img) => {
        if (
          img.dataset.loaded === "true" ||
          img.classList.contains("is-loaded")
        )
          return;
        observer.observe(img);
        const rect = img.getBoundingClientRect();
        if (rect.bottom >= -120 && rect.top <= window.innerHeight + 480) {
          loadImage(img);
          observer.unobserve(img);
        }
      });
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(startObserving);
    });
  }

  function loadEmbedThumb(img) {
    const url = img.dataset.embedUrl;
    if (!url || img.dataset.loaded === "true") return;

    img.dataset.loaded = "pending";
    img.classList.add("is-loading");

    getEmbedMeta(url).then((meta) => {
      if (!meta.thumbnail) {
        img.dataset.loaded = "error";
        img.classList.remove("is-loading");
        img.classList.add("is-error");
        return;
      }

      const loader = new Image();
      loader.decoding = "async";
      loader.onload = () => {
        img.src = meta.thumbnail;
        img.removeAttribute("data-embed-url");
        img.dataset.loaded = "true";
        img.classList.remove("is-loading");
        img.classList.add("is-loaded");
      };
      loader.onerror = () => {
        img.dataset.loaded = "error";
        img.classList.remove("is-loading");
        img.classList.add("is-error");
      };
      loader.src = meta.thumbnail;
    });
  }

  function bindEmbedThumbnails(container) {
    const images = [...container.querySelectorAll("img[data-embed-url]")];
    if (!images.length) return;

    if (!("IntersectionObserver" in window)) {
      images.forEach(loadEmbedThumb);
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          loadEmbedThumb(entry.target);
          obs.unobserve(entry.target);
        });
      },
      { rootMargin: "240px 0px", threshold: 0.01 },
    );

    images.forEach((img) => observer.observe(img));
  }

  function getMediaSourceLabel(item) {
    if (!item) return "Source";
    if (item.type === "photo") return "Image source";
    if (item.type === "audio") return "Audio source";
    if (item.type === "video" || item.type === "link") return "Video source";
    return "Source";
  }

  function getMediaSourceText(item) {
    return (item.author || item.credit || "").trim();
  }

  async function resolveMediaAuthor(item) {
    const label = getMediaSourceLabel(item);

    if (isEmbeddableLink(item)) {
      const meta = await getEmbedMeta(item.src);
      return {
        author: item.author || meta.author || "",
        authorUrl: meta.authorUrl || null,
        label,
      };
    }

    return {
      author: getMediaSourceText(item),
      authorUrl: null,
      label,
    };
  }

  function renderAuthorName(author, authorUrl) {
    if (!author) return "";
    if (authorUrl) {
      return `<a href="${escapeHtml(authorUrl)}" target="_blank" rel="noopener noreferrer" class="gal-lightbox-embed-credit__name">${escapeHtml(author)}</a>`;
    }
    return `<span class="gal-lightbox-embed-credit__name">${escapeHtml(author)}</span>`;
  }

  function renderPlayerCreditOverlay(item) {
    if (
      isEmbeddableLink(item) ||
      item.type === "video" ||
      (item.type === "photo" && getMediaSourceText(item))
    ) {
      return `<div class="gal-lightbox-embed-credit gal-lightbox-embed-credit--pending" data-media-author hidden></div>`;
    }
    return "";
  }

  async function applyMediaAuthor(item, overlayEl) {
    const { author, authorUrl, label } = await resolveMediaAuthor(item);

    if (overlayEl) {
      if (author) {
        const nameHtml =
          item.type === "photo" && !authorUrl
            ? linkifyCitation(author)
            : renderAuthorName(author, authorUrl);
        overlayEl.innerHTML = `<span class="gal-lightbox-embed-credit__label">${escapeHtml(label)}</span> ${nameHtml}`;
        overlayEl.hidden = false;
      } else {
        overlayEl.hidden = true;
        overlayEl.innerHTML = "";
      }
      overlayEl.classList.remove("gal-lightbox-embed-credit--pending");
    }

    return { author, authorUrl, label };
  }

  let mediaReorderDragId = null;
  let mediaReorderMoved = false;

  function bindMediaReorder(container) {
    if (!GALLERY_EMBED || typeof MatiAdminStore === "undefined") return;
    if (state.mediaSelectMode) return;

    const grid = container.querySelector(".gal-media-grid");
    if (!grid) return;

    const type = grid.dataset.mediaType;
    if (!type) return;

    grid.querySelectorAll("[data-media-id]").forEach((el) => {
      el.addEventListener("dragstart", (e) => {
        mediaReorderDragId = el.dataset.mediaId;
        mediaReorderMoved = false;
        el.classList.add("is-dragging");
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", mediaReorderDragId);
        }
      });

      el.addEventListener("drag", () => {
        mediaReorderMoved = true;
      });

      el.addEventListener("dragend", () => {
        el.classList.remove("is-dragging");
        grid.querySelectorAll(".is-drag-over").forEach((node) => {
          node.classList.remove("is-drag-over");
        });
        mediaReorderDragId = null;
        window.setTimeout(() => {
          mediaReorderMoved = false;
        }, 0);
      });

      el.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        const target = e.currentTarget;
        if (target.dataset.mediaId !== mediaReorderDragId) {
          target.classList.add("is-drag-over");
        }
      });

      el.addEventListener("dragleave", () => {
        el.classList.remove("is-drag-over");
      });

      el.addEventListener("drop", (e) => {
        e.preventDefault();
        const target = e.currentTarget;
        target.classList.remove("is-drag-over");
        const dragId =
          mediaReorderDragId || e.dataTransfer?.getData("text/plain");
        if (
          !dragId ||
          !target.dataset.mediaId ||
          dragId === target.dataset.mediaId
        ) {
          return;
        }

        const items = MatiAdminStore.getOrderedSiteMedia(state.siteId, type);
        const ids = items.map((item) => item.id);
        const from = ids.indexOf(dragId);
        const to = ids.indexOf(target.dataset.mediaId);
        if (from < 0 || to < 0) return;

        ids.splice(from, 1);
        ids.splice(to, 0, dragId);
        void Promise.resolve(
          MatiAdminStore.reorderSiteMedia(state.siteId, type, ids),
        ).finally(() => {
          mediaReorderMoved = true;
          render();
        });
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
      btn.addEventListener("click", () => {
        if (mediaReorderMoved) return;
        if (
          GALLERY_EMBED &&
          state.mediaSelectMode &&
          folderSupportsBulkSelect(state.folder)
        ) {
          const wrap = btn.closest("[data-media-id]");
          const mediaId = wrap?.dataset.mediaId;
          if (mediaId) toggleMediaSelection(mediaId);
          return;
        }
        openMediaItem(parseInt(btn.dataset.index, 10));
      });
    });

    container.querySelectorAll("[data-load-more]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setState({
          mediaVisibleCount: state.mediaVisibleCount + MEDIA_BATCH_SIZE,
        });
      });
    });

    bindLazyMediaImages(container);
    bindEmbedThumbnails(container);
    bindMediaReorder(container);
    bindBreadcrumb(container);
    bindGallerySiteAdmin(container);
    bindGalleryMediaAdmin(container);
  }

  function syncSiteDraftFromForm(container) {
    if (!state.siteEditing) return;
    state.siteDraft = {
      heritageCategory:
        container.querySelector("#gal-site-heritage-type")?.value ?? "",
      name: container.querySelector("#gal-site-name")?.value ?? "",
      description: container.querySelector("#gal-site-desc")?.value ?? "",
    };
    const btn = container.querySelector("#gal-site-manage-btn");
    if (btn && state.siteId) {
      btn.textContent = gallerySiteActionLabel(state.siteId);
    }
  }

  function bindGallerySiteAdmin(container) {
    if (!GALLERY_EMBED || typeof MatiAdminStore === "undefined") return;
    if (state.step !== "site") return;

    const btn = container.querySelector("#gal-site-manage-btn");
    if (!btn) return;

    container
      .querySelector("#gal-site-heritage-type")
      ?.addEventListener("input", () => {
        syncSiteDraftFromForm(container);
      });
    container.querySelector("#gal-site-name")?.addEventListener("input", () => {
      syncSiteDraftFromForm(container);
    });
    container.querySelector("#gal-site-desc")?.addEventListener("input", () => {
      syncSiteDraftFromForm(container);
    });

    btn.addEventListener("click", () => {
      const site = resolveSiteById(state.siteId);
      if (!site) return;
      const label = btn.textContent.trim();

      if (label === "Manage") {
        if (state.siteEditing && !isSiteDraftDirty()) {
          clearSiteEditState();
          render();
          return;
        }

        state.siteEditing = true;
        state.siteDraft = {
          heritageCategory: site.heritageCategory || "",
          name: site.name || "",
          description: site.description || "",
        };
        render();
        return;
      }

      if (state.siteEditing) {
        syncSiteDraftFromForm(container);
        const name = state.siteDraft?.name?.trim();
        if (!name) return;

        void MatiAdminStore.saveSite({
          ...site,
          heritageCategory: state.siteDraft.heritageCategory.trim(),
          name,
          description: state.siteDraft.description.trim(),
        }).then((saved) => {
          clearSiteEditState();
          render();
          if (
            saved?._sync &&
            !saved._sync.ok &&
            saved._sync.reason !== "not_configured"
          ) {
            window.MatiAdminUi?.showToast?.(
              "Site saved locally, but cloud sync failed. Run the deployment heritage writes SQL.",
            );
          }
        });
        return;
      }

      state.siteEditing = true;
      state.siteDraft = {
        heritageCategory: site.heritageCategory || "",
        name: site.name || "",
        description: site.description || "",
      };
      render();
    });
  }

  function bindGalleryMediaAdmin(container) {
    if (!GALLERY_EMBED || typeof MatiAdminStore === "undefined") return;
    if (state.step !== "media") return;

    const presetType = folderToPresetType(state.folder);
    if (!presetType) return;

    container
      .querySelector("[data-manage-media]")
      ?.addEventListener("click", () => {
        window.MatiAdminUi?.openGalleryMediaModal?.(
          null,
          state.siteId,
          presetType,
        );
      });

    container.querySelectorAll("[data-edit-media]").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        window.MatiAdminUi?.openGalleryMediaModal?.(
          btn.dataset.editMedia,
          state.siteId,
          presetType,
        );
      });
    });

    if (!folderSupportsBulkSelect(state.folder)) return;

    container
      .querySelector("[data-media-select-toggle]")
      ?.addEventListener("click", () => {
        state.mediaSelectMode = true;
        state.selectedMediaIds = [];
        render();
      });

    container
      .querySelector("[data-media-select-cancel]")
      ?.addEventListener("click", () => {
        clearMediaSelection();
        render();
      });

    container
      .querySelector("[data-media-delete-selected]")
      ?.addEventListener("click", async () => {
        const ids = [...state.selectedMediaIds];
        if (!ids.length) return;

        const noun = mediaDeleteNoun(state.folder, ids.length);
        const title =
          ids.length === 1
            ? `Delete this ${noun}?`
            : `Delete ${ids.length} ${noun}?`;
        const message =
          ids.length === 1
            ? `It will be removed from the gallery.`
            : `They will be removed from the gallery.`;

        const confirmed = await (window.MatiAdminUi?.confirmAction?.({
          title,
          message,
          confirmLabel: ids.length === 1 ? "Delete" : `Delete (${ids.length})`,
        }) ?? Promise.resolve(window.confirm(`${title} ${message}`)));
        if (!confirmed) return;

        try {
          const deleted = await (window.MatiAdminUi?.runDeleteProgress
            ? window.MatiAdminUi.runDeleteProgress(
                () => MatiAdminStore.deleteMediaMany(ids),
                { noun, count: ids.length },
              )
            : MatiAdminStore.deleteMediaMany(ids));
          clearMediaSelection();
          window.MatiAdminUi?.onMediaDeleted?.(state.siteId);
          render();
          if (deleted && !window.MatiAdminUi?.runDeleteProgress) {
            const toastNoun = mediaDeleteNoun(state.folder, deleted);
            const capitalized =
              toastNoun.charAt(0).toUpperCase() + toastNoun.slice(1);
            window.MatiAdminUi?.showToast?.(
              deleted === 1
                ? `${capitalized} deleted.`
                : `${deleted} ${toastNoun} deleted.`,
            );
          }
        } catch (error) {
          window.MatiAdminUi?.showToast?.(
            error?.message || "Could not delete media.",
          );
        }
      });

    container.querySelectorAll("[data-media-select]").forEach((input) => {
      input.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      input.addEventListener("change", () => {
        const mediaId = input.dataset.mediaSelect;
        if (!mediaId) return;
        const ids = new Set(state.selectedMediaIds);
        if (input.checked) ids.add(mediaId);
        else ids.delete(mediaId);
        state.selectedMediaIds = [...ids];
        render();
      });
    });
  }

  function openMediaItem(index) {
    const typeMap = {
      photos: "photo",
      videos: "video",
      links: "link",
      recordings: "audio",
    };
    const type = typeMap[state.folder];
    const items = resolveOrderedSiteMedia(state.siteId, type);
    const item = items[index];
    if (!item) return;

    if (item.type === "link") {
      if (!isEmbeddableLink(item)) {
        window.open(item.src, "_blank", "noopener,noreferrer");
        return;
      }
    }

    state.lightboxItems = getLightboxItems(items);
    state.lightboxIndex = state.lightboxItems.findIndex(
      (i) => i.id === item.id,
    );
    showLightbox();
  }

  function renderLightboxCitation(item) {
    if (!item) return "";

    if (item.citation) {
      return `<p class="gal-lightbox-citation__source">${escapeHtml(item.citation)}</p>`;
    }

    const parts = [];
    const creditOnPlayer = item.type === "video" || isEmbeddableLink(item);
    const hasLyricsPanel = Boolean(
      item.type === "audio" &&
      (item.lyrics?.sections?.length ||
        (typeof getAudioLyrics === "function" && getAudioLyrics(item))),
    );

    if (item.type === "link") {
      if (item.caption) {
        parts.push(
          `<p class="gal-lightbox-citation__figure"><span class="gal-lightbox-citation__label">Figure:</span> ${escapeHtml(item.caption)}</p>`,
        );
      }
      if (item.year) {
        parts.push(
          `<p class="gal-lightbox-citation__event">${escapeHtml(item.year)}.</p>`,
        );
      }
      return parts.join("");
    }

    if (item.caption) {
      parts.push(
        `<p class="gal-lightbox-citation__figure"><span class="gal-lightbox-citation__label">Figure:</span> ${escapeHtml(item.caption)}</p>`,
      );
    }
    if (item.event || item.date) {
      const eventLine = [item.event, item.date].filter(Boolean).join(", ");
      parts.push(
        `<p class="gal-lightbox-citation__event">${escapeHtml(eventLine)}.</p>`,
      );
    }

    // Audio with lyrics shows source in the lyrics panel; other types keep citation.
    if (
      item.credit &&
      !creditOnPlayer &&
      item.type !== "photo" &&
      !(item.type === "audio" && hasLyricsPanel)
    ) {
      parts.push(
        `<p class="gal-lightbox-citation__source"><span class="gal-lightbox-citation__label">${escapeHtml(getMediaSourceLabel(item))}:</span> ${linkifyCitation(item.credit)}.</p>`,
      );
    }
    return parts.join("");
  }

  function renderAudioLyrics(item) {
    const lyrics =
      item.lyrics ||
      (typeof getAudioLyrics === "function" ? getAudioLyrics(item) : null);
    if (!lyrics?.sections?.length) return "";

    const sections = lyrics.sections
      .map(
        (section) => `
          <div class="gal-lyrics-section">
            ${section.label ? `<h4 class="gal-lyrics-section__label">${escapeHtml(section.label)}</h4>` : ""}
            <p class="gal-lyrics-section__lines">${section.lines
              .map((line) => escapeHtml(line))
              .join("<br>")}</p>
          </div>`,
      )
      .join("");

    const source = getMediaSourceText(item)
      ? `<p class="gal-lyrics__source"><span class="gal-lyrics__source-label">${escapeHtml(getMediaSourceLabel(item))}</span> ${linkifyCitation(getMediaSourceText(item))}</p>`
      : "";

    return `
      <aside class="gal-lyrics" aria-label="Song lyrics">
        <div class="gal-lyrics__header">
          <span class="gal-lyrics__eyebrow">Lyrics</span>
          ${lyrics.composer ? `<p class="gal-lyrics__composer">Music &amp; lyrics: ${escapeHtml(lyrics.composer)}</p>` : ""}
          ${lyrics.note ? `<p class="gal-lyrics__note">${escapeHtml(lyrics.note)}</p>` : ""}
        </div>
        <div class="gal-lyrics__body">${sections}</div>
        ${source ? `<div class="gal-lyrics__footer">${source}</div>` : ""}
      </aside>`;
  }

  function showLightbox() {
    const item = state.lightboxItems[state.lightboxIndex];
    const box = $("galLightbox");
    const media = $("galLightboxMedia");
    const title = $("galLightboxTitle");
    const meta = $("galLightboxMeta");
    const citation = $("galLightboxCitation");
    if (!item || !box || !media) return;

    const site = resolveSiteById(state.siteId);

    if (item.type === "photo") {
      media.innerHTML = `<div class="gal-lightbox-player-wrap"><img src="${escapeHtml(mediaUrl(item.src))}" alt="${escapeHtml(item.title)}" decoding="async" />${renderPlayerCreditOverlay(item)}</div>`;
    } else if (item.type === "audio") {
      const lyricsHtml = renderAudioLyrics(item);
      media.innerHTML = `
        <div class="gal-lightbox-audio${lyricsHtml ? " gal-lightbox-audio--with-lyrics" : ""}">
          <div class="gal-lightbox-player-wrap gal-lightbox-player-wrap--audio">
            <div class="gal-lightbox-audio-visual" aria-hidden="true">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
            <audio src="${escapeHtml(mediaUrl(item.src))}" controls autoplay preload="metadata"></audio>
          </div>
          ${lyricsHtml}
        </div>`;
    } else if (isEmbeddableLink(item)) {
      const embed = getLinkEmbed(item.src);
      const fallback =
        embed.provider === "facebook"
          ? `<a class="gal-lightbox-embed-fallback" href="${escapeHtml(item.src)}" target="_blank" rel="noopener noreferrer">Open on Facebook if the player does not load</a>`
          : "";
      media.innerHTML = `<div class="gal-lightbox-embed-wrap"><div class="gal-lightbox-embed-stage"><iframe class="gal-lightbox-embed gal-lightbox-embed--${embed.provider}" src="${escapeHtml(embed.embedUrl)}" title="${escapeHtml(item.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>${renderPlayerCreditOverlay(item)}</div>${fallback}</div>`;
    } else {
      const poster = site?.cover ? ` poster="${escapeHtml(site.cover)}"` : "";
      media.innerHTML = `<div class="gal-lightbox-player-wrap"><video src="${escapeHtml(mediaUrl(item.src))}" controls autoplay playsinline preload="metadata"${poster}></video>${renderPlayerCreditOverlay(item)}</div>`;
    }

    title.textContent = item.title;

    const authorCaption = $("galLightboxAuthor");
    if (authorCaption) {
      authorCaption.innerHTML = "";
      authorCaption.hidden = true;
    }

    const authorOverlay = media.querySelector("[data-media-author]");

    if (authorOverlay) {
      applyMediaAuthor(item, authorOverlay).then(({ author }) => {
        if (!meta) return;
        const siteName = item.siteName || "";
        const sameAsAuthor =
          author &&
          siteName &&
          siteName.trim().toLowerCase() === author.trim().toLowerCase();
        if (sameAsAuthor) {
          meta.textContent = "";
          meta.hidden = true;
        } else {
          meta.textContent = siteName;
          meta.hidden = !siteName;
        }
      });
    } else if (meta) {
      meta.textContent = item.siteName || "";
      meta.hidden = !item.siteName;
    }

    const citationHtml = renderLightboxCitation(item);
    if (citation) {
      if (citationHtml) {
        citation.innerHTML = citationHtml;
        citation.hidden = false;
      } else {
        citation.innerHTML = "";
        citation.hidden = true;
      }
    }

    const showNav = state.lightboxItems.length > 1;
    $("galLightboxPrev")?.classList.toggle("is-hidden", !showNav);
    $("galLightboxNext")?.classList.toggle("is-hidden", !showNav);

    box.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    const box = $("galLightbox");
    const media = $("galLightboxMedia");
    const citation = $("galLightboxCitation");
    if (media) {
      media.querySelector("video")?.pause();
      media.querySelector("audio")?.pause();
      media.innerHTML = "";
    }
    if (citation) {
      citation.innerHTML = "";
      citation.hidden = true;
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

    if (state.category) {
      document.documentElement.dataset.galleryCategory = state.category;
    } else {
      delete document.documentElement.dataset.galleryCategory;
    }

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
    panel.classList.toggle(
      "gal-panel--timeline",
      state.step === "media" && state.folder === "timeline",
    );
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

      const footerPlaceholder = $("footer-placeholder");
      if (
        !footerPlaceholder ||
        document.body.classList.contains("gal-page--fullscreen")
      ) {
        return;
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

  async function hydrateFromSupabase() {
    if (GALLERY_EMBED) return;
    if (typeof MatiHeritageData === "undefined") return;
    if (typeof MatiHeritageData.hydrateGalleryCatalog !== "function") return;

    try {
      await MatiHeritageData.hydrateGalleryCatalog({ force: true });
    } catch (error) {
      console.warn(
        "Gallery: Supabase hydrate failed, using static catalog",
        error,
      );
    }
  }

  let galleryLiveRefreshTimer = null;
  let galleryLiveRefreshing = false;

  function clampMediaVisibleCount() {
    if (state.step !== "media" || !state.siteId || !state.folder) return;
    const type = folderToMediaType(state.folder);
    if (!type) return;
    const total = resolveOrderedSiteMedia(state.siteId, type).length;
    if (state.mediaVisibleCount > total) {
      state.mediaVisibleCount = Math.max(total, 0);
    }
  }

  async function refreshGalleryFromLive() {
    if (GALLERY_EMBED) return;
    if (galleryLiveRefreshing) {
      clearTimeout(galleryLiveRefreshTimer);
      galleryLiveRefreshTimer = setTimeout(() => {
        void refreshGalleryFromLive();
      }, 220);
      return;
    }
    galleryLiveRefreshing = true;
    try {
      if (typeof MatiHeritageData?.invalidateCaches === "function") {
        MatiHeritageData.invalidateCaches();
      }
      if (typeof MatiHeritageData?.hydrateGalleryCatalog === "function") {
        await MatiHeritageData.hydrateGalleryCatalog({ force: true });
      }
      clampMediaVisibleCount();
      render();
    } catch (error) {
      console.warn("Gallery live refresh failed:", error);
      render();
    } finally {
      galleryLiveRefreshing = false;
    }
  }

  function ensureGalleryLive() {
    if (GALLERY_EMBED) return;

    if (typeof MatiHeritageData?.subscribeCatalog === "function") {
      // subscribeCatalog already invalidates + hydrates before this callback.
      MatiHeritageData.subscribeCatalog(() => {
        clampMediaVisibleCount();
        render();
      });
    } else if (typeof MatiHeritageRealtime?.on === "function") {
      MatiHeritageRealtime.ensure?.();
      MatiHeritageRealtime.on(MatiHeritageRealtime.TOPIC.catalog, () => {
        void refreshGalleryFromLive();
      });
    }

    window.addEventListener("storage", (event) => {
      if (
        event.key !== "matiAdminHeritageStore" &&
        event.key !== "matiHeritageCatalogBump"
      ) {
        return;
      }
      void refreshGalleryFromLive();
    });
  }

  async function init() {
    if (!GALLERY_EMBED && document.querySelector(".gal-hero")) {
      window.scrollTo(0, 0);
    }
    initLightbox();
    if (!GALLERY_EMBED && document.querySelector(".gal-hero")) initHeroReveal();
    await hydrateFromSupabase();
    render();
    ensureGalleryLive();
    if (GALLERY_EMBED) {
      revealExplorer();
    } else {
      handleGalleryHomeHash();
      loadHeaderAndFooter();
    }
  }

  if (GALLERY_EMBED) {
    window.MatiGalleryEmbed = {
      resetToCollections() {
        clearMediaSelection();
        setState({
          step: "category",
          category: null,
          siteId: null,
          folder: null,
          mediaVisibleCount: MEDIA_BATCH_SIZE,
        });
      },
      refresh() {
        render();
      },
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
