/**
 * @file tests/hash.test.ts
 * @desc canonicalJson's exact output and refusals, and hashValue against a known SHA-256.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

import { describe, expect, it } from "vitest";
import { VcsError } from "../src/errors.js";
import { canonicalJson, hashValue } from "../src/hash/index.js";

describe("canonicalJson", () => {
  it("sorts keys at every depth and drops undefined properties", () => {
    expect(canonicalJson({ b: 1, a: [{ d: null, c: "x" }], u: undefined })).toBe(
      '{"a":[{"c":"x","d":null}],"b":1}',
    );
  });

  it("writes scalars like JSON", () => {
    expect(canonicalJson('a"b')).toBe('"a\\"b"');
    expect(canonicalJson(true)).toBe("true");
    expect(canonicalJson(-0.5)).toBe("-0.5");
    expect(canonicalJson(null)).toBe("null");
    expect(canonicalJson(Object.create(null))).toBe("{}");
  });

  it("allows the same object twice when it isn't a cycle", () => {
    const shared = { a: 1 };
    expect(canonicalJson([shared, shared])).toBe('[{"a":1},{"a":1}]');
  });

  it.each([
    ["NaN", Number.NaN, "value isn't finite"],
    ["Infinity", { a: { b: Number.POSITIVE_INFINITY } }, "a.b isn't finite"],
    ["a function", { f: () => 1 }, "f is a function"],
    ["undefined", undefined, "value is a undefined"],
    ["a bigint", [1n], "[0] is a bigint"],
    ["a Date", { d: new Date(0) }, "d isn't a plain object"],
    ["a Map", new Map(), "value isn't a plain object"],
    ["undefined in an array", { a: [1, undefined] }, "a[1] is undefined"],
  ])("refuses %s", (_name, value, message) => {
    expect(() => canonicalJson(value)).toThrow(message);
    try {
      canonicalJson(value);
    } catch (error) {
      expect(error).toBeInstanceOf(VcsError);
      expect((error as VcsError).code).toBe("not-json");
      expect((error as VcsError).name).toBe("VcsError");
    }
  });

  it("refuses cycles", () => {
    const a: Record<string, unknown> = {};
    a.self = a;
    expect(() => canonicalJson(a)).toThrow("self is a cycle");
    const list: unknown[] = [];
    list.push(list);
    expect(() => canonicalJson(list)).toThrow("[0] is a cycle");
  });
});

describe("hashValue", () => {
  it("is SHA-256 of the canonical form", async () => {
    // sha256("{}")
    expect(await hashValue({})).toBe(
      "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
    );
  });

  it("ignores key order", async () => {
    expect(await hashValue({ a: 1, b: [2] })).toBe(await hashValue({ b: [2], a: 1 }));
    expect(await hashValue({ a: 1 })).not.toBe(await hashValue({ a: 2 }));
  });
});
