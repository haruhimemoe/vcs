/**
 * @file src/index.ts
 * @desc @haruhimemoe/vcs: everything from ./text, ./json and ./hash, plus VcsError and the
 *       revision shapes.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

export { VcsError, type VcsErrorCode } from "./errors.js";
export { canonicalJson, hashValue } from "./hash/index.js";
export * from "./json/index.js";
export {
  REVISION_KINDS,
  type Revision,
  type RevisionKind,
  type RevisionMeta,
  type RevisionRef,
} from "./revision.js";
export * from "./text/index.js";
