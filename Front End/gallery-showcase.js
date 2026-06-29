/**
 * Gallery showcase — decorative animations only.
 * Does not modify gallery-app.js logic.
 */
(function () {
  "use strict";

  function initPanelObserver() {
    const panel = document.getElementById("galPanel");
    if (!panel) return;

    const observer = new MutationObserver(() => {
      requestAnimationFrame(() => {
        panel.querySelectorAll(
          ".gal-heritage-folder, .gal-subfolder, .gal-media-item, .gal-category-card, .gal-timeline-chapter, .gal-timeline-highlight-card",
        ).forEach((el, i) => {
          el.style.setProperty("--gal-i", i);
          el.classList.remove("gal-reveal");
          void el.offsetWidth;
          el.classList.add("gal-reveal");
        });
      });
    });

    observer.observe(panel, { childList: true, subtree: true });
  }

  function initHeroParallax() {
    const hero = document.querySelector(".gal-hero");
    const layers = hero?.querySelectorAll("[data-depth]");
    if (!hero || !layers?.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    hero.addEventListener("mousemove", (e) => {
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      layers.forEach((layer) => {
        const depth = Number(layer.dataset.depth) || 1;
        layer.style.transform = `translate(${x * depth * 5}px, ${y * depth * 4}px)`;
      });
    });

    hero.addEventListener("mouseleave", () => {
      layers.forEach((layer) => {
        layer.style.transform = "";
      });
    });
  }

  function init() {
    initPanelObserver();
    initHeroParallax();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
