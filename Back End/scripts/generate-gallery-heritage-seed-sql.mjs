import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const backEndRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = join(backEndRoot, "..");
const galleryPath = join(projectRoot, "Front End", "gallery-data.js");
const outPath = join(
  backEndRoot,
  "supabase",
  "seed",
  "gallery_heritage_catalog.sql",
);

function sqlText(value) {
  if (value === null || value === undefined || value === "") return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNumber(value) {
  if (value === null || value === undefined || value === "") return "null";
  const num = Number(value);
  return Number.isFinite(num) ? String(num) : "null";
}

const galleryCode = readFileSync(galleryPath, "utf8");
const { sites, media } = new Function(
  `${galleryCode}; return { sites: GALLERY_SITES, media: GALLERY_MEDIA };`,
)();

const siteValues = sites
  .map(
    (site) => `  (
    ${sqlText(site.id)},
    ${sqlText(site.name)},
    ${sqlText(site.category)},
    ${sqlText(site.categoryLabel)},
    ${sqlText(site.heritageCategory || "")},
    ${sqlText(site.ownership || "")},
    ${sqlText(site.location || "")},
    ${sqlText(site.description || "")},
    ${sqlNumber(site.lat)},
    ${sqlNumber(site.lng)},
    ${sqlText(site.cover || "")},
    ${sqlText(site.modelSrc || "")},
    true,
    false
  )`,
  )
  .join(",\n");

const mediaValues = media
  .map(
    (item) => `  (
    ${sqlText(item.id)},
    ${sqlText(item.siteId)},
    ${sqlText(item.type)},
    ${sqlText(item.title || item.siteName || "")},
    ${sqlText(item.src)},
    ${sqlText(item.caption || "")},
    ${sqlText(item.credit || item.author || "")},
    ${sqlText(item.year || item.date || "")},
    false
  )`,
  )
  .join(",\n");

const sql = `-- Seed intangible & natural heritage into Supabase
-- Run in Supabase Dashboard → SQL Editor (after initial_schema.sql)
-- Generated from Front End/gallery-data.js

insert into public.heritage_sites (
  id,
  name,
  category,
  category_label,
  heritage_category,
  ownership,
  location,
  description,
  lat,
  lng,
  cover,
  model_src,
  is_base,
  is_deleted
)
values
${siteValues}
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  category_label = excluded.category_label,
  heritage_category = excluded.heritage_category,
  ownership = excluded.ownership,
  location = excluded.location,
  description = excluded.description,
  lat = excluded.lat,
  lng = excluded.lng,
  cover = excluded.cover,
  model_src = excluded.model_src,
  is_base = excluded.is_base,
  is_deleted = excluded.is_deleted,
  updated_at = now();

insert into public.heritage_media (
  id,
  site_id,
  type,
  title,
  src,
  caption,
  credit,
  year,
  is_deleted
)
values
${mediaValues}
on conflict (id) do update set
  site_id = excluded.site_id,
  type = excluded.type,
  title = excluded.title,
  src = excluded.src,
  caption = excluded.caption,
  credit = excluded.credit,
  year = excluded.year,
  is_deleted = excluded.is_deleted;
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, sql, "utf8");
console.log(
  `Wrote ${sites.length} gallery sites and ${media.length} media rows to ${outPath}`,
);
