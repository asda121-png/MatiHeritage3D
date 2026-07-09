/**
 * Netlify build: copy Back End browser scripts into Front End/_backend/
 * so the published site uses the same relative paths as local Live Server.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const backendSrc = path.join(root, "Back End");
const backendDest = path.join(root, "Front End", "_backend");

const files = [
  "supabase-config.js",
  "supabase-client.js",
  "supabase-api.js",
  "supabase-auth.js",
];

fs.mkdirSync(backendDest, { recursive: true });

for (const file of files) {
  fs.copyFileSync(path.join(backendSrc, file), path.join(backendDest, file));
}

console.log(`Netlify build: copied ${files.length} backend scripts to Front End/_backend/`);
