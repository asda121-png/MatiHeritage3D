/**
 * SHA-256 password digests with per-user salt.
 * Plain passwords are never stored in localStorage or profiles.
 */
const MatiPasswordHash = (() => {
  function generateSalt() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function hashPassword(password, salt) {
    const data = new TextEncoder().encode(String(salt) + String(password));
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  }

  async function createDigest(password) {
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);
    return { salt, hash };
  }

  async function verifyPassword(password, salt, expectedHash) {
    if (!password || !salt || !expectedHash) return false;
    const hash = await hashPassword(password, salt);
    return hash === expectedHash;
  }

  async function storeDigestForCurrentUser(password) {
    const sb = MatiSupabase?.getClient?.();
    if (!sb || !password) return { ok: false };

    const { salt, hash } = await createDigest(password);
    const { error } = await sb.rpc("set_password_digest", {
      p_salt: salt,
      p_hash: hash,
    });

    if (error) {
      console.warn("MatiPasswordHash: could not store digest", error);
      return { ok: false, message: error.message };
    }

    return { ok: true };
  }

  return {
    generateSalt,
    hashPassword,
    createDigest,
    verifyPassword,
    storeDigestForCurrentUser,
  };
})();

window.MatiPasswordHash = MatiPasswordHash;
