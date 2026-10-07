import { solve } from "./solver";
self.onmessage = (event) => {
  const { puzzle, board, budget } = event.data;
  self.postMessage(solve(puzzle, board, budget));
};
