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
    return String(email || "").trim().toLowerCase();
  }

  function normalizeUsername(username) {
    return String(username || "").trim().toLowerCase();
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

  async function register({ displayName, username, email, password }) {
    if (!enabled()) return null;

    const sb = client();
    const cleanUsername = normalizeUsername(username);
    const cleanEmail = normalizeEmail(email);

    if (!displayName?.trim() || !cleanUsername || !cleanEmail || !password) {
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
        message:
          "Username must be 3–24 characters (letters, numbers, . _ -).",
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
          display_name: displayName.trim(),
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

    return {
      ok: true,
      user: {
        displayName: displayName.trim(),
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
      const { data: profile, error: profileError } = await sb
        .from("profiles")
        .select("email, username, display_name")
        .eq("username", identifier.trim().toLowerCase())
        .maybeSingle();

      if (profileError || !profile?.email) {
        return { ok: false, message: "Invalid email/username or password." };
      }

      const { data, error } = await sb.auth.signInWithPassword({
        email: profile.email,
        password,
      });

      if (error) {
        return { ok: false, message: "Invalid email/username or password." };
      }

      return {
        ok: true,
        user: {
          username: profile.username,
          displayName: profile.display_name,
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

    const { data: profile } = await sb
      .from("profiles")
      .select("username, display_name, email")
      .eq("email", email)
      .maybeSingle();

    const meta = data.user?.user_metadata || {};
    return {
      ok: true,
      user: {
        username: profile?.username || meta.username || email.split("@")[0],
        displayName:
          profile?.display_name ||
          meta.display_name ||
          meta.username ||
          email,
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
      .select("username, display_name, email, avatar_url")
      .eq("id", session.user.id)
      .maybeSingle();

    const meta = session.user.user_metadata || {};
    return {
      username:
        profile?.username || meta.username || session.user.email?.split("@")[0],
      displayName:
        profile?.display_name ||
        meta.display_name ||
        meta.username ||
        "Player",
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
      return { ok: false, message: error.message };
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
      return { ok: false, message: error.message };
    }

    await sb.auth.signOut();
    return {
      ok: true,
      message: "Password updated. You can sign in with your new password.",
    };
  }

  return {
    enabled,
    register,
    login,
    logout,
    getSession,
    isLoggedIn,
    checkRegistrationAvailability,
    requestPasswordReset,
    hasRecoverySession,
    updatePassword,
    passwordResetRedirectUrl,
  };
})();
