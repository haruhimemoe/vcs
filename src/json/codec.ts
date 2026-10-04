/**
 * @file src/json/codec.ts
 * @desc defineCodec: how diffValue and mergeValue treat paths in a document. Patterns are object
 *       keys joined by ".", with "[]" stepping into the items of a keyed list ("slots[].note").
 *       A pattern may only step into a list that is itself declared in `lists`. Internal patterns
 *       are normalized to "slots.[].note"; the root is "".
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

import { VcsError } from "../errors.js";

// biome-ignore lint/suspicious/noExplicitAny: items are whatever the document holds
type KeyOf = (item: any) => unknown;

/** What a codec says about a document's paths. */
export type CodecSpec = {
  /** Keyed lists: pattern to a function giving each item's key (a unique string). */
  lists?: Record<string, KeyOf>;
  /** Strings diffed and merged line by line. */
  text?: string[];
  /** Left out of diffs and hashes; a merge keeps ours. */
  ignore?: string[];
};

/** A checked codec, made by defineCodec. */
export type Codec = {
  readonly lists: ReadonlyMap<string, KeyOf>;
  readonly text: ReadonlySet<string>;
  readonly ignore: ReadonlySet<string>;
};

const SEGMENT = /^(?:[^.[\]]+(?:\[\])?|\[\])$/;

/** "slots[].note" to "slots.[].note"; "" stays "". */
const normalize = (pattern: string): string => {
  if (pattern === "") return "";
  const parts = pattern.split(".");
  if (!parts.every((part) => SEGMENT.test(part)))
    throw new VcsError("bad-codec", `"${pattern}" isn't a valid path pattern`);
  return parts
    .map((part) => (part !== "[]" && part.endsWith("[]") ? `${part.slice(0, -2)}.[]` : part))
    .join(".");
};

/** Every list a pattern steps into must be declared. */
const checkSteps = (pattern: string, lists: ReadonlyMap<string, KeyOf>, original: string): void => {
  let at = pattern.indexOf(".[]");
  while (at !== -1) {
    const list = pattern.slice(0, at);
    if (!lists.has(list))
      throw new VcsError("bad-codec", `"${original}" steps into "${list}", which isn't in lists`);
    at = pattern.indexOf(".[]", at + 3);
  }
  if (pattern === "[]" || pattern.startsWith("[]."))
    if (!lists.has("")) throw new VcsError("bad-codec", `"${original}" steps into the root list`);
};

/**
 * @function defineCodec
 * @param spec {CodecSpec} lists, text and ignore patterns
 * @returns {Codec} the checked codec
 * @throws {VcsError} `bad-codec` for a malformed pattern, a pattern stepping into a list that
 *         isn't declared, a list without a key function, a pattern listed twice, or the root
 *         in text or ignore
 */
export const defineCodec = (spec: CodecSpec): Codec => {
  const lists = new Map<string, KeyOf>();
  for (const [pattern, keyOf] of Object.entries(spec.lists ?? {})) {
    if (typeof keyOf !== "function")
      throw new VcsError("bad-codec", `lists["${pattern}"] needs a key function`);
    lists.set(normalize(pattern), keyOf);
  }
  const all = new Map<string, string>([...lists.keys()].map((p) => [p, "lists"]));
  const collect = (patterns: string[] | undefined, kind: string): Set<string> => {
    const out = new Set<string>();
    for (const original of patterns ?? []) {
      if (original === "") throw new VcsError("bad-codec", `the root can't be in ${kind}`);
      const pattern = normalize(original);
      if (all.has(pattern))
        throw new VcsError("bad-codec", `"${original}" is in both ${all.get(pattern)} and ${kind}`);
      all.set(pattern, kind);
      out.add(pattern);
    }
    return out;
  };
  const text = collect(spec.text, "text");
  const ignore = collect(spec.ignore, "ignore");
  for (const [pattern] of all) {
    const original = pattern.replaceAll(".[]", "[]");
    checkSteps(pattern, lists, original);
  }
  return Object.freeze({ lists, text, ignore });
};

/** The codec used when none is given: no lists, no text, nothing ignored. */
export const EMPTY_CODEC: Codec = defineCodec({});

/** The pattern one step down from `pattern`. */
export const child = (pattern: string, step: string): string =>
  pattern === "" ? step : `${pattern}.${step}`;
