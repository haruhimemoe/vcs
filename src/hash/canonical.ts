/**
 * @file src/hash/canonical.ts
 * @desc canonicalJson: one exact string per JSON value (sorted keys, no whitespace), so equal
 *       documents hash equal however their keys were ordered. Anything that isn't plain JSON
 *       throws instead of being quietly changed the way JSON.stringify would.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

import { VcsError } from "../errors.js";

const isPlainObject = (value: object): boolean => {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const write = (value: unknown, path: string, seen: Set<object>): string => {
  if (value === null) return "null";
  switch (typeof value) {
    case "string":
    case "boolean":
      return JSON.stringify(value);
    case "number":
      if (!Number.isFinite(value))
        throw new VcsError("not-json", `${path || "value"} isn't finite`);
      return JSON.stringify(value);
    case "object":
      break;
    default:
      throw new VcsError("not-json", `${path || "value"} is a ${typeof value}`);
  }
  if (seen.has(value)) throw new VcsError("not-json", `${path || "value"} is a cycle`);
  seen.add(value);
  let out: string;
  if (Array.isArray(value)) {
    out = `[${value
      .map((item, index) => {
        if (item === undefined) throw new VcsError("not-json", `${path}[${index}] is undefined`);
        return write(item, `${path}[${index}]`, seen);
      })
      .join(",")}]`;
  } else {
    if (!isPlainObject(value))
      throw new VcsError("not-json", `${path || "value"} isn't a plain object`);
    const record = value as Record<string, unknown>;
    out = `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${write(record[key], path ? `${path}.${key}` : key, seen)}`,
      )
      .join(",")}}`;
  }
  seen.delete(value);
  return out;
};

/**
 * @function canonicalJson
 * @param value {unknown} a JSON value: plain objects, arrays, strings, finite numbers, booleans, null
 * @returns {string} its canonical form: object keys sorted, undefined properties dropped, no spaces
 * @throws {VcsError} `not-json` for anything else (functions, NaN, Infinity, Dates, class
 *         instances, undefined in an array, cycles), naming where it is
 */
export const canonicalJson = (value: unknown): string => write(value, "", new Set());
