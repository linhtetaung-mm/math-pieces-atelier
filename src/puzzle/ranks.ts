import { generate } from "./levels";
import { randomFrom, shuffle, type Run } from "./playgrounds";
import { type Cell, type Piece, type Puzzle, solved, slots } from "./model";
export const ranks = [
  {
    title: "Initiate of the Abacus",
    rows: 6,
    cols: 8,
    equations: 4,
    description: "Find your first balance.",
  },
  {
    title: "Keeper of the Tablet",
    rows: 7,
    cols: 9,
    equations: 6,
    description: "Follow the joining inscriptions.",
  },
  {
    title: "Scribe of the Agora",
    rows: 9,
    cols: 10,
    equations: 10,
    description: "Let the courtyard of ideas unfold.",
  },
  {
    title: "Scholar of the Lyceum",
    rows: 10,
    cols: 13,
    equations: 14,
    description: "Read between connected truths.",
  },
  {
    title: "Geometer of the Academy",
    rows: 13,
    cols: 14,
    equations: 20,
    description: "Discover the order within the form.",
  },
  {
    title: "Sage of Alexandria",
    rows: 14,
    cols: 17,
    equations: 26,
    description: "Bring the library into balance.",
  },
  {
    title: "Oracle of Delphi",
    rows: 17,
    cols: 18,
    equations: 33,
    description: "Seek the truth at every crossing.",
  },
  {
    title: "Architect of the Pantheon",
    rows: 18,
    cols: 21,
    equations: 41,
    description: "Raise a monument to reason.",
  },
  {
    title: "Titan of the Cosmos",
    rows: 21,
    cols: 22,
    equations: 50,
    description: "Hold a constellation of equations.",
  },
  {
    title: "Immortal of the Infinite",
    rows: 22,
    cols: 25,
    equations: 60,
    description: "A grand manuscript, always beginning.",
  },
];
export const runKey = (run: Run) =>
  run.rank === undefined ? String(run.playground) : `rank:${run.rank}`;
export function generateRank(run: Run): {
  puzzle: Puzzle;
  answer: Cell[];
  givens: Cell[];
} {
  if (
    !Number.isInteger(run.rank) ||
    !ranks[run.rank!] ||
    !Number.isSafeInteger(run.round) ||
    run.round < 1 ||
    !Number.isInteger(run.seed)
  )
    throw new Error("Invalid rank or round.");
  const rank = ranks[run.rank!],
    random = randomFrom(
      (run.seed ^
        Math.imul(run.round, 0x9e3779b1) ^
        Math.imul(run.rank! + 11, 0x85ebca6b)) >>>
        0,
    );
  const wide = Math.floor((rank.cols - 1) / 4),
    tall = Math.floor((rank.rows - 1) / 4);
  const g = generate(wide, tall, random),
    vertices = (wide + 1) * (tall + 1);
  type Edge = { from: number; to: number; cells: number[] };
  const edges: Edge[] = [];
  for (let r = 0; r <= tall; r++)
    for (let c = 0; c <= wide; c++) {
      const from = r * (wide + 1) + c;
      if (c < wide)
        edges.push({
          from,
          to: from + 1,
          cells: Array.from(
            { length: 5 },
            (_, i) => r * 4 * g.puzzle.cols + c * 4 + i,
          ),
        });
      if (r < tall)
        edges.push({
          from,
          to: from + wide + 1,
          cells: Array.from(
            { length: 5 },
            (_, i) => (r * 4 + i) * g.puzzle.cols + c * 4,
          ),
        });
    }
  // A randomized spanning tree guarantees a single connected crossword. Extra
  // edges add cycles until the rank's exact equation count is reached.
  const parent = Array.from({ length: vertices }, (_, i) => i);
  const root = (n: number): number => {
    while (parent[n] !== n) {
      parent[n] = parent[parent[n]];
      n = parent[n];
    }
    return n;
  };
  const selected: Edge[] = [],
    extras: Edge[] = [];
  for (const edge of shuffle([...edges], random)) {
    const a = root(edge.from),
      b = root(edge.to);
    if (a !== b) {
      parent[a] = b;
      selected.push(edge);
    } else extras.push(edge);
  }
  selected.push(...extras.slice(0, rank.equations - selected.length));
  const answer: Cell[] = Array(rank.rows * rank.cols).fill(null),
    mask = Array(answer.length).fill(0),
    degree = Array(vertices).fill(0);
  selected.forEach((e) => {
    degree[e.from]++;
    degree[e.to]++;
  });
  const dr = Math.floor(random() * (rank.rows - g.puzzle.rows + 1)),
    dc = Math.floor(random() * (rank.cols - g.puzzle.cols + 1));
  const endpointIds = new Map<number, number>();
  for (const edge of selected)
    for (const oldId of edge.cells) {
      const r = Math.floor(oldId / g.puzzle.cols),
        c = oldId % g.puzzle.cols,
        id = (r + dr) * rank.cols + c + dc;
      mask[id] = 1;
      answer[id] = g.answer[oldId];
      if (r % 4 === 0 && c % 4 === 0)
        endpointIds.set(id, (r / 4) * (wide + 1) + c / 4);
    }
  const givens = answer.map((v, id) =>
    v === "=" ||
    (typeof v === "string" && random() < 0.35) ||
    (endpointIds.has(id) &&
      (degree[endpointIds.get(id)!] > 1 || random() < 0.5))
      ? v
      : null,
  );
  const puzzle = {
    name: rank.title,
    rows: rank.rows,
    cols: rank.cols,
    mask,
    pieces: shuffle(
      answer.filter((v): v is Piece => v !== null),
      random,
    ),
  };
  if (slots(puzzle).length !== rank.equations || !solved(puzzle, answer))
    throw new Error("Rank construction failed validation.");
  return { puzzle, answer, givens };
}
