/**
 * @file src/json/values.ts
 * @desc Small helpers over JSON values shared by diff and merge: plain-object test, structural
 *       equality, keyed-list indexing and path display. Internal.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

import { VcsError } from "../errors.js";
import type { Codec } from "./codec.js";
import type { Located, Segment } from "./types.js";

/** A non-array object (plain JSON object). */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Structural equality for JSON values. */
export const equal = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const list = b as unknown[];
    return a.length === list.length && a.every((item, i) => equal(item, list[i]));
  }
  const x = a as Record<string, unknown>;
  const y = b as Record<string, unknown>;
  const keys = Object.keys(x).filter((k) => x[k] !== undefined);
  if (keys.length !== Object.keys(y).filter((k) => y[k] !== undefined).length) return false;
  return keys.every((k) => k in y && equal(x[k], y[k]));
};

/** A keyed list's items by key, in order. */
export type Keyed = { keys: string[]; items: Map<string, unknown> };

/** Index a keyed list, checking every key is a string and unique. */
export const keyed = (list: unknown[], codec: Codec, pattern: string, where: string): Keyed => {
  const keyOf = codec.lists.get(pattern) as (item: unknown) => unknown;
  const keys: string[] = [];
  const items = new Map<string, unknown>();
  for (const item of list) {
    const key = keyOf(item);
    if (typeof key !== "string")
      throw new VcsError("bad-key", `an item in ${where || "the root list"} has a non-string key`);
    if (items.has(key))
      throw new VcsError("bad-key", `${where || "the root list"} has the key "${key}" twice`);
    keys.push(key);
    items.set(key, item);
  }
  return { keys, items };
};

/** The display form of a path: keys joined by ".", list items as [key]. */
export const display = (segments: Segment[]): string =>
  segments.reduce<string>(
    (out, s) => (typeof s === "string" ? (out ? `${out}.${s}` : s) : `${out}[${s.key}]`),
    "",
  );

/** A Located for these segments. */
export const at = (segments: Segment[]): Located => ({ path: display(segments), segments });
