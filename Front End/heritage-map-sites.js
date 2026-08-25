/** Built & natural heritage map catalog — shared by visitor portal and admin */
const HERITAGE_MAP_COLORS = {
  built: "#047857",
  natural: "#0284c7",
};

const HERITAGE_BARANGAY_NAMES = {
  central: "Central",
  dahican: "Dahican",
  badas: "Badas",
  bobon: "Bobon",
  sainz: "Sainz",
  "don-martin-marundan": "Don Martin Marundan",
  "pujada-bay": "Pujada Bay",
  tamisan: "Tamisan",
};

/** Same records as index.html map — built & natural only */
const HERITAGE_MAP_SITES = [
  {
    id: "pylon",
    name: "Pylon Monument",
    category: "built",
    barangay: "central",
    lat: 6.952258,
    lng: 126.216889,
    official: true,
    desc: "Gateway monument erected in memory of Mayor Luis G. Rabat.",
    image: "data/Built Heritage/Pylon Monument/Photographs/Old/Pylon.jpg",
  },
  {
    id: "centennial",
    name: "Centennial Clock and Pathway of Leaders",
    category: "built",
    barangay: "central",
    lat: 6.9521319,
    lng: 126.2167824,
    official: true,
    desc: "Centennial Park and Pathway of Leaders in the poblacion.",
    image:
      "data/Built Heritage/Centennial Clock and Pathway of Leaders/Photographs/New/1000067853.jpg",
  },
  {
    id: "city-hall",
    name: "City Hall",
    category: "built",
    barangay: "central",
    lat: 6.9519495,
    lng: 126.2162107,
    official: true,
    desc: "Seat of the City Government of Mati on Nazareno Street.",
    image: "data/Built Heritage/City Hall/Photographs/Old/City Hall.jpg",
  },
  {
    id: "mfgr",
    name: "MFGR Park & Baywalk",
    category: "built",
    barangay: "central",
    lat: 6.950356,
    lng: 126.216866,
    official: true,
    desc: "Mayor Francisco G. Rabat Park and Baywalk overlooking Pujada Bay.",
    image: "data/Built Heritage/MFGR Park and Baywalk/Map/map_baywalk.jpg",
  },
  {
    id: "subangan",
    name: "Subangan Museum",
    category: "built",
    barangay: "central",
    lat: 6.94425,
    lng: 126.248333,
    official: true,
    desc: "Provincial museum featuring Davor the whale and Mandaya heritage.",
    image:
      "data/Built Heritage/Provincial Capitol of Davao Oriental/Photographs/New/Capitol White House1.jpg",
  },
  {
    id: "capitol",
    name: "Provincial Capitol of Davao Oriental",
    category: "built",
    barangay: "central",
    lat: 6.9483186,
    lng: 126.2271687,
    official: false,
    desc: "Provincial government center within Mati City.",
    image:
      "data/Built Heritage/Provincial Capitol of Davao Oriental/Photographs/Old/Capitol White House.jpg",
  },
  {
    id: "old-mansion",
    name: "Provincial Capitol Old Mansion",
    category: "built",
    barangay: "central",
    lat: 6.9472,
    lng: 126.2268,
    official: false,
    desc: "Historic mansion linked to Davao Oriental governance.",
    image:
      "data/Built Heritage/Provincial Capitol Old Mansion/Photographs/Old/Capitol Old Mansion.jpg",
  },
  {
    id: "gabaldon",
    name: "Gabaldon Structure (RRMCES-1)",
    category: "built",
    barangay: "sainz",
    lat: 6.955,
    lng: 126.219444,
    official: true,
    desc: "Heritage Gabaldon school building of Roxas Memorial Colleges.",
    image:
      "data/Built Heritage/Gabaldon Structure of RRMCES-1/Photographs/Old/Central Gabaldon.jpg",
  },
  {
    id: "noventa",
    name: "Noventa Ancestral House",
    category: "built",
    barangay: "bobon",
    lat: 6.866667,
    lng: 126.325,
    official: true,
    desc: "Preserved ancestral house in Barangay Bobon.",
    image:
      "data/Built Heritage/Noventa Ancestral House/Photographs/2023-09-12 11-22.jpg",
  },
  {
    id: "ompo",
    name: "OMPO sa Tampat sa Baguidan",
    category: "built",
    barangay: "bobon",
    lat: 6.84,
    lng: 126.33,
    official: true,
    desc: "Indigenous graveyard and cultural landmark in Barangay Bobon.",
    image:
      "data/Built Heritage/OMPO sa Tampat sa Baguidan/Photographs/Old/J2048x1536-00654.jpg",
  },
  {
    id: "menzi",
    name: "Menzi Visitors Information Center",
    category: "built",
    barangay: "dahican",
    lat: 6.927318,
    lng: 126.281047,
    official: true,
    desc: "Visitor center and campsite along Dahican shoreline.",
    image:
      "data/Built Heritage/Menzi Visitors Information Center/Photographs/New/J6000x4000-00293.jpg",
  },
  {
    id: "dahican-shoreline",
    name: "Dahican Shoreline",
    category: "natural",
    barangay: "dahican",
    lat: 6.9243488,
    lng: 126.2808986,
    official: false,
    desc: "Seven-kilometer stretch of white sand and turquoise waters — sea turtle sanctuary and hub for skimboarding and surfing.",
    image:
      "data/Built Heritage/Menzi Visitors Information Center/Photographs/New/J6000x4000-00289.jpg",
  },
  {
    id: "guang-guang",
    name: "Guang-guang Mangrove Nature Reserve Park",
    category: "natural",
    barangay: "dahican",
    lat: 6.9154687,
    lng: 126.2617709,
    official: false,
    desc: "201-hectare mangrove sanctuary in Barangay Dahican with boardwalks and an Environmental and Ecotourism Center.",
    image:
      "data/Natural Heritage/Guang-guang Mangrove Nature Reserve Park/Photographs/d.jpg",
  },
  {
    id: "mamacao",
    name: "Mamacao Tree",
    category: "natural",
    barangay: "bobon",
    lat: 6.865,
    lng: 126.3227778,
    official: true,
    desc: "Living heritage tree (Dracontomelon dao) in Purok Mamacaw, Barangay Bobon — a resilient symbol of Mati's natural and cultural history.",
    image:
      "data/Natural Heritage/Mamacao Tree/Photographs/J2048x1536-00472.jpg",
  },
  {
    id: "oak-island",
    name: "Oak Island",
    category: "natural",
    barangay: "pujada-bay",
    lat: 6.8676,
    lng: 126.1913,
    official: false,
    desc: "Vanishing white-sand bar in Pujada Bay that emerges at low tide — a premier snorkeling and island-hopping destination.",
    image: "data/Natural Heritage/Oak Island/Photographs/Oak-Island.jpg",
  },
  {
    id: "pujada-bay",
    name: "Pujada Bay",
    category: "natural",
    barangay: "central",
    lat: 6.89139,
    lng: 126.22722,
    official: false,
    desc: "Majestic cove with turquoise waters, coral reefs, seagrass beds, and mangrove forests linking Mount Hamiguitan to the Pacific.",
    image:
      "data/Natural Heritage/Oak Island/Photographs/Oak & Pujada island.JPG",
  },
  {
    id: "pujada-island",
    name: "Pujada Island",
    category: "natural",
    barangay: "pujada-bay",
    lat: 6.875278,
    lng: 126.183611,
    official: false,
    desc: "157-hectare protected island at the mouth of Pujada Bay with lush forests, white-sand coves, and vibrant coral reefs.",
    image:
      "data/Natural Heritage/Pujada Island/Photographs/pujada island 1.jpg",
  },
  {
    id: "taytay-daga",
    name: "Taytay Daga (Sleeping Dinosaur)",
    category: "natural",
    barangay: "badas",
    lat: 6.886209,
    lng: 126.184072,
    official: true,
    desc: "579-hectare landform in Sitio Baso, Barangay Badas, resembling a dinosaur resting on Pujada Bay — protected under Resolution No. 61, Series of 2019.",
    image:
      "data/Natural Heritage/Taytay Daga (Sleeping Dinosaur)/Photographs/Sleeping.jpg",
  },
  {
    id: "waniban",
    name: "Waniban Island",
    category: "natural",
    barangay: "tamisan",
    lat: 6.8324692,
    lng: 126.273253,
    official: false,
    desc: "Four-hectare white-sand islet in Pujada Bay — part of Mati's Tri-Island hopping circuit, a short boat ride from Barangay Tamisan.",
    image: "data/GALLERY/Waniban-island.jpg",
  },
];

