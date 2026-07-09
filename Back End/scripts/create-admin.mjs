/**
 * Create (or promote) the Mati Heritage admin account in Supabase Auth.
 *
 * Usage:
 *   cd "Back End"
 *   copy .env.example .env   # add SUPABASE_SERVICE_ROLE_KEY
 *   npm run supabase:create-admin
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { createDigest } from "../lib/password-hash.mjs";

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

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
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

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function friendlyError(error, context) {
  const message = String(error?.message || error || "Unknown error");
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|certificate/i.test(message)) {
    return [
      `${context} failed: network error (${message}).`,
      "Check SUPABASE_URL in Back End/.env and your internet connection.",
      "If you are on a school/corporate network, try another connection or hotspot.",
    ].join("\n");
  }
  return `${context} failed: ${message}`;
}

async function findUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw new Error(friendlyError(error, "List users"));
  }

  return (data?.users || []).find(
    (user) => String(user.email || "").toLowerCase() === email,
  );
}

async function createUser() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: {
      username: ADMIN_USERNAME,
      display_name: ADMIN_DISPLAY_NAME,
    },
  });

  if (error) {
    throw new Error(friendlyError(error, "Create user"));
  }

  return data.user;
}

async function promoteProfile(userId) {
  const { salt, hash } = createDigest(ADMIN_PASSWORD);

  const payload = {
    role: "admin",
    username: ADMIN_USERNAME,
    display_name: ADMIN_DISPLAY_NAME,
    email: ADMIN_EMAIL,
    password_salt: salt,
    password_hash_sha256: hash,
  };

  let { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select()
    .maybeSingle();

  if (
    error &&
    /password_salt|password_hash_sha256|column/i.test(error.message || "")
  ) {
    console.warn(
      "Password digest columns missing — run migration 20260709120000_profiles_password_sha256.sql",
    );
    ({ data, error } = await supabase
      .from("profiles")
      .update({
        role: "admin",
        username: ADMIN_USERNAME,
        display_name: ADMIN_DISPLAY_NAME,
        email: ADMIN_EMAIL,
      })
      .eq("id", userId)
      .select()
      .maybeSingle());
  }

  if (error) {
    throw new Error(friendlyError(error, "Promote profile"));
  }

  return data;
}

async function main() {
  console.log("Mati Heritage 3D — create admin account");
  console.log(`Email:    ${ADMIN_EMAIL}`);
  console.log(`Username: ${ADMIN_USERNAME}`);
  console.log(`Project:  ${SUPABASE_URL}`);

  let user = await findUserByEmail(ADMIN_EMAIL);

  if (user) {
    console.log("Auth user already exists — promoting profile to admin.");
  } else {
    console.log("Creating auth user…");
    user = await createUser();
    console.log("Auth user created.");
  }

  const profile = await promoteProfile(user.id);
  console.log("Profile updated:", profile);

  console.log("\nAdmin ready. Sign in at Front End/login.html?redirect=admin.html");
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log("Change this password after first login.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
