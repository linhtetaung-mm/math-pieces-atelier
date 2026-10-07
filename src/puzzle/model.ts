export type Piece = number | "+" | "-" | "*" | "/" | "=";
export type Cell = Piece | null;
export interface Puzzle {
  name: string;
  rows: number;
  cols: number;
  mask: number[];
  pieces: Piece[];
}
export interface Slot {
  cells: number[];
  direction: "across" | "down";
}
export const glyph = (p: Piece) =>
  p === "*" ? "×" : p === "/" ? "÷" : p === "-" ? "−" : String(p);
export const key = (p: Piece) => (typeof p === "number" ? `n:${p}` : p);
export function counts(pieces: Piece[]) {
  const m = new Map<string, number>();
  for (const p of pieces) m.set(key(p), (m.get(key(p)) || 0) + 1);
  return m;
}
export function slots(p: Puzzle): Slot[] {
  const result: Slot[] = [];
  for (const direction of ["across", "down"] as const) {
    const outer = direction === "across" ? p.rows : p.cols;
    const inner = direction === "across" ? p.cols : p.rows;
    for (let line = 0; line < outer; line++) {
      let run: number[] = [];
      const flush = () => {
        if (run.length > 1) {
          if (run.length < 5 || (run.length - 1) % 4 !== 0)
            throw new Error(
              `Every equation run must have 5, 9, 13… cells (${direction}, line ${line + 1}).`,
            );
          for (let i = 0; i < run.length - 1; i += 4)
            result.push({ cells: run.slice(i, i + 5), direction });
        }
        run = [];
      };
      for (let at = 0; at < inner; at++) {
        const id =
          direction === "across" ? line * p.cols + at : at * p.cols + line;
        if (p.mask[id]) run.push(id);
        else flush();
      }
      flush();
    }
  }
  const used = new Set(result.flatMap((s) => s.cells));
  if (p.mask.some((v, i) => v && !used.has(i)))
    throw new Error("Every open cell must belong to an equation.");
  if (!result.length) throw new Error("Draw at least one five-cell equation.");
  return result;
}
export function validEquation(v: Cell[]): boolean {
  if (v.length !== 5 || v.some((x) => x === null)) return false;
  const forward = v[3] === "=" && v[1] !== "=";
  const reversed = v[1] === "=" && v[3] !== "=";
  if (!forward && !reversed) return false;
  const a = forward ? v[0] : v[2],
    b = forward ? v[2] : v[4],
    c = forward ? v[4] : v[0],
    op = forward ? v[1] : v[3];
  if (typeof a !== "number" || typeof b !== "number" || typeof c !== "number")
    return false;
  if (op === "+") return a + b === c;
  if (op === "-") return a - b === c;
  if (op === "*") return a * b === c;
  if (op === "/") return b !== 0 && a === b * c;
  return false;
}

export function validate(p: Puzzle, board: Cell[]) {
  if (
    !Number.isInteger(p.rows) ||
    !Number.isInteger(p.cols) ||
    p.rows < 1 ||
    p.cols < 1 ||
    p.rows > 33 ||
    p.cols > 33 ||
    p.mask.length !== p.rows * p.cols
  )
    throw new Error("Board dimensions must be 1–33 with a matching mask.");
  if (p.mask.some((v) => v !== 0 && v !== 1))
    throw new Error("The mask must contain only 0 and 1.");
  if (p.pieces.length !== p.mask.filter(Boolean).length)
    throw new Error("Provide exactly one piece for each open cell.");
  if (
    p.pieces.some((x) =>
      typeof x === "number"
        ? !Number.isSafeInteger(x)
        : !["+", "-", "*", "/", "="].includes(x),
    )
  )
    throw new Error("Use safe integers and +, -, *, /, = pieces.");
  if (board.length !== p.mask.length)
    throw new Error("Placements must match the board dimensions.");
  const remaining = counts(p.pieces);
  board.forEach((v, i) => {
    if (v !== null) {
      if (!p.mask[i]) throw new Error("A blocked cell cannot contain a piece.");
      const n = remaining.get(key(v)) || 0;
      if (n < 1)
        throw new Error("Placements use a piece that is not available.");
      remaining.set(key(v), n - 1);
    }
  });
  return slots(p);
}
export function solved(p: Puzzle, board: Cell[]) {
  try {
    const ss = validate(p, board);
    return (
      p.mask.every((v, i) => !v || board[i] !== null) &&
      ss.every((s) => validEquation(s.cells.map((i) => board[i])))
    );
  } catch {
    return false;
  }
}
export function available(p: Puzzle, board: Cell[]): Piece[] {
  const used = counts(board.filter((x): x is Piece => x !== null));
  return p.pieces.filter((x) => {
    const n = used.get(key(x)) || 0;
    if (n) {
      used.set(key(x), n - 1);
      return false;
    }
    return true;
  });
}
