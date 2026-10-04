/**
 * @file scripts/check-consumer.mjs
 * @desc Installs the packed package into a throwaway project, then typechecks a consumer strictly
 *       (no skipLibCheck, so a broken .d.ts can't hide as `any`) and runs it. No dependencies
 *       here, so there's no version matrix: usage is `node scripts/check-consumer.mjs` (after
 *       `bun run build`). Needs the npm registry.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const dir = mkdtempSync(path.join(tmpdir(), "vcs-consumer-"));
const run = (command, args, cwd = dir) =>
  execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

try {
  const tarball = run("npm", ["pack", "--silent", "--pack-destination", dir], root).trim();
  writeFileSync(path.join(dir, "package.json"), JSON.stringify({ type: "module", private: true }));
  run("npm", ["install", "--silent", "--no-audit", "--no-fund", path.join(dir, tarball)]);
  writeFileSync(
    path.join(dir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        exactOptionalPropertyTypes: true,
        noEmit: true,
        skipLibCheck: false,
        module: "nodenext",
        moduleResolution: "nodenext",
        target: "ES2023",
        lib: ["ES2023", "DOM"],
        types: [],
      },
      files: ["consumer.ts"],
    }),
  );
  writeFileSync(
    path.join(dir, "consumer.ts"),
    `import { type Change, type Revision, type ValueMerge, defineCodec, diffValue, mergeValue, VcsError, type VcsErrorCode } from "@haruhimemoe/vcs";
import { mergeText, type TextMerge } from "@haruhimemoe/vcs/text";
import { hashValue } from "@haruhimemoe/vcs/hash";

type Pool = { name: string; slots: { id: string; mod: string }[] };
const codec = defineCodec({ lists: { slots: (s: { id: string }) => s.id } });
const base: Pool = { name: "p", slots: [] };
const merged: ValueMerge<Pool> = mergeValue(base, { ...base, slots: [{ id: "a", mod: "NM" }] }, base, codec);
if (merged.value.slots[0]?.id !== "a") throw new Error("merge");
const changes: Change[] = diffValue(base, merged.value, codec);
if (changes[0]?.op !== "add") throw new Error("diff");
const text: TextMerge = mergeText("a\\n", "b\\n", "a\\n");
if (text.text !== "b\\n") throw new Error("text");
// @ts-expect-error an unknown code must not typecheck (it would if types were any)
const bad: VcsErrorCode = "nonsense";
const rev: Revision<Pool> | null = null;
if ((await hashValue(base)).length !== 64) throw new Error("hash");
void [bad, rev, VcsError];
console.log("consumer: ok");
`,
  );
  run(path.join(root, "node_modules", ".bin", "tsc"), ["-p", dir]);
  run(process.execPath, ["--experimental-strip-types", "--no-warnings", "consumer.ts"]);
  console.log("consumer: ok");
} catch (error) {
  console.error(`consumer: FAILED\n${error.stdout ?? ""}${error.stderr ?? error.message}`);
  process.exitCode = 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
