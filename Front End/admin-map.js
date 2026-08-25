/** Admin — Mati City heritage map (aligned with visitor portal index.html) */
const MatiAdminMap = (() => {
  const WORLD_MASK_RING = [
    [-90, -180],
    [-90, 180],
    [90, 180],
    [90, -180],
  ];

  let map = null;
  let markersLayer = null;
  let pickMarker = null;
  let pickCallback = null;
  let onSiteSelect = null;
  let mapCategoryFilter = "all";
  let mainRing = [];
  const markerBySiteId = new Map();

  function ringsFromGeojson(geojson) {
    if (!geojson) return [];
    if (geojson.type === "Polygon") {
      return [geojson.coordinates[0].map(([lng, lat]) => [lat, lng])];
    }
    if (geojson.type === "MultiPolygon") {
      return geojson.coordinates.map((poly) =>
        poly[0].map(([lng, lat]) => [lat, lng]),
      );
    }
    return [];
  }

  async function loadMatiCityRings() {
    if (window.MATI_CITY_GEOJSON) {
      const rings = ringsFromGeojson(window.MATI_CITY_GEOJSON);
      if (rings.length) return rings;
    }

    try {
      const res = await fetch("data/mati-city-boundary.json");
      if (res.ok) {
        const data = await res.json();
        const rings = ringsFromGeojson(data[0]?.geojson);
        if (rings.length) return rings;
      }
    } catch {
      /* fallback below */
    }

    return [
      [
        [6.99547, 126.09071],
        [6.72291, 126.19004],
        [6.13412, 126.19226],
        [6.24148, 126.33157],
        [6.86135, 126.48227],
        [7.03119, 126.29238],
        [7.0484, 126.11576],
        [6.99547, 126.09071],
      ],
    ];
  }

  function getMainRing(rings) {
    return rings.reduce((longest, ring) =>
      ring.length > longest.length ? ring : longest,
    );
  }

  function getAllMapSites() {
    // Prioritize dynamic data source that includes admin-added sites
    if (typeof getHeritageMapDisplaySites === "function") {
      return getHeritageMapDisplaySites();
    }
    // Fallback to static HERITAGE_SITES if dynamic function not available
    if (typeof HERITAGE_SITES !== "undefined") {
      return [...HERITAGE_SITES];
    }
    return typeof HERITAGE_MAP_SITES !== "undefined" ? [...HERITAGE_MAP_SITES] : [];
  }

  function getMapSites() {
    const sites = getAllMapSites();
    if (mapCategoryFilter === "all") return sites;
    return sites.filter((site) => site.category === mapCategoryFilter);
  }

  function getMatiViewBounds(sites) {
    if (!sites.length) return null;
    return L.latLngBounds(sites.map((site) => [site.lat, site.lng])).pad(0.14);
  }

  function updateMapFilterWrapState(category) {
    const wrap = document.getElementById("map-heritage-filter-wrap");
    if (!wrap) return;
    wrap.classList.toggle("is-built", category === "built");
    wrap.classList.toggle("is-natural", category === "natural");
  }

  function applyCityClip(leafletMap, ring) {
    const pane = leafletMap.getPane("mapPane");
    if (!pane || !ring.length) return;

    function updateClip() {
      const points = ring
        .map(([lat, lng]) => leafletMap.latLngToLayerPoint([lat, lng]))
        .map((point) => `${point.x}px ${point.y}px`)
        .join(", ");

      pane.style.clipPath = `polygon(${points})`;
      pane.style.webkitClipPath = pane.style.clipPath;
    }

    leafletMap.on("move zoom zoomend moveend viewreset resize", updateClip);
    leafletMap.whenReady(() => {
      updateClip();
      requestAnimationFrame(updateClip);
    });
  }

  function addOutsideMask(leafletMap, ring, fillColor = "#ecfdf5") {
    const hole = [...ring].reverse();

    if (!leafletMap.getPane("maskPane")) {
      leafletMap.createPane("maskPane");
      leafletMap.getPane("maskPane").style.zIndex = 450;
      leafletMap.getPane("maskPane").style.pointerEvents = "none";
    }

    L.polygon([WORLD_MASK_RING, hole], {
      pane: "maskPane",
      stroke: false,
      fillColor,
      fillOpacity: 1,
      interactive: false,
    }).addTo(leafletMap);
  }

  let filterBound = false;

  function bindMapHeritageFilter() {
    if (filterBound) return;
    const filter = document.getElementById("map-heritage-filter");
    if (!filter) return;

    filter.addEventListener("change", () => {
      setCategoryFilter(filter.value);
    });

    filterBound = true;
    updateMapFilterWrapState(filter.value);
  }

  function isMapViewActive() {
    const view = document.getElementById("view-location");
    return Boolean(view && !view.hidden);
  }

  function isMapContainerReady() {
    const container = document.getElementById("admin-heritage-map");
    if (!container) return false;
    const rect = container.getBoundingClientRect();
    return rect.width > 48 && rect.height > 48;
  }

  function destroyMap() {
    disablePickMode();
    if (map) {
      map.remove();
      map = null;
      markersLayer = null;
      mainRing = [];
    }
  }

  function relayout() {
    if (!map) return;
    map.invalidateSize({ animate: false });
    map.fire("resize");
    syncMarkers();
  }

  function scheduleRelayout() {
    relayout();
    requestAnimationFrame(() => {
      relayout();
      requestAnimationFrame(relayout);
    });
    setTimeout(relayout, 120);
    setTimeout(relayout, 350);
  }

  function syncMarkers(options = {}) {
    if (!map || !markersLayer || typeof createHeritagePhotoIcon !== "function") {
      return;
    }

    markersLayer.clearLayers();
    markerBySiteId.clear();
    const sites = getMapSites();

    sites.forEach((site) => {
      const marker = L.marker([site.lat, site.lng], {
        icon: createHeritagePhotoIcon(site, 40),
      });

      marker.bindPopup(buildHeritageMapPopup(site), {
        maxWidth: 260,
        minWidth: 200,
      });
      marker.on("click", () => marker.openPopup());
      markersLayer.addLayer(marker);
      if (site.id) markerBySiteId.set(site.id, marker);
    });

    // Match index.html behavior - always fit bounds to visible sites
    if (sites.length) {
      const bounds = getMatiViewBounds(sites);
      if (bounds) {
        map.fitBounds(bounds, {
          padding: [32, 32],
          animate: true,
          duration: 0.65,
        });
      }
    }
  }

  function focusSite(siteId) {
    if (!map || !siteId) return;

    const sites = getMapSites();
    const site = sites.find((entry) => entry.id === siteId);
    if (!site) return;

    map.flyTo([site.lat, site.lng], 16, { duration: 0.85 });
    const marker = markerBySiteId.get(siteId);
    if (marker) {
      window.setTimeout(() => marker.openPopup(), 520);
    }
  }

  function setPickMarker(lat, lng) {
    if (!map) return;
    if (pickMarker) map.removeLayer(pickMarker);
    pickMarker = L.circleMarker([lat, lng], {
      radius: 8,
      color: "#0f172a",
      weight: 2,
      fillColor: "#fbbf24",
      fillOpacity: 1,
    }).addTo(map);
  }

  function clearPickMarker() {
    if (pickMarker && map) {
      map.removeLayer(pickMarker);
      pickMarker = null;
    }
  }

  function enablePickMode(callback, current = null) {
    pickCallback = callback;
    const el = document.getElementById("admin-heritage-map");
    if (el) el.classList.add("is-pick-mode");
    if (current?.lat != null && current?.lng != null) {
      setPickMarker(current.lat, current.lng);
      map?.panTo([current.lat, current.lng]);
    }
  }

  function disablePickMode() {
    pickCallback = null;
    clearPickMarker();
    const el = document.getElementById("admin-heritage-map");
    if (el) el.classList.remove("is-pick-mode");
  }

  async function init() {
    const container = document.getElementById("admin-heritage-map");
    if (!container || map || typeof L === "undefined") return;
    if (!isMapContainerReady()) return;

    // Load heritage sites data with priority for dynamic data including admin-added sites
    if (typeof getHeritageMapDisplaySites === "function") {
      try {
        const dynamicSites = getHeritageMapDisplaySites();
        if (dynamicSites && dynamicSites.length > 0) {
          window.HERITAGE_SITES = dynamicSites;
        }
      } catch (error) {
        console.warn("Failed to load dynamic heritage sites:", error);
        // Fallback to other methods
      }
    }
    
    // Fallback to MatiHeritageData if dynamic function failed or isn't available
    if (typeof HERITAGE_SITES === "undefined" && typeof MatiHeritageData !== "undefined") {
      try {
        window.HERITAGE_SITES = await MatiHeritageData.getMapSites();
      } catch (error) {
        console.warn("Using static heritage map data", error);
        if (typeof HERITAGE_MAP_SITES !== "undefined") {
          window.HERITAGE_SITES = [...HERITAGE_MAP_SITES];
        }
      }
    } else if (typeof HERITAGE_SITES === "undefined" && typeof HERITAGE_MAP_SITES !== "undefined") {
      window.HERITAGE_SITES = [...HERITAGE_MAP_SITES];
    }

    const rings = await loadMatiCityRings();
    mainRing = getMainRing(rings);
    const cityBounds = L.latLngBounds(mainRing);

    // Focus on central cluster of sites like index.html
    const allSites = getMapSites();
    const centralSites = allSites.filter(
      (site) =>
        site.barangay === "central" ||
        (site.lat >= 6.94 &&
          site.lat <= 6.96 &&
          site.lng >= 126.21 &&
          site.lng <= 126.23),
    );
    const viewBounds =
      centralSites.length > 0
        ? getMatiViewBounds(centralSites)
        : cityBounds;

    map = L.map(container, {
      maxBounds: cityBounds,
      maxBoundsViscosity: 1.0,
      maxZoom: 17,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 20,
        subdomains: "abcd",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    ).addTo(map);

    addOutsideMask(map, mainRing);
    applyCityClip(map, mainRing);

    // Use exact coordinates from index.html
    console.log(
      "Setting map view to [6.8975057184388415, 126.27308050000003] zoom 12",
    );
    map.setView([6.8975057184388415, 126.27308050000003], 12);
    console.log("Current map center:", map.getCenter());
    console.log("Current map zoom:", map.getZoom());
    map.setMinZoom(12);
    console.log("Set min zoom to 12");

    map.on("drag", () =>
      map.panInsideBounds(cityBounds, { animate: false }),
    );

    markersLayer = L.layerGroup().addTo(map);

    map.on("click", (e) => {
      if (pickCallback) {
        pickCallback(e.latlng.lat, e.latlng.lng);
        setPickMarker(e.latlng.lat, e.latlng.lng);
      }
    });

    container.addEventListener("mouseenter", () => map.scrollWheelZoom.enable());
    container.addEventListener("mouseleave", () => map.scrollWheelZoom.disable());
    container.addEventListener("focusin", () => map.scrollWheelZoom.enable());
    container.addEventListener("focusout", () => map.scrollWheelZoom.disable());

    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-map-site]");
      if (!btn || !onSiteSelect) return;
      onSiteSelect(btn.dataset.mapSite);
    });

    bindMapHeritageFilter();
    syncMarkers({ skipFit: true }); // Skip fit since we set exact view
    scheduleRelayout();

    // Subscribe to data changes like index.html
    if (typeof MatiHeritageData?.subscribeCatalog === "function") {
      MatiHeritageData.subscribeCatalog(async () => {
        try {
          // Use dynamic data source that includes admin-added sites
          if (typeof getHeritageMapDisplaySites === "function") {
            const dynamicSites = getHeritageMapDisplaySites();
            if (dynamicSites && dynamicSites.length > 0) {
              window.HERITAGE_SITES = dynamicSites;
            }
          } else if (typeof HERITAGE_SITES !== "undefined") {
            window.HERITAGE_SITES = await MatiHeritageData.getMapSites();
          }
        } catch (error) {
          console.warn("Live map refresh failed:", error);
          return;
        }
        const filter = document.getElementById("map-heritage-filter")?.value || "all";
        setCategoryFilter(filter);
      });
    }
  }

  async function refresh() {
    if (!isMapViewActive()) return;

    const container = document.getElementById("admin-heritage-map");
    if (!container) return;

    await new Promise((resolve) => requestAnimationFrame(resolve));

    if (!isMapContainerReady()) {
      setTimeout(() => {
        void refresh();
      }, 60);
      return;
    }

    const leafletRoot = container.querySelector(".leaflet-container");
    if (
      map &&
      leafletRoot &&
      (leafletRoot.offsetWidth < 48 || leafletRoot.offsetHeight < 48)
    ) {
      destroyMap();
    }

    // Update HERITAGE_SITES with latest data including admin-added sites
    if (typeof getHeritageMapDisplaySites === "function") {
      try {
        const latestSites = getHeritageMapDisplaySites();
        if (latestSites && latestSites.length > 0) {
          window.HERITAGE_SITES = latestSites;
        }
      } catch (error) {
        console.warn("Failed to update heritage sites for map:", error);
      }
    }

    if (!map) {
      await init();
    } else {
      // Force sync markers to include newly added sites
      syncMarkers();
    }
    scheduleRelayout();
  }

  function setSiteSelectHandler(fn) {
    onSiteSelect = fn;
  }

  function setCategoryFilter(category) {
    if (category !== "all" && category !== "built" && category !== "natural") {
      return;
    }
    mapCategoryFilter = category;
    const filter = document.getElementById("map-heritage-filter");
    if (filter && filter.value !== category) filter.value = category;
    updateMapFilterWrapState(category);
    syncMarkers();
  }

  function getCategoryFilter() {
    return mapCategoryFilter;
  }

  return {
    init,
    refresh,
    relayout,
    enablePickMode,
    disablePickMode,
    setSiteSelectHandler,
    setCategoryFilter,
    getCategoryFilter,
    focusSite,
  };
})();
