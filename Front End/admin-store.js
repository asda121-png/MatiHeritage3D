/** Heritage & media persistence for admin (localStorage overlay on base catalog) */
const MatiAdminStore = (() => {
  const STORE_KEY = "matiAdminHeritageStore";

  const MEDIA_TYPES = ["photo", "video", "audio", "link", "model3d"];

  const HERITAGE_CATEGORIES = ["built", "intangible", "natural"];

  let remoteSites = null;
  let remoteMedia = null;
  let remoteCommunityStats = null;
  let supabaseReady = false;

  function supabaseEnabled() {
    return (
      typeof MatiSupabase !== "undefined" &&
      MatiSupabase.isConfigured() &&
      typeof MatiSupabaseApi !== "undefined"
    );
  }

  async function initFromSupabase() {
    if (!supabaseEnabled()) {
      return { ok: false, reason: "not_configured" };
    }

    try {
      const [sites, media, community] = await Promise.all([
        MatiSupabaseApi.listSites(),
        MatiSupabaseApi.listMedia(),
        MatiSupabaseApi.getProfileStats().catch(() => null),
      ]);

      remoteSites = sites || [];
      remoteMedia = media || [];
      remoteCommunityStats = community;
      supabaseReady = true;

      const byCategory = Object.fromEntries(
        HERITAGE_CATEGORIES.map((category) => [
          category,
          remoteSites.filter((site) => site.category === category).length,
        ]),
      );

      return {
        ok: true,
        siteCount: remoteSites.length,
        mediaCount: remoteMedia.length,
        byCategory,
        registeredUsers: community?.registeredUsers ?? null,
        gamePlayers: community?.gamePlayers ?? null,
      };
    } catch (error) {
      console.warn("MatiAdminStore Supabase init failed:", error);
      return { ok: false, error };
    }
  }

  function isSupabaseReady() {
    return supabaseReady;
  }

  function getRemoteSiteCount() {
    return remoteSites?.length ?? 0;
  }

  async function importBuiltCatalogToSupabase() {
    if (!supabaseEnabled() || typeof MatiSupabaseApi.seedBuiltHeritageCatalog !== "function") {
      return { ok: false, reason: "not_configured" };
    }

    try {
      const count = await MatiSupabaseApi.seedBuiltHeritageCatalog();
      await initFromSupabase();
      return { ok: true, count };
    } catch (error) {
      const message = error?.message || String(error);
      const needsBootstrap =
        /seed_built_heritage_catalog/i.test(message) &&
        (/does not exist|schema cache|PGRST202/i.test(message));

      return {
        ok: false,
        error,
        needsBootstrap,
        message: needsBootstrap
          ? "Run bootstrap_built_heritage_rpc.sql in Supabase SQL Editor first."
          : message,
      };
    }
  }

  function remoteSiteIds() {
    return new Set((remoteSites || []).map((site) => site.id));
  }

  function remoteManagedSiteIds() {
    if (!supabaseReady || !remoteSites?.length) return new Set();

    const ids = new Set();
    HERITAGE_CATEGORIES.forEach((category) => {
      const remote = remoteSites.filter((site) => site.category === category);
      if (remote.length) remote.forEach((site) => ids.add(site.id));
    });
    return ids;
  }

  async function syncSiteToSupabase(site) {
    if (!supabaseEnabled() || !site?.id) {
      return { ok: false, reason: "not_configured" };
    }

    try {
      const saved = await MatiSupabaseApi.upsertSite(site);
      const row = saved || site;
      if (!remoteSites) remoteSites = [];
      const idx = remoteSites.findIndex((item) => item.id === row.id);
      if (idx >= 0) remoteSites[idx] = row;
      else remoteSites.push(row);
      supabaseReady = true;
      return { ok: true, row };
    } catch (error) {
      console.warn("Supabase site sync failed:", error);
      return { ok: false, error };
    }
  }

  async function syncDeleteSiteToSupabase(siteId) {
    if (!supabaseEnabled()) {
      return { ok: false, reason: "not_configured" };
    }

    try {
      await MatiSupabaseApi.softDeleteSite(siteId);
      if (remoteSites) {
        remoteSites = remoteSites.filter((site) => site.id !== siteId);
      }
      return { ok: true };
    } catch (error) {
      console.warn("Supabase site delete failed:", error);
      return { ok: false, error };
    }
  }

  async function syncMediaToSupabase(item, site) {
    if (!supabaseEnabled() || !item?.id || !site?.id) {
      return { ok: false, reason: "not_configured" };
    }

    try {
      const saved = await MatiSupabaseApi.upsertMedia(item);
      const row = saved || item;
      if (!remoteMedia) remoteMedia = [];
      const idx = remoteMedia.findIndex((media) => media.id === row.id);
      if (idx >= 0) remoteMedia[idx] = row;
      else remoteMedia.push(row);
      return { ok: true, row };
    } catch (error) {
      console.warn("Supabase media sync failed:", error);
      return { ok: false, error };
    }
  }

  async function syncDeleteMediaToSupabase(mediaId) {
    if (!supabaseEnabled()) {
      return { ok: false, reason: "not_configured" };
    }

    try {
      await MatiSupabaseApi.softDeleteMedia(mediaId);
      if (remoteMedia) {
        remoteMedia = remoteMedia.filter((item) => item.id !== mediaId);
      }
      return { ok: true };
    } catch (error) {
      console.warn("Supabase media delete failed:", error);
      return { ok: false, error };
    }
  }

  function clearVisitorHeritageCaches() {
    try {
      [
        "matiBuiltHeritageSites_v2",
        "matiIntangibleHeritageSites_v1",
        "matiNaturalHeritageSites_v1",
        "matiGalleryHeritageMedia_v1",
      ].forEach((key) => sessionStorage.removeItem(key));
    } catch {
      /* ignore */
    }
    // Same-browser visitor tabs (gallery, explore, map) refresh immediately.
    if (typeof MatiHeritageRealtime?.bumpCatalog === "function") {
      MatiHeritageRealtime.bumpCatalog({ media: true, sites: true });
    } else {
      try {
        localStorage.setItem(
          "matiHeritageCatalogBump",
          String(Date.now()),
        );
      } catch {
        /* ignore */
      }
    }
  }

  function emptyStore() {
    return {
      siteEdits: {},
      addedSites: [],
      deletedSiteIds: [],
      mediaEdits: {},
      addedMedia: [],
      deletedMediaIds: [],
      mediaOrder: {},
    };
  }

  function readStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? { ...emptyStore(), ...JSON.parse(raw) } : emptyStore();
    } catch {
      return emptyStore();
    }
  }

  function writeStore(store) {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }

  function staticSitesForCategory(category) {
    if (category === "built") {
      return typeof BUILT_HERITAGE_SITES !== "undefined"
        ? [...BUILT_HERITAGE_SITES]
        : [];
    }
    return (typeof GALLERY_SITES !== "undefined" ? GALLERY_SITES : []).filter(
      (site) => site.category === category,
    );
  }

  function baseSites() {
    if (!supabaseReady || !remoteSites) {
      return HERITAGE_CATEGORIES.flatMap(staticSitesForCategory);
    }

    return HERITAGE_CATEGORIES.flatMap((category) => {
      const remote = remoteSites.filter((site) => site.category === category);
      return remote.length ? remote : staticSitesForCategory(category);
    });
  }

  function staticBuiltMedia() {
    return typeof BUILT_HERITAGE_MEDIA !== "undefined"
      ? [...BUILT_HERITAGE_MEDIA]
      : [];
  }

  function baseMedia() {
    const staticGallery =
      typeof GALLERY_MEDIA !== "undefined" ? [...GALLERY_MEDIA] : [];
    const staticBuilt = staticBuiltMedia();
    const staticAll = [...staticBuilt, ...staticGallery];

    if (!supabaseReady || !remoteMedia) return staticAll;

    const managed = remoteManagedSiteIds();
    // Prefer remote rows for managed sites; keep static media for any site
    // not yet represented in the remote catalog (e.g. before media seed).
    const remoteIds = new Set((remoteMedia || []).map((item) => item.id));
    const remoteSiteIdsWithMedia = new Set(
      (remoteMedia || []).map((item) => item.siteId),
    );
    const staticRemainder = staticAll.filter((item) => {
      if (remoteIds.has(item.id)) return false;
      if (managed.has(item.siteId) && remoteSiteIdsWithMedia.has(item.siteId)) {
        return false;
      }
      return true;
    });
    return [...remoteMedia, ...staticRemainder];
  }

  function slugId(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
  }

  function isDraftSiteId(siteId) {
    return Boolean(siteId && String(siteId).startsWith("draft-"));
  }

  function applySiteEdits(base, edit) {
    if (!edit) return { ...base };

    const merged = { ...base, ...edit };
    const inheritIfEmpty = [
      "location",
      "heritageCategory",
      "ownership",
      "cover",
      "modelSrc",
      "description",
    ];

    inheritIfEmpty.forEach((key) => {
      const edited = edit[key];
      const baseVal = base[key];
      const editedEmpty =
        edited === undefined || edited === null || String(edited).trim() === "";
      if (editedEmpty && baseVal && String(baseVal).trim() !== "") {
        merged[key] = baseVal;
      }
    });

    return merged;
  }

  function getAllSites() {
    const store = readStore();
    const deleted = new Set(store.deletedSiteIds);
    const dbIds = remoteSiteIds();
    const map = new Map();

    baseSites().forEach((site) => {
      if (deleted.has(site.id)) return;
      const edit = dbIds.has(site.id) ? null : store.siteEdits[site.id];
      map.set(site.id, applySiteEdits(site, edit));
    });

    store.addedSites.forEach((site) => {
      if (!deleted.has(site.id)) map.set(site.id, { ...site });
    });

    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }

  function getSiteById(siteId) {
    return getAllSites().find((s) => s.id === siteId) || null;
  }

  function getSitesByCategory(category) {
    const sites = getAllSites().filter(
      (s) => s.category === category && !isDraftSiteId(s.id),
    );
    if (typeof filterSitesToScope === "function") {
      return sortSitesByScope(
        filterSitesToScope(sites, category, isUserAddedSite),
        category,
      );
    }
    return sites;
  }

  function isUserAddedSite(siteId) {
    return readStore().addedSites.some((site) => site.id === siteId);
  }

  function parseCoord(value) {
    if (value === null || value === undefined || value === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function resolveCoords(site) {
    const lat = parseCoord(site.lat);
    const lng = parseCoord(site.lng);
    if (lat !== null && lng !== null) return { lat, lng };

    if (
      typeof HERITAGE_COORDINATES_BY_ID !== "undefined" &&
      HERITAGE_COORDINATES_BY_ID[site.id]
    ) {
      return { ...HERITAGE_COORDINATES_BY_ID[site.id] };
    }

    return null;
  }

  function getSitesForMap() {
    if (typeof getHeritageMapDisplaySites === "function") {
      return getHeritageMapDisplaySites();
    }
    return getAllSites()
      .filter(
        (s) =>
          (s.category === "built" || s.category === "natural") &&
          !isDraftSiteId(s.id),
      )
      .map((site) => {
        const coords = resolveCoords(site);
        return coords ? { ...site, lat: coords.lat, lng: coords.lng } : null;
      })
      .filter(Boolean);
  }

  function getUnmappedSites() {
    return getAllSites().filter((site) => {
      if (isDraftSiteId(site.id)) return false;
      if (site.category !== "built" && site.category !== "natural") return false;
      return !resolveCoords(site);
    });
  }

  async function migrateSite(fromId, toId) {
    if (!fromId || !toId || fromId === toId) {
      return getSiteById(toId || fromId);
    }

    const store = readStore();
    const site = getSiteById(fromId);
    if (!site) return getSiteById(toId);

    const payload = { ...site, id: toId };
    store.addedSites = store.addedSites.filter((s) => s.id !== fromId);
    const existingIdx = store.addedSites.findIndex((s) => s.id === toId);
    if (existingIdx >= 0) {
      store.addedSites[existingIdx] = {
        ...store.addedSites[existingIdx],
        ...payload,
      };
    } else {
      store.addedSites.push(payload);
    }

    store.addedMedia = store.addedMedia.map((item) =>
      item.siteId === fromId ? { ...item, siteId: toId, siteName: payload.name } : item,
    );

    if (store.mediaOrder) {
      Object.keys(store.mediaOrder).forEach((key) => {
        if (key.startsWith(`${fromId}:`)) {
          const type = key.slice(fromId.length + 1);
          store.mediaOrder[`${toId}:${type}`] = store.mediaOrder[key];
          delete store.mediaOrder[key];
        }
      });
    }

    delete store.siteEdits[fromId];
    writeStore(store);

    const syncNew = await syncSiteToSupabase(payload);
    await syncDeleteSiteToSupabase(fromId);

    const movedMedia = getSiteMedia(toId);
    await Promise.all(
      movedMedia.map((item) => syncMediaToSupabase({ ...item, siteId: toId }, payload)),
    );

    if (syncNew.ok) clearVisitorHeritageCaches();
    return getSiteById(toId);
  }

  async function saveSite(site) {
    const store = readStore();
    const isNew = !baseSites().some((s) => s.id === site.id);
    const lat = parseCoord(site.lat);
    const lng = parseCoord(site.lng);
    const payload = {
      id: site.id || slugId(site.name),
      name: site.name.trim(),
      category: site.category,
      categoryLabel: site.categoryLabel || categoryLabel(site.category),
      cover: site.cover?.trim() || "",
      description: site.description?.trim() || "",
      location: site.location?.trim() || "",
      modelSrc: site.modelSrc?.trim() || "",
      heritageCategory: site.heritageCategory?.trim() || "",
      ownership: site.ownership?.trim() || "",
      updatedAt: new Date().toISOString(),
    };

    if (lat !== null) payload.lat = lat;
    if (lng !== null) payload.lng = lng;

    if (isNew && !store.addedSites.some((s) => s.id === payload.id)) {
      store.addedSites.push(payload);
    } else if (isNew) {
      const idx = store.addedSites.findIndex((s) => s.id === payload.id);
      store.addedSites[idx] = payload;
    } else {
      store.siteEdits[payload.id] = {
        ...store.siteEdits[payload.id],
        ...payload,
      };
    }

    writeStore(store);
    const sync = await syncSiteToSupabase(payload);
    if (sync.ok) clearVisitorHeritageCaches();
    payload._sync = sync;
    return payload;
  }

  async function deleteSite(siteId) {
    const store = readStore();
    if (!store.deletedSiteIds.includes(siteId)) {
      store.deletedSiteIds.push(siteId);
    }
    store.addedSites = store.addedSites.filter((s) => s.id !== siteId);
    delete store.siteEdits[siteId];
    writeStore(store);
    const sync = await syncDeleteSiteToSupabase(siteId);
    if (sync.ok) clearVisitorHeritageCaches();
    return sync;
  }

  function categoryLabel(cat) {
    if (cat === "built") return "Built Heritage";
    if (cat === "intangible") return "Intangible Cultural Heritage";
    return "Natural Heritage";
  }

  function mediaOrderKey(siteId, type) {
    return `${siteId}:${type}`;
  }

  function prependToMediaOrder(store, siteId, type, mediaId) {
    if (!store.mediaOrder) store.mediaOrder = {};
    const key = mediaOrderKey(siteId, type);
    const current = store.mediaOrder[key] || [];
    store.mediaOrder[key] = [mediaId, ...current.filter((id) => id !== mediaId)];
  }

  function removeFromMediaOrders(store, mediaId) {
    if (!store.mediaOrder) return;
    Object.keys(store.mediaOrder).forEach((key) => {
      store.mediaOrder[key] = store.mediaOrder[key].filter((id) => id !== mediaId);
    });
  }

  function baseMediaIndexMap() {
    const indexMap = new Map();
    baseMedia().forEach((item, index) => {
      if (!indexMap.has(item.id)) indexMap.set(item.id, index);
    });
    return indexMap;
  }

  function sortSiteMediaItems(items, siteId, type) {
    const store = readStore();
    const localOrder = store.mediaOrder?.[mediaOrderKey(siteId, type)];
    const sortValues = items
      .map((item) => Number(item.sortOrder))
      .filter((value) => Number.isFinite(value));
    const hasMeaningfulRemoteOrder =
      sortValues.some((value) => value > 0) ||
      new Set(sortValues).size > 1;

    // Prefer admin local drag order when present; otherwise use DB sort_order.
    const order =
      Array.isArray(localOrder) && localOrder.length
        ? localOrder
        : hasMeaningfulRemoteOrder
          ? [...items]
              .sort(
                (a, b) =>
                  (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) ||
                  String(a.title || "").localeCompare(String(b.title || "")),
              )
              .map((item) => item.id)
          : null;

    const indexMap = baseMediaIndexMap();

    if (!order?.length) {
      return [...items].sort((a, b) => {
        const bySort =
          (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
        if (bySort) return bySort;
        const byUpdated = (b.updatedAt || "").localeCompare(a.updatedAt || "");
        if (byUpdated) return byUpdated;
        return (indexMap.get(a.id) ?? 0) - (indexMap.get(b.id) ?? 0);
      });
    }

    const rank = new Map(order.map((id, index) => [id, index]));
    return [...items].sort((a, b) => {
      const ra = rank.has(a.id)
        ? rank.get(a.id)
        : order.length + (indexMap.get(a.id) ?? 0);
      const rb = rank.has(b.id)
        ? rank.get(b.id)
        : order.length + (indexMap.get(b.id) ?? 0);
      if (ra !== rb) return ra - rb;
      return a.title.localeCompare(b.title);
    });
  }

  function getAllMedia() {
    const store = readStore();
    const deleted = new Set(store.deletedMediaIds);
    const managed = remoteManagedSiteIds();
    const byId = new Map();

    baseMedia().forEach((item) => {
      if (!item?.id || deleted.has(item.id)) return;
      const edit = managed.has(item.siteId) ? null : store.mediaEdits[item.id];
      byId.set(item.id, { ...item, ...edit });
    });

    // Local additions (offline / pending sync). Skip any id already present
    // from Supabase/base so a successful upload can't render as a duplicate.
    store.addedMedia.forEach((item) => {
      if (!item?.id || deleted.has(item.id) || byId.has(item.id)) return;
      byId.set(item.id, { ...item });
    });

    return [...byId.values()];
  }

  function getSiteMedia(siteId) {
    return getAllMedia().filter((m) => m.siteId === siteId);
  }

  function getOrderedSiteMedia(siteId, type) {
    return sortSiteMediaItems(
      getSiteMedia(siteId).filter((item) => item.type === type),
      siteId,
      type,
    );
  }

  async function reorderSiteMedia(siteId, type, orderedIds) {
    const store = readStore();
    if (!store.mediaOrder) store.mediaOrder = {};
    store.mediaOrder[mediaOrderKey(siteId, type)] = [...orderedIds];
    writeStore(store);

    // Mirror sort order onto in-memory remote rows immediately.
    if (remoteMedia?.length) {
      orderedIds.forEach((id, index) => {
        const row = remoteMedia.find((item) => item.id === id);
        if (row) row.sortOrder = index;
      });
    }

    if (
      supabaseEnabled() &&
      typeof MatiSupabaseApi.setMediaSortOrder === "function"
    ) {
      try {
        await MatiSupabaseApi.setMediaSortOrder(siteId, type, orderedIds);
        clearVisitorHeritageCaches();
        return { ok: true };
      } catch (error) {
        console.warn("Media sort order sync failed:", error);
        return { ok: false, error };
      }
    }

    return { ok: true, localOnly: true };
  }

  async function syncAllMediaOrdersToSupabase() {
    if (
      !supabaseEnabled() ||
      typeof MatiSupabaseApi.setMediaSortOrder !== "function"
    ) {
      return { ok: false, reason: "not_configured" };
    }

    // Publish the order each folder currently shows in Admin (local drag,
    // updatedAt, or catalog index) so visitors get the same placement.
    const types = ["photo", "video", "audio"];
    const sites = getAllSites();
    let synced = 0;
    let lastError = null;

    for (const site of sites) {
      if (!site?.id) continue;
      for (const type of types) {
        const items = getOrderedSiteMedia(site.id, type);
        if (items.length < 2) continue;
        const orderedIds = items.map((item) => item.id);
        try {
          const store = readStore();
          if (!store.mediaOrder) store.mediaOrder = {};
          store.mediaOrder[mediaOrderKey(site.id, type)] = [...orderedIds];
          writeStore(store);

          if (remoteMedia?.length) {
            orderedIds.forEach((id, index) => {
              const row = remoteMedia.find((item) => item.id === id);
              if (row) row.sortOrder = index;
            });
          }

          await MatiSupabaseApi.setMediaSortOrder(site.id, type, orderedIds);
          synced += 1;
        } catch (error) {
          lastError = error;
          console.warn(
            `Failed syncing media order ${site.id}:${type}:`,
            error,
          );
        }
      }
    }

    if (synced) clearVisitorHeritageCaches();
    return lastError
      ? { ok: false, synced, error: lastError }
      : { ok: true, synced };
  }

  async function publishSiteMediaOrder(siteId, type) {
    const items = getOrderedSiteMedia(siteId, type);
    if (items.length < 2) return { ok: true, skipped: true };
    return reorderSiteMedia(
      siteId,
      type,
      items.map((item) => item.id),
    );
  }

  async function saveMedia(item) {
    const store = readStore();
    const site = getSiteById(item.siteId);
    if (!site) return null;

    const existingId = item.id?.trim() || "";
    const inBase = existingId && baseMedia().some((m) => m.id === existingId);
    const addedIdx = existingId
      ? store.addedMedia.findIndex((m) => m.id === existingId)
      : -1;
    const isNew = !inBase && addedIdx < 0;

    const payload = {
      id:
        existingId ||
        `${item.siteId}-${item.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: item.type,
      siteId: item.siteId,
      siteName: site.name,
      category: site.category,
      src: item.src?.trim() || "",
      title: item.title?.trim() || site.name,
      caption: item.caption?.trim() || "",
      credit: item.credit?.trim() || "",
      author: item.author?.trim() || "",
      year: item.year?.trim() || "",
      updatedAt: new Date().toISOString(),
    };

    if (!inBase) {
      if (addedIdx >= 0) store.addedMedia[addedIdx] = payload;
      else store.addedMedia.push(payload);
    } else {
      store.mediaEdits[payload.id] = {
        ...store.mediaEdits[payload.id],
        ...payload,
      };
    }

    if (isNew) {
      prependToMediaOrder(store, payload.siteId, payload.type, payload.id);
    }

    writeStore(store);
    const sync = await syncMediaToSupabase(payload, site);
    if (sync.ok) {
      clearVisitorHeritageCaches();
      // Once the row lives in remoteMedia, drop the local duplicate copy.
      const after = readStore();
      after.addedMedia = after.addedMedia.filter((item) => item.id !== payload.id);
      writeStore(after);

      // Keep visitor gallery placement in sync with admin order.
      const order =
        after.mediaOrder?.[mediaOrderKey(payload.siteId, payload.type)] || null;
      if (
        order?.length &&
        typeof MatiSupabaseApi.setMediaSortOrder === "function"
      ) {
        try {
          await MatiSupabaseApi.setMediaSortOrder(
            payload.siteId,
            payload.type,
            order,
          );
        } catch (error) {
          console.warn("Media order sync after upload failed:", error);
        }
      }
    }
    payload._sync = sync;
    return payload;
  }

  async function deleteMedia(mediaId) {
    return deleteMediaMany([mediaId]);
  }

  async function deleteMediaMany(mediaIds) {
    const store = readStore();
    const unique = [...new Set(mediaIds.filter(Boolean))];
    if (!unique.length) return 0;

    const targets = unique
      .map((mediaId) => getAllMedia().find((item) => item.id === mediaId))
      .filter(Boolean);

    unique.forEach((mediaId) => {
      if (!store.deletedMediaIds.includes(mediaId)) {
        store.deletedMediaIds.push(mediaId);
      }
      store.addedMedia = store.addedMedia.filter((m) => m.id !== mediaId);
      delete store.mediaEdits[mediaId];
      removeFromMediaOrders(store, mediaId);
    });

    writeStore(store);

    await Promise.all(targets.map((item) => syncDeleteMediaToSupabase(item.id)));
    clearVisitorHeritageCaches();

    return unique.length;
  }

  function getSiteStats(siteId) {
    const media = getSiteMedia(siteId);
    const audio = media.filter((m) => m.type === "audio").length;
    return {
      photos: media.filter((m) => m.type === "photo").length,
      videos: media.filter((m) => m.type === "video").length,
      audio,
      recordings: audio,
      links: media.filter((m) => m.type === "link").length,
      models: media.filter((m) => m.type === "model3d").length,
      total: media.length,
    };
  }

  function getLocalCommunityStats() {
    const users =
      typeof MatiAuth !== "undefined" ? MatiAuth.readUsers() : [];
    const registered = getRegisteredUsers();
    return {
      registeredUsers: users.length,
      gamePlayers: registered.filter((user) => Number(user.points) > 0).length,
    };
  }

  function getDashboardCommunityStats() {
    if (remoteCommunityStats) return remoteCommunityStats;
    return getLocalCommunityStats();
  }

  function getDashboardStats() {
    const sites = getAllSites().filter((site) => !isDraftSiteId(site.id));
    const media = getAllMedia();
    const builtSites = sites.filter((site) => site.category === "built");
    const community = getDashboardCommunityStats();
    return {
      built: builtSites.length,
      intangible: sites.filter((s) => s.category === "intangible").length,
      natural: sites.filter((s) => s.category === "natural").length,
      photos: media.filter((m) => m.type === "photo").length,
      videos: media.filter((m) => m.type === "video").length,
      audio: media.filter((m) => m.type === "audio").length,
      models:
        media.filter((m) => m.type === "model3d").length +
        builtSites.filter((site) => site.modelSrc).length,
      users: community.registeredUsers,
      gamePlayers: community.gamePlayers,
    };
  }

  function getDashboardCollectionSummary() {
    const categories = [
      {
        key: "built",
        label: "Built Heritage",
        type: "Tangible Immovable",
      },
      {
        key: "intangible",
        label: "Intangible Cultural Heritage",
        type: "Intangible",
      },
      {
        key: "natural",
        label: "Natural Heritage",
        type: "Natural",
      },
    ];

    return categories.map((category) => {
      const sites = getSitesByCategory(category.key);
      let photos = 0;
      let videos = 0;
      let audio = 0;
      let links = 0;
      let models = 0;

      sites.forEach((site) => {
        const stats = getSiteStats(site.id);
        photos += stats.photos;
        videos += stats.videos;
        audio += stats.audio;
        links += stats.links;
        if (category.key === "built") {
          models += stats.models + (site.modelSrc ? 1 : 0);
        }
      });

      return {
        ...category,
        sites: sites.length,
        photos,
        videos,
        audio,
        links,
        models,
      };
    });
  }

  function getRegisteredUsers() {
    if (typeof MatiAuth === "undefined") return [];
    return MatiAuth.readUsers().map((u) => ({
      displayName: u.displayName,
      username: u.username,
      email: u.email,
      createdAt: u.createdAt,
      points: u.heritagePoints ?? 0,
    }));
  }

  function playerAvatarUrl(username) {
    if (typeof MatiAuth !== "undefined" && MatiAuth.getAvatarUrl) {
      return MatiAuth.getAvatarUrl(username);
    }
    return `https://i.pravatar.cc/150?u=${encodeURIComponent(username || "guest")}`;
  }

  let leaderboardCache = [];
  let leaderboardLoadedAt = 0;
  let leaderboardUnsubscribe = null;

  function getLeaderboardLocal() {
    const users = getRegisteredUsers()
      .map((u) => ({
        username: u.username,
        points: Number(u.points) || 0,
        avatarUrl: playerAvatarUrl(u.username),
      }))
      .filter((u) => u.points > 0);

    const sessionPts =
      typeof MatiHeritagePoints !== "undefined"
        ? MatiHeritagePoints.readLocal()
        : parseInt(localStorage.getItem("totalHeritagePoints") || "0", 10);
    const session = typeof MatiAuth !== "undefined" ? MatiAuth.getSession() : null;
    if (session && sessionPts > 0) {
      const exists = users.some((u) => u.username === session.username);
      if (!exists) {
        users.push({
          username: session.username,
          points: sessionPts,
          avatarUrl: playerAvatarUrl(session.username),
        });
      }
    }

    return users.sort((a, b) => b.points - a.points).slice(0, 50);
  }

  function getLeaderboard() {
    if (leaderboardCache.length) return leaderboardCache.slice(0, 50);
    return getLeaderboardLocal();
  }

  async function refreshLeaderboard({ force = false } = {}) {
    const now = Date.now();
    if (!force && leaderboardCache.length && now - leaderboardLoadedAt < 2500) {
      return leaderboardCache;
    }

    try {
      if (
        typeof MatiSupabaseApi !== "undefined" &&
        typeof MatiSupabaseApi.getLeaderboard === "function"
      ) {
        const remote = await MatiSupabaseApi.getLeaderboard(50);
        if (Array.isArray(remote)) {
          leaderboardCache = remote.map((row) => ({
            username: row.username,
            displayName: row.displayName || row.username,
            points: Number(row.points) || 0,
            avatarUrl: row.avatarUrl || playerAvatarUrl(row.username),
          }));
          leaderboardLoadedAt = Date.now();
          return leaderboardCache;
        }
      }
    } catch (error) {
      console.warn("Leaderboard refresh failed:", error);
    }

    leaderboardCache = getLeaderboardLocal();
    leaderboardLoadedAt = Date.now();
    return leaderboardCache;
  }

  let catalogUnsubscribe = null;

  function subscribeLeaderboard(onChange) {
    if (leaderboardUnsubscribe) {
      leaderboardUnsubscribe();
      leaderboardUnsubscribe = null;
    }

    if (
      typeof MatiSupabaseApi === "undefined" ||
      typeof MatiSupabaseApi.subscribeLeaderboard !== "function"
    ) {
      return null;
    }

    leaderboardUnsubscribe = MatiSupabaseApi.subscribeLeaderboard(async () => {
      await refreshLeaderboard({ force: true });
      if (typeof onChange === "function") onChange(getLeaderboard());
    });
    return leaderboardUnsubscribe;
  }

  function stopLeaderboardLive() {
    if (leaderboardUnsubscribe) {
      leaderboardUnsubscribe();
      leaderboardUnsubscribe = null;
    }
  }

  function subscribeCatalog(onChange) {
    if (catalogUnsubscribe) {
      catalogUnsubscribe();
      catalogUnsubscribe = null;
    }

    const attach = (handler) => {
      catalogUnsubscribe = handler;
      return catalogUnsubscribe;
    };

    if (typeof MatiHeritageRealtime !== "undefined") {
      MatiHeritageRealtime.ensure();
      return attach(
        MatiHeritageRealtime.on(MatiHeritageRealtime.TOPIC.catalog, async () => {
          await initFromSupabase();
          if (typeof onChange === "function") onChange();
        }),
      );
    }

    if (typeof MatiSupabaseApi?.subscribeHeritageCatalog === "function") {
      return attach(
        MatiSupabaseApi.subscribeHeritageCatalog(async () => {
          await initFromSupabase();
          if (typeof onChange === "function") onChange();
        }),
      );
    }

    return null;
  }

  function stopCatalogLive() {
    if (catalogUnsubscribe) {
      catalogUnsubscribe();
      catalogUnsubscribe = null;
    }
  }

  function heritageReportRows(category) {
    const sites = category ? getSitesByCategory(category) : getAllSites().filter((site) => !isDraftSiteId(site.id));
    return sites.map((site) => {
      const stats = getSiteStats(site.id);
      return {
        id: site.id,
        category: site.categoryLabel || categoryLabel(site.category),
        heritageType: site.heritageCategory || "—",
        ownership: site.ownership || "—",
        name: site.name,
        location: site.location || "—",
        photos: stats.photos,
        videos: stats.videos,
        audio: stats.audio,
        links: stats.links,
        models: stats.models || (site.modelSrc ? 1 : 0),
        model3d: site.modelSrc || "—",
        totalMedia: stats.total,
      };
    });
  }

  const LCI_COLUMNS = [
    { key: "no", label: "No." },
    { key: "name", label: "Name of Cultural Property" },
    { key: "location", label: "Location" },
    { key: "propertyType", label: "Type" },
    { key: "category", label: "Category / Classification" },
    { key: "ownership", label: "Ownership" },
    { key: "description", label: "Brief Description" },
    { key: "multimedia", label: "Multimedia" },
    { key: "areaHa", label: "Area Occupied (ha)" },
    { key: "yearStarted", label: "Year Constructed / Started" },
    { key: "declaration", label: "Declaration" },
    { key: "reference", label: "Reference" },
  ];

  function lciPropertyType(category) {
    if (category === "built") return "Tangible Immovable";
    if (category === "intangible") return "Intangible";
    if (category === "natural") return "Natural";
    return "";
  }

  function decimalToDms(value, isLatitude) {
    if (value == null || Number.isNaN(Number(value))) return "";
    const decimal = Number(value);
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = ((minutesFloat - minutes) * 60).toFixed(1);
    const hemisphere = isLatitude
      ? decimal >= 0
        ? "N"
        : "S"
      : decimal >= 0
        ? "E"
        : "W";
    return `${degrees}\u00b0 ${minutes}' ${seconds}" ${hemisphere}`;
  }

  function formatLciLocation(site) {
    const parts = [];
    if (site.location) parts.push(site.location.trim());
    if (site.lat != null && site.lng != null) {
      if (parts.length) parts.push("");
      parts.push("Geographical Coordinates:");
      parts.push(`Latitude: ${decimalToDms(site.lat, true)}`);
      parts.push(`Longitude: ${decimalToDms(site.lng, false)}`);
    }
    return parts.join("\n");
  }

  function formatLciMultimedia(stats, site) {
    const models = stats.models || (site.modelSrc ? 1 : 0);
    const total =
      stats.photos + stats.videos + stats.audio + stats.links + models;
    return total > 0 ? String(total) : "";
  }

  function getLciInventorySites() {
    return [
      ...getSitesByCategory("built"),
      ...getSitesByCategory("intangible"),
      ...getSitesByCategory("natural"),
    ];
  }

  function getLciInventoryNumber(siteId) {
    const index = getLciInventorySites().findIndex((site) => site.id === siteId);
    return index >= 0 ? index + 1 : "";
  }

  function buildLciInventoryRow(site, index) {
    const stats = getSiteStats(site.id);
    let ownership = "";
    if (site.category === "built") {
      ownership = site.ownership || "";
    } else if (site.category === "intangible" || site.category === "natural") {
      ownership = "NA";
    }

    return {
      no: index + 1,
      name: site.name || "",
      location: formatLciLocation(site),
      propertyType: lciPropertyType(site.category),
      category: site.heritageCategory || "",
      ownership,
      description: site.description || "",
      multimedia: formatLciMultimedia(stats, site),
      areaHa: site.areaHa || "",
      yearStarted: site.yearStarted || "",
      declaration: site.declaration || "",
      reference: site.reference || "",
    };
  }

  function buildLciInventoryRows() {
    return getLciInventorySites().map((site, index) =>
      buildLciInventoryRow(site, index),
    );
  }

  function buildLciSummary() {
    const stats = getDashboardStats();
    return {
      built: stats.built,
      natural: stats.natural,
      intangible: stats.intangible,
      totalProperties: stats.built + stats.natural + stats.intangible,
      totalPhotos: stats.photos,
      totalVideos: stats.videos,
      totalAudio: stats.audio,
      totalModels: stats.models,
      registeredUsers: stats.users,
      year: new Date().getFullYear(),
    };
  }

  function cleanCsvValue(value) {
    if (value == null) return "";
    if (typeof value === "number") return value;
    const text = String(value).trim();
    if (!text || text === "—" || text === "-" || text === "N/A" || text === "NA") {
      return "";
    }
    return text;
  }

  function csvEscape(value) {
    const cleaned = cleanCsvValue(value);
    if (cleaned === "") return "";
    const s = String(cleaned);
    return s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  }

  function exportLciInventoryCsv() {
    const summary = buildLciSummary();
    const rows = buildLciInventoryRows();
    const lines = [
      "MATI LOCAL CULTURAL INVENTORY",
      "City Government of Mati - City Tourism and Promotions Office",
      "",
      "SUMMARY",
      "Category,Count",
      `Built Heritage (Tangible Immovable),${summary.built}`,
      `Natural Heritage,${summary.natural}`,
      `Intangible Cultural Heritage,${summary.intangible}`,
      "",
      "Media Type,Count",
      `Photos,${summary.totalPhotos}`,
      `Videos,${summary.totalVideos}`,
      `Audio,${summary.totalAudio}`,
      `3D Models,${summary.totalModels}`,
      "",
      `Registered Portal Users,${summary.registeredUsers}`,
      "",
      "LOCAL CULTURAL INVENTORY RECORDS",
      LCI_COLUMNS.map((column) => column.label).join(","),
      ...rows.map((row) =>
        LCI_COLUMNS.map((column) => csvEscape(row[column.key])).join(","),
      ),
    ];

    const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], {
      type: "text/csv;charset=utf-8;",
    });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `mati-local-cultural-inventory-${summary.year}.csv`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  function exportCsv(filename, columns, rows) {
    const escape = csvEscape;

    const keys = columns.map((c) => (typeof c === "string" ? c : c.key));
    const labels = columns.map((c) => (typeof c === "string" ? c : c.label));
    const lines = [
      labels.join(","),
      ...rows.map((row) => keys.map((k) => escape(row[k])).join(",")),
    ];
    const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], {
      type: "text/csv;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function siteHasAdminEdits(siteId) {
    if (!siteId || isDraftSiteId(siteId)) return false;

    const store = readStore();
    if (store.siteEdits[siteId]) return true;
    if (store.addedSites.some((site) => site.id === siteId)) return true;
    if (store.addedMedia.some((item) => item.siteId === siteId)) return true;
    if (Object.values(store.mediaEdits).some((item) => item.siteId === siteId)) {
      return true;
    }

    return baseMedia().some(
      (item) => item.siteId === siteId && store.deletedMediaIds.includes(item.id),
    );
  }

  function siteMediaHasAdminEdits(siteId, mediaType) {
    if (!siteId) return false;

    const store = readStore();
    if (
      store.addedMedia.some(
        (item) => item.siteId === siteId && item.type === mediaType,
      )
    ) {
      return true;
    }
    if (
      Object.values(store.mediaEdits).some(
        (item) => item.siteId === siteId && item.type === mediaType,
      )
    ) {
      return true;
    }

    return baseMedia()
      .filter((item) => item.siteId === siteId && item.type === mediaType)
      .some((item) => store.deletedMediaIds.includes(item.id));
  }

  return {
    MEDIA_TYPES,
    slugId,
    isDraftSiteId,
    categoryLabel,
    initFromSupabase,
    isSupabaseReady,
    getRemoteSiteCount,
    importBuiltCatalogToSupabase,
    getAllSites,
    getSiteById,
    getSitesByCategory,
    saveSite,
    deleteSite,
    migrateSite,
    siteHasAdminEdits,
    siteMediaHasAdminEdits,
    isUserAddedSite,
    getAllMedia,
    getSiteMedia,
    getOrderedSiteMedia,
    reorderSiteMedia,
    syncAllMediaOrdersToSupabase,
    publishSiteMediaOrder,
    saveMedia,
    deleteMedia,
    deleteMediaMany,
    getSiteStats,
    getDashboardStats,
    getDashboardCommunityStats,
    getDashboardCollectionSummary,
    getRegisteredUsers,
    getLeaderboard,
    refreshLeaderboard,
    subscribeLeaderboard,
    stopLeaderboardLive,
    subscribeCatalog,
    stopCatalogLive,
    heritageReportRows,
    exportCsv,
    exportLciInventoryCsv,
    buildLciInventoryRow,
    buildLciInventoryRows,
    buildLciSummary,
    getLciInventoryNumber,
    getLciInventorySites,
    formatLciLocation,
    LCI_COLUMNS,
    resolveCoords,
    getSitesForMap,
    getUnmappedSites,
  };
})();
