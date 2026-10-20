(function () {
  "use strict";

  const mapElement = document.getElementById("mati-map");
  const listElement = document.getElementById("map-site-list");
  const searchElement = document.getElementById("map-search");
  const categoryElement = document.getElementById("map-category");
  const countElement = document.getElementById("map-site-count");
  const titleElement = document.getElementById("map-selection-title");
  const detailsLink = document.getElementById("map-selection-link");
  const barangayListElement = document.getElementById("map-barangay-list");
  const siteList = HERITAGE_MAP_SITES;
  let activeSiteId = null;

  if (
    !mapElement ||
    !listElement ||
    !searchElement ||
    !categoryElement ||
    !countElement ||
    !titleElement ||
    !detailsLink ||
    !barangayListElement ||
    !window.L
  ) {
    console.error(
      "The heritage map page is missing required elements or Leaflet.",
    );
    return;
  }

  function siteDetailsHref(site) {
    return site.category === "natural"
      ? `gallerynaturalheritage.html?site=${encodeURIComponent(site.id)}`
      : `3dexplore.html?site=${encodeURIComponent(site.id)}`;
  }

  function renderSitesByBarangay() {
    const barangays = new Map();
    siteList.forEach((site) => {
      const barangay = heritageBarangayLabel(site.barangay) || "Unspecified";
      if (!barangays.has(barangay)) barangays.set(barangay, []);
      barangays.get(barangay).push(site);
    });

    barangayListElement.replaceChildren();
    barangayListElement.classList.toggle(
      "map-barangay-list--single",
      barangays.size === 1,
    );
    [...barangays.entries()]
      .sort(([barangayA], [barangayB]) =>
        barangayA.localeCompare(barangayB),
      )
      .forEach(([barangay, sites]) => {
        const section = document.createElement("section");
        section.className = "map-barangay";
        const header = document.createElement("header");
        header.className = "map-barangay__header";
        const heading = document.createElement("h3");
        heading.textContent = barangay;
        const count = document.createElement("span");
        count.className = "map-barangay__count";
        count.setAttribute("aria-label", `${sites.length} heritage sites`);
        count.textContent = String(sites.length);
        header.append(heading, count);

        const list = document.createElement("ul");
        list.className = "map-barangay__sites";
        sites
          .slice()
          .sort((siteA, siteB) => siteA.name.localeCompare(siteB.name))
          .forEach((site) => {
            const item = document.createElement("li");
            item.className = "map-barangay__site";
            const link = document.createElement("a");
            link.href = siteDetailsHref(site);
            const name = document.createElement("span");
            name.className = "map-barangay__site-name";
            name.textContent = site.name;
            const meta = document.createElement("span");
            meta.className = "map-barangay__site-meta";
            meta.textContent =
              site.category === "built" ? "Built Heritage" : "Natural Heritage";
            const arrow = document.createElement("span");
            arrow.className = "map-barangay__site-arrow";
            arrow.setAttribute("aria-hidden", "true");
            arrow.textContent = "→";
            link.append(name, meta, arrow);
            item.append(link);
            list.append(item);
          });

        section.append(header, list);
        barangayListElement.append(section);
      });

    if (!barangays.size) {
      const empty = document.createElement("p");
      empty.className = "map-barangay-empty";
      empty.textContent = "No heritage sites are available yet.";
      barangayListElement.append(empty);
    }
  }

  const map = L.map(mapElement, {
    center: [6.8975057184388415, 126.27308050000003],
    zoom: 12,
    zoomControl: false,
    attributionControl: true,
    scrollWheelZoom: false,
  });
  map.attributionControl.setPrefix(false);
  L.control.zoom({ position: "topright" }).addTo(map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: "",
  }).addTo(map);

  const boundary = window.MATI_CITY_GEOJSON;
  if (boundary) {
    L.geoJSON(boundary, {
      style: {
        color: "#047857",
        weight: 3,
        opacity: 0.9,
        fillColor: "#ffffff",
        fillOpacity: 0.08,
        interactive: false,
      },
    }).addTo(map);
  }

  const markers = L.layerGroup().addTo(map);

  function visibleSites() {
    const category = categoryElement.value;
    const query = searchElement.value.trim().toLocaleLowerCase();
    return siteList.filter((site) => {
      const categoryMatches = category === "all" || site.category === category;
      const barangay = heritageBarangayLabel(site.barangay);
      const queryMatches =
        !query ||
        [site.name, site.barangay, barangay, site.desc]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase().includes(query));
      return categoryMatches && queryMatches;
    });
  }

  function selectSite(site, moveMap) {
    if (!site) return;
    activeSiteId = site.id;
    titleElement.textContent = site.name;
    detailsLink.href = siteDetailsHref(site);
    detailsLink.setAttribute("aria-disabled", "false");
    detailsLink.tabIndex = 0;

    listElement.querySelectorAll("[data-site-id]").forEach((row) => {
      row.setAttribute("aria-pressed", String(row.dataset.siteId === site.id));
    });
    markers.eachLayer((marker) => {
      marker.getElement()?.classList.toggle(
        "is-selected",
        marker.options.siteId === site.id,
      );
    });
    if (moveMap) map.flyTo([site.lat, site.lng], 17, { duration: 0.6 });
  }

  function render() {
    const sites = visibleSites();
    countElement.textContent = `${sites.length} ${sites.length === 1 ? "heritage site" : "heritage sites"}`;
    listElement.replaceChildren();
    markers.clearLayers();

    if (!sites.length) {
      const empty = document.createElement("p");
      empty.className = "map-site-empty";
      empty.textContent = "No heritage sites match your search.";
      listElement.append(empty);
      if (activeSiteId) {
        activeSiteId = null;
        titleElement.textContent = "Choose a location";
        detailsLink.href = "3dexplore.html";
        detailsLink.setAttribute("aria-disabled", "true");
        detailsLink.tabIndex = -1;
      }
      return;
    }

    const bounds = L.latLngBounds();
    sites.forEach((site, index) => {
      bounds.extend([site.lat, site.lng]);
      const marker = L.marker([site.lat, site.lng], {
        icon: createHeritagePhotoIcon(site),
        siteId: site.id,
      });
      marker.on("click", () => selectSite(site, false));
      marker.addTo(markers);

      const row = document.createElement("button");
      row.type = "button";
      row.className = "map-site-row";
      row.dataset.siteId = site.id;
      row.setAttribute("role", "listitem");
      row.setAttribute("aria-pressed", String(site.id === activeSiteId));

      const number = document.createElement("span");
      number.className = "map-site-row__number";
      number.textContent = String(index + 1).padStart(2, "0");

      const text = document.createElement("span");
      const name = document.createElement("span");
      name.className = "map-site-row__name";
      name.textContent = site.name;
      const meta = document.createElement("span");
      meta.className = "map-site-row__meta";
      meta.textContent = `${site.category === "built" ? "Built Heritage" : "Natural Heritage"} · ${heritageBarangayLabel(site.barangay)}`;
      text.append(name, meta);
      row.append(number, text);
      listElement.append(row);
    });

    if (activeSiteId && sites.some((site) => site.id === activeSiteId)) {
      const selected = sites.find((site) => site.id === activeSiteId);
      selectSite(selected, false);
    } else {
      activeSiteId = null;
      titleElement.textContent = "Choose a location";
      detailsLink.href = "3dexplore.html";
      detailsLink.setAttribute("aria-disabled", "true");
      detailsLink.tabIndex = -1;
    }

    if (sites.length > 1) map.fitBounds(bounds.pad(0.14), { animate: false });
    else if (sites.length === 1) map.setView([sites[0].lat, sites[0].lng], 16);
  }

  listElement.addEventListener("click", (event) => {
    const row = event.target.closest("[data-site-id]");
    if (!row) return;
    const site = visibleSites().find((item) => item.id === row.dataset.siteId);
    selectSite(site, true);
  });
  searchElement.addEventListener("input", render);
  categoryElement.addEventListener("change", render);
  document.getElementById("map-show-all").addEventListener("click", () => {
    categoryElement.value = "all";
    searchElement.value = "";
    render();
  });
  mapElement.addEventListener("mouseenter", () => map.scrollWheelZoom.enable());
  mapElement.addEventListener("mouseleave", () => map.scrollWheelZoom.disable());

  render();
  renderSitesByBarangay();
  if (siteList.length) selectSite(siteList[0], false);
})();
