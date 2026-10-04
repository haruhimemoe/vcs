/**
 * @file tests/codec.test.ts
 * @desc defineCodec: accepted patterns and every bad-codec refusal; withoutIgnored.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

import { describe, expect, it } from "vitest";
import { defineCodec, withoutIgnored } from "../src/json/index.js";

const id = (x: { id: string }): string => x.id;

describe("defineCodec", () => {
  it("accepts lists, nested lists, text and ignore", () => {
    const codec = defineCodec({
      lists: { slots: id, buckets: id, "buckets[].maps": id },
      text: ["notes", "slots[].note"],
      ignore: ["updatedAt"],
    });
    expect([...codec.lists.keys()]).toEqual(["slots", "buckets", "buckets.[].maps"]);
    expect([...codec.text]).toEqual(["notes", "slots.[].note"]);
    expect(Object.isFrozen(codec)).toBe(true);
    expect(defineCodec({ lists: { "": id }, text: ["[].body"] }).text.has("[].body")).toBe(true);
  });

  it.each([
    [{ text: ["a..b"] }, '"a..b" isn\'t a valid path pattern'],
    [{ text: ["a[]b"] }, "isn't a valid path pattern"],
    [{ text: ["slots[].note"] }, 'steps into "slots", which isn\'t in lists'],
    [{ lists: { "buckets[].maps": id } }, 'steps into "buckets"'],
    [{ text: ["[].x"] }, "steps into the root list"],
    [{ lists: { a: "x" as never } }, 'lists["a"] needs a key function'],
    [{ ignore: [""] }, "the root can't be in ignore"],
    [{ text: [""] }, "the root can't be in text"],
    [{ text: ["a"], ignore: ["a"] }, '"a" is in both text and ignore'],
    [{ lists: { a: id }, text: ["a"] }, '"a" is in both lists and text'],
  ])("refuses %j", (spec, message) => {
    expect(() => defineCodec(spec)).toThrow(message);
  });
});

describe("withoutIgnored", () => {
  const codec = defineCodec({ lists: { slots: id }, ignore: ["updatedAt", "slots[].cache"] });

  it("drops ignored paths, including inside keyed items", () => {
    expect(
      withoutIgnored(
        {
          name: "p",
          updatedAt: 1,
          slots: [{ id: "a", cache: 2, mod: "NM" }],
          other: [{ cache: 1 }],
        },
        codec,
      ),
    ).toEqual({ name: "p", slots: [{ id: "a", mod: "NM" }], other: [{ cache: 1 }] });
  });

  it("returns the value itself when nothing is ignored", () => {
    const value = { a: 1 };
    expect(withoutIgnored(value)).toBe(value);
    expect(withoutIgnored(3, codec)).toBe(3);
  });
});
