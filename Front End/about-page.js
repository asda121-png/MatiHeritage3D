(function () {
  "use strict";

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function initReveals() {
    const els = document.querySelectorAll(".about-reveal");
    if (!els.length) return;

    if (prefersReducedMotion()) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" },
    );

    els.forEach((el) => observer.observe(el));
  }

  function initMatiTimeline() {
    const walk = document.getElementById("mati-timeline-walk");
    if (!walk) return;

    const hero = document.querySelector(".about-timeline-hero");
    const chapters = [...walk.querySelectorAll(".about-timeline-chapter")];

    if (prefersReducedMotion()) {
      hero?.classList.add("is-inview");
      chapters.forEach((ch) => ch.classList.add("is-inview"));
      walk.style.setProperty("--timeline-progress", "100%");
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-inview");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" },
    );

    if (hero) revealObserver.observe(hero);
    chapters.forEach((chapter) => revealObserver.observe(chapter));

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

        let active = null;
        let closest = Infinity;
        const focus = window.innerHeight * 0.42;

        chapters.forEach((chapter) => {
          chapter.classList.remove("is-active");
          const rect = chapter.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > window.innerHeight) return;
          const center = rect.top + rect.height * 0.35;
          const dist = Math.abs(center - focus);
          if (dist < closest) {
            closest = dist;
            active = chapter;
          }
        });

        active?.classList.add("is-active");
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    updateProgress();
    onScroll();
  }

  function init() {
    initReveals();
    initMatiTimeline();
    if (typeof window.loadVisitorHeaderAndFooter === "function") {
      window.loadVisitorHeaderAndFooter("about");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
