/**
 * Netlify build: compile Tailwind CSS and copy Back End browser scripts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const root = path.dirname(fileURLToPath(import.meta.url));

// Build Tailwind CSS
try {
  console.log("Building Tailwind CSS...");
  const inputPath = path.join(root, "styles.css");
  const outputPath = path.join(root, "Front End", "css", "tailwind.css");

  const css = fs.readFileSync(inputPath, "utf8");
  const result = await postcss([tailwindcss]).process(css, {
    from: inputPath,
    to: outputPath,
  });

  fs.writeFileSync(outputPath, result.css);
  console.log("Tailwind CSS compiled successfully");
} catch (error) {
  console.error("Error building Tailwind CSS:", error.message);
}

// Copy Back End browser scripts
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

console.log(
  `Netlify build: copied ${files.length} backend scripts to Front End/_backend/`,
);
