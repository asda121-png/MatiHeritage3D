/**
 * Heritage game content pool — Built / Natural / Intangible.
 * Pulls from catalog (+ Supabase when available), randomizes per session,
 * and automatically includes newly added heritage sites.
 */
const MatiHeritageGameContent = (() => {
  const CATEGORY_LABELS = {
    built: "Built Heritage",
    natural: "Natural Heritage",
    intangible: "Intangible Cultural Heritage",
  };

  const CATEGORY_EMOJI = {
    built: "🏛",
    natural: "🌿",
    intangible: "🎭",
  };

  let poolCache = null;
  let mediaBySite = new Map();
  let initPromise = null;

  function hashSeed(str) {
    let h = 2166136261;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function createRng(seed = `${Date.now()}-${Math.random().toString(36).slice(2)}`) {
    let state = hashSeed(seed) || 1;
    function next() {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 4294967296;
    }
    function shuffle(arr) {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }
    function pick(arr, count) {
      return shuffle(arr).slice(0, Math.min(count, arr.length));
    }
    function pickOne(arr) {
      if (!arr?.length) return null;
      return arr[Math.floor(next() * arr.length)];
    }
    function int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    }
    return { seed: String(seed), next, shuffle, pick, pickOne, int };
  }

  function firstSentence(text) {
    const raw = String(text || "").replace(/\s+/g, " ").trim();
    if (!raw) return "";
    const match = raw.match(/^(.+?[.!?])(\s|$)/);
    return (match ? match[1] : raw).slice(0, 180);
  }

  function shortenName(name) {
    return String(name || "")
      .replace(/\s*\(.*?\)\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function mediaPhotosFor(siteId) {
    if (typeof GALLERY_MEDIA === "undefined") return [];
    return GALLERY_MEDIA.filter(
      (item) => item.siteId === siteId && item.type === "photo" && item.src,
    ).map((item) => item.src);
  }

  function normalizeSite(site) {
    if (!site?.id || !site?.name) return null;
    const category = site.category || "built";
    if (!CATEGORY_LABELS[category]) return null;

    const photos = [
      ...(site.cover ? [site.cover] : []),
      ...(Array.isArray(site.photos) ? site.photos : []),
      ...mediaPhotosFor(site.id),
      ...(mediaBySite.get(site.id) || []),
    ].filter(Boolean);

    const uniquePhotos = [...new Set(photos)];
    const cover = uniquePhotos[0] || site.cover || "";
    if (!cover && !site.description) return null;

    return {
      id: site.id,
      name: site.name,
      category,
      categoryLabel: site.categoryLabel || CATEGORY_LABELS[category],
      cover,
      photos: uniquePhotos,
      description: site.description || "",
      location: site.location || "",
      fact: firstSentence(site.description) || `${site.name} is part of Mati's ${CATEGORY_LABELS[category]}.`,
      emoji: CATEGORY_EMOJI[category] || "📍",
    };
  }

  function staticPool() {
    const map = new Map();

    if (typeof BUILT_HERITAGE_SITES !== "undefined") {
      BUILT_HERITAGE_SITES.forEach((site) => {
        const row = normalizeSite({ ...site, category: "built" });
        if (row) map.set(row.id, row);
      });
    }

    if (typeof GALLERY_SITES !== "undefined") {
      GALLERY_SITES.forEach((site) => {
        const row = normalizeSite(site);
        if (!row) return;
        const prev = map.get(row.id);
        if (!prev) {
          map.set(row.id, row);
          return;
        }
        map.set(row.id, {
          ...prev,
          ...row,
          photos: [...new Set([...(prev.photos || []), ...(row.photos || [])])],
          cover: row.cover || prev.cover,
          description: row.description || prev.description,
        });
      });
    }

    if (typeof HERITAGE_MAP_SITES !== "undefined") {
      HERITAGE_MAP_SITES.forEach((site) => {
        if (map.has(site.id)) {
          const prev = map.get(site.id);
          if (!prev.cover && site.image) prev.cover = site.image;
          if (!prev.photos.includes(site.image) && site.image) {
            prev.photos.push(site.image);
          }
          return;
        }
        const row = normalizeSite({
          id: site.id,
          name: site.name,
          category: site.category,
          cover: site.image || "",
          description: site.desc || "",
          location: site.barangay || "",
        });
        if (row) map.set(row.id, row);
      });
    }

    return [...map.values()];
  }

  async function hydrateFromSupabase() {
    if (typeof MatiHeritageData === "undefined") return staticPool();

    try {
      if (typeof MatiHeritageData.hydrateGalleryCatalog === "function") {
        await MatiHeritageData.hydrateGalleryCatalog();
      }

      const [built, gallery] = await Promise.all([
        MatiHeritageData.loadBuiltSites?.() || Promise.resolve([]),
        MatiHeritageData.loadGallerySites?.() || Promise.resolve([]),
      ]);

      if (typeof MatiHeritageData.loadGalleryMedia === "function") {
        const media = await MatiHeritageData.loadGalleryMedia();
        mediaBySite = new Map();
        (media || []).forEach((item) => {
          if (item.type !== "photo" || !item.src || !item.siteId) return;
          const list = mediaBySite.get(item.siteId) || [];
          list.push(item.src);
          mediaBySite.set(item.siteId, list);
        });
      }

      const map = new Map(staticPool().map((site) => [site.id, site]));
      [...(built || []), ...(gallery || [])].forEach((site) => {
        const row = normalizeSite(site);
        if (!row) return;
        const prev = map.get(row.id);
        map.set(
          row.id,
          prev
            ? {
                ...prev,
                ...row,
                photos: [...new Set([...(prev.photos || []), ...(row.photos || [])])],
                cover: row.cover || prev.cover,
                description: row.description || prev.description,
                location: row.location || prev.location,
                fact: row.fact || prev.fact,
              }
            : row,
        );
      });
      return [...map.values()];
    } catch (error) {
      console.warn("MatiHeritageGameContent: Supabase hydrate failed", error);
      return staticPool();
    }
  }

  async function init({ force = false } = {}) {
    if (poolCache && !force) return poolCache;
    if (!initPromise || force) {
      initPromise = hydrateFromSupabase().then((sites) => {
        poolCache = sites.filter((site) => site.cover || site.description);
        return poolCache;
      });
    }
    return initPromise;
  }

  function getPoolSync() {
    return poolCache || staticPool();
  }

  function distractors(pool, correct, rng, count = 3) {
    const others = pool.filter((site) => site.id !== correct.id);
    const sameCategory = others.filter((site) => site.category === correct.category);
    const base = sameCategory.length >= count ? sameCategory : others;
    return rng.pick(base, count).map((site) => shortenName(site.name));
  }

  function buildTriviaQuestions(pool, rng, { count = 8 } = {}) {
    const sites = pool.filter((site) => site.name && (site.description || site.location));
    if (sites.length < 4) return [];

    const templates = [
      (site) => ({
        q: `Which heritage site is classified as ${site.categoryLabel}?`,
        answer: shortenName(site.name),
        site,
      }),
      (site) =>
        site.location
          ? {
              q: `Which of these is associated with ${site.location}?`,
              answer: shortenName(site.name),
              site,
            }
          : null,
      (site) =>
        site.fact
          ? {
              q: `Which site matches this description: “${site.fact}”`,
              answer: shortenName(site.name),
              site,
            }
          : null,
      (site) => ({
        q: `What heritage category does “${shortenName(site.name)}” belong to?`,
        answer: site.categoryLabel,
        site,
        optionsPool: Object.values(CATEGORY_LABELS),
        kind: "category",
      }),
    ];

    const questions = [];
    const picked = rng.shuffle(sites);

    for (const site of picked) {
      if (questions.length >= count) break;
      const template = rng.pickOne(templates.filter(Boolean));
      const built = template(site);
      if (!built) continue;

      let options;
      let correctIndex;
      if (built.kind === "category") {
        options = rng.shuffle([...built.optionsPool]);
        correctIndex = options.indexOf(built.answer);
      } else {
        const wrong = distractors(sites, site, rng, 3);
        if (wrong.length < 3) continue;
        options = rng.shuffle([built.answer, ...wrong]);
        correctIndex = options.indexOf(built.answer);
      }

      if (correctIndex < 0) continue;
      questions.push({
        q: built.q,
        options,
        correct: correctIndex,
        siteId: site.id,
        category: site.category,
      });
    }

    return questions;
  }

  function buildTrueFalseStatements(pool, rng, { count = 12 } = {}) {
    const sites = pool.filter((site) => site.name && site.description);
    if (sites.length < 3) return [];

    const statements = [];
    const shuffled = rng.shuffle(sites);

    for (const site of shuffled) {
      if (statements.length >= count) break;

      // True facts
      statements.push({
        t: `${shortenName(site.name)} is part of Mati's ${site.categoryLabel}.`,
        a: true,
        siteId: site.id,
      });

      if (site.location && statements.length < count) {
        statements.push({
          t: `${shortenName(site.name)} is associated with ${site.location}.`,
          a: true,
          siteId: site.id,
        });
      }

      // False: wrong category
      const wrongCategory = rng.pickOne(
        Object.keys(CATEGORY_LABELS).filter((key) => key !== site.category),
      );
      if (wrongCategory && statements.length < count) {
        statements.push({
          t: `${shortenName(site.name)} is classified as ${CATEGORY_LABELS[wrongCategory]}.`,
          a: false,
          siteId: site.id,
        });
      }

      // False: swapped location/name with another site
      const other = rng.pickOne(sites.filter((row) => row.id !== site.id && row.location));
      if (other?.location && statements.length < count) {
        statements.push({
          t: `${shortenName(site.name)} is primarily associated with ${other.location}.`,
          a: false,
          siteId: site.id,
        });
      }
    }

    return rng.shuffle(statements).slice(0, count);
  }

  function buildMemoryDeck(pool, rng, { pairs = 8 } = {}) {
    const usable = pool.filter((site) => site.cover);
    if (!usable.length) return [];
    return rng.pick(usable, pairs).map((site) => ({
      id: site.id,
      name: shortenName(site.name),
      category: site.category,
      emoji: site.emoji,
      img: site.cover,
      fact: site.fact,
    }));
  }

  function buildSlideSites(pool, rng) {
    const usable = pool.filter((site) => site.cover);
    return rng.shuffle(usable).map((site) => ({
      id: site.id,
      name: site.name,
      category: site.categoryLabel,
      src: rng.pickOne(site.photos) || site.cover,
      description: site.description || site.fact,
    }));
  }

  function buildSpotHotspots(rng, count = 5) {
    const spots = [];
    let guard = 0;
    while (spots.length < count && guard < 80) {
      guard += 1;
      const x = rng.int(18, 82);
      const y = rng.int(18, 82);
      const tooClose = spots.some(
        (spot) => Math.hypot(spot.x - x, spot.y - y) < 16,
      );
      if (tooClose) continue;
      spots.push({ x, y, found: false });
    }
    while (spots.length < count) {
      spots.push({
        x: 20 + spots.length * 12,
        y: 25 + (spots.length % 3) * 20,
        found: false,
      });
    }
    return spots;
  }

  function buildSpotLevels(pool, rng, { count = 4 } = {}) {
    const usable = pool.filter((site) => site.photos.length);
    if (!usable.length) return [];

    return rng.pick(usable, count).map((site) => {
      const img = rng.pickOne(site.photos) || site.cover;
      return {
        id: site.id,
        name: site.name,
        category: site.category,
        img,
        differences: buildSpotHotspots(rng, 5),
      };
    });
  }

  async function createSession(options = {}) {
    // Refresh the pool each session so newly added catalog/DB sites are included.
    const pool = await init({ force: options.force !== false });
    const seed = options.seed || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const rng = createRng(seed);
    return {
      seed,
      pool,
      rng,
      trivia(count = 8) {
        return buildTriviaQuestions(pool, createRng(`${seed}-trivia`), { count });
      },
      trueFalse(count = 12) {
        return buildTrueFalseStatements(pool, createRng(`${seed}-tf`), { count });
      },
      memory(pairs = 8) {
        return buildMemoryDeck(pool, createRng(`${seed}-memory`), { pairs });
      },
      slideSites() {
        return buildSlideSites(pool, createRng(`${seed}-slide`));
      },
      spotLevels(count = 4) {
        return buildSpotLevels(pool, createRng(`${seed}-spot`), { count });
      },
    };
  }

  function subscribeCatalog(onChange) {
    if (typeof MatiHeritageRealtime === "undefined") return null;
    MatiHeritageRealtime.ensure();
    return MatiHeritageRealtime.on(MatiHeritageRealtime.TOPIC.catalog, () => {
      poolCache = null;
      initPromise = null;
      if (typeof onChange === "function") onChange();
    });
  }

  // Keep game content pool stale-free while a player is on a game page.
  if (typeof MatiHeritageRealtime !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        MatiHeritageRealtime.ensure();
        subscribeCatalog();
      });
    } else {
      MatiHeritageRealtime.ensure();
      subscribeCatalog();
    }
  }

  return {
    init,
    createSession,
    createRng,
    getPoolSync,
    subscribeCatalog,
    CATEGORY_LABELS,
    CATEGORY_EMOJI,
  };
})();

window.MatiHeritageGameContent = MatiHeritageGameContent;
