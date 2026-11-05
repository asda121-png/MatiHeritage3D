(() => {
  const LOCK_NAME = "mati-heritage-active-game";
  const STORAGE_KEY = "matiHeritageActiveGame";
  const STORAGE_TTL_MS = 30_000;
  const STORAGE_REFRESH_MS = 5_000;
  const STORAGE_VERIFY_MS = 100;
  const ownerId =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  let active = false;
  let pendingClaim = null;
  let releaseWebLock = null;
  let refreshInterval = null;
  let noticeTimeout = null;
  let notice = null;

  function showNotice(title, message) {
    if (!notice) {
      const style = document.createElement("style");
      style.textContent = `
        .mati-game-lock-notice {
          position: fixed;
          z-index: 10000;
          top: 1rem;
          right: 1rem;
          display: flex;
          align-items: flex-start;
          gap: 0.8rem;
          width: min(24rem, calc(100vw - 2rem));
          padding: 1rem 1rem 1rem 1.1rem;
          border: 1px solid rgba(47, 125, 94, 0.28);
          border-radius: 1rem;
          background: #fffdf7;
          color: #23352c;
          box-shadow: 0 16px 42px rgba(21, 43, 33, 0.2);
          font: 600 0.9rem/1.45 system-ui, sans-serif;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transform: translateY(-0.5rem);
          transition: opacity 180ms ease, transform 180ms ease, visibility 180ms;
        }
        .mati-game-lock-notice.is-visible {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          transform: translateY(0);
        }
        .mati-game-lock-notice__icon {
          display: grid;
          width: 1.8rem;
          height: 1.8rem;
          flex: 0 0 1.8rem;
          place-items: center;
          border-radius: 50%;
          background: #e4f1e9;
          color: #2f7d5e;
          font-size: 1rem;
          font-weight: 800;
        }
        .mati-game-lock-notice__title {
          display: block;
          margin: 0 1rem 0.15rem 0;
          color: #173c2d;
          font-weight: 800;
        }
        .mati-game-lock-notice__message {
          margin: 0;
          color: #52645a;
        }
        .mati-game-lock-notice__close {
          position: absolute;
          top: 0.55rem;
          right: 0.65rem;
          border: 0;
          padding: 0.1rem 0.3rem;
          background: transparent;
          color: #52645a;
          font: inherit;
          font-size: 1.2rem;
          line-height: 1;
          cursor: pointer;
        }
        .mati-game-lock-notice__close:focus-visible {
          outline: 2px solid #2f7d5e;
          outline-offset: 2px;
          border-radius: 0.2rem;
        }
        @media (prefers-reduced-motion: reduce) {
          .mati-game-lock-notice { transition: none; }
        }
      `;
      document.head.appendChild(style);

      notice = document.createElement("div");
      notice.className = "mati-game-lock-notice";
      notice.setAttribute("role", "status");
      notice.setAttribute("aria-live", "polite");
      notice.setAttribute("aria-hidden", "true");

      const icon = document.createElement("span");
      icon.className = "mati-game-lock-notice__icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "!";

      const content = document.createElement("div");
      content.className = "mati-game-lock-notice__content";
      const titleEl = document.createElement("strong");
      titleEl.className = "mati-game-lock-notice__title";
      titleEl.dataset.noticeTitle = "";
      const messageEl = document.createElement("p");
      messageEl.className = "mati-game-lock-notice__message";
      messageEl.dataset.noticeMessage = "";
      content.append(titleEl, messageEl);

      const close = document.createElement("button");
      close.className = "mati-game-lock-notice__close";
      close.type = "button";
      close.setAttribute("aria-label", "Dismiss message");
      close.textContent = "×";
      close.addEventListener("click", hideNotice);

      notice.append(icon, content, close);
      document.body.appendChild(notice);
    }

    notice.querySelector("[data-notice-title]").textContent = title;
    notice.querySelector("[data-notice-message]").textContent = message;
    window.clearTimeout(noticeTimeout);
    notice.setAttribute("aria-hidden", "false");
    notice.classList.add("is-visible");
    noticeTimeout = window.setTimeout(hideNotice, 6000);
  }

  function hideNotice() {
    if (!notice) return;
    notice.classList.remove("is-visible");
    notice.setAttribute("aria-hidden", "true");
    window.clearTimeout(noticeTimeout);
    noticeTimeout = null;
  }

  function showConflict() {
    showNotice(
      "Game already in progress",
      "Finish the game in your other tab before starting another.",
    );
  }

  async function acquireWebLock() {
    let resolveClaim;
    const claimResult = new Promise((resolve) => {
      resolveClaim = resolve;
    });

    navigator.locks
      .request(LOCK_NAME, { ifAvailable: true }, async (lock) => {
        if (!lock) {
          resolveClaim(false);
          return;
        }

        let resolveRelease;
        const releaseSignal = new Promise((resolve) => {
          resolveRelease = resolve;
        });

        active = true;
        releaseWebLock = resolveRelease;
        resolveClaim(true);
        await releaseSignal;
        active = false;
        releaseWebLock = null;
      })
      .catch((error) => {
        console.error("Could not acquire the active game lock:", error);
        resolveClaim(null);
      });

    const acquired = await claimResult;
    if (acquired === null) {
      showNotice(
        "Could not check game status",
        "Please try again before starting a game.",
      );
      return false;
    }
    if (acquired === false) {
      showConflict();
      return false;
    }

    return true;
  }

  function readStoredLock() {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch (error) {
      console.error("Could not read the active game lock:", error);
      return null;
    }
  }

  function writeStoredLock(gameName) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ownerId,
        gameName,
        expiresAt: Date.now() + STORAGE_TTL_MS,
      }),
    );
  }

  async function acquireStorageLock(gameName) {
    try {
      const currentLock = readStoredLock();
      if (
        currentLock &&
        currentLock.ownerId !== ownerId &&
        currentLock.expiresAt > Date.now()
      ) {
        showConflict();
        return false;
      }

      writeStoredLock(gameName);
      await new Promise((resolve) =>
        window.setTimeout(resolve, STORAGE_VERIFY_MS),
      );

      const verifiedLock = readStoredLock();
      if (verifiedLock?.ownerId !== ownerId) {
        showConflict();
        return false;
      }

      active = true;
      refreshInterval = window.setInterval(() => {
        try {
          const current = readStoredLock();
          if (current?.ownerId === ownerId) writeStoredLock(gameName);
        } catch (error) {
          console.error("Could not refresh the active game lock:", error);
        }
      }, STORAGE_REFRESH_MS);

      return true;
    } catch (error) {
      console.error("Could not acquire the active game lock:", error);
      showNotice(
        "Could not check game status",
        "Please try again before starting a game.",
      );
      return false;
    }
  }

  function acquire(gameName) {
    if (active) return Promise.resolve(true);
    if (pendingClaim) return pendingClaim;

    const claim = navigator.locks?.request
      ? acquireWebLock()
      : acquireStorageLock(gameName);
    pendingClaim = claim.finally(() => {
      pendingClaim = null;
    });
    return pendingClaim;
  }

  function release() {
    if (releaseWebLock) {
      const release = releaseWebLock;
      releaseWebLock = null;
      release();
      return;
    }

    if (refreshInterval !== null) {
      window.clearInterval(refreshInterval);
      refreshInterval = null;
    }

    if (!active) return;
    active = false;

    try {
      const currentLock = readStoredLock();
      if (currentLock?.ownerId === ownerId) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error("Could not release the active game lock:", error);
    }
  }

  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) release();
  });

  window.MatiGameSessionLock = Object.freeze({ acquire, release });
})();
