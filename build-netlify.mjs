/** Netlify build: compile Tailwind CSS for the frontend. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const root = path.dirname(fileURLToPath(import.meta.url));
const publishDir = path.join(root, "Front End");

const publicPages = [
  ["3dexplore", "3dexplore.html"],
  ["about", "about.html"],
  ["account", "account.html"],
  ["admin", "admin.html"],
  ["contact", "contact.html"],
  ["create-password", "create-password.html"],
  ["forgot-password", "forgot-password.html"],
  ["gallery", "gallery.html"],
  ["galleryintangibleculturalheritage", "galleryintangibleculturalheritage.html"],
  ["gallerynaturalheritage", "gallerynaturalheritage.html"],
  ["game", "game.html"],
  ["leaderboard", "leaderboard.html"],
  ["login", "login.html"],
  ["map", "map.html"],
  ["memorypairs", "memorypairs.html"],
  ["partner", "partner.html"],
  ["privacy", "privacy.html"],
  ["reset-password", "reset-password.html"],
  ["slidepuzzle", "slidepuzzle.html"],
  ["trivia", "trivia.html"],
  ["truefalsesprint", "truefalsesprint.html"],
  ["userregistration", "userregistration.html"],
  ["wordscramble", "wordscramble.html"],
];

const redirects = [
  ...publicPages.flatMap(([route, file]) => [
    `/${file} /${route} 301!`,
    `/${route} /${file} 200`,
  ]),
  "/index.html / 301!",
  "/ /index.html 200",
];

fs.writeFileSync(
  path.join(publishDir, "_redirects"),
  `${redirects.join("\n")}\n`,
);
console.log(`Generated ${redirects.length} Netlify clean URL rules`);

// Build Tailwind CSS
try {
  console.log("Building Tailwind CSS...");
  const inputPath = path.join(root, "styles.css");
  const outputPath = path.join(publishDir, "css", "tailwind.css");

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
