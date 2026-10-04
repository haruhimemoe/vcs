/**
 * @file tests/api.test.ts
 * @desc The public surface per subpath (an added or removed export is a visible semver
 *       question), the exports map, and that src/ stays browser-safe and small.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as hash from "../src/hash/index.js";
import * as root from "../src/index.js";
import * as json from "../src/json/index.js";
import * as text from "../src/text/index.js";

const TEXT = ["applyTextDiff", "diffChars", "diffText", "mergeText"];
const JSON_ = ["defineCodec", "diffValue", "mergeValue", "withoutIgnored"];
const HASH = ["canonicalJson", "hashValue"];

describe("exports", () => {
  it.each([
    [".", root, [...TEXT, ...JSON_, ...HASH, "REVISION_KINDS", "VcsError"]],
    ["./text", text, TEXT],
    ["./json", json, JSON_],
    ["./hash", hash, HASH],
  ])("%s exports exactly its API", (_path, mod, names) => {
    expect(Object.keys(mod).sort()).toEqual([...names].sort());
  });

  it("maps every subpath in package.json", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(Object.keys(pkg.exports)).toEqual([".", "./text", "./json", "./hash", "./package.json"]);
    expect(pkg.dependencies).toBeUndefined();
  });

  it("lists every revision kind", () => {
    expect(root.REVISION_KINDS).toEqual([
      "root",
      "save",
      "autosave",
      "merge",
      "revert",
      "fork",
      "pull",
    ]);
    expect(Object.isFrozen(root.REVISION_KINDS)).toBe(true);
  });
});

describe("src", () => {
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
    );

  it.each(files("src"))("%s is browser-safe, headed and under 250 lines", (file) => {
    const source = readFileSync(file, "utf8");
    expect(source).not.toMatch(/from "node:|require\(|process\.|Buffer\b/);
    expect(source.startsWith(`/**\n * @file ${file}\n`)).toBe(true);
    expect(source.split("\n").length).toBeLessThan(250);
  });
});
