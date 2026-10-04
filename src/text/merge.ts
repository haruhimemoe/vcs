/**
 * @file src/text/merge.ts
 * @desc mergeText: a diff3 merge by line. Each side's edits become hunks over the base; hunks
 *       from the two sides that overlap or touch (no unchanged base line between them) form one
 *       region. A region only one side changed takes that side; a region both changed the same
 *       way takes it once; anything else is a conflict, and the merged text keeps ours there.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

import { splitLines } from "./lines.js";
import { DEFAULT_MAX_EDITS, myers } from "./myers.js";

/** A conflicting region: the base text and each side's text for it. */
export type TextConflict = { base: string; ours: string; theirs: string };

/** One piece of a merge: agreed text, or a conflict. */
export type TextChunk = { ok: string } | { conflict: TextConflict };

/** A text merge. `text` takes ours inside each conflict, so it never loses the caller's edits. */
export type TextMerge = { clean: boolean; chunks: TextChunk[]; text: string };

type Hunk = { start: number; end: number; lines: string[]; side: 0 | 1 };

const hunksOf = (base: string[], side: string[], id: 0 | 1, maxEdits: number): Hunk[] => {
  const hunks: Hunk[] = [];
  let at = 0;
  let open: Hunk | null = null;
  for (const run of myers(base, side, maxEdits)) {
    if (run.op === "equal") {
      if (open) hunks.push(open);
      open = null;
      at += run.items.length;
      continue;
    }
    open ??= { start: at, end: at, lines: [], side: id };
    if (run.op === "delete") {
      at += run.items.length;
      open.end = at;
    } else open.lines.push(...run.items);
  }
  if (open) hunks.push(open);
  return hunks;
};

/** One side's text for base[start, end), applying that side's hunks inside the range. */
const sideText = (base: string[], hunks: Hunk[], start: number, end: number): string => {
  let out = "";
  let at = start;
  for (const hunk of hunks) {
    out += base.slice(at, hunk.start).join("") + hunk.lines.join("");
    at = hunk.end;
  }
  return out + base.slice(at, end).join("");
};

/**
 * @function mergeText
 * @param base {string} the common ancestor
 * @param ours {string} our version (it wins inside conflicts in `text`)
 * @param theirs {string} their version
 * @param options {{ maxEdits?: number }} passed to the two line diffs
 * @returns {TextMerge} the chunks, whether it's clean, and the merged text
 */
export const mergeText = (
  base: string,
  ours: string,
  theirs: string,
  options: { maxEdits?: number } = {},
): TextMerge => {
  const max = options.maxEdits ?? DEFAULT_MAX_EDITS;
  const b = splitLines(base);
  const all = [...hunksOf(b, splitLines(ours), 0, max), ...hunksOf(b, splitLines(theirs), 1, max)];
  all.sort((x, y) => x.start - y.start || x.end - y.end || x.side - y.side);
  const chunks: TextChunk[] = [];
  const ok = (text: string): void => {
    if (text === "") return;
    const last = chunks.at(-1);
    if (last && "ok" in last) last.ok += text;
    else chunks.push({ ok: text });
  };
  let at = 0;
  let i = 0;
  while (i < all.length) {
    const group = [all[i] as Hunk];
    let start = (all[i] as Hunk).start;
    let end = (all[i] as Hunk).end;
    i++;
    while (i < all.length && (all[i] as Hunk).start <= end) {
      const next = all[i] as Hunk;
      group.push(next);
      start = Math.min(start, next.start);
      end = Math.max(end, next.end);
      i++;
    }
    ok(b.slice(at, start).join(""));
    const mine = group.filter((h) => h.side === 0);
    const yours = group.filter((h) => h.side === 1);
    const oursText = sideText(b, mine, start, end);
    const theirsText = sideText(b, yours, start, end);
    if (yours.length === 0 || oursText === theirsText) ok(oursText);
    else if (mine.length === 0) ok(theirsText);
    else
      chunks.push({
        conflict: { base: b.slice(start, end).join(""), ours: oursText, theirs: theirsText },
      });
    at = end;
  }
  ok(b.slice(at).join(""));
  const clean = chunks.every((chunk) => "ok" in chunk);
  const text = chunks.map((chunk) => ("ok" in chunk ? chunk.ok : chunk.conflict.ours)).join("");
  return { clean, chunks, text };
};
