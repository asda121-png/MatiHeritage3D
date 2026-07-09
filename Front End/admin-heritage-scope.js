/** Official admin heritage scope — City Tourism Office catalog */
const ADMIN_HERITAGE_SCOPE = {
  built: {
    label: "Built Heritage",
    mediaTypes: ["photo", "map", "model3d"],
    siteIds: [
      "centennial",
      "city-hall",
      "mfgr",
      "gabaldon",
      "menzi",
      "noventa",
      "ompo",
      "capitol",
      "old-mansion",
      "pylon",
      "subangan",
    ],
  },
  intangible: {
    label: "Intangible Cultural Heritage",
    mediaTypes: ["photo", "video", "audio", "link"],
    siteIds: ["pujada-festival", "sambuokan", "dioscoro"],
  },
  natural: {
    label: "Natural Heritage",
    mediaTypes: ["photo", "video", "link"],
    siteIds: [
      "dahican-shoreline",
      "guang-guang",
      "mamacao",
      "oak-island",
      "pujada-bay",
      "pujada-island",
      "taytay-daga",
      "waniban",
    ],
  },
};

function getScopeMediaTypes(category) {
  return ADMIN_HERITAGE_SCOPE[category]?.mediaTypes || ["photo"];
}

function getScopeSiteOrder(category) {
  return ADMIN_HERITAGE_SCOPE[category]?.siteIds || [];
}

function sortSitesByScope(sites, category) {
  const order = getScopeSiteOrder(category);
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...sites].sort((a, b) => {
    const aRank = rank.has(a.id) ? rank.get(a.id) : Number.MAX_SAFE_INTEGER;
    const bRank = rank.has(b.id) ? rank.get(b.id) : Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

function isScopedCatalogSite(siteId, category) {
  return Boolean(ADMIN_HERITAGE_SCOPE[category]?.siteIds.includes(siteId));
}

function filterSitesToScope(sites, category, isUserAddedSite) {
  const allowed = new Set(ADMIN_HERITAGE_SCOPE[category]?.siteIds || []);
  return sites.filter((site) => {
    if (site.category !== category) return false;
    if (allowed.has(site.id)) return true;
    // Allow admin-created sites in every heritage category (persisted to Supabase).
    return typeof isUserAddedSite === "function" && isUserAddedSite(site.id);
  });
}
