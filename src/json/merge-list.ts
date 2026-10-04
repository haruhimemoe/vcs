/**
 * @file src/json/merge-list.ts
 * @desc mergeList: a 3-way merge of a keyed list. Members merge per key (mergeMember). Order:
 *       the keys in all three keep the order of the side that changed their relative order
 *       (both changed it differently: an order conflict, ours wins). Every other surviving item
 *       goes after its nearest preceding neighbour on its own side that is already placed, ours
 *       first, then theirs after any of ours sharing that anchor. Internal.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

import { child } from "./codec.js";
import { type MergeContext, mergeMember } from "./merge.js";
import type { Segment } from "./types.js";
import { at, type Keyed, keyed } from "./values.js";

const same = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((k, i) => k === b[i]);

/** Insert one side's extra keys after their nearest placed predecessor on that side. */
const place = (
  order: string[],
  side: string[],
  extras: Set<string>,
  fromOurs: Set<string>,
): void => {
  for (let i = 0; i < side.length; i++) {
    const key = side[i] as string;
    if (!extras.has(key) || order.includes(key)) continue;
    let anchor = -1;
    for (let j = i - 1; j >= 0; j--) {
      const found = order.indexOf(side[j] as string);
      if (found !== -1) {
        anchor = found;
        break;
      }
    }
    let at = anchor + 1;
    // Theirs goes after ours added at the same anchor; ours itself never skips.
    if (!fromOurs.has(key)) while (at < order.length && fromOurs.has(order[at] as string)) at++;
    order.splice(at, 0, key);
  }
};

/** Merge three keyed lists. */
export const mergeList = (
  baseList: unknown[],
  oursList: unknown[],
  theirsList: unknown[],
  ctx: MergeContext,
  pattern: string,
  segments: Segment[],
): unknown[] => {
  const where = at(segments).path;
  const b: Keyed = keyed(baseList, ctx.codec, pattern, where);
  const o: Keyed = keyed(oursList, ctx.codec, pattern, where);
  const t: Keyed = keyed(theirsList, ctx.codec, pattern, where);
  const item = child(pattern, "[]");
  const merged = new Map<string, unknown>();
  for (const key of new Set([...o.keys, ...t.keys, ...b.keys])) {
    const value = mergeMember(b.items.get(key), o.items.get(key), t.items.get(key), ctx, item, [
      ...segments,
      { key },
    ]);
    if (value !== undefined) merged.set(key, value);
  }
  const inAll = (k: string): boolean =>
    merged.has(k) && b.items.has(k) && o.items.has(k) && t.items.has(k);
  const baseOrder = b.keys.filter(inAll);
  const oursOrder = o.keys.filter(inAll);
  const theirsOrder = t.keys.filter(inAll);
  let order: string[];
  if (same(oursOrder, baseOrder)) order = [...theirsOrder];
  else if (same(theirsOrder, baseOrder) || same(oursOrder, theirsOrder)) order = [...oursOrder];
  else {
    ctx.conflicts.push({
      ...at(segments),
      kind: "order",
      base: baseOrder,
      ours: oursOrder,
      theirs: theirsOrder,
    });
    order = [...oursOrder];
  }
  const extras = new Set([...merged.keys()].filter((k) => !inAll(k)));
  const fromOurs = new Set(o.keys.filter((k) => extras.has(k)));
  place(order, o.keys, extras, new Set());
  place(order, t.keys, extras, fromOurs);
  // Kept only in base (cannot happen: a key gone from both sides is dropped) is skipped.
  return order.map((k) => merged.get(k));
};
