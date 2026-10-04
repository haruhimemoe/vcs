# @haruhimemoe/vcs

Diffs and 3-way merges for text and JSON documents, plus canonical hashing. Line diffs, diff3 text merges, and JSON merges that know which arrays are keyed lists, which strings are text and which fields to ignore. No dependencies. ESM for Node 22.12+, Bun, Deno, browsers and bundlers.

It's the history layer behind the haruhime.moe tools: a save sends the revision it started from, and the server merges it onto whatever landed in between.

## Install

```sh
bun add @haruhimemoe/vcs
npm install @haruhimemoe/vcs
deno add npm:@haruhimemoe/vcs
```

## Quick start

```ts
import { defineCodec, diffValue, mergeValue } from "@haruhimemoe/vcs";

const pool = defineCodec({
  lists: { slots: (slot) => slot.id },
  text: ["notes"],
  ignore: ["updatedAt"],
});

const base = { notes: "warmup\n", slots: [{ id: "NM1", mod: "NM" }] };
const ours = { notes: "warmup\nround 1\n", slots: [{ id: "NM1", mod: "NM" }, { id: "HD1", mod: "HD" }] };
const theirs = { notes: "warmup\n", slots: [{ id: "NM1", mod: "NF" }] };

const merged = mergeValue(base, ours, theirs, pool);
// merged.clean === true
// merged.value.slots: NM1 with mod "NF", then HD1

diffValue(base, merged.value, pool);
// [{ op: "add", path: "slots", key: "HD1", ... },
//  { op: "set", path: "slots[NM1].mod", from: "NM", to: "NF" },
//  { op: "text", path: "notes", diff: [...] }]
```

## API

### `@haruhimemoe/vcs/text`

| Export | Does |
| --- | --- |
| `diffText(a, b, { maxEdits? })` | Line diff: `{ op: "equal" \| "delete" \| "insert", lines }[]`. Lines keep their `\n`. Past `maxEdits` (default 2000) changed lines, the differing middle is one delete and one insert. |
| `diffChars(a, b, { maxEdits? })` | The same by code point: `{ op, text }[]`. For highlighting inside a changed line. |
| `applyTextDiff(a, diff)` | Replays a line diff. Throws `VcsError` `diff-mismatch` when `a` isn't the text the diff was made from. |
| `mergeText(base, ours, theirs, { maxEdits? })` | diff3 by line: `{ clean, chunks, text }`. Chunks are `{ ok }` or `{ conflict: { base, ours, theirs } }`. `text` keeps ours inside conflicts. |

Two edits merge cleanly when at least one unchanged line separates them. Edits that overlap or touch conflict, unless both sides made the same change.

### `@haruhimemoe/vcs/json`

| Export | Does |
| --- | --- |
| `defineCodec({ lists?, text?, ignore? })` | Says how to treat paths. Throws `bad-codec` for a bad pattern. |
| `diffValue(a, b, codec?)` | `Change[]` in document order: `set`, `add`, `remove`, `move`, `text`. |
| `mergeValue(base, ours, theirs, codec?)` | `{ clean, value, conflicts }`. |
| `withoutIgnored(value, codec?)` | A copy without the ignored paths, for hashing. |

**Paths.** Object keys joined by `.`, with `[]` stepping into the items of a keyed list: `slots[].note`. A pattern may only step into a list declared in `lists`. The root is `""`, and its items are `[]`.

**Keyed lists** match items by the string the key function returns. A missing, non-string or repeated key throws `bad-key`. Arrays not in `lists` are one value. Changing an item's key is a remove plus an add.

**Merge rules.** A side that didn't change takes the other side. Identical changes agree. Where both sides changed differently:

- text paths merge by line (`kind: "text"` conflicts carry the chunks)
- objects merge key by key
- keyed lists merge item by item. The relative order of items present in all three versions follows the side that reordered them; if both did, differently, it's an `order` conflict and ours wins. Other items go right after their nearest earlier neighbour on their own side, with ours placed before theirs.
- a key or item removed on one side and edited on the other is a `remove-edit` conflict, and the edit is kept
- anything else is a `value` conflict, and ours is kept
- ignored paths keep ours

Each conflict has `path` (for display, like `slots[NM1].mod`), `segments` (for code: strings and `{ key }`), `kind`, `base`, `ours`, `theirs`.

### `@haruhimemoe/vcs/hash`

| Export | Does |
| --- | --- |
| `canonicalJson(value)` | Sorted keys, no whitespace, `undefined` properties dropped. Throws `not-json` for anything that isn't plain JSON (functions, `NaN`, `Infinity`, `Date`, class instances, `undefined` in arrays, cycles). |
| `hashValue(value)` | `Promise<string>`: hex SHA-256 of `canonicalJson(value)`, through Web Crypto. |

### `@haruhimemoe/vcs`

Everything above, plus:

- `VcsError` with `code`: `"not-json" | "bad-key" | "diff-mismatch" | "bad-codec"`.
- `Revision<T>`, `RevisionMeta`, `RevisionRef`, `RevisionKind` and `REVISION_KINDS`: the revision shapes a store keeps and a history view reads. `createdAt` is an ISO string.

## License

MIT
