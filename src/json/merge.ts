/**
 * @file src/json/merge.ts
 * @desc mergeValue: a 3-way merge of JSON values. A side that didn't change defers to the other;
 *       identical changes agree. Where both changed differently: text paths merge by line, keyed
 *       lists merge by item (merge-list.ts), objects merge by key, and anything else is a
 *       conflict that keeps ours. A key removed on one side and edited on the other is a
 *       remove-edit conflict that keeps the edit. Ignored paths keep ours.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

import { mergeText } from "../text/index.js";
import { type Codec, child, EMPTY_CODEC } from "./codec.js";
import { mergeList } from "./merge-list.js";
import { strip } from "./strip.js";
import type { Conflict, Segment, ValueMerge } from "./types.js";
import { at, equal, isRecord } from "./values.js";

/** Shared state for one merge. */
export type MergeContext = { codec: Codec; conflicts: Conflict[] };

/** Merge three values at one path. `undefined` means absent. */
export const mergeAt = (
  base: unknown,
  ours: unknown,
  theirs: unknown,
  ctx: MergeContext,
  pattern: string,
  segments: Segment[],
): unknown => {
  if (ctx.codec.ignore.has(pattern)) return ours;
  if (equal(ours, theirs) || equal(base, theirs)) return ours;
  if (equal(base, ours)) return theirs;
  if (ctx.codec.text.has(pattern) && typeof ours === "string" && typeof theirs === "string") {
    const m = mergeText(typeof base === "string" ? base : "", ours, theirs);
    if (!m.clean)
      ctx.conflicts.push({ ...at(segments), kind: "text", base, ours, theirs, chunks: m.chunks });
    return m.text;
  }
  if (ctx.codec.lists.has(pattern) && Array.isArray(ours) && Array.isArray(theirs))
    return mergeList(Array.isArray(base) ? base : [], ours, theirs, ctx, pattern, segments);
  if (isRecord(ours) && isRecord(theirs))
    return mergeRecord(isRecord(base) ? base : {}, ours, theirs, ctx, pattern, segments);
  ctx.conflicts.push({ ...at(segments), kind: "value", base, ours, theirs });
  return ours;
};

/** One key or item that may be gone on either side. Returns undefined when it should go. */
export const mergeMember = (
  base: unknown,
  ours: unknown,
  theirs: unknown,
  ctx: MergeContext,
  pattern: string,
  segments: Segment[],
): unknown => {
  if (ctx.codec.ignore.has(pattern)) return ours;
  const removedOurs = base !== undefined && ours === undefined;
  const removedTheirs = base !== undefined && theirs === undefined;
  if (removedOurs && removedTheirs) return undefined;
  if (removedOurs || removedTheirs) {
    const kept = removedOurs ? theirs : ours;
    // An edit only to ignored fields isn't an edit.
    if (equal(strip(base, ctx.codec, pattern), strip(kept, ctx.codec, pattern))) return undefined;
    ctx.conflicts.push({ ...at(segments), kind: "remove-edit", base, ours, theirs });
    return kept;
  }
  return mergeAt(base, ours, theirs, ctx, pattern, segments);
};

const mergeRecord = (
  base: Record<string, unknown>,
  ours: Record<string, unknown>,
  theirs: Record<string, unknown>,
  ctx: MergeContext,
  pattern: string,
  segments: Segment[],
): Record<string, unknown> => {
  const keys = [
    ...Object.keys(ours),
    ...Object.keys(theirs).filter((k) => !(k in ours)),
    ...Object.keys(base).filter((k) => !(k in ours) && !(k in theirs)),
  ];
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const value = mergeMember(base[key], ours[key], theirs[key], ctx, child(pattern, key), [
      ...segments,
      key,
    ]);
    if (value !== undefined) out[key] = value;
  }
  return out;
};

/**
 * @function mergeValue
 * @param base {unknown} the common ancestor (JSON)
 * @param ours {T} our version: it wins inside conflicts
 * @param theirs {unknown} their version
 * @param codec {Codec} keyed lists, text paths and ignored paths (default: none)
 * @returns {ValueMerge<T>} the merged value, whether it's clean, and every conflict
 * @throws {VcsError} `bad-key` when a keyed list has a non-string or repeated key
 */
export const mergeValue = <T>(
  base: unknown,
  ours: T,
  theirs: unknown,
  codec: Codec = EMPTY_CODEC,
): ValueMerge<T> => {
  const ctx: MergeContext = { codec, conflicts: [] };
  const value = mergeAt(base, ours, theirs, ctx, "", []) as T;
  return { clean: ctx.conflicts.length === 0, value, conflicts: ctx.conflicts };
};
