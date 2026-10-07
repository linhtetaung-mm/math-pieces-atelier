import { type Puzzle, type Piece, type Cell } from "./model";
function level(
  name: string,
  pattern: number[][],
  numbers: number[],
  signs: Piece[],
): Puzzle {
  return {
    name,
    rows: pattern.length,
    cols: pattern[0].length,
    mask: pattern.flat(),
    pieces: [...numbers, ...signs],
  };
}
export const levels = [
  level(
    "The first principles",
    [
      [1, 1, 1, 1, 1],
      [1, 0, 1, 0, 0],
      [1, 1, 1, 1, 1],
      [1, 0, 1, 0, 0],
      [1, 0, 1, 0, 0],
    ],
    [2, 3, 6, 7, 8, 10, 15, 16],
    ["+", "-", "-", "*", "=", "=", "=", "="],
  ),
  level(
    "Intersecting ideas",
    [
      [0, 0, 1, 0, 1, 0],
      [0, 1, 1, 1, 1, 1],
      [0, 0, 1, 0, 1, 0],
      [0, 0, 1, 0, 1, 0],
      [1, 1, 1, 1, 1, 0],
    ],
    [1, 2, 2, 4, 4, 5, 5, 6, 7, 16],
    ["*", "-", "-", "=", "=", "="],
  ),
  level(
    "The marble gateway",
    [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
    ],
    [1, 2, 2, 3, 4, 9, 10, 18],
    ["*", "+", "-", "-", "=", "=", "=", "="],
  ),
  level(
    "A scholar’s balance",
    [
      [0, 0, 0, 0, 1],
      [0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0],
    ],
    [1, 1, 2, 5, 5, 6, 7, 10],
    ["+", "+", "-", "-", "=", "=", "=", "="],
  ),
  level(
    "The missing inscription",
    [
      [0, 0, 0, 0, 1, 0],
      [0, 1, 1, 1, 1, 1],
      [0, 1, 0, 0, 1, 0],
      [0, 1, 0, 0, 1, 0],
      [1, 1, 1, 1, 1, 0],
      [0, 1, 0, 0, 0, 0],
    ],
    [1, 2, 2, 3, 3, 3, 4, 5, 5, 12],
    ["+", "+", "*", "-", "=", "="],
  ),
  level(
    "The final fragment",
    [
      [0, 0, 0, 0, 1, 0],
      [0, 1, 1, 1, 1, 1],
      [0, 1, 0, 0, 1, 0],
      [0, 1, 1, 1, 1, 1],
      [0, 1, 0, 0, 1, 0],
      [0, 1, 0, 0, 0, 0],
    ],
    [2, 2, 4, 4, 6, 7, 12, 14, 16, 18],
    ["+", "*", "*", "=", "=", "="],
  ),
];
export function generate(
  wide: number,
  tall: number,
  random = Math.random,
): { puzzle: Puzzle; answer: Cell[]; givens: Cell[] } {
  const cols = wide * 4 + 1,
    rows = tall * 4 + 1;
  const mask = Array(rows * cols).fill(0),
    answer: Cell[] = Array(rows * cols).fill(null);
  const put = (r: number, c: number, v: Piece) => {
    mask[r * cols + c] = 1;
    answer[r * cols + c] = v;
  };
  const nodes = Array.from({ length: tall + 1 }, () =>
    Array.from({ length: wide + 1 }, () => 2 + Math.floor(random() * 19)),
  );
  const connect = (
    r: number,
    c: number,
    dr: number,
    dc: number,
    a: number,
    b: number,
  ) => {
    let op: Piece = a <= b ? "+" : "-",
      middle = Math.abs(b - a);
    if (b % a === 0 && random() < 0.5) {
      op = "*";
      middle = b / a;
    } else if (a % b === 0 && random() < 0.5) {
      op = "/";
      middle = a / b;
    }
    [a, op, middle, "=", b].forEach((v, i) =>
      put(r + dr * i, c + dc * i, v as Piece),
    );
  };
  for (let r = 0; r <= tall; r++)
    for (let c = 0; c <= wide; c++) {
      if (c < wide) connect(r * 4, c * 4, 0, 1, nodes[r][c], nodes[r][c + 1]);
      if (r < tall) connect(r * 4, c * 4, 1, 0, nodes[r][c], nodes[r + 1][c]);
    }
  // Keep shared endpoints and symbols as inscriptions. The remaining number pieces
  // still form a real connected arithmetic crossword; every generated answer is valid.
  const givens = answer.map((v, i) =>
    v !== null &&
    (typeof v !== "number" ||
      (Math.floor(i / cols) % 4 === 0 && (i % cols) % 4 === 0))
      ? v
      : null,
  );
  return {
    puzzle: {
      name: "The great manuscript",
      rows,
      cols,
      mask,
      pieces: answer.filter((v): v is Piece => v !== null),
    },
    answer,
    givens,
  };
}
