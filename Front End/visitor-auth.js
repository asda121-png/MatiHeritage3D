/**
 * Visitor header auth: login/register toggle, profile, points, account link.
 */
const MatiVisitorAuth = (() => {
  let profileBound = false;
  let authListenerBound = false;
  let authSubscription = null;

  function $(sel, root = document) {
    return root.querySelector(sel);
  }

  function isVisitorPortal() {
    return (
      document.body.classList.contains("visitor-module") ||
      document.body.classList.contains("game-page")
    );
  }

  function isGamesHubPage() {
    return document.body.classList.contains("games-hub-page");
  }

  function toggleAuthChrome(loggedIn) {
    const utilities = $("#site-header-utilities");
    const authActions = $("#visitor-auth-actions");
    const showPlayerChrome = loggedIn && isVisitorPortal();

    document.body.classList.toggle("is-logged-in", loggedIn);
    document.body.classList.toggle("is-games-hub", isGamesHubPage());

    if (utilities) {
      utilities.style.display = showPlayerChrome ? "" : "none";
    }

    if (authActions && isVisitorPortal()) {
      authActions.style.display = loggedIn ? "none" : "";
    }
  }

  function updateAvatar(session) {
    const avatar = $(".site-profile__avatar");
    if (!avatar || !session?.username) return;

    if (session.avatarUrl) {
      avatar.src = session.avatarUrl;
      return;
    }

    if (typeof MatiAuth !== "undefined" && MatiAuth.getAvatarUrl) {
      avatar.src = MatiAuth.getAvatarUrl(session.username);
      return;
    }

    avatar.src = `https://i.pravatar.cc/150?u=${encodeURIComponent(session.username)}`;
  }

  function updatePointsDisplay(total) {
    const pointsEl = $("#header-total-points");
    if (pointsEl)
      pointsEl.textContent = String(Math.max(0, Number(total) || 0));
  }

  function bindProfileDropdown() {
    if (profileBound) return;
    profileBound = true;

    const profile = $(".site-profile");
    const trigger = $(".site-profile__trigger");
    if (!profile || !trigger) return;

    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      profile.classList.toggle("is-open");
    });

    trigger.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        profile.classList.toggle("is-open");
      }
    });

    document.addEventListener("click", (event) => {
      if (!profile.contains(event.target)) {
        profile.classList.remove("is-open");
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        profile.classList.remove("is-open");
      }
    });
  }

  function wireAccountLink() {
    const accountLink = $("#account-link");
    if (accountLink) accountLink.href = "account.html";
  }

  async function restoreSession() {
    if (typeof MatiAuth?.restoreSession === "function") {
      return MatiAuth.restoreSession();
    }

    const sb =
      typeof MatiSupabase?.getClient === "function"
        ? MatiSupabase.getClient()
        : null;
    if (sb?.auth?.getSession) {
      const { data } = await sb.auth.getSession();
      const user = data?.session?.user;
      if (!user) return null;
      return {
        username:
          user.user_metadata?.username || user.email?.split("@")[0] || "player",
        displayName:
          user.user_metadata?.display_name ||
          user.user_metadata?.full_name ||
          user.email ||
          "Player",
        email: user.email || null,
        avatarUrl: user.user_metadata?.avatar_url || null,
        loggedInAt: user.last_sign_in_at || new Date().toISOString(),
      };
    }

    return MatiAuth?.getSession?.() || null;
  }

  function initAuthStateSync() {
    if (authListenerBound) return;
    authListenerBound = true;

    const sb =
      typeof MatiSupabase?.getClient === "function"
        ? MatiSupabase.getClient()
        : null;
    if (!sb?.auth?.onAuthStateChange) return;

    const listener = sb.auth.onAuthStateChange(() => {
      // Defer refresh to avoid race conditions while Supabase finalizes session state.
      window.setTimeout(() => {
        void refresh();
      }, 0);
    });

    authSubscription = listener?.data?.subscription || null;
  }

  async function hydratePoints() {
    if (typeof MatiHeritagePoints?.hydrateFromCloud === "function") {
      return MatiHeritagePoints.hydrateFromCloud();
    }
    if (typeof MatiHeritagePoints?.readLocal === "function") {
      const total = MatiHeritagePoints.readLocal();
      updatePointsDisplay(total);
      return total;
    }
    updatePointsDisplay(localStorage.getItem("totalHeritagePoints") || "0");
    return 0;
  }

  async function refresh() {
    if (!isVisitorPortal()) return null;

    wireAccountLink();
    bindProfileDropdown();
    initAuthStateSync();

    const session = await restoreSession();
    const loggedIn = Boolean(session);

    toggleAuthChrome(loggedIn);

    if (!loggedIn) {
      updatePointsDisplay(0);
      return null;
    }

    updateAvatar(session);
    const total = await hydratePoints();
    updatePointsDisplay(total);

    if (window.MatiAuthLogout && !document.body.dataset.logoutBound) {
      MatiAuthLogout.bind({ redirect: "login.html" });
      document.body.dataset.logoutBound = "1";
    }

    if (!isGamesHubPage()) {
      return session;
    }

    if (typeof window.initGlobalSettings === "function") {
      window.initGlobalSettings();
    }

    if (typeof window.MatiGameAuthGate !== "undefined") {
      window.MatiGameAuthGate.bindNavigation();
    }

    return session;
  }

  return {
    refresh,
    restoreSession,
    hydratePoints,
    updatePointsDisplay,
    initAuthStateSync,
  };
})();

window.MatiVisitorAuth = MatiVisitorAuth;
