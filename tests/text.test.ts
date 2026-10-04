/**
 * @file tests/text.test.ts
 * @desc diffText, diffChars and applyTextDiff: golden cases, the maxEdits fallback, mismatch
 *       errors, and a seeded property (applying a diff gives the new text).
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

import { describe, expect, it } from "vitest";
import { applyTextDiff, diffChars, diffText } from "../src/text/index.js";
import { mutate, randomLines, rng } from "./rng.js";

describe("diffText", () => {
  it("handles empty and equal text", () => {
    expect(diffText("", "")).toEqual([]);
    expect(diffText("a\nb\n", "a\nb\n")).toEqual([{ op: "equal", lines: ["a\n", "b\n"] }]);
    expect(diffText("", "a\n")).toEqual([{ op: "insert", lines: ["a\n"] }]);
    expect(diffText("a", "")).toEqual([{ op: "delete", lines: ["a"] }]);
  });

  it("keeps \\r\\n and a missing final newline", () => {
    expect(diffText("a\r\nb", "a\r\nc")).toEqual([
      { op: "equal", lines: ["a\r\n"] },
      { op: "delete", lines: ["b"] },
      { op: "insert", lines: ["c"] },
    ]);
  });

  it("finds a shortest script, deletes before inserts", () => {
    const a = "a\nb\nc\na\nb\nb\na\n";
    const b = "c\nb\na\nb\na\nc\n";
    const diff = diffText(a, b);
    const edits = diff.filter((r) => r.op !== "equal").reduce((n, r) => n + r.lines.length, 0);
    expect(edits).toBe(5);
    expect(applyTextDiff(a, diff)).toBe(b);
    for (let i = 1; i < diff.length; i++) expect(diff[i]?.op).not.toBe(diff[i - 1]?.op);
  });

  it("replaces a changed line as delete then insert", () => {
    expect(diffText("x\nold\ny\n", "x\nnew\ny\n")).toEqual([
      { op: "equal", lines: ["x\n"] },
      { op: "delete", lines: ["old\n"] },
      { op: "insert", lines: ["new\n"] },
      { op: "equal", lines: ["y\n"] },
    ]);
  });

  it("gives up past maxEdits but keeps the shared ends", () => {
    const diff = diffText("s\na\nb\nc\ne\n", "s\nx\ny\nz\ne\n", { maxEdits: 2 });
    expect(diff).toEqual([
      { op: "equal", lines: ["s\n"] },
      { op: "delete", lines: ["a\n", "b\n", "c\n"] },
      { op: "insert", lines: ["x\n", "y\n", "z\n"] },
      { op: "equal", lines: ["e\n"] },
    ]);
  });

  it("round-trips random edits", () => {
    const next = rng(7);
    for (let i = 0; i < 300; i++) {
      const a = randomLines(next, Math.floor(next() * 40)).join("");
      const b = mutate(next, a.match(/[^\n]*\n/g) ?? [], Math.floor(next() * 10)).join("");
      expect(applyTextDiff(a, diffText(a, b))).toBe(b);
    }
  });
});

describe("applyTextDiff", () => {
  it("refuses text the diff wasn't made from", () => {
    const diff = diffText("a\nb\n", "a\nc\n");
    expect(() => applyTextDiff("a\nz\n", diff)).toThrow("line 2 doesn't match");
    expect(() => applyTextDiff("a\nb\nmore\n", diff)).toThrow("ends at line 3 of 3");
  });
});

describe("diffChars", () => {
  it("diffs by code point", () => {
    expect(diffChars("cat", "cut")).toEqual([
      { op: "equal", text: "c" },
      { op: "delete", text: "a" },
      { op: "insert", text: "u" },
      { op: "equal", text: "t" },
    ]);
    expect(diffChars("a😀", "a😃")).toEqual([
      { op: "equal", text: "a" },
      { op: "delete", text: "😀" },
      { op: "insert", text: "😃" },
    ]);
    expect(diffChars("ab", "ba", { maxEdits: 0 })).toEqual([
      { op: "delete", text: "ab" },
      { op: "insert", text: "ba" },
    ]);
  });
});
