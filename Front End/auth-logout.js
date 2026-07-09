/** Pixel logout overlay for visitor / game pages */
(function () {
  "use strict";

  let logoutInProgress = false;

  function ensureOverlay() {
    let overlay = document.getElementById("pixel-logout-overlay");
    if (overlay) return overlay;

    const pixels = Array.from({ length: 9 }, () => "<span></span>").join("");

    overlay = document.createElement("div");
    overlay.id = "pixel-logout-overlay";
    overlay.className = "pixel-logout-overlay";
    overlay.hidden = true;
    overlay.setAttribute("aria-live", "polite");
    overlay.setAttribute("aria-busy", "true");
    overlay.innerHTML = `
      <div class="pixel-logout-overlay__bg" aria-hidden="true"></div>
      <div class="pixel-logout-overlay__panel">
        <div class="pixel-logout-overlay__loader" aria-hidden="true">${pixels}</div>
        <p class="pixel-logout-overlay__text">Logging out..</p>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function startPixelLogout(redirect = "login.html") {
    if (logoutInProgress) return;
    logoutInProgress = true;

    const overlay = ensureOverlay();
    const showMs = 2100;
    const exitMs = 580;

    overlay.hidden = false;
    overlay.removeAttribute("hidden");
    overlay.classList.remove("is-exiting");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => overlay.classList.add("is-active"));
    });

    window.setTimeout(() => {
      overlay.classList.add("is-exiting");
      window.setTimeout(async () => {
        if (typeof MatiAuth !== "undefined") {
          await MatiAuth.logout();
        }
        window.location.href = redirect;
      }, exitMs);
    }, showMs);
  }

  function bind(options = {}) {
    const linkSelector = options.linkSelector || "#site-logout-link";
    const redirect = options.redirect || "login.html";

    document.addEventListener("click", (event) => {
      const link = event.target.closest(linkSelector);
      if (!link) return;
      event.preventDefault();
      startPixelLogout(redirect);
    });
  }

  window.MatiAuthLogout = {
    bind,
    start: startPixelLogout,
  };
})();
