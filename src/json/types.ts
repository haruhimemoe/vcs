/**
 * @file src/json/types.ts
 * @desc The shapes diffValue and mergeValue return: path segments, changes and conflicts.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

import type { TextChunk, TextDiff } from "../text/index.js";

/** One step of a path: an object key, or a keyed list item by its key. */
export type Segment = string | { key: string };

/** Where a change or conflict is: `segments` for code, `path` for display (`slots[NM1].mods`). */
export type Located = { path: string; segments: Segment[] };

/** One difference between two values. add/remove/move are about the container at `path`. */
export type Change = Located &
  (
    | { op: "set"; from: unknown; to: unknown }
    | { op: "add"; key: string; value: unknown; index?: number }
    | { op: "remove"; key: string; value: unknown; index?: number }
    | { op: "move"; key: string; from: number; to: number }
    | { op: "text"; diff: TextDiff }
  );

/** Why a merge couldn't decide on its own. */
export type ConflictKind = "value" | "remove-edit" | "order" | "text";

/** A place both sides changed differently. The merged value holds `ours` there (or the
 *  edited side, for remove-edit). For an order conflict, base/ours/theirs are key lists. */
export type Conflict = Located & {
  kind: ConflictKind;
  base: unknown;
  ours: unknown;
  theirs: unknown;
  chunks?: TextChunk[];
};

/** A value merge: the merged value and every conflict in it. */
export type ValueMerge<T = unknown> = { clean: boolean; value: T; conflicts: Conflict[] };
