import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const backEndRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = join(backEndRoot, "..");
dotenv.config({ path: join(backEndRoot, ".env") });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Back End/.env");
  process.exit(1);
}

const galleryPath = join(projectRoot, "Front End", "gallery-data.js");
const galleryCode = readFileSync(galleryPath, "utf8");
const { sites, media } = new Function(
  `${galleryCode}; return { sites: GALLERY_SITES, media: GALLERY_MEDIA };`,
)();

const siteRows = sites.map((site) => ({
  id: site.id,
  name: site.name,
  category: site.category,
  category_label: site.categoryLabel,
  heritage_category: site.heritageCategory || "",
  ownership: site.ownership || "",
  location: site.location || "",
  description: site.description || "",
  lat: site.lat ?? null,
  lng: site.lng ?? null,
  cover: site.cover || "",
  model_src: site.modelSrc || "",
  is_base: true,
  is_deleted: false,
}));

const mediaRows = media.map((item) => ({
  id: item.id,
  site_id: item.siteId,
  type: item.type,
  title: item.title || item.siteName || "",
  src: item.src,
  caption: item.caption || "",
  credit: item.credit || item.author || "",
  year: item.year || item.date || "",
  is_deleted: false,
}));

const supabase = createClient(url, key);

const { data: seededSites, error: siteError } = await supabase
  .from("heritage_sites")
  .upsert(siteRows, { onConflict: "id" })
  .select("id");

if (siteError) {
  console.error("Gallery site seed failed:", siteError.message);
  process.exit(1);
}

const { data: seededMedia, error: mediaError } = await supabase
  .from("heritage_media")
  .upsert(mediaRows, { onConflict: "id" })
  .select("id");

if (mediaError) {
  console.error("Gallery media seed failed:", mediaError.message);
  process.exit(1);
}

console.log(
  `Seeded ${seededSites?.length ?? siteRows.length} intangible/natural sites and ${seededMedia?.length ?? mediaRows.length} media items.`,
);
