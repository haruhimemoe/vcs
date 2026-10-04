/**
 * @file tests/diff-value.test.ts
 * @desc diffValue: set, add, remove, move and text changes, keyed items, ignored paths, and the
 *       bad-key refusals.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

import { describe, expect, it } from "vitest";
import { defineCodec, diffValue } from "../src/json/index.js";

const pool = defineCodec({
  lists: { slots: (s: { id: string }) => s.id },
  text: ["notes"],
  ignore: ["updatedAt"],
});

describe("diffValue", () => {
  it("finds nothing between equal values", () => {
    expect(diffValue({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toEqual([]);
    expect(diffValue({ a: 1, u: undefined }, { a: 1 })).toEqual([]);
  });

  it("reports sets, adds and removes on objects", () => {
    expect(diffValue({ a: 1, b: { c: 1 }, gone: true }, { a: 2, b: { c: 1, d: 3 } })).toEqual(
      [
        { path: "", segments: [], op: "set", from: 1, to: 2, ...{} },
        { path: "b", segments: ["b"], op: "add", key: "d", value: 3 },
        { path: "", segments: [], op: "remove", key: "gone", value: true },
      ].map((c, i) => (i === 0 ? { ...c, path: "a", segments: ["a"] } : c)),
    );
  });

  it("treats a type change and unkeyed arrays as one set", () => {
    expect(diffValue({ a: [1, 2] }, { a: [2, 1] })).toEqual([
      { path: "a", segments: ["a"], op: "set", from: [1, 2], to: [2, 1] },
    ]);
    expect(diffValue({ a: { x: 1 } }, { a: "x" })[0]?.op).toBe("set");
    expect(diffValue(1, 2)).toEqual([{ path: "", segments: [], op: "set", from: 1, to: 2 }]);
  });

  it("diffs keyed lists by key: removes, adds, moves, then edits inside", () => {
    const a = { slots: [{ id: "NM1", mod: "NM" }, { id: "NM2" }, { id: "HD1" }, { id: "X" }] };
    const b = { slots: [{ id: "HD1" }, { id: "NM1", mod: "HD" }, { id: "NM2" }, { id: "NEW" }] };
    expect(diffValue(a, b, pool)).toEqual([
      { path: "slots", segments: ["slots"], op: "remove", key: "X", value: { id: "X" }, index: 3 },
      { path: "slots", segments: ["slots"], op: "add", key: "NEW", value: { id: "NEW" }, index: 3 },
      { path: "slots", segments: ["slots"], op: "move", key: "HD1", from: 2, to: 0 },
      {
        path: "slots[NM1].mod",
        segments: ["slots", { key: "NM1" }, "mod"],
        op: "set",
        from: "NM",
        to: "HD",
      },
    ]);
  });

  it("diffs text paths by line and skips ignored paths", () => {
    const changes = diffValue(
      { notes: "a\nb\n", updatedAt: 1 },
      { notes: "a\nc\n", updatedAt: 2, extra: 1 },
      pool,
    );
    expect(changes).toEqual([
      {
        path: "notes",
        segments: ["notes"],
        op: "text",
        diff: [
          { op: "equal", lines: ["a\n"] },
          { op: "delete", lines: ["b\n"] },
          { op: "insert", lines: ["c\n"] },
        ],
      },
      { path: "", segments: [], op: "add", key: "extra", value: 1 },
    ]);
  });

  it("refuses bad keys", () => {
    expect(() => diffValue({ slots: [{ id: 1 }] }, { slots: [] }, pool)).toThrow(
      "an item in slots has a non-string key",
    );
    expect(() => diffValue({ slots: [{ id: "a" }, { id: "a" }] }, { slots: [] }, pool)).toThrow(
      'slots has the key "a" twice',
    );
    const root = defineCodec({ lists: { "": (x: string) => x } });
    expect(() => diffValue(["a", "a"], [], root)).toThrow('the root list has the key "a" twice');
    expect(() => diffValue([1], [], root)).toThrow("an item in the root list");
  });
});
