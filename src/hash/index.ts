/**
 * @file src/hash/index.ts
 * @desc @haruhimemoe/vcs/hash: canonicalJson and hashValue (SHA-256 over it, through Web Crypto,
 *       so it runs in browsers, Node, Bun and Deno alike).
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

import { canonicalJson } from "./canonical.js";

export { canonicalJson };

/**
 * @function hashValue
 * @param value {unknown} a JSON value
 * @returns {Promise<string>} the lowercase hex SHA-256 of its canonical JSON
 * @throws {VcsError} `not-json` when the value isn't plain JSON
 */
export const hashValue = async (value: unknown): Promise<string> => {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};
