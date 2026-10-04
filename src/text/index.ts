/**
 * @file src/text/index.ts
 * @desc @haruhimemoe/vcs/text: line diffs, character diffs, replaying a diff, and diff3 merges.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

export {
  applyTextDiff,
  type CharDiffRun,
  type DiffOptions,
  diffChars,
  diffText,
  type TextDiff,
  type TextDiffRun,
  type TextOp,
} from "./diff.js";
export { mergeText, type TextChunk, type TextConflict, type TextMerge } from "./merge.js";
