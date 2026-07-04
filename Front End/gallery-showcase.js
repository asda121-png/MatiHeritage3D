/**
 * Gallery showcase — decorative scroll animations (timeline, panel reveals).
 */
(function () {
  "use strict";

  let timelineCleanup = null;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function initTimelineScrollReveal(container) {
    timelineCleanup?.();
    timelineCleanup = null;

    const walk = container.querySelector(".gal-timeline-walk");
    if (!walk) return;

    const chapters = [...walk.querySelectorAll(".gal-timeline-chapter")];
    const hero = container.querySelector(".gal-timeline-hero");
    const highlights = [...container.querySelectorAll(".gal-timeline-highlight-card")];

    if (prefersReducedMotion()) {
      chapters.forEach((chapter) => chapter.classList.add("is-inview", "has-been-inview"));
      hero?.classList.add("is-inview");
      highlights.forEach((card) => card.classList.add("is-inview"));
      walk.style.setProperty("--timeline-progress", "100%");
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-inview", "has-been-inview");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );

    chapters.forEach((chapter) => revealObserver.observe(chapter));
    if (hero) revealObserver.observe(hero);
    highlights.forEach((card) => revealObserver.observe(card));

    const updateProgress = () => {
      const rect = walk.getBoundingClientRect();
      const walkTop = window.scrollY + rect.top;
      const walkHeight = walk.offsetHeight;
      if (walkHeight <= 0) return;

      const marker = window.scrollY + window.innerHeight * 0.38;
      const progress = Math.max(
        0,
        Math.min(100, ((marker - walkTop) / walkHeight) * 100),
      );
      walk.style.setProperty("--timeline-progress", `${progress}%`);
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateProgress();

        let activeChapter = null;
        let closestDistance = Infinity;
        const focusLine = window.innerHeight * 0.42;

        chapters.forEach((chapter) => {
          chapter.classList.remove("is-active");
          const rect = chapter.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > window.innerHeight) return;

          const center = rect.top + rect.height * 0.35;
          const distance = Math.abs(center - focusLine);
          if (distance < closestDistance) {
            closestDistance = distance;
            activeChapter = chapter;
          }
        });

        activeChapter?.classList.add("is-active");
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    updateProgress();
    onScroll();

    timelineCleanup = () => {
      revealObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }

  function initPanelObserver() {
    const panel = document.getElementById("galPanel");
    if (!panel) return;

    const refreshDecor = () => {
      requestAnimationFrame(() => {
        panel
          .querySelectorAll(
            ".gal-heritage-folder, .gal-subfolder, .gal-media-item, .gal-category-card, .gal-timeline-highlight-card",
          )
          .forEach((el, i) => {
            el.style.setProperty("--gal-i", i);
            el.classList.remove("gal-reveal");
            void el.offsetWidth;
            el.classList.add("gal-reveal");
          });

        initTimelineScrollReveal(panel);
      });
    };

    const observer = new MutationObserver(refreshDecor);
    observer.observe(panel, { childList: true, subtree: true });
    refreshDecor();
  }

  function initHeroParallax() {
    const hero = document.querySelector(".gal-hero");
    const layers = hero?.querySelectorAll("[data-depth]");
    if (!hero || !layers?.length) return;
    if (prefersReducedMotion()) return;

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
