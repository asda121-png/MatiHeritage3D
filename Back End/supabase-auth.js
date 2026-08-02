/**
 * Optional Supabase Auth bridge.
 * Set MATI_SUPABASE_CONFIG.useSupabaseAuth = true after configuring Supabase.
 * Until then, auth.js continues using localStorage.
 */
const MatiSupabaseAuth = (() => {
  function enabled() {
    return Boolean(
      MatiSupabase?.isConfigured?.() &&
      window.MATI_SUPABASE_CONFIG?.useSupabaseAuth,
    );
  }

  function client() {
    return MatiSupabase?.getClient?.() || null;
  }

  function normalizeEmail(email) {
    return String(email || "")
      .trim()
      .toLowerCase();
  }

  function normalizeUsername(username) {
    return String(username || "")
      .trim()
      .toLowerCase();
  }

  function friendlyAuthError(error) {
    const message = String(error?.message || "").toLowerCase();
    if (
      message.includes("already registered") ||
      message.includes("already exists") ||
      message.includes("duplicate") ||
      message.includes("user already")
    ) {
      return "An account with this email already exists.";
    }
    if (message.includes("username") && message.includes("unique")) {
      return "That username is already taken.";
    }
    return error?.message || "Could not complete registration.";
  }

  async function checkRegistrationAvailability(email, username) {
    if (!enabled()) return { ok: true };

    const cleanEmail = normalizeEmail(email);
    const cleanUsername = normalizeUsername(username);
    const sb = client();
    if (!sb) return { ok: true };

    if (cleanEmail) {
      const { data: emailMatch, error: emailError } = await sb
        .from("profiles")
        .select("id")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (emailError) {
        console.warn("Email availability check failed:", emailError);
      } else if (emailMatch) {
        return {
          ok: false,
          field: "email",
          message: "An account with this email already exists.",
        };
      }
    }

    if (cleanUsername) {
      const { data: usernameMatch, error: usernameError } = await sb
        .from("profiles")
        .select("id")
        .eq("username", cleanUsername)
        .maybeSingle();

      if (usernameError) {
        console.warn("Username availability check failed:", usernameError);
      } else if (usernameMatch) {
        return {
          ok: false,
          field: "username",
          message: "That username is already taken.",
        };
      }
    }

    return { ok: true };
  }

  async function register({ username, email, password }) {
    if (!enabled()) return null;

    const sb = client();
    const cleanUsername = normalizeUsername(username);
    const cleanEmail = normalizeEmail(email);

    if (!cleanUsername || !cleanEmail || !password) {
      return { ok: false, message: "Please fill in all fields." };
    }

    if (password.length < 6) {
      return {
        ok: false,
        message: "Password must be at least 6 characters.",
      };
    }

    if (!/^[a-z0-9._-]{3,24}$/.test(cleanUsername)) {
      return {
        ok: false,
        message: "Username must be 3–24 characters (letters, numbers, . _ -).",
      };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { ok: false, message: "Please enter a valid email address." };
    }

    const availability = await checkRegistrationAvailability(
      cleanEmail,
      cleanUsername,
    );
    if (!availability.ok) {
      return availability;
    }

    const { data, error } = await sb.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          username: cleanUsername,
        },
      },
    });

    if (error) {
      return { ok: false, message: friendlyAuthError(error) };
    }

    // Supabase may return no error for an existing email (anti-enumeration).
    if (data?.user?.identities?.length === 0) {
      return {
        ok: false,
        field: "email",
        message: "An account with this email already exists.",
      };
    }

    if (!data?.user) {
      return {
        ok: false,
        message: "Could not create account. Please try again.",
      };
    }

    if (data.session) {
      await storePasswordDigest(password);
    }

    return {
      ok: true,
      user: {
        username: cleanUsername,
        email: cleanEmail,
      },
      session: data.session,
    };
  }

  async function login(identifier, password) {
    if (!enabled()) return null;

    const sb = client();
    const email = identifier.includes("@")
      ? identifier.trim().toLowerCase()
      : null;

    if (!email) {
      console.log("Looking up username:", identifier.trim().toLowerCase());
      const { data: profile, error: profileError } = await sb
        .from("profiles")
        .select("email, username")
        .eq("username", identifier.trim().toLowerCase())
        .maybeSingle();

      console.log("Profile lookup result:", { profile, profileError });

      if (profileError || !profile?.email) {
        console.error("Profile lookup failed:", profileError);
        return { ok: false, message: "Invalid email/username or password." };
      }

      const { data, error } = await sb.auth.signInWithPassword({
        email: profile.email,
        password,
      });

      if (error) {
        console.error("Supabase login error:", error);
        return { ok: false, message: friendlyAuthError(error) };
      }

      await storePasswordDigest(password);

      return {
        ok: true,
        user: {
          username: profile.username,
          email: profile.email,
        },
        session: data.session,
      };
    }

    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { ok: false, message: "Invalid email/username or password." };
    }

    await storePasswordDigest(password);

    const { data: profile } = await sb
      .from("profiles")
      .select("username, email")
      .eq("email", email)
      .maybeSingle();

    const meta = data.user?.user_metadata || {};
    return {
      ok: true,
      user: {
        username: profile?.username || meta.username || email.split("@")[0],
        email: profile?.email || email,
      },
      session: data.session,
    };
  }

  async function logout() {
    const sb = client();
    if (!sb) return;
    await sb.auth.signOut();
  }

  async function getSession() {
    const sb = client();
    if (!sb) return null;

    const { data } = await sb.auth.getSession();
    const session = data?.session;
    if (!session?.user) return null;

    const { data: profile } = await sb
      .from("profiles")
      .select("username, email, avatar_url")
      .eq("id", session.user.id)
      .maybeSingle();

    const meta = session.user.user_metadata || {};
    return {
      username:
        profile?.username || meta.username || session.user.email?.split("@")[0],
      email: profile?.email || session.user.email,
      avatarUrl: profile?.avatar_url || null,
      loggedInAt: session.user.last_sign_in_at || new Date().toISOString(),
    };
  }

  async function isLoggedIn() {
    return Boolean(await getSession());
  }

  function passwordResetRedirectUrl() {
    const cfg = window.MATI_SUPABASE_CONFIG || {};
    if (cfg.passwordResetRedirect) return cfg.passwordResetRedirect;
    const path = window.location.pathname.replace(/[^/]*$/, "");
    return `${window.location.origin}${path}reset-password.html`;
  }

  function googleSignInEnabled() {
    return Boolean(
      enabled() && window.MATI_SUPABASE_CONFIG?.googleSignInEnabled,
    );
  }

  function authRedirectUrl(pathname, redirectTarget) {
    const path = String(pathname || window.location.pathname).replace(
      /[^/]*$/,
      "",
    );
    const target = redirectTarget || "index.html";
    return `${window.location.origin}${path}login.html?redirect=${encodeURIComponent(target)}&oauth=1`;
  }

  async function storePasswordDigest(password) {
    if (!password || typeof MatiPasswordHash === "undefined") return;
    await MatiPasswordHash.storeDigestForCurrentUser(password);
  }

  function hasEmailPasswordCredential(user) {
    if (!user) return false;

    const providerSet = new Set();

    const appProviders = user?.app_metadata?.providers;
    if (Array.isArray(appProviders)) {
      appProviders.forEach((provider) => {
        if (provider) providerSet.add(String(provider).toLowerCase());
      });
    }

    if (Array.isArray(user.identities)) {
      user.identities.forEach((identity) => {
        if (identity?.provider) {
          providerSet.add(String(identity.provider).toLowerCase());
        }
      });
    }

    return providerSet.has("email");
  }

  function passwordSetupRedirectUrl(redirectTarget) {
    const cfg = window.MATI_SUPABASE_CONFIG || {};
    const fallbackPath = `${window.location.origin}${String(window.location.pathname).replace(/[^/]*$/, "")}create-password.html`;
    const base = cfg.passwordSetupRedirect || fallbackPath;
    const target = redirectTarget || "index.html";
    const url = new URL(base, window.location.origin);
    url.searchParams.set("redirect", target);
    return url.toString();
  }

  async function signInWithGoogle(redirectTarget) {
    if (!googleSignInEnabled()) {
      return {
        ok: false,
        message:
          "Google Sign-In is not enabled. Turn on googleSignInEnabled in supabase-config.js and configure Google in Supabase.",
      };
    }

    const sb = client();
    if (!sb) {
      return { ok: false, message: "Sign-in is not available." };
    }

    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: authRedirectUrl(window.location.pathname, redirectTarget),
      },
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true };
  }

  async function checkUsernameAvailability(username, excludeUserId = null) {
    if (!enabled()) return { ok: true };

    const cleanUsername = normalizeUsername(username);
    if (!cleanUsername) return { ok: true };

    if (!/^[a-z0-9._-]{3,24}$/.test(cleanUsername)) {
      return {
        ok: false,
        field: "username",
        message: "Username must be 3–24 characters (letters, numbers, . _ -).",
      };
    }

    const sb = client();
    if (!sb) return { ok: true };

    const { data, error } = await sb
      .from("profiles")
      .select("id")
      .eq("username", cleanUsername)
      .maybeSingle();

    if (error) {
      console.warn("Username availability check failed:", error);
      return { ok: true };
    }

    if (data && data.id !== excludeUserId) {
      return {
        ok: false,
        field: "username",
        message: "That username is already taken.",
      };
    }

    return { ok: true };
  }

  async function getCurrentUserId() {
    const sb = client();
    if (!sb) return null;
    const { data } = await sb.auth.getUser();
    return data?.user?.id || null;
  }

  async function updateProfile({ username, displayName }) {
    if (!enabled()) {
      return {
        ok: false,
        message: "Profile updates require Supabase Auth.",
      };
    }

    const sb = client();
    if (!sb) {
      return { ok: false, message: "Could not connect to Supabase." };
    }

    const cleanUsername = normalizeUsername(username);
    const cleanDisplay = String(displayName || "").trim();

    if (!cleanDisplay) {
      return { ok: false, message: "Please enter a display name." };
    }

    const userId = await getCurrentUserId();
    const availability = await checkUsernameAvailability(cleanUsername, userId);
    if (!availability.ok) {
      return availability;
    }

    const { data, error } = await sb.rpc("update_player_profile", {
      p_username: cleanUsername,
      p_display_name: cleanDisplay,
    });

    if (error) {
      const message = String(error.message || "Could not update profile.");
      if (message.toLowerCase().includes("already taken")) {
        return { ok: false, field: "username", message };
      }
      return { ok: false, message };
    }

    const profile = Array.isArray(data) ? data[0] : data;
    const points = Math.max(0, Number(profile?.heritage_points) || 0);

    // Update auth metadata BEFORE syncing points to ensure new username is used
    await sb.auth.updateUser({
      data: {
        username: profile?.username || cleanUsername,
        display_name: profile?.display_name || cleanDisplay,
      },
    });

    // Sync points with the NEW username to prevent recreating old entries
    if (typeof MatiHeritagePoints !== "undefined") {
      // Use the new username directly instead of relying on session
      const newUsername = profile?.username || cleanUsername;
      const newDisplayName = profile?.display_name || cleanDisplay;

      // Call sync with explicit new username to avoid session race condition
      if (
        typeof MatiSupabaseApi !== "undefined" &&
        MatiSupabaseApi.syncHeritagePoints
      ) {
        await MatiSupabaseApi.syncHeritagePoints({
          username: newUsername,
          displayName: newDisplayName,
          points: points,
        });
      }
    }

    return {
      ok: true,
      user: {
        username: profile?.username || cleanUsername,
        displayName: profile?.display_name || cleanDisplay,
        email: profile?.email,
      },
    };
  }

  async function completeOAuthRedirect() {
    if (!enabled()) return null;

    const sb = client();
    if (!sb) return null;

    const params = new URLSearchParams(window.location.search);
    if (params.get("oauth") !== "1") return null;

    const { data, error } = await sb.auth.getSession();
    if (error || !data?.session?.user) return null;

    const appUser = await getSession();
    return {
      user: appUser,
      email: data.session.user.email || appUser?.email || null,
      hasEmailPasswordCredential: hasEmailPasswordCredential(data.session.user),
      redirectTarget: params.get("redirect") || "index.html",
    };
  }

  async function getAuthCredentialStatus() {
    if (!enabled()) {
      return {
        ok: false,
        message: "Supabase Auth is not enabled for this portal.",
      };
    }

    const sb = client();
    if (!sb) {
      return { ok: false, message: "Could not connect to Supabase." };
    }

    const { data, error } = await sb.auth.getUser();
    if (error) {
      return { ok: false, message: error.message || "Could not read user." };
    }

    const user = data?.user;
    if (!user) {
      return { ok: false, missingSession: true, message: "No active session." };
    }

    return {
      ok: true,
      email: user.email || null,
      hasEmailPasswordCredential: hasEmailPasswordCredential(user),
    };
  }

  async function requestPasswordReset(email) {
    if (!enabled()) {
      return {
        ok: false,
        message:
          "Password reset requires Supabase Auth. Set useSupabaseAuth: true in supabase-config.js.",
      };
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { ok: false, message: "Please enter a valid email address." };
    }

    const sb = client();
    const { error } = await sb.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: passwordResetRedirectUrl(),
    });

    if (error) {
      // If the error is an empty object, it's likely an SMTP configuration issue.
      // Provide a more helpful message for debugging.
      if (error.message) {
        return { ok: false, message: error.message };
      }
      return {
        ok: false,
        message:
          "Could not send reset email. Check SMTP configuration in Supabase (e.g., Brevo sender verification).",
      };
    }

    return {
      ok: true,
      message:
        "If an account exists for that email, we sent a password reset link. Check your inbox (and spam).",
    };
  }

  async function hasRecoverySession() {
    if (!enabled()) return false;
    const sb = client();
    const { data } = await sb.auth.getSession();
    return Boolean(data?.session);
  }

  async function updatePassword(newPassword) {
    if (!enabled()) {
      return {
        ok: false,
        message: "Supabase Auth is not enabled for this portal.",
      };
    }

    if (!newPassword || newPassword.length < 6) {
      return {
        ok: false,
        message: "Password must be at least 6 characters.",
      };
    }

    const sb = client();
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) {
      // Gracefully handle the case where the user "resets" to the same password.
      // Supabase returns this specific error, but we can treat it as a success.
      if (
        error.message.toLowerCase().includes("different from the old password")
      ) {
        await sb.auth.signOut();
        return {
          ok: true,
          message: "Password confirmed. You can sign in with your password.",
        };
      }
      return { ok: false, message: error.message };
    }

    await storePasswordDigest(newPassword);

    await sb.auth.signOut();
    return {
      ok: true,
      message: "Password updated. You can sign in with your new password.",
    };
  }

  async function createPasswordForLinkedAccount(newPassword) {
    if (!enabled()) {
      return {
        ok: false,
        message: "Supabase Auth is not enabled for this portal.",
      };
    }

    if (!newPassword || newPassword.length < 6) {
      return {
        ok: false,
        message: "Password must be at least 6 characters.",
      };
    }

    const sb = client();
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) {
      // Gracefully handle the case where the user "resets" to the same password.
      // Supabase returns this specific error, but we can treat it as a success.
      if (
        error.message.toLowerCase().includes("different from the old password")
      ) {
        await sb.auth.signOut();
        return {
          ok: true,
          message: "Password confirmed. You can sign in with your password.",
        };
      }
      return { ok: false, message: error.message };
    }

    await storePasswordDigest(newPassword);

    return {
      ok: true,
      message:
        "Password created. You can now use both Google and email/password sign-in.",
    };
  }

  async function updatePasswordWithCurrent(currentPassword, newPassword) {
    if (!enabled()) {
      return {
        ok: false,
        message: "Supabase Auth is not enabled for this portal.",
      };
    }

    if (!currentPassword) {
      return {
        ok: false,
        message: "Current password is required.",
      };
    }

    if (!newPassword || newPassword.length < 6) {
      return {
        ok: false,
        message: "New password must be at least 6 characters.",
      };
    }

    const sb = client();
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData?.user?.email) {
      return {
        ok: false,
        message: "Could not verify your current session.",
      };
    }

    const { error: verifyError } = await sb.auth.signInWithPassword({
      email: userData.user.email,
      password: currentPassword,
    });

    if (verifyError) {
      return {
        ok: false,
        message: "Current password is incorrect.",
      };
    }

    const { error: updateError } = await sb.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return { ok: false, message: updateError.message };
    }

    await storePasswordDigest(newPassword);

    return {
      ok: true,
      message: "Password updated.",
    };
  }

  async function getAllUsers() {
    if (!enabled()) return null;

    const sb = client();
    if (!sb) return null;

    const { data, error } = await sb
      .from("profiles")
      .select("username, email, created_at, heritage_points, avatar_url")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Failed to fetch users from Supabase:", error);
      return null;
    }

    return (data || []).map((profile) => ({
      displayName: profile.username || "User",
      username: profile.username || "",
      email: profile.email || "",
      createdAt: profile.created_at || new Date().toISOString(),
      points: profile.heritage_points || 0,
      avatarUrl: profile.avatar_url || null,
    }));
  }

  return {
    enabled,
    register,
    login,
    logout,
    getSession,
    isLoggedIn,
    checkRegistrationAvailability,
    checkUsernameAvailability,
    updateProfile,
    getCurrentUserId,
    requestPasswordReset,
    hasRecoverySession,
    updatePassword,
    createPasswordForLinkedAccount,
    getAuthCredentialStatus,
    passwordSetupRedirectUrl,
    updatePasswordWithCurrent,
    passwordResetRedirectUrl,
    googleSignInEnabled,
    signInWithGoogle,
    completeOAuthRedirect,
    getAllUsers,
  };
})();
