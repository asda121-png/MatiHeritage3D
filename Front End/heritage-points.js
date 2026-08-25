/**
 * Local + Supabase heritage points sync for games and leaderboards.
 * localStorage remains the device total; Supabase drives shared live rankings.
 */
const MatiHeritagePoints = (() => {
  const STORAGE_KEY = "totalHeritagePoints";

  function readLocal() {
    return Math.max(
      0,
      parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10) || 0,
    );
  }

  function writeLocal(total) {
    const next = Math.max(0, Number(total) || 0);
    localStorage.setItem(STORAGE_KEY, String(next));
    const pointsEl = document.getElementById("header-total-points");
    if (pointsEl) pointsEl.textContent = String(next);
    return next;
  }

  function currentPlayer() {
    const session =
      typeof MatiAuth !== "undefined" ? MatiAuth.getSession?.() : null;
    if (!session?.username || session.role === "admin") return null;
    return {
      username: String(session.username).trim().toLowerCase(),
      displayName: session.displayName || session.username,
    };
  }

  async function syncToCloud(total = readLocal()) {
    const player = currentPlayer();
    if (!player) return null;
    if (
      typeof MatiSupabaseApi === "undefined" ||
      !MatiSupabaseApi.syncHeritagePoints
    ) {
      return null;
    }

    try {
      return await MatiSupabaseApi.syncHeritagePoints({
        username: player.username,
        displayName: player.displayName,
        points: Math.max(0, Number(total) || 0),
      });
    } catch (error) {
      console.warn("MatiHeritagePoints: cloud sync failed", error);
      return null;
    }
  }

  async function hydrateFromCloud() {
    const player = currentPlayer();
    if (!player) return readLocal();

    const sb =
      typeof MatiSupabase !== "undefined" ? MatiSupabase.getClient?.() : null;
    if (!sb) return readLocal();

    try {
      const { data, error } = await sb
        .from("profiles")
        .select("heritage_points")
        .eq("username", player.username)
        .maybeSingle();

      if (error) throw error;

      const cloudPoints = Math.max(0, Number(data?.heritage_points) || 0);
      const local = readLocal();
      const merged = Math.max(local, cloudPoints);
      writeLocal(merged);

      if (merged > cloudPoints) {
        await syncToCloud(merged);
      }

      return merged;
    } catch (error) {
      console.warn("MatiHeritagePoints: hydrate failed", error);
      return readLocal();
    }
  }

  async function add(delta) {
    const gained = Math.max(0, Number(delta) || 0);
    const next = writeLocal(readLocal() + gained);
    await syncToCloud(next);
    return next;
  }

  async function setTotal(total) {
    const next = writeLocal(total);
    await syncToCloud(next);
    return next;
  }

  return {
    readLocal,
    writeLocal,
    currentPlayer,
    syncToCloud,
    hydrateFromCloud,
    add,
    setTotal,
  };
})();

window.MatiHeritagePoints = MatiHeritagePoints;