const HERITAGE_COORDINATES_BY_ID = Object.fromEntries(
  HERITAGE_MAP_SITES.map((site) => [site.id, { lat: site.lat, lng: site.lng }]),
);

function heritageBarangayLabel(id) {
  return HERITAGE_BARANGAY_NAMES[id] || id;
}

function createHeritagePhotoIcon(site, size = 40) {
  return L.divIcon({
    className: "heritage-marker-wrap",
    html: `<div class="heritage-photo-marker ${site.category}" style="width:${size}px;height:${size * 1.25}px" title="${site.name}">
          </div>`,
    iconSize: [size, size * 1.25],
    iconAnchor: [size / 2, size * 1.25],
    popupAnchor: [0, -size * 1.25],
  });
}

function buildHeritageMapPopup(site, options = {}) {
  const color = HERITAGE_MAP_COLORS[site.category] || "#475569";
  const label =
    site.category === "built" ? "Built Heritage" : "Natural Heritage";
  const imgSrc = site.image ? encodeURI(site.image) : "";
  const adminBtn =
    options.admin && site.id
      ? `<button type="button" class="map-popup-admin-btn" data-map-site="${site.id}">Manage site</button>`
      : "";

  return `
    <div>
      ${imgSrc ? `<img class="map-popup-photo" src="${imgSrc}" alt="${site.name}" />` : ""}
      <span class="map-popup-cat" style="background:${color}22;color:${color}">${label}</span>
      <div class="map-popup-title">${site.name}</div>
      <div class="map-popup-desc" style="font-size:0.7rem;color:#94a3b8;margin-bottom:0.35rem">Brgy. ${heritageBarangayLabel(site.barangay)} · Mati City</div>
      <div class="map-popup-desc">${site.desc}</div>
      ${adminBtn}
    </div>
  `;
}

