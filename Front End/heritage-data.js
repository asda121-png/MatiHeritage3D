/**
 * Heritage data bridge — Supabase with static fallback.
 * Built: map + 3D explore. Intangible/natural: gallery sites + media.
 */
const MatiHeritageData = (() => {
  const SITE_CACHE_KEYS = {
    built: "matiBuiltHeritageSites_v2",
    intangible: "matiIntangibleHeritageSites_v1",
    natural: "matiNaturalHeritageSites_v1",
  };
  const MEDIA_CACHE_KEY = "matiGalleryHeritageMedia_v1";

  const sitesCache = {
    built: null,
    intangible: null,
    natural: null,
  };
  let galleryMediaCache = null;
  let initPromise = null;
  let galleryInitPromise = null;

  function supabaseEnabled() {
    return (
      typeof MatiSupabase !== "undefined" &&
      MatiSupabase.isConfigured() &&
      typeof MatiSupabaseApi !== "undefined"
    );
  }

  function readSessionCache(key) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeSessionCache(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota errors */
    }
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
              ? window.MATI_SUPABASE_CONFIG?.pylonModelUrl ||
                (window.MATI_SUPABASE_CONFIG?.url
                  ? `${String(window.MATI_SUPABASE_CONFIG.url).replace(/\/$/, "")}/storage/v1/object/public/heritage-models/pylon/Pylon.glb`
                  : "")
              : "",
        }),
      );
    }
    return [];
  }

  function staticSitesForCategory(category) {
    if (category === "built") return staticBuiltSites();
    return [];
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

  function siteToMapMarker(site, category = site.category || "built") {
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
      category,
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

  function enrichMediaItem(item, sitesById) {
    const site = sitesById.get(item.siteId);
    const credit = item.credit || "";
    return {
      ...item,
      siteName: item.siteName || site?.name || "",
      category: item.category || site?.category || "",
      author: item.author || credit,
      date: item.date || item.year || "",
      year: item.year || item.date || "",
      credit,
      event: item.event || "",
      citation: item.citation || "",
      caption: item.caption || "",
      lyrics: item.lyrics || null,
      sortOrder: item.sortOrder != null ? Number(item.sortOrder) : null,
    };
  }

  function enrichGalleryMedia(media, sites) {
    const sitesById = new Map((sites || []).map((site) => [site.id, site]));
    return (media || []).map((item) => enrichMediaItem(item, sitesById));
  }

  async function loadSitesByCategory(category, { force = false } = {}) {
    if (!SITE_CACHE_KEYS[category]) return [];

    if (sitesCache[category] && !force) return sitesCache[category];

    if (!force) {
      const cached = readSessionCache(SITE_CACHE_KEYS[category]);
      if (cached?.length) {
        sitesCache[category] = cached;
        return sitesCache[category];
      }
    }

    if (supabaseEnabled()) {
      try {
        const remote = await MatiSupabaseApi.listSites(category);
        if (remote?.length) {
          sitesCache[category] = remote;
          writeSessionCache(SITE_CACHE_KEYS[category], remote);
          return sitesCache[category];
        }
      } catch (error) {
        console.warn(
          `MatiHeritageData: Supabase ${category} load failed`,
          error,
        );
      }
    }

    sitesCache[category] = staticSitesForCategory(category);
    return sitesCache[category];
  }

  async function loadBuiltSites(options) {
    return loadSitesByCategory("built", options);
  }

  async function loadGallerySites(options = {}) {
    const [intangible, natural] = await Promise.all([
      loadSitesByCategory("intangible", options),
      loadSitesByCategory("natural", options),
    ]);
    return [...intangible, ...natural];
  }

  async function loadGalleryMedia({ force = false } = {}) {
    if (galleryMediaCache && !force) return galleryMediaCache;

    if (!force) {
      const cached = readSessionCache(MEDIA_CACHE_KEY);
      if (cached?.length) {
        galleryMediaCache = cached;
        return galleryMediaCache;
      }
    }

    const gallerySites = await loadGallerySites({ force });

    if (supabaseEnabled()) {
      try {
        const allMedia = await MatiSupabaseApi.listMedia();
        const gallerySiteIds = new Set(gallerySites.map((site) => site.id));
        const remoteGallery = (allMedia || []).filter((item) =>
          gallerySiteIds.has(item.siteId),
        );

        if (remoteGallery.length) {
          galleryMediaCache = enrichGalleryMedia(
            remoteGallery,
            gallerySites,
          ).sort(
            (a, b) =>
              (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) ||
              String(a.title || "").localeCompare(String(b.title || "")),
          );
          writeSessionCache(MEDIA_CACHE_KEY, galleryMediaCache);
          return galleryMediaCache;
        }
      } catch (error) {
        console.warn(
          "MatiHeritageData: Supabase gallery media load failed",
          error,
        );
      }
    }

    galleryMediaCache = [];
    return galleryMediaCache;
  }

  function replaceArrayContents(target, next) {
    if (!Array.isArray(target) || !Array.isArray(next)) return;
    target.splice(0, target.length, ...next);
  }

  function applyGalleryGlobals(sites, media) {
    // Mutate in place — gallery-data.js declares these with const.
    if (Array.isArray(sites) && typeof GALLERY_SITES !== "undefined") {
      replaceArrayContents(GALLERY_SITES, sites);
    }
    if (Array.isArray(media) && typeof GALLERY_MEDIA !== "undefined") {
      replaceArrayContents(GALLERY_MEDIA, media);
    }
  }

  async function hydrateGalleryCatalog({ force = false } = {}) {
    if (!galleryInitPromise || force) {
      galleryInitPromise = (async () => {
        const [sites, media] = await Promise.all([
          loadGallerySites({ force }),
          loadGalleryMedia({ force }),
        ]);
        applyGalleryGlobals(sites, media);
        return { sites, media };
      })();
    }
    return galleryInitPromise;
  }

  async function init() {
    if (!initPromise) initPromise = loadBuiltSites();
    return initPromise;
  }

  async function getMapSites() {
    const [built, natural] = await Promise.all([
      loadSitesByCategory("built"),
      loadSitesByCategory("natural"),
    ]);

    const builtMarkers = built
      .map((site) => siteToMapMarker(site, "built"))
      .filter(Boolean);

    const naturalMarkers = natural
      .map((site) => siteToMapMarker(site, "natural"))
      .filter(Boolean);

    // If remote natural has no mappable coords, fall back to static natural pins.
    const naturalIds = new Set(naturalMarkers.map((site) => site.id));
    const staticNatural =
      typeof HERITAGE_MAP_SITES !== "undefined"
        ? HERITAGE_MAP_SITES.filter(
            (site) => site.category === "natural" && !naturalIds.has(site.id),
          )
        : [];

    return [...builtMarkers, ...naturalMarkers, ...staticNatural];
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
      local.available = remote.id === "pylon" && /\.glb$/i.test(modelPath);
    });

    return sitesArray;
  }

  function invalidateCaches() {
    sitesCache.built = null;
    sitesCache.intangible = null;
    sitesCache.natural = null;
    galleryMediaCache = null;
    initPromise = null;
    galleryInitPromise = null;
    Object.values(SITE_CACHE_KEYS).forEach((key) => {
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    });
    try {
      sessionStorage.removeItem(MEDIA_CACHE_KEY);
    } catch {
      /* ignore */
    }
  }

  function subscribeCatalog(onChange) {
    if (typeof onChange !== "function") return null;
    if (typeof MatiHeritageRealtime === "undefined") return null;
    MatiHeritageRealtime.ensure();
    return MatiHeritageRealtime.on(
      MatiHeritageRealtime.TOPIC.catalog,
      async () => {
        invalidateCaches();
        try {
          await hydrateGalleryCatalog({ force: true });
          await loadBuiltSites({ force: true });
        } catch (error) {
          console.warn("MatiHeritageData live refresh failed:", error);
        }
        onChange();
      },
    );
  }

  return {
    init,
    loadBuiltSites,
    loadSitesByCategory,
    loadGallerySites,
    loadGalleryMedia,
    hydrateGalleryCatalog,
    getMapSites,
    hydrate3dExploreSites,
    siteToMapMarker,
    invalidateCaches,
    subscribeCatalog,
  };
})();
