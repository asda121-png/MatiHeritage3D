/** Mati Heritage 3D — Admin console UI */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  let currentView = "dashboard";
  let currentCategory = "built";
  let currentReport = "built";
  let editingSiteId = null;
  let mapPickSession = false;
  let mediaModalPresetType = null;
  let toastTimer = null;
  const heritagePreviewUrls = new Set();
  let builtModelObserver = null;
  let logoutInProgress = false;

  const TYPE_LABELS = {
    photo: "Photograph",
    map: "Site map",
    video: "Video",
    audio: "Audio",
    link: "Link",
    model3d: "3D model",
  };

  function showToast(message) {
    const el = $("#admin-toast");
    if (!el) return;
    clearTimeout(toastTimer);
    el.textContent = message;
    el.hidden = false;
    el.classList.add("is-visible");
    toastTimer = setTimeout(() => {
      el.hidden = true;
      el.classList.remove("is-visible");
    }, 2800);
  }

  function autoGrowTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 72)}px`;
  }

  function syncSiteDescriptionHeight() {
    autoGrowTextarea($("#site-desc"));
  }

  function bindSiteFormUi() {
    const desc = $("#site-desc");
    if (!desc || desc.dataset.uiBound) return;
    desc.dataset.uiBound = "true";
    desc.addEventListener("input", () => autoGrowTextarea(desc));
  }

  function isBuiltHeritageForm() {
    const siteId = $("#site-id")?.value?.trim();
    if (siteId) {
      const site = MatiAdminStore.getSiteById(siteId);
      if (site) return site.category === "built";
    }
    return currentView === "heritage" && currentCategory === "built";
  }

  function syncSiteCategoryValue(cat) {
    const hidden = $("#site-category");
    const select = $("#site-category-select");
    if (hidden) hidden.value = cat;
    if (select) select.value = cat;
  }

  function updateSiteFormFields() {
    const builtForm = isBuiltHeritageForm();
    const cat = builtForm
      ? "built"
      : $("#site-category-select")?.value || currentCategory;
    syncSiteCategoryValue(cat);

    const builtWrap = $("#site-category-built-wrap");
    const selectWrap = $("#site-category-select-wrap");
    const heritageType = $("#site-heritage-type-field");
    const ownershipField = $("#site-ownership-field");

    if (builtWrap) builtWrap.hidden = true;
    if (selectWrap) selectWrap.hidden = builtForm;
    if (heritageType) heritageType.hidden = !builtForm;
    if (ownershipField) ownershipField.hidden = !builtForm;

    const siteId = $("#site-id")?.value?.trim();
    const catSelect = $("#site-category-select");
    if (catSelect) catSelect.disabled = Boolean(siteId);

    const builtActions = $("#site-media-actions-built");
    syncBuiltMediaPicker();

    syncSiteMediaControls();
    syncMapPickMode();
    syncBuiltDeleteUi();
  }

  function syncBuiltMediaPicker() {
    const builtForm = isBuiltHeritageForm();
    const builtActions = $("#site-media-actions-built");
    if (builtActions) builtActions.hidden = !builtForm;
  }

  function categoryMediaTypes(cat) {
    if (typeof getScopeMediaTypes === "function") {
      return getScopeMediaTypes(cat);
    }
    if (cat === "built") return ["photo", "map", "model3d"];
    if (cat === "natural") return ["photo", "video", "link"];
    return ["photo", "video", "audio", "link"];
  }

  function categoryShows3d(cat) {
    return cat === "built";
  }

  function syncHeritageToolbar() {
    const addBtn = $("#btn-add-site");
    if (addBtn) {
      addBtn.hidden = currentView !== "heritage" || currentCategory !== "built";
    }
  }

  function builtSiteHas3d(site) {
    if (!site) return false;
    return Boolean(getSiteModelSource(site));
  }

  function getSiteModelSource(site) {
    if (!site) return "";
    if (site.modelSrc) return site.modelSrc;
    const modelMedia = MatiAdminStore.getSiteMedia(site.id).find(
      (item) => item.type === "model3d",
    );
    return modelMedia?.src || "";
  }

  async function resolveModelViewerSrc(modelPath) {
    if (!modelPath) return "";
    if (
      typeof MatiAdminUploads !== "undefined" &&
      MatiAdminUploads.isUploadUri(modelPath)
    ) {
      return (await MatiAdminUploads.createObjectUrl(modelPath)) || "";
    }
    return modelPath;
  }

  function closeModelViewerModal() {
    const modal = $("#model-viewer-modal");
    const host = $("#model-viewer-host");
    if (host) host.innerHTML = "";
    if (modal) {
      modal.hidden = true;
      modal.setAttribute("hidden", "");
    }
  }

  async function openModelViewerModal(siteId) {
    const site = MatiAdminStore.getSiteById(siteId);
    if (!site) {
      showToast("Site not found.");
      return;
    }

    const modelPath = getSiteModelSource(site);
    if (!modelPath) {
      showToast("No 3D model available for this site.");
      return;
    }

    const modal = $("#model-viewer-modal");
    const host = $("#model-viewer-host");
    const titleEl = $("#model-viewer-title");
    const exploreLink = $("#model-viewer-open-explore");
    if (!modal || !host || !titleEl) return;

    const src = await resolveModelViewerSrc(modelPath);
    if (!src) {
      showToast("Could not load the 3D model.");
      return;
    }

    titleEl.textContent = site.name;
    if (exploreLink) {
      exploreLink.href = `3dexplore.html?site=${encodeURIComponent(site.id)}`;
    }

    const viewer = document.createElement("model-viewer");
    viewer.className = "admin-model-viewer";
    viewer.setAttribute("src", src);
    viewer.setAttribute("alt", site.name);
    if (site.cover && !MatiAdminUploads?.isUploadUri?.(site.cover)) {
      viewer.setAttribute("poster", site.cover);
    }
    viewer.setAttribute("camera-controls", "");
    viewer.setAttribute("auto-rotate", "");
    viewer.setAttribute("rotation-per-second", "24deg");
    viewer.setAttribute("shadow-intensity", "1");
    viewer.setAttribute("touch-action", "pan-y");
    viewer.setAttribute("loading", "eager");

    host.replaceChildren(viewer);
    modal.hidden = false;
    modal.removeAttribute("hidden");
  }

  function builtSiteHasMap(site) {
    if (!site?.cover) return false;
    const cover = site.cover.toLowerCase();
    return cover.includes("/map/") || /map[._-]/.test(cover);
  }

  function builtSiteHasPhotos(site) {
    if (!site) return false;
    return MatiAdminStore.getSiteStats(site.id).photos > 0;
  }

  function builtSiteNeedsMedia(site) {
    if (!site) return false;
    return !site.cover && !builtSiteHasPhotos(site) && !builtSiteHas3d(site);
  }

  function filterAndSortBuiltSites(sites) {
    const filter = $("#built-heritage-filter")?.value || "all";
    const typeFilter = $("#built-heritage-type")?.value || "all";
    let list = [...sites];

    if (filter === "has-3d") {
      list = list.filter((site) => builtSiteHas3d(site));
    } else if (filter === "has-photos") {
      list = list.filter((site) => builtSiteHasPhotos(site));
    } else if (filter === "has-map") {
      list = list.filter((site) => builtSiteHasMap(site));
    } else if (filter === "needs-media") {
      list = list.filter((site) => builtSiteNeedsMedia(site));
    } else if (filter === "edited") {
      list = list.filter((site) => MatiAdminStore.siteHasAdminEdits(site.id));
    }

    if (typeFilter !== "all") {
      list = list.filter((site) => site.heritageCategory === typeFilter);
    }

    const sort = $("#built-heritage-sort")?.value || "name-asc";
    list.sort((a, b) => {
      if (sort === "name-desc") return b.name.localeCompare(a.name);
      if (sort === "location") {
        return (a.location || "").localeCompare(b.location || "", undefined, {
          sensitivity: "base",
        });
      }
      return a.name.localeCompare(b.name);
    });

    return list;
  }

  function getBuiltHeritageSummary(sites) {
    return {
      total: sites.length,
      with3d: sites.filter((site) => builtSiteHas3d(site)).length,
      withPhotos: sites.filter((site) => builtSiteHasPhotos(site)).length,
      withMap: sites.filter((site) => builtSiteHasMap(site)).length,
      updated: sites.filter((site) => MatiAdminStore.siteHasAdminEdits(site.id))
        .length,
    };
  }

  function getBuiltHeritageTypes(sites) {
    return [...new Set(sites.map((site) => site.heritageCategory).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b),
    );
  }

  function populateBuiltHeritageTypeFilter(sites) {
    const select = $("#built-heritage-type");
    if (!select) return;

    const current = select.value || "all";
    const types = getBuiltHeritageTypes(sites);
    select.innerHTML =
      `<option value="all">All types</option>` +
      types
        .map(
          (type) =>
            `<option value="${escapeAttr(type)}">${escapeHtml(type)}</option>`,
        )
        .join("");

    if (current === "all" || types.includes(current)) {
      select.value = current;
    } else {
      select.value = "all";
    }
  }

  function syncBuiltStatActiveState() {
    const filter = $("#built-heritage-filter")?.value || "all";
    $$(".admin-built__stat-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.builtStat === filter);
    });
  }

  function applyBuiltStatFilter(stat) {
    const filterSelect = $("#built-heritage-filter");
    if (!filterSelect) return;
    filterSelect.value = stat;
    syncBuiltStatActiveState();
    renderHeritage();
  }

  function renderBuiltHeritageSummary(allSites) {
    const container = $("#heritage-built-summary");
    if (!container) return;

    const summary = getBuiltHeritageSummary(allSites);
    const stats = [
      { key: "all", value: summary.total, label: "Sites" },
      { key: "has-3d", value: summary.with3d, label: "3D models" },
      { key: "has-photos", value: summary.withPhotos, label: "Photo sets" },
      { key: "has-map", value: summary.withMap, label: "Site maps" },
    ];

    container.innerHTML = stats
      .map(
        (stat) => `
      <button
        type="button"
        class="admin-built__stat admin-built__stat-btn"
        data-built-stat="${stat.key}"
        aria-pressed="${($("#built-heritage-filter")?.value || "all") === stat.key}"
      >
        <span class="admin-built__stat-value">${stat.value}</span>
        <span class="admin-built__stat-label">${stat.label}</span>
      </button>`,
      )
      .join("");

    syncBuiltStatActiveState();
  }

  function renderBuiltHeritageCount(totalCount) {
    const el = $("#heritage-built-count");
    if (!el) return;
    el.textContent = String(totalCount);
  }

  function renderBuiltHeritageMeta(filteredCount, totalCount, query) {
    const meta = $("#heritage-built-meta");
    if (!meta) return;

    if (!totalCount) {
      meta.textContent = "";
      return;
    }

    let text = `Showing ${filteredCount} of ${totalCount} site${totalCount !== 1 ? "s" : ""}`;
    if (query) text += ` matching “${query}”`;
    meta.textContent = text;
  }

  function builtCardChips(site) {
    const stats = MatiAdminStore.getSiteStats(site.id);
    const chips = [];
    if (builtSiteHasMap(site)) chips.push({ label: "Map", tone: "map" });
    if (stats.photos) {
      chips.push({
        label: `${stats.photos} photo${stats.photos !== 1 ? "s" : ""}`,
        tone: "photo",
      });
    }
    if (builtSiteHas3d(site)) chips.push({ label: "3D", tone: "model" });

    if (!chips.length) {
      return `<span class="admin-heritage-card__chip admin-heritage-card__chip--empty">No media yet</span>`;
    }

    return chips
      .map(
        (chip) =>
          `<span class="admin-heritage-card__chip admin-heritage-card__chip--${chip.tone}">${escapeHtml(chip.label)}</span>`,
      )
      .join("");
  }

  function builtCardBadges(site) {
    const badges = [];
    if (builtSiteHas3d(site)) {
      badges.push(
        `<span class="admin-heritage-card__badge admin-heritage-card__badge--3d">3D</span>`,
      );
    }
    if (MatiAdminStore.siteHasAdminEdits(site.id)) {
      badges.push(
        `<span class="admin-heritage-card__badge admin-heritage-card__badge--edited">Edited</span>`,
      );
    }
    if (!badges.length) return "";
    return `<div class="admin-heritage-card__badges">${badges.join("")}</div>`;
  }

  function syncSiteMediaControls() {
    const siteId = $("#site-id")?.value?.trim();
    const builtActions = $("#site-media-actions-built");
    const hint = $("#site-media-hint");

    if (hint) {
      hint.hidden = Boolean(siteId);
      hint.textContent =
        "You can add media files anytime. Save the site when the details are ready.";
    }
    if (builtActions) {
      builtActions.querySelectorAll("button").forEach((btn) => {
        btn.disabled = false;
      });
    }
    return Boolean(siteId);
  }

  function syncBuiltDeleteUi() {
    const builtForm = isBuiltHeritageForm();
    const isNewSite = !$("#site-id")?.value?.trim();
    const deleteSiteBtn = $("#btn-delete-site");

    if (deleteSiteBtn) {
      deleteSiteBtn.hidden = builtForm || isNewSite;
    }
  }

  function renderMediaListItem(m, options = {}) {
    const { showEdit = true } = options;
    const editBtn =
      showEdit && !m.linked
        ? `<button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-edit-media="${escapeAttr(m.id)}">Edit</button>`
        : "";
    return `
      <li>
        <div>
          <div class="admin-media-list__title">${escapeHtml(m.title)}</div>
          <div class="admin-media-list__meta">${TYPE_LABELS[m.type] || m.type}${m.linked ? "" : ` · ${escapeHtml(formatMediaSrc(m.src))}`}</div>
        </div>
        ${editBtn}
      </li>`;
  }

  function renderBuiltSiteMediaList(site, media, container) {
    const photos = media.filter((m) => m.type === "photo");
    const mapItems = site.cover
      ? [
          {
            id: null,
            title: "Site map",
            type: "map",
            src: site.cover,
            linked: true,
          },
        ]
      : [];
    const modelItems = site.modelSrc
      ? [
          {
            id: null,
            title: "3D model",
            type: "model3d",
            src: site.modelSrc,
            linked: true,
          },
        ]
      : [];

    const mapList = mapItems.length
      ? `<ul class="admin-media-list">${mapItems.map((m) => renderMediaListItem(m, { showEdit: false })).join("")}</ul>`
      : `<p class="admin-media-group__empty">No site map uploaded yet.</p>`;

    const photoList = photos.length
      ? `<ul class="admin-media-list">${photos.map((m) => renderMediaListItem(m)).join("")}</ul>`
      : `<p class="admin-media-group__empty">No photographs uploaded yet.</p>`;

    const modelList = modelItems.length
      ? `<ul class="admin-media-list">${modelItems.map((m) => renderMediaListItem(m, { showEdit: false })).join("")}</ul>`
      : `<p class="admin-media-group__empty">No 3D model uploaded yet.</p>`;

    container.innerHTML = `
      <div class="admin-media-groups">
        <section class="admin-media-group">
          <div class="admin-media-group__head">
            <h4 class="admin-media-group__title admin-media-group__title--map">Site map</h4>
          </div>
          ${mapList}
        </section>
        <section class="admin-media-group">
          <div class="admin-media-group__head">
            <h4 class="admin-media-group__title admin-media-group__title--photo">Photographs</h4>
          </div>
          ${photoList}
        </section>
        <section class="admin-media-group">
          <div class="admin-media-group__head">
            <h4 class="admin-media-group__title admin-media-group__title--model">3D model</h4>
          </div>
          ${modelList}
        </section>
      </div>`;
  }

  function photoTitleFromFile(file) {
    return String(file.name || "Photograph").replace(/\.[^.]+$/i, "");
  }

  function getSelectedPhotoFiles() {
    const fileInput = $("#media-file");
    if (!fileInput?.files?.length) return [];
    return [...fileInput.files].filter((file) => file.type.startsWith("image/"));
  }

  function updateMediaFormUi() {
    const siteId = $("#media-site-id")?.value || editingSiteId;
    const site = siteId ? MatiAdminStore.getSiteById(siteId) : null;
    const cat = site?.category || $("#site-category")?.value;
    const built = categoryShows3d(cat);
    const allowedTypes = categoryMediaTypes(cat);
    const isEdit = Boolean($("#media-id")?.value?.trim());
    const type = $("#media-type")?.value || "photo";

    const mapOpt = $("#media-type-map");
    const modelOpt = $("#media-type-model3d");
    const videoOpt = $("#media-type-video");
    const audioOpt = $("#media-type-audio");
    const linkOpt = $("#media-type-link");

    if (mapOpt) mapOpt.hidden = !allowedTypes.includes("map");
    if (modelOpt) modelOpt.hidden = !allowedTypes.includes("model3d");
    if (videoOpt) videoOpt.hidden = !allowedTypes.includes("video");
    if (audioOpt) audioOpt.hidden = !allowedTypes.includes("audio");
    if (linkOpt) linkOpt.hidden = !allowedTypes.includes("link");

    if (!allowedTypes.includes(type)) {
      $("#media-type").value = allowedTypes[0] || "photo";
    }

    const activeType = $("#media-type")?.value || "photo";
    const usesFile =
      !isEdit && (activeType === "photo" || activeType === "map" || activeType === "model3d");
    const fileField = $("#media-file-field");
    const urlField = $("#media-url-field");
    const titleField = $("#media-title-field");
    const typeField = $("#media-type-field");
    const fileInput = $("#media-file");
    const fileLabel = $("#media-file-label");
    const fileHint = $("#media-file-hint");
    const previewWrap = $("#media-file-preview-wrap");
    const previewImg = $("#media-file-preview");
    const titleInput = $("#media-title");
    const captionHint = $("#media-caption-hint");
    const selectedPhotos =
      activeType === "photo" && usesFile ? getSelectedPhotoFiles() : [];
    const bulkPhotos = selectedPhotos.length > 1;

    if (fileField) fileField.hidden = !usesFile;
    if (urlField) {
      urlField.hidden = usesFile || (isEdit && activeType === "photo");
    }
    if (typeField) typeField.hidden = built || Boolean(mediaModalPresetType);
    if (titleField) {
      titleField.hidden =
        activeType === "map" || activeType === "model3d" || bulkPhotos;
    }
    if (titleInput) {
      titleInput.required = usesFile && activeType === "photo" && !bulkPhotos;
      if (
        usesFile &&
        activeType === "photo" &&
        selectedPhotos.length === 1 &&
        !titleInput.value.trim()
      ) {
        titleInput.placeholder = photoTitleFromFile(selectedPhotos[0]);
      } else if (usesFile && activeType === "photo") {
        titleInput.placeholder = "Photograph title";
      } else {
        titleInput.removeAttribute("placeholder");
      }
    }

    if (fileInput) {
      if (activeType === "photo" || activeType === "map") {
        fileInput.accept = "image/*";
        fileInput.multiple = activeType === "photo";
      } else if (activeType === "model3d") {
        fileInput.accept = ".glb,model/gltf-binary";
        fileInput.multiple = false;
      }
      if (!usesFile) fileInput.value = "";
    }

    if (fileLabel) {
      const labels = {
        photo: "Upload photographs",
        map: "Upload map image",
        model3d: "Upload 3D model (.glb)",
      };
      fileLabel.textContent = labels[activeType] || "Upload file";
    }

    if (fileHint) {
      if (activeType === "model3d") {
        fileHint.textContent = site?.modelSrc
          ? "A 3D model is linked. Choose a file to replace it."
          : "No 3D model uploaded yet.";
      } else if (activeType === "map") {
        fileHint.textContent = site?.cover
          ? "A site map is linked. Choose a file to replace it."
          : "No site map uploaded yet.";
      } else if (activeType === "photo") {
        if (bulkPhotos) {
          fileHint.textContent = `${selectedPhotos.length} photographs selected. Each will use its file name as the title.`;
        } else {
          fileHint.textContent =
            "Choose one or many photographs, or drag images from a folder into this area.";
        }
      }
    }

    if (captionHint) {
      if (activeType === "photo" && usesFile && bulkPhotos) {
        captionHint.textContent =
          "Optional — this caption is applied to every photograph in this batch. Use Edit on each photo later for individual captions.";
        captionHint.hidden = false;
      } else if (activeType === "photo" && usesFile) {
        captionHint.textContent = "Optional caption for this photograph.";
        captionHint.hidden = false;
      } else {
        captionHint.textContent = "";
        captionHint.hidden = true;
      }
    }

    if (previewWrap && previewImg && activeType !== "map") {
      previewWrap.hidden = true;
      previewImg.removeAttribute("src");
    }
  }

  function syncSiteCategoryUi() {
    updateSiteFormFields();
  }

  function setView(view, options = {}) {
    const prevView = currentView;
    currentView = view;
    if (options.category) currentCategory = options.category;

    $$(".admin-nav__btn").forEach((btn) => {
      const btnView = btn.dataset.view;
      const btnCat = btn.dataset.category;
      let active = false;
      if (btnCat) {
        active = view === "heritage" && currentCategory === btnCat;
      } else {
        active = btnView === view;
      }
      btn.classList.toggle("is-active", active);
    });

    $$(".admin-view").forEach((section) => {
      const id = section.id.replace("view-", "");
      section.hidden = id !== view;
    });

    if (view === "reports" && options.report) {
      currentReport = options.report;
      $$("#report-tabs .admin-tabs__btn").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.report === options.report);
      });
    }

    if (view === "gallery" && prevView !== "gallery") {
      window.MatiGalleryEmbed?.resetToCollections();
    } else if (view !== "gallery") {
      delete document.documentElement.dataset.galleryCategory;
    }

    if (view === "dashboard") {
      if (options.skipDashboardRefresh) renderDashboard();
      else void refreshDashboardFromSupabase();
    }
    if (view === "location") renderLocation();
    if (view === "heritage") {
      syncHeritageToolbar();
      renderHeritage();
    } else {
      teardownBuiltHeritageGrid();
    }
    if (view === "leaderboard") renderLeaderboard();
    if (view === "reports") renderReport();
  }

  function openModal(id) {
    const el = $(id);
    if (!el) return;
    el.hidden = false;
    el.removeAttribute("hidden");
  }

  function closeMediaModal() {
    const el = $("#media-modal");
    const siteModal = $("#site-modal");
    mediaModalPresetType = null;
    if (el) {
      el.hidden = true;
      el.setAttribute("hidden", "");
      el.classList.remove("admin-modal--stacked");
    }
    siteModal?.classList.remove("admin-modal--under");
  }

  function closeAllModals() {
    closeModelViewerModal();
    $$(".admin-modal").forEach((m) => {
      m.hidden = true;
      m.setAttribute("hidden", "");
      m.classList.remove("admin-modal--aside", "admin-modal--stacked", "admin-modal--under");
    });
    if (typeof MatiAdminMap !== "undefined") MatiAdminMap.disablePickMode();
    mapPickSession = false;
  }

  function startLogout() {
    if (logoutInProgress) return;
    logoutInProgress = true;

    const overlay = $("#logout-overlay");
    const showMs = 1650;
    const exitMs = 450;

    if (overlay) {
      overlay.hidden = false;
      overlay.removeAttribute("hidden");
      overlay.classList.remove("is-exiting");
      requestAnimationFrame(() => overlay.classList.add("is-active"));
    }

    window.setTimeout(() => {
      if (overlay) overlay.classList.add("is-exiting");
      window.setTimeout(() => {
        if (typeof MatiAuth !== "undefined") MatiAuth.logout();
        window.location.href = "login.html";
      }, exitMs);
    }, showMs);
  }

  function syncMapPickMode() {
    if (typeof MatiAdminMap === "undefined") return;
    const modal = $("#site-modal");
    const cat = $("#site-category")?.value;
    const canPick =
      currentView === "location" &&
      (cat === "built" || cat === "natural") &&
      (mapPickSession || (modal && !modal.hidden));

    if (!canPick) {
      MatiAdminMap.disablePickMode();
      return;
    }

    const latVal = $("#site-lat")?.value;
    const lngVal = $("#site-lng")?.value;
    const current =
      latVal && lngVal ? { lat: Number(latVal), lng: Number(lngVal) } : null;

    MatiAdminMap.enablePickMode((lat, lng) => {
      if ($("#site-lat")) $("#site-lat").value = lat.toFixed(6);
      if ($("#site-lng")) $("#site-lng").value = lng.toFixed(6);
    }, current);
  }

  function formatMediaSrc(src) {
    if (typeof MatiAdminUploads !== "undefined" && MatiAdminUploads.isUploadUri(src)) {
      return "Uploaded file";
    }
    return truncate(src, 48);
  }

  function mediaChips(stats, include3d = true, site = null) {
    const chips = [];
    if (site?.category === "built") {
      if (site.cover) chips.push("1 map");
      if (stats.photos) {
        chips.push(`${stats.photos} photo${stats.photos !== 1 ? "s" : ""}`);
      }
      if (include3d && (site.modelSrc || stats.models)) chips.push("3D model");
      if (!chips.length) return '<span class="admin-table__sub">No media</span>';
      return `<div class="admin-chip-row">${chips.map((c) => `<span class="admin-chip">${c}</span>`).join("")}</div>`;
    }

    if (site?.category === "natural") {
      if (stats.photos) chips.push(`${stats.photos} photo${stats.photos !== 1 ? "s" : ""}`);
      if (stats.videos) chips.push(`${stats.videos} video${stats.videos !== 1 ? "s" : ""}`);
      if (stats.links) chips.push(`${stats.links} link${stats.links !== 1 ? "s" : ""}`);
      if (!chips.length) return '<span class="admin-table__sub">No media</span>';
      return `<div class="admin-chip-row">${chips.map((c) => `<span class="admin-chip">${c}</span>`).join("")}</div>`;
    }

    if (site?.category === "intangible") {
      if (stats.photos) chips.push(`${stats.photos} photo${stats.photos !== 1 ? "s" : ""}`);
      if (stats.videos) chips.push(`${stats.videos} video${stats.videos !== 1 ? "s" : ""}`);
      if (stats.audio) chips.push(`${stats.audio} audio`);
      if (stats.links) chips.push(`${stats.links} link${stats.links !== 1 ? "s" : ""}`);
      if (!chips.length) return '<span class="admin-table__sub">No media</span>';
      return `<div class="admin-chip-row">${chips.map((c) => `<span class="admin-chip">${c}</span>`).join("")}</div>`;
    }

    if (stats.photos) chips.push(`${stats.photos} photo${stats.photos !== 1 ? "s" : ""}`);
    if (stats.videos) chips.push(`${stats.videos} video${stats.videos !== 1 ? "s" : ""}`);
    if (stats.audio) chips.push(`${stats.audio} audio`);
    if (stats.links) chips.push(`${stats.links} link${stats.links !== 1 ? "s" : ""}`);
    if (include3d && stats.models) chips.push(`${stats.models} 3D`);
    if (!chips.length) return '<span class="admin-table__sub">No media</span>';
    return `<div class="admin-chip-row">${chips.map((c) => `<span class="admin-chip">${c}</span>`).join("")}</div>`;
  }

  function updateCategoryCounts() {
    /* reserved for future nav badges */
  }

  async function refreshDashboardFromSupabase() {
    if (typeof MatiAdminStore?.initFromSupabase === "function") {
      await MatiAdminStore.initFromSupabase();
    }
    renderDashboard();
  }

  function renderDashboard() {
    const collections = MatiAdminStore.getDashboardCollectionSummary();
    const community = MatiAdminStore.getDashboardCommunityStats();
    const heritageCards = $("#dashboard-heritage-cards");
    const communityCards = $("#dashboard-community-cards");
    const emptyDb = $("#dashboard-supabase-empty");
    const tbody = $("#dashboard-summary-body");
    const tfoot = $("#dashboard-summary-foot");

    const supabaseConfigured =
      typeof MatiSupabase !== "undefined" && MatiSupabase.isConfigured();
    const remoteSiteCount =
      typeof MatiAdminStore.getRemoteSiteCount === "function"
        ? MatiAdminStore.getRemoteSiteCount()
        : 0;

    if (emptyDb) {
      emptyDb.hidden = !supabaseConfigured || remoteSiteCount > 0;
    }

    if (heritageCards) {
      heritageCards.innerHTML = collections
        .map(
          (collection) => `
        <button
          type="button"
          class="admin-dashboard-card admin-dashboard-card--${collection.key}"
          data-go-heritage="${escapeAttr(collection.key)}"
        >
          <span class="admin-dashboard-card__count">${collection.sites}</span>
          <span class="admin-dashboard-card__label">${escapeHtml(collection.label)}</span>
          <span class="admin-dashboard-card__type">${escapeHtml(collection.type)}</span>
          <span class="admin-dashboard-card__cta">Manage collection</span>
        </button>`,
        )
        .join("");
    }

    if (communityCards) {
      communityCards.innerHTML = `
        <button
          type="button"
          class="admin-dashboard-card admin-dashboard-card--users"
          data-go-view="reports"
          data-go-report="users"
        >
          <span class="admin-dashboard-card__count">${community.registeredUsers}</span>
          <span class="admin-dashboard-card__label">Registered Users</span>
          <span class="admin-dashboard-card__type">Player accounts</span>
          <span class="admin-dashboard-card__cta">View user report</span>
        </button>
        <button
          type="button"
          class="admin-dashboard-card admin-dashboard-card--players"
          data-go-view="leaderboard"
        >
          <span class="admin-dashboard-card__count">${community.gamePlayers}</span>
          <span class="admin-dashboard-card__label">Game Players</span>
          <span class="admin-dashboard-card__type">Earned heritage points</span>
          <span class="admin-dashboard-card__cta">View leaderboard</span>
        </button>`;
    }

    if (tbody && tfoot) {
      const totals = collections.reduce(
        (acc, collection) => ({
          sites: acc.sites + collection.sites,
          photos: acc.photos + collection.photos,
          videos: acc.videos + collection.videos,
          audio: acc.audio + collection.audio,
          models: acc.models + collection.models,
        }),
        { sites: 0, photos: 0, videos: 0, audio: 0, models: 0 },
      );

      tbody.innerHTML = collections
        .map((collection) => {
          const audioCell =
            collection.key === "natural"
              ? '<span class="admin-dashboard-table__empty">—</span>'
              : collection.audio;
          const modelsCell =
            collection.key === "built"
              ? collection.models
              : '<span class="admin-dashboard-table__empty">—</span>';

          return `
          <tr>
            <td class="admin-dashboard-table__name">${escapeHtml(collection.label)}</td>
            <td class="admin-dashboard-table__type">${escapeHtml(collection.type)}</td>
            <td>${collection.sites}</td>
            <td>${collection.photos}</td>
            <td>${collection.videos}</td>
            <td>${audioCell}</td>
            <td>${modelsCell}</td>
          </tr>`;
        })
        .join("");

      tfoot.innerHTML = `
        <tr>
          <td>All collections</td>
          <td></td>
          <td>${totals.sites}</td>
          <td>${totals.photos}</td>
          <td>${totals.videos}</td>
          <td>${totals.audio}</td>
          <td>${totals.models}</td>
        </tr>`;
    }

    updateCategoryCounts();
  }

  function renderLocation() {
    if (typeof MatiAdminMap === "undefined") return;
    const filter = $("#map-heritage-filter");
    if (filter) MatiAdminMap.setCategoryFilter(filter.value);
    void MatiAdminMap.refresh();
  }

  function getFilteredSites() {
    const q = (
      $("#heritage-search")?.value ||
      $("#heritage-search-other")?.value ||
      ""
    )
      .trim()
      .toLowerCase();
    let sites = MatiAdminStore.getSitesByCategory(currentCategory);
    if (q) {
      sites = sites.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.location || "").toLowerCase().includes(q) ||
          (s.heritageCategory || "").toLowerCase().includes(q),
      );
    }
    return sites;
  }

  function renderHeritage() {
    const isBuilt = currentCategory === "built";
    const builtShell = $("#heritage-built-shell");
    const otherShell = $("#heritage-other-shell");
    const grid = $("#heritage-built-grid");
    const tableWrap = $("#heritage-table-wrap");
    const tbody = $("#heritage-sites-body");
    const query = (
      $("#heritage-search")?.value ||
      $("#heritage-search-other")?.value ||
      ""
    ).trim();

    if (builtShell) builtShell.hidden = !isBuilt;
    if (otherShell) otherShell.hidden = isBuilt;
    if (tableWrap) tableWrap.hidden = isBuilt;

    const allSites = getFilteredSites();

    if (!isBuilt) {
      teardownBuiltHeritageGrid();
    } else {
      const allBuilt = MatiAdminStore.getSitesByCategory("built").filter(
        (site) => {
          const q = query.toLowerCase();
          if (!q) return true;
          return site.name.toLowerCase().includes(q);
        },
      );
      const sites = filterAndSortBuiltSites(allBuilt);
      renderBuiltHeritageCount(MatiAdminStore.getSitesByCategory("built").length);
      renderBuiltHeritageGrid(sites);
      return;
    }

    const col3d = $("#heritage-3d-col");
    if (col3d) col3d.hidden = true;
    if (!tbody) return;

    if (!allSites.length) {
      tbody.innerHTML = `
        <tr><td colspan="5" class="admin-empty">No sites in this category yet. Use <strong>Add site</strong> to create one.</td></tr>`;
      return;
    }

    tbody.innerHTML = allSites
      .map((site) => {
        const stats = MatiAdminStore.getSiteStats(site.id);
        const location = site.location?.trim() || "—";
        return `
        <tr>
          <td>
            <div class="admin-table__name">${escapeHtml(site.name)}</div>
          </td>
          <td class="admin-table__location">${escapeHtml(location)}</td>
          <td>${mediaChips(stats, false, site)}</td>
          <td>
            <button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-edit-site="${escapeAttr(site.id)}">${heritageCardActionLabel(site)}</button>
          </td>
        </tr>`;
      })
      .join("");
  }

  function builtCardStage(site) {
    const modelSrc = getSiteModelSource(site);
    const cover = site.cover || "";
    const uploads =
      typeof MatiAdminUploads !== "undefined" ? MatiAdminUploads : null;

    if (modelSrc) {
      const poster =
        cover && !uploads?.isUploadUri(cover) ? escapeAttr(cover) : "";
      const uploadAttr = uploads?.isUploadUri(modelSrc)
        ? `data-model-upload="${escapeAttr(modelSrc)}"`
        : "";
      const srcAttr = !uploads?.isUploadUri(modelSrc)
        ? `data-model-src="${escapeAttr(modelSrc)}"`
        : "";
      const posterAttr = poster ? `data-model-poster="${poster}"` : "";
      const posterHtml = poster
        ? `<img class="admin-heritage-card__cover admin-heritage-card__poster" src="${poster}" alt="" loading="lazy" decoding="async" />`
        : `<div class="admin-heritage-card__placeholder"><span class="admin-heritage-card__placeholder-icon" aria-hidden="true">3D</span><span>Loading preview…</span></div>`;
      return `<div class="admin-heritage-card__model-slot" ${srcAttr} ${uploadAttr} ${posterAttr}>${posterHtml}</div>`;
    }

    if (cover) {
      if (uploads?.isUploadUri(cover)) {
        return `<img class="admin-heritage-card__cover" data-upload-src="${escapeAttr(cover)}" alt="" loading="lazy" decoding="async" />`;
      }
      return `<img class="admin-heritage-card__cover" src="${escapeAttr(cover)}" alt="" loading="lazy" decoding="async" />`;
    }

    return `<div class="admin-heritage-card__placeholder">
      <span class="admin-heritage-card__placeholder-icon" aria-hidden="true">3D</span>
      <span>No 3D model yet</span>
    </div>`;
  }

  function heritageCardActionLabel(site) {
    return MatiAdminStore.siteHasAdminEdits(site.id) ? "Update" : "Manage";
  }

  function siteFormSubmitLabel(siteId) {
    if (!siteId || MatiAdminStore.isDraftSiteId(siteId)) return "Save site";
    return "Update";
  }

  function siteFormModalTitle(siteId) {
    if (!siteId || MatiAdminStore.isDraftSiteId(siteId)) return "Add site";
    return "Edit site";
  }

  function syncSiteFormSubmitLabel(siteId) {
    const resolvedId = siteId ?? $("#site-id")?.value?.trim() ?? "";
    const titleEl = $("#site-modal-title");
    const submitBtn = $("#btn-save-site");

    if (titleEl) {
      titleEl.textContent = siteFormModalTitle(resolvedId || null);
    }
    if (submitBtn) {
      submitBtn.textContent = siteFormSubmitLabel(resolvedId || null);
    }
  }

  function renderBuiltHeritageGrid(sites) {
    const grid = $("#heritage-built-grid");
    if (!grid) return;

    if (builtModelObserver) {
      builtModelObserver.disconnect();
      builtModelObserver = null;
    }
    clearHeritagePreviewUrls();

    if (!sites.length) {
      const totalBuilt = MatiAdminStore.getSitesByCategory("built").length;
      if (!totalBuilt) {
        grid.innerHTML = `
          <div class="admin-heritage-grid__empty">
            <div class="admin-heritage-grid__empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
            </div>
            <h3 class="admin-heritage-grid__empty-title">No built heritage sites yet</h3>
            <p class="admin-heritage-grid__empty-text">Add your first site to start organizing photographs, maps, and 3D models.</p>
            <button type="button" class="admin-btn admin-btn--primary" data-add-built-site>Add site</button>
          </div>`;
      } else {
        grid.innerHTML = `
          <div class="admin-heritage-grid__empty">
            <div class="admin-heritage-grid__empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <h3 class="admin-heritage-grid__empty-title">No sites match your filters</h3>
            <p class="admin-heritage-grid__empty-text">Try clearing the search or choosing a different filter.</p>
          </div>`;
      }
      return;
    }

    grid.innerHTML = sites
      .map((site, index) => {
        const location = site.location
          ? escapeHtml(site.location)
          : "Barangay not set";
        const locationClass = site.location
          ? "admin-heritage-card__meta"
          : "admin-heritage-card__meta admin-heritage-card__meta--muted";
        const coords = MatiAdminStore.resolveCoords(site);
        const mapBtn = coords
          ? `<button type="button" class="admin-btn admin-btn--ghost admin-btn--sm admin-heritage-card__map-btn" data-view-on-map="${escapeAttr(site.id)}">View on map</button>`
          : "";
        const viewBtn = builtSiteHas3d(site)
          ? `<button type="button" class="admin-btn admin-btn--ghost admin-btn--sm admin-heritage-card__view-btn" data-view-model="${escapeAttr(site.id)}">VIEW</button>`
          : "";

        return `
      <article
        class="admin-heritage-card"
        data-edit-site="${escapeAttr(site.id)}"
        tabindex="0"
        role="button"
        aria-label="${heritageCardActionLabel(site)} ${escapeAttr(site.name)}"
        style="--card-delay: ${Math.min(index * 45, 360)}ms"
      >
        <div class="admin-heritage-card__stage">
          ${builtCardBadges(site)}
          ${builtCardStage(site)}
          ${viewBtn ? `<div class="admin-heritage-card__stage-actions">${viewBtn}</div>` : ""}
        </div>
        <div class="admin-heritage-card__body">
          <div class="admin-heritage-card__info">
            <h3 class="admin-heritage-card__title">${escapeHtml(site.name)}</h3>
            <p class="${locationClass}">
              <svg class="admin-heritage-card__pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              ${location}
            </p>
          </div>
          <div class="admin-heritage-card__foot">
            <div class="admin-heritage-card__actions">
              ${mapBtn}
              <button type="button" class="admin-btn admin-btn--primary admin-btn--sm admin-heritage-card__btn" data-edit-site="${escapeAttr(site.id)}">${heritageCardActionLabel(site)}</button>
            </div>
          </div>
        </div>
      </article>`;
      })
      .join("");

    hydrateBuiltHeritageCards();
    observeBuiltModelCards();

    if (!grid.dataset.keybound) {
      grid.dataset.keybound = "true";
      grid.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const card = e.target.closest(".admin-heritage-card[data-edit-site]");
        if (!card) return;
        e.preventDefault();
        openSiteModal(card.dataset.editSite);
      });
    }
  }

  function teardownBuiltHeritageGrid() {
    if (builtModelObserver) {
      builtModelObserver.disconnect();
      builtModelObserver = null;
    }
    clearHeritagePreviewUrls();
    const grid = $("#heritage-built-grid");
    if (grid) grid.innerHTML = "";
  }

  function clearHeritagePreviewUrls() {
    heritagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    heritagePreviewUrls.clear();
  }

  async function hydrateBuiltHeritageCards() {
    if (typeof MatiAdminUploads === "undefined") return;

    const uploadNodes = $$(
      "#heritage-built-grid img[data-upload-src]",
    );
    await Promise.all(
      uploadNodes.map(async (node) => {
        const uri = node.dataset.uploadSrc;
        if (!uri) return;
        const url = await MatiAdminUploads.createObjectUrl(uri);
        if (!url) return;
        heritagePreviewUrls.add(url);
        node.src = url;
      }),
    );
  }

  function observeBuiltModelCards() {
    if (builtModelObserver) {
      builtModelObserver.disconnect();
      builtModelObserver = null;
    }

    const grid = $("#heritage-built-grid");
    const shell = $("#heritage-built-shell");
    if (!grid || shell?.hidden) return;

    const slots = $$("#heritage-built-grid .admin-heritage-card__model-slot");
    if (!slots.length) return;

    builtModelObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const slot = entry.target;
          if (slot.dataset.modelLoaded === "true") return;
          slot.dataset.modelLoaded = "true";
          loadBuiltModelIntoSlot(slot);
          builtModelObserver?.unobserve(slot);
        });
      },
      { rootMargin: "80px", threshold: 0.15 },
    );

    slots.forEach((slot) => builtModelObserver.observe(slot));
  }

  async function loadBuiltModelIntoSlot(slot) {
    let src = slot.dataset.modelSrc || "";
    if (slot.dataset.modelUpload && typeof MatiAdminUploads !== "undefined") {
      const url = await MatiAdminUploads.createObjectUrl(slot.dataset.modelUpload);
      if (url) {
        heritagePreviewUrls.add(url);
        src = url;
      }
    }
    if (!src) return;

    const title =
      slot.closest(".admin-heritage-card")?.querySelector(
        ".admin-heritage-card__title",
      )?.textContent || "3D model";
    const viewer = document.createElement("model-viewer");
    viewer.className = "admin-heritage-card__model";
    viewer.setAttribute("src", src);
    viewer.setAttribute("alt", title);
    const poster = slot.dataset.modelPoster;
    if (poster) viewer.setAttribute("poster", poster);
    viewer.setAttribute("auto-rotate", "");
    viewer.setAttribute("rotation-per-second", "20deg");
    viewer.setAttribute("camera-orbit", "0deg 78deg 108%");
    viewer.setAttribute("interaction-prompt", "none");
    viewer.setAttribute("touch-action", "pan-y");
    viewer.setAttribute("loading", "lazy");
    slot.replaceChildren(viewer);
  }

  function renderLeaderboardCard(row, index) {
    const rank = row.rank;
    const isRunnerUp = rank > 3;
    const points = Number(row.points) || 0;
    const sizeClass = isRunnerUp ? "admin-lb-card--runner" : "admin-lb-card--top";
    const rankHighlight =
      rank === 1
        ? " admin-lb-card--rank-1"
        : rank === 2
          ? " admin-lb-card--rank-2"
          : rank === 3
            ? " admin-lb-card--rank-3"
            : "";
    const crown =
      rank === 1
        ? `<span class="admin-lb-card__crown" aria-hidden="true">👑</span>`
        : "";

    return `
      <article
        class="admin-lb-card admin-lb-card--animate ${sizeClass}${rankHighlight}"
        role="listitem"
        style="animation-delay: ${index * 0.1}s"
      >
        <span class="admin-lb-card__rank">${rank}</span>
        <div class="admin-lb-card__avatar-wrap">
          ${crown}
          <div class="admin-lb-card__avatar-ring">
            <img
              class="admin-lb-card__avatar"
              src="${escapeAttr(row.avatarUrl)}"
              alt=""
              width="64"
              height="64"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
        <p class="admin-lb-card__name">${escapeHtml(row.username)}</p>
        <div
          class="admin-lb-card__points admin-lb-points-val"
          data-target="${points}"
        >0 <small>Pts</small></div>
      </article>`;
  }

  function animateAdminLeaderboardPoints(root) {
    if (!root) return;

    root.querySelectorAll(".admin-lb-points-val").forEach((el, index) => {
      const end = parseInt(el.dataset.target || "0", 10);
      const start = 0;
      const duration = 1000;

      window.setTimeout(() => {
        let startTimestamp = null;
        const step = (timestamp) => {
          if (!startTimestamp) startTimestamp = timestamp;
          const progress = Math.min((timestamp - startTimestamp) / duration, 1);
          const val = Math.floor(progress * (end - start) + start);
          el.innerHTML = `${val.toLocaleString()} <small>Pts</small>`;
          if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
      }, 500 + index * 100);
    });
  }

  function renderLeaderboardRow(row) {
    const points = Number(row.points) || 0;

    return `
      <tr>
        <td>${row.rank}</td>
        <td>
          <div class="admin-leaderboard-player">
            <img
              class="admin-leaderboard-avatar"
              src="${escapeAttr(row.avatarUrl)}"
              alt=""
              width="36"
              height="36"
              loading="lazy"
              decoding="async"
            />
            <span class="admin-table__name admin-table__name--lb">${escapeHtml(row.username)}</span>
          </div>
        </td>
        <td>${points.toLocaleString()}</td>
      </tr>`;
  }

  function renderLeaderboard() {
    const list = $("#leaderboard-body");
    const body = $(".admin-leaderboard__body");
    const columns = $(".admin-leaderboard__columns");
    if (!list) return;

    const rows = MatiAdminStore.getLeaderboard().map((row, i) => ({
      ...row,
      rank: i + 1,
    }));

    if (!rows.length) {
      if (columns) columns.hidden = true;
      list.innerHTML = `<p class="admin-leaderboard__empty">No leaderboard records yet.</p>`;
      return;
    }

    if (columns) columns.hidden = false;
    list.innerHTML = rows.map((row, i) => renderLeaderboardCard(row, i)).join("");
    animateAdminLeaderboardPoints(body || list);
  }

  function renderSiteMediaList(siteId) {
    const list = $("#site-media-list");
    if (!list) return;

    if (!siteId) {
      list.innerHTML = "";
      syncSiteMediaControls();
      return;
    }

    syncSiteMediaControls();

    const site = MatiAdminStore.getSiteById(siteId);
    const media = MatiAdminStore.getSiteMedia(siteId);

    if (site?.category === "built") {
      renderBuiltSiteMediaList(site, media, list);
      return;
    }

    const items = [...media];

    if (!items.length) {
      list.innerHTML = `<p class="admin-empty" style="padding:1rem 0">No multimedia files yet.</p>`;
      return;
    }

    list.innerHTML = `<ul class="admin-media-list">${items
      .map((m) => renderMediaListItem(m))
      .join("")}</ul>`;
  }

  function renderBuiltSiteModalPreview(site) {
    const panel = $("#site-built-preview");
    if (!panel) return;

    const built = site?.category === "built" || isBuiltHeritageForm();
    if (!built || !site) {
      panel.hidden = true;
      panel.innerHTML = "";
      return;
    }

    panel.hidden = false;
    panel.innerHTML = `
      <div class="admin-site-preview__stage">
        ${builtCardBadges(site)}
        ${builtCardStage(site)}
      </div>
      <div class="admin-site-preview__body">
        <h3 class="admin-site-preview__title">${escapeHtml(site.name)}</h3>
        <p class="admin-site-preview__location">${escapeHtml(site.location || "Barangay not set")}</p>
        ${
          builtSiteHas3d(site)
            ? `<div class="admin-site-preview__actions">
                <button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-view-model="${escapeAttr(site.id)}">View 3D model</button>
              </div>`
            : ""
        }
      </div>`;

    const stageSlot = panel.querySelector(".admin-heritage-card__model-slot");
    if (stageSlot && stageSlot.dataset.modelLoaded !== "true") {
      stageSlot.dataset.modelLoaded = "true";
      loadBuiltModelIntoSlot(stageSlot);
    }

    const uploadImg = panel.querySelector("img[data-upload-src]");
    if (uploadImg && typeof MatiAdminUploads !== "undefined") {
      MatiAdminUploads.createObjectUrl(uploadImg.dataset.uploadSrc).then((url) => {
        if (url) uploadImg.src = url;
      });
    }
  }

  function viewBuiltSiteOnMap(siteId) {
    const site = MatiAdminStore.getSiteById(siteId);
    if (!site || !MatiAdminStore.resolveCoords(site)) {
      showToast("This site does not have map coordinates yet.");
      return;
    }

    setView("location");
    if (typeof MatiAdminMap !== "undefined") {
      MatiAdminMap.setCategoryFilter("built");
      void MatiAdminMap.refresh().then(() => {
        MatiAdminMap.focusSite(siteId);
      });
    }
  }

  function openSiteModal(siteId) {
    editingSiteId = siteId || null;
    const isNew = !siteId;
    syncBuiltDeleteUi();

    if (isNew) {
      $("#site-id").value = "";
      $("#site-name").value = "";
      syncSiteCategoryValue(currentCategory);
      $("#site-heritage-type").value = "";
      $("#site-ownership").value = "";
      $("#site-location").value = "";
      $("#site-lat").value = "";
      $("#site-lng").value = "";
      $("#site-desc").value = "";
      renderSiteMediaList(null);
      renderBuiltSiteModalPreview(null);
    } else {
      const site = MatiAdminStore.getSiteById(siteId);
      if (!site) return;
      const coords = MatiAdminStore.resolveCoords(site);
      $("#site-id").value = site.id;
      $("#site-name").value = site.name;
      syncSiteCategoryValue(site.category);
      $("#site-heritage-type").value = site.heritageCategory || "";
      $("#site-ownership").value = site.ownership || "";
      $("#site-location").value = site.location || "";
      $("#site-lat").value = coords?.lat ?? "";
      $("#site-lng").value = coords?.lng ?? "";
      $("#site-desc").value = site.description || "";
      renderSiteMediaList(site.id);
      renderBuiltSiteModalPreview(site);
    }

    openModal("#site-modal");
    const cat = $("#site-category")?.value;
    const modal = $("#site-modal");
    if (modal) {
      const aside =
        currentView === "location" && (cat === "built" || cat === "natural");
      modal.classList.toggle("admin-modal--aside", aside);
    }
    syncSiteCategoryUi();
    syncSiteFormSubmitLabel(siteId);
    requestAnimationFrame(() => {
      syncSiteDescriptionHeight();
    });
  }

  function openMediaModal(mediaId, siteId, presetType) {
    const isNew = !mediaId;
    mediaModalPresetType = presetType || null;
    const titles = {
      photo: isNew ? "Add photographs" : "Edit photograph",
      map: isNew ? "Add site map" : "Edit site map",
      model3d: isNew ? "Add 3D model" : "Edit 3D model",
      video: isNew ? "Add video" : "Edit video",
      audio: isNew ? "Add audio recording" : "Edit audio recording",
      link: isNew ? "Add video link" : "Edit video link",
    };
    const siteForTitle = siteId || editingSiteId;
    const site = siteForTitle ? MatiAdminStore.getSiteById(siteForTitle) : null;
    const builtSite = site?.category === "built" || isBuiltHeritageForm();
    let modalType = presetType || "photo";

    $("#media-site-id").value = siteId || editingSiteId || "";
    const fileInput = $("#media-file");
    if (fileInput) fileInput.value = "";
    const previewWrap = $("#media-file-preview-wrap");
    const previewImg = $("#media-file-preview");
    if (previewWrap) previewWrap.hidden = true;
    if (previewImg) previewImg.removeAttribute("src");

    if (isNew) {
      $("#media-id").value = "";
      $("#media-type").value = presetType || "photo";
      modalType = presetType || "photo";
      $("#media-title").value = "";
      $("#media-src").value = "";
      $("#media-caption").value = "";
    } else {
      const item = MatiAdminStore.getAllMedia().find((m) => m.id === mediaId);
      if (!item) return;
      $("#media-id").value = item.id;
      $("#media-site-id").value = item.siteId;
      $("#media-type").value = item.type;
      modalType = item.type;
      mediaModalPresetType = item.type;
      $("#media-title").value = item.title;
      $("#media-src").value = item.src;
      $("#media-caption").value = item.caption || "";
    }

    $("#media-modal-title").textContent = isNew
      ? builtSite && presetType
        ? titles[presetType] || "Add multimedia files"
        : presetType
          ? titles[presetType] || "Add multimedia files"
          : "Add multimedia files"
      : titles[modalType] || "Edit multimedia";

    openModal("#media-modal");
    const siteModal = $("#site-modal");
    const mediaModal = $("#media-modal");
    if (mediaModal) {
      mediaModal.classList.add("admin-modal--stacked");
    }
    if (siteModal && !siteModal.hidden) {
      siteModal.classList.add("admin-modal--under");
    }
    syncBuiltDeleteUi();
    updateMediaFormUi();

    requestAnimationFrame(() => {
      if (builtSite && isNew) {
        $("#media-file")?.focus();
      } else {
        $("#media-type")?.focus();
      }
    });
  }

  function createDraftSiteId() {
    return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function ensureSiteDraft() {
    let siteId = $("#site-id")?.value?.trim();
    const existing = siteId ? MatiAdminStore.getSiteById(siteId) : null;
    if (existing) return existing;

    const site = persistSiteFromForm({ draft: true, siteId: siteId || createDraftSiteId() });
    if (!site) return null;

    editingSiteId = site.id;
    $("#site-id").value = site.id;
    syncBuiltDeleteUi();
    renderSiteMediaList(site.id);
    return site;
  }

  function handleOpenAddMedia(presetType) {
    const site = ensureSiteDraft();
    if (!site) return;

    openMediaModal(null, site.id, presetType);
  }

  function persistSiteFromForm(options = {}) {
    const { requireName = false, draft = false, siteId: forcedSiteId } = options;
    const existingId = $("#site-id").value.trim();
    const name = $("#site-name").value.trim();
    if (requireName && !name) return null;

    const category = $("#site-category").value;
    const existing = existingId ? MatiAdminStore.getSiteById(existingId) : null;
    const siteId =
      forcedSiteId ||
      existingId ||
      (name ? MatiAdminStore.slugId(name) : createDraftSiteId());
    const displayName = name || existing?.name || "Untitled site";

    if (!draft && !name && MatiAdminStore.isDraftSiteId(siteId)) {
      return null;
    }

    return MatiAdminStore.saveSite({
      id: siteId,
      name: displayName,
      category,
      categoryLabel: MatiAdminStore.categoryLabel(category),
      heritageCategory:
        category === "built"
          ? $("#site-heritage-type").value.trim()
          : existing?.heritageCategory || "",
      ownership:
        category === "built"
          ? $("#site-ownership").value.trim()
          : existing?.ownership || "",
      location: $("#site-location").value,
      lat: $("#site-lat").value,
      lng: $("#site-lng").value,
      cover: existing?.cover || "",
      modelSrc: categoryShows3d(category) ? existing?.modelSrc || "" : "",
      description: $("#site-desc").value,
    });
  }

  function refreshSiteViews(siteId) {
    renderSiteMediaList(siteId);
    renderHeritage();
    renderDashboard();
    renderLocation();
    window.MatiGalleryEmbed?.refresh?.();
  }

  async function saveSiteForm(e) {
    e.preventDefault();
    const name = $("#site-name").value.trim();
    if (!name) {
      showToast("Enter a site name before saving.");
      $("#site-name")?.focus();
      return;
    }

    let siteId = $("#site-id").value.trim();
    const wasDraft = MatiAdminStore.isDraftSiteId(siteId);
    const nextId = MatiAdminStore.slugId(name);

    if (wasDraft && siteId !== nextId) {
      MatiAdminStore.migrateSite(siteId, nextId);
      siteId = nextId;
      $("#site-id").value = nextId;
    }

    const site = persistSiteFromForm({ requireName: true, siteId });
    if (!site) return;

    editingSiteId = site.id;
    $("#site-id").value = site.id;
    syncBuiltDeleteUi();
    refreshSiteViews(site.id);
    syncSiteFormSubmitLabel(site.id);
    showToast(
      wasDraft
        ? "Site created."
        : MatiAdminStore.siteHasAdminEdits(site.id)
          ? "Site updated."
          : "Site saved.",
    );
  }

  async function saveMediaForm(e) {
    e.preventDefault();
    let siteId =
      $("#media-site-id").value ||
      editingSiteId ||
      $("#site-id")?.value?.trim();

    if (!siteId) {
      const saved = ensureSiteDraft();
      if (!saved) {
        showToast("Could not prepare this site for upload.");
        return;
      }
      siteId = saved.id;
      $("#media-site-id").value = saved.id;
    }

    const site = MatiAdminStore.getSiteById(siteId);
    if (!site) {
      showToast("Could not find this site. Save the site and try again.");
      return;
    }

    const isNew = !$("#media-id").value.trim();
    const type = $("#media-type").value;
    const allowedTypes = categoryMediaTypes(site.category);

    if (!allowedTypes.includes(type)) {
      const labels = {
        photo: "photographs",
        map: "site maps",
        model3d: "3D models",
        video: "videos",
        audio: "audio",
        link: "links",
      };
      showToast(
        `${site.categoryLabel || MatiAdminStore.categoryLabel(site.category)} only supports ${allowedTypes.map((t) => labels[t] || t).join(", ")}.`,
      );
      return;
    }
    const fileInput = $("#media-file");
    const files = fileInput?.files ? [...fileInput.files] : [];

    if (isNew && (type === "photo" || type === "map" || type === "model3d")) {
      if (!files.length) {
        showToast("Choose a file to upload.");
        return;
      }
      if (type === "model3d" && !files[0].name.toLowerCase().endsWith(".glb")) {
        showToast("3D model must be a .glb file.");
        return;
      }

      try {
        if (typeof MatiAdminUploads === "undefined") {
          showToast("Uploads are not available.");
          return;
        }
        if (type === "map") {
          const cover = await MatiAdminUploads.put(`${siteId}/map`, files[0]);
          MatiAdminStore.saveSite({ ...site, cover });
          showToast("Site map uploaded.");
        } else if (type === "model3d") {
          const modelSrc = await MatiAdminUploads.put(`${siteId}/model`, files[0]);
          MatiAdminStore.saveSite({ ...site, modelSrc });
          showToast("3D model uploaded.");
        } else {
          const sharedCaption = $("#media-caption").value;
          const sharedTitle = $("#media-title").value.trim();
          const imageFiles = files.filter((file) => file.type.startsWith("image/"));
          if (!imageFiles.length) {
            showToast("Choose at least one image file.");
            return;
          }
          const uploadedIds = [];
          for (const [i, file] of imageFiles.entries()) {
            const key = `${siteId}/photos/${MatiAdminStore.slugId(file.name)}-${Date.now()}-${i}`;
            const src = await MatiAdminUploads.put(key, file);
            const saved = MatiAdminStore.saveMedia({
              siteId,
              type: "photo",
              title:
                imageFiles.length > 1
                  ? photoTitleFromFile(file)
                  : sharedTitle || photoTitleFromFile(file),
              src,
              caption: sharedCaption,
            });
            if (!saved) {
              showToast("Could not save photograph.");
              return;
            }
            uploadedIds.push(saved.id);
          }
          if (uploadedIds.length > 1) {
            const ordered = MatiAdminStore.getOrderedSiteMedia(siteId, "photo").map(
              (item) => item.id,
            );
            const rest = ordered.filter((id) => !uploadedIds.includes(id));
            MatiAdminStore.reorderSiteMedia(siteId, "photo", [...uploadedIds, ...rest]);
          }
          showToast(
            imageFiles.length > 1 ? "Photographs uploaded." : "Photograph uploaded.",
          );
        }
      } catch {
        showToast("Could not upload file.");
        return;
      }

      closeMediaModal();
      refreshSiteViews(siteId);
      if ($("#site-modal") && !$("#site-modal").hidden) {
        syncSiteFormSubmitLabel(siteId);
      }
      return;
    }

    if (!isNew && type === "photo") {
      const mediaId = $("#media-id").value.trim();
      const item = MatiAdminStore.getAllMedia().find((m) => m.id === mediaId);
      if (!item) {
        showToast("Could not find this photograph.");
        return;
      }
      const title = $("#media-title").value.trim();
      if (!title) {
        showToast("Title is required.");
        return;
      }

      MatiAdminStore.saveMedia({
        id: item.id,
        siteId,
        type: "photo",
        title,
        src: item.src,
        caption: $("#media-caption").value,
      });

      closeMediaModal();
      refreshSiteViews(siteId);
      if ($("#site-modal") && !$("#site-modal").hidden) {
        syncSiteFormSubmitLabel(siteId);
      }
      showToast("Photograph updated.");
      return;
    }

    const src = $("#media-src").value.trim();
    const title = $("#media-title").value.trim();
    if (!src || !title) {
      showToast("Title and file path or URL are required.");
      return;
    }

    MatiAdminStore.saveMedia({
      id: $("#media-id").value.trim() || undefined,
      siteId,
      type,
      title,
      src,
      caption: $("#media-caption").value,
    });

    closeMediaModal();
    refreshSiteViews(siteId);
    if ($("#site-modal") && !$("#site-modal").hidden) {
      syncSiteFormSubmitLabel(siteId);
    }
    showToast(isNew ? "Multimedia added." : "Multimedia updated.");
  }

  const HERITAGE_REPORT_HEADERS_NATURAL = [
    { key: "name", label: "Site name" },
    { key: "location", label: "Location" },
    { key: "photos", label: "Photos" },
    { key: "videos", label: "Videos" },
    { key: "links", label: "Links" },
  ];

  const HERITAGE_REPORT_HEADERS_INTANGIBLE = [
    { key: "name", label: "Site name" },
    { key: "location", label: "Location" },
    { key: "photos", label: "Photos" },
    { key: "videos", label: "Videos" },
    { key: "audio", label: "Audio" },
    { key: "links", label: "Links" },
  ];

  const HERITAGE_REPORT_HEADERS_BUILT = [
    { key: "name", label: "Site name" },
    { key: "heritageType", label: "Heritage type" },
    { key: "ownership", label: "Ownership" },
    { key: "location", label: "Location" },
    { key: "photos", label: "Photos" },
    { key: "models", label: "3D Model" },
  ];

  function isHeritageReportKey(report) {
    return report === "built" || report === "natural" || report === "intangible";
  }

  function reportAssetUrl(path) {
    try {
      return new URL(path, window.location.href).href;
    } catch {
      return path;
    }
  }

  async function fetchReportImageDataUrl(path) {
    const response = await fetch(reportAssetUrl(path));
    if (!response.ok) throw new Error("image fetch failed");
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function getReportPrintStyles() {
    return `
    @page { size: A4 landscape; margin: 10mm; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      height: 100%;
      margin: 0;
    }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 11pt;
      color: #111;
      background: #f1f5f9;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .report-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    .report-print-hint {
      margin: 0;
      flex: 1 1 16rem;
      font: 500 0.8125rem "Segoe UI", system-ui, sans-serif;
      color: #475569;
    }
    .report-toolbar__actions {
      display: flex;
      gap: 0.5rem;
      margin-left: auto;
    }
    .report-toolbar button {
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      background: #fff;
      color: #0f172a;
      font: 600 0.875rem "Segoe UI", system-ui, sans-serif;
      padding: 0.45rem 0.9rem;
      cursor: pointer;
    }
    .report-toolbar button:first-of-type {
      background: #047857;
      border-color: #047857;
      color: #fff;
    }
    .report-shell {
      display: flex;
      justify-content: center;
      padding: 1.25rem 1rem 2rem;
      min-height: calc(100vh - 3.5rem);
    }
    .report-page {
      width: 100%;
      max-width: 297mm;
      min-height: 210mm;
      margin: 0 auto;
      padding: 10mm 12mm 8mm;
      background: #fff;
      box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
      display: flex;
      flex-direction: column;
    }
    .report-body {
      flex: 1 1 auto;
      width: 100%;
    }
    .report-letterhead {
      display: grid;
      grid-template-columns: 180px 1fr 180px;
      align-items: center;
      gap: 0.75rem 1.25rem;
      margin-bottom: 0.65rem;
    }
    .report-letterhead__logo {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 148px;
    }
    .report-letterhead__logo img {
      display: block;
      width: auto;
      height: 148px;
      max-height: 148px;
      object-fit: contain;
    }
    .report-letterhead__text {
      text-align: center;
      line-height: 1.35;
    }
    .report-letterhead__text p {
      margin: 0;
      font-size: 10.5pt;
    }
    .report-letterhead__gov {
      font-size: 11pt !important;
      font-weight: 700;
    }
    .report-letterhead__office {
      margin-top: 0.2rem !important;
      font-size: 11pt !important;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .report-letterhead__lci-title {
      margin: 0 0 0.65rem;
      font-size: 12pt;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      text-align: center;
    }
    .report-compliance,
    .report-intro {
      margin: 0 0 0.65rem;
      font-size: 8.5pt;
      line-height: 1.45;
      text-align: center;
    }
    .report-compliance {
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .report-intro {
      margin-bottom: 0.85rem;
      font-style: italic;
    }
    .report-rule {
      border: 0;
      border-top: 1.5px solid #111;
      margin: 0 0 0.85rem;
    }
    .lci-inventory-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0.85rem;
      table-layout: fixed;
    }
    .lci-inventory-table th,
    .lci-inventory-table td {
      border: 1px solid #222;
      padding: 0.35rem 0.4rem;
      text-align: left;
      vertical-align: top;
      word-break: break-word;
      font-size: 7.25pt;
      line-height: 1.35;
    }
    .lci-inventory-table th {
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      background: #f8f8f8;
    }
    .lci-inventory-table .col-no { width: 4%; }
    .lci-inventory-table .col-name { width: 11%; }
    .lci-inventory-table .col-location { width: 11%; }
    .lci-inventory-table .col-type { width: 8%; }
    .lci-inventory-table .col-category { width: 9%; }
    .lci-inventory-table .col-ownership { width: 8%; }
    .lci-inventory-table .col-description { width: 22%; }
    .lci-inventory-table .col-media { width: 5%; text-align: center; }
    .lci-inventory-table .col-area,
    .lci-inventory-table .col-year,
    .lci-inventory-table .col-declaration,
    .lci-inventory-table .col-reference { width: 7%; }
    .lci-details {
      margin-top: 0.5rem;
      font-size: 8.5pt;
      line-height: 1.5;
    }
    .lci-details p {
      margin: 0 0 0.35rem;
    }
    .lci-year {
      margin-top: 0.65rem !important;
      text-align: right;
      font-weight: 700;
    }
    .report-body-title {
      display: none;
    }
    .report-body-subtitle {
      display: none;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1.1rem;
    }
    th, td {
      border: 1px solid #222;
      padding: 0.45rem 0.65rem;
      text-align: left;
      vertical-align: top;
    }
    th {
      width: 30%;
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: #fafafa;
    }
    td { font-size: 10.5pt; }
    .report-section h2 {
      margin: 0 0 0.5rem;
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .report-section p {
      margin: 0;
      line-height: 1.65;
      text-align: justify;
    }
    .report-footer {
      flex-shrink: 0;
      margin-top: auto;
      padding-top: 0.85rem;
      padding-bottom: 0;
      border-top: 1.5px solid #111;
      font-size: 9.5pt;
      line-height: 1.45;
      color: #111;
    }
    .report-footer p {
      margin: 0;
    }
    @media print {
      .no-print { display: none !important; }
      html, body {
        height: auto;
        background: #fff;
      }
      .report-shell {
        display: block;
        padding: 0;
        min-height: 0;
      }
      .report-page {
        width: auto;
        max-width: none;
        height: 210mm;
        min-height: 210mm;
        margin: 0;
        padding: 10mm 12mm 8mm;
        box-shadow: none;
        page-break-after: avoid;
      }
      .report-body {
        flex: 1 1 auto;
        min-height: 0;
      }
      .report-footer {
        margin-top: auto;
        padding-top: 0.85rem;
      }
    }`;
  }

  function buildSiteReportFooterHtml() {
    return `
    <footer class="report-footer">
      <p>City of Mati</p>
      <p>Province of Davao Oriental</p>
      <p>Region XI</p>
    </footer>`;
  }

  function buildSiteReportPrintHtml(site, sealLogo, tourismLogo) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>&#8203;</title>
  <style>${getReportPrintStyles()}</style>
</head>
<body>
  <div class="report-toolbar no-print">
    <p class="report-print-hint">Turn off <strong>Headers and footers</strong> in the print dialog to hide the date, URL, and page numbers.</p>
    <div class="report-toolbar__actions">
      <button type="button" onclick="window.print()">Print</button>
      <button type="button" onclick="window.close()">Close</button>
    </div>
  </div>
  ${buildSiteReportPageMarkup(site, sealLogo, tourismLogo)}
  <script>
    document.title = "\\u200b";
  </script>
</body>
</html>`;
  }

  function buildLciLetterheadHtml(sealLogo, tourismLogo) {
    return `
    <header class="report-letterhead">
      <div class="report-letterhead__logo report-letterhead__logo--left">
        <img src="${escapeAttr(sealLogo)}" alt="City of Mati seal" />
      </div>
      <div class="report-letterhead__text">
        <p>Republic of the Philippines</p>
        <p>Province of Davao Oriental</p>
        <p>City of Mati</p>
        <p class="report-letterhead__office">City Tourism and Promotions Office</p>
      </div>
      <div class="report-letterhead__logo report-letterhead__logo--right">
        <img src="${escapeAttr(tourismLogo)}" alt="City of Mati Tourism and Promotions Office" />
      </div>
    </header>
    <hr class="report-rule" />
    <p class="report-letterhead__lci-title">Local Cultural Inventory</p>
    <p class="report-compliance">
      In compliance with Section 14 of Republic Act No. 10066 (National Cultural Heritage Act)
      as amended by Republic Act No. 11961
    </p>
    <p class="report-intro">Provided are the available information on cultural properties:</p>`;
  }

  function buildLciInventoryTableHtml(row) {
    const cells = [
      ["col-no", row.no],
      ["col-name", row.name],
      ["col-location", row.location],
      ["col-type", row.propertyType],
      ["col-category", row.category],
      ["col-ownership", row.ownership],
      ["col-description", row.description],
      ["col-media", row.multimedia],
      ["col-area", row.areaHa],
      ["col-year", row.yearStarted],
      ["col-declaration", row.declaration],
      ["col-reference", row.reference],
    ];

    const header = MatiAdminStore.LCI_COLUMNS.map((column, index) => {
      const className = cells[index]?.[0] || "";
      return `<th class="${className}">${escapeHtml(column.label)}</th>`;
    }).join("");

    const body = cells
      .map(
        ([className, value]) =>
          `<td class="${className}">${escapeHtml(value || "").replace(/\n/g, "<br>")}</td>`,
      )
      .join("");

    return `
    <table class="lci-inventory-table">
      <thead><tr>${header}</tr></thead>
      <tbody><tr>${body}</tr></tbody>
    </table>
    <div class="lci-details">
      <p><strong>Key Informant(s):</strong></p>
      <p><strong>References:</strong></p>
      <p class="lci-year">${new Date().getFullYear()}</p>
    </div>`;
  }

  function buildSiteReportBodyHtml(site, sealLogo, tourismLogo) {
    const inventoryNumber = MatiAdminStore.getLciInventoryNumber(site.id);
    const row = MatiAdminStore.buildLciInventoryRow(
      site,
      inventoryNumber ? inventoryNumber - 1 : 0,
    );

    return `
    ${buildLciLetterheadHtml(sealLogo, tourismLogo)}
    ${buildLciInventoryTableHtml(row)}`;
  }

  async function loadSiteReportLogos() {
    let sealLogo = reportAssetUrl("logo/Flag_of_Mati,_Davao_Oriental.png");
    let tourismLogo = reportAssetUrl(
      "logo/City of Mati Tourism and Promotions Office.png",
    );

    try {
      [sealLogo, tourismLogo] = await Promise.all([
        fetchReportImageDataUrl("logo/Flag_of_Mati,_Davao_Oriental.png"),
        fetchReportImageDataUrl(
          "logo/City of Mati Tourism and Promotions Office.png",
        ),
      ]);
    } catch {
      /* use direct URLs if embedding fails */
    }

    return { sealLogo, tourismLogo };
  }

  function buildSiteReportPageMarkup(site, sealLogo, tourismLogo) {
    return `
    <div class="report-shell">
      <div class="report-page">
        <div class="report-body">
          ${buildSiteReportBodyHtml(site, sealLogo, tourismLogo)}
        </div>
        ${buildSiteReportFooterHtml()}
      </div>
    </div>`;
  }

  function siteReportFilename(site) {
    return `${site.name.replace(/[^\w.-]+/g, "_")}_heritage_record.pdf`;
  }

  function renderSiteReportActions(siteId) {
    return `
      <div class="admin-report-row-actions">
        <button type="button" class="admin-report-action" data-print-site-report="${escapeAttr(siteId)}" title="Print report">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" d="M7 17h10v4H7zM7 7V3h10v4M5 7h14v8H5z"/>
          </svg>
          <span>Print</span>
        </button>
        <button type="button" class="admin-report-action admin-report-action--pdf" data-download-site-report="${escapeAttr(siteId)}" title="Download PDF">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" d="M12 4v10m0 0l-3-3m3 3l3-3M5 20h14"/>
          </svg>
          <span>PDF</span>
        </button>
      </div>`;
  }

  async function createSiteReportPageElement(site) {
    const { sealLogo, tourismLogo } = await loadSiteReportLogos();
    let host = document.getElementById("admin-report-pdf-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "admin-report-pdf-host";
      host.setAttribute("aria-hidden", "true");
      document.body.appendChild(host);
    }

    host.style.cssText =
      "position:fixed;left:-10000px;top:0;width:210mm;background:#fff;z-index:-1;pointer-events:none";
    host.innerHTML =
      `<style>${getReportPrintStyles()}</style>` +
      buildSiteReportPageMarkup(site, sealLogo, tourismLogo);

    await waitForReportImages(host);
    return { host, page: host.querySelector(".report-page") };
  }

  function waitForReportImages(root) {
    const images = [...root.querySelectorAll("img")];
    if (!images.length) return Promise.resolve();
    return Promise.all(
      images.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete) resolve();
            else {
              img.addEventListener("load", resolve, { once: true });
              img.addEventListener("error", resolve, { once: true });
            }
          }),
      ),
    );
  }

  async function printSiteReport(siteId) {
    const site = MatiAdminStore.getSiteById(siteId);
    if (!site) {
      showToast("Site not found.");
      return;
    }

    const { sealLogo, tourismLogo } = await loadSiteReportLogos();
    const html = buildSiteReportPrintHtml(site, sealLogo, tourismLogo);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const printWin = window.open(blobUrl, "_blank", "width=920,height=760");
    if (!printWin) {
      URL.revokeObjectURL(blobUrl);
      showToast("Allow pop-ups to print the report.");
      return;
    }

    const openPrintDialog = async () => {
      URL.revokeObjectURL(blobUrl);
      const doc = printWin.document;
      if (!doc) return;

      await waitForReportImages(doc);
      doc.title = "\u200b";
      printWin.focus();
      printWin.print();
    };

    if (printWin.document?.readyState === "complete") {
      void openPrintDialog();
    } else {
      printWin.addEventListener("load", () => void openPrintDialog(), {
        once: true,
      });
    }
  }

  async function downloadSiteReportPdf(siteId) {
    const site = MatiAdminStore.getSiteById(siteId);
    if (!site) {
      showToast("Site not found.");
      return;
    }

    if (typeof html2pdf === "undefined") {
      showToast("PDF library not loaded. Check your connection and refresh.");
      return;
    }

    const { host, page } = await createSiteReportPageElement(site);
    if (!page) {
      showToast("Could not prepare the report.");
      return;
    }

    try {
      await html2pdf()
        .set({
          margin: 0,
          filename: siteReportFilename(site),
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            width: 1123,
            windowWidth: 1123,
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        })
        .from(page)
        .save();
      showToast("PDF downloaded.");
    } catch (error) {
      console.error("PDF export failed:", error);
      showToast("PDF export failed. Please try again.");
    } finally {
      host.innerHTML = "";
    }
  }

  const REPORT_META = {
    built: {
      title: "Built Heritage",
      desc: "Official built heritage records with print and PDF export for each site.",
    },
    natural: {
      title: "Natural Heritage",
      desc: "Natural landmark records with location, media counts, and export options.",
    },
    intangible: {
      title: "Intangible Cultural Heritage",
      desc: "Festival, music, and cultural heritage records with media and export tools.",
    },
    users: {
      title: "Registered Users",
      desc: "Portal accounts registered through the Mati Heritage visitor system.",
    },
    leaderboard: {
      title: "Leaderboard",
      desc: "Top game scores and player rankings across heritage activities.",
    },
  };

  const HERITAGE_STAT_KEYS = new Set([
    "photos",
    "videos",
    "audio",
    "links",
    "models",
  ]);

  function renderHeritageReportCell(key, value) {
    if (key === "name") {
      return `<td><div class="admin-report-site">${escapeHtml(value || "—")}</div></td>`;
    }

    if (HERITAGE_STAT_KEYS.has(key)) {
      const count = Number(value) || 0;
      return `<td><span class="admin-report-stat${count ? "" : " is-zero"}">${count}</span></td>`;
    }

    if (key === "location") {
      const text = String(value || "").trim();
      return `<td class="admin-report-location">${
        text ? escapeHtml(text) : '<span class="admin-report-muted">—</span>'
      }</td>`;
    }

    const text = String(value ?? "").trim();
    return `<td>${text ? escapeHtml(text) : '<span class="admin-report-muted">—</span>'}</td>`;
  }

  function renderHeritageReportRow(row, headers) {
    const cells = headers
      .map((header) => renderHeritageReportCell(header.key, row[header.key]))
      .join("");
    return `<tr class="admin-report-row">${cells}<td class="admin-report-actions-cell">${renderSiteReportActions(row.id)}</td></tr>`;
  }

  function syncReportHeader() {
    const meta = REPORT_META[currentReport];
    const titleEl = $("#report-title");
    const descEl = $("#report-desc");

    if (titleEl && meta) titleEl.textContent = meta.title;
    if (descEl && meta) descEl.textContent = meta.desc;
  }

  const REPORT_CONFIG = {
    built: {
      filename: "built-heritage-records.csv",
      headers: HERITAGE_REPORT_HEADERS_BUILT,
      rows: () => MatiAdminStore.heritageReportRows("built"),
    },
    natural: {
      filename: "natural-heritage-records.csv",
      headers: HERITAGE_REPORT_HEADERS_NATURAL,
      rows: () => MatiAdminStore.heritageReportRows("natural"),
    },
    intangible: {
      filename: "intangible-heritage-records.csv",
      headers: HERITAGE_REPORT_HEADERS_INTANGIBLE,
      rows: () => MatiAdminStore.heritageReportRows("intangible"),
    },
    users: {
      filename: "registered-users.csv",
      headers: [
        { key: "displayName", label: "Display name" },
        { key: "username", label: "Username" },
        { key: "email", label: "Email" },
        { key: "createdAt", label: "Registered" },
      ],
      rows: () => MatiAdminStore.getRegisteredUsers(),
    },
    leaderboard: {
      filename: "leaderboard-records.csv",
      headers: [
        { key: "rank", label: "Rank" },
        { key: "username", label: "Username" },
        { key: "points", label: "Points" },
      ],
      rows: () =>
        MatiAdminStore.getLeaderboard().map((row, i) => ({
          rank: i + 1,
          username: row.username,
          points: row.points,
        })),
    },
  };

  function renderReport() {
    const cfg = REPORT_CONFIG[currentReport];
    if (!cfg) return;

    syncReportHeader();
    renderReportSummary();

    const thead = $("#report-thead");
    const tbody = $("#report-tbody");
    const meta = $("#report-meta");
    const rows = cfg.rows();

    if (meta) {
      meta.textContent = `${rows.length} record${rows.length !== 1 ? "s" : ""}`;
    }

    if (currentReport === "leaderboard") {
      thead.innerHTML = `<tr><th>Rank</th><th>Player</th><th>Points</th></tr>`;
      if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="3" class="admin-empty">No records to display.</td></tr>`;
        return;
      }
      const ranked = rows.map((row, i) => ({ ...row, rank: i + 1 }));
      tbody.innerHTML = ranked.map(renderLeaderboardRow).join("");
      return;
    }

    thead.innerHTML = isHeritageReportKey(currentReport)
      ? `<tr>${cfg.headers.map((h) => `<th>${h.label}</th>`).join("")}<th class="admin-report-actions-cell" aria-label="Actions"></th></tr>`
      : `<tr>${cfg.headers.map((h) => `<th>${h.label}</th>`).join("")}</tr>`;

    if (!rows.length) {
      const colspan = cfg.headers.length + (isHeritageReportKey(currentReport) ? 1 : 0);
      tbody.innerHTML = `<tr><td colspan="${colspan}" class="admin-empty">No records to display.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map((row) => {
        if (isHeritageReportKey(currentReport)) {
          return renderHeritageReportRow(row, cfg.headers);
        }
        const cells = cfg.headers
          .map((h) => `<td>${escapeHtml(row[h.key] ?? "—")}</td>`)
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");
  }

  function renderReportSummary() {
    const summaryEl = $("#report-summary");
    if (!summaryEl) return;

    const summary = MatiAdminStore.buildLciSummary();
    summaryEl.innerHTML = `
      <div class="admin-reports__stat">
        <span class="admin-reports__stat-value">${summary.built}</span>
        <span class="admin-reports__stat-label">Built Heritage</span>
      </div>
      <div class="admin-reports__stat">
        <span class="admin-reports__stat-value">${summary.natural}</span>
        <span class="admin-reports__stat-label">Natural Heritage</span>
      </div>
      <div class="admin-reports__stat">
        <span class="admin-reports__stat-value">${summary.intangible}</span>
        <span class="admin-reports__stat-label">Intangible Heritage</span>
      </div>`;
  }

  async function exportCurrentReport() {
    if (typeof MatiLciExport !== "undefined") {
      const format = await MatiLciExport.exportInventory();
      showToast(
        format === "xlsx"
          ? "Formatted Excel inventory downloaded."
          : "CSV inventory downloaded.",
      );
      return;
    }

    MatiAdminStore.exportLciInventoryCsv();
    showToast("Inventory downloaded.");
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, "&#39;");
  }

  function truncate(str, len) {
    const s = String(str ?? "");
    return s.length > len ? `${s.slice(0, len)}…` : s;
  }

  function bindMediaFileDrop() {
    const field = $("#media-file-field");
    const input = $("#media-file");
    if (!field || !input) return;

    field.addEventListener("dragover", (e) => {
      if ($("#media-type")?.value !== "photo" || $("#media-id")?.value?.trim()) {
        return;
      }
      e.preventDefault();
      field.classList.add("is-dragover");
    });

    field.addEventListener("dragleave", (e) => {
      if (!field.contains(e.relatedTarget)) {
        field.classList.remove("is-dragover");
      }
    });

    field.addEventListener("drop", (e) => {
      field.classList.remove("is-dragover");
      if ($("#media-type")?.value !== "photo" || $("#media-id")?.value?.trim()) {
        return;
      }
      e.preventDefault();
      const images = [...(e.dataTransfer?.files || [])].filter((file) =>
        file.type.startsWith("image/"),
      );
      if (!images.length) {
        showToast("Drop image files only.");
        return;
      }
      const transfer = new DataTransfer();
      images.forEach((file) => transfer.items.add(file));
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  function bindEvents() {
    $("#admin-logout")?.addEventListener("click", () => {
      startLogout();
    });

    $$(".admin-nav__btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = btn.dataset.view;
        const category = btn.dataset.category;
        setView(view, category ? { category } : {});
      });
    });

    $("#btn-import-built-supabase")?.addEventListener("click", async () => {
      const btn = $("#btn-import-built-supabase");
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Importing…";
      }

      const result = await MatiAdminStore.importBuiltCatalogToSupabase();

      if (btn) {
        btn.disabled = false;
        btn.textContent = "Import built heritage";
      }

      if (result.ok) {
        showToast(`Imported ${result.count} built heritage sites into Supabase.`);
        await refreshDashboardFromSupabase();
        renderHeritage();
        return;
      }

      showToast(result.message || "Could not import built heritage into Supabase.");
    });

    $("#view-dashboard")?.addEventListener("click", (event) => {
      const heritageCard = event.target.closest("[data-go-heritage]");
      if (heritageCard) {
        setView("heritage", { category: heritageCard.dataset.goHeritage });
        return;
      }

      const communityCard = event.target.closest("[data-go-view]");
      if (!communityCard) return;

      const view = communityCard.dataset.goView;
      const report = communityCard.dataset.goReport;
      setView(view, report ? { report } : {});
    });

    $("#heritage-search")?.addEventListener("input", (e) => {
      const other = $("#heritage-search-other");
      if (other) other.value = e.target.value;
      renderHeritage();
    });
    $("#heritage-search-other")?.addEventListener("input", (e) => {
      const built = $("#heritage-search");
      if (built) built.value = e.target.value;
      renderHeritage();
    });

    $("#site-lat")?.addEventListener("input", syncMapPickMode);
    $("#site-lng")?.addEventListener("input", syncMapPickMode);
    $("#site-category-select")?.addEventListener("change", syncSiteCategoryUi);
    $("#site-name")?.addEventListener("input", () => {
      if ($("#site-modal") && !$("#site-modal").hidden) {
        syncSiteMediaControls();
      }
    });

    $("#media-type")?.addEventListener("change", updateMediaFormUi);

    bindMediaFileDrop();

    $("#media-file")?.addEventListener("change", (e) => {
      const type = $("#media-type")?.value;
      const file = e.target.files?.[0];
      const wrap = $("#media-file-preview-wrap");
      const img = $("#media-file-preview");
      if (type === "map" && file && wrap && img) {
        img.src = URL.createObjectURL(file);
        wrap.hidden = false;
      } else if (wrap) {
        wrap.hidden = true;
        if (img) img.removeAttribute("src");
      }
      updateMediaFormUi();
    });

    document.addEventListener("click", (e) => {
      const addMediaType = e.target.closest("[data-add-media-type]");
      if (addMediaType) {
        e.preventDefault();
        e.stopPropagation();
        handleOpenAddMedia(addMediaType.dataset.addMediaType);
        return;
      }

      const viewModel = e.target.closest("[data-view-model]");
      if (viewModel) {
        e.preventDefault();
        e.stopPropagation();
        void openModelViewerModal(viewModel.dataset.viewModel);
        return;
      }

      const mapSite = e.target.closest("[data-view-on-map]");
      if (mapSite) {
        e.preventDefault();
        e.stopPropagation();
        viewBuiltSiteOnMap(mapSite.dataset.viewOnMap);
        return;
      }

      const manageSite = e.target.closest("button[data-edit-site]");
      if (manageSite) {
        e.preventDefault();
        e.stopPropagation();
        openSiteModal(manageSite.dataset.editSite);
        return;
      }

      const heritageCard = e.target.closest(".admin-heritage-card[data-edit-site]");
      if (heritageCard && !e.target.closest("button")) {
        openSiteModal(heritageCard.dataset.editSite);
        return;
      }

      const closeModelViewer = e.target.closest("[data-close-model-viewer]");
      if (closeModelViewer) {
        e.preventDefault();
        e.stopPropagation();
        closeModelViewerModal();
        return;
      }
      if (e.target.id === "model-viewer-modal") {
        closeModelViewerModal();
        return;
      }
      const addBuilt = e.target.closest("[data-add-built-site]");
      if (addBuilt) {
        openSiteModal(null);
        return;
      }
      const editMedia = e.target.closest("[data-edit-media]");
      if (editMedia) {
        const siteId = $("#site-id").value.trim();
        openMediaModal(editMedia.dataset.editMedia, siteId);
        return;
      }
      if (e.target.closest("[data-close-modal]")) {
        if (e.target.closest("#media-modal")) {
          closeMediaModal();
        } else {
          closeAllModals();
        }
        return;
      }
      if (e.target.id === "media-modal") {
        closeMediaModal();
        return;
      }
      if (e.target.id === "site-modal" && $("#media-modal") && !$("#media-modal").hidden) {
        return;
      }
      if (e.target.classList.contains("admin-modal")) {
        closeAllModals();
      }
    });

    $("#btn-add-site")?.addEventListener("click", () => openSiteModal(null));

    $("#site-form")?.addEventListener("submit", saveSiteForm);

    $("#media-form")?.addEventListener("submit", saveMediaForm);

    $("#btn-delete-site")?.addEventListener("click", () => {
      const id = $("#site-id").value.trim();
      if (!id) return;
      if (!confirm("Delete this site and hide it from the catalog?")) return;
      MatiAdminStore.deleteSite(id);
      closeAllModals();
      renderHeritage();
      renderDashboard();
      renderLocation();
      showToast("Site deleted.");
    });

    $$("#report-tabs .admin-tabs__btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentReport = btn.dataset.report;
        $$("#report-tabs .admin-tabs__btn").forEach((b) =>
          b.classList.toggle("is-active", b === btn),
        );
        renderReport();
      });
    });

    $("#btn-export-csv")?.addEventListener("click", exportCurrentReport);

    $("#report-panel")?.addEventListener("click", (event) => {
      const printBtn = event.target.closest("[data-print-site-report]");
      if (printBtn) {
        void printSiteReport(printBtn.dataset.printSiteReport);
        return;
      }

      const pdfBtn = event.target.closest("[data-download-site-report]");
      if (pdfBtn) {
        void downloadSiteReportPdf(pdfBtn.dataset.downloadSiteReport);
      }
    });
  }

  function init() {
    const mediaModal = $("#media-modal");
    if (mediaModal) document.body.appendChild(mediaModal);

    bindEvents();
    bindSiteFormUi();

    if (typeof MatiAdminMap !== "undefined") {
      MatiAdminMap.setSiteSelectHandler((siteId) => {
        openSiteModal(siteId);
      });
    }

    const boot = async () => {
      if (typeof MatiAdminStore?.initFromSupabase === "function") {
        const result = await MatiAdminStore.initFromSupabase();
        if (result.ok) {
          const { built = 0, intangible = 0, natural = 0 } =
            result.byCategory || {};
          if (result.siteCount > 0) {
            showToast(
              `Synced ${result.siteCount} sites (${built} built, ${intangible} intangible, ${natural} natural) from Supabase.`,
            );
          }
        } else if (
          typeof MatiSupabase !== "undefined" &&
          MatiSupabase.isConfigured()
        ) {
          showToast("Supabase connected — run seed if heritage sites are empty.");
        }
      }
      setView("dashboard", {}, { skipDashboardRefresh: true });
    };

    void boot();
  }

  window.MatiAdminUi = {
    openGalleryMediaModal(mediaId, siteId, presetType) {
      openMediaModal(mediaId, siteId, presetType);
    },
    showToast(message) {
      showToast(message);
    },
    onMediaDeleted(siteId) {
      renderDashboard();
      renderHeritage();
      if (siteId) renderSiteMediaList(siteId);
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
