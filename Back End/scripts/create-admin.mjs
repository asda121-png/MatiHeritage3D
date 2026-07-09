/**
 * Create (or promote) the Mati Heritage admin account in Supabase Auth.
 *
 * Usage:
 *   cd "Back End"
 *   copy .env.example .env   # add SUPABASE_SERVICE_ROLE_KEY
 *   node scripts/create-admin.mjs
 *
 * Optional env overrides:
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USERNAME, ADMIN_DISPLAY_NAME
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvFile() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL || "matiheritage.admin@cityofmati.gov.ph"
).toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "MatiHeritage2026!";
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || "matiadmin").toLowerCase();
const ADMIN_DISPLAY_NAME =
  process.env.ADMIN_DISPLAY_NAME || "City Tourism Admin";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Back End/.env",
  );
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function findUserByEmail(email) {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    { headers },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`List users failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  const users = Array.isArray(data?.users) ? data.users : data;
  return users?.find?.(
    (user) => String(user.email || "").toLowerCase() === email,
  );
}

async function createUser() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        username: ADMIN_USERNAME,
        display_name: ADMIN_DISPLAY_NAME,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create user failed (${res.status}): ${text}`);
  }

  return res.json();
}

async function promoteProfile(userId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      ...headers,
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      role: "admin",
      username: ADMIN_USERNAME,
      display_name: ADMIN_DISPLAY_NAME,
      email: ADMIN_EMAIL,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Promote profile failed (${res.status}): ${text}`);
  }

  return res.json();
}

async function main() {
  console.log("Mati Heritage 3D — create admin account");
  console.log(`Email:    ${ADMIN_EMAIL}`);
  console.log(`Username: ${ADMIN_USERNAME}`);

  let user = await findUserByEmail(ADMIN_EMAIL);

  if (user) {
    console.log("Auth user already exists — promoting profile to admin.");
  } else {
    console.log("Creating auth user…");
    user = await createUser();
    console.log("Auth user created.");
  }

  const profile = await promoteProfile(user.id);
  console.log("Profile updated:", profile?.[0] || profile);

  console.log("\nAdmin ready. Sign in at Front End/login.html?redirect=admin.html");
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log("Change this password after first login.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
