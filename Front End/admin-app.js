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
  let activeUploadController = null;

  const ADMIN_STYLE_ID = "mati-admin-dynamic-styles";
  const TYPE_LABELS = {
    photo: "Photograph",
    map: "Site map",
    video: "Video",
    audio: "Audio",
    link: "Link",
    model3d: "3D model",
  };

  const DYNAMIC_STYLES = {
    photoPile: `
      .admin-media-pile {
        --pile-scale: 0.65;
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: calc(180px * var(--pile-scale));
        margin: 0.5rem 0 1.5rem;
      }
      .admin-media-pile .gal-pile-stack {
        transform: scale(var(--pile-scale));
      }
      .admin-media-pile .gal-print {
        cursor: default;
      }
    `,
    modelCard: `
      .admin-model-card {
        border-radius: 0.85rem;
        padding: 1.5rem;
        text-align: center;
        transition: all 0.25s ease;
      }
      .admin-model-card--empty {
        background: #f8fafc;
        border: 2px dashed #e2e8f0;
        cursor: pointer;
      }
      .admin-model-card--empty:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 24px rgba(149, 157, 165, 0.1);
        border-color: #cbd5e1;
      }
      .admin-model-card--empty:hover .admin-model-card__icon {
        transform: scale(1.08);
      }
      .admin-model-card__icon {
        display: block;
        width: 3.5rem;
        height: 3.5rem;
        margin: 0 auto 1rem;
        color: #94a3b8;
        transition: transform 0.25s ease;
      }
      .admin-model-card__title {
        margin: 0 0 0.35rem;
        font-size: 1.1rem;
        font-weight: 600;
        color: #1e293b;
      }
      .admin-model-card__desc {
        margin: 0 auto 1.25rem;
        max-width: 24rem;
        font-size: 0.9rem;
        color: #64748b;
        line-height: 1.5;
      }
      .admin-model-card--filled {
        display: flex;
        align-items: center;
        gap: 1.25rem;
        text-align: left;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
      }
      .admin-model-card__thumb {
        flex-shrink: 0;
        width: 5rem;
        height: 5rem;
        border-radius: 0.65rem;
        background: #e2e8f0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #94a3b8;
      }
      .admin-model-card__thumb svg {
        width: 2.5rem;
        height: 2.5rem;
      }
      .admin-model-card__meta {
        flex-grow: 1;
      }
      .admin-model-card__filename {
        font-size: 0.8rem;
        color: #64748b;
        margin-top: 0.25rem;
      }
      .admin-model-card__actions {
        margin-top: 0.75rem;
        display: flex;
        gap: 0.5rem;
      }

      /* Drag & Drop States */
      .admin-model-card--empty.is-dragover {
        transform: scale(1.015);
        border-color: #059669;
        border-width: 2px;
        background: #f0fdf4;
        box-shadow: 0 0 24px rgba(5, 150, 105, 0.2);
      }
      .admin-model-card--empty.is-dragover .admin-model-card__icon {
        animation: admin-icon-float 1.8s ease-in-out infinite;
        color: #059669;
      }
      .admin-model-card--empty.is-dragover .admin-model-card__title {
        color: #065f46;
      }
      .admin-model-card--empty.is-dragover .admin-model-card__desc,
      .admin-model-card--empty.is-dragover .admin-btn {
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      .admin-model-card--empty.is-dragover .admin-model-card__drop-label {
        opacity: 1;
        transform: translateY(0);
      }
      .admin-model-card--empty.is-dragover-invalid {
        border-color: #dc2626;
        background: #fef2f2;
        box-shadow: 0 0 20px rgba(220, 38, 38, 0.18);
        animation: admin-card-shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
      }
      .admin-model-card--empty.is-dragover-invalid .admin-model-card__icon {
        color: #b91c1c;
      }
      .admin-model-card--empty.is-dragover-invalid .admin-model-card__icon svg {
        display: none;
      }
      .admin-model-card--empty.is-dragover-invalid .admin-model-card__icon::before {
        content: "!";
        font-family: serif;
        font-weight: bold;
        font-size: 2.5rem;
      }
      .admin-model-card--empty.is-dragover-invalid .admin-model-card__title {
        color: #991b1b;
      }
      .admin-model-card__drop-label {
        position: absolute;
        bottom: 1.5rem;
        left: 1.5rem;
        right: 1.5rem;
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      @keyframes admin-icon-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      @keyframes admin-card-shake {
        10%, 90% { transform: translateX(-1px); }
        20%, 80% { transform: translateX(2px); }
        30%, 50%, 70% { transform: translateX(-3px); }
        40%, 60% { transform: translateX(3px); }
      }
    `,
    modelUpload: `
      .admin-modal--model-upload .admin-modal__body {
        padding: 0;
      }
      .admin-model-upload-area {
        padding: 2.5rem;
        text-align: center;
        border: 2px dashed #e2e8f0;
        border-radius: 0.85rem;
        background: #f8fafc;
        transition: all 0.25s ease-in-out;
        cursor: pointer;
      }
      .admin-model-upload-area:hover {
        border-color: #cbd5e1;
        background: #f1f5f9;
      }
      .admin-model-upload-area.is-dragover {
        transform: scale(1.01);
        border-color: #059669;
        background: #f0fdf4;
        box-shadow: 0 0 24px rgba(5, 150, 105, 0.2);
      }
      .admin-model-upload-area.is-dragover-invalid {
        transform: scale(1.01);
        border-color: #dc2626;
        background: #fef2f2;
        box-shadow: 0 0 24px rgba(220, 38, 38, 0.18);
        animation: admin-card-shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
      }
      .admin-model-upload__icon {
        width: 3.5rem;
        height: 3.5rem;
        margin: 0 auto 1rem;
        color: #94a3b8;
        transition: all 0.25s ease;
      }
      .admin-model-upload-area:hover .admin-model-upload__icon {
        color: #64748b;
      }
      .admin-model-upload-area.is-dragover .admin-model-upload__icon {
        color: #059669;
        transform: scale(1.1);
      }
      .admin-model-upload-area.is-dragover-invalid .admin-model-upload__icon {
        color: #b91c1c;
        transform: scale(1.1);
      }
      .admin-model-upload__title {
        font-size: 1.1rem;
        font-weight: 600;
        color: #1e293b;
        margin: 0 0 0.25rem;
      }
      .admin-model-upload__text {
        font-size: 0.9rem;
        color: #64748b;
        margin: 0;
      }
      .admin-model-upload__formats {
        font-size: 0.8rem;
        color: #94a3b8;
        margin-top: 1rem;
      }
      .admin-model-upload-area.is-dragover .admin-model-upload__title,
      .admin-model-upload-area.is-dragover .admin-model-upload__text,
      .admin-model-upload-area.is-dragover .admin-model-upload__formats {
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      .admin-model-upload__drop-label {
        display: none;
        color: #065f46;
      }
      .admin-model-upload-area.is-dragover .admin-model-upload__drop-label {
        display: block;
      }
      .admin-model-upload-area.is-dragover-invalid .admin-model-upload__title {
        color: #991b1b;
      }
      .admin-model-upload-area.is-dragover-invalid .admin-model-upload__text {
        color: #b91c1c;
      }

      .admin-model-preview-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.25rem;
        border-radius: 0.75rem;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
      }
      .admin-model-preview-card__icon {
        flex-shrink: 0;
        width: 2.5rem;
        height: 2.5rem;
        color: #059669;
      }
      .admin-model-preview-card__meta {
        flex-grow: 1;
      }
      .admin-model-preview-card__name {
        font-weight: 600;
        color: #1e293b;
      }
      .admin-model-preview-card__size {
        font-size: 0.85rem;
        color: #64748b;
      }
      .admin-model-preview-card__progress-bar {
        height: 4px;
        background: #e2e8f0;
        border-radius: 2px;
        margin-top: 0.5rem;
        overflow: hidden;
      }
    `,
  };

  function injectStyles(keys) {
    if (!document.head) return;
    let styleEl = document.getElementById(ADMIN_STYLE_ID);
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = ADMIN_STYLE_ID;
      document.head.appendChild(styleEl);
    }

    const newStyles = (Array.isArray(keys) ? keys : [keys])
      .map((key) => DYNAMIC_STYLES[key] || "")
      .join("\n");

    if (styleEl.textContent.includes(newStyles)) return;

    const currentStyles = styleEl.textContent.split("/* --- */");
    const newSet = new Set([...currentStyles, newStyles].filter(Boolean));
    styleEl.textContent = [...newSet].join("\n/* --- */\n");
  }

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

  let uploadProgressHideTimer = null;
  let uploadProgressAnimFrame = null;
  let uploadProgressDisplay = 0;
  let uploadProgressTarget = 0;
  let uploadDetailSwapTimer = null;

  function uploadProgressEls() {
    return {
      root: $("#admin-upload-progress"),
      title: $("#admin-upload-progress-title"),
      detail: $("#admin-upload-progress-detail"),
      fill: $("#admin-upload-progress-fill"),
      pct: $("#admin-upload-progress-pct"),
      cancel: $("#admin-upload-progress-cancel"),
      bar: $("#admin-upload-progress-bar"),
    };
  }

  function paintUploadProgress(value) {
    const { fill, pct, bar } = uploadProgressEls();
    const rounded = Math.max(0, Math.min(100, Math.round(value)));
    if (fill) fill.style.width = `${value}%`;
    if (pct) pct.textContent = String(rounded);
    if (bar) bar.setAttribute("aria-valuenow", String(rounded));
  }

  function tickUploadProgressAnim() {
    uploadProgressAnimFrame = null;
    const diff = uploadProgressTarget - uploadProgressDisplay;
    if (Math.abs(diff) < 0.15) {
      uploadProgressDisplay = uploadProgressTarget;
      paintUploadProgress(uploadProgressDisplay);
      return;
    }
    uploadProgressDisplay += diff * 0.22;
    paintUploadProgress(uploadProgressDisplay);
    uploadProgressAnimFrame = requestAnimationFrame(tickUploadProgressAnim);
  }

  function setUploadDetailText(detailEl, text) {
    if (!detailEl || detailEl.textContent === text) return;
    clearTimeout(uploadDetailSwapTimer);
    detailEl.classList.add("is-swap");
    uploadDetailSwapTimer = setTimeout(() => {
      detailEl.textContent = text;
      detailEl.classList.remove("is-swap");
    }, 120);
  }

  function showUploadProgress({
    title = "Uploading…",
    detail = "Preparing file…",
    onCancel = null,
    percent = 0,
  } = {}) {
    const {
      root,
      title: titleEl,
      detail: detailEl,
      cancel: cancelBtn,
    } = uploadProgressEls();
    if (!root) return;
    clearTimeout(uploadProgressHideTimer);
    root.hidden = false;
    if (activeUploadController) {
      activeUploadController.abort();
    }
    activeUploadController = new AbortController();
    if (cancelBtn) {
      cancelBtn.onclick = onCancel;
      cancelBtn.hidden = typeof onCancel !== "function";
    }
    root.classList.remove("is-done", "is-error", "is-exiting");
    root.setAttribute("aria-busy", "true");
    if (titleEl) titleEl.textContent = title;
    if (detailEl) {
      detailEl.classList.remove("is-swap");
      detailEl.textContent = detail;
    }
    uploadProgressDisplay = Math.max(0, Number(percent) || 0);
    uploadProgressTarget = uploadProgressDisplay;
    paintUploadProgress(uploadProgressDisplay);
    document.body.classList.add("admin-upload-busy");
    requestAnimationFrame(() => {
      root.classList.add("is-visible");
    });
    if (onCancel) {
      cancelBtn.onclick = () => onCancel(activeUploadController);
      cancelBtn.hidden = false;
    }
  }

  function setUploadProgress(percent, detail) {
    const { detail: detailEl, root } = uploadProgressEls();
    const value = Math.max(0, Math.min(100, Number(percent) || 0));
    uploadProgressTarget = value;
    if (!uploadProgressAnimFrame) {
      uploadProgressAnimFrame = requestAnimationFrame(tickUploadProgressAnim);
    }
    if (detail != null) setUploadDetailText(detailEl, detail);
    if (root && value >= 99.5) {
      const { cancel: cancelBtn } = uploadProgressEls();
      if (cancelBtn) {
        cancelBtn.hidden = true;
      }
      root.classList.add("is-done");
      root.setAttribute("aria-busy", "false");
      const { title } = uploadProgressEls();
      if (title && !/complete|saved|done/i.test(title.textContent || "")) {
        title.textContent = "Complete";
      }
    }
  }

  function hideUploadProgress({ delay = 0 } = {}) {
    const { root } = uploadProgressEls();
    if (!root) return;
    clearTimeout(uploadProgressHideTimer);
    const close = () => {
      root.classList.add("is-exiting");
      root.classList.remove("is-visible");
      const finish = () => {
        root.hidden = true;
        root.classList.remove(
          "is-done",
          "is-error",
          "is-exiting",
          "is-visible",
        );
        root.setAttribute("aria-busy", "false");
        document.body.classList.remove("admin-upload-busy");
        if (uploadProgressAnimFrame) {
          cancelAnimationFrame(uploadProgressAnimFrame);
          uploadProgressAnimFrame = null;
        }
        uploadProgressDisplay = 0;
        uploadProgressTarget = 0;
        paintUploadProgress(0);
        const { detail, title } = uploadProgressEls();
        if (detail) {
          detail.classList.remove("is-swap");
          detail.textContent = "Preparing file…";
        }
        const { cancel: cancelBtn } = uploadProgressEls();
        if (cancelBtn) {
          cancelBtn.hidden = true;
        }
        activeUploadController = null;
        if (title) title.textContent = "Uploading…";
      };
      uploadProgressHideTimer = setTimeout(finish, 320);
    };
    if (delay > 0) {
      uploadProgressHideTimer = setTimeout(close, delay);
    } else {
      close();
    }
  }

  async function withUploadProgress(task, options = {}) {
    const useDefaultCancel = options.onCancel !== undefined && options.onCancel !== null;
    const cancelHandler = useDefaultCancel 
      ? options.onCancel 
      : ((controller) => {
          controller?.abort();
          hideUploadProgress();
          showToast("Upload cancelled.");
        });
    showUploadProgress({
      title: options.title || "Uploading…",
      detail: options.detail || "Starting…",
      onCancel: useDefaultCancel ? cancelHandler : null,
      percent: options.percent || 0,
    });
    try {
      const result = await task({
        setProgress: setUploadProgress, // This is correct
        hideProgress: hideUploadProgress,
        show: showUploadProgress,
      });
      const { title } = uploadProgressEls();
      if (title) title.textContent = options.doneTitle || "Complete";
      setUploadProgress(100, options.doneDetail || "Done.");
      hideUploadProgress({ delay: options.doneDelay ?? 900 });
      return result;
    } catch (error) {
      hideUploadProgress();
      throw error;
    }
  }

  let confirmResolve = null;

  function confirmEls() {
    return {
      root: $("#admin-confirm-modal"),
      title: $("#admin-confirm-title"),
      message: $("#admin-confirm-message"),
      ok: $("#admin-confirm-ok"),
      cancel: $("#admin-confirm-cancel"),
    };
  }

  function closeConfirmModal(result = false) {
    const { root } = confirmEls();
    if (root) root.hidden = true;
    const resolve = confirmResolve;
    confirmResolve = null;
    if (resolve) resolve(result);
  }

  function confirmAction({
    title = "Are you sure?",
    message = "This action cannot be undone.",
    confirmLabel = "Delete",
  } = {}) {
    const { root, title: titleEl, message: messageEl, ok } = confirmEls();
    if (!root) {
      return Promise.resolve(
        window.confirm([title, message].filter(Boolean).join("\n")),
      );
    }
    if (confirmResolve) closeConfirmModal(false);
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (ok) ok.textContent = confirmLabel;
    root.hidden = false;
    requestAnimationFrame(() => ok?.focus());
    return new Promise((resolve) => {
      confirmResolve = resolve;
    });
  }

  async function runDeleteProgress(task, options = {}) {
    const count = Math.max(1, Number(options.count) || 1);
    const noun = options.noun || (count === 1 ? "item" : "items");
    return withUploadProgress(
      async ({ setProgress }) => {
        setProgress(18, "Processing…");
        await new Promise((r) => setTimeout(r, 180));
        setProgress(55, "Processing…");
        const result = await task();
        setProgress(92, "Finishing…");
        await new Promise((r) => setTimeout(r, 160));
        return result;
      },
      {
        title: "Removing…",
        detail: "Processing…",
        onCancel: null,
        doneTitle: count === 1 ? "Complete deleted" : "Complete deleted",
        doneDetail:
          count === 1
            ? "Heritage site removed successfully."
            : `${count} heritage sites removed successfully.`,
        doneDelay: 1100,
      },
    );
  }

  function makeBatchProgress(totalFiles, baseLabel) {
    let currentIndex = 0;
    return {
      startFile(index, fileName) {
        currentIndex = index;
        setUploadProgress(
          Math.round((index / Math.max(totalFiles, 1)) * 100),
          `${baseLabel} ${index + 1} of ${totalFiles}: ${fileName}`,
        );
      },
      onFileProgress(pct) {
        const overall =
          ((currentIndex + pct / 100) / Math.max(totalFiles, 1)) * 100;
        setUploadProgress(overall);
      },
    };
  }

  function syncOk(payload) {
    return Boolean(
      payload &&
      (!payload._sync ||
        payload._sync.ok ||
        payload._sync.reason === "not_configured"),
    );
  }

  function syncFailedMessage(payload, fallback) {
    const err = payload?._sync?.error;
    const message = err?.message || err?.error_description || "";
    if (/row-level security|RLS|policy/i.test(message)) {
      return "Saved locally, but Supabase blocked the write. Run the deployment heritage writes SQL in Supabase.";
    }
    return message
      ? `Saved locally, but cloud sync failed: ${message}`
      : fallback || "Saved locally, but cloud sync failed.";
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
    const builtActions = $("#site-media-actions-built");
    if (builtActions) builtActions.remove();
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
    const fullscreenModel = $("#fullscreen-model");
    const fullscreenPhoto = $("#fullscreen-photo");
    const fullscreenLoading = $("#fullscreen-loading");

    if (fullscreenLoading) {
      fullscreenLoading.setAttribute("hidden", "");
    }
    if (fullscreenModel) {
      fullscreenModel.hidden = true;
      fullscreenModel.autoRotate = false;
    }
    if (modal) {
      modal.hidden = true;
      modal.setAttribute("hidden", "");
      modal.setAttribute("aria-hidden", "true");
    }
    document.body.classList.remove("heritage-fullscreen-open");
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
    const fullscreenTitle = $("#fullscreen-title");
    const fullscreenModel = $("#fullscreen-model");
    const fullscreenPhoto = $("#fullscreen-photo");
    const fullscreenHint = $("#fullscreen-hint");
    const fullscreenLoading = $("#fullscreen-loading");
    const fullscreenLoadingLabel = $("#fullscreen-loading-label");

    if (!modal || !fullscreenModel) return;

    const src = await resolveModelViewerSrc(modelPath);
    if (!src) {
      showToast("Could not load the 3D model.");
      return;
    }

    fullscreenTitle.textContent = site.name;
    modal.hidden = false;
    modal.removeAttribute("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("heritage-fullscreen-open");

    showFullscreenLoading(`Loading ${site.name}…`);

    // Show the model viewer and hide photo
    fullscreenModel.hidden = false;
    fullscreenModel.removeAttribute("hidden");
    fullscreenPhoto.hidden = true;
    fullscreenPhoto.setAttribute("hidden", "");

    if (fullscreenHint) {
      fullscreenHint.textContent = "Drag to rotate · Scroll to zoom";
      fullscreenHint.hidden = false;
    }

    const sameSrc = fullscreenModel.getAttribute("src") === src;
    if (sameSrc && fullscreenModel.loaded) {
      hideFullscreenLoading();
      return;
    }

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        fullscreenModel.removeEventListener("load", onLoad);
        fullscreenModel.removeEventListener("error", onError);
        hideFullscreenLoading();
        resolve();
      };
      const onLoad = () => finish();
      const onError = () => finish();

      fullscreenModel.addEventListener("load", onLoad, { once: true });
      fullscreenModel.addEventListener("error", onError, { once: true });

      if (!sameSrc) {
        fullscreenModel.setAttribute("src", src);
      } else if (fullscreenModel.loaded) {
        finish();
      }
    });
  }

  function showFullscreenLoading(label = "Loading 3D model…") {
    const fullscreenLoadingLabel = $("#fullscreen-loading-label");
    const fullscreenLoading = $("#fullscreen-loading");
    if (fullscreenLoadingLabel) fullscreenLoadingLabel.textContent = label;
    if (fullscreenLoading) fullscreenLoading.removeAttribute("hidden");
  }

  function hideFullscreenLoading() {
    const fullscreenLoading = $("#fullscreen-loading");
    if (fullscreenLoading) fullscreenLoading.setAttribute("hidden", "");
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
    return [
      ...new Set(sites.map((site) => site.heritageCategory).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b));
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
      deleteSiteBtn.hidden = isNewSite;
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

  function renderMapCard(site) {
    if (builtSiteHasMap(site)) {
      const filename = site.cover.split("/").pop();
      const lastUpdated = site.updatedAt
        ? new Date(site.updatedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "";

      return `
        <div class="admin-model-card admin-model-card--filled">
          <div class="admin-model-card__thumb">
            <img src="${escapeAttr(site.cover)}" alt="Site map" style="width:100%;height:100%;object-fit:cover;" />
          </div>
          <div class="admin-model-card__meta">
            <h5 class="admin-model-card__title">Site Map Uploaded</h5>
            <p class="admin-model-card__filename">${escapeHtml(filename)}</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="admin-model-card admin-model-card--empty" data-add-media-type="map" role="button" tabindex="0">
        <svg class="admin-model-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
        <h5 class="admin-model-card__title">No Site Map Available</h5>
        <p class="admin-model-card__desc"> Drag & Drop your site map or click to browse your files.</p>
        <p class="admin-model-card__desc"> Supports image files.</p>
        <button type="button" class="admin-btn admin-btn--secondary admin-btn--sm" tabindex="-1">
          <svg class="admin-model-card__drop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="width:1.1em;height:1.1em;margin-right:0.4em; display: none;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <p class="admin-model-card__drop-label">Drop your site map here</p>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="width:1.1em;height:1.1em;margin-right:0.4em;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload Site Map
        </button>
      </div>
    `;
  }

  function renderModelCard(site) {
    if (site.modelSrc) {
      const filename = site.modelSrc.split("/").pop();
      const lastUpdated = site.updatedAt
        ? new Date(site.updatedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "";

      return `
        <div class="admin-model-card admin-model-card--filled">
          <div class="admin-model-card__thumb">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div class="admin-model-card__meta">
            <h5 class="admin-model-card__title">3D Model Uploaded</h5>
            <p class="admin-model-card__filename">${escapeHtml(filename)}</p>
            <div class="admin-model-card__actions">
              <button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-view-model="${escapeAttr(site.id)}">Preview</button>
              <button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-add-media-type="model3d">Manage</button>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="admin-model-card admin-model-card--empty" data-add-media-type="model3d" role="button" tabindex="0">
        <svg class="admin-model-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <h5 class="admin-model-card__title">No 3D Model Available</h5>
        <p class="admin-model-card__desc"> Drag & Drop your 3D Model or click to browse your files.</p>
        <p class="admin-model-card__desc"> Supports .glb file format.</p>
        <button type="button" class="admin-btn admin-btn--secondary admin-btn--sm" tabindex="-1">
          <svg class="admin-model-card__drop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="width:1.1em;height:1.1em;margin-right:0.4em; display: none;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <p class="admin-model-card__drop-label">Drop your 3D model here</p>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="width:1.1em;height:1.1em;margin-right:0.4em;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload 3D Model
        </button>
      </div>
    `;
  }

  function renderPhotoCard(site) {
    return `
      <div class="admin-model-card admin-model-card--empty" data-add-media-type="photo" role="button" tabindex="0">
        <svg class="admin-model-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <h5 class="admin-model-card__title">No Photographs Available</h5>
        <p class="admin-model-card__desc"> Drag & Drop your photographs or click to browse your files.</p>
        <p class="admin-model-card__desc"> Supports image files.</p>
        <button type="button" class="admin-btn admin-btn--secondary admin-btn--sm" tabindex="-1">
          <svg class="admin-model-card__drop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="width:1.1em;height:1.1em;margin-right:0.4em; display: none;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <p class="admin-model-card__drop-label">Drop your photographs here</p>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="width:1.1em;height:1.1em;margin-right:0.4em;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload Photographs
        </button>
      </div>
    `;
  }

  function renderBuiltSitePhotoPile(site, photos) {
    const PILE_PRINT_FILTERS = [
      "none",
      "sepia(0.35)",
      "grayscale(1)",
      "saturate(1.2)",
    ];

    const getPilePhotos = () => {
      const fromMedia = photos.map((item) => item.src);
      const photoSources = [...new Set([site.cover, ...fromMedia])].filter(
        Boolean,
      );
      while (photoSources.length > 0 && photoSources.length < 4) {
        photoSources.push(photoSources[0]);
      }
      return photoSources.slice(0, 4);
    };

    const pilePhotos = getPilePhotos();
    if (!pilePhotos.length) {
      return `<p class="admin-media-group__empty">No photographs uploaded yet.</p>`;
    }

    const prints = pilePhotos
      .map(
        (src, index) => `
      <span class="gal-print gal-print--${index + 1}" style="--print-i: ${index}" data-print="${index}">
        <img src="${escapeHtml(src)}" alt="" loading="lazy" style="filter: ${PILE_PRINT_FILTERS[index]}" />
      </span>`,
      )
      .join("");

    return `<div class="admin-media-pile">
              <div class="gal-pile-stack">${prints}</div>
            </div>`;
  }

  function renderBuiltSiteMediaList(site, media, container) {
    const photos = media.filter((m) => m.type === "photo");
    const mapContent = renderMapCard(site);

    const photoList = photos.length
      ? renderBuiltSitePhotoPile(site, photos)
      : renderPhotoCard(site);

    const modelContent = renderModelCard(site);
    const hasMap = builtSiteHasMap(site);
    const hasPhotos = photos.length > 0;

    container.innerHTML = `
      <div class="admin-media-groups">
        <section class="admin-media-group">
          <div class="admin-media-group__head">
            <h4 class="admin-media-group__title admin-media-group__title--map">Site map</h4>
            <div class="admin-media-group__actions">
              ${hasMap ? `<button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-view-map="${escapeAttr(site.id)}">View Map</button>` : ""}
              ${hasMap ? `<button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-add-media-type="map">Manage</button>` : ""}
            </div>
          </div>
          ${mapContent}
        </section>
        <section class="admin-media-group">
          <div class="admin-media-group__head">
            <h4 class="admin-media-group__title admin-media-group__title--photo">Photographs</h4>
            <div class="admin-media-group__actions">
              ${hasPhotos ? `<button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-view-photos="${escapeAttr(site.id)}">View Photographs</button>` : ""}
              ${hasPhotos ? `<button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-add-media-type="photo">Manage</button>` : ""}
            </div>
          </div>
          ${photoList}
        </section>
        <section class="admin-media-group">
          <div class="admin-media-group__head">
            <h4 class="admin-media-group__title admin-media-group__title--model">3D model</h4>
          </div>
          ${modelContent}
        </section>
      </div>`;
    bindModelCardDragDrop(container);
  }

  function photoTitleFromFile(file) {
    return String(file.name || "Photograph").replace(/\.[^.]+$/i, "");
  }

  function getSelectedPhotoFiles() {
    const fileInput = $("#media-file");
    if (!fileInput?.files?.length) return [];
    return [...fileInput.files].filter((file) =>
      file.type.startsWith("image/"),
    );
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
      !isEdit &&
      (activeType === "photo" ||
        activeType === "map" ||
        activeType === "model3d" ||
        activeType === "video" ||
        activeType === "audio");
    const fileField = $("#media-file-field");
    const urlField = $("#media-url-field");
    const titleField = $("#media-title-field");
    const typeField = $("#media-type-field");
    const fileInput = $("#media-file");
    const fileLabel = $("#media-file-label");
    const fileHint = $("#media-file-hint");
    const captionField = $("#media-caption-field");
    const mediaModal = $("#media-modal");
    const saveBtn = $("#btn-save-media");

    const previewWrap = $("#media-file-preview-wrap");
    const previewImg = $("#media-file-preview");
    const titleInput = $("#media-title");
    const captionHint = $("#media-caption-hint");
    const selectedPhotos =
      activeType === "photo" && usesFile ? getSelectedPhotoFiles() : [];
    const bulkPhotos = selectedPhotos.length > 1;

    if (mediaModal) {
      mediaModal.classList.toggle(
        "admin-modal--model-upload",
        activeType === "model3d",
      );
    }

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
      } else if (activeType === "model3d" && fileInput.id === "media-file") {
        fileInput.accept = ".glb,model/gltf-binary";
        fileInput.multiple = false;
      } else if (activeType === "video") {
        fileInput.accept =
          "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";
        fileInput.multiple = false;
      } else if (activeType === "audio") {
        fileInput.accept =
          "audio/mpeg,audio/wav,audio/ogg,audio/mp4,.mp3,.wav,.ogg,.m4a";
        fileInput.multiple = false;
      }
      if (!usesFile) fileInput.value = "";
    }

    if (fileLabel) {
      const labels = {
        photo: "Upload photographs",
        map: "Upload site map",
        model3d: "Upload 3D model (.glb)",
        video: "Upload video file",
        audio: "Upload audio recording",
      };
      fileLabel.textContent = labels[activeType] || "Upload file";
    }

    if (fileHint) {
      if (activeType === "map") {
        fileHint.textContent = site?.cover
          ? "A site map is linked. Choose a file or drag an image to replace it."
          : "Choose an image file or drag it into this area to upload a site map.";
      } else if (activeType === "photo") {
        if (bulkPhotos) {
          fileHint.textContent = `${selectedPhotos.length} photographs selected. Each will use its file name as the title.`;
        } else {
          fileHint.textContent =
            "Choose one or many photographs, or drag images from a folder into this area.";
        }
      } else if (activeType === "model3d") {
        fileHint.textContent =
          "Upload a .glb 3D model file, or drag it into this area.";
      } else if (activeType === "video") {
        fileHint.textContent =
          "Upload an MP4/WebM file (stored in Supabase Storage), or switch to Link for YouTube/Facebook.";
      } else if (activeType === "audio") {
        fileHint.textContent =
          "Upload an MP3/WAV recording — it is stored in Supabase Storage for visitors.";
      }
    }

    if (captionField) {
      captionField.hidden = activeType === "model3d";
    }
    if (saveBtn) {
      saveBtn.disabled = activeType === "model3d" && !fileInput.files.length;
      saveBtn.textContent = activeType === "model3d" ? "Upload" : "Save";
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
        btn.classList.toggle(
          "is-active",
          btn.dataset.report === options.report,
        );
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
    if (view === "leaderboard") {
      ensureLeaderboardLive();
      void renderLeaderboard({ force: true });
    }
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
      m.classList.remove(
        "admin-modal--aside",
        "admin-modal--stacked",
        "admin-modal--under",
      );
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
      window.setTimeout(async () => {
        if (typeof MatiAuth !== "undefined") {
          await MatiAuth.logout();
        }
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
    if (
      typeof MatiAdminUploads !== "undefined" &&
      MatiAdminUploads.isUploadUri(src)
    ) {
      return "Uploaded file";
    }
    return truncate(src, 48);
  }

  function mediaChips(stats, include3d = true, site = null) {
    const chips = [];
    if (site?.category === "built") {
      if (builtSiteHasMap(site)) chips.push("1 map");
      if (stats.photos) {
        chips.push(`${stats.photos} photo${stats.photos !== 1 ? "s" : ""}`);
      }
      if (include3d && (site.modelSrc || stats.models)) chips.push("3D model");
      if (!chips.length)
        return '<span class="admin-table__sub">No media</span>';
      return `<div class="admin-chip-row">${chips.map((c) => `<span class="admin-chip">${c}</span>`).join("")}</div>`;
    }

    if (site?.category === "natural") {
      if (stats.photos)
        chips.push(`${stats.photos} photo${stats.photos !== 1 ? "s" : ""}`);
      if (stats.videos)
        chips.push(`${stats.videos} video${stats.videos !== 1 ? "s" : ""}`);
      if (stats.links)
        chips.push(`${stats.links} link${stats.links !== 1 ? "s" : ""}`);
      if (!chips.length)
        return '<span class="admin-table__sub">No media</span>';
      return `<div class="admin-chip-row">${chips.map((c) => `<span class="admin-chip">${c}</span>`).join("")}</div>`;
    }

    if (site?.category === "intangible") {
      if (stats.photos)
        chips.push(`${stats.photos} photo${stats.photos !== 1 ? "s" : ""}`);
      if (stats.videos)
        chips.push(`${stats.videos} video${stats.videos !== 1 ? "s" : ""}`);
      if (stats.audio) chips.push(`${stats.audio} audio`);
      if (stats.links)
        chips.push(`${stats.links} link${stats.links !== 1 ? "s" : ""}`);
      if (!chips.length)
        return '<span class="admin-table__sub">No media</span>';
      return `<div class="admin-chip-row">${chips.map((c) => `<span class="admin-chip">${c}</span>`).join("")}</div>`;
    }

    if (stats.photos)
      chips.push(`${stats.photos} photo${stats.photos !== 1 ? "s" : ""}`);
    if (stats.videos)
      chips.push(`${stats.videos} video${stats.videos !== 1 ? "s" : ""}`);
    if (stats.audio) chips.push(`${stats.audio} audio`);
    if (stats.links)
      chips.push(`${stats.links} link${stats.links !== 1 ? "s" : ""}`);
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
    const emptyDb = $("#dashboard-supabase-empty");
    const tbody = $("#dashboard-summary-body");
    const tfoot = $("#dashboard-summary-foot");
    const totalUsersStat = $("#total-users-stat");
    const pageVisitsStat = $("#page-visits-stat");
    const pageVisitsTrend = $("#page-visits-trend");

    const supabaseConfigured =
      typeof MatiSupabase !== "undefined" && MatiSupabase.isConfigured();
    const remoteSiteCount =
      typeof MatiAdminStore.getRemoteSiteCount === "function"
        ? MatiAdminStore.getRemoteSiteCount()
        : 0;

    if (emptyDb) {
      emptyDb.hidden = !supabaseConfigured || remoteSiteCount > 0;
    }

    // Update user stats
    if (totalUsersStat) {
      totalUsersStat.textContent = community.registeredUsers || 0;
    }
    if (pageVisitsStat) {
      pageVisitsStat.textContent =
        community.pageVisits ?? community.totalPageViews ?? 0;
    }
    if (pageVisitsTrend) {
      const active = community.activeSessions ?? 0;
      const sessions = community.uniqueSessions ?? 0;
      pageVisitsTrend.textContent = `${active} active now · ${sessions} unique sessions`;
    }

    if (heritageCards) {
      const cardIcons = {
        built: `<svg class="stat-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>`,
        intangible: `<svg class="stat-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>`,
        natural: `<svg class="stat-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>`,
      };

      heritageCards.innerHTML = collections
        .map(
          (collection) => {
            const bgImages = {
              built: 'data/Built Heritage/Centennial Clock and Pathway of Leaders/Photographs/New/1000068051.jpg',
              intangible: 'data/Intangible Cultural Heritage/Sambuokan Festival/Photographs/0M8A2672.JPG',
              natural: 'data/Natural Heritage/Taytay Daga (Sleeping Dinosaur)/Photographs/DJI_0771.jpg'
            };
            const bgImage = bgImages[collection.key] || '';
            return `
        <article class="stat-card stat-card--${collection.key}">
          <div class="stat-card__bg-image" style="background-image: url('${bgImage}');"></div>
          <div class="stat-card__content">
            <p class="stat-card__label">${escapeHtml(collection.label)}</p>
            <p class="stat-card__value">${collection.sites}</p>
          </div>
        </article>`;
          }
        )
        .join("");
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
          s.name.toLowerCase().startsWith(q) ||
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
          return site.name.toLowerCase().startsWith(q);
        },
      );
      const sites = filterAndSortBuiltSites(allBuilt);
      renderBuiltHeritageCount(
        MatiAdminStore.getSitesByCategory("built").length,
      );
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
      const loadingOverlay = `<div class="admin-card-loading-overlay" id="admin-card-loading-overlay-${modelSrc ? escapeAttr(modelSrc).replace(/[^a-zA-Z0-9]/g, "") : "default"}" hidden>
        <div class="admin-card-loading-spinner"></div>
        <div class="admin-card-loading-percentage">0%</div>
      </div>`;
      return `<div class="admin-heritage-card__model-slot" ${srcAttr} ${uploadAttr} ${posterAttr}>${posterHtml}${loadingOverlay}</div>`;
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
    return "Manage";
  }

  function siteFormSubmitLabel(siteId) {
    if (!siteId || MatiAdminStore.isDraftSiteId(siteId)) return "Save site";
    return "Update";
  }

  function siteFormModalTitle(siteId) {
    return "";
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

    const uploadNodes = $$("#heritage-built-grid img[data-upload-src]");
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
      const url = await MatiAdminUploads.createObjectUrl(
        slot.dataset.modelUpload,
      );
      if (url) {
        heritagePreviewUrls.add(url);
        src = url;
      }
    }
    if (!src) return;

    const title =
      slot
        .closest(".admin-heritage-card")
        ?.querySelector(".admin-heritage-card__title")?.textContent ||
      "3D model";

    // Find and show loading overlay
    const loadingOverlay = slot.querySelector(".admin-card-loading-overlay");
    const loadingPercentage = slot.querySelector(
      ".admin-card-loading-percentage",
    );
    if (loadingOverlay) {
      loadingOverlay.removeAttribute("hidden");
    }
    if (loadingPercentage) {
      loadingPercentage.textContent = "0%";
    }

    // Remove poster/placeholder but keep loading overlay
    const poster = slot.querySelector(".admin-heritage-card__poster");
    const placeholder = slot.querySelector(".admin-heritage-card__placeholder");
    if (poster) poster.remove();
    if (placeholder) placeholder.remove();

    const viewer = document.createElement("model-viewer");
    viewer.className = "admin-heritage-card__model";
    viewer.setAttribute("src", src);
    viewer.setAttribute("alt", title);
    const posterSrc = slot.dataset.modelPoster;
    if (posterSrc) viewer.setAttribute("poster", posterSrc);
    viewer.setAttribute("auto-rotate", "");
    viewer.setAttribute("rotation-per-second", "20deg");
    viewer.setAttribute("camera-orbit", "0deg 78deg 108%");
    viewer.setAttribute("interaction-prompt", "none");
    viewer.setAttribute("touch-action", "pan-y");
    viewer.setAttribute("loading", "lazy");

    // Track loading progress
    const handleProgress = (event) => {
      if (event.detail && event.detail.totalProgress !== undefined) {
        const progress = Math.round(event.detail.totalProgress * 100);
        if (loadingPercentage) {
          loadingPercentage.textContent = `${progress}%`;
        }
      }
    };

    const handleLoad = () => {
      if (loadingOverlay) {
        loadingOverlay.setAttribute("hidden", "");
      }
      viewer.removeEventListener("progress", handleProgress);
      viewer.removeEventListener("load", handleLoad);
    };

    const handleError = () => {
      if (loadingOverlay) {
        loadingOverlay.setAttribute("hidden", "");
      }
      viewer.removeEventListener("progress", handleProgress);
      viewer.removeEventListener("load", handleLoad);
      viewer.removeEventListener("error", handleError);
    };

    viewer.addEventListener("progress", handleProgress);
    viewer.addEventListener("load", handleLoad, { once: true });
    viewer.addEventListener("error", handleError, { once: true });

    slot.appendChild(viewer);
  }

  let leaderboardLiveStarted = false;
  let catalogLiveStarted = false;
  let visitorLiveStarted = false;
  let leaderboardRenderToken = 0;

  function activeAdminView() {
    return document.querySelector(".admin-nav__btn.is-active")?.dataset?.view;
  }

  function refreshActiveAdminViews() {
    const view = activeAdminView();
    if (view === "dashboard") renderDashboard();
    if (view === "heritage") renderHeritage();
    if (view === "location" && typeof MatiAdminMap !== "undefined") {
      void MatiAdminMap.refresh?.();
    }
    if (view === "gallery") {
      window.MatiGalleryEmbed?.refresh?.();
    }
    if (view === "reports") void renderReport();
    if (view === "leaderboard") void renderLeaderboard({ force: true });
  }

  function ensureCatalogLive() {
    if (catalogLiveStarted) return;
    if (typeof MatiAdminStore.subscribeCatalog !== "function") return;
    catalogLiveStarted = true;
    MatiAdminStore.subscribeCatalog(() => {
      refreshActiveAdminViews();
    });
  }

  function ensureVisitorLive() {
    if (visitorLiveStarted) return;
    if (typeof MatiAdminStore.subscribeVisitorAnalytics !== "function") return;
    visitorLiveStarted = true;
    MatiAdminStore.subscribeVisitorAnalytics(() => {
      const view = activeAdminView();
      if (view === "dashboard") renderDashboard();
    });
  }

  function ensureLeaderboardLive() {
    if (leaderboardLiveStarted) return;
    if (typeof MatiAdminStore.subscribeLeaderboard !== "function") return;
    leaderboardLiveStarted = true;
    MatiAdminStore.subscribeLeaderboard(() => {
      const view = activeAdminView();
      if (view === "leaderboard") {
        void renderLeaderboard({ force: true });
      }
      if (view === "dashboard") renderDashboard();
      if (currentReport === "leaderboard") {
        void renderReport();
      }
    });
  }

  function renderLeaderboardCard(row, index) {
    const rank = row.rank;
    const isRunnerUp = rank > 3;
    const points = Number(row.points) || 0;
    const sizeClass = isRunnerUp
      ? "admin-lb-card--runner"
      : "admin-lb-card--top";
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

      window.setTimeout(
        () => {
          let startTimestamp = null;
          const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min(
              (timestamp - startTimestamp) / duration,
              1,
            );
            const val = Math.floor(progress * (end - start) + start);
            el.innerHTML = `${val.toLocaleString()} <small>Pts</small>`;
            if (progress < 1) window.requestAnimationFrame(step);
          };
          window.requestAnimationFrame(step);
        },
        500 + index * 100,
      );
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

  function paintLeaderboardRows(rows) {
    const list = $("#leaderboard-body");
    const body = $(".admin-leaderboard__body");
    const columns = $(".admin-leaderboard__columns");
    if (!list) return;

    if (!rows.length) {
      if (columns) columns.hidden = true;
      list.innerHTML = `<p class="admin-leaderboard__empty">No leaderboard records yet. Rankings appear when players earn heritage points.</p>`;
      return;
    }

    if (columns) columns.hidden = false;
    list.innerHTML = rows
      .map((row, i) => renderLeaderboardCard(row, i))
      .join("");
    animateAdminLeaderboardPoints(body || list);
  }

  async function renderLeaderboard({ force = false } = {}) {
    const list = $("#leaderboard-body");
    if (!list) return;

    const token = ++leaderboardRenderToken;
    if (!list.children.length) {
      list.innerHTML = `<p class="admin-leaderboard__empty">Loading live rankings…</p>`;
    }

    let rows = [];
    try {
      if (typeof MatiAdminStore.refreshLeaderboard === "function") {
        rows = await MatiAdminStore.refreshLeaderboard({ force });
      } else {
        rows = MatiAdminStore.getLeaderboard();
      }
    } catch (error) {
      console.warn("Admin leaderboard load failed:", error);
      rows = MatiAdminStore.getLeaderboard();
    }

    if (token !== leaderboardRenderToken) return;

    const ranked = (rows || []).map((row, i) => ({
      ...row,
      rank: i + 1,
    }));
    paintLeaderboardRows(ranked);
  }

  function renderSiteMediaList(siteId) {
    const list = $("#site-media-list");
    if (!list) return;

    syncSiteMediaControls();

    const category = $("#site-category")?.value || "built";

    if (!siteId) {
      // For new sites, show drag and drop cards for built heritage
      if (category === "built") {
        const tempSite = { id: null, category: "built", cover: null, modelSrc: null };
        renderBuiltSiteMediaList(tempSite, [], list);
      } else {
        list.innerHTML = `<p class="admin-empty" style="padding:1rem 0">Save the site to add media files.</p>`;
      }
      return;
    }

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

    panel.remove();
  }

  function viewBuiltSiteOnMap(siteId) {
    const site = MatiAdminStore.getSiteById(siteId);
    if (!site || !MatiAdminStore.resolveCoords(site)) {
      showToast("This site does not have map coordinates yet.");
      return;
    }

    console.log("viewBuiltSiteOnMap: Starting navigation to site", {
      siteId,
      siteName: site.name,
    });

    // Update URL with query parameter for navigation persistence
    const url = new URL(window.location);
    url.searchParams.set("focusSite", siteId);
    window.history.pushState({}, "", url);

    setView("location");
    if (typeof MatiAdminMap !== "undefined") {
      MatiAdminMap.setCategoryFilter("built");
      void MatiAdminMap.refresh().then(() => {
        // Add longer delay to ensure map and markers are fully loaded
        setTimeout(() => {
          console.log(
            "viewBuiltSiteOnMap: Attempting to focus on site after delay",
            { siteId },
          );
          const success = MatiAdminMap.focusSite(siteId);
          if (!success) {
            console.warn("Could not focus on site:", siteId);
            showToast("Could not locate site on map. Please try again.");
          }
        }, 1200);
      });
    } else {
      console.error("MatiAdminMap is not available");
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

  async function ensureSiteDraft() {
    let siteId = $("#site-id")?.value?.trim();
    const existing = siteId ? MatiAdminStore.getSiteById(siteId) : null;
    if (existing) return existing;

    const site = await persistSiteFromForm({
      draft: true,
      siteId: siteId || createDraftSiteId(),
    });
    if (!site) return null;

    editingSiteId = site.id;
    $("#site-id").value = site.id;
    syncBuiltDeleteUi();
    renderSiteMediaList(site.id);
    return site;
  }

  async function handleOpenAddMedia(presetType) {
    const site = await ensureSiteDraft();
    if (!site) return;

    openMediaModal(null, site.id, presetType);
  }

  async function persistSiteFromForm(options = {}) {
    const {
      requireName = false,
      draft = false,
      siteId: forcedSiteId,
    } = options;
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

    const startTime = Date.now();
    const isNewSite = !$("#site-id")?.value?.trim() || MatiAdminStore.isDraftSiteId($("#site-id").value.trim());

    // Show update modal
    const progressTitle = isNewSite ? "Adding site…" : "Updating site…";
    showUpdateModal(progressTitle);

    try {
      let siteId = $("#site-id").value.trim();
      const wasDraft = MatiAdminStore.isDraftSiteId(siteId);
      const nextId = MatiAdminStore.slugId(name);

      if (wasDraft && siteId !== nextId) {
        await MatiAdminStore.migrateSite(siteId, nextId);
        siteId = nextId;
        $("#site-id").value = nextId;
      }

      const site = await persistSiteFromForm({ requireName: true, siteId });
      if (!site) throw new Error("Could not save site.");

      editingSiteId = site.id;
      $("#site-id").value = site.id;
      syncBuiltDeleteUi();
      refreshSiteViews(site.id);
      syncSiteFormSubmitLabel(site.id);

      if (!syncOk(site)) {
        hideUpdateModal();
        showToast(syncFailedMessage(site, "Site saved locally only."));
        return site;
      }

      // Calculate elapsed time and ensure minimum 1.5s display
      const elapsed = Date.now() - startTime;
      const minDisplayTime = 1500;
      const remainingDelay = Math.max(0, minDisplayTime - elapsed);

      // Wait for minimum display time then show success and close modal
      setTimeout(() => {
        showUpdateModal("SUCCESS");
        
        // Show success toast based on action
        const successMessage = isNewSite 
          ? "Heritage site added successfully." 
          : "Heritage site updated successfully.";
        showToast(successMessage);
        
        // Hide success modal and close site modal after 1 second
        setTimeout(() => {
          hideUpdateModal();
          
          // Close site modal with smooth animation
          const siteModal = $("#site-modal");
          if (siteModal) {
            siteModal.style.transition = "opacity 0.3s ease, transform 0.3s ease";
            siteModal.style.opacity = "0";
            siteModal.style.transform = "scale(0.95)";
            
            setTimeout(() => {
              siteModal.hidden = true;
              siteModal.classList.remove("active");
              siteModal.style.opacity = "";
              siteModal.style.transform = "";
              document.body.style.overflow = "";
              document.body.style.overflowY = "auto";
              
              // Reset form state
              $("#site-form")?.reset();
              $("#site-id").value = "";
              editingSiteId = null;
              syncBuiltDeleteUi();
              syncSiteFormSubmitLabel("");
            }, 300);
          }
        }, 1000);
      }, remainingDelay);

      return site;
    } catch (error) {
      hideUpdateModal();
      showToast(error?.message || "Could not save site.");
    }
  }

  function showUpdateModal(message) {
    let modal = $("#updateModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "updateModal";
      modal.className = "admin-modal";
      modal.innerHTML = `
        <div class="admin-modal-backdrop" style="background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);"></div>
        <div class="admin-modal-content" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 48px 64px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); text-align: center; min-width: 280px; animation: modalFadeIn 0.3s ease-out;">
          <div id="updateModalIcon" style="font-size: 48px; margin-bottom: 16px; animation: iconPulse 1.5s ease-in-out infinite;">⏳</div>
          <div id="updateModalMessage" style="font-family: 'Source Sans 3', sans-serif; font-size: 24px; font-weight: 600; color: white; letter-spacing: 0.5px;"></div>
          <div id="updateModalSubtext" style="font-family: 'Source Sans 3', sans-serif; font-size: 14px; font-weight: 400; color: rgba(255, 255, 255, 0.8); margin-top: 8px;"></div>
        </div>
        <style>
          @keyframes modalFadeIn {
            from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
          @keyframes iconPulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
          @keyframes successBounce {
            0% { transform: scale(0); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
          }
        </style>
      `;
      document.body.appendChild(modal);
    }
    
    const messageEl = $("#updateModalMessage");
    const iconEl = $("#updateModalIcon");
    const subtextEl = $("#updateModalSubtext");
    
    if (messageEl) {
      messageEl.textContent = message;
    }
    
    if (iconEl && subtextEl) {
      if (message === "SUCCESS") {
        iconEl.textContent = "✓";
        iconEl.style.animation = "successBounce 0.5s ease-out forwards";
        subtextEl.textContent = "Changes saved successfully";
      } else {
        iconEl.textContent = "⏳";
        iconEl.style.animation = "iconPulse 1.5s ease-in-out infinite";
        subtextEl.textContent = "Please wait...";
      }
    }
    
    modal.hidden = false;
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function hideUpdateModal() {
    const modal = $("#updateModal");
    if (modal) {
      modal.hidden = true;
      modal.classList.remove("active");
      document.body.style.overflow = "";
      document.body.style.overflowY = "auto";
    }
  }

  function showRemoveConfirmation(siteName) {
    return new Promise((resolve) => {
      let modal = $("#removeConfirmationModal");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "removeConfirmationModal";
        modal.className = "admin-modal";
        modal.innerHTML = `
          <div class="admin-modal-backdrop" style="background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);"></div>
          <div class="admin-modal-content" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 48px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-width: 480px; width: 90%; animation: modalFadeIn 0.3s ease-out;">
            <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 32px;">
              <div style="width: 64px; height: 64px; background: rgba(239, 68, 68, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <h3 style="font-family: 'Source Sans 3', sans-serif; font-size: 24px; font-weight: 700; color: #1f2937; margin: 0 0 12px 0; text-align: center;">Remove Heritage Site</h3>
              <p style="font-family: 'Source Sans 3', sans-serif; font-size: 16px; font-weight: 400; color: #6b7280; margin: 0; text-align: center; line-height: 1.6; max-width: 400px;">
                Are you sure you want to remove "<span id="removeSiteName" style="color: #1f2937; font-weight: 600;"></span>"? This action cannot be undone.
              </p>
            </div>
            <div style="display: flex; gap: 16px; justify-content: center;">
              <button type="button" id="btn-keep-site" style="font-family: 'Source Sans 3', sans-serif; font-size: 15px; font-weight: 500; color: #6b7280; background: white; border: 1px solid #d1d5db; padding: 12px 24px; border-radius: 10px; cursor: pointer; transition: all 0.2s; min-width: 180px;">
                No, Keep it
              </button>
              <button type="button" id="btn-confirm-remove" style="font-family: 'Source Sans 3', sans-serif; font-size: 15px; font-weight: 500; color: white; background: #dc2626; border: none; padding: 12px 24px; border-radius: 10px; cursor: pointer; transition: all 0.2s; min-width: 180px;">
                Yes, Remove it
              </button>
            </div>
          </div>
          <style>
            @keyframes modalFadeIn {
              from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
              to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
            #btn-keep-site:hover {
              background: #f9fafb;
              border-color: #9ca3af;
            }
            #btn-confirm-remove:hover {
              background: #b91c1c;
            }
            @media (max-width: 480px) {
              .admin-modal-content {
                padding: 32px 24px !important;
              }
              #btn-keep-site, #btn-confirm-remove {
                min-width: 140px !important;
                padding: 10px 16px !important;
              }
            }
          </style>
        `;
        document.body.appendChild(modal);
      }
      
      const siteNameEl = $("#removeSiteName");
      if (siteNameEl) {
        siteNameEl.textContent = siteName;
      }
      
      modal.hidden = false;
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
      
      const keepBtn = $("#btn-keep-site");
      const removeBtn = $("#btn-confirm-remove");
      
      const cleanup = () => {
        modal.hidden = true;
        modal.classList.remove("active");
        document.body.style.overflow = "";
        document.body.style.overflowY = "auto";
        keepBtn.removeEventListener("click", onKeep);
        removeBtn.removeEventListener("click", onRemove);
      };
      
      const onKeep = (e) => {
        e?.stopPropagation();
        cleanup();
        resolve(false);
      };
      
      const onRemove = (e) => {
        e?.stopPropagation();
        cleanup();
        resolve(true);
      };
      
      keepBtn.addEventListener("click", onKeep);
      removeBtn.addEventListener("click", onRemove);
    });
  }

  async function saveMediaForm(e) {
    e.preventDefault();
    let siteId =
      $("#media-site-id").value ||
      editingSiteId ||
      $("#site-id")?.value?.trim();

    if (!siteId) {
      const saved = await ensureSiteDraft();
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

    if (
      isNew &&
      (type === "photo" ||
        type === "map" ||
        type === "model3d" ||
        type === "video" ||
        type === "audio")
    ) {
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

        const typeTitle =
          type === "photo" && files.length > 1
            ? "Uploading photographs…"
            : `Uploading ${TYPE_LABELS[type] || "file"}…`;

        activeUploadController = new AbortController();

        await withUploadProgress(
          async ({ setProgress, hideProgress }) => {
            if (type === "map") {
              setUploadProgress(5, `Uploading map: ${files[0].name}`);
              const cover = await MatiAdminUploads.put(
                `${siteId}/map`,
                files[0],
                {
                  type: "map",
                  siteId,
                  onProgress: (pct) =>
                    setUploadProgress(
                      Math.round(pct * 0.85),
                      `Uploading map: ${files[0].name}`,
                    ),
                  signal: activeUploadController.signal,
                },
              );
              if (activeUploadController.signal.aborted) return;
              setUploadProgress(90, "Saving map to database…");
              const savedSite = await MatiAdminStore.saveSite({
                ...site,
                cover,
              });
              if (!syncOk(savedSite)) {
                showToast(
                  syncFailedMessage(savedSite, "Map uploaded locally only."),
                );
              } else {
                showToast("Site map uploaded to database.");
              }
            } else if (type === "model3d") {
              setUploadProgress(5, `Uploading 3D model: ${files[0].name}`);
              const modelSrc = await MatiAdminUploads.put(
                `${siteId}/model`,
                files[0],
                {
                  type: "model3d",
                  siteId,
                  onProgress: (pct) =>
                    setUploadProgress(
                      Math.round(pct * 0.85),
                      `Uploading 3D model: ${files[0].name}`,
                    ),
                  signal: activeUploadController.signal,
                },
              );
              if (activeUploadController.signal.aborted) return;
              setUploadProgress(90, "Saving 3D model to database…");
              const savedSite = await MatiAdminStore.saveSite({
                ...site,
                modelSrc,
              });
              if (!syncOk(savedSite)) {
                showToast(
                  syncFailedMessage(
                    savedSite,
                    "3D model uploaded locally only.",
                  ),
                );
              } else {
                showToast("3D model uploaded to database.");
              }
            } else if (type === "video" || type === "audio") {
              const title = $("#media-title").value.trim() || files[0].name;
              const key = `${siteId}/${type}s/${MatiAdminStore.slugId(files[0].name)}-${Date.now()}`;
              setUploadProgress(
                5,
                `Uploading ${TYPE_LABELS[type]}: ${files[0].name}`,
              );
              const src = await MatiAdminUploads.put(key, files[0], {
                type,
                siteId,
                onProgress: (pct) =>
                  setUploadProgress(
                    Math.round(pct * 0.85),
                    `Uploading ${TYPE_LABELS[type]}: ${files[0].name}`,
                  ),
                signal: activeUploadController.signal,
              });
              setUploadProgress(90, "Saving media record…");
              if (activeUploadController.signal.aborted) return;
              const saved = await MatiAdminStore.saveMedia({
                siteId,
                type,
                title,
                src,
                caption: $("#media-caption").value,
              });
              if (!saved) {
                throw new Error(`Could not save ${type}.`);
              }
              if (!syncOk(saved)) {
                showToast(
                  syncFailedMessage(
                    saved,
                    `${TYPE_LABELS[type]} saved locally only.`,
                  ),
                );
              } else {
                showToast(`${TYPE_LABELS[type]} uploaded to database.`);
              }
            } else {
              const sharedCaption = $("#media-caption").value;
              const sharedTitle = $("#media-title").value.trim();
              const imageFiles = files.filter((file) =>
                file.type.startsWith("image/"),
              );
              if (!imageFiles.length) {
                throw new Error("Choose at least one image file.");
              }
              const batch = makeBatchProgress(imageFiles.length, "Photograph");
              const uploadedIds = [];
              let lastSaved = null;
              for (const [i, file] of imageFiles.entries()) {
                batch.startFile(i, file.name);
                const key = `${siteId}/photos/${MatiAdminStore.slugId(file.name)}-${Date.now()}-${i}`;
                const src = await MatiAdminUploads.put(key, file, {
                  type: "photo",
                  siteId,
                  onProgress: (pct) => batch.onFileProgress(pct),
                  signal: activeUploadController.signal,
                });
                setUploadProgress(
                  Math.round(((i + 0.92) / imageFiles.length) * 100),
                  `Saving photograph ${i + 1} of ${imageFiles.length}…`,
                );
                if (activeUploadController.signal.aborted) return;
                const saved = await MatiAdminStore.saveMedia({
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
                  throw new Error("Could not save photograph.");
                }
                lastSaved = saved;
                uploadedIds.push(saved.id);
              }
              if (uploadedIds.length > 1) {
                const ordered = MatiAdminStore.getOrderedSiteMedia(
                  siteId,
                  "photo",
                ).map((item) => item.id);
                const rest = ordered.filter((id) => !uploadedIds.includes(id));
                MatiAdminStore.reorderSiteMedia(siteId, "photo", [
                  ...uploadedIds,
                  ...rest,
                ]);
              }
              if (lastSaved && !syncOk(lastSaved)) {
                showToast(
                  syncFailedMessage(
                    lastSaved,
                    "Photographs saved locally only.",
                  ),
                );
              } else {
                showToast(
                  imageFiles.length > 1
                    ? "Photographs uploaded to database."
                    : "Photograph uploaded to database.",
                );
              }
            }
          },
          {
            title: typeTitle,
            detail: "Starting upload…",
            doneDetail: "Upload complete.",
            onCancel: (controller) => {
              controller?.abort();
              hideUploadProgress();
              showToast("Upload cancelled.");
            },
          },
        );
      } catch (error) {
        const message = error?.message || "";
        if (/row-level security|RLS|policy/i.test(message)) {
          showToast(
            "Upload blocked by Supabase. Run the deployment heritage writes SQL first.",
          );
        } else {
          showToast(message || "Could not upload file.");
        }
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

      const saved = await MatiAdminStore.saveMedia({
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
      showToast(
        syncOk(saved)
          ? "Photograph updated in database."
          : syncFailedMessage(saved, "Photograph updated locally only."),
      );
      return;
    }

    const src = $("#media-src").value.trim();
    const title = $("#media-title").value.trim();
    if (!src || !title) {
      showToast("Title and file path or URL are required.");
      return;
    }

    const saved = await MatiAdminStore.saveMedia({
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
    if (!syncOk(saved)) {
      showToast(syncFailedMessage(saved, "Multimedia saved locally only."));
      return;
    }
    showToast(
      isNew
        ? "Multimedia saved to database."
        : "Multimedia updated in database.",
    );
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
    return (
      report === "built" || report === "natural" || report === "intangible"
    );
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
    @page { size: A4; margin: 10mm; }
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
    return `
    <div class="lci-property-card">
      <div class="lci-property-header">
        <div class="lci-property-number">${row.no}</div>
        <div class="lci-property-name">${escapeHtml(row.name)}</div>
      </div>
      
      <div class="lci-property-section">
        <h3 class="lci-section-title">Location</h3>
        <div class="lci-section-content">
          <div class="lci-field">
            <span class="lci-field-label">Barangay:</span>
            <span class="lci-field-value">${escapeHtml(row.barangay)}</span>
          </div>
          <div class="lci-field">
            <span class="lci-field-label">Geographical Coordinates:</span>
            <span class="lci-field-value lci-field-value--coordinates">${escapeHtml(row.coordinates).replace(/\n/g, "<br>")}</span>
          </div>
        </div>
      </div>
      
      <div class="lci-property-section">
        <h3 class="lci-section-title">Classification</h3>
        <div class="lci-section-content">
          <div class="lci-field">
            <span class="lci-field-label">Type:</span>
            <span class="lci-field-value">${escapeHtml(row.propertyType)}</span>
          </div>
          <div class="lci-field">
            <span class="lci-field-label">Category:</span>
            <span class="lci-field-value">${escapeHtml(row.category)}</span>
          </div>
          <div class="lci-field">
            <span class="lci-field-label">Ownership:</span>
            <span class="lci-field-value">${escapeHtml(row.ownership)}</span>
          </div>
        </div>
      </div>
      
      <div class="lci-property-section">
        <h3 class="lci-section-title">Description</h3>
        <div class="lci-section-content">
          <p class="lci-description">${escapeHtml(row.description).replace(/\n/g, "<br>")}</p>
        </div>
      </div>
      
      <div class="lci-property-section">
        <h3 class="lci-section-title">Physical Details</h3>
        <div class="lci-section-content">
          <div class="lci-field">
            <span class="lci-field-label">Area Occupied:</span>
            <span class="lci-field-value">${escapeHtml(row.areaHa)}</span>
          </div>
          <div class="lci-field">
            <span class="lci-field-label">Year Constructed/Started:</span>
            <span class="lci-field-value">${escapeHtml(row.yearStarted)}</span>
          </div>
          <div class="lci-field">
            <span class="lci-field-label">Multimedia Items:</span>
            <span class="lci-field-value">${escapeHtml(row.multimedia)}</span>
          </div>
        </div>
      </div>
      
      <div class="lci-property-section">
        <h3 class="lci-section-title">Declaration Status</h3>
        <div class="lci-section-content">
          <div class="lci-field">
            <span class="lci-field-label">Local:</span>
            <span class="lci-field-value">${escapeHtml(row.declarationLocal)}</span>
          </div>
          <div class="lci-field">
            <span class="lci-field-label">National:</span>
            <span class="lci-field-value">${escapeHtml(row.declarationNational)}</span>
          </div>
          <div class="lci-field">
            <span class="lci-field-label">International:</span>
            <span class="lci-field-value">${escapeHtml(row.declarationInternational)}</span>
          </div>
          <div class="lci-field lci-field--full">
            <span class="lci-field-label">Details:</span>
            <span class="lci-field-value">${escapeHtml(row.declarationDetails).replace(/\n/g, "<br>")}</span>
          </div>
        </div>
      </div>
      
      <div class="lci-property-section">
        <h3 class="lci-section-title">References</h3>
        <div class="lci-section-content">
          <div class="lci-field lci-field--full">
            <span class="lci-field-label">Key Informant(s):</span>
            <span class="lci-field-value">${escapeHtml(row.keyInformants).replace(/\n/g, "<br>")}</span>
          </div>
          <div class="lci-field lci-field--full">
            <span class="lci-field-label">References:</span>
            <span class="lci-field-value">${escapeHtml(row.references).replace(/\n/g, "<br>")}</span>
          </div>
        </div>
      </div>
    </div>`;
  }

  function buildSiteReportBodyHtml(site, sealLogo, tourismLogo) {
    const inventoryNumber = MatiAdminStore.getLciInventoryNumber(site.id);
    const row = MatiAdminStore.buildLciInventoryRow(
      site,
      inventoryNumber ? inventoryNumber - 1 : 0,
    );

    return `
    <div class="report-container">
      ${buildLciLetterheadHtml(sealLogo, tourismLogo)}
      ${buildLciInventoryTableHtml(row)}
    </div>`;
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

  async function renderReport() {
    const cfg = REPORT_CONFIG[currentReport];
    if (!cfg) return;

    if (currentReport === "leaderboard") {
      ensureLeaderboardLive();
      try {
        await MatiAdminStore.refreshLeaderboard({ force: true });
      } catch {
        /* keep cache / local fallback */
      }
    }

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
      const colspan =
        cfg.headers.length + (isHeritageReportKey(currentReport) ? 1 : 0);
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
      const mediaType = $("#media-type")?.value;
      if (
        (mediaType !== "photo" && mediaType !== "model3d" && mediaType !== "map") ||
        $("#media-id")?.value?.trim()
      ) {
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
      const mediaType = $("#media-type")?.value;
      if (
        (mediaType !== "photo" && mediaType !== "model3d" && mediaType !== "map") ||
        $("#media-id")?.value?.trim()
      ) {
        return;
      }
      e.preventDefault();

      let files = [];
      if (mediaType === "photo") {
        files = [...(e.dataTransfer?.files || [])].filter((file) =>
          file.type.startsWith("image/"),
        );
        if (!files.length) {
          showToast("Drop image files only.");
          return;
        }
      } else if (mediaType === "model3d") {
        files = [...(e.dataTransfer?.files || [])].filter((file) =>
          file.name.endsWith(".glb") || file.type === "model/gltf-binary",
        );
        if (!files.length) {
          showToast("Drop .glb 3D model files only.");
          return;
        }
      } else if (mediaType === "map") {
        files = [...(e.dataTransfer?.files || [])].filter((file) =>
          file.type.startsWith("image/"),
        );
        if (!files.length) {
          showToast("Drop image files only for site map.");
          return;
        }
        if (files.length > 1) {
          showToast("Drop only one image file for site map.");
          return;
        }
      }

      const transfer = new DataTransfer();
      files.forEach((file) => transfer.items.add(file));
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      updateMediaFormUi();
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
        showToast(
          `Imported ${result.count} built heritage sites into Supabase.`,
        );
        await refreshDashboardFromSupabase();
        renderHeritage();
        return;
      }

      showToast(
        result.message || "Could not import built heritage into Supabase.",
      );
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
      if (type === "model3d") {
        updateMediaFormUi();
        return;
      }
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

      const viewMap = e.target.closest("[data-view-map]");
      if (viewMap) {
        e.preventDefault();
        e.stopPropagation();
        const siteId = viewMap.dataset.viewMap;
        const site = MatiAdminStore.getSiteById(siteId);
        if (site && site.cover) {
          // Open the site map image in a new tab
          window.open(site.cover, '_blank');
        } else {
          showToast("No site map to view.");
        }
        return;
      }

      const closeLightbox = e.target.closest("#galLightboxClose, .gal-lightbox-backdrop");
      if (closeLightbox) {
        e.preventDefault();
        e.stopPropagation();
        const box = $("#galLightbox");
        const media = $("#galLightboxMedia");
        if (media) {
          media.innerHTML = "";
        }
        if (box) {
          box.classList.remove("active");
          document.body.style.overflow = "";
          document.body.style.overflowY = "auto";
        }
        // Return to photo collection modal if it exists
        const photoModal = $("#photoCollectionModal");
        if (photoModal && !photoModal.hidden) {
          document.body.style.overflow = "hidden";
        } else {
          // Clear global lightbox state only if photo modal is not open
          window.currentLightboxPhotos = null;
          window.currentLightboxIndex = 0;
          window.currentLightboxSiteName = null;
        }
        return;
      }

      const closePhotoCollection = e.target.closest("[data-close-photo-collection], .admin-modal-backdrop");
      if (closePhotoCollection) {
        e.preventDefault();
        e.stopPropagation();
        const modal = $("#photoCollectionModal");
        if (modal) {
          modal.hidden = true;
          modal.classList.remove("active");
          document.body.style.overflow = "";
          document.body.style.overflowY = "auto";
          window.currentLightboxPhotos = null;
          window.currentLightboxSiteName = null;
        }
        return;
      }

      const photoItem = e.target.closest(".photo-collection-item");
      if (photoItem && window.currentLightboxPhotos) {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(photoItem.dataset.photoIndex, 10);
        window.currentLightboxIndex = index;
        showAdminLightbox();
        return;
      }

      const viewPhotos = e.target.closest("[data-view-photos]");
      if (viewPhotos) {
        e.preventDefault();
        e.stopPropagation();
        const siteId = viewPhotos.dataset.viewPhotos;
        const site = MatiAdminStore.getSiteById(siteId);
        if (site) {
          const photos = MatiAdminStore.getSiteMedia(siteId).filter(m => m.type === "photo");
          if (photos.length > 0) {
            // Show photo collection modal
            showPhotoCollectionModal(site, photos);
          } else {
            showToast("No photographs to view.");
          }
        }
        return;
      }

      // Lightbox navigation handlers
      const lightboxPrev = e.target.closest("#galLightboxPrev");
      if (lightboxPrev && window.currentLightboxPhotos) {
        e.preventDefault();
        e.stopPropagation();
        window.currentLightboxIndex = (window.currentLightboxIndex - 1 + window.currentLightboxPhotos.length) % window.currentLightboxPhotos.length;
        showAdminLightbox();
        return;
      }

      const lightboxNext = e.target.closest("#galLightboxNext");
      if (lightboxNext && window.currentLightboxPhotos) {
        e.preventDefault();
        e.stopPropagation();
        window.currentLightboxIndex = (window.currentLightboxIndex + 1) % window.currentLightboxPhotos.length;
        showAdminLightbox();
        return;
      }

      const manageSite = e.target.closest("button[data-edit-site]");
      if (manageSite) {
        e.preventDefault();
        e.stopPropagation();
        openSiteModal(manageSite.dataset.editSite);
        return;
      }

      const heritageCard = e.target.closest(
        ".admin-heritage-card[data-edit-site]",
      );
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
      if (e.target.id === "admin-confirm-modal") {
        closeConfirmModal(false);
        return;
      }
      if (e.target.id === "media-modal") {
        closeMediaModal();
        return;
      }
      if (
        e.target.id === "site-modal" &&
        $("#media-modal") &&
        !$("#media-modal").hidden
      ) {
        return;
      }
      if (e.target.classList.contains("admin-modal")) {
        closeAllModals();
      }
    });

    $("#btn-add-site")?.addEventListener("click", () => openSiteModal(null));

    $("#site-form")?.addEventListener("submit", saveSiteForm);

    $("#media-form")?.addEventListener("submit", saveMediaForm);

    $("#btn-delete-site")?.addEventListener("click", async () => {
      const id = $("#site-id").value.trim();
      if (!id) return;
      
      const site = MatiAdminStore.getSiteById(id);
      const siteName = site?.name || "this site";
      
      const confirmed = await showRemoveConfirmation(siteName);
      if (!confirmed) return;
      
      try {
        await runDeleteProgress(() => MatiAdminStore.deleteSite(id), {
          noun: "site",
          count: 1,
        });
        closeAllModals();
        renderHeritage();
        renderDashboard();
        renderLocation();
      } catch (error) {
        showToast(error?.message || "Could not delete site.");
      }
    });

    $("#admin-confirm-cancel")?.addEventListener("click", () => {
      closeConfirmModal(false);
    });
    $("#admin-confirm-ok")?.addEventListener("click", () => {
      closeConfirmModal(true);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const confirmRoot = $("#admin-confirm-modal");
      if (confirmRoot && !confirmRoot.hidden) {
        e.preventDefault();
        closeConfirmModal(false);
      }
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

  function bindModelCardDragDrop(container) {
    const card = container.querySelector(".admin-model-card--empty");
    if (!card || card.dataset.dragBound) return;
    card.dataset.dragBound = "true";

    const cardType = card.dataset.addMediaType || "model3d";
    const isMap = cardType === "map";
    const isModel = cardType === "model3d";
    const isPhoto = cardType === "photo";

    const titleEl = card.querySelector(".admin-model-card__title");
    const originalTitle = titleEl?.textContent || (isMap ? "No Site Map Available" : (isPhoto ? "No Photographs Available" : "No 3D Model Available"));
    const dropLabel = card.querySelector(".admin-model-card__drop-label");
    const descEl = card.querySelector(".admin-model-card__desc");
    const uploadIcon = card.querySelector(".admin-model-card__drop-icon");
    const defaultBtnIcon = card.querySelector(
      "button > svg:not(.admin-model-card__drop-icon)",
    );

    const isValidFile = (file) => {
      if (isMap) {
        return file.type.startsWith("image/");
      }
      if (isModel) {
        return file.name.toLowerCase().endsWith(".glb");
      }
      if (isPhoto) {
        return file.type.startsWith("image/");
      }
      return false;
    };

    const updateDropState = (isOver, isValid = false) => {
      card.classList.toggle("is-dragover", isOver && isValid);
      const isInvalid = isOver && !isValid;
      card.classList.toggle("is-dragover-invalid", isInvalid);
      if (isInvalid) {
        card.classList.remove("is-dragover-invalid");
        void card.offsetWidth;
        card.classList.add("is-dragover-invalid");
      }

      if (titleEl) {
        titleEl.textContent = isInvalid ? "Invalid file type" : originalTitle;
      }
      if (descEl) {
        descEl.textContent = isInvalid
          ? (isMap ? "Please drop a valid image file for the site map." : (isPhoto ? "Please drop valid image files for photographs." : "Please drop a valid .glb or .gltf 3D model file."))
          : (isMap ? "Upload a site map to preview and manage it here." : (isPhoto ? "Upload photographs to preview and manage them here." : "Upload a 3D model to preview and manage it here."));
      }
      if (dropLabel && descEl) {
        dropLabel.style.display = isOver && isValid ? "block" : "none";
      }
      if (uploadIcon) {
        uploadIcon.style.display = isOver && isValid ? "inline-block" : "none";
      }
      if (defaultBtnIcon) {
        defaultBtnIcon.style.display =
          isOver && isValid ? "none" : "inline-block";
      }
    };

    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      const hasFile = e.dataTransfer.types.includes("Files");
      const file = hasFile ? e.dataTransfer.items[0]?.getAsFile() : null;
      updateDropState(true, file ? isValidFile(file) : hasFile);
    });

    card.addEventListener("dragleave", (e) => {
      if (!card.contains(e.relatedTarget)) {
        updateDropState(false);
      }
    });

    card.addEventListener("drop", async (e) => {
      e.preventDefault();
      updateDropState(false);

      const file = e.dataTransfer.files?.[0];
      if (!file || !isValidFile(file)) {
        card.classList.add("is-dragover-invalid");
        if (titleEl) titleEl.textContent = "Invalid file type";
        if (descEl)
          descEl.textContent =
            isMap ? "Please drop a valid image file for the site map." : (isPhoto ? "Please drop valid image files for photographs." : "Please drop a valid .glb or .gltf 3D model file.");
        setTimeout(() => card.classList.remove("is-dragover-invalid"), 1200);
        return;
      }

      let siteId =
        $("#media-site-id").value ||
        editingSiteId ||
        $("#site-id")?.value?.trim();
      if (!siteId) {
        const saved = await ensureSiteDraft();
        if (!saved) {
          showToast("Could not prepare this site for upload.");
          return;
        }
        siteId = saved.id;
      }

      const site = MatiAdminStore.getSiteById(siteId);
      if (!site) {
        showToast("Could not find this site. Save the site and try again.");
        return;
      }

      try {
        await withUploadProgress(
          async ({ setProgress, hideProgress }) => {
            if (activeUploadController) {
              activeUploadController.abort();
            }
            activeUploadController = new AbortController();

            if (isMap) {
              setProgress(5, `Uploading site map: ${file.name}`);
              const cover = await MatiAdminUploads.put(
                `${siteId}/map`,
                file,
                {
                  type: "map",
                  siteId,
                  onProgress: (pct) => {
                    if (activeUploadController.signal.aborted) return;
                    setProgress(
                      5 + pct * 0.8,
                      `Uploading site map: ${file.name}`,
                    );
                  },
                  signal: activeUploadController.signal,
                },
              );
              if (activeUploadController.signal.aborted) return;
              setProgress(90, "Saving site map to database…");
              const savedSite = await MatiAdminStore.saveSite({
                ...site,
                cover,
              });
              if (!syncOk(savedSite)) {
                showToast(
                  syncFailedMessage(savedSite, "Site map uploaded locally only."),
                );
              } else {
                showToast("Site map uploaded to database.");
              }
            } else if (isPhoto) {
              // For photos, we need to open the media modal with the file
              const transfer = new DataTransfer();
              transfer.items.add(file);
              const fileInput = $("#media-file");
              if (fileInput) {
                fileInput.files = transfer.files;
                // Set media type to photo
                const mediaTypeSelect = $("#media-type");
                if (mediaTypeSelect) {
                  mediaTypeSelect.value = "photo";
                }
                // Ensure site exists (create draft if needed)
                if (!siteId) {
                  const saved = await ensureSiteDraft();
                  if (!saved) {
                    showToast("Could not prepare this site for upload.");
                    return;
                  }
                  siteId = saved.id;
                }
                // Open media modal
                openMediaModal("photo", siteId);
                // Trigger file input change
                fileInput.dispatchEvent(new Event("change", { bubbles: true }));
                updateMediaFormUi();
              }
              return;
            } else if (isModel) {
              setProgress(5, `Uploading 3D model: ${file.name}`);
              const modelSrc = await MatiAdminUploads.put(
                `${siteId}/model`,
                file,
                {
                  type: "model3d",
                  siteId,
                  onProgress: (pct) => {
                    if (activeUploadController.signal.aborted) return;
                    setProgress(
                      5 + pct * 0.8,
                      `Uploading 3D model: ${file.name}`,
                    );
                  },
                  signal: activeUploadController.signal,
                },
              );
              if (activeUploadController.signal.aborted) return;
              setProgress(90, "Saving 3D model to database…");
              const savedSite = await MatiAdminStore.saveSite({
                ...site,
                modelSrc,
              });
              if (!syncOk(savedSite)) {
                showToast(
                  syncFailedMessage(savedSite, "3D model uploaded locally only."),
                );
              } else {
                showToast("3D model uploaded to database.");
              }
            }

            refreshSiteViews(siteId);
          },
          {
            title: isMap ? "Uploading Site Map..." : (isPhoto ? "Opening Photo Upload..." : "Uploading 3D Model..."),
            doneDetail: isMap ? "Upload complete. Site map is now linked." : (isPhoto ? "" : "Upload complete. Model is now linked."),
            onCancel: (controller) => {
              controller?.abort();
              hideUploadProgress();
              showToast("Upload cancelled.");
            },
          },
        );
      } catch (error) {
        showToast(error?.message || "Could not upload 3D model.");
      }
    });
  }

  function init() {
    const mediaModal = $("#media-modal");
    injectStyles(["photoPile", "modelCard", "modelUpload"]);
    if (mediaModal) document.body.appendChild(mediaModal);

    bindEvents();
    bindSiteFormUi();

    if (typeof MatiAdminMap !== "undefined") {
      MatiAdminMap.setSiteSelectHandler((siteId) => {
        openSiteModal(siteId);
      });
    }

    const boot = async () => {
      if (typeof MatiAdminAuth?.requireAdmin === "function") {
        const allowed = await MatiAdminAuth.requireAdmin();
        if (!allowed) return;
      }

      if (typeof MatiAdminStore?.initFromSupabase === "function") {
        await MatiAdminStore.initFromSupabase();
      }
      // Push any existing admin drag/reorder so visitor gallery matches.
      if (typeof MatiAdminStore?.syncAllMediaOrdersToSupabase === "function") {
        const orderSync = await MatiAdminStore.syncAllMediaOrdersToSupabase();
        if (orderSync && orderSync.ok === false && orderSync.synced === 0) {
          if (orderSync.reason !== "not_configured") {
            console.warn("Gallery media order sync failed", orderSync.error);
            showToast(
              "Could not sync gallery photo order. Run the sort_order migration in Supabase.",
            );
          }
        }
      }
      if (typeof MatiAdminStore?.refreshLeaderboard === "function") {
        await MatiAdminStore.refreshLeaderboard({ force: true });
      }
      ensureCatalogLive();
      ensureLeaderboardLive();
      ensureVisitorLive();

      // Check for URL query parameters for direct site focus
      const urlParams = new URLSearchParams(window.location.search);
      const focusSiteId = urlParams.get("focusSite");

      if (focusSiteId) {
        // Navigate to map view and focus on the site
        setView("location");
        if (typeof MatiAdminMap !== "undefined") {
          MatiAdminMap.setCategoryFilter("built");
          void MatiAdminMap.refresh().then(() => {
            setTimeout(() => {
              MatiAdminMap.focusSite(focusSiteId);
            }, 300);
          });
        }
        // Clean up URL parameter
        urlParams.delete("focusSite");
        const newUrl = new URL(window.location);
        newUrl.search = urlParams.toString();
        window.history.replaceState({}, "", newUrl);
      } else {
        setView("dashboard", {}, { skipDashboardRefresh: true });
      }
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
    confirmAction(options) {
      return confirmAction(options);
    },
    runDeleteProgress(task, options) {
      return runDeleteProgress(task, options);
    },
    onMediaDeleted(siteId) {
      renderDashboard();
      renderHeritage();
      if (siteId) renderSiteMediaList(siteId);
    },
  };

  function showPhotoCollectionModal(site, photos) {
    // Create or get the photo collection modal
    let modal = $("#photoCollectionModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "photoCollectionModal";
      modal.className = "admin-modal";
      modal.innerHTML = `
        <div class="admin-modal-backdrop" style="background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px);"></div>
        <div class="admin-modal-content" style="max-width: 1400px; height: 85vh; overflow-y: auto; background: rgba(255, 255, 255, 0.95); border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); position: relative;">
          <button type="button" class="admin-modal-close" data-close-photo-collection style="position: absolute; top: 16px; right: 16px; z-index: 10; font-size: 28px; line-height: 1; color: #6b7280; transition: color 0.2s; background: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer;">&times;</button>
          <div class="admin-modal-header" style="border-bottom: 1px solid #e5e7eb; padding: 20px 24px; padding-right: 60px; display: flex; justify-content: space-between; align-items: center;">
            <h2 class="admin-modal-title" id="photoCollectionTitle" style="font-family: 'Source Sans 3', sans-serif; font-size: 22px; font-weight: 600; color: #1f2937; margin: 0;"></h2>
            <span id="photoCollectionCount" style="font-family: 'Source Sans 3', sans-serif; font-size: 14px; font-weight: 500; color: #6b7280; margin-right: 50px;"></span>
          </div>
          <div class="admin-modal-body" style="padding: 24px;">
            <div class="photo-collection-grid" id="photoCollectionGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px;"></div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    
    // Set title and count
    const titleEl = $("#photoCollectionTitle");
    const countEl = $("#photoCollectionCount");
    if (titleEl) {
      titleEl.textContent = escapeHtml(site.name);
    }
    if (countEl) {
      countEl.textContent = `${photos.length} photograph${photos.length !== 1 ? 's' : ''}`;
    }
    
    // Build photo grid with gallery-style design
    const gridEl = $("#photoCollectionGrid");
    if (gridEl) {
      gridEl.innerHTML = photos.map((photo, index) => `
        <div class="photo-collection-item" data-photo-index="${index}" style="cursor: pointer; position: relative; overflow: hidden; border-radius: 8px; aspect-ratio: 1; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); transition: transform 0.2s, box-shadow 0.2s; background: #f3f4f6;">
          <img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.title || 'Photograph')}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s;" />
          <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 10px; background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent); color: white; font-size: 12px; font-weight: 500; opacity: 0; transition: opacity 0.2s;">
            ${escapeHtml(photo.title || `Photo ${index + 1}`)}
          </div>
        </div>
      `).join("");
      
      // Add hover effects via inline styles
      gridEl.querySelectorAll('.photo-collection-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
          item.querySelector('img').style.transform = 'scale(1.05)';
          item.querySelector('div:last-child').style.opacity = '1';
        });
        item.addEventListener('mouseleave', () => {
          item.querySelector('img').style.transform = 'scale(1)';
          item.querySelector('div:last-child').style.opacity = '0';
        });
      });
    }
    
    // Store photos for lightbox navigation
    window.currentLightboxPhotos = photos;
    window.currentLightboxSiteName = site.name;
    
    // Show modal
    modal.hidden = false;
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function showAdminLightbox() {
    const photos = window.currentLightboxPhotos;
    if (!photos || !photos[window.currentLightboxIndex]) return;
    
    const photo = photos[window.currentLightboxIndex];
    const box = $("#galLightbox");
    const media = $("#galLightboxMedia");
    const title = $("#galLightboxTitle");
    const meta = $("#galLightboxMeta");
    const prevBtn = $("#galLightboxPrev");
    const nextBtn = $("#galLightboxNext");
    
    if (!box || !media) return;
    
    // Set lightbox content using gallery-style HTML
    media.innerHTML = `<div class="gal-lightbox-player-wrap"><img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.title || 'Photograph')}" decoding="async" /></div>`;
    
    if (title) {
      title.textContent = `${escapeHtml(window.currentLightboxSiteName || 'Site')} - Photograph ${window.currentLightboxIndex + 1} of ${photos.length}`;
    }
    
    if (meta) {
      meta.textContent = photo.title ? escapeHtml(photo.title) : "";
      meta.hidden = !photo.title;
    }
    
    // Show/hide navigation buttons
    const showNav = photos.length > 1;
    if (prevBtn) prevBtn.classList.toggle("is-hidden", !showNav);
    if (nextBtn) nextBtn.classList.toggle("is-hidden", !showNav);
    
    // Activate lightbox using gallery pattern
    box.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
