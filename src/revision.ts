/**
 * @file src/revision.ts
 * @desc The revision shapes a store keeps and a history view reads. History is one line per
 *       document, ordered by `seq`. Dates are ISO strings so revisions survive JSON.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

/** How a revision came to be. */
export type RevisionKind = "root" | "save" | "autosave" | "merge" | "revert" | "fork" | "pull";

/** Every revision kind, in a stable order. */
export const REVISION_KINDS: readonly RevisionKind[] = Object.freeze([
  "root",
  "save",
  "autosave",
  "merge",
  "revert",
  "fork",
  "pull",
]);

/** A revision without its value: what a history list shows. */
export type RevisionMeta = {
  id: string;
  docId: string;
  /** 0 for the root, then one more per revision. */
  seq: number;
  kind: RevisionKind;
  /** hashValue of the value without the codec's ignored paths. */
  valueHash: string;
  authorId: string;
  authorName: string;
  message: string | null;
  /** ISO 8601. */
  createdAt: string;
  /** merge: the revision the save was based on. revert: the revision restored. */
  base?: string;
  /** fork root: where the fork came from. */
  forkOf?: { docId: string; revisionId: string };
  /** pull: the upstream revision merged in. */
  upstream?: string;
};

/** A revision with the document's value at that point. */
export type Revision<T> = RevisionMeta & { value: T };

/** The part of a revision a client sends back as the base of its next save. */
export type RevisionRef = Pick<RevisionMeta, "id" | "seq">;
