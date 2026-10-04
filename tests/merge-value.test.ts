/**
 * @file tests/merge-value.test.ts
 * @desc mergeValue: every rule in the design (one side, both same, objects by key, remove-edit,
 *       keyed list members, order, placement, text paths, ignored paths) and seeded properties.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

import { describe, expect, it } from "vitest";
import { defineCodec, mergeValue } from "../src/json/index.js";
import { rng } from "./rng.js";

type Slot = { id: string; mod?: string; note?: string };
const codec = defineCodec({
  lists: { slots: (s: Slot) => s.id },
  text: ["notes", "slots[].note"],
  ignore: ["updatedAt"],
});
const ids = (v: { slots: Slot[] }): string[] => v.slots.map((s) => s.id);
const s = (...list: string[]): { slots: Slot[] } => ({ slots: list.map((id) => ({ id })) });

describe("mergeValue: values and objects", () => {
  it("takes the side that changed, or the shared change", () => {
    expect(mergeValue(1, 2, 1).value).toBe(2);
    expect(mergeValue(1, 1, 3).value).toBe(3);
    expect(mergeValue(1, 4, 4)).toEqual({ clean: true, value: 4, conflicts: [] });
  });

  it("conflicts on different atomic changes and keeps ours", () => {
    expect(mergeValue({ a: 1 }, { a: 2 }, { a: 3 })).toEqual({
      clean: false,
      value: { a: 2 },
      conflicts: [{ path: "a", segments: ["a"], kind: "value", base: 1, ours: 2, theirs: 3 }],
    });
  });

  it("merges objects key by key, adds from both sides", () => {
    const m = mergeValue({ a: 1, b: 1, c: 1 }, { a: 2, b: 1, c: 1, x: 1 }, { a: 1, b: 2, y: 1 });
    expect(m).toEqual({ clean: true, value: { a: 2, b: 2, x: 1, y: 1 }, conflicts: [] });
  });

  it("merges keys both sides added, and recurses into objects both added", () => {
    expect(mergeValue({}, { o: { a: 1 } }, { o: { b: 1 } }).value).toEqual({ o: { a: 1, b: 1 } });
    expect(mergeValue({}, { o: 1 }, { o: 2 }).conflicts[0]?.kind).toBe("value");
  });

  it("removes a key one side deleted and the other left alone", () => {
    expect(mergeValue({ a: 1, b: 1 }, { b: 1 }, { a: 1, b: 2 }).value).toEqual({ b: 2 });
    expect(mergeValue({ a: 1 }, {}, {}).value).toEqual({});
  });

  it("keeps an edit over a remove, as a remove-edit conflict", () => {
    const m = mergeValue({ a: 1 }, {}, { a: 2 });
    expect(m.value).toEqual({ a: 2 });
    expect(m.conflicts).toEqual([
      { path: "a", segments: ["a"], kind: "remove-edit", base: 1, ours: undefined, theirs: 2 },
    ]);
    expect(mergeValue({ a: 1 }, { a: 3 }, {}).value).toEqual({ a: 3 });
  });

  it("keeps ours for an ignored key one side removed", () => {
    const ignoreU = defineCodec({ ignore: ["u"] });
    expect(mergeValue({ u: 1, k: 1 }, { k: 1 }, { u: 2, k: 1 }, ignoreU)).toEqual({
      clean: true,
      value: { k: 1 },
      conflicts: [],
    });
  });

  it("removes an item whose only edit was to ignored fields", () => {
    const c = defineCodec({ lists: { s: (x: { id: string }) => x.id }, ignore: ["s[].t"] });
    expect(
      mergeValue({ s: [{ id: "a", t: 1 }] }, { s: [{ id: "a", t: 2 }] }, { s: [] }, c),
    ).toEqual({
      clean: true,
      value: { s: [] },
      conflicts: [],
    });
  });

  it("keeps ours for ignored paths", () => {
    const m = mergeValue(
      { updatedAt: 1, n: 1 },
      { updatedAt: 2, n: 1 },
      { updatedAt: 3, n: 2 },
      codec,
    );
    expect(m).toEqual({ clean: true, value: { updatedAt: 2, n: 2 }, conflicts: [] });
  });

  it("merges text paths by line and reports text conflicts", () => {
    expect(
      mergeValue({ notes: "a\nb\nc\n" }, { notes: "A\nb\nc\n" }, { notes: "a\nb\nC\n" }, codec)
        .value,
    ).toEqual({ notes: "A\nb\nC\n" });
    const m = mergeValue({ notes: "a\n" }, { notes: "x\n" }, { notes: "y\n" }, codec);
    expect(m.value).toEqual({ notes: "x\n" });
    expect(m.conflicts[0]).toMatchObject({
      kind: "text",
      chunks: [{ conflict: { base: "a\n", ours: "x\n", theirs: "y\n" } }],
    });
    expect(mergeValue({}, { notes: "x\n" }, { notes: "y\n" }, codec).conflicts[0]?.kind).toBe(
      "text",
    );
  });
});

describe("mergeValue: keyed lists", () => {
  it("merges adds and removes from both sides", () => {
    const m = mergeValue(s("a", "b", "c"), s("a", "c", "d"), s("x", "a", "b", "c"), codec);
    expect(ids(m.value)).toEqual(["x", "a", "c", "d"]);
    expect(m.clean).toBe(true);
  });

  it("merges edits inside the same item", () => {
    const m = mergeValue(
      { slots: [{ id: "a", mod: "NM", note: "1\n2\n3\n" }] },
      { slots: [{ id: "a", mod: "HD", note: "one\n2\n3\n" }] },
      { slots: [{ id: "a", mod: "NM", note: "1\n2\nthree\n" }] },
      codec,
    );
    expect(m).toEqual({
      clean: true,
      value: { slots: [{ id: "a", mod: "HD", note: "one\n2\nthree\n" }] },
      conflicts: [],
    });
  });

  it("keeps an edited item another side removed", () => {
    const m = mergeValue(
      { slots: [{ id: "a", mod: "NM" }] },
      { slots: [] },
      { slots: [{ id: "a", mod: "HD" }] },
      codec,
    );
    expect(m.value.slots).toEqual([{ id: "a", mod: "HD" }]);
    expect(m.conflicts[0]).toMatchObject({ kind: "remove-edit", path: "slots[a]" });
  });

  it("takes the order of the only side that reordered; adds follow their own neighbour", () => {
    expect(
      ids(mergeValue(s("a", "b", "c"), s("c", "a", "b"), s("a", "b", "c", "d"), codec).value),
    ).toEqual(["c", "d", "a", "b"]);
    expect(ids(mergeValue(s("a", "b"), s("a", "b", "x"), s("b", "a"), codec).value)).toEqual([
      "b",
      "x",
      "a",
    ]);
  });

  it("agrees when both sides made the same reorder", () => {
    const m = mergeValue(s("a", "b"), s("b", "a"), s("b", "a"), codec);
    expect(m.clean).toBe(true);
  });

  it("conflicts when both reordered differently, keeping ours", () => {
    const m = mergeValue(s("a", "b", "c"), s("c", "b", "a"), s("b", "a", "c", "z"), codec);
    expect(ids(m.value)).toEqual(["c", "z", "b", "a"]);
    expect(m.conflicts).toEqual([
      {
        path: "slots",
        segments: ["slots"],
        kind: "order",
        base: ["a", "b", "c"],
        ours: ["c", "b", "a"],
        theirs: ["b", "a", "c"],
      },
    ]);
  });

  it("places both sides' adds at one anchor ours first", () => {
    expect(
      ids(mergeValue(s("a", "b"), s("a", "o1", "o2", "b"), s("a", "t1", "b"), codec).value),
    ).toEqual(["a", "o1", "o2", "t1", "b"]);
    expect(ids(mergeValue(s("a"), s("o", "a"), s("t", "a"), codec).value)).toEqual(["o", "t", "a"]);
  });

  it("treats a changed key as a remove plus an add", () => {
    const m = mergeValue(s("a", "b"), s("A", "b"), s("a", "b"), codec);
    expect(ids(m.value)).toEqual(["A", "b"]);
  });

  it("merges an item both sides added", () => {
    const m = mergeValue(
      { slots: [] },
      { slots: [{ id: "n", mod: "HD" }] },
      { slots: [{ id: "n", note: "x" }] },
      codec,
    );
    expect(m.value.slots).toEqual([{ id: "n", mod: "HD", note: "x" }]);
  });

  it("treats a list where base isn't an array as empty base", () => {
    const m = mergeValue({}, s("a"), s("b"), codec);
    expect(ids(m.value)).toEqual(["a", "b"]);
  });

  it("keeps the properties merge(b,x,b)=x, merge(b,b,x)=x, merge(b,x,x)=x", () => {
    const next = rng(3);
    const random = (): { slots: Slot[] } => {
      const pool = ["a", "b", "c", "d", "e", "f"].filter(() => next() < 0.6);
      pool.sort(() => next() - 0.5);
      return { slots: pool.map((id) => ({ id, mod: next() < 0.5 ? "NM" : "HD" })) };
    };
    for (let i = 0; i < 300; i++) {
      const b = random();
      const x = random();
      expect(mergeValue(b, x, b, codec)).toEqual({ clean: true, value: x, conflicts: [] });
      expect(mergeValue(b, b, x, codec)).toEqual({ clean: true, value: x, conflicts: [] });
      expect(mergeValue(b, x, x, codec)).toEqual({ clean: true, value: x, conflicts: [] });
      const m = mergeValue(b, random(), random(), codec);
      expect(new Set(ids(m.value)).size).toBe(m.value.slots.length);
    }
  });
});
