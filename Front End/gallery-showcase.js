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
          ".gal-heritage-folder, .gal-subfolder, .gal-media-item, .gal-category-card, .gal-timeline-row, .gal-timeline-highlight",
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
    const frames = document.querySelectorAll(".gal-float-frame");
    if (!hero || !frames.length) return;

    hero.addEventListener("mousemove", (e) => {
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      frames.forEach((frame, i) => {
        const depth = (i + 1) * 8;
        frame.style.transform = `translate(${x * depth}px, ${y * depth}px)`;
      });
    });

    hero.addEventListener("mouseleave", () => {
      frames.forEach((frame) => {
        frame.style.transform = "";
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