function isMapCategory(category) {
  return category === "built" || category === "natural";
}

function adminSiteToMapSite(site) {
  if (!isMapCategory(site.category)) return null;
  const lat = Number(site.lat);
  const lng = Number(site.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: site.id,
    name: site.name,
    category: site.category,
    categoryLabel: site.categoryLabel || "",
    heritageCategory: site.heritageCategory || "",
    ownership: site.ownership || "",
    location: site.location || "",
    barangay: site.barangay || "central",
    lat,
    lng,
    desc: site.description || "",
    image: site.cover || "",
    official: false,
  };
}

function mergeMapSite(base, admin) {
  if (!isMapCategory(admin.category) && admin.category) return null;
  const lat =
    admin.lat != null && admin.lat !== "" ? Number(admin.lat) : base.lat;
  const lng =
    admin.lng != null && admin.lng !== "" ? Number(admin.lng) : base.lng;
  return {
    ...base,
    name: admin.name || base.name,
    category: isMapCategory(admin.category) ? admin.category : base.category,
    categoryLabel: admin.categoryLabel || base.categoryLabel || "",
    heritageCategory: admin.heritageCategory || base.heritageCategory || "",
    ownership: admin.ownership || base.ownership || "",
    location: admin.location || base.location || "",
    lat,
    lng,
    desc: admin.description || base.desc,
    image: admin.cover || base.image,
  };
}

function getHeritageMapDisplaySites() {
  const byId = new Map(
    HERITAGE_MAP_SITES.map((site) => [site.id, { ...site }]),
  );

  if (typeof MatiAdminStore !== "undefined") {
    const activeIds = new Set(MatiAdminStore.getAllSites().map((s) => s.id));

    HERITAGE_MAP_SITES.forEach((base) => {
      // The visitor portal loads the built admin catalog, but not GALLERY_SITES.
      // Keep static natural map records when that catalog is unavailable.
      if (!activeIds.has(base.id) && base.category === "built") {
        byId.delete(base.id);
      }
    });

    MatiAdminStore.getAllSites().forEach((adminSite) => {
      if (!isMapCategory(adminSite.category)) return;

      if (byId.has(adminSite.id)) {
        const merged = mergeMapSite(byId.get(adminSite.id), adminSite);
        if (merged) byId.set(adminSite.id, merged);
      } else {
        const added = adminSiteToMapSite(adminSite);
        if (added) byId.set(adminSite.id, added);
      }
    });
  }

  return [...byId.values()].filter(
    (site) =>
      !String(site.id || "").startsWith("draft-") &&
      isMapCategory(site.category) &&
      Number.isFinite(site.lat) &&
      Number.isFinite(site.lng),
  );
}
