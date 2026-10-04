/**
 * @file tests/performance.test.ts
 * @desc Hostile input stays fast: maxEdits caps a worst-case diff and merge, and long shared
 *       prefixes and suffixes are trimmed before Myers runs.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

import { describe, expect, it } from "vitest";
import { diffText, mergeText } from "../src/text/index.js";

const lines = (n: number, f: (i: number) => string): string =>
  Array.from({ length: n }, (_, i) => `${f(i)}\n`).join("");

describe("performance", () => {
  it("caps a 10k-line diff with nothing in common", () => {
    const a = lines(10_000, (i) => `a${i}`);
    const b = lines(10_000, (i) => `b${i}`);
    const start = performance.now();
    const diff = diffText(a, b);
    const merge = mergeText(
      a,
      b,
      lines(10_000, (i) => `c${i}`),
    );
    expect(performance.now() - start).toBeLessThan(1500);
    expect(diff.map((r) => r.op)).toEqual(["delete", "insert"]);
    expect(merge.clean).toBe(false);
  });

  it("diffs one changed line in 50k lines quickly", () => {
    const a = lines(50_000, (i) => `${i}`);
    const b = a.replace("\n25000\n", "\nchanged\n");
    const start = performance.now();
    expect(diffText(a, b)).toHaveLength(4);
    expect(performance.now() - start).toBeLessThan(500);
  });
});
