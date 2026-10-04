/**
 * @file src/errors.ts
 * @desc VcsError: the one error class the package throws, with a code callers can switch on.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

/** Why a call refused its input. */
export type VcsErrorCode = "not-json" | "bad-key" | "diff-mismatch" | "bad-codec";

/** Thrown for input the package can't work with. `code` says which kind. */
export class VcsError extends Error {
  readonly code: VcsErrorCode;

  constructor(code: VcsErrorCode, message: string) {
    super(message);
    this.name = "VcsError";
    this.code = code;
  }
}
