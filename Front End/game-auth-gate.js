/**
 * Requires a player account before opening the Game Hall or individual games.
 * Visual system matches login.html (auth-portal-* from auth.css).
 */
const MatiGameAuthGate = (() => {
  const STYLE_ID = "mati-game-auth-gate-style";
  const AUTH_CSS_ID = "mati-game-auth-gate-auth-css";
  const GAME_PATHS = new Set([
    "game.html",
    "trivia.html",
    "memorypairs.html",
    "spotthedifference.html",
    "slidepuzzle.html",
    "truefalsesprint.html",
  ]);

  let root = null;
  let returnTo = "game.html";
  let navBound = false;
  let allowed = false;

  function ensureAuthStyles() {
    if (!document.getElementById(AUTH_CSS_ID)) {
      const palette = document.createElement("link");
      palette.rel = "stylesheet";
      palette.href = "heritage-palette.css";
      document.head.appendChild(palette);
    }

    if (!document.querySelector('link[href="auth.css"]')) {
      const auth = document.createElement("link");
      auth.id = AUTH_CSS_ID;
      auth.rel = "stylesheet";
      auth.href = "auth.css";
      document.head.appendChild(auth);
    }
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .game-auth-gate {
        --portal-navy: #0c2340;
        --portal-navy-soft: #163a5f;
        --portal-forest: #047857;
        position: fixed;
        inset: 0;
        z-index: 12000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: clamp(0.85rem, 3vw, 1.75rem);
        background: rgba(8, 16, 30, 0.52);
        backdrop-filter: blur(14px) saturate(1.1);
        -webkit-backdrop-filter: blur(14px) saturate(1.1);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1);
      }

      .game-auth-gate.is-open {
        opacity: 1;
        pointer-events: auto;
      }

      .game-auth-gate__dialog {
        display: block;
        width: min(100%, 36rem);
        min-height: 0;
        max-height: calc(100vh - 1.75rem);
        border-radius: 1.15rem;
        overflow: hidden;
        background: #fff;
        box-shadow:
          0 0 0 1px rgba(255, 255, 255, 0.06),
          0 32px 80px rgba(8, 16, 30, 0.42);
        transform: translateY(18px) scale(0.98);
        opacity: 0;
        transition:
          transform 0.55s cubic-bezier(0.22, 1, 0.36, 1),
          opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1);
      }

      .game-auth-gate.is-open .game-auth-gate__dialog {
        transform: translateY(0) scale(1);
        opacity: 1;
      }

      .game-auth-gate__dialog .auth-portal-form {
        padding: clamp(2rem, 4.5vw, 3.25rem);
      }

      .game-auth-gate__dialog .auth-portal-back {
        position: absolute;
        top: 1.25rem;
        right: 1.25rem;
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.55rem 0.95rem;
        border-radius: 999px;
        font-family: "Source Sans 3", system-ui, sans-serif;
        font-size: 0.85rem;
        font-weight: 600;
        color: #64748b;
        text-decoration: none;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
      }

      .game-auth-gate__dialog .auth-portal-back svg {
        width: 0.95rem;
        height: 0.95rem;
      }

      .game-auth-gate__dialog .auth-portal-back:hover {
        color: var(--portal-navy);
        border-color: #cbd5e1;
        background: #fff;
        transform: translateX(-2px);
      }

      .game-auth-gate__dialog .auth-portal-header {
        margin-bottom: 2rem;
        text-align: center;
      }

      .game-auth-gate__dialog .auth-portal-logo {
        display: flex;
        justify-content: center;
        margin-bottom: 0.5rem;
      }

      .game-auth-gate__dialog .auth-portal-logo__image {
        height: 96px;
        margin-top: 0.25rem;
        margin-bottom: 0rem;
      }

      .game-auth-gate__dialog .auth-portal-header__welcome {
        margin: 1.35rem 0 0;
        font-family: "Oswald", "Source Sans 3", system-ui, sans-serif;
        font-size: clamp(1.25rem, 5cqi, 2rem);
        font-weight: 600;
        letter-spacing: 0.05em;
        line-height: 1.2;
        white-space: nowrap;
        text-transform: uppercase;
        color: var(--portal-forest);
      }

      .game-auth-gate__dialog .auth-portal-actions {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        margin-top: 0.6rem;
      }

      .game-auth-gate__dialog .auth-portal-btn {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-height: 3.25rem;
        padding: 0 1.15rem;
        border-radius: 0.6rem;
        font-family: "Source Sans 3", system-ui, sans-serif;
        font-size: 1.08rem;
        font-weight: 700;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        text-decoration: none;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
      }

      .game-auth-gate__dialog .auth-portal-btn--primary {
        border: 1px solid var(--portal-navy);
        color: #fff;
        background: linear-gradient(180deg, var(--portal-navy-soft) 0%, var(--portal-navy) 100%);
        box-shadow: 0 10px 24px rgba(12, 35, 64, 0.22);
      }

      .game-auth-gate__dialog .auth-portal-btn--primary:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 14px 28px rgba(12, 35, 64, 0.28);
      }

      .game-auth-gate__dialog .auth-portal-btn--primary:active:not(:disabled) {
        transform: translateY(0);
      }

      .game-auth-gate__dialog .auth-portal-btn--outline {
        border: 1px solid var(--portal-navy);
        color: var(--portal-navy);
        background: #fff;
        box-shadow: 0 2px 8px rgba(12, 35, 64, 0.08);
      }

      .game-auth-gate__dialog .auth-portal-btn--outline:hover {
        background: #f8fafc;
        border-color: var(--portal-navy-soft);
        box-shadow: 0 4px 12px rgba(12, 35, 64, 0.12);
      }

      @media (prefers-reduced-motion: reduce) {
        .game-auth-gate,
        .game-auth-gate__dialog {
          transition-duration: 0.01ms !important;
        }
        .game-auth-gate__dialog {
          transform: none;
        }
      }

      @media (max-width: 640px) {
        .game-auth-gate__dialog {
          width: min(100%, 28rem);
        }

        .game-auth-gate__dialog .auth-portal-form {
          padding: 2rem;
        }
      }

      @media (max-width: 480px) {
        .game-auth-gate__dialog {
          width: min(100%, 24rem);
        }

        .game-auth-gate__dialog .auth-portal-form {
          padding: 1.5rem;
        }

        .game-auth-gate__dialog .auth-portal-header {
          text-align: center;
        }

        .game-auth-gate__dialog .auth-portal-logo {
          display: flex;
          justify-content: center;
        }

        .game-auth-gate__dialog .auth-portal-logo__image {
          margin-left: auto;
          margin-right: auto;
        }
      }

      body.game-auth-locked > :not(.game-auth-gate):not(script):not(style):not(svg):not(link):not(audio) {
        pointer-events: none;
        user-select: none;
      }

      body.game-auth-locked .site-header,
      body.game-auth-locked .game-auth-gate {
        pointer-events: auto;
        user-select: auto;
      }
    `;
    document.head.appendChild(style);
  }

  function pathFromHref(href) {
    try {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return null;
      const parts = url.pathname.split("/");
      return (parts[parts.length - 1] || "").toLowerCase();
    } catch {
      return null;
    }
  }

  function isGameHref(href) {
    const file = pathFromHref(href);
    return Boolean(file && GAME_PATHS.has(file));
  }

  function currentPageIsGame() {
    const parts = window.location.pathname.split("/");
    const file = (parts[parts.length - 1] || "").toLowerCase();
    return GAME_PATHS.has(file);
  }

  function authUrl(page, redirect) {
    const target = encodeURIComponent(redirect || "game.html");
    return `${page}?redirect=${target}`;
  }

  async function checkLoggedIn() {
    if (typeof MatiAuth?.restoreSession === "function") {
      await MatiAuth.restoreSession();
    }
    return Boolean(MatiAuth?.isLoggedIn?.());
  }

  function buildModal() {
    if (root) return root;
    ensureAuthStyles();
    injectStyles();

    root = document.createElement("div");
    root.id = "game-auth-gate";
    root.className = "game-auth-gate";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "game-auth-gate-title");
    root.innerHTML = `
      <div class="auth-portal-card game-auth-gate__dialog">
        <main class="auth-portal-form">
          <a href="index.html" class="auth-portal-back" data-gate-close aria-label="Back to visitor portal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Visitor portal</span>
          </a>

          <div class="auth-portal-form__inner">
            <header class="auth-portal-header">
              <div class="auth-portal-logo">
                <img
                  src="logo/MatiHeritage logo.png"
                  alt="Mati Heritage 3D"
                  class="auth-portal-logo__image"
                  style="height: 96px; margin-top: 0.25rem; margin-bottom: 0rem"
                />
              </div>
              <p class="auth-portal-header__welcome">Register to play</p>
            </header>

            <div class="auth-portal-actions">
              <a href="#" class="auth-portal-btn auth-portal-btn--primary" data-gate-register>
                <span class="auth-portal-btn__label">Register account</span>
              </a>
              <a href="#" class="auth-portal-btn auth-portal-btn--outline" data-gate-login>
                <span class="auth-portal-btn__label">Sign in</span>
              </a>
            </div>
          </div>
        </main>
      </div>
    `;
    document.body.appendChild(root);

    root.querySelector("[data-gate-register]")?.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = authUrl("userregistration.html", returnTo);
    });
    root.querySelector("[data-gate-login]")?.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = authUrl("login.html", returnTo);
    });
    root.querySelector("[data-gate-close]")?.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = "index.html";
    });

    root.addEventListener("click", (event) => {
      if (event.target === root) event.stopPropagation();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && root?.classList.contains("is-open")) {
        event.preventDefault();
        window.location.href = "index.html";
      }
    });

    return root;
  }

  function open(options = {}) {
    returnTo = options.returnTo || "game.html";
    allowed = false;
    const modal = buildModal();
    modal.hidden = false;
    document.body.classList.add("game-auth-locked");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => modal.classList.add("is-open"));
    });
    modal.querySelector("[data-gate-register]")?.focus();
    return false;
  }

  function close() {
    if (!root) return;
    root.classList.remove("is-open");
    document.body.classList.remove("game-auth-locked");
    window.setTimeout(() => {
      if (root && !root.classList.contains("is-open")) root.hidden = true;
    }, 320);
  }

  function isAllowed() {
    return allowed;
  }

  async function guardPage(options = {}) {
    const loggedIn = await checkLoggedIn();
    if (loggedIn) {
      allowed = true;
      close();
      return true;
    }

    const pageReturn =
      options.returnTo ||
      window.location.pathname.split("/").pop() ||
      "game.html";
    open({ returnTo: pageReturn });
    return false;
  }

  function bindNavigation() {
    if (navBound) return;
    navBound = true;

    document.addEventListener(
      "click",
      async (event) => {
        const link = event.target.closest("a[href]");
        if (!link) return;
        if (link.target === "_blank" || link.hasAttribute("download")) return;
        if (link.closest(".game-auth-gate")) return;

        const href = link.getAttribute("href");
        if (!href || !isGameHref(link.href || href)) return;

        const loggedIn = await checkLoggedIn();
        if (loggedIn) return;

        event.preventDefault();
        event.stopPropagation();

        const file = pathFromHref(link.href || href) || "game.html";
        open({ returnTo: file });
      },
      true,
    );
  }

  async function init(options = {}) {
    bindNavigation();

    if (options.guardPage !== false && currentPageIsGame()) {
      const ok = await guardPage({ returnTo: options.returnTo });
      if (!ok && options.onBlocked) options.onBlocked();
      return ok;
    }

    return true;
  }

  return {
    init,
    open,
    close,
    guardPage,
    bindNavigation,
    isAllowed,
    isGameHref,
    checkLoggedIn,
  };
})();

window.MatiGameAuthGate = MatiGameAuthGate;

if (typeof document !== "undefined") {
  const bootNavGate = () => MatiGameAuthGate.bindNavigation();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootNavGate);
  } else {
    bootNavGate();
  }
}
