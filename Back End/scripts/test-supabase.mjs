import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const backEndRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(backEndRoot, ".env");

function loadEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const env = {};
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

const env = loadEnv(envPath);
const url = (env.SUPABASE_URL || "").replace(/\/$/, "");
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or keys in Back End/.env");
  process.exit(1);
}

const response = await fetch(`${url}/rest/v1/heritage_sites?select=id&limit=1`, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
  },
});

const body = await response.text();

if (!response.ok) {
  console.error("Supabase connection failed:", body || response.statusText);
  if (
    body.includes("heritage_sites") &&
    (body.includes("does not exist") || body.includes("PGRST205"))
  ) {
    console.error("");
    console.error("Your keys work, but the database tables are not created yet.");
    console.error("Run this file in Supabase → SQL Editor:");
    console.error("  Back End/supabase/migrations/20250628120000_initial_schema.sql");
  }
  process.exit(1);
}

let count = 0;
try {
  const rows = JSON.parse(body);
  count = Array.isArray(rows) ? rows.length : 0;
} catch {
  count = 0;
}

console.log("Supabase connection OK.");
console.log(`heritage_sites reachable (${count} row sample).`);
