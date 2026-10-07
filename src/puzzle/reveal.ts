import { type Puzzle, type Cell, solved, validate } from "./model";
// Always animate from the search's legal baseline, never overwrite the previous
// answer cell by cell: that could temporarily duplicate pieces or equal signs.
export function revealBaseline(
  puzzle: Puzzle,
  answer: Cell[],
  origin: Cell[],
  givens: Cell[],
): Cell[] {
  if (!solved(puzzle, answer))
    throw new Error(
      "This arrangement is no longer valid for the current puzzle.",
    );
  validate(puzzle, origin);
  validate(puzzle, givens);
  if (
    givens.some((v, i) => v !== null && answer[i] !== v) ||
    origin.some((v, i) => v !== null && answer[i] !== v)
  )
    throw new Error(
      "The arrangement conflicts with an entered piece or fixed clue.",
    );
  const baseline = origin.map((v, i) => givens[i] ?? v);
  validate(puzzle, baseline);
  return baseline;
}
