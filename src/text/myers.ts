/**
 * @file src/text/myers.ts
 * @desc Myers' O((N+M)D) shortest edit script over any two sequences, after trimming the common
 *       prefix and suffix. Past `maxEdits` it gives up and reports one delete plus one insert, so
 *       hostile input costs O(maxEdits^2) at worst instead of O(N*M). Internal.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 4, 2026
 * @modified Sun Oct 4, 2026
 */

/** One run of the edit script. */
export type Run<T> = { op: "equal" | "delete" | "insert"; items: T[] };

/** The default edit distance past which a diff gives up and replaces everything that differs. */
export const DEFAULT_MAX_EDITS = 2000;

const push = <T>(runs: Run<T>[], op: Run<T>["op"], items: T[]): void => {
  if (items.length === 0) return;
  const last = runs.at(-1);
  if (last?.op === op) last.items.push(...items);
  else runs.push({ op, items: [...items] });
};

/** Edit script for the middle part (no shared prefix or suffix), or null past maxEdits. */
const middle = <T>(a: T[], b: T[], max: number): Run<T>[] | null => {
  const n = a.length;
  const m = b.length;
  const offset = n + m;
  const v = new Int32Array(2 * offset + 2);
  const trace: Int32Array[] = [];
  for (let d = 0; d <= n + m; d++) {
    if (d > max) return null;
    trace.push(v.slice(offset - d, offset + d + 2));
    for (let k = -d; k <= d; k += 2) {
      const down = k === -d || (k !== d && (v[offset + k - 1] ?? 0) < (v[offset + k + 1] ?? 0));
      let x = down ? (v[offset + k + 1] ?? 0) : (v[offset + k - 1] ?? 0) + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) return backtrack(a, b, trace, d);
    }
  }
  /* c8 ignore next */
  return null;
};

const backtrack = <T>(a: T[], b: T[], trace: Int32Array[], last: number): Run<T>[] => {
  const steps: Run<T>[] = [];
  let x = a.length;
  let y = b.length;
  for (let d = last; d > 0; d--) {
    // trace[d] holds V as it was before step d, indexed from k = -d.
    const v = trace[d] as Int32Array;
    const at = (k: number): number => v[k + d] ?? 0;
    const k = x - y;
    const down = k === -d || (k !== d && at(k - 1) < at(k + 1));
    const prevK = down ? k + 1 : k - 1;
    const prevX = at(prevK);
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      steps.push({ op: "equal", items: [a[--x] as T] });
      y--;
    }
    if (down) steps.push({ op: "insert", items: [b[--y] as T] });
    else steps.push({ op: "delete", items: [a[--x] as T] });
  }
  while (x > 0 && y > 0) {
    steps.push({ op: "equal", items: [a[--x] as T] });
    y--;
  }
  const runs: Run<T>[] = [];
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i] as Run<T>;
    push(runs, step.op, step.items);
  }
  return runs;
};

/**
 * @function myers
 * @param a {T[]} the old sequence (items compared with ===)
 * @param b {T[]} the new sequence
 * @param maxEdits {number} give up past this many inserted plus deleted items
 * @returns {Run<T>[]} equal, delete and insert runs that turn a into b; deletes come before
 *          inserts where both sit at one place, and adjacent runs never share an op
 */
export const myers = <T>(a: T[], b: T[], maxEdits = DEFAULT_MAX_EDITS): Run<T>[] => {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const runs: Run<T>[] = [];
  push(runs, "equal", a.slice(0, start));
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const mid = middle(midA, midB, maxEdits) ?? [
    { op: "delete" as const, items: midA },
    { op: "insert" as const, items: midB },
  ];
  for (const run of normalize(mid)) push(runs, run.op, run.items);
  push(runs, "equal", a.slice(endA));
  return runs;
};

/** Within each stretch between equal runs, put all deletes before all inserts. */
const normalize = <T>(runs: Run<T>[]): Run<T>[] => {
  const out: Run<T>[] = [];
  let deleted: T[] = [];
  let inserted: T[] = [];
  const flush = (): void => {
    push(out, "delete", deleted);
    push(out, "insert", inserted);
    deleted = [];
    inserted = [];
  };
  for (const run of runs) {
    if (run.op === "equal") {
      flush();
      push(out, "equal", run.items);
    } else if (run.op === "delete") deleted.push(...run.items);
    else inserted.push(...run.items);
  }
  flush();
  return out;
};
