/**
 * @file src/text/diff.ts
 * @desc diffText (by line), diffChars (by code point, for highlighting inside a changed line) and
 *       applyTextDiff (replays a line diff, checking the old text matches it).
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

import { VcsError } from "../errors.js";
import { splitLines } from "./lines.js";
import { DEFAULT_MAX_EDITS, myers } from "./myers.js";

/** What a run does to the old text. */
export type TextOp = "equal" | "delete" | "insert";

/** One run of a line diff. Lines keep their "\n". */
export type TextDiffRun = { op: TextOp; lines: string[] };

/** A line diff: runs in order; adjacent runs never share an op. */
export type TextDiff = TextDiffRun[];

/** One run of a character diff. */
export type CharDiffRun = { op: TextOp; text: string };

/** Options for diffText and diffChars. */
export type DiffOptions = {
  /** Past this many inserted plus deleted lines (or characters), the differing middle is
   *  reported as one delete and one insert. Default 2000. */
  maxEdits?: number;
};

/**
 * @function diffText
 * @param a {string} the old text
 * @param b {string} the new text
 * @param options {DiffOptions} optional maxEdits
 * @returns {TextDiff} line runs that turn a into b; deletes come before inserts at one place
 */
export const diffText = (a: string, b: string, options: DiffOptions = {}): TextDiff =>
  myers(splitLines(a), splitLines(b), options.maxEdits ?? DEFAULT_MAX_EDITS).map((run) => ({
    op: run.op,
    lines: run.items,
  }));

/**
 * @function diffChars
 * @param a {string} the old text, usually one line
 * @param b {string} the new text
 * @param options {DiffOptions} optional maxEdits
 * @returns {CharDiffRun[]} runs by code point (surrogate pairs stay whole)
 */
export const diffChars = (a: string, b: string, options: DiffOptions = {}): CharDiffRun[] =>
  myers(Array.from(a), Array.from(b), options.maxEdits ?? DEFAULT_MAX_EDITS).map((run) => ({
    op: run.op,
    text: run.items.join(""),
  }));

/**
 * @function applyTextDiff
 * @param a {string} the old text the diff was made from
 * @param diff {TextDiff} a line diff
 * @returns {string} the new text
 * @throws {VcsError} `diff-mismatch` when a's lines don't match the diff's equal and delete runs
 */
export const applyTextDiff = (a: string, diff: TextDiff): string => {
  const old = splitLines(a);
  let at = 0;
  let out = "";
  for (const run of diff) {
    if (run.op === "insert") {
      out += run.lines.join("");
      continue;
    }
    for (const line of run.lines) {
      if (old[at] !== line)
        throw new VcsError("diff-mismatch", `line ${at + 1} doesn't match the diff`);
      if (run.op === "equal") out += line;
      at++;
    }
  }
  if (at !== old.length)
    throw new VcsError("diff-mismatch", `the diff ends at line ${at + 1} of ${old.length}`);
  return out;
};
