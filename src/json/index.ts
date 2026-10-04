/**
 * @file src/json/index.ts
 * @desc @haruhimemoe/vcs/json: codecs, diffs and 3-way merges of JSON documents, and
 *       withoutIgnored for hashing what a diff would see.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

export { type Codec, type CodecSpec, defineCodec } from "./codec.js";
export { diffValue } from "./diff.js";
export { mergeValue } from "./merge.js";
export { withoutIgnored } from "./strip.js";
export type {
  Change,
  Conflict,
  ConflictKind,
  Located,
  Segment,
  ValueMerge,
} from "./types.js";
