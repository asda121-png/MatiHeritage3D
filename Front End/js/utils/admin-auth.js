/**
 * Admin console access — requires Supabase profile role = admin.
 */
const MatiAdminAuth = (() => {
  async function restoreSession() {
    if (typeof MatiAuth?.restoreSession === "function") {
      return MatiAuth.restoreSession();
    }
    return MatiAuth?.getSession?.() || null;
  }

  async function fetchRole() {
    const session = MatiAuth?.getSession?.();
    if (!session?.email) return null;

    const sb = MatiSupabase?.getClient?.();
    if (!sb) return null;

    const userId = await MatiSupabaseAuth?.getCurrentUserId?.();
    const query = sb.from("profiles").select("role");
    const { data, error } = userId
      ? await query.eq("id", userId).maybeSingle()
      : await query
          .eq("email", String(session.email).trim().toLowerCase())
          .maybeSingle();

    if (error) {
      console.warn("MatiAdminAuth: role lookup failed", error);
      return null;
    }

    return String(data?.role || "").trim().toLowerCase() || null;
  }

  async function isAdmin() {
    await restoreSession();
    if (!MatiAuth?.isLoggedIn?.()) return false;
    const sessionRole = String(MatiAuth.getSession()?.role || "")
      .trim()
      .toLowerCase();
    return sessionRole === "admin" || (await fetchRole()) === "admin";
  }

  async function requireAdmin() {
    await restoreSession();

    if (!MatiAuth?.isLoggedIn?.()) {
      window.location.replace("login.html?redirect=admin.html");
      return false;
    }

    if (!(await isAdmin())) {
      window.location.replace("login.html?redirect=admin.html&error=not_admin");
      return false;
    }

    return true;
  }

  return {
    fetchRole,
    isAdmin,
    requireAdmin,
  };
})();

window.MatiAdminAuth = MatiAdminAuth;
