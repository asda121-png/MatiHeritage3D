/** Supabase client bootstrap for static HTML pages */
const MatiSupabase = (() => {
  let client = null;
  let lastError = null;

  function config() {
    return window.MATI_SUPABASE_CONFIG || null;
  }

  function isConfigured() {
    const cfg = config();
    return Boolean(
      cfg?.enabled &&
        cfg?.url &&
        cfg?.url !== "https://YOUR_PROJECT_REF.supabase.co" &&
        cfg?.anonKey &&
        cfg?.anonKey !== "YOUR_ANON_KEY",
    );
  }

  function getClient() {
    if (!isConfigured()) return null;
    if (client) return client;

    const cfg = config();
    if (typeof supabase === "undefined" || !supabase.createClient) {
      lastError = new Error("Supabase JS library is not loaded.");
      return null;
    }

    try {
      client = supabase.createClient(cfg.url, cfg.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      return client;
    } catch (error) {
      lastError = error;
      return null;
    }
  }

  async function testConnection() {
    if (!isConfigured()) {
      return {
        ok: false,
        message:
          "Supabase is not configured. Edit Back End/supabase-config.js with your project keys.",
      };
    }

    const sb = getClient();
    if (!sb) {
      return {
        ok: false,
        message: lastError?.message || "Could not create Supabase client.",
      };
    }

    const { error } = await sb.from("heritage_sites").select("id").limit(1);
    if (error) {
      const msg = error.message || "Unknown Supabase error.";
      const needsSchema =
        /heritage_sites/i.test(msg) &&
        (/does not exist|schema cache|PGRST/i.test(msg));

      return {
        ok: false,
        message: needsSchema
          ? "Tables not created yet — run the SQL migration in Supabase SQL Editor."
          : msg,
      };
    }

    return { ok: true, message: "Connected to Supabase." };
  }

  function getLastError() {
    return lastError;
  }

  return {
    isConfigured,
    getClient,
    testConnection,
    getLastError,
  };
})();
