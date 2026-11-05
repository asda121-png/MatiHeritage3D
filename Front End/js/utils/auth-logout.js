/** Shared logout feedback for visitor pages */
(function () {
  "use strict";

  let logoutInProgress = false;

  function startLogout(redirect = "login.html", link, originalText) {
    if (logoutInProgress) return;
    logoutInProgress = true;

    window.setTimeout(() => {
      void (async () => {
        try {
          if (typeof MatiAuth !== "undefined") {
            await MatiAuth.logout();
          }
          window.location.href = redirect;
        } catch (error) {
          console.error("Logout failed.", error);
          logoutInProgress = false;
          if (link) {
            link.textContent = originalText;
            link.style.pointerEvents = "";
            link.style.opacity = "";
            link.removeAttribute("aria-busy");
          }
        }
      })();
    }, 500);
  }

  function bind(options = {}) {
    const linkSelector = options.linkSelector || "#site-logout-link";
    const redirect = options.redirect || "login.html";

    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest(linkSelector);
      if (!link) return;
      event.preventDefault();

      const originalText = link.textContent;
      link.textContent = "Logging out...";
      link.style.pointerEvents = "none";
      link.style.opacity = "0.6";
      link.setAttribute("aria-busy", "true");

      startLogout(redirect, link, originalText);
    });
  }

  window.MatiAuthLogout = {
    bind,
    start: startLogout,
  };
})();
