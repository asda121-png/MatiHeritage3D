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

    const oauthResult = await MatiSupabaseAuth.completeOAuthRedirect();
    if (!oauthResult) return null;

    const user = oauthResult.user;

    await MatiAuth.restoreSession?.();

    const nextTarget =
      redirectTarget || oauthResult.redirectTarget || "index.html";

    if (!oauthResult.hasEmailPasswordCredential) {
      window.location.href =
        MatiSupabaseAuth.passwordSetupRedirectUrl?.(nextTarget);
      return user;
    }

    if (
      typeof MatiAdminAuth !== "undefined" &&
      (await MatiAdminAuth.isAdmin())
    ) {
      window.location.href = "admin.html";
      return user;
    }

    if (nextTarget === "admin.html") {
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

    window.location.href = nextTarget;
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
