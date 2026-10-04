/**
 * @file tests/merge-text.test.ts
 * @desc mergeText: the diff3 rules (separated edits merge, touching or overlapping edits
 *       conflict unless identical, inserts at one spot) and seeded properties.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

import { describe, expect, it } from "vitest";
import { mergeText } from "../src/text/index.js";
import { mutate, randomLines, rng } from "./rng.js";

const L = (...lines: string[]): string => lines.map((l) => `${l}\n`).join("");

describe("mergeText", () => {
  it("takes one side's change", () => {
    const base = L("a", "b", "c");
    expect(mergeText(base, L("a", "B", "c"), base)).toEqual({
      clean: true,
      chunks: [{ ok: L("a", "B", "c") }],
      text: L("a", "B", "c"),
    });
    expect(mergeText(base, base, L("a", "c")).text).toBe(L("a", "c"));
  });

  it("merges edits separated by an unchanged line", () => {
    const m = mergeText(L("a", "b", "c"), L("A", "b", "c"), L("a", "b", "C"));
    expect(m.clean).toBe(true);
    expect(m.text).toBe(L("A", "b", "C"));
  });

  it("conflicts on touching edits with no line between", () => {
    const m = mergeText(L("a", "b", "c"), L("A", "b", "c"), L("a", "B", "c"));
    expect(m.clean).toBe(false);
    expect(m.chunks).toEqual([
      { conflict: { base: L("a", "b"), ours: L("A", "b"), theirs: L("a", "B") } },
      { ok: L("c") },
    ]);
    expect(m.text).toBe(L("A", "b", "c"));
  });

  it("takes an identical change once", () => {
    const m = mergeText(L("a", "b"), L("a", "X", "b"), L("a", "X", "b"));
    expect(m).toEqual({ clean: true, chunks: [{ ok: L("a", "X", "b") }], text: L("a", "X", "b") });
  });

  it("conflicts on different inserts at one spot", () => {
    const m = mergeText(L("a", "b"), L("a", "X", "b"), L("a", "Y", "b"));
    expect(m.chunks).toEqual([
      { ok: L("a") },
      { conflict: { base: "", ours: L("X"), theirs: L("Y") } },
      { ok: L("b") },
    ]);
  });

  it("conflicts on delete against edit", () => {
    const m = mergeText(L("a", "b", "c"), L("a", "c"), L("a", "B", "c"));
    expect(m.clean).toBe(false);
    expect(m.text).toBe(L("a", "c"));
  });

  it("handles an empty base and no final newline", () => {
    expect(mergeText("", "x", "").text).toBe("x");
    expect(mergeText("", "x", "y").clean).toBe(false);
    expect(mergeText("a\nb", "a\nB", "A\nb").clean).toBe(false);
    expect(mergeText("a\nb\nc", "A\nb\nc", "a\nb\nC").text).toBe("A\nb\nC");
  });

  it("chains overlapping hunks from both sides into one region", () => {
    const base = L("1", "2", "3", "4", "5");
    const m = mergeText(base, L("1", "X", "3", "Y", "5"), L("1", "2", "Z", "4", "5"));
    expect(m.chunks).toEqual([
      { ok: L("1") },
      { conflict: { base: L("2", "3", "4"), ours: L("X", "3", "Y"), theirs: L("2", "Z", "4") } },
      { ok: L("5") },
    ]);
  });

  it("keeps the properties merge(b,x,b)=x, merge(b,b,x)=x, merge(b,x,x)=x", () => {
    const next = rng(11);
    for (let i = 0; i < 300; i++) {
      const base = randomLines(next, Math.floor(next() * 30));
      const x = mutate(next, base, Math.floor(next() * 8)).join("");
      const b = base.join("");
      expect(mergeText(b, x, b)).toMatchObject({ clean: true, text: x });
      expect(mergeText(b, b, x)).toMatchObject({ clean: true, text: x });
      expect(mergeText(b, x, x)).toMatchObject({ clean: true, text: x });
    }
  });

  it("keeps both sides' separated edits in random merges", () => {
    const next = rng(5);
    for (let i = 0; i < 200; i++) {
      const base = randomLines(next, 20 + Math.floor(next() * 20));
      const m = mergeText(base.join(""), mutate(next, base, 3).join(""), mutate(next, base, 3).join(""));
      if (m.clean) expect(m.chunks.length).toBeLessThanOrEqual(1);
      else expect(m.chunks.some((c) => "conflict" in c)).toBe(true);
    }
  });
});
