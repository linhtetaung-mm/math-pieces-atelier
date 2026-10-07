import {
  type Puzzle,
  type Piece,
  type Cell,
  type Slot,
  validate,
  counts,
  key,
  solved,
} from "./model";
export interface Result {
  status: "solved" | "impossible" | "timeout" | "invalid";
  solutions: Cell[][];
  states: number;
  elapsed: number;
  message: string;
  exhaustive: boolean;
}
export function solve(
  p: Puzzle,
  initial: Cell[] = Array(p.mask.length).fill(null),
  budget = 10000,
  limit = 2,
): Result {
  const start = performance.now();
  let states = 0,
    timedOut = false;
  const solutions: Cell[][] = [];
  const finish = (
    status: Result["status"],
    message: string,
    exhaustive = false,
  ): Result => ({
    status,
    message,
    solutions,
    states,
    elapsed: performance.now() - start,
    exhaustive,
  });
  let ss: Slot[];
  try {
    ss = validate(p, initial);
  } catch (e) {
    return finish("invalid", (e as Error).message);
  }
  const board = [...initial],
    pool = counts(p.pieces),
    total = counts(p.pieces);
  for (const v of board)
    if (v !== null) pool.set(key(v), pool.get(key(v))! - 1);
  const expired = () => {
    if (performance.now() - start >= budget) {
      timedOut = true;
      return true;
    }
    return false;
  };
  if (expired())
    return finish(
      "timeout",
      "Search time limit reached. No impossibility claim.",
    );
  const nums = [
    ...new Set(p.pieces.filter((x): x is number => typeof x === "number")),
  ];
  const ops = [
    ...new Set(p.pieces.filter((x) => typeof x !== "number" && x !== "=")),
  ];
  const numSet = new Set(nums),
    tuples: Piece[][] = [];
  for (const a of nums)
    for (const b of nums) {
      if (expired())
        return finish(
          "timeout",
          "Time limit reached while building equation candidates.",
        );
      for (const op of ops) {
        const c =
          op === "+"
            ? a + b
            : op === "-"
              ? a - b
              : op === "*"
                ? a * b
                : b === 0
                  ? NaN
                  : a / b;
        if (!Number.isSafeInteger(c) || !numSet.has(c)) continue;
        const tuple: Piece[] = [a, op, b, "=", c];
        const needed = counts(tuple);
        if ([...needed].some(([k, n]) => n > (total.get(k) || 0))) continue;
        tuples.push(tuple, [c, "=", a, op, b]);
      }
    }
  const domains = ss.map((s) =>
    tuples.filter((t) =>
      s.cells.every((id, i) => board[id] === null || board[id] === t[i]),
    ),
  );
  function fits(cells: number[], t: Piece[]): boolean {
    const used = new Map<string, number>();
    for (let i = 0; i < 5; i++) {
      if (board[cells[i]] !== null) {
        if (board[cells[i]] !== t[i]) return false;
      } else {
        const k = key(t[i]),
          n = (used.get(k) || 0) + 1;
        if (n > (pool.get(k) || 0)) return false;
        used.set(k, n);
      }
    }
    return true;
  }
  function search(pending: number[], ds: Piece[][][]) {
    states++;
    if (expired()) return;
    if (!pending.length) {
      if (solved(p, board)) solutions.push([...board]);
      return;
    }
    let choice = -1,
      best: Piece[][] = [],
      filtered: Piece[][][] = [...ds];
    for (const index of pending) {
      const candidates = ds[index].filter((t) => fits(ss[index].cells, t));
      if (!candidates.length) return;
      filtered[index] = candidates;
      if (choice < 0 || candidates.length < best.length) {
        choice = index;
        best = candidates;
      }
      if (expired()) return;
    }
    const cells = ss[choice].cells;
    for (const t of best) {
      const changed: number[] = [];
      cells.forEach((id, i) => {
        if (board[id] === null) {
          board[id] = t[i];
          pool.set(key(t[i]), pool.get(key(t[i]))! - 1);
          changed.push(id);
        }
      });
      search(
        pending.filter((i) => i !== choice),
        filtered,
      );
      for (const id of changed) {
        const v = board[id]!;
        pool.set(key(v), pool.get(key(v))! + 1);
        board[id] = null;
      }
      if (timedOut || solutions.length >= limit) return;
    }
  }
  search(
    ss.map((_, i) => i),
    domains,
  );
  if (solutions.length)
    return finish(
      "solved",
      solutions.length > 1
        ? "Multiple arrangements found. Both satisfy every equation."
        : timedOut
          ? "A valid arrangement found; uniqueness remains unknown (time limit)."
          : limit === 1
            ? "A valid arrangement found. Uniqueness was not checked."
            : "One arrangement found; the remaining search is exhausted.",
      !timedOut && solutions.length < limit,
    );
  return timedOut
    ? finish(
        "timeout",
        "Search time limit reached. This does not mean the puzzle is impossible.",
      )
    : finish(
        "impossible",
        "No arrangement satisfies these pieces and placements.",
        true,
      );
}
