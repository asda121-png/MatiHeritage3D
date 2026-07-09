import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const backEndRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = join(backEndRoot, "..");
const frontEndRoot = join(projectRoot, "Front End");
const builtRoot = join(frontEndRoot, "data", "Built Heritage");
const basePath = join(frontEndRoot, "admin-heritage-base.js");
const sqlOut = join(backEndRoot, "supabase", "seed", "built_heritage_media.sql");
const jsOut = join(frontEndRoot, "admin-built-media.js");

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function sqlText(value) {
  if (value === null || value === undefined || value === "") return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function shortHash(input) {
  let h = 2166136261;
  const s = String(input);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function walkFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      // Skip nested browser dump folders.
      if (/_files$/i.test(entry)) continue;
      walkFiles(full, acc);
      continue;
    }
    const ext = extname(entry).toLowerCase();
    if (!IMAGE_EXT.has(ext)) continue;
    acc.push(full);
  }
  return acc;
}

const baseCode = readFileSync(basePath, "utf8");
const sites = new Function(`${baseCode}; return BUILT_HERITAGE_SITES;`)();

const folderToSite = new Map();
for (const site of sites) {
  // Prefer matching by name used in data folder.
  folderToSite.set(site.name, site);
}

// Manual aliases if folder name differs slightly.
folderToSite.set("Centennial Clock and Pathway of Leaders", folderToSite.get("Centennial Clock and Pathway of Leaders"));
folderToSite.set("MFGR Park and Baywalk", folderToSite.get("MFGR Park and Baywalk"));
folderToSite.set("OMPO sa Tampat sa Baguidan", folderToSite.get("OMPO sa Tampat sa Baguidan"));

const media = [];

for (const folder of readdirSync(builtRoot)) {
  const folderPath = join(builtRoot, folder);
  if (!statSync(folderPath).isDirectory()) continue;

  const site =
    sites.find((row) => row.name === folder) ||
    sites.find((row) => folder.toLowerCase().includes(row.id.replace(/-/g, " "))) ||
    null;

  if (!site) {
    console.warn(`No site mapping for folder: ${folder}`);
    continue;
  }

  const files = walkFiles(folderPath);
  for (const filePath of files) {
    const rel = relative(frontEndRoot, filePath).replace(/\\/g, "/");
    const lower = rel.toLowerCase();
    const isMap = /\/map\//i.test(rel) || /\/maps\//i.test(rel);
    const type = isMap ? "map" : "photo";
    const fileName = filePath.split(/[\\/]/).pop();
    const titleBase = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
    const title = `${site.name} — ${titleBase || (isMap ? "Map" : "Photograph")}`;
    const fileSlug = slugify(fileName).slice(0, 48) || "image";
    const id = `${site.id}-${type}-${fileSlug}-${shortHash(rel)}`;

    media.push({
      id,
      siteId: site.id,
      siteName: site.name,
      type,
      title,
      src: rel,
      caption: "",
      credit: "",
      year: "",
    });
  }
}

media.sort((a, b) => a.siteId.localeCompare(b.siteId) || a.src.localeCompare(b.src));

const mediaValues = media
  .map(
    (item) => `  (
    ${sqlText(item.id)},
    ${sqlText(item.siteId)},
    ${sqlText(item.type)},
    ${sqlText(item.title)},
    ${sqlText(item.src)},
    ${sqlText(item.caption || "")},
    ${sqlText(item.credit || "")},
    ${sqlText(item.year || "")},
    false
  )`,
  )
  .join(",\n");

const sql = `-- Seed built heritage photographs/maps into heritage_media
-- Run after built_heritage_sites.sql (sites must already exist)
-- Generated from Front End/data/Built Heritage/**

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

const js = `/** Built heritage local media catalog (photographs + maps) — generated from data folders */
const BUILT_HERITAGE_MEDIA = ${JSON.stringify(media, null, 2)};
`;

mkdirSync(dirname(sqlOut), { recursive: true });
writeFileSync(sqlOut, sql, "utf8");
writeFileSync(jsOut, js, "utf8");

const bySite = media.reduce((acc, item) => {
  acc[item.siteId] = (acc[item.siteId] || 0) + 1;
  return acc;
}, {});

console.log(`Wrote ${media.length} built media rows`);
console.log(`SQL: ${sqlOut}`);
console.log(`JS:  ${jsOut}`);
console.log(bySite);
