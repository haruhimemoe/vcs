/**
 * @file src/json/strip.ts
 * @desc withoutIgnored: a copy of a value with the codec's ignored paths removed, so a hash of it
 *       only changes when something a diff would show changed.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

import { type Codec, child, EMPTY_CODEC } from "./codec.js";
import { isRecord } from "./values.js";

/** A copy of a value found at `pattern` without the ignored paths below it. Internal. */
export const strip = (value: unknown, codec: Codec, pattern: string): unknown => {
  if (codec.lists.has(pattern) && Array.isArray(value)) {
    const item = child(pattern, "[]");
    return value.map((v) => strip(v, codec, item));
  }
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    const next = child(pattern, key);
    if (!codec.ignore.has(next)) out[key] = strip(v, codec, next);
  }
  return out;
};

/**
 * @function withoutIgnored
 * @param value {T} a JSON value
 * @param codec {Codec} the codec whose `ignore` patterns to drop (default: none)
 * @returns {T} a copy without the ignored paths (the value itself when nothing is ignored)
 */
export const withoutIgnored = <T>(value: T, codec: Codec = EMPTY_CODEC): T =>
  codec.ignore.size === 0 ? value : (strip(value, codec, "") as T);
