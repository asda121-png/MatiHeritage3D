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

const basePath = join(projectRoot, "Front End", "admin-heritage-base.js");
const baseCode = readFileSync(basePath, "utf8");
const sites = new Function(`${baseCode}; return BUILT_HERITAGE_SITES;`)();

const rows = sites.map((site) => ({
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

const supabase = createClient(url, key);
const { data, error } = await supabase
  .from("heritage_sites")
  .upsert(rows, { onConflict: "id" })
  .select("id");

if (error) {
  console.error("Seed failed:", error.message);
  process.exit(1);
}

console.log(`Seeded ${data?.length ?? rows.length} built heritage sites.`);
