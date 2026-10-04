/**
 * @file src/json/diff.ts
 * @desc diffValue: the changes between two JSON values, in document order. Objects recurse by
 *       key, keyed lists match items by key (adds, removes, moves, then changes inside kept
 *       items), text paths get a line diff, ignored paths are skipped, and anything else that
 *       differs is one `set`.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

import { diffText } from "../text/index.js";
import { type Codec, child, EMPTY_CODEC } from "./codec.js";
import { lcs } from "./lcs.js";
import type { Change, Segment } from "./types.js";
import { at, equal, isRecord, keyed } from "./values.js";

const walk = (
  a: unknown,
  b: unknown,
  codec: Codec,
  pattern: string,
  segments: Segment[],
  out: Change[],
): void => {
  if (codec.ignore.has(pattern) || equal(a, b)) return;
  if (codec.text.has(pattern) && typeof a === "string" && typeof b === "string") {
    out.push({ ...at(segments), op: "text", diff: diffText(a, b) });
    return;
  }
  if (codec.lists.has(pattern) && Array.isArray(a) && Array.isArray(b)) {
    list(a, b, codec, pattern, segments, out);
    return;
  }
  if (isRecord(a) && isRecord(b)) {
    const keys = [...Object.keys(a), ...Object.keys(b).filter((k) => !(k in a))];
    for (const key of keys) {
      const next = child(pattern, key);
      if (codec.ignore.has(next)) continue;
      const x = a[key];
      const y = b[key];
      if (x === undefined && y !== undefined)
        out.push({ ...at(segments), op: "add", key, value: y });
      else if (y === undefined && x !== undefined)
        out.push({ ...at(segments), op: "remove", key, value: x });
      else walk(x, y, codec, next, [...segments, key], out);
    }
    return;
  }
  out.push({ ...at(segments), op: "set", from: a, to: b });
};

const list = (
  a: unknown[],
  b: unknown[],
  codec: Codec,
  pattern: string,
  segments: Segment[],
  out: Change[],
): void => {
  const where = at(segments).path;
  const x = keyed(a, codec, pattern, where);
  const y = keyed(b, codec, pattern, where);
  x.keys.forEach((key, index) => {
    if (!y.items.has(key))
      out.push({ ...at(segments), op: "remove", key, value: x.items.get(key), index });
  });
  y.keys.forEach((key, index) => {
    if (!x.items.has(key))
      out.push({ ...at(segments), op: "add", key, value: y.items.get(key), index });
  });
  const fromA = x.keys.filter((k) => y.items.has(k));
  const fromB = y.keys.filter((k) => x.items.has(k));
  const stay = new Set(lcs(fromA, fromB));
  for (const key of fromB)
    if (!stay.has(key))
      out.push({
        ...at(segments),
        op: "move",
        key,
        from: x.keys.indexOf(key),
        to: y.keys.indexOf(key),
      });
  const item = child(pattern, "[]");
  for (const key of fromB)
    walk(x.items.get(key), y.items.get(key), codec, item, [...segments, { key }], out);
};

/**
 * @function diffValue
 * @param a {unknown} the old value (JSON)
 * @param b {unknown} the new value (JSON)
 * @param codec {Codec} keyed lists, text paths and ignored paths (default: none)
 * @returns {Change[]} the changes that turn a into b, in document order
 * @throws {VcsError} `bad-key` when a keyed list has a non-string or repeated key
 */
export const diffValue = (a: unknown, b: unknown, codec: Codec = EMPTY_CODEC): Change[] => {
  const out: Change[] = [];
  walk(a, b, codec, "", [], out);
  return out;
};
