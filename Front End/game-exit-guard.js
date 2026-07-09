/**
 * Shared exit confirmation for heritage games.
 * Theme matches each game's visual design.
 */
const MatiGameExitGuard = (() => {
  const STYLE_ID = "mati-game-exit-guard-style";
  let isActiveFn = () => false;
  let theme = "trivia";
  let pendingHref = null;
  let root = null;

  const THEMES = {
    trivia: {
      badge: "Live game",
      title: "Leave game?",
      message: "Progress won’t be saved if you leave now.",
      stay: "Stay",
      leave: "Leave",
      fonts:
        "https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Rajdhani:wght@600;700&display=swap",
    },
    chronicle: {
      badge: "Quest in progress",
      title: "Leave the chronicle?",
      message: "Your matching progress won’t be saved.",
      stay: "Continue",
      leave: "Leave",
      fonts:
        "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Quicksand:wght@600;700&display=swap",
    },
    nature: {
      badge: "Puzzle in progress",
      title: "Leave the trail?",
      message: "Your slide puzzle won’t be saved.",
      stay: "Keep playing",
      leave: "Leave",
      fonts:
        "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=Nunito:wght@600;700;800&display=swap",
    },
    festival: {
      badge: "Round in progress",
      title: "Leave the fest?",
      message: "Your spot-the-difference run won’t be saved.",
      stay: "Stay",
      leave: "Leave",
      fonts:
        "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Poppins:wght@600;700;800&display=swap",
    },
    scroll: {
      badge: "Sprint in progress",
      title: "Leave the sprint?",
      message: "Your true/false run won’t be recorded.",
      stay: "Stay",
      leave: "Leave",
      fonts:
        "https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800&family=Crimson+Pro:wght@600;700&display=swap",
    },
  };

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .mati-exit-guard {
        position: fixed;
        inset: 0;
        z-index: 9990;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.25rem;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.22s ease;
      }
      .mati-exit-guard.is-open {
        opacity: 1;
        pointer-events: auto;
      }
      .mati-exit-guard__panel {
        width: min(100%, 26rem);
        padding: 1.45rem 1.4rem 1.3rem;
        text-align: center;
        transform: translateY(12px) scale(0.97);
        transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .mati-exit-guard.is-open .mati-exit-guard__panel {
        transform: translateY(0) scale(1);
      }
      .mati-exit-guard__badge {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        margin: 0 0 0.85rem;
        padding: 0.28rem 0.7rem;
        border-radius: 999px;
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
      .mati-exit-guard__dot {
        width: 0.45rem;
        height: 0.45rem;
        border-radius: 50%;
        animation: matiExitPulse 1.1s ease-in-out infinite;
      }
      @keyframes matiExitPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.35; }
      }
      .mati-exit-guard__title {
        margin: 0 0 0.55rem;
        font-size: clamp(1.35rem, 3.4vw, 1.7rem);
        font-weight: 700;
        letter-spacing: 0.03em;
      }
      .mati-exit-guard__message {
        margin: 0 auto 1.25rem;
        max-width: 22rem;
        font-size: 1.05rem;
        font-weight: 600;
        line-height: 1.45;
      }
      .mati-exit-guard__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.65rem;
        justify-content: center;
      }
      .mati-exit-guard__btn {
        min-width: 7.5rem;
        padding: 0.7rem 1.15rem;
        border-radius: 999px;
        border: 1px solid transparent;
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
        transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
      }
      .mati-exit-guard__btn:hover {
        transform: translateY(-1px);
      }

      /* Trivia / TV studio */
      .mati-exit-guard--trivia {
        background:
          radial-gradient(ellipse 70% 50% at 50% 20%, rgba(212, 175, 55, 0.12), transparent 55%),
          rgba(4, 4, 8, 0.78);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      .mati-exit-guard--trivia .mati-exit-guard__panel {
        border-radius: 1rem;
        border: 1px solid rgba(212, 175, 55, 0.45);
        background: linear-gradient(165deg, rgba(22, 18, 28, 0.98), rgba(10, 8, 16, 0.98));
        box-shadow: 0 0 0 1px rgba(255, 248, 235, 0.04) inset, 0 24px 56px rgba(0, 0, 0, 0.55), 0 0 40px rgba(212, 175, 55, 0.1);
        color: #f5f0e6;
      }
      .mati-exit-guard--trivia .mati-exit-guard__badge {
        border: 1px solid rgba(212, 175, 55, 0.35);
        background: rgba(212, 175, 55, 0.1);
        font-family: "Oswald", "Rajdhani", sans-serif;
        color: #f0e6c8;
      }
      .mati-exit-guard--trivia .mati-exit-guard__dot { background: #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.8); }
      .mati-exit-guard--trivia .mati-exit-guard__title {
        font-family: "Oswald", sans-serif;
        text-transform: uppercase;
        color: #fff8ef;
      }
      .mati-exit-guard--trivia .mati-exit-guard__message,
      .mati-exit-guard--trivia .mati-exit-guard__btn {
        font-family: "Rajdhani", "Oswald", sans-serif;
      }
      .mati-exit-guard--trivia .mati-exit-guard__message { color: rgba(245, 240, 230, 0.82); }
      .mati-exit-guard--trivia .mati-exit-guard__btn--stay {
        color: #1a1208;
        background: linear-gradient(135deg, #f0e6c8, #d4af37 55%, #b8922a);
        box-shadow: 0 8px 20px rgba(212, 175, 55, 0.28);
      }
      .mati-exit-guard--trivia .mati-exit-guard__btn--leave {
        color: #f0e6c8;
        background: rgba(255, 255, 255, 0.04);
        border-color: rgba(212, 175, 55, 0.35);
      }

      /* Memory pairs / chronicle */
      .mati-exit-guard--chronicle {
        background:
          radial-gradient(ellipse 70% 55% at 50% 15%, rgba(212, 168, 67, 0.16), transparent 55%),
          rgba(10, 22, 40, 0.72);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      .mati-exit-guard--chronicle .mati-exit-guard__panel {
        border-radius: 1.1rem;
        border: 2px solid #2a1808;
        background:
          linear-gradient(165deg, #f6ead0 0%, #e8d3a8 100%);
        box-shadow:
          0 0 0 3px #5c3d1e,
          0 22px 48px rgba(0, 0, 0, 0.4);
        color: #3d2914;
      }
      .mati-exit-guard--chronicle .mati-exit-guard__badge {
        border: 1px solid rgba(92, 61, 30, 0.35);
        background: rgba(245, 158, 11, 0.18);
        font-family: "Quicksand", sans-serif;
        color: #7c2d12;
      }
      .mati-exit-guard--chronicle .mati-exit-guard__dot { background: #b45309; }
      .mati-exit-guard--chronicle .mati-exit-guard__title {
        font-family: "Cinzel Decorative", serif;
        color: #3d2914;
        letter-spacing: 0.02em;
        text-transform: none;
      }
      .mati-exit-guard--chronicle .mati-exit-guard__message {
        font-family: "Quicksand", sans-serif;
        color: #5c4228;
      }
      .mati-exit-guard--chronicle .mati-exit-guard__btn {
        font-family: "Cinzel Decorative", serif;
        letter-spacing: 0.04em;
        text-transform: none;
        border-radius: 0.65rem;
      }
      .mati-exit-guard--chronicle .mati-exit-guard__btn--stay {
        color: #fde68a;
        background: linear-gradient(180deg, #14532d, #0f766e);
        border-color: #2a1808;
        box-shadow: 0 6px 0 #2a1808;
      }
      .mati-exit-guard--chronicle .mati-exit-guard__btn--leave {
        color: #3d2914;
        background: #f3e4c4;
        border-color: #2a1808;
      }

      /* Slide puzzle / nature */
      .mati-exit-guard--nature {
        background:
          radial-gradient(ellipse 75% 50% at 50% 18%, rgba(82, 183, 136, 0.16), transparent 55%),
          rgba(13, 40, 24, 0.76);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      .mati-exit-guard--nature .mati-exit-guard__panel {
        border-radius: 1.25rem;
        border: 1px solid rgba(64, 145, 108, 0.4);
        background: linear-gradient(165deg, rgba(250, 248, 242, 0.97), rgba(245, 241, 232, 0.96));
        box-shadow: 0 24px 52px rgba(13, 40, 24, 0.4);
        color: #1a2e1a;
      }
      .mati-exit-guard--nature .mati-exit-guard__badge {
        border: 1px solid rgba(64, 145, 108, 0.35);
        background: rgba(64, 145, 108, 0.12);
        font-family: "Nunito", sans-serif;
        color: #1b4332;
      }
      .mati-exit-guard--nature .mati-exit-guard__dot { background: #40916c; }
      .mati-exit-guard--nature .mati-exit-guard__title {
        font-family: "Fraunces", serif;
        color: #0d2818;
        text-transform: none;
      }
      .mati-exit-guard--nature .mati-exit-guard__message {
        font-family: "Nunito", sans-serif;
        color: #5c6e5f;
      }
      .mati-exit-guard--nature .mati-exit-guard__btn {
        font-family: "Nunito", sans-serif;
        text-transform: none;
        letter-spacing: 0.02em;
      }
      .mati-exit-guard--nature .mati-exit-guard__btn--stay {
        color: #f5f1e8;
        background: linear-gradient(135deg, #40916c, #1b4332);
        box-shadow: 0 8px 18px rgba(27, 67, 50, 0.28);
      }
      .mati-exit-guard--nature .mati-exit-guard__btn--leave {
        color: #1b4332;
        background: transparent;
        border-color: rgba(64, 145, 108, 0.45);
      }

      /* Spot the difference / festival */
      .mati-exit-guard--festival {
        background:
          radial-gradient(ellipse 70% 50% at 50% 15%, rgba(254, 202, 87, 0.22), transparent 55%),
          rgba(47, 27, 12, 0.62);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      .mati-exit-guard--festival .mati-exit-guard__panel {
        border-radius: 1.4rem;
        border: 3px solid #2f1b0c;
        background: linear-gradient(160deg, #fff9ef, #ffd89b);
        box-shadow: 0 18px 0 #5b4bb4, 0 28px 48px rgba(0, 0, 0, 0.35);
        color: #2f1b0c;
      }
      .mati-exit-guard--festival .mati-exit-guard__badge {
        border: 2px solid #2f1b0c;
        background: #feca57;
        font-family: "Poppins", sans-serif;
        color: #2f1b0c;
      }
      .mati-exit-guard--festival .mati-exit-guard__dot { background: #eb3b5a; }
      .mati-exit-guard--festival .mati-exit-guard__title {
        font-family: "Bebas Neue", sans-serif;
        font-size: clamp(1.8rem, 5vw, 2.25rem);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #5b4bb4;
      }
      .mati-exit-guard--festival .mati-exit-guard__message {
        font-family: "Poppins", sans-serif;
        color: #2f1b0c;
      }
      .mati-exit-guard--festival .mati-exit-guard__btn {
        font-family: "Poppins", sans-serif;
        border-radius: 999px;
        border-width: 2px;
        border-color: #2f1b0c;
        text-transform: uppercase;
      }
      .mati-exit-guard--festival .mati-exit-guard__btn--stay {
        color: #fff;
        background: linear-gradient(135deg, #e76f51, #eb3b5a);
        box-shadow: 0 6px 0 #2f1b0c;
      }
      .mati-exit-guard--festival .mati-exit-guard__btn--leave {
        color: #2f1b0c;
        background: #fffdf7;
      }

      /* True/False sprint / scroll */
      .mati-exit-guard--scroll {
        background:
          radial-gradient(ellipse 70% 50% at 50% 18%, rgba(184, 134, 11, 0.14), transparent 55%),
          rgba(18, 12, 8, 0.72);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      .mati-exit-guard--scroll .mati-exit-guard__panel {
        border-radius: 0.35rem 1.1rem 0.35rem 1.1rem;
        border: 1px solid rgba(107, 68, 35, 0.35);
        background:
          linear-gradient(165deg, #faf3e3 0%, #f4e4c1 55%, #e8d4a8 100%);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.5),
          0 20px 48px rgba(26, 15, 8, 0.4);
        color: #2c1810;
      }
      .mati-exit-guard--scroll .mati-exit-guard__badge {
        border: 1px solid rgba(107, 68, 35, 0.28);
        background: rgba(184, 134, 11, 0.14);
        font-family: "Cinzel", Georgia, serif;
        color: #6b4423;
      }
      .mati-exit-guard--scroll .mati-exit-guard__dot { background: #8b2635; }
      .mati-exit-guard--scroll .mati-exit-guard__title {
        font-family: "Cinzel", Georgia, serif;
        text-transform: none;
        color: #2c1810;
      }
      .mati-exit-guard--scroll .mati-exit-guard__message {
        font-family: "Crimson Pro", Georgia, serif;
        font-style: italic;
        color: #6b4423;
      }
      .mati-exit-guard--scroll .mati-exit-guard__btn {
        font-family: "Cinzel", Georgia, serif;
        text-transform: none;
        letter-spacing: 0.04em;
        border-radius: 0.35rem;
      }
      .mati-exit-guard--scroll .mati-exit-guard__btn--stay {
        color: #faf3e3;
        background: linear-gradient(135deg, #6b4423, #2c1810);
      }
      .mati-exit-guard--scroll .mati-exit-guard__btn--leave {
        color: #2c1810;
        background: transparent;
        border-color: rgba(107, 68, 35, 0.45);
      }
    `;
    document.head.appendChild(style);
  }

  function ensureFonts(themeKey) {
    const cfg = THEMES[themeKey] || THEMES.trivia;
    const id = `mati-game-exit-guard-fonts-${themeKey}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = cfg.fonts;
    document.head.appendChild(link);
  }

  function applyThemeCopy() {
    if (!root) return;
    const cfg = THEMES[theme] || THEMES.trivia;
    const wasOpen = root.classList.contains("is-open");
    root.className = `mati-exit-guard mati-exit-guard--${theme}`;
    if (wasOpen) root.classList.add("is-open");

    const badge = root.querySelector("[data-exit-badge]");
    const title = root.querySelector("#mati-exit-guard-title");
    const message = root.querySelector("[data-exit-message]");
    const stay = root.querySelector("[data-exit-stay]");
    const leave = root.querySelector("[data-exit-leave]");

    if (badge) {
      badge.innerHTML = `<span class="mati-exit-guard__dot" aria-hidden="true"></span>${cfg.badge}`;
    }
    if (title) title.textContent = cfg.title;
    if (message) message.textContent = cfg.message;
    if (stay) stay.textContent = cfg.stay;
    if (leave) leave.textContent = cfg.leave;
  }

  function buildModal() {
    if (root) {
      applyThemeCopy();
      return root;
    }
    injectStyles();
    ensureFonts(theme);

    root = document.createElement("div");
    root.id = "mati-exit-guard";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "mati-exit-guard-title");
    root.innerHTML = `
      <div class="mati-exit-guard__panel">
        <div class="mati-exit-guard__badge" data-exit-badge></div>
        <h2 class="mati-exit-guard__title" id="mati-exit-guard-title"></h2>
        <p class="mati-exit-guard__message" data-exit-message></p>
        <div class="mati-exit-guard__actions">
          <button type="button" class="mati-exit-guard__btn mati-exit-guard__btn--stay" data-exit-stay></button>
          <button type="button" class="mati-exit-guard__btn mati-exit-guard__btn--leave" data-exit-leave></button>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    applyThemeCopy();

    root.querySelector("[data-exit-stay]")?.addEventListener("click", close);
    root.querySelector("[data-exit-leave]")?.addEventListener("click", () => {
      const href = pendingHref;
      pendingHref = null;
      close();
      if (href) window.location.href = href;
    });
    root.addEventListener("click", (e) => {
      if (e.target === root) close();
    });

    return root;
  }

  function isActive() {
    try {
      return Boolean(isActiveFn());
    } catch {
      return false;
    }
  }

  function open(href) {
    pendingHref = href;
    const modal = buildModal();
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add("is-open"));
    modal.querySelector("[data-exit-stay]")?.focus();
  }

  function close() {
    if (!root) return;
    root.classList.remove("is-open");
    window.setTimeout(() => {
      if (root && !root.classList.contains("is-open")) root.hidden = true;
    }, 220);
    pendingHref = null;
  }

  function shouldGuardHref(href) {
    if (!href) return false;
    try {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return true;
      if (url.pathname === window.location.pathname && url.hash) return false;
      return url.href !== window.location.href;
    } catch {
      return true;
    }
  }

  function isInternalNavLink(anchor) {
    if (!anchor || anchor.tagName !== "A") return false;
    if (anchor.hasAttribute("download")) return false;
    if (anchor.target === "_blank") return false;
    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return false;
    if (anchor.closest("#settings-modal")) return false;
    if (anchor.closest("[data-exit-ignore]")) return false;
    return shouldGuardHref(anchor.href);
  }

  function onDocumentClick(e) {
    if (!isActive()) return;
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const anchor = e.target.closest("a[href]");
    if (!isInternalNavLink(anchor)) return;

    e.preventDefault();
    e.stopPropagation();
    open(anchor.href);
  }

  function onKeyDown(e) {
    if (!root || root.hidden || !root.classList.contains("is-open")) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  function init(options = {}) {
    if (typeof options.isActive === "function") {
      isActiveFn = options.isActive;
    }
    if (options.theme && THEMES[options.theme]) {
      theme = options.theme;
    }
    try {
      ensureFonts(theme);
      buildModal();
      document.addEventListener("click", onDocumentClick, true);
      document.addEventListener("keydown", onKeyDown);
    } catch (error) {
      console.warn("MatiGameExitGuard init failed:", error);
    }
  }

  return {
    init,
    open,
    close,
    isActive,
  };
})();

window.MatiGameExitGuard = MatiGameExitGuard;
