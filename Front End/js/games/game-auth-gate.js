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
    "slidepuzzle.html",
    "truefalsesprint.html",
  ]);

  let root = null;
  let returnTo = "game.html";
  let referrer = "index.html";
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
        --portal-forest: #047857;
        position: fixed;
        inset: 0;
        z-index: 12000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        background: rgba(15, 23, 42, 0.58);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }

      .game-auth-gate.is-open {
        opacity: 1;
        pointer-events: auto;
      }

      .game-auth-gate__dialog {
        display: block;
        width: 100%;
        max-width: 560px;
        border-radius: 4px;
        overflow: hidden;
        background: #fff;
        box-shadow: 0 18px 55px rgba(15, 23, 42, 0.2);
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.3s ease, transform 0.3s ease;
      }

      .game-auth-gate.is-open .game-auth-gate__dialog {
        opacity: 1;
        transform: translateY(0);
      }

      .game-auth-gate__dialog .auth-portal-form {
        padding: 3.75rem clamp(2rem, 7vw, 4rem) 3.25rem;
        position: relative;
      }

      .game-auth-gate__dialog .auth-portal-back {
        position: absolute;
        top: 1.25rem;
        right: 1.5rem;
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.4rem 0.75rem;
        border-radius: 6px;
        font-family: "Source Sans 3", system-ui, sans-serif;
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--portal-navy);
        text-decoration: none;
        background: transparent;
        border: none;
        transition: color 0.2s ease;
      }

      .game-auth-gate__dialog .auth-portal-back svg {
        width: 0.85rem;
        height: 0.85rem;
      }

      .game-auth-gate__dialog .auth-portal-back:hover {
        color: var(--portal-navy);
      }

      .game-auth-gate__dialog .auth-portal-header {
        margin-bottom: 1.5rem;
        text-align: center;
      }

      .game-auth-gate__dialog .auth-portal-header__welcome {
        margin: 0 0 0.75rem;
        font-family: "Cormorant Garamond", Georgia, serif;
        font-size: clamp(2.5rem, 7vw, 3.25rem);
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1;
        color: var(--portal-navy);
      }

      .game-auth-gate__dialog .auth-portal-header__subtitle {
        margin: 0;
        font-family: "Source Sans 3", system-ui, sans-serif;
        font-size: 1rem;
        font-weight: 400;
        line-height: 1.5;
        color: #64748b;
      }

      .game-auth-gate__dialog .auth-portal-actions {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        margin-top: 2.25rem;
      }

      .game-auth-gate__dialog .auth-portal-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-height: 3.25rem;
        padding: 0 1rem;
        border-radius: 999px;
        font-family: "Source Sans 3", system-ui, sans-serif;
        font-size: 1rem;
        font-weight: 600;
        letter-spacing: 0.01em;
        text-decoration: none;
        cursor: pointer;
        transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
      }

      .game-auth-gate__dialog .auth-portal-btn--outline {
        border: 1px solid var(--portal-forest);
        color: var(--portal-forest);
        background: #fff;
        font-weight: 600;
      }

      .game-auth-gate__dialog .auth-portal-btn--primary {
        border: 1px solid var(--portal-forest);
        color: #fff;
        background: var(--portal-forest);
      }

      .game-auth-gate__dialog .auth-portal-btn--primary:hover:not(:disabled) {
        background: #065f46;
        border-color: #065f46;
      }

      .game-auth-gate__dialog .auth-portal-btn--outline {
        border: 1px solid var(--portal-forest);
        color: var(--portal-forest);
        background: #fff;
      }

      .game-auth-gate__dialog .auth-portal-btn--outline:hover {
        background: #ecfdf5;
        border-color: var(--portal-forest);
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

      @media (max-width: 480px) {
        .game-auth-gate__dialog .auth-portal-form {
          padding: 3.5rem 1.5rem 2.5rem;
        }

        .game-auth-gate__dialog .auth-portal-header__welcome {
          font-size: 2.5rem;
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
          <button class="auth-portal-back" data-gate-close aria-label="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back</span>
          </button>

          <div class="auth-portal-form__inner">
            <header class="auth-portal-header">
              <p class="auth-portal-header__welcome">Continue to Games</p>
              <p class="auth-portal-header__subtitle">
                Sign in to explore heritage places and continue discovering Mati.
              </p>
            </header>

            <div class="auth-portal-actions">
              <a href="#" class="auth-portal-btn auth-portal-btn--primary" data-gate-login>
                <span class="auth-portal-btn__label">Sign in</span>
              </a>
              <a href="#" class="auth-portal-btn auth-portal-btn--outline" data-gate-register>
                <span class="auth-portal-btn__label">Register account</span>
              </a>
            </div>
          </div>
        </main>
      </div>
    `;
    document.body.appendChild(root);

    root
      .querySelector("[data-gate-register]")
      ?.addEventListener("click", (event) => {
        event.preventDefault();
        window.location.href = authUrl("userregistration.html", returnTo);
      });
    root
      .querySelector("[data-gate-login]")
      ?.addEventListener("click", (event) => {
        event.preventDefault();
        window.location.href = authUrl("login.html", returnTo);
      });
    root
      .querySelector("[data-gate-close]")
      ?.addEventListener("click", (event) => {
        event.preventDefault();
        window.location.href = referrer;
      });

    root.addEventListener("click", (event) => {
      if (event.target === root) event.stopPropagation();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && root?.classList.contains("is-open")) {
        event.preventDefault();
        window.location.href = referrer;
      }
    });

    return root;
  }

  function open(options = {}) {
    returnTo = options.returnTo || "game.html";
    const rawReferrer = options.referrer || document.referrer || "index.html";
    const referrerPath = pathFromHref(rawReferrer);
    referrer = (referrerPath && GAME_PATHS.has(referrerPath)) ? "index.html" : rawReferrer;
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
