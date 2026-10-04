# AGENTS.md

`@haruhimemoe/vcs`: one job. Diff and 3-way merge text and JSON documents, and hash them, so the haruhime.moe tools can keep revision history. Storage lives elsewhere (`@haruhimemoe/next-kit/vcs`). Keep it that way.

## Rules

- **No runtime dependencies.** No network, no DOM, no Node-only APIs in `src/`. Everything runs in browsers and Node. `tests/api.test.ts` checks for `node:` imports, `process` and `Buffer`.
- **Merges never lose the caller's work.** Inside any conflict the merged value keeps ours (or the edited side of a remove-edit). Keep the seeded properties in `tests/merge-text.test.ts` and `tests/merge-value.test.ts` passing: merge(b, x, b) = x, merge(b, b, x) = x, merge(b, x, x) = x.
- **Bounded cost.** Diffs trim shared ends, then run Myers up to `maxEdits`; past it they report one delete and one insert. `tests/performance.test.ts` keeps hostile input fast.
- **Public API is pinned** by `tests/api.test.ts`, per subpath. Adding or removing an export is a semver decision: say so in `CHANGELOG.md`. Keep the README's API section in step with `src/`.
- **Test first.** A behavior change starts as a failing case in the matching test file.
- **Changelog.** A change users can see gets a line under `## [Unreleased]` in `CHANGELOG.md` ([Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/)). Never rewrite a released entry. While on 0.x, a change to merge results or change shapes is a minor version.
- **Releases are cut by the maintainers.** Don't bump the version, tag, push or publish unless a maintainer asks.
- Code style: Biome (2 spaces, double quotes, 100 columns). Every file starts with the `@file / @desc / @author / @created / @modified` header. Functions exported from a file in `src/` get a JSDoc block with `@function`, `@param` and `@returns` (and `@throws`). Keep files under 250 lines (`tests/api.test.ts` checks).
- Imports inside `src/` use `.js` extensions (Node ESM).
- Docs are for their readers: `README.md` for users, `CONTRIBUTING.md` for contributors, this file for agents. No maintainer notes in any of them.

## Layout

| Path | What's there |
| --- | --- |
| `src/index.ts` | The root exports: every subpath, `VcsError`, the revision types. |
| `src/errors.ts` | `VcsError` and its codes. |
| `src/revision.ts` | `Revision`, `RevisionMeta`, `RevisionRef`, `RevisionKind`, `REVISION_KINDS`. |
| `src/hash/` | `./hash`: `canonical.ts` (`canonicalJson`), `index.ts` (`hashValue`). |
| `src/text/` | `./text`: `myers.ts` (the generic edit script, internal), `lines.ts`, `diff.ts` (`diffText`, `diffChars`, `applyTextDiff`), `merge.ts` (`mergeText`, diff3). |
| `src/json/` | `./json`: `codec.ts` (`defineCodec`, path patterns), `values.ts` (equality, keyed indexing, paths), `lcs.ts`, `diff.ts` (`diffValue`), `merge.ts` (`mergeValue`, objects, remove-edit), `merge-list.ts` (keyed lists, order, placement), `strip.ts` (`withoutIgnored`), `types.ts`. |
| `tests/` | Vitest: `hash`, `text`, `merge-text`, `codec`, `diff-value`, `merge-value`, `api`, `performance`; `rng.ts` is the seeded generator. |
| `scripts/smoke.mjs` | Imports the built package through its exports map (`bun run test:dist`). |
| `scripts/check-consumer.mjs` | Packs the package, installs it in a temp project, then typechecks and runs a strict consumer (`bun run check:consumer`). |
| `.github/workflows/` | `ci.yml` (checks, coverage, dist on Node 22.12 and 24, consumer) and `release.yml` (publishes on a GitHub release). |

## Before calling a change done

```sh
bun run check && bun run typecheck && bun run test && bun run test:dist
```

CI also runs `bun run test:coverage` (95% floor on `src/`) and `bun run check:consumer`.
