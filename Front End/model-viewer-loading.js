/**
 * Shared 3D Model Loading and Percentage Display
 * Used across index.html, login.html, and admin.html
 */

(function() {
  'use strict';

  /**
   * Initialize loading and percentage tracking for a model-viewer element
   * @param {string} viewerId - ID of the model-viewer element
   * @param {string} loadingId - ID of the loading container element
   * @param {string} percentId - ID of the percentage display element (optional)
   * @param {Object} options - Configuration options
   */
  function initializeModelLoading(viewerId, loadingId, percentId, options = {}) {
    const viewer = document.getElementById(viewerId);
    const loading = document.getElementById(loadingId);
    const progressPercent = percentId ? document.getElementById(percentId) : null;
    const loadingText = loading?.querySelector(options.loadingTextSelector || '.model-viewer-loading__text');
    
    if (!viewer || !loading) {
      console.warn(`Model loading initialization failed: viewer="${viewerId}", loading="${loadingId}"`);
      return;
    }

    // Apply custom model enhancements if available
    if (typeof MatiHeritagePylonModel !== "undefined") {
      MatiHeritagePylonModel.applyToModelViewer(viewer);
    }

    function setProgress(ratio) {
      if (!progressPercent) return;
      const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
      progressPercent.textContent = `${pct}%`;
    }

    function hideLoading() {
      loading.classList.add("is-hidden");
      loading.setAttribute("aria-busy", "false");
      window.setTimeout(() => {
        loading.hidden = true;
        loading.setAttribute("hidden", "");
      }, options.hideDelay || 380);
    }

    function showError(message) {
      if (loadingText) {
        loadingText.textContent = message || options.errorMessage || "3D preview unavailable";
      }
      setProgress(0);
      window.setTimeout(hideLoading, options.errorDelay || 1400);
    }

    // If already loaded, complete immediately
    if (viewer.loaded) {
      setProgress(1);
      hideLoading();
      return;
    }

    // Track loading progress
    viewer.addEventListener("progress", (event) => {
      setProgress(event.detail.totalProgress);
    });

    // Handle successful load
    viewer.addEventListener("load", () => {
      setProgress(1);
      hideLoading();
    }, { once: true });

    // Handle loading errors
    viewer.addEventListener("error", () => {
      showError();
    }, { once: true });
  }

  /**
   * Initialize fullscreen model viewer loading (for admin.html)
   * @param {string} viewerId - ID of the fullscreen model-viewer
   * @param {string} loadingId - ID of the loading container
   * @param {string} labelId - ID of the loading label element
   * @param {string} percentId - ID of the percentage display element (optional)
   * @param {Object} options - Configuration options
   */
  function initializeFullscreenLoading(viewerId, loadingId, labelId, percentId, options = {}) {
    const viewer = document.getElementById(viewerId);
    const loading = document.getElementById(loadingId);
    const label = labelId ? document.getElementById(labelId) : null;
    const progressPercent = percentId ? document.getElementById(percentId) : null;
    const loadingText = loading?.querySelector(options.loadingTextSelector || '.model-viewer-loading__text');
    
    if (!viewer || !loading) return;

    function showLoading(text = "Loading 3D model…") {
      if (label) label.textContent = text;
      loading.removeAttribute("hidden");
    }

    function hideLoading() {
      loading.setAttribute("hidden", "");
    }

    function setProgress(ratio) {
      if (!progressPercent) return;
      const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
      progressPercent.textContent = `${pct}%`;
    }

    // Track loading progress if percentage element exists
    if (progressPercent) {
      viewer.addEventListener("progress", (event) => {
        setProgress(event.detail.totalProgress);
      });
    }

    // Handle load event
    viewer.addEventListener("load", () => {
      if (progressPercent) setProgress(1);
      hideLoading();
    }, { once: true });

    // Handle error event
    viewer.addEventListener("error", () => {
      if (label || loadingText) {
        const targetElement = label || loadingText;
        targetElement.textContent = "Failed to load 3D model";
      }
      if (progressPercent) setProgress(0);
      setTimeout(hideLoading, 2000);
    }, { once: true });

    return { showLoading, hideLoading };
  }

  // Export functions to global scope
  window.ModelViewerLoading = {
    initialize: initializeModelLoading,
    initializeFullscreen: initializeFullscreenLoading
  };

  // Auto-initialize for common element IDs if present
  document.addEventListener('DOMContentLoaded', function() {
    // Auto-initialize login page if elements exist
    if (document.getElementById('login-pylon-model')) {
      ModelViewerLoading.initialize(
        'login-pylon-model',
        'login-model-loading',
        'login-model-percent',
        {
          loadingTextSelector: '.model-viewer-loading__text',
          errorMessage: '3D preview unavailable'
        }
      );
    }

    // Note: index.html portal model is handled by its own IntersectionObserver logic
    // to avoid conflicts with the existing model behavior controls
  });

})();
