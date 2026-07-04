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

  async function register({ displayName, username, email, password }) {
    if (!enabled()) return null;

    const sb = client();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

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
      return { ok: false, message: error.message };
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

    const meta = data.user?.user_metadata || {};
    return {
      ok: true,
      user: {
        username: meta.username || email.split("@")[0],
        displayName: meta.display_name || meta.username || email,
        email,
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

    const meta = session.user.user_metadata || {};
    return {
      username: meta.username || session.user.email?.split("@")[0],
      displayName: meta.display_name || meta.username || "Player",
      email: session.user.email,
      loggedInAt: session.user.last_sign_in_at || new Date().toISOString(),
    };
  }

  async function isLoggedIn() {
    return Boolean(await getSession());
  }

  return {
    enabled,
    register,
    login,
    logout,
    getSession,
    isLoggedIn,
  };
})();
