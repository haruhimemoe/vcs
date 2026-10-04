/**
 * @file src/text/lines.ts
 * @desc splitLines: text to lines that keep their own "\n", so joining them gives the text back
 *       exactly ("\r\n" and a missing final newline survive). Internal.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

const LINE = /[^\n]*\n|[^\n]+$/g;

/**
 * @function splitLines
 * @param text {string} any text
 * @returns {string[]} its lines, each ending in "\n" except a last line without one ("" gives [])
 */
export const splitLines = (text: string): string[] => text.match(LINE) ?? [];
