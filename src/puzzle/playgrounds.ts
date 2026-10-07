import { levels } from "./levels";
import { type Puzzle, type Cell, type Piece, slots, solved } from "./model";
export const playgrounds = [
  { title: "The colonnade", description: "Two ideas, four crossings." },
  { title: "The crossroads", description: "Numbers and symbols meet." },
  { title: "The gateway", description: "A frame for a curious mind." },
  { title: "The courtyard", description: "Balance around every corner." },
  { title: "The inscription", description: "Follow the shared signs." },
  { title: "The stairway", description: "Small steps, close connections." },
];
export interface Run {
  playground: number;
  rank?: number;
  round: number;
  seed: number;
}
export function randomFrom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle<T>(a: T[], random: () => number) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// Build equations directly, without a fixed inventory or a saved answer. Shared
// cells are constraints; the resulting physical inventory is collected once.
export function generateRound(run: Run): { puzzle: Puzzle; answer: Cell[] } {
  if (
    !Number.isInteger(run.playground) ||
    run.playground < 0 ||
    run.playground >= levels.length ||
    !Number.isSafeInteger(run.round) ||
    run.round < 1 ||
    !Number.isInteger(run.seed)
  )
    throw new Error("Invalid playground or round.");
  const template = levels[run.playground],
    ss = slots(template);
  const random = randomFrom(
    (run.seed ^
      Math.imul(run.round, 0x9e3779b1) ^
      Math.imul(run.playground + 1, 0x85ebca6b)) >>>
      0,
  );
  const tuples: Piece[][] = [];
  const max = 12 + Math.floor(random() * 17);
  for (let a = 2; a <= max; a++)
    for (let b = 2; b <= max; b++)
      for (const op of ["+", "-", "*", "/"] as const) {
        const c =
          op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : a / b;
        if (!Number.isInteger(c) || c < 2 || c > max || c === a || c === b)
          continue;
        tuples.push([a, op, b, "=", c], [c, "=", a, op, b]);
      }
  shuffle(tuples, random);
  const board: Cell[] = Array(template.mask.length).fill(null);
  function fill(pending: number[]): boolean {
    if (!pending.length) return true;
    let index = -1,
      candidates: Piece[][] = [];
    for (const n of pending) {
      const domain = tuples.filter((t) =>
        ss[n].cells.every((id, i) => board[id] === null || board[id] === t[i]),
      );
      if (!domain.length) return false;
      if (index < 0 || domain.length < candidates.length) {
        index = n;
        candidates = domain;
      }
    }
    for (const t of candidates) {
      const changed: number[] = [];
      ss[index].cells.forEach((id, i) => {
        if (board[id] === null) {
          board[id] = t[i];
          changed.push(id);
        }
      });
      if (fill(pending.filter((n) => n !== index))) return true;
      changed.forEach((id) => {
        board[id] = null;
      });
    }
    return false;
  }
  if (!fill(ss.map((_, i) => i)))
    throw new Error("Could not construct this playground.");
  const puzzle = {
    ...template,
    mask: [...template.mask],
    pieces: shuffle(
      board.filter((v): v is Piece => v !== null),
      random,
    ),
  };
  if (!solved(puzzle, board))
    throw new Error("Generated puzzle failed validation.");
  return { puzzle, answer: board };
}
