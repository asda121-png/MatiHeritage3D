import { createHash, randomBytes } from "node:crypto";

/** SHA-256 digest with per-user salt (capstone password-storage requirement). */
export function generateSalt() {
  return randomBytes(16).toString("hex");
}

export function hashPassword(password, salt) {
  return createHash("sha256")
    .update(String(salt) + String(password))
    .digest("hex");
}

export function createDigest(password) {
  const salt = generateSalt();
  return { salt, hash: hashPassword(password, salt) };
}
