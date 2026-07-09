/**
 * Google Sign-In UI helpers for login and registration pages.
 */
const MatiAuthOAuth = (() => {
  function oauthSectionEnabled() {
    return Boolean(MatiSupabaseAuth?.googleSignInEnabled?.());
  }

  function hideOAuthSection() {
    document
      .querySelectorAll("[data-auth-oauth-section]")
      .forEach((el) => el.classList.add("hidden"));
  }

  async function handleRedirectIfNeeded(redirectTarget) {
    if (!MatiSupabaseAuth?.completeOAuthRedirect) return null;

    const user = await MatiSupabaseAuth.completeOAuthRedirect();
    if (!user) return null;

    await MatiAuth.restoreSession?.();

    if (
      typeof MatiAdminAuth !== "undefined" &&
      (await MatiAdminAuth.isAdmin())
    ) {
      window.location.href = "admin.html";
      return user;
    }

    if (redirectTarget === "admin.html") {
      if (
        typeof MatiAdminAuth !== "undefined" &&
        (await MatiAdminAuth.isAdmin())
      ) {
        window.location.href = "admin.html";
        return user;
      }
      window.location.href = "login.html?redirect=admin.html&error=not_admin";
      return user;
    }

    window.location.href = redirectTarget || "index.html";
    return user;
  }

  function bindGoogleButton(buttonId, redirectTarget) {
    const button = document.getElementById(buttonId);
    const section = button?.closest("[data-auth-oauth-section]");

    if (!oauthSectionEnabled()) {
      hideOAuthSection();
      return;
    }

    section?.classList.remove("hidden");

    button?.addEventListener("click", async () => {
      button.disabled = true;
      const result = await MatiSupabaseAuth.signInWithGoogle(redirectTarget);
      if (!result?.ok) {
        button.disabled = false;
        return result;
      }
      return result;
    });
  }

  return {
    oauthSectionEnabled,
    hideOAuthSection,
    handleRedirectIfNeeded,
    bindGoogleButton,
  };
})();

window.MatiAuthOAuth = MatiAuthOAuth;
