/**
 * Built heritage data bridge — Supabase with static fallback.
 * Used by visitor pages (index map, 3D explore) and complements admin-store.
 */
const MatiHeritageData = (() => {
  const CACHE_KEY = "matiBuiltHeritageSites_v2";
  let builtSitesCache = null;
  let initPromise = null;

  function supabaseEnabled() {
    return (
      typeof MatiSupabase !== "undefined" &&
      MatiSupabase.isConfigured() &&
      typeof MatiSupabaseApi !== "undefined"
    );
  }

  function staticBuiltSites() {
    if (typeof BUILT_HERITAGE_SITES !== "undefined") {
      return [...BUILT_HERITAGE_SITES];
    }
    if (typeof HERITAGE_MAP_SITES !== "undefined") {
      return HERITAGE_MAP_SITES.filter((site) => site.category === "built").map(
        (site) => ({
          id: site.id,
          name: site.name,
          category: "built",
          categoryLabel: "Built Heritage",
          cover: site.image || "",
          description: site.desc || "",
          location: site.barangay || "",
          lat: site.lat,
          lng: site.lng,
          modelSrc:
            site.id === "pylon"
              ? "data/Built Heritage/Pylon Monument/Pylon.glb"
              : "",
        }),
      );
    }
    return [];
  }

  function readSessionCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeSessionCache(sites) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(sites));
    } catch {
      /* ignore quota errors */
    }
  }

  function barangayForSite(siteId) {
    if (typeof HERITAGE_MAP_SITES === "undefined") return "central";
    return (
      HERITAGE_MAP_SITES.find((site) => site.id === siteId)?.barangay ||
      "central"
    );
  }

  function officialForSite(siteId) {
    if (typeof HERITAGE_MAP_SITES === "undefined") return true;
    const match = HERITAGE_MAP_SITES.find((site) => site.id === siteId);
    return match ? Boolean(match.official) : true;
  }

  function siteToMapMarker(site) {
    const staticMatch =
      typeof HERITAGE_MAP_SITES !== "undefined"
        ? HERITAGE_MAP_SITES.find((row) => row.id === site.id)
        : null;

    const lat = Number(staticMatch?.lat ?? site.lat);
    const lng = Number(staticMatch?.lng ?? site.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return {
      id: site.id,
      name: site.name,
      category: "built",
      barangay: staticMatch?.barangay || barangayForSite(site.id),
      lat,
      lng,
      official: staticMatch?.official ?? officialForSite(site.id),
      desc:
        staticMatch?.desc ||
        (site.description || "").split(".")[0]?.trim() ||
        site.name,
      image: site.cover || staticMatch?.image || "",
    };
  }

  async function loadBuiltSites({ force = false } = {}) {
    if (builtSitesCache && !force) return builtSitesCache;

    if (!force) {
      const cached = readSessionCache();
      if (cached?.length) {
        builtSitesCache = cached;
        return builtSitesCache;
      }
    }

    if (supabaseEnabled()) {
      try {
        const remote = await MatiSupabaseApi.listSites("built");
        if (remote?.length) {
          builtSitesCache = remote;
          writeSessionCache(remote);
          return builtSitesCache;
        }
      } catch (error) {
        console.warn("MatiHeritageData: Supabase load failed", error);
      }
    }

    builtSitesCache = staticBuiltSites();
    return builtSitesCache;
  }

  async function init() {
    if (!initPromise) initPromise = loadBuiltSites();
    return initPromise;
  }

  async function getMapSites() {
    await init();

    const natural =
      typeof HERITAGE_MAP_SITES !== "undefined"
        ? HERITAGE_MAP_SITES.filter((site) => site.category === "natural")
        : [];

    const builtMarkers = (builtSitesCache || staticBuiltSites())
      .map(siteToMapMarker)
      .filter(Boolean);

    return [...builtMarkers, ...natural];
  }

  function applyTo3dExploreSite(localSite, remoteSite) {
    if (!localSite || !remoteSite) return localSite;

    localSite.name = remoteSite.name || localSite.name;
    localSite.desc = remoteSite.description || localSite.desc;
    if (remoteSite.lat != null) localSite.lat = Number(remoteSite.lat);
    if (remoteSite.lng != null) localSite.lng = Number(remoteSite.lng);
    if (remoteSite.cover) {
      localSite.photos = localSite.photos?.length
        ? localSite.photos
        : [remoteSite.cover];
      if (!localSite.photos.includes(remoteSite.cover)) {
        localSite.photos = [remoteSite.cover, ...localSite.photos];
      }
    }
    if (remoteSite.modelSrc) localSite.modelSrc = remoteSite.modelSrc;
  }

  async function hydrate3dExploreSites(sitesArray) {
    if (!Array.isArray(sitesArray)) return sitesArray;

    const built = await loadBuiltSites();
    built.forEach((remote) => {
      const local = sitesArray.find((site) => site.id === remote.id);
      if (!local) return;
      applyTo3dExploreSite(local, remote);
      const modelPath = String(remote.modelSrc || local.modelSrc || "");
      local.available =
        remote.id === "pylon" && /\.glb$/i.test(modelPath);
    });

    return sitesArray;
  }

  return {
    init,
    loadBuiltSites,
    getMapSites,
    hydrate3dExploreSites,
    siteToMapMarker,
  };
})();
