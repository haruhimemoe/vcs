/**
 * @file tests/rng.ts
 * @desc A seeded PRNG (mulberry32) and random-text helpers, so property tests repeat exactly.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

/** A seeded generator returning floats in [0, 1). */
export const rng = (seed: number): (() => number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Random lines from a small alphabet, so diffs share lines often. */
export const randomLines = (next: () => number, count: number): string[] =>
  Array.from({ length: count }, () => `${"abcde"[Math.floor(next() * 5)]}\n`);

/** Mutates lines at random: deletes, inserts and replacements. */
export const mutate = (next: () => number, lines: string[], edits: number): string[] => {
  const out = [...lines];
  for (let i = 0; i < edits; i++) {
    const at = Math.floor(next() * (out.length + 1));
    const roll = next();
    const line = `${"vwxyz"[Math.floor(next() * 5)]}\n`;
    if (roll < 0.33 && out.length > 0) out.splice(Math.min(at, out.length - 1), 1);
    else if (roll < 0.66) out.splice(at, 0, line);
    else if (out.length > 0) out[Math.min(at, out.length - 1)] = line;
  }
  return out;
};
