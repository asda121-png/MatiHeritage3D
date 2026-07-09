/**
 * Pylon Monument 3D model — served from Supabase Storage (not in git).
 * Upload path: heritage-models / pylon / Pylon.glb
 */
const MatiHeritagePylonModel = (() => {
  const STORAGE_PATH = "pylon/Pylon.glb";

  function resolve() {
    const cfg = window.MATI_SUPABASE_CONFIG || {};
    if (cfg.pylonModelUrl) return cfg.pylonModelUrl;

    const base = String(cfg.url || "").replace(/\/$/, "");
    if (!base) return "";

    return `${base}/storage/v1/object/public/heritage-models/${STORAGE_PATH}`;
  }

  function applyToModelViewer(viewer, attr = "src") {
    if (!viewer) return;
    const url = resolve();
    if (url) viewer.setAttribute(attr, url);
  }

  return { resolve, applyToModelViewer, STORAGE_PATH };
})();

window.MatiHeritagePylonModel = MatiHeritagePylonModel;
