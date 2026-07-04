import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const backEndRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = join(backEndRoot, "..");
const basePath = join(projectRoot, "Front End", "admin-heritage-base.js");
const outPath = join(
  backEndRoot,
  "supabase",
  "seed",
  "bootstrap_built_heritage_rpc.sql",
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

const baseCode = readFileSync(basePath, "utf8");
const sites = new Function(`${baseCode}; return BUILT_HERITAGE_SITES;`)();

const values = sites
  .map((site) => {
    return `  (
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
  )`;
  })
  .join(",\n");

const sql = `-- One-time bootstrap: creates a seed function the admin panel can call.
-- Run this once in Supabase Dashboard → SQL Editor (after initial_schema.sql).
-- Then use the "Import built heritage" button on the admin dashboard.

create or replace function public.seed_built_heritage_catalog()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
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
${values}
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

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.seed_built_heritage_catalog() from public;
grant execute on function public.seed_built_heritage_catalog() to anon, authenticated;
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, sql, "utf8");
console.log(`Wrote bootstrap RPC for ${sites.length} sites to ${outPath}`);
