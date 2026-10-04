/**
 * @file src/json/lcs.ts
 * @desc lcs: a longest common subsequence of two lists of distinct keys, through Myers. Used to
 *       tell which keyed list items moved. Internal.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

import { myers } from "../text/myers.js";

/**
 * @function lcs
 * @param a {string[]} keys in one order
 * @param b {string[]} the same or other keys in another order
 * @returns {string[]} keys that keep their relative order in both
 */
export const lcs = (a: string[], b: string[]): string[] =>
  myers(a, b, a.length + b.length)
    .filter((run) => run.op === "equal")
    .flatMap((run) => run.items);
