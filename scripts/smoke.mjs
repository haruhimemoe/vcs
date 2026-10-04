/**
 * @file scripts/smoke.mjs
 * @desc Imports the built package through its own exports map, the way Node consumers will
 *       (every subpath), and checks one result per subpath. Run by `bun run test:dist`.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";

const { mergeValue, defineCodec, VcsError, REVISION_KINDS } = await import("@haruhimemoe/vcs");
const { diffText, mergeText } = await import("@haruhimemoe/vcs/text");
const { diffValue } = await import("@haruhimemoe/vcs/json");
const { hashValue, canonicalJson } = await import("@haruhimemoe/vcs/hash");

assert.equal(mergeText("a\nb\nc\n", "A\nb\nc\n", "a\nb\nC\n").text, "A\nb\nC\n");
assert.equal(diffText("a\n", "b\n").length, 2);
const codec = defineCodec({ lists: { slots: (s) => s.id } });
assert.deepEqual(
  mergeValue({ slots: [] }, { slots: [{ id: "a" }] }, { slots: [{ id: "b" }] }, codec).value,
  {
    slots: [{ id: "a" }, { id: "b" }],
  },
);
assert.equal(diffValue({ a: 1 }, { a: 2 })[0].op, "set");
assert.equal(canonicalJson({ b: 1, a: 2 }), '{"a":2,"b":1}');
assert.equal((await hashValue({})).length, 64);
assert.throws(() => canonicalJson(Number.NaN), VcsError);
assert.equal(REVISION_KINDS.length, 7);
for (const sub of ["index", "text/index", "json/index", "hash/index"]) {
  assert.ok(
    existsSync(new URL(`../dist/${sub}.d.ts`, import.meta.url)),
    `dist/${sub}.d.ts missing`,
  );
}
console.log("smoke: ok");
