/** Mati Heritage 3D — Admin console UI */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  let currentView = "dashboard";
  let currentCategory = "built";
  let editingSiteId = null;
  let mapPickSession = false;
  let mediaModalPresetType = null;
  let toastTimer = null;
  const heritagePreviewUrls = new Set();
  let builtModelObserver = null;
  let logoutInProgress = false;
  let activeUploadController = null;
  let modelFileValidationId = 0;
  let modelFileIsValid = false;
  let modelFileValidationInProgress = false;
  let modelSubmitInProgress = false;
  let modelReplaceConfirmationInProgress = false;
  let modelUploadInProgress = false;
  let builtHeritagePage = 1;
  const BUILT_HERITAGE_PAGE_SIZE = 10;

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
  let uploadProgressMeta = {};
  let resumeUploadHandler = null;

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    const decimals = unitIndex === 0 ? 0 : 2;
    return `${Number(value).toFixed(decimals)} ${units[unitIndex]}`;
  }

  function progressFileType(fileName) {
    const extension = String(fileName || "")
      .split(/[?#]/, 1)[0]
      .match(/\.([^.\\/]+)$/)?.[1];
    return extension ? `.${extension.toUpperCase()}` : "FILE";
  }

  function uploadProgressEls() {
    return {
      root: $("#admin-upload-progress"),
      title: $("#admin-upload-progress-title"),
      file: $("#admin-upload-progress-file"),
      detail: $("#admin-upload-progress-detail"),
      spinner: $("#admin-upload-progress-spinner"),
      pct: $("#admin-upload-progress-pct"),
      size: $("#admin-upload-progress-size"),
      cancel: $("#admin-upload-progress-cancel"),
      close: $("#admin-upload-progress-close"),
      resume: $("#admin-upload-progress-resume"),
      fileType: $("#admin-upload-progress-file-type"),
      fill: $("#admin-upload-progress-fill"),
      bar: $("#admin-upload-progress-bar"),
    };
  }

  function paintUploadProgress(value, meta = uploadProgressMeta) {
    const { pct, size, file, fileType, fill, bar } =
      uploadProgressEls();
    const rounded = Math.max(0, Math.min(100, Math.round(value)));
    if (pct) pct.textContent = `${rounded}%`;
    if (fill) fill.style.width = `${rounded}%`;
    if (bar) bar.setAttribute("aria-valuenow", String(rounded));
    if (meta.fileName) {
      if (file) file.textContent = meta.fileName;
      if (fileType) {
        fileType.hidden = false;
        fileType.textContent = progressFileType(meta.fileName);
      }
    }

    const progressBytes =
      meta.loadedBytes && typeof meta.loadedBytes === "object"
        ? meta.loadedBytes
        : null;
    const totalBytes = Number(meta.totalBytes || progressBytes?.total || 0);
    const rawLoadedBytes = progressBytes
      ? progressBytes.loaded
      : meta.loadedBytes;
    const loadedBytesValue = Number(rawLoadedBytes || 0);

    if (totalBytes > 0) {
      const actualLoaded = Math.max(
        0,
        Math.min(totalBytes, loadedBytesValue),
      );
      if (size) {
        size.textContent = `${formatBytes(actualLoaded)} / ${formatBytes(totalBytes)}`;
      }
    } else if (size) {
      size.textContent = "0 MB / 0 MB";
    }
  }

  function tickUploadProgressAnim() {
    uploadProgressAnimFrame = null;
    const diff = uploadProgressTarget - uploadProgressDisplay;
    if (Math.abs(diff) < 0.15) {
      uploadProgressDisplay = uploadProgressTarget;
      paintUploadProgress(uploadProgressDisplay, uploadProgressMeta);
      return;
    }
    uploadProgressDisplay += diff * 0.22;
    paintUploadProgress(uploadProgressDisplay, uploadProgressMeta);
    uploadProgressAnimFrame = requestAnimationFrame(tickUploadProgressAnim);
  }

  function setUploadStatus(text, isProcessing = false) {
    const { detail, spinner } = uploadProgressEls();
    if (detail) detail.textContent = text;
    if (spinner) spinner.hidden = !isProcessing;
  }

  function showUploadProgress({
    title = "Uploading…",
    detail = "Preparing file…",
    onCancel = null,
    percent = 0,
    meta = {},
  } = {}) {
    const {
      root,
      title: titleEl,
      detail: detailEl,
      spinner,
      cancel: cancelBtn,
      close: closeBtn,
      resume: resumeBtn,
      fileType,
      size,
    } = uploadProgressEls();
    if (!root) return;
    clearTimeout(uploadProgressHideTimer);
    root.hidden = false;
    if (closeBtn) {
      closeBtn.hidden = true;
      closeBtn.onclick = null;
    }
    if (activeUploadController) {
      activeUploadController.abort();
    }
    activeUploadController = new AbortController();
    if (cancelBtn) {
      cancelBtn.onclick = onCancel;
      cancelBtn.hidden = typeof onCancel !== "function";
    }
    if (resumeBtn) {
      resumeBtn.hidden = true;
      resumeBtn.onclick = null;
    }
    root.classList.remove("is-done", "is-error", "is-exiting");
    root.setAttribute("aria-busy", "true");
    if (titleEl) titleEl.textContent = title;
    if (detailEl) detailEl.textContent = detail;
    if (spinner) {
      spinner.hidden = !/finaliz|saving|finishing/i.test(detail);
    }
    if (size) size.textContent = "0 MB / 0 MB";
    const fileEl = $("#admin-upload-progress-file");
    if (fileEl) fileEl.textContent = meta.fileName || "Preparing file...";
    if (fileType) {
      fileType.hidden = !meta.fileName;
      fileType.textContent = meta.fileName
        ? progressFileType(meta.fileName)
        : "";
    }
    uploadProgressMeta = { ...meta };
    uploadProgressDisplay = Math.max(0, Number(percent) || 0);
    uploadProgressTarget = uploadProgressDisplay;
    paintUploadProgress(uploadProgressDisplay, meta);
    document.body.classList.add("admin-upload-busy");
    requestAnimationFrame(() => {
      root.classList.add("is-visible");
    });
    if (onCancel) {
      cancelBtn.onclick = () => onCancel(activeUploadController);
      cancelBtn.hidden = false;
    }
  }

  function setUploadProgress(percent, detail, meta = {}) {
    const { detail: detailEl, root, file } = uploadProgressEls();
    const value = Math.max(0, Math.min(100, Number(percent) || 0));
    uploadProgressTarget = value;
    uploadProgressMeta = { ...uploadProgressMeta, ...meta };
    if (!uploadProgressAnimFrame) {
      uploadProgressAnimFrame = requestAnimationFrame(tickUploadProgressAnim);
    }
    if (detail != null) {
      const isFinalizing = /finaliz|saving|finishing/i.test(detail);
      setUploadStatus(detail, isFinalizing);
      if (file && typeof meta.fileName === "string") {
        file.textContent = meta.fileName;
      }
    }
    paintUploadProgress(value, {
      ...uploadProgressMeta,
      fileName: meta.fileName || file?.textContent || "Pylon.glb",
    });
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
        uploadProgressMeta = {};
        paintUploadProgress(0);
        const { detail, title, file, fileType, spinner } = uploadProgressEls();
        if (detail) detail.textContent = "Preparing file...";
        if (file) file.textContent = "Preparing file...";
        if (fileType) {
          fileType.hidden = true;
          fileType.textContent = "";
        }
        if (spinner) spinner.hidden = true;
        const { cancel: cancelBtn, close: closeBtn } = uploadProgressEls();
        if (cancelBtn) {
          cancelBtn.hidden = true;
        }
        if (closeBtn) {
          closeBtn.hidden = true;
          closeBtn.onclick = null;
        }
        const { resume: resumeBtn } = uploadProgressEls();
        if (resumeBtn) {
          resumeBtn.hidden = true;
          resumeBtn.onclick = null;
        }
        resumeUploadHandler = null;
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
    const useDefaultCancel =
      options.onCancel !== undefined && options.onCancel !== null;
    const cancelHandler = useDefaultCancel
      ? options.onCancel
      : (controller) => {
          controller?.abort();
          hideUploadProgress();
          showToast("Upload cancelled.");
        };
    let lastProgress = Number(options.percent) || 0;
    let lastMeta = { ...(options.meta || {}) };
    showUploadProgress({
      title: options.title || "Uploading…",
      detail: options.detail || "Starting…",
      onCancel: useDefaultCancel ? cancelHandler : null,
      percent: options.percent || 0,
      meta: options.meta || {},
    });
    try {
      const result = await task({
        setProgress: (percent, detail, meta = {}) => {
          lastProgress = Number(percent) || 0;
          lastMeta = { ...lastMeta, ...meta };
          setUploadProgress(percent, detail, meta);
        },
        hideProgress: hideUploadProgress,
        show: showUploadProgress,
      });
      const { title } = uploadProgressEls();
      if (title) title.textContent = options.doneTitle || "Complete";
      setUploadStatus(options.doneDetail || "Upload complete.");
      setUploadProgress(100);
      const { root, cancel } = uploadProgressEls();
      if (root) {
        root.classList.add("is-done");
        root.setAttribute("aria-busy", "false");
      }
      if (cancel) cancel.hidden = true;
      hideUploadProgress({ delay: options.doneDelay ?? 900 });
      return result;
    } catch (error) {
      if (error?.fileTooLarge) {
        const { root, title, detail, cancel, close, resume } =
          uploadProgressEls();
        if (root) {
          const isModelUpload = /3d model/i.test(options.title || "");
          const uploadKind = isModelUpload ? "3D model" : "file";
          const fileSize = Number(lastMeta.totalBytes);
          const fileSizeLabel =
            fileSize > 0 ? ` (${formatBytes(fileSize)})` : "";
          root.hidden = false;
          root.classList.add("is-visible", "is-error");
          root.setAttribute("aria-busy", "false");
          if (title) {
            title.textContent = isModelUpload
              ? "Model is too large"
              : "File is too large";
          }
          if (detail) {
            detail.textContent = `This ${uploadKind}${fileSizeLabel} is larger than the allowed upload size. Choose a smaller ${isModelUpload ? ".glb model" : "file"} or ask your administrator to increase the upload limit, then try again.`;
          }
          setUploadStatus(detail?.textContent || "Upload could not start.");
          paintUploadProgress(lastProgress, lastMeta);
          if (cancel) cancel.hidden = false;
          if (close) {
            close.hidden = false;
            close.onclick = () => hideUploadProgress();
          }
          if (resume) {
            resume.hidden = true;
            resume.onclick = null;
          }
        }
      } else if (error?.resumeAvailable) {
        const { root, title, detail, cancel, resume } = uploadProgressEls();
        if (root) {
          root.hidden = false;
          root.classList.add("is-visible", "is-error");
          root.setAttribute("aria-busy", "false");
          if (title)
            title.textContent = options.retrying
              ? "Resume failed"
              : "Upload paused";
          if (detail) {
            detail.textContent = options.retrying
              ? `The partial upload is preserved. ${error.message || "Check your connection and try Resume again."}`
              : "The partial upload is saved. Resume when your connection returns.";
          }
          setUploadStatus(detail?.textContent || "Upload paused.");
          paintUploadProgress(lastProgress, lastMeta);
          if (cancel) cancel.hidden = true;
          if (resume) {
            resume.hidden = false;
            resume.onclick = async () => {
              resume.hidden = true;
              resumeUploadHandler = null;
              try {
                await withUploadProgress(task, {
                  ...options,
                  retrying: true,
                  percent: lastProgress,
                  meta: lastMeta,
                });
              } catch {
                /* The next failure keeps the Resume button available. */
              }
            };
          }
        }
      } else {
        hideUploadProgress();
      }
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
    variant = "",
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
    root.classList.toggle("admin-confirm-modal--large", variant === "large");
    root.hidden = false;
    requestAnimationFrame(() => ok?.focus());
    return new Promise((resolve) => {
      confirmResolve = resolve;
    });
  }

  async function runDeleteProgress(task, options = {}) {
    const count = Math.max(1, Number(options.count) || 1);
    const noun = options.noun || (count === 1 ? "item" : "items");
    const label = options.label || (count === 1 ? noun : `${count} ${noun}`);
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
        meta: { fileName: label },
        onCancel: null,
        doneTitle: "Removal complete",
        doneDetail: options.doneDetail || `${label} removed successfully.`,
        doneDelay: 1100,
      },
    );
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
      return "Could not save to Supabase. Your entries are still in the form; fix the database access and click Save again.";
    }
    return message
      ? `Could not save to Supabase: ${message}`
      : /locally only|saved locally|uploaded locally/i.test(fallback || "")
        ? "Could not save to Supabase. Your entries are still in the form; reconnect and click Save again."
        : `${fallback || "Could not save to Supabase."} Your entries are still in the form; reconnect and click Save again.`;
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
    if (select && select.tagName === "SELECT") select.value = cat;
  }

  function updateSiteFormFields() {
    const builtForm = isBuiltHeritageForm();
    const cat = builtForm
      ? "built"
      : $("#site-category")?.value || currentCategory;
    syncSiteCategoryValue(cat);

    const builtWrap = $("#site-category-built-wrap");
    const selectWrap = $("#site-category-select-wrap");
    const heritageType = $("#site-heritage-type-field");
    const ownershipField = $("#site-ownership-field");
    const coordinateWrap = $("#site-coordinates-wrap");
    const latField = $("#site-lat");
    const lngField = $("#site-lng");

    if (builtWrap) builtWrap.hidden = true;
    if (selectWrap) selectWrap.hidden = false;
    if (heritageType)
      heritageType.hidden =
        cat !== "built" && cat !== "natural" && cat !== "intangible";
    if (ownershipField) ownershipField.hidden = !builtForm;
    const latLabel = $("#site-lat-field .admin-label");
    const lngLabel = $("#site-lng-field .admin-label");
    const isIntangible = cat === "intangible";

    if (coordinateWrap) {
      coordinateWrap.hidden = isIntangible;
      coordinateWrap.style.display = isIntangible ? "none" : "";
    }
    if (latField) {
      latField.hidden = isIntangible;
      latField.style.display = isIntangible ? "none" : "";
    }
    if (lngField) {
      lngField.hidden = isIntangible;
      lngField.style.display = isIntangible ? "none" : "";
    }
    if (latLabel) {
      latLabel.hidden = isIntangible;
      latLabel.style.display = isIntangible ? "none" : "";
    }
    if (lngLabel) {
      lngLabel.hidden = isIntangible;
      lngLabel.style.display = isIntangible ? "none" : "";
    }

    if (isIntangible) {
      if (latField) latField.value = "";
      if (lngField) lngField.value = "";
    }

    const requiredFields = new Set(
      builtForm
        ? [
            "#site-name",
            "#site-heritage-type",
            "#site-ownership",
            "#site-location",
            "#site-lat",
            "#site-lng",
            "#site-desc",
          ]
        : cat === "natural"
          ? [
              "#site-name",
              "#site-heritage-type",
              "#site-location",
              "#site-lat",
              "#site-lng",
              "#site-desc",
            ]
          : cat === "intangible"
            ? [
                "#site-name",
                "#site-heritage-type",
                "#site-location",
                "#site-desc",
              ]
            : ["#site-name", "#site-location", "#site-desc"],
    );
    [
      "#site-name",
      "#site-heritage-type",
      "#site-ownership",
      "#site-location",
      "#site-lat",
      "#site-lng",
      "#site-desc",
    ].forEach((selector) => {
      const field = $(selector);
      if (field) field.required = requiredFields.has(selector);
    });

    const nameLabel = $("#site-name-label");
    if (nameLabel) {
      nameLabel.textContent =
        cat === "natural" ? "Natural heritage name" : "Heritage name";
    }
    const heritageTypeInput = $("#site-heritage-type");
    if (heritageTypeInput) {
      if (cat === "intangible") {
        heritageTypeInput.value = "Intangible cultural heritage";
        heritageTypeInput.readOnly = true;
      } else if (cat === "natural") {
        heritageTypeInput.value = "Natural Heritage";
        heritageTypeInput.readOnly = true;
      } else if (cat === "built") {
        heritageTypeInput.value = "Built Heritage";
        heritageTypeInput.readOnly = true;
      } else {
        heritageTypeInput.readOnly = false;
        heritageTypeInput.value =
          heritageTypeInput.value &&
          heritageTypeInput.value !== "Intangible cultural heritage" &&
          heritageTypeInput.value !== "Natural Heritage" &&
          heritageTypeInput.value !== "Built Heritage"
            ? heritageTypeInput.value
            : "";
      }

      heritageTypeInput.placeholder =
        cat === "natural"
          ? "Natural Heritage"
          : cat === "intangible"
            ? "Intangible cultural heritage"
            : cat === "built"
              ? "Built Heritage"
              : "e.g. Monument, Sites/Park, Museum";
    }

    const siteId = $("#site-id")?.value?.trim();
    const catSelect = $("#site-category-select");
    if (catSelect && catSelect.tagName === "SELECT") {
      catSelect.disabled = Boolean(siteId);
    }

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

  function syncBuiltDeleteUi() {
    const isBuilt = isBuiltHeritageForm();
    const siteId = $("#site-id")?.value?.trim();
    const hasSavedSite =
      Boolean(siteId) && !MatiAdminStore.isDraftSiteId?.(siteId);
    const dangerZone = $("#site-danger-zone");
    if (dangerZone) dangerZone.hidden = !isBuilt || !hasSavedSite;
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

  function modelFilename(modelSrc) {
    if (!modelSrc) return "";
    const path = String(modelSrc).split(/[?#]/, 1)[0];
    const filename = path.slice(path.lastIndexOf("/") + 1);
    try {
      return decodeURIComponent(filename);
    } catch {
      return filename;
    }
  }

  async function isValidGlbFile(file) {
    if (
      !file ||
      !String(file.name || "").toLowerCase().endsWith(".glb") ||
      file.size < 12
    ) {
      return false;
    }

    const header = await file.slice(0, 12).arrayBuffer();
    const view = new DataView(header);
    return (
      view.getUint32(0, true) === 0x46546c67 &&
      view.getUint32(4, true) === 2 &&
      view.getUint32(8, true) === file.size
    );
  }

  async function removeStoredModelObject(siteId, modelSrc) {
    if (!modelSrc) return false;
    if (
      typeof MatiAdminUploads !== "undefined" &&
      MatiAdminUploads.isUploadUri?.(modelSrc)
    ) {
      await MatiAdminUploads.remove(modelSrc);
      return true;
    }
    if (
      typeof MatiSupabaseApi !== "undefined" &&
      typeof MatiSupabaseApi.removeSiteMediaObject === "function"
    ) {
      return MatiSupabaseApi.removeSiteMediaObject(siteId, "model3d", modelSrc);
    }
    return false;
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

    // Initialize percentage tracking if ModelViewerLoading is available
    if (typeof ModelViewerLoading !== "undefined") {
      ModelViewerLoading.initializeFullscreen(
        "fullscreen-model",
        "fullscreen-loading",
        "fullscreen-loading-label",
        "fullscreen-loading-percent",
        {
          loadingTextSelector: ".model-viewer-loading__text",
        },
      );
    }
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
    const barangay = $("#built-heritage-barangay")?.value || "all";
    let list = [...sites];

    if (barangay !== "all") {
      list = list.filter((site) => (site.location || "").includes(barangay));
    }
    list.sort((a, b) => a.name.localeCompare(b.name));

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

  function populateBuiltHeritageBarangayFilter(sites) {
    const select = $("#built-heritage-barangay");
    if (!select) return;
    const current = select.value || "all";
    const barangays = [
      ...new Set(
        sites
          .flatMap((site) => (site.location || "").split(","))
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b));
    select.innerHTML =
      `<option value="all">All barangays</option>` +
      barangays
        .map(
          (barangay) =>
            `<option value="${escapeAttr(barangay)}">${escapeHtml(barangay)}</option>`,
        )
        .join("");
    select.value = barangays.includes(current) ? current : "all";
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
    const modelSrc = getSiteModelSource(site);
    if (modelSrc) {
      const filename = modelFilename(modelSrc);

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
              <button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-manage-model="${escapeAttr(site.id)}">Manage</button>
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

  function renderVideoCard() {
    return `
      <div class="admin-model-card admin-model-card--empty" data-add-media-type="video" role="button" tabindex="0">
        <svg class="admin-model-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <rect x="3" y="5" width="13" height="14" rx="2" />
          <path d="m16 10 5-3v10l-5-3z" />
        </svg>
        <h5 class="admin-model-card__title">No Videos Available</h5>
        <p class="admin-model-card__desc">Drag & Drop your videos or click to browse your files.</p>
        <p class="admin-model-card__desc">Supports MP4, WebM, or MOV files.</p>
        <button type="button" class="admin-btn admin-btn--secondary admin-btn--sm" tabindex="-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="width:1.1em;height:1.1em;margin-right:0.4em;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload Videos
        </button>
      </div>
    `;
  }

  function renderAudioCard() {
    return `
      <div class="admin-model-card admin-model-card--empty" data-add-media-type="audio" role="button" tabindex="0">
        <svg class="admin-model-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M9 18V5l11-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="17" cy="16" r="3" />
        </svg>
        <h5 class="admin-model-card__title">No Audio Recordings Available</h5>
        <p class="admin-model-card__desc">Drag & Drop your audio recordings or click to browse your files.</p>
        <p class="admin-model-card__desc">Supports MP3, WAV, OGG, or M4A files.</p>
        <button type="button" class="admin-btn admin-btn--secondary admin-btn--sm" tabindex="-1">Upload Audio Recordings</button>
      </div>
    `;
  }

  function renderNaturalSiteMediaList(site, media, container) {
    const photos = media.filter((item) => item.type === "photo");
    const videos = media.filter((item) => item.type === "video");
    const photoContent = photos.length
      ? `<ul class="admin-media-list">${photos.map((item) => renderMediaListItem(item)).join("")}</ul>`
      : renderPhotoCard(site);
    const videoContent = videos.length
      ? `<ul class="admin-media-list">${videos.map((item) => renderMediaListItem(item)).join("")}</ul>`
      : renderVideoCard();

    container.innerHTML = `
      <div class="admin-media-groups">
        <section class="admin-media-group">
          <div class="admin-media-group__head"><h4 class="admin-media-group__title admin-media-group__title--photo">Photographs</h4></div>
          ${photoContent}
        </section>
        <section class="admin-media-group">
          <div class="admin-media-group__head"><h4 class="admin-media-group__title admin-media-group__title--video">Videos</h4></div>
          ${videoContent}
        </section>
      </div>`;
    bindModelCardDragDrop(container);
  }

  function renderIntangibleSiteMediaList(media, container) {
    const groups = [
      ["Photographs", "photo", renderPhotoCard({})],
      ["Videos", "video", renderVideoCard()],
      ["Audio Recordings", "audio", renderAudioCard()],
    ];
    container.innerHTML = `<div class="admin-media-groups">${groups
      .map(([title, type, empty]) => {
        const items = media.filter((item) => item.type === type);
        return `<section class="admin-media-group">
          <div class="admin-media-group__head"><h4 class="admin-media-group__title admin-media-group__title--${type === "audio" ? "video" : type}">${title}</h4></div>
          ${items.length ? `<ul class="admin-media-list">${items.map((item) => renderMediaListItem(item)).join("")}</ul>` : empty}
        </section>`;
      })
      .join("")}</div>`;
    bindModelCardDragDrop(container);
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
      const cover = site.cover;
      const isCoverMap =
        cover &&
        (cover.toLowerCase().includes("/map/") ||
          /map[._-]/.test(cover.toLowerCase()));
      const photoSources = [
        ...new Set(isCoverMap ? fromMedia : [cover, ...fromMedia]),
      ].filter(Boolean);
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

  function mediaTitleFromFile(file) {
    return String(file.name || "Media file").replace(/\.[^.]+$/i, "");
  }

  function mediaFileMatchesType(type, file) {
    const name = String(file?.name || "");
    if (type === "photo") {
      return (
        file?.type?.startsWith("image/") ||
        /\.(png|jpe?g|gif|webp|bmp|avif|tiff?)$/i.test(name)
      );
    }
    if (type === "video") {
      return (
        file?.type?.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(name)
      );
    }
    if (type === "audio") {
      return (
        file?.type?.startsWith("audio/") || /\.(mp3|wav|ogg|m4a)$/i.test(name)
      );
    }
    return false;
  }

  function getSelectedMediaFiles() {
    const fileInput = $("#media-file");
    return fileInput?.files ? [...fileInput.files] : [];
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
    const modelManager = $("#media-model-manager");
    const captionField = $("#media-caption-field");
    const mediaModal = $("#media-modal");
    const saveBtn = $("#btn-save-media");
    const modalDescription = $("#media-modal-description");
    const currentModelSection = $("#media-current-model-section");
    const currentModelPanel = $("#media-current-model");
    const currentModelName = $("#media-current-model-name");
    const removeModelButton = $("#btn-remove-model");
    const chooseModelButton = $("#btn-choose-model-file");
    const clearModelFileButton = $("#btn-clear-model-file");
    const selectedModelPanel = $("#media-selected-model");
    const selectedModelName = $("#media-selected-model-name");
    const selectedModelSize = $("#media-selected-model-size");
    const replaceModelNote = $("#media-model-replace-note");
    const currentModelSrc =
      activeType === "model3d" ? getSiteModelSource(site) : "";
    const hasCurrentModel = Boolean(currentModelSrc);
    const selectedModelFile =
      activeType === "model3d" && modelFileIsValid
        ? fileInput?.files?.[0]
        : null;

    const previewWrap = $("#media-file-preview-wrap");
    const previewImg = $("#media-file-preview");
    const titleInput = $("#media-title");
    const captionHint = $("#media-caption-hint");
    const selectedFiles =
      usesFile &&
      ["photo", "video", "audio"].includes(activeType)
        ? getSelectedMediaFiles()
        : [];
    const supportsBatchUpload =
      usesFile && ["photo", "video", "audio"].includes(activeType);
    const mediaUploadDropArea = $("#media-upload-drop-area");
    const chooseMediaFilesButton = $("#btn-choose-media-files");
    const mediaUploadInstruction = $("#media-upload-instruction");
    const mediaUploadFormat = $("#media-upload-format");
    const selectedFilesSummary = $("#media-selected-files");
    const mediaUploadConfig = {
      photo: {
        noun: "photographs",
        accept: "image/*",
        format: "Image files",
      },
      video: {
        noun: "videos",
        accept: "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov",
        format: "MP4, WebM, or MOV video files",
      },
      audio: {
        noun: "audio recordings",
        accept: "audio/mpeg,audio/wav,audio/ogg,audio/mp4,.mp3,.wav,.ogg,.m4a",
        format: "MP3, WAV, OGG, or M4A audio files",
      },
    }[activeType];

    if (mediaModal) {
      mediaModal.classList.toggle(
        "admin-modal--model-upload",
        activeType === "model3d",
      );
    }
    if (mediaUploadDropArea) {
      mediaUploadDropArea.hidden = !supportsBatchUpload;
    }
    if (mediaUploadInstruction && mediaUploadConfig) {
      mediaUploadInstruction.textContent =
        `Choose one or many ${mediaUploadConfig.noun}, or drag files here`;
    }
    if (chooseMediaFilesButton && mediaUploadConfig) {
      chooseMediaFilesButton.textContent = `Choose ${mediaUploadConfig.noun}`;
    }
    if (mediaUploadFormat && mediaUploadConfig) {
      mediaUploadFormat.textContent = mediaUploadConfig.format;
    }
    if (selectedFilesSummary) {
      selectedFilesSummary.hidden = selectedFiles.length === 0;
      selectedFilesSummary.textContent =
        selectedFiles.length === 1
          ? selectedFiles[0].name
          : selectedFiles.length > 1
            ? `${selectedFiles.length} ${mediaUploadConfig?.noun || "files"} selected: ${selectedFiles
                .slice(0, 3)
                .map((file) => file.name)
                .join(", ")}${selectedFiles.length > 3 ? `, and ${selectedFiles.length - 3} more` : ""}`
            : "";
    }
    if (modelManager) {
      modelManager.hidden = activeType !== "model3d";
    }
    if (modalDescription) {
      modalDescription.hidden = activeType !== "model3d";
      if (activeType === "model3d") {
        modalDescription.textContent =
          "Update the 3D model for this heritage landmark.";
      }
    }
    if (currentModelSection) {
      currentModelSection.hidden = !hasCurrentModel;
    }
    if (currentModelPanel) currentModelPanel.hidden = false;
    if (currentModelName) {
      currentModelName.textContent = modelFilename(currentModelSrc);
    }
    if (removeModelButton) {
      removeModelButton.hidden = !hasCurrentModel;
      removeModelButton.disabled =
        !hasCurrentModel ||
        modelFileValidationInProgress ||
        modelSubmitInProgress ||
        modelReplaceConfirmationInProgress ||
        modelUploadInProgress;
    }
    if (chooseModelButton) {
      chooseModelButton.disabled =
        modelFileValidationInProgress ||
        modelSubmitInProgress ||
        modelReplaceConfirmationInProgress ||
        modelUploadInProgress;
    }
    if (selectedModelPanel) {
      selectedModelPanel.hidden = !selectedModelFile;
    }
    if (selectedModelName) {
      selectedModelName.textContent = selectedModelFile?.name || "";
    }
    if (selectedModelSize) {
      selectedModelSize.textContent = selectedModelFile
        ? formatBytes(selectedModelFile.size)
        : "";
    }
    if (clearModelFileButton) {
      clearModelFileButton.disabled =
        modelFileValidationInProgress ||
        modelSubmitInProgress ||
        modelReplaceConfirmationInProgress ||
        modelUploadInProgress;
    }
    if (replaceModelNote) {
      replaceModelNote.hidden = !hasCurrentModel || !selectedModelFile;
    }

    if (fileField) fileField.hidden = !usesFile;
    if (urlField) {
      urlField.hidden = usesFile || (isEdit && activeType === "photo");
    }
    if (typeField) typeField.hidden = built || Boolean(mediaModalPresetType);
    if (titleField) {
      titleField.hidden =
        activeType === "map" ||
        activeType === "model3d" ||
        supportsBatchUpload;
    }
    if (titleInput) {
      titleInput.required = false;
      titleInput.removeAttribute("placeholder");
    }

    if (fileInput) {
      fileInput.hidden = activeType === "model3d" || supportsBatchUpload;
      if (activeType === "photo" || activeType === "map") {
        fileInput.accept = "image/*";
        fileInput.multiple = activeType === "photo";
      } else if (activeType === "model3d" && fileInput.id === "media-file") {
        fileInput.accept = ".glb,model/gltf-binary";
        fileInput.multiple = false;
      } else if (activeType === "video") {
        fileInput.accept = mediaUploadConfig.accept;
        fileInput.multiple = true;
      } else if (activeType === "audio") {
        fileInput.accept = mediaUploadConfig.accept;
        fileInput.multiple = true;
      }
      if (!usesFile) fileInput.value = "";
    }

    if (fileLabel) {
      fileLabel.hidden = activeType === "model3d" || supportsBatchUpload;
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
      if (supportsBatchUpload) {
        fileHint.textContent = "";
      } else if (activeType === "map") {
        fileHint.textContent =
          "Choose an image file or drag it into this area to upload a site map.";
      } else if (activeType === "model3d") {
        fileHint.textContent = "";
      }
    }

    if (captionField) {
      captionField.hidden =
        activeType === "model3d" ||
        activeType === "map" ||
        supportsBatchUpload;
    }
    if (saveBtn) {
      saveBtn.disabled =
        activeType === "model3d" &&
        (!selectedModelFile ||
          modelFileValidationInProgress ||
          modelSubmitInProgress ||
          modelReplaceConfirmationInProgress ||
          modelUploadInProgress);
      if (activeType !== "model3d") {
        saveBtn.textContent = "Save";
      } else if (modelUploadInProgress) {
        saveBtn.textContent = "Replacing…";
      } else if (modelReplaceConfirmationInProgress) {
        saveBtn.textContent = "Confirming…";
      } else if (modelSubmitInProgress) {
        saveBtn.textContent = "Checking…";
      } else {
        saveBtn.textContent = hasCurrentModel ? "Replace model" : "Upload model";
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

    if (view === "gallery" && prevView !== "gallery") {
      window.MatiGalleryEmbed?.resetToCollections();
    } else if (view !== "gallery") {
      delete document.documentElement.dataset.galleryCategory;
    }

    if (view === "dashboard") {
      if (options.skipDashboardRefresh) void renderDashboard();
      else void refreshDashboardFromSupabase();
    }
    if (view === "location") renderLocation();
    if (view === "heritage") {
      renderHeritage();
    } else {
      teardownBuiltHeritageGrid();
    }
    if (view === "leaderboard") {
      ensureLeaderboardLive();
      void renderLeaderboard({ force: true });
    }
    if (view === "settings") syncSettings();
  }

  function syncSettings() {
    const session =
      typeof MatiAuth !== "undefined" ? MatiAuth.getSession?.() || {} : {};
    const name = $("#admin-settings-name");
    const email = $("#admin-settings-email");
    const role = $("#admin-settings-role");

    if (name) name.textContent = session.username || "Administrator";
    if (email) email.textContent = session.email || "Not available";
    if (role) role.textContent = session.role || "Administrator";
    syncAdminProfile(session);
  }

  function syncAdminProfile(session = {}) {
    const name = session.username || session.email || "matiadmin";
    const nameEl = $("[data-admin-profile-name]");
    const signedInEl = $("[data-admin-profile-signed-in]");
    const emailEl = $("[data-admin-profile-email]");
    if (nameEl) nameEl.textContent = name;
    if (signedInEl) signedInEl.textContent = name;
    if (emailEl) {
      emailEl.textContent =
        session.email || "matiheritage.admin@cityofmati.gov.ph";
    }
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
    document.querySelectorAll("[data-admin-profile-avatar-fallback]").forEach(
      (fallback) => {
        fallback.textContent = initials;
      },
    );
    document.querySelectorAll("[data-admin-profile-image]").forEach((image) => {
      const fallback = image.parentElement.querySelector(
        "[data-admin-profile-avatar-fallback]",
      );
      const avatarUrl = session.avatarUrl;
      const showFallback = () => {
        image.hidden = true;
        fallback.hidden = false;
      };

      image.onerror = showFallback;
      if (avatarUrl) {
        image.alt = `${name} profile picture`;
        image.src = avatarUrl;
        image.hidden = false;
        fallback.hidden = true;
      } else {
        image.removeAttribute("src");
        showFallback();
      }
    });
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
    updateCoordinatePreviews();
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
      if (!isWithinMatiCity(lat, lng)) {
        showToast("Choose a location within Mati City.");
        return;
      }
      if ($("#site-lat")) $("#site-lat").value = lat.toFixed(6);
      if ($("#site-lng")) $("#site-lng").value = lng.toFixed(6);
      updateCoordinatePreviews();
    }, current);
  }

  function pointInRing(lat, lng, ring) {
    let inside = false;
    for (
      let index = 0, previous = ring.length - 1;
      index < ring.length;
      previous = index++
    ) {
      const [previousLat, previousLng] = ring[previous];
      const [currentLat, currentLng] = ring[index];
      const intersects =
        currentLng > lng !== previousLng > lng &&
        lat <
          ((previousLat - currentLat) * (lng - currentLng)) /
            (previousLng - currentLng) +
            currentLat;
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function isWithinMatiCity(lat, lng) {
    const latitude = Number(lat);
    const longitude = Number(lng);
    const geojson = window.MATI_CITY_GEOJSON;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !geojson) {
      return false;
    }

    const polygons =
      geojson.type === "Polygon"
        ? [geojson.coordinates]
        : geojson.type === "MultiPolygon"
          ? geojson.coordinates
          : [];

    return polygons.some((polygon) => {
      const [outerRing, ...holes] = polygon;
      const toLatLng = ([ringLng, ringLat]) => [ringLat, ringLng];
      return (
        pointInRing(latitude, longitude, outerRing.map(toLatLng)) &&
        !holes.some((hole) =>
          pointInRing(latitude, longitude, hole.map(toLatLng)),
        )
      );
    });
  }

  function formatCoordinateDms(value, isLatitude) {
    const rawValue = String(value ?? "").trim();
    if (!rawValue) return "";
    const coordinate = Number(rawValue);
    if (!Number.isFinite(coordinate)) return "";

    const absolute = Math.abs(coordinate);
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = ((minutesFloat - minutes) * 60)
      .toFixed(4)
      .replace(/\.?0+$/, "");
    const hemisphere = isLatitude
      ? coordinate < 0
        ? "S"
        : "N"
      : coordinate < 0
        ? "W"
        : "E";

    return `${degrees}\u00b0 ${minutes}' ${seconds}'' ${hemisphere}`;
  }

  function updateCoordinatePreviews() {
    const latitudePreview = $("#site-lat-dms");
    const longitudePreview = $("#site-lng-dms");
    const latitude = formatCoordinateDms($("#site-lat")?.value, true);
    const longitude = formatCoordinateDms($("#site-lng")?.value, false);

    if (latitudePreview) {
      latitudePreview.textContent = latitude ? `DMS: ${latitude}` : "";
    }
    if (longitudePreview) {
      longitudePreview.textContent = longitude ? `DMS: ${longitude}` : "";
    }
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
    await renderDashboard();
  }

  function syncDashboardReadyState(loading) {
    const dashboardShell = $("#dashboard-shell");
    if (!dashboardShell) return;
    dashboardShell.classList.toggle("is-loading", loading);
    dashboardShell.classList.toggle("is-ready", !loading);
    dashboardShell.setAttribute("aria-busy", String(loading));
  }

  function removeUnusedDashboardSections() {
    ["kpi-heading", "analytics-heading"].forEach(
      (headingId) => {
        document.getElementById(headingId)?.closest(".dashboard-section")?.remove();
      },
    );
  }

  function renderDashboard() {
    const dashboardShell = $("#dashboard-shell");
    const isFirstDashboardLoad =
      dashboardShell && !dashboardShell.dataset.dashboardInitialized;
    if (isFirstDashboardLoad) {
      syncDashboardReadyState(true);
    }

    try {
      const collections = MatiAdminStore.getDashboardCollectionSummary();
      const heritageCards = $("#dashboard-heritage-cards");
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
          .map((collection) => {
            const bgImages = {
              built:
                "assets/data/Built Heritage/Centennial Clock and Pathway of Leaders/Photographs/New/1000068051.jpg",
              intangible:
                "assets/data/Intangible Cultural Heritage/Sambuokan Festival/Photographs/0M8A2672.JPG",
              natural:
                "assets/data/Natural Heritage/Taytay Daga (Sleeping Dinosaur)/Photographs/DJI_0771.jpg",
            };
            const bgImage = bgImages[collection.key] || "";
            return `
        <article class="stat-card stat-card--${collection.key}">
          <div class="stat-card__bg-image" style="background-image: url('${bgImage}');"></div>
          <div class="stat-card__content">
            <p class="stat-card__label">${escapeHtml(collection.label)}</p>
            <p class="stat-card__value">${collection.sites}</p>
          </div>
        </article>`;
          })
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
    } finally {
      if (dashboardShell && !dashboardShell.dataset.dashboardInitialized) {
        dashboardShell.dataset.dashboardInitialized = "true";
      }
      if (dashboardShell) {
        syncDashboardReadyState(false);
      }
    }
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
      populateBuiltHeritageBarangayFilter(allBuilt);
      const sites = filterAndSortBuiltSites(allBuilt);
      builtHeritagePage = Math.max(1, builtHeritagePage);
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

    const totalPages = Math.max(
      1,
      Math.ceil(sites.length / BUILT_HERITAGE_PAGE_SIZE),
    );
    builtHeritagePage = Math.min(builtHeritagePage, totalPages);
    const start = (builtHeritagePage - 1) * BUILT_HERITAGE_PAGE_SIZE;
    const pageSites = sites.slice(start, start + BUILT_HERITAGE_PAGE_SIZE);
    if (!pageSites.length) {
      grid.innerHTML =
        '<div class="admin-built__empty">No built heritage records match the current filters.</div>';
    } else {
      grid.innerHTML = `
        <div class="admin-built__table-scroll">
          <table class="admin-built__table">
            <thead>
              <tr>
                <th>Heritage Site Name</th>
                <th>Barangay</th>
                <th>Category</th>
                <th>3D Model Status</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${pageSites
                .map((site) => {
                  const updated = site.updatedAt
                    ? new Date(site.updatedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—";
                  const uploaded = builtSiteHas3d(site);
                  return `
                    <tr>
                      <td><strong>${escapeHtml(site.name)}</strong></td>
                      <td>${escapeHtml(site.location || "—")}</td>
                      <td>${escapeHtml(site.heritageCategory || "—")}</td>
                      <td><span class="admin-built__status ${uploaded ? "is-uploaded" : "is-missing"}">${uploaded ? "Uploaded" : "Not Uploaded"}</span></td>
                      <td>${updated}</td>
                      <td>
                        <button type="button" class="admin-btn admin-btn--primary admin-btn--sm" data-edit-site="${escapeAttr(site.id)}">Manage</button>
                      </td>
                    </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>`;
    }
    const pagination = $("#heritage-built-pagination");
    if (pagination) {
      const first = sites.length ? start + 1 : 0;
      const last = Math.min(start + BUILT_HERITAGE_PAGE_SIZE, sites.length);
      pagination.innerHTML = `
        <span>Showing ${first}–${last} of ${sites.length}</span>
        <div>
          <button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-built-page="${builtHeritagePage - 1}" ${builtHeritagePage <= 1 ? "disabled" : ""}>Previous</button>
          <span>Page ${sites.length ? builtHeritagePage : 0} of ${sites.length ? totalPages : 0}</span>
          <button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-built-page="${builtHeritagePage + 1}" ${builtHeritagePage >= totalPages ? "disabled" : ""}>Next</button>
        </div>`;
    }
    return;

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
            <button type="button" class="admin-btn admin-btn--primary" data-add-built-site>Add Built heritage</button>
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
    if (view === "dashboard") void renderDashboard();
    if (view === "heritage") renderHeritage();
    if (view === "location" && typeof MatiAdminMap !== "undefined") {
      void MatiAdminMap.refresh?.();
    }
    if (view === "gallery") {
      window.MatiGalleryEmbed?.refresh?.();
    }
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
      if (view === "dashboard") void renderDashboard();
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
              onerror="this.src='data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 36 36%22 fill=%22%23ccc%22%3E%3Cpath d=%22M18 18c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm0 4c-5.33 0-16 2.67-16 8v2h32v-2c0-5.33-10.67-8-16-8z%22/%3E%3C/svg%3E'"
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
              onerror="this.src='data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 36 36%22 fill=%22%23ccc%22%3E%3Cpath d=%22M18 18c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm0 4c-5.33 0-16 2.67-16 8v2h32v-2c0-5.33-10.67-8-16-8z%22/%3E%3C/svg%3E'"
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
        const tempSite = {
          id: null,
          category: "built",
          cover: null,
          modelSrc: null,
        };
        renderBuiltSiteMediaList(tempSite, [], list);
      } else if (category === "natural") {
        renderNaturalSiteMediaList({ category }, [], list);
      } else if (category === "intangible") {
        renderIntangibleSiteMediaList([], list);
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

    if (site?.category === "natural") {
      renderNaturalSiteMediaList(site, media, list);
      return;
    }

    if (site?.category === "intangible") {
      renderIntangibleSiteMediaList(media, list);
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
    const retryButton = $("#btn-retry-site");
    if (retryButton) retryButton.hidden = true;

    if (isNew) {
      $("#site-id").value = "";
      $("#site-name").value = "";
      syncSiteCategoryValue(currentCategory);
      $("#site-heritage-type").value =
        currentCategory === "intangible"
          ? "Intangible cultural heritage"
          : currentCategory === "natural"
            ? "Natural Heritage"
            : currentCategory === "built"
              ? "Built Heritage"
              : "";
      $("#site-ownership").value = "";
      $("#site-location").value = "";
      $("#site-category-select").value =
        currentCategory === "intangible"
          ? ""
          : $("#site-category-select").value || "";
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
      $("#site-heritage-type").value =
        site.category === "built"
          ? "Built Heritage"
          : site.category === "natural"
            ? "Natural Heritage"
            : site.category === "intangible"
              ? "Intangible cultural heritage"
              : site.heritageCategory || "";
      $("#site-category-select").value =
        site.category === "built"
          ? site.heritageCategory || ""
          : $("#site-category-select").value || "";
      $("#site-ownership").value = site.ownership || "";
      $("#site-location").value = site.location || "";
      $("#site-lat").value =
        site.category === "intangible" ? "" : (coords?.lat ?? "");
      $("#site-lng").value =
        site.category === "intangible" ? "" : (coords?.lng ?? "");
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
    modelFileValidationId += 1;
    modelFileIsValid = false;
    modelFileValidationInProgress = false;
    modelSubmitInProgress = false;
    modelReplaceConfirmationInProgress = false;
    modelUploadInProgress = false;
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
      ? presetType === "model3d" && getSiteModelSource(site)
        ? "Manage 3D Model"
        : builtSite && presetType
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
    updateMediaFormUi();

    requestAnimationFrame(() => {
      if (presetType === "model3d") {
        $("#btn-choose-model-file")?.focus();
      } else if (builtSite && isNew) {
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
    const classificationValue = $("#site-category-select")?.value.trim() || "";
    const latValue = category === "intangible" ? "" : $("#site-lat").value;
    const lngValue = category === "intangible" ? "" : $("#site-lng").value;

    if (!draft && !name && MatiAdminStore.isDraftSiteId(siteId)) {
      return null;
    }

    const fixedHeritageType =
      category === "natural"
        ? "Natural Heritage"
        : category === "intangible"
          ? "Intangible cultural heritage"
          : category === "built"
            ? "Built Heritage"
            : $("#site-heritage-type").value.trim();

    return MatiAdminStore.saveSite({
      id: siteId,
      name: displayName,
      category,
      categoryLabel: MatiAdminStore.categoryLabel(category),
      heritageCategory:
        category === "built"
          ? classificationValue || existing?.heritageCategory || ""
          : category === "natural" || category === "intangible"
            ? fixedHeritageType
            : existing?.heritageCategory || "",
      ownership:
        category === "built"
          ? $("#site-ownership").value.trim()
          : existing?.ownership || "",
      location: $("#site-location").value,
      lat: latValue,
      lng: lngValue,
      cover: existing?.cover || "",
      modelSrc: categoryShows3d(category) ? existing?.modelSrc || "" : "",
      description: $("#site-desc").value,
    });
  }

  function refreshSiteViews(siteId) {
    renderSiteMediaList(siteId);
    renderHeritage();
    void renderDashboard();
    renderLocation();
    window.MatiGalleryEmbed?.refresh?.();

    // Force map data refresh to include newly added sites
    if (typeof getHeritageMapDisplaySites === "function") {
      try {
        const latestSites = getHeritageMapDisplaySites();
        if (latestSites && latestSites.length > 0) {
          window.HERITAGE_SITES = latestSites;
        }
      } catch (error) {
        console.warn("Failed to update heritage sites:", error);
      }
    }
  }

  async function saveSiteForm(e) {
    e.preventDefault();
    const name = $("#site-name").value.trim();
    const category = $("#site-category")?.value || currentCategory;
    const requiredFields = [
      ["#site-name", "heritage name"],
      ...(category === "built"
        ? [
            ["#site-heritage-type", "heritage type"],
            ["#site-ownership", "ownership"],
          ]
        : []),
      ...(category === "natural" || category === "intangible"
        ? [["#site-heritage-type", "heritage type"]]
        : []),
      ["#site-location", "location"],
      ...(category === "built" || category === "natural"
        ? [
            ["#site-lat", "latitude"],
            ["#site-lng", "longitude"],
          ]
        : []),
      ["#site-desc", "description"],
    ];
    const missingField = requiredFields.find(
      ([selector]) => !$(selector)?.value?.trim(),
    );
    if (missingField) {
      showToast(`Enter the ${missingField[1]} before saving.`);
      $(missingField[0])?.focus();
      return;
    }

    if (
      (category === "built" || category === "natural") &&
      !isWithinMatiCity($("#site-lat").value, $("#site-lng").value)
    ) {
      showToast("Heritage sites must be located within Mati City.");
      $("#site-lat")?.focus();
      return;
    }

    const startTime = Date.now();
    const isNewSite =
      !$("#site-id")?.value?.trim() ||
      MatiAdminStore.isDraftSiteId($("#site-id").value.trim());

    // Show update modal
    const progressTitle = isNewSite ? "Adding site…" : "Updating site…";
    showUpdateModal(progressTitle);

    try {
      let siteId = $("#site-id").value.trim();
      const wasDraft = MatiAdminStore.isDraftSiteId(siteId);
      const nextId = MatiAdminStore.slugId(name);

      if (wasDraft && siteId !== nextId) {
        siteId = nextId;
        $("#site-id").value = nextId;
      }

      const site = await persistSiteFromForm({ requireName: true, siteId });
      if (!site) throw new Error("Could not save site.");

      if (!syncOk(site)) {
        hideUpdateModal();
        const retryButton = $("#btn-retry-site");
        if (retryButton) retryButton.hidden = false;
        showToast(syncFailedMessage(site, "Could not save site to Supabase."));
        return site;
      }

      const retryButton = $("#btn-retry-site");
      if (retryButton) retryButton.hidden = true;
      editingSiteId = site.id;
      $("#site-id").value = site.id;
      if (currentView === "heritage") {
        setView("heritage", { category: site.category });
      }
      refreshSiteViews(site.id);
      syncSiteFormSubmitLabel(site.id);

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
            siteModal.style.transition =
              "opacity 0.3s ease, transform 0.3s ease";
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
              syncSiteFormSubmitLabel("");
            }, 300);
          }
        }, 1000);
      }, remainingDelay);

      return site;
    } catch (error) {
      hideUpdateModal();
      const retryButton = $("#btn-retry-site");
      if (retryButton) retryButton.hidden = false;
      showToast(error?.message || "Could not save site.");
    }
  }

  function showUpdateModal(message) {
    let modal = $("#updateModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "updateModal";
      modal.className = "admin-modal admin-save-modal";
      modal.innerHTML = `
        <div class="admin-save-modal__backdrop"></div>
        <div class="admin-save-modal__content">
          <div id="updateModalIcon" class="admin-save-modal__icon" aria-hidden="true"></div>
          <div id="updateModalMessage" class="admin-save-modal__message"></div>
          <div id="updateModalSubtext" class="admin-save-modal__subtext"></div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const messageEl = $("#updateModalMessage");
    const iconEl = $("#updateModalIcon");
    const subtextEl = $("#updateModalSubtext");

    if (messageEl) {
      messageEl.textContent =
        message === "SUCCESS" ? "Saved successfully" : message;
    }

    if (iconEl && subtextEl) {
      if (message === "SUCCESS") {
        iconEl.textContent = "";
        iconEl.classList.remove("is-loading");
        iconEl.classList.add("is-success");
        subtextEl.textContent = "Changes saved successfully";
      } else {
        iconEl.textContent = "";
        iconEl.classList.remove("is-success");
        iconEl.classList.add("is-loading");
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
        modal.className = "admin-modal admin-remove-modal";
        modal.innerHTML = `
          <div class="admin-remove-modal__content">
            <div class="admin-remove-modal__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <div class="admin-remove-modal__copy">
              <h3 class="admin-remove-modal__title">Remove Heritage Site</h3>
              <p class="admin-remove-modal__message">
                Are you sure you want to remove <strong id="removeSiteName"></strong>?
              </p>
              <p class="admin-remove-modal__note">This action cannot be undone.</p>
            </div>
            <div class="admin-remove-modal__actions">
              <button type="button" id="btn-keep-site" class="admin-btn admin-btn--ghost">
                No, Keep it
              </button>
              <button type="button" id="btn-confirm-remove" class="admin-btn admin-btn--danger">
                Yes, Remove it
              </button>
            </div>
          </div>
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

  async function removeSiteFromGallery(siteId) {
    const site = MatiAdminStore.getSiteById(siteId);
    if (!site) return false;

    const confirmed = await showRemoveConfirmation(site.name);
    if (!confirmed) return false;

    try {
      const result = await runSiteRemovalStatus(site.name, () =>
        MatiAdminStore.deleteSite(siteId),
      );
      if (!result?.ok) {
        showToast("Could not remove the heritage record from Supabase.");
        return false;
      }
      renderHeritage();
      void renderDashboard();
      renderLocation();
      window.MatiGalleryEmbed?.refresh?.();
      return true;
    } catch (error) {
      showToast(error?.message || "Could not remove the heritage record.");
      return false;
    }
  }

  async function runSiteRemovalStatus(siteName, task) {
    let modal = $("#site-removal-status-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "site-removal-status-modal";
      modal.className = "admin-modal admin-site-removal-modal";
      modal.innerHTML = `
        <div class="admin-site-removal-modal__dialog" role="status" aria-live="polite">
          <div class="admin-site-removal-modal__icon" data-removal-icon aria-hidden="true"></div>
          <h3 class="admin-site-removal-modal__title" data-removal-title>Removing heritage</h3>
          <p class="admin-site-removal-modal__name" data-removal-name></p>
          <p class="admin-site-removal-modal__detail" data-removal-detail>Removing from Supabase...</p>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const icon = modal.querySelector("[data-removal-icon]");
    const title = modal.querySelector("[data-removal-title]");
    const name = modal.querySelector("[data-removal-name]");
    const detail = modal.querySelector("[data-removal-detail]");
    icon.className = "admin-site-removal-modal__icon is-loading";
    title.textContent = "Removing heritage";
    name.textContent = siteName;
    detail.textContent = "Removing from Supabase...";
    modal.hidden = false;
    modal.classList.add("active");
    document.body.style.overflow = "hidden";

    try {
      const result = await task();
      if (!result?.ok) return result;
      icon.className = "admin-site-removal-modal__icon is-success";
      title.textContent = "Removal complete";
      detail.textContent = "The heritage record was removed successfully.";
      await new Promise((resolve) => setTimeout(resolve, 700));
      return result;
    } finally {
      modal.hidden = true;
      modal.classList.remove("active");
      document.body.style.overflow = "";
      document.body.style.overflowY = "auto";
    }
  }

  async function uploadSiteModelFile({
    siteId,
    site,
    file,
    signal,
    setProgress,
  }) {
    const fileMeta = {
      fileName: file.name,
      totalBytes: file.size,
      startedAt: Date.now(),
    };

    setProgress(0, "Preparing file...", {
      ...fileMeta,
      loadedBytes: 0,
    });

    const modelSrc = await MatiAdminUploads.put(`${siteId}/model`, file, {
      type: "model3d",
      siteId,
      onProgress: (pct, loadedBytes) => {
        const actualLoaded =
          Number.isFinite(loadedBytes)
            ? loadedBytes
            : Math.round((pct / 100) * file.size);
        const uploadComplete = pct >= 100;
        setProgress(
          pct,
          uploadComplete ? "Finalizing upload..." : "Uploading model...",
          {
            fileName: fileMeta.fileName,
            totalBytes: fileMeta.totalBytes,
            startedAt: fileMeta.startedAt,
            loadedBytes: actualLoaded,
          },
        );
      },
      signal,
    });

    setProgress(100, "Finalizing upload...", {
      fileName: fileMeta.fileName,
      totalBytes: fileMeta.totalBytes,
      startedAt: fileMeta.startedAt,
      loadedBytes: file.size,
    });
    return modelSrc;
  }

  async function removeCurrentModel() {
    if (
      modelFileValidationInProgress ||
      modelSubmitInProgress ||
      modelReplaceConfirmationInProgress ||
      modelUploadInProgress
    ) {
      return;
    }
    const siteId = $("#media-site-id")?.value || editingSiteId;
    const site = siteId ? MatiAdminStore.getSiteById(siteId) : null;
    const modelSrc = getSiteModelSource(site);
    if (!site || !modelSrc) {
      showToast("Could not find the 3D model to remove.");
      return;
    }

    const confirmed = await confirmAction({
      title: "Remove 3D model?",
      message: `Remove the 3D model from ${site.name}? Visitors will no longer be able to preview it.`,
      confirmLabel: "Remove model",
      variant: "large",
    });
    if (!confirmed) return;

    const removeButton = $("#btn-remove-model");
    const saveButton = $("#btn-save-media");
    if (removeButton) removeButton.disabled = true;
    if (saveButton) saveButton.disabled = true;

    try {
      const savedSite = await MatiAdminStore.saveSite({
        ...site,
        modelSrc: "",
      });
      if (!syncOk(savedSite)) {
        showToast(
          syncFailedMessage(savedSite, "Could not remove the 3D model."),
        );
        return;
      }

      const legacyModel = MatiAdminStore.getSiteMedia(siteId).find(
        (item) => item.type === "model3d",
      );
      let storageCleanupFailed = false;
      if (legacyModel) {
        try {
          await MatiAdminStore.deleteMedia(legacyModel.id);
        } catch (error) {
          storageCleanupFailed = true;
          console.error("Could not remove legacy 3D model record:", error);
        }
      }

      try {
        await removeStoredModelObject(siteId, modelSrc);
      } catch (error) {
        storageCleanupFailed = true;
        console.error("Could not remove stored 3D model file:", error);
      }

      closeMediaModal();
      refreshSiteViews(siteId);
      if ($("#site-modal") && !$("#site-modal").hidden) {
        syncSiteFormSubmitLabel(siteId);
      }
      showToast(storageCleanupFailed
        ? "Model removed from the heritage record, but its old record or stored file could not be deleted."
        : "3D model removed.");
    } catch (error) {
      console.error("Could not remove 3D model:", error);
      showToast(error?.message || "Could not remove the 3D model.");
    } finally {
      if (removeButton) removeButton.disabled = false;
      if (saveButton) updateMediaFormUi();
    }
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
    if (
      type === "model3d" &&
      (modelUploadInProgress ||
        modelFileValidationInProgress ||
        modelSubmitInProgress ||
        modelReplaceConfirmationInProgress)
    ) {
      return;
    }
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
      if (type === "model3d") {
        modelSubmitInProgress = true;
        updateMediaFormUi();
        let valid = false;
        let validationFailed = false;
        try {
          valid = modelFileIsValid && (await isValidGlbFile(files[0]));
        } catch (error) {
          validationFailed = true;
          console.error("Could not validate 3D model file:", error);
        }
        if (!valid) {
          modelSubmitInProgress = false;
          modelFileIsValid = false;
          updateMediaFormUi();
          showToast(
            validationFailed
              ? "Could not validate the selected GLB file."
              : "Choose a valid GLB 2.0 model file.",
          );
          return;
        }
      }
      if (type === "model3d" && getSiteModelSource(site)) {
        modelReplaceConfirmationInProgress = true;
        updateMediaFormUi();
        let confirmed = false;
        try {
          confirmed = await confirmAction({
            title: "Replace 3D model?",
            message: `Replace the current 3D model for ${site.name} with the selected file?`,
            confirmLabel: "Replace model",
          });
        } catch (error) {
          console.error("Could not confirm 3D model replacement:", error);
          modelSubmitInProgress = false;
          showToast("Could not confirm the model replacement.");
          return;
        } finally {
          modelReplaceConfirmationInProgress = false;
          updateMediaFormUi();
        }
        if (!confirmed) {
          modelSubmitInProgress = false;
          updateMediaFormUi();
          return;
        }
      }

      try {
        if (typeof MatiAdminUploads === "undefined") {
          modelSubmitInProgress = false;
          updateMediaFormUi();
          showToast("Uploads are not available.");
          return;
        }

        const typeTitle =
          type === "model3d"
            ? "Uploading 3D model"
            : files.length > 1 && ["photo", "video", "audio"].includes(type)
            ? `Uploading ${
                type === "photo"
                  ? "photographs"
                  : type === "video"
                    ? "videos"
                    : "audio recordings"
              }…`
              : `Uploading ${TYPE_LABELS[type] || "file"}…`;

        if (type === "model3d") {
          modelSubmitInProgress = false;
          modelUploadInProgress = true;
          updateMediaFormUi();
        }
        activeUploadController = new AbortController();

        await withUploadProgress(
          async ({ setProgress, hideProgress }) => {
            if (type === "map") {
              const fileMeta = {
                fileName: files[0].name,
                totalBytes: files[0].size,
                startedAt: Date.now(),
              };
              setUploadProgress(5, `Uploading map: ${files[0].name}`, fileMeta);
              const cover = await MatiAdminUploads.put(
                `${siteId}/map`,
                files[0],
                {
                  type: "map",
                  siteId,
                  onProgress: (pct, loadedBytes) => {
                    const actualLoaded =
                      loadedBytes || Math.round((pct / 100) * files[0].size);
                    setUploadProgress(
                      Math.round(pct * 0.85),
                      `Uploading map: ${files[0].name}`,
                      {
                        fileName: fileMeta.fileName,
                        totalBytes: fileMeta.totalBytes,
                        startedAt: fileMeta.startedAt,
                        loadedBytes: actualLoaded,
                      },
                    );
                  },
                  signal: activeUploadController.signal,
                },
              );
              if (activeUploadController.signal.aborted) return;
              setUploadProgress(90, "Saving map to database…", {
                fileName: fileMeta.fileName,
                totalBytes: fileMeta.totalBytes,
                startedAt: fileMeta.startedAt,
                loadedBytes: files[0].size,
              });
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
              const previousModelSrc = getSiteModelSource(site);
              const fileMeta = {
                fileName: files[0].name,
                totalBytes: files[0].size,
                startedAt: Date.now(),
              };

              const modelSrc = await uploadSiteModelFile({
                siteId,
                site,
                file: files[0],
                signal: activeUploadController.signal,
                setProgress,
              });

              if (activeUploadController.signal.aborted) return;
              setUploadProgress(100, "Finalizing upload...", {
                fileName: fileMeta.fileName,
                totalBytes: fileMeta.totalBytes,
                startedAt: fileMeta.startedAt,
                loadedBytes: files[0].size,
              });
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
                let cleanupFailed = false;
                if (previousModelSrc && previousModelSrc !== modelSrc) {
                  try {
                    await removeStoredModelObject(siteId, previousModelSrc);
                  } catch (error) {
                    cleanupFailed = true;
                    console.error(
                      "Could not remove replaced 3D model file:",
                      error,
                    );
                  }
                }
                showToast(
                  cleanupFailed
                    ? "3D model replaced, but the previous file could not be deleted."
                    : "3D model uploaded to database.",
                );
              }
            } else if (
              type === "photo" ||
              type === "video" ||
              type === "audio"
            ) {
              const mediaFiles = files.filter((file) =>
                mediaFileMatchesType(type, file),
              );
              if (!mediaFiles.length || mediaFiles.length !== files.length) {
                throw new Error(
                  `Choose valid ${type === "photo" ? "image" : type} files to upload.`,
                );
              }

              const singular = TYPE_LABELS[type] || "File";
              const plural =
                type === "photo"
                  ? "Photographs"
                  : type === "video"
                    ? "Videos"
                    : "Audio recordings";
              const folder =
                type === "photo"
                  ? "photos"
                  : type === "video"
                    ? "videos"
                    : "audio";
              const uploadedIds = [];
              const totalBytes = mediaFiles.reduce(
                (sum, file) => sum + file.size,
                0,
              );
              let uploadedBytes = 0;
              let lastSaved = null;

              for (const [i, file] of mediaFiles.entries()) {
                const fileMeta = {
                  fileName:
                    mediaFiles.length > 1
                      ? `${file.name} (${i + 1}/${mediaFiles.length})`
                      : file.name,
                  totalBytes,
                  startedAt: Date.now(),
                };
                const key = `${siteId}/${folder}/${MatiAdminStore.slugId(file.name)}-${Date.now()}-${i}`;
                const src = await MatiAdminUploads.put(key, file, {
                  type,
                  siteId,
                  onProgress: (pct, loadedBytes) => {
                    const currentFileLoaded =
                      loadedBytes ?? Math.round((pct / 100) * file.size);
                    setUploadProgress(
                      totalBytes
                        ? ((uploadedBytes + currentFileLoaded) / totalBytes) *
                            100
                        : 100,
                      `Uploading ${singular.toLowerCase()} ${i + 1} of ${mediaFiles.length}…`,
                      {
                        fileName: fileMeta.fileName,
                        totalBytes,
                        startedAt: fileMeta.startedAt,
                        loadedBytes: uploadedBytes + currentFileLoaded,
                      },
                    );
                  },
                  signal: activeUploadController.signal,
                });

                if (activeUploadController.signal.aborted) return;
                setUploadProgress(
                  totalBytes
                    ? ((uploadedBytes + file.size) / totalBytes) * 100
                    : 100,
                  `Saving ${singular.toLowerCase()} ${i + 1} of ${mediaFiles.length}…`,
                  {
                    fileName: fileMeta.fileName,
                    totalBytes,
                    startedAt: fileMeta.startedAt,
                    loadedBytes: uploadedBytes + file.size,
                  },
                );
                const saved = await MatiAdminStore.saveMedia({
                  siteId,
                  type,
                  title: mediaTitleFromFile(file),
                  src,
                  caption: "",
                });
                if (!saved) {
                  throw new Error(`Could not save ${singular.toLowerCase()}.`);
                }
                uploadedBytes += file.size;
                lastSaved = saved;
                uploadedIds.push(saved.id);
              }

              if (uploadedIds.length > 1) {
                const ordered = MatiAdminStore.getOrderedSiteMedia(
                  siteId,
                  type,
                ).map((item) => item.id);
                const rest = ordered.filter((id) => !uploadedIds.includes(id));
                MatiAdminStore.reorderSiteMedia(siteId, type, [
                  ...uploadedIds,
                  ...rest,
                ]);
              }
              if (lastSaved && !syncOk(lastSaved)) {
                showToast(
                  syncFailedMessage(
                    lastSaved,
                    `${plural} saved locally only.`,
                  ),
                );
              } else {
                showToast(
                  `${plural} uploaded to database.`,
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
      } finally {
        if (type === "model3d") {
          modelSubmitInProgress = false;
          modelUploadInProgress = false;
          updateMediaFormUi();
        }
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
    let sealLogo = reportAssetUrl(
      "assets/logos/Flag_of_Mati,_Davao_Oriental.png",
    );
    let tourismLogo = reportAssetUrl(
      "assets/logos/City of Mati Tourism and Promotions Office.png",
    );

    try {
      [sealLogo, tourismLogo] = await Promise.all([
        fetchReportImageDataUrl(
          "assets/logos/Flag_of_Mati,_Davao_Oriental.png",
        ),
        fetchReportImageDataUrl(
          "assets/logos/City of Mati Tourism and Promotions Office.png",
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

  const REPORT_CATEGORIES = [
    { key: "built", label: "Built Heritage" },
    { key: "intangible", label: "Intangible Cultural Heritage" },
    { key: "natural", label: "Natural Heritage" },
    { key: "users", label: "Registered Users" },
    { key: "leaderboard", label: "Leaderboard Records" },
  ];

  let generatedReport = null;
  let reportHeritageChart = null;
  let reportUsersChart = null;

  async function fetchReportData() {
    if (
      typeof MatiAdminAuth?.isAdmin !== "function" ||
      !(await MatiAdminAuth.isAdmin())
    ) {
      throw new Error("Only authorized City Tourism Office personnel can generate reports.");
    }

    const catalogRefresh = await MatiAdminStore.initFromSupabase();
    if (!catalogRefresh?.ok) {
      throw new Error(
        catalogRefresh?.error?.message ||
          "Could not refresh heritage records from the database.",
      );
    }

    const [builtRows, intangibleRows, naturalRows] = await Promise.all([
      MatiAdminStore.heritageReportRows("built"),
      MatiAdminStore.heritageReportRows("intangible"),
      MatiAdminStore.heritageReportRows("natural"),
    ]);

    let users;
    if (
      typeof MatiSupabaseAuth !== "undefined" &&
      MatiSupabaseAuth.enabled?.()
    ) {
      users = await MatiSupabaseAuth.getAllUsers();
      if (!Array.isArray(users)) {
        throw new Error("Could not load registered users from the database.");
      }
    } else {
      users = await MatiAdminStore.getRegisteredUsers();
    }

    if (!Array.isArray(users)) {
      throw new Error("Could not load registered users.");
    }

    const leaderboard = users
      .map((user) => ({
        username: user.username || user.displayName || "User",
        points: Number(user.points ?? user.heritagePoints) || 0,
      }))
      .filter((user) => user.points > 0)
      .sort((a, b) => b.points - a.points);
    const counts = {
      built: builtRows.length,
      intangible: intangibleRows.length,
      natural: naturalRows.length,
      users: users.length,
      leaderboard: leaderboard.length,
    };

    return {
      counts,
      users,
      leaderboard,
      generatedAt: new Date(),
    };
  }

  function monthlyRegistrationData(users, now) {
    const months = [];
    const monthCounts = new Map();
    const monthFormatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      year: "numeric",
    });

    for (let offset = 11; offset >= 0; offset -= 1) {
      const month = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${month.getFullYear()}-${String(
        month.getMonth() + 1,
      ).padStart(2, "0")}`;
      months.push({ key, label: monthFormatter.format(month) });
      monthCounts.set(key, 0);
    }

    let hasHistory = false;
    users.forEach((user) => {
      if (!user.createdAt) return;
      const registeredAt = new Date(user.createdAt);
      if (Number.isNaN(registeredAt.getTime())) return;
      hasHistory = true;
      const key = `${registeredAt.getFullYear()}-${String(
        registeredAt.getMonth() + 1,
      ).padStart(2, "0")}`;
      if (monthCounts.has(key)) {
        monthCounts.set(key, monthCounts.get(key) + 1);
      }
    });

    return {
      hasHistory,
      labels: months.map((month) => month.label),
      values: months.map((month) => monthCounts.get(month.key)),
    };
  }

  function renderReport(counts, users, leaderboard, generatedAt) {
    $("#stat-built").textContent = counts.built.toLocaleString();
    $("#stat-intangible").textContent = counts.intangible.toLocaleString();
    $("#stat-natural").textContent = counts.natural.toLocaleString();
    $("#stat-users").textContent = counts.users.toLocaleString();
    $("#stat-leaderboard").textContent = counts.leaderboard.toLocaleString();
    $("#report-results").hidden = false;
    $("#report-initial-empty").hidden = true;

    const history = monthlyRegistrationData(users, generatedAt);
    renderReportHeritageChart(counts);
    renderReportUsersChart(history);
    renderReportLeaderboard(leaderboard);

    const timestamp = $("#report-generated-at");
    timestamp.dateTime = generatedAt.toISOString();
    timestamp.textContent = `Generated ${generatedAt.toLocaleString()}`;
    timestamp.hidden = false;
  }

  function renderReportHeritageChart(counts) {
    const values = [counts.built, counts.intangible, counts.natural];
    const hasRecords = values.some((value) => value > 0);
    const canvas = $("#report-heritage-chart");
    $("#report-heritage-empty").hidden = hasRecords;
    canvas.hidden = !hasRecords;

    if (reportHeritageChart) {
      reportHeritageChart.destroy();
      reportHeritageChart = null;
    }
    if (!hasRecords) return;

    reportHeritageChart = new Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: REPORT_CATEGORIES.slice(0, 3).map((category) => category.label),
        datasets: [
          {
            label: "Heritage records",
            data: values,
            backgroundColor: ["#176b52", "#4a9a79", "#a9cbb9"],
            borderRadius: 5,
            maxBarThickness: 58,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
            grid: { color: "#edf1ef" },
          },
          x: {
            grid: { display: false },
            ticks: { maxRotation: 0 },
          },
        },
      },
    });
  }

  function renderReportUsersChart(history) {
    const canvas = $("#report-users-chart");
    $("#report-users-empty").hidden = history.hasHistory;
    canvas.hidden = !history.hasHistory;

    if (reportUsersChart) {
      reportUsersChart.destroy();
      reportUsersChart = null;
    }
    if (!history.hasHistory) return;

    reportUsersChart = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: history.labels,
        datasets: [
          {
            label: "New registrations",
            data: history.values,
            borderColor: "#176b52",
            backgroundColor: "rgba(23, 107, 82, 0.1)",
            fill: true,
            tension: 0.25,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
            grid: { color: "#edf1ef" },
          },
          x: {
            grid: { display: false },
            ticks: { maxTicksLimit: 6, maxRotation: 0 },
          },
        },
      },
    });
  }

  function renderReportLeaderboard(leaderboard) {
    const rows = $("#report-leaderboard-rows");
    const empty = $("#report-leaderboard-empty");
    const topEntries = leaderboard.slice(0, 10);
    rows.innerHTML = topEntries
      .map(
        (entry, index) => `
          <tr>
            <td><span class="report-rank">${index + 1}</span></td>
            <td>${escapeHtml(entry.username)}</td>
            <td>${entry.points.toLocaleString()}</td>
          </tr>
        `,
      )
      .join("");
    empty.hidden = topEntries.length > 0;
  }

  function setReportStatus(message, state = "") {
    const status = $("#report-status");
    const panel = $("#report-status-panel");
    status.textContent = message;
    panel.classList.toggle("is-error", state === "error");
    panel.classList.toggle("is-success", state === "success");
    panel.classList.toggle("is-loading", state === "loading");
  }

  function reportCsvValue(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }

  async function exportCurrentReport() {
    if (!generatedReport) {
      setReportStatus("Generate a report before exporting it.", "error");
      return;
    }

    let url;
    let link;
    try {
      if (
        typeof MatiAdminAuth?.isAdmin !== "function" ||
        !(await MatiAdminAuth.isAdmin())
      ) {
        throw new Error(
          "Only authorized City Tourism Office personnel can export reports.",
        );
      }

      const { counts, generatedAt } = generatedReport;
      const rows = [
        ["Category", "Total records"],
        ...REPORT_CATEGORIES.map(({ key, label }) => [label, counts[key]]),
      ];
      const csvContent = `\uFEFF${rows
        .map((row) => row.map(reportCsvValue).join(","))
        .join("\r\n")}`;
      const date = [
        generatedAt.getFullYear(),
        String(generatedAt.getMonth() + 1).padStart(2, "0"),
        String(generatedAt.getDate()).padStart(2, "0"),
      ].join("-");
      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      url = URL.createObjectURL(blob);
      link = document.createElement("a");
      link.href = url;
      link.download = `tourism_graphical_report_${date}.csv`;
      link.hidden = true;
      document.body.appendChild(link);
      link.click();
      setReportStatus("CSV report exported successfully.", "success");
      showToast("CSV report exported successfully.");
    } catch (error) {
      console.error("CSV report export failed:", error);
      setReportStatus(
        error?.message || "Could not export the CSV report. Please try again.",
        "error",
      );
      showToast(error?.message || "Could not export the CSV report. Please try again.");
    } finally {
      link?.remove();
      if (url) window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
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
        (mediaType !== "photo" &&
          mediaType !== "video" &&
          mediaType !== "audio" &&
          mediaType !== "model3d" &&
          mediaType !== "map") ||
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
        (mediaType !== "photo" &&
          mediaType !== "video" &&
          mediaType !== "audio" &&
          mediaType !== "model3d" &&
          mediaType !== "map") ||
        $("#media-id")?.value?.trim()
      ) {
        return;
      }
      e.preventDefault();

      let files = [];
      const droppedFiles = [...(e.dataTransfer?.files || [])];
      if (
        mediaType === "photo" ||
        mediaType === "video" ||
        mediaType === "audio"
      ) {
        files = droppedFiles.filter((file) =>
          mediaFileMatchesType(mediaType, file),
        );
        if (!files.length || files.length !== droppedFiles.length) {
          const allowed =
            mediaType === "photo"
              ? "image"
              : mediaType === "video"
                ? "video"
                : "audio";
          showToast(`Drop only supported ${allowed} files.`);
          return;
        }
      } else if (mediaType === "model3d") {
        files = droppedFiles.filter(
          (file) =>
            file.name.toLowerCase().endsWith(".glb") ||
            file.type === "model/gltf-binary",
        );
        if (!files.length || files.length !== droppedFiles.length) {
          showToast("Drop .glb 3D model files only.");
          return;
        }
        if (files.length > 1) {
          showToast("Drop only one 3D model file.");
          return;
        }
      } else if (mediaType === "map") {
        files = droppedFiles.filter((file) =>
          mediaFileMatchesType("photo", file),
        );
        if (!files.length || files.length !== droppedFiles.length) {
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
    const profile = $("[data-admin-profile]");
    const profileTrigger = $("[data-admin-profile-trigger]");
    const profileMenu = $("#admin-profile-menu");
    const closeProfileMenu = () => {
      if (!profileMenu || profileMenu.hidden) return;
      profileMenu.hidden = true;
      profileTrigger?.setAttribute("aria-expanded", "false");
    };

    profileTrigger?.addEventListener("click", () => {
      if (!profileMenu) return;
      profileMenu.hidden = !profileMenu.hidden;
      profileTrigger.setAttribute(
        "aria-expanded",
        String(!profileMenu.hidden),
      );
    });
    profileMenu?.addEventListener("click", (event) => {
      const viewButton = event.target.closest("[data-view]");
      if (!viewButton) return;
      closeProfileMenu();
      setView(viewButton.dataset.view);
    });
    document.addEventListener("click", (event) => {
      if (profile && !profile.contains(event.target)) closeProfileMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeProfileMenu();
    });
    syncAdminProfile(
      typeof MatiAuth !== "undefined" ? MatiAuth.getSession?.() || {} : {},
    );

    $("#admin-logout")?.addEventListener("click", () => {
      closeProfileMenu();
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

    $("#view-gallery")?.addEventListener("click", (event) => {
      const addButton = event.target.closest("[data-admin-add-site-category]");
      if (!addButton) return;
      currentCategory = addButton.dataset.adminAddSiteCategory || "natural";
      openSiteModal(null);
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
    $("#built-heritage-barangay")?.addEventListener("change", () => {
      builtHeritagePage = 1;
      renderHeritage();
    });
    $("#heritage-built-pagination")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-built-page]");
      if (!button || button.disabled) return;
      builtHeritagePage = Number(button.dataset.builtPage) || 1;
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

    $("#media-type")?.addEventListener("change", () => {
      const input = $("#media-file");
      if (input) input.value = "";
      modelFileValidationId += 1;
      modelFileIsValid = false;
      modelFileValidationInProgress = false;
      updateMediaFormUi();
    });

    bindMediaFileDrop();

    $("#btn-choose-model-file")?.addEventListener("click", () => {
      if (
        !modelFileValidationInProgress &&
        !modelSubmitInProgress &&
        !modelReplaceConfirmationInProgress &&
        !modelUploadInProgress
      ) {
        $("#media-file")?.click();
      }
    });

    $("#btn-choose-media-files")?.addEventListener("click", () => {
      const type = $("#media-type")?.value;
      if (
        ["photo", "video", "audio"].includes(type) &&
        !$("#media-file")?.disabled
      ) {
        $("#media-file")?.click();
      }
    });

    $("#btn-clear-model-file")?.addEventListener("click", () => {
      if (
        modelFileValidationInProgress ||
        modelSubmitInProgress ||
        modelReplaceConfirmationInProgress ||
        modelUploadInProgress
      ) {
        return;
      }
      const input = $("#media-file");
      if (input) input.value = "";
      modelFileValidationId += 1;
      modelFileIsValid = false;
      updateMediaFormUi();
    });

    $("#media-file")?.addEventListener("change", async (e) => {
      const type = $("#media-type")?.value;
      const input = e.target;
      const file = input.files?.[0];
      if (type === "model3d") {
        const validationId = ++modelFileValidationId;
        modelFileIsValid = false;
        modelFileValidationInProgress = Boolean(file);
        updateMediaFormUi();
        if (!file) return;

        try {
          const valid = await isValidGlbFile(file);
          if (
            validationId !== modelFileValidationId ||
            input.files?.[0] !== file
          ) {
            return;
          }
          modelFileIsValid = valid;
          if (!valid) {
            input.value = "";
            showToast("Choose a valid GLB 2.0 model file.");
          }
        } catch (error) {
          console.error("Could not validate 3D model file:", error);
          if (
            validationId === modelFileValidationId &&
            input.files?.[0] === file
          ) {
            input.value = "";
            showToast("Could not validate the selected GLB file.");
          }
        } finally {
          if (validationId === modelFileValidationId) {
            modelFileValidationInProgress = false;
            updateMediaFormUi();
          }
        }
        return;
      }
      if (["photo", "video", "audio"].includes(type)) {
        const selected = [...(input.files || [])];
        if (selected.some((file) => !mediaFileMatchesType(type, file))) {
          input.value = "";
          showToast(
            type === "photo"
              ? "Choose image files only."
              : type === "video"
                ? "Choose supported video files only."
                : "Choose supported audio files only.",
          );
        }
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

      const viewMap = e.target.closest("[data-view-map]");
      if (viewMap) {
        e.preventDefault();
        e.stopPropagation();
        const siteId = viewMap.dataset.viewMap;
        const site = MatiAdminStore.getSiteById(siteId);
        if (site && site.cover) {
          // Open the site map image in a new tab
          window.open(site.cover, "_blank");
        } else {
          showToast("No site map to view.");
        }
        return;
      }

      const closeLightbox = e.target.closest(
        "#galLightboxClose, .gal-lightbox-backdrop",
      );
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

      const closePhotoCollection = e.target.closest(
        "[data-close-photo-collection], .admin-modal-backdrop",
      );
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
          const photos = MatiAdminStore.getSiteMedia(siteId).filter(
            (m) => m.type === "photo",
          );
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
        window.currentLightboxIndex =
          (window.currentLightboxIndex -
            1 +
            window.currentLightboxPhotos.length) %
          window.currentLightboxPhotos.length;
        showAdminLightbox();
        return;
      }

      const lightboxNext = e.target.closest("#galLightboxNext");
      if (lightboxNext && window.currentLightboxPhotos) {
        e.preventDefault();
        e.stopPropagation();
        window.currentLightboxIndex =
          (window.currentLightboxIndex + 1) %
          window.currentLightboxPhotos.length;
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
      const manageModel = e.target.closest("[data-manage-model]");
      if (manageModel) {
        e.preventDefault();
        e.stopPropagation();
        openMediaModal(null, manageModel.dataset.manageModel, "model3d");
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

    $("#btn-retry-site")?.addEventListener("click", () => {
      $("#site-form")?.requestSubmit();
    });

    $("#media-form")?.addEventListener("submit", saveMediaForm);
    $("#btn-remove-model")?.addEventListener("click", () => {
      void removeCurrentModel();
    });

    $("#btn-delete-site")?.addEventListener("click", async () => {
      const id = $("#site-id")?.value?.trim();
      if (!id || !isBuiltHeritageForm()) return;

      const site = MatiAdminStore.getSiteById(id);
      const confirmed = await showRemoveConfirmation(site?.name || "this site");
      if (!confirmed) return;

      try {
        const result = await runSiteRemovalStatus(
          site?.name || "Heritage site",
          () => MatiAdminStore.deleteSite(id),
        );
        if (!result?.ok) {
          showToast("Could not remove the heritage record from Supabase.");
          return;
        }
        closeAllModals();
        renderHeritage();
        void renderDashboard();
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

    $("#btn-generate-report")?.addEventListener("click", async (event) => {
      const generateButton = event.currentTarget;
      const exportButton = $("#btn-export-csv");
      const loadingIndicator = $("#report-loading-indicator");
      generateButton.disabled = true;
      generateButton.setAttribute("aria-busy", "true");
      generatedReport = null;
      exportButton.disabled = true;
      loadingIndicator.hidden = false;
      $("#report-results").hidden = true;
      $("#report-initial-empty").hidden = true;
      $("#report-generated-at").hidden = true;
      setReportStatus("Loading the latest report data...", "loading");
      try {
        const report = await fetchReportData();
        renderReport(
          report.counts,
          report.users,
          report.leaderboard,
          report.generatedAt,
        );
        generatedReport = report;
        exportButton.disabled = false;
        setReportStatus("Report generated successfully.", "success");
        showToast("Report generated successfully.");
      } catch (error) {
        console.error("Error generating report:", error);
        $("#report-results").hidden = true;
        $("#report-initial-empty").hidden = false;
        setReportStatus(
          error?.message || "Could not generate the report. Please try again.",
          "error",
        );
        showToast("Could not generate the report. Please try again.");
      } finally {
        generateButton.disabled = false;
        generateButton.removeAttribute("aria-busy");
        loadingIndicator.hidden = true;
      }
    });

    $("#btn-export-csv")?.addEventListener("click", () => {
      void exportCurrentReport();
    });

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
    const cards = container.querySelectorAll(".admin-model-card--empty");
    if (!cards.length) return;

    cards.forEach((card) => {
      if (card.dataset.dragBound) return;
      card.dataset.dragBound = "true";

      const cardType = card.dataset.addMediaType || "model3d";
      const isMap = cardType === "map";
      const isModel = cardType === "model3d";
      const isPhoto = cardType === "photo";
      const isVideo = cardType === "video";
      const isAudio = cardType === "audio";

      const titleEl = card.querySelector(".admin-model-card__title");
      const originalTitle =
        titleEl?.textContent ||
        (isMap
          ? "No Site Map Available"
          : isPhoto
            ? "No Photographs Available"
            : isVideo
              ? "No Videos Available"
              : isAudio
                ? "No Audio Recordings Available"
                : "No 3D Model Available");
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
        if (isVideo) {
          return (
            file.type.startsWith("video/") ||
            /\.(mp4|webm|mov)$/i.test(file.name)
          );
        }
        if (isAudio) {
          return (
            file.type.startsWith("audio/") ||
            /\.(mp3|wav|ogg|m4a)$/i.test(file.name)
          );
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
            ? isMap
              ? "Please drop a valid image file for the site map."
              : isPhoto
                ? "Please drop valid image files for photographs."
                : isVideo
                  ? "Please drop a valid video file."
                  : isAudio
                    ? "Please drop a valid audio file."
                    : "Please drop a valid .glb 3D model file."
            : isMap
              ? "Upload a site map to preview and manage it here."
              : isPhoto
                ? "Upload photographs to preview and manage them here."
                : isVideo
                  ? "Upload videos to preview and manage them here."
                  : isAudio
                    ? "Upload audio recordings to preview and manage them here."
                    : "Upload a 3D model to preview and manage it here.";
        }
        if (dropLabel && descEl) {
          dropLabel.style.display = isOver && isValid ? "block" : "none";
        }
        if (uploadIcon) {
          uploadIcon.style.display =
            isOver && isValid ? "inline-block" : "none";
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
            descEl.textContent = isMap
              ? "Please drop a valid image file for the site map."
              : isPhoto
                ? "Please drop valid image files for photographs."
                : isVideo
                  ? "Please drop a valid video file."
                  : isAudio
                    ? "Please drop a valid audio file."
                    : "Please drop a valid .glb 3D model file.";
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
                    syncFailedMessage(
                      savedSite,
                      "Site map uploaded locally only.",
                    ),
                  );
                } else {
                  showToast("Site map uploaded to database.");
                }
              } else if (isPhoto || isVideo || isAudio) {
                // For photos, we need to open the media modal with the file
                const transfer = new DataTransfer();
                transfer.items.add(file);
                const fileInput = $("#media-file");
                if (fileInput) {
                  fileInput.files = transfer.files;
                  // Set media type to photo
                  const mediaTypeSelect = $("#media-type");
                  if (mediaTypeSelect) {
                    mediaTypeSelect.value = isPhoto
                      ? "photo"
                      : isVideo
                        ? "video"
                        : "audio";
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
                  openMediaModal(
                    isPhoto ? "photo" : isVideo ? "video" : "audio",
                    siteId,
                  );
                  // Trigger file input change
                  fileInput.dispatchEvent(
                    new Event("change", { bubbles: true }),
                  );
                  updateMediaFormUi();
                }
                return;
              } else if (isModel) {
                const modelSrc = await uploadSiteModelFile({
                  siteId,
                  site,
                  file,
                  signal: activeUploadController.signal,
                  setProgress: (pct, label, meta) => {
                    if (activeUploadController.signal.aborted) return;
                    setProgress(
                      pct,
                      label || "Uploading model...",
                      meta || {
                        fileName: file.name,
                        totalBytes: file.size,
                        startedAt: Date.now(),
                      },
                    );
                  },
                });
                if (activeUploadController.signal.aborted) return;
                setProgress(100, "Finalizing upload...", {
                  fileName: file.name,
                  totalBytes: file.size,
                  loadedBytes: file.size,
                  startedAt: Date.now(),
                });
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
              }

              refreshSiteViews(siteId);
            },
            {
              title: isMap
                ? "Uploading Site Map..."
                : isPhoto
                  ? "Opening Photo Upload..."
                  : isVideo
                    ? "Opening Video Upload..."
                    : isAudio
                      ? "Opening Audio Upload..."
                      : "Uploading 3D Model...",
              doneDetail: isMap
                ? "Upload complete. Site map is now linked."
                : isPhoto || isVideo || isAudio
                  ? ""
                  : "Upload complete. Model is now linked.",
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
    });
  }

  function init() {
    const mediaModal = $("#media-modal");
    removeUnusedDashboardSections();
    injectStyles(["photoPile", "modelCard"]);
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
      syncAdminProfile(
        typeof MatiAuth !== "undefined" ? MatiAuth.getSession?.() || {} : {},
      );

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
      void renderDashboard();
      renderHeritage();
      if (siteId) renderSiteMediaList(siteId);
    },
    removeSite(siteId) {
      return removeSiteFromGallery(siteId);
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
      countEl.textContent = `${photos.length} photograph${photos.length !== 1 ? "s" : ""}`;
    }

    // Build photo grid with gallery-style design
    const gridEl = $("#photoCollectionGrid");
    if (gridEl) {
      gridEl.innerHTML = photos
        .map(
          (photo, index) => `
        <div class="photo-collection-item" data-photo-index="${index}" style="cursor: pointer; position: relative; overflow: hidden; border-radius: 8px; aspect-ratio: 1; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); transition: transform 0.2s, box-shadow 0.2s; background: #f3f4f6;">
          <img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.title || "Photograph")}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s;" />
          <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 10px; background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent); color: white; font-size: 12px; font-weight: 500; opacity: 0; transition: opacity 0.2s;">
            ${escapeHtml(photo.title || `Photo ${index + 1}`)}
          </div>
        </div>
      `,
        )
        .join("");

      // Add hover effects via inline styles
      gridEl.querySelectorAll(".photo-collection-item").forEach((item) => {
        item.addEventListener("mouseenter", () => {
          item.querySelector("img").style.transform = "scale(1.05)";
          item.querySelector("div:last-child").style.opacity = "1";
        });
        item.addEventListener("mouseleave", () => {
          item.querySelector("img").style.transform = "scale(1)";
          item.querySelector("div:last-child").style.opacity = "0";
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
    media.innerHTML = `<div class="gal-lightbox-player-wrap"><img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.title || "Photograph")}" decoding="async" /></div>`;

    if (title) {
      title.textContent = `${escapeHtml(window.currentLightboxSiteName || "Site")} - Photograph ${window.currentLightboxIndex + 1} of ${photos.length}`;
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
