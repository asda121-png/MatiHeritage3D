(function () {
  const EXPAND_KEY = "matiGameTvExpand";

  const GAME_SCREEN_IDS = [
    "game-show",
    "game-screen",
    "difficulty-screen",
    "results-screen",
  ];

  const PREVIEW_TARGETS = {
    trivia: { width: 736, heightRatio: 0.78 },
    memory: { width: 768, heightRatio: 0.92 },
    spot: { width: 672, heightRatio: 0.88 },
    slide: { width: 704, heightRatio: 0.92 },
    truefalse: { width: 704, heightRatio: 0.92 },
    tv: { width: 736, heightRatio: 0.78 },
  };

  const PREVIEW_BACKGROUNDS = {
    memory: "#2a1808",
    spot: "#12081f",
    slide: "#0d2818",
    truefalse: "#0f0a08",
    default: "#08080c",
  };

  function supportsViewTransition() {
    return typeof document.startViewTransition === "function";
  }

  function resetToIntroScreen() {
    const intro = document.getElementById("intro-screen");
    if (!intro) return false;

    intro.classList.remove("hidden");

    GAME_SCREEN_IDS.forEach(function (id) {
      const screen = document.getElementById(id);
      if (screen) screen.classList.add("hidden");
    });

    return true;
  }

  function getExpandFocusElement() {
    return (
      document.querySelector(".intro-tv-wrap .tv-set") ||
      document.querySelector("#intro-screen .fest-banner") ||
      document.querySelector("#intro-screen .parchment-card") ||
      document.querySelector(
        "#intro-screen > .hero-scroll:not(.scroll-sidebar)",
      ) ||
      document.getElementById("intro-screen")
    );
  }

  function getPreviewTarget(sourceEl) {
    const type = sourceEl?.dataset?.previewType || "tv";
    return PREVIEW_TARGETS[type] || PREVIEW_TARGETS.tv;
  }

  function getPreviewBackground(previewType) {
    return PREVIEW_BACKGROUNDS[previewType] || PREVIEW_BACKGROUNDS.default;
  }

  function launchGameFromTvCard(sourceEl, url, options) {
    options = options || {};
    if (!sourceEl || !url) {
      window.location.href = url;
      return;
    }

    const previewType = sourceEl.dataset.previewType || "tv";

    sessionStorage.setItem(
      EXPAND_KEY,
      JSON.stringify({
        url: url.split("/").pop() || url,
        screen: "intro",
        previewType: previewType,
        ts: Date.now(),
      }),
    );

    if (options.useViewTransition !== false && supportsViewTransition()) {
      document.startViewTransition(function () {
        window.location.href = url;
      });
      return;
    }

    const rect = sourceEl.getBoundingClientRect();
    const overlay = document.createElement("div");
    overlay.className = "tv-expand-overlay";
    overlay.setAttribute("aria-hidden", "true");

    const clone = sourceEl.cloneNode(true);
    clone.removeAttribute("id");
    clone.classList.add("tv-expand-clone");
    overlay.appendChild(clone);
    document.body.appendChild(overlay);
    document.body.classList.add("tv-expand-active");

    const target = getPreviewTarget(sourceEl);
    const targetWidth = Math.min(
      window.innerWidth * 0.92,
      target.width,
    );
    const targetHeight = targetWidth * target.heightRatio;
    const targetLeft = (window.innerWidth - targetWidth) / 2;
    const targetTop = Math.max(
      72,
      (window.innerHeight - targetHeight) / 2 - 24,
    );

    Object.assign(clone.style, {
      position: "fixed",
      top: rect.top + "px",
      left: rect.left + "px",
      width: rect.width + "px",
      height: rect.height + "px",
      margin: "0",
      zIndex: "100001",
      transition:
        "top 0.72s cubic-bezier(0.22, 1, 0.36, 1), left 0.72s cubic-bezier(0.22, 1, 0.36, 1), width 0.72s cubic-bezier(0.22, 1, 0.36, 1), height 0.72s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease",
    });

    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "100000",
      background: getPreviewBackground(previewType),
      pointerEvents: "none",
    });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        clone.style.top = targetTop + "px";
        clone.style.left = targetLeft + "px";
        clone.style.width = targetWidth + "px";
        clone.style.height = targetHeight + "px";
      });
    });

    var navigated = false;
    function go() {
      if (navigated) return;
      navigated = true;
      window.location.href = url;
    }

    clone.addEventListener("transitionend", go, { once: true });
    setTimeout(go, 850);
  }

  function initTvExpandReceive() {
    var raw = sessionStorage.getItem(EXPAND_KEY);
    if (!raw) return;

    var data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      sessionStorage.removeItem(EXPAND_KEY);
      return;
    }

    var currentPage = window.location.pathname.split("/").pop() || "";
    if (data.url && data.url !== currentPage) return;

    sessionStorage.removeItem(EXPAND_KEY);
    resetToIntroScreen();

    document.documentElement.classList.add("tv-receive-from-carousel");
    if (data.previewType === "memory") {
      document.documentElement.classList.add("tv-receive-from-carousel--memory");
    }
    if (data.previewType === "spot") {
      document.documentElement.classList.add("tv-receive-from-carousel--spot");
    }
    if (data.previewType === "slide") {
      document.documentElement.classList.add("tv-receive-from-carousel--slide");
    }
    if (data.previewType === "truefalse") {
      document.documentElement.classList.add(
        "tv-receive-from-carousel--truefalse",
      );
    }

    var focusEl = getExpandFocusElement();
    if (focusEl) {
      focusEl.classList.add("tv-receive-focus");
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.documentElement.classList.add("tv-receive-from-carousel--ready");
      });
    });

    window.setTimeout(function () {
      document.documentElement.classList.remove(
        "tv-receive-from-carousel",
        "tv-receive-from-carousel--ready",
        "tv-receive-from-carousel--memory",
        "tv-receive-from-carousel--spot",
        "tv-receive-from-carousel--slide",
        "tv-receive-from-carousel--truefalse",
      );
      if (focusEl) focusEl.classList.remove("tv-receive-focus");
    }, 900);
  }

  window.launchGameFromTvCard = launchGameFromTvCard;
  window.initTvExpandReceive = initTvExpandReceive;
  window.resetGameToIntroScreen = resetToIntroScreen;
})();
