import { test } from "node:test";
import assert from "node:assert/strict";
import { solve } from "../src/puzzle/solver.ts";
import { slots, validEquation, validate, solved } from "../src/puzzle/model.ts";
import { levels, generate } from "../src/puzzle/levels.ts";
const blank = (p) => Array(p.mask.length).fill(null);
// Deliberately separate arithmetic and inventory verification, no production
// validator or stored generated answer is used to judge a returned arrangement.
function trueEquation(v) {
  const equal = v.indexOf("=");
  if (equal !== 1 && equal !== 3) return false;
  const a = equal === 3 ? v[0] : v[2],
    b = equal === 3 ? v[2] : v[4],
    c = equal === 3 ? v[4] : v[0],
    op = equal === 3 ? v[1] : v[3];
  if (![a, b, c].every((x) => typeof x === "number")) return false;
  return op === "+"
    ? a + b === c
    : op === "-"
      ? a - b === c
      : op === "*"
        ? a * b === c
        : op === "/"
          ? b !== 0 && a === b * c
          : false;
}
function independentCheck(p, b, paths, initial = blank(p)) {
  assert.deepEqual(
    b
      .filter((_, i) => p.mask[i])
      .map((x) => `${typeof x}:${x}`)
      .sort(),
    p.pieces.map((x) => `${typeof x}:${x}`).sort(),
  );
  for (const path of paths)
    assert.ok(
      trueEquation(path.map((i) => b[i])),
      "Every returned equation must be independently true",
    );
  initial.forEach((v, i) => {
    if (v !== null) assert.equal(b[i], v);
  });
}
function brute(p, paths, initial = blank(p)) {
  const pieces = [...p.pieces],
    board = [...initial];
  for (const v of initial)
    if (v !== null) {
      const at = pieces.indexOf(v);
      if (at < 0) return [];
      pieces.splice(at, 1);
    }
  const ids = p.mask.flatMap((v, i) => (v && board[i] === null ? [i] : [])),
    answers = [];
  function visit(depth, remaining) {
    if (depth === ids.length) {
      if (paths.every((path) => trueEquation(path.map((i) => board[i]))))
        answers.push([...board]);
      return;
    }
    const id = ids[depth];
    for (const v of new Set(remaining)) {
      // Only the grammar (number vs symbol) is used to prune permutation search.
      if (
        paths.some(
          (path) =>
            path.includes(id) &&
            (path.indexOf(id) % 2 === 0) !== (typeof v === "number"),
        )
      )
        continue;
      board[id] = v;
      if (
        paths.every(
          (path) =>
            path.some((i) => board[i] === null) ||
            trueEquation(path.map((i) => board[i])),
        )
      ) {
        const next = [...remaining];
        next.splice(next.indexOf(v), 1);
        visit(depth + 1, next);
      }
      board[id] = null;
    }
  }
  visit(0, pieces);
  return answers;
}
let seed = 17;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
}
test("all six exact original inventories solve, independently validated", () => {
  const paths = [
    [
      [0, 1, 2, 3, 4],
      [10, 11, 12, 13, 14],
      [0, 5, 10, 15, 20],
      [2, 7, 12, 17, 22],
    ],
    [
      [7, 8, 9, 10, 11],
      [24, 25, 26, 27, 28],
      [2, 8, 14, 20, 26],
      [4, 10, 16, 22, 28],
    ],
    [
      [0, 1, 2, 3, 4],
      [10, 11, 12, 13, 14],
      [0, 5, 10, 15, 20],
      [4, 9, 14, 19, 24],
    ],
    [
      [10, 11, 12, 13, 14],
      [20, 21, 22, 23, 24],
      [10, 15, 20, 25, 30],
      [4, 9, 14, 19, 24],
    ],
    [
      [7, 8, 9, 10, 11],
      [24, 25, 26, 27, 28],
      [7, 13, 19, 25, 31],
      [4, 10, 16, 22, 28],
    ],
    [
      [7, 8, 9, 10, 11],
      [19, 20, 21, 22, 23],
      [7, 13, 19, 25, 31],
      [4, 10, 16, 22, 28],
    ],
  ];
  levels.forEach((p, i) => {
    const r = solve(p);
    assert.equal(r.status, "solved");
    assert.equal(r.solutions.length, 2);
    r.solutions.forEach((b) => independentCheck(p, b, paths[i]));
  });
});
test("exhaustive single equation permutations with zeros, negatives, unsorted duplicates, and every operator", () => {
  for (let i = 0; i < 150; i++) {
    const p = {
      name: "test",
      rows: 1,
      cols: 5,
      mask: [1, 1, 1, 1, 1],
      pieces: [
        Math.floor(random() * 9) - 3,
        ["+", "-", "*", "/"][i % 4],
        Math.floor(random() * 9) - 3,
        "=",
        Math.floor(random() * 9) - 3,
      ],
    };
    const expected = brute(p, [[0, 1, 2, 3, 4]]),
      actual = solve(p, blank(p), 3000, 10000);
    assert.equal(actual.status, expected.length ? "solved" : "impossible");
    assert.deepEqual(
      actual.solutions.map((b) => JSON.stringify(b)).sort(),
      expected.map((b) => JSON.stringify(b)).sort(),
    );
    assert.equal(actual.exhaustive, true);
  }
});
test("crossing equations agree with independent complete permutation search", () => {
  const p = {
    name: "cross",
    rows: 5,
    cols: 5,
    mask: [
      0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0,
    ],
    pieces: [1, 2, 3, 4, 5, "+", "+", "=", "="],
  };
  const paths = [
    [10, 11, 12, 13, 14],
    [2, 7, 12, 17, 22],
  ];
  const expected = brute(p, paths),
    actual = solve(p, blank(p), 3000, 10000);
  assert.deepEqual(
    actual.solutions.map((b) => JSON.stringify(b)).sort(),
    expected.map((b) => JSON.stringify(b)).sort(),
  );
  for (const answer of expected.slice(0, 10)) {
    const prefix = blank(p);
    prefix[12] = answer[12];
    prefix[11] = answer[11];
    const r = solve(p, prefix, 3000, 10000),
      exp = brute(p, paths, prefix);
    assert.deepEqual(
      r.solutions.map((b) => JSON.stringify(b)).sort(),
      exp.map((b) => JSON.stringify(b)).sort(),
    );
    r.solutions.forEach((b) => independentCheck(p, b, paths, prefix));
  }
});
test("integer division, reversal, zero and duplicate physical pieces", () => {
  assert.ok(validEquation([0, "/", 2, "=", 0]));
  assert.ok(!validEquation([2, "/", 0, "=", 0]));
  assert.ok(validEquation([2, "=", 6, "/", 3]));
  assert.ok(!validEquation([1, "/", 2, "=", 1]));
  const p = {
    name: "zero",
    rows: 1,
    cols: 5,
    mask: [1, 1, 1, 1, 1],
    pieces: [0, 0, 0, "+", "="],
  };
  const r = solve(p);
  assert.equal(r.solutions.length, 2);
  r.solutions.forEach((b) => independentCheck(p, b, [[0, 1, 2, 3, 4]]));
});
test("long runs overlap only at endpoints and gaps are never bridged", () => {
  const p = {
    name: "chain",
    rows: 1,
    cols: 9,
    mask: Array(9).fill(1),
    pieces: [2, "+", 3, "=", 5, "-", 1, "=", 4],
  };
  assert.deepEqual(
    slots(p).map((s) => s.cells),
    [
      [0, 1, 2, 3, 4],
      [4, 5, 6, 7, 8],
    ],
  );
  const r = solve(p);
  assert.equal(r.status, "solved");
  r.solutions.forEach((b) =>
    independentCheck(p, b, [
      [0, 1, 2, 3, 4],
      [4, 5, 6, 7, 8],
    ]),
  );
  const bad = {
    ...p,
    mask: [1, 1, 0, 1, 1, 0, 1, 1, 1],
    pieces: [1, 2, 3, 4, 5, 6, 7],
  };
  assert.equal(solve(bad).status, "invalid");
});
test("invalid input, unavailable placements, proven failure, and honest timeout", () => {
  const p = {
    name: "one",
    rows: 1,
    cols: 5,
    mask: [1, 1, 1, 1, 1],
    pieces: [2, "+", 3, "=", 5],
  };
  assert.equal(solve({ ...p, pieces: [2, 3] }).status, "invalid");
  assert.equal(solve(p, [99, null, null, null, null]).status, "invalid");
  assert.equal(solve(p, [2, 2, null, null, null]).status, "invalid");
  assert.equal(
    solve({ ...p, pieces: [2, "+", 3, "=", 9] }).status,
    "impossible",
  );
  assert.equal(solve(p, blank(p), 0).status, "timeout");
  assert.equal(solve(p, [2, "+", 3, "=", 5]).status, "solved");
});
test("generated connected God Mode fields are independently valid and solver honors all clues", () => {
  for (const [w, h] of [
    [3, 2],
    [4, 2],
    [5, 3],
    [7, 4],
  ])
    for (let i = 0; i < 25; i++) {
      const g = generate(w, h, random);
      const paths = [];
      const cols = w * 4 + 1;
      for (let r = 0; r <= h; r++)
        for (let c = 0; c < w; c++)
          paths.push(
            Array.from({ length: 5 }, (_, i) => r * 4 * cols + c * 4 + i),
          );
      for (let c = 0; c <= w; c++)
        for (let r = 0; r < h; r++)
          paths.push(
            Array.from({ length: 5 }, (_, i) => (r * 4 + i) * cols + c * 4),
          );
      independentCheck(g.puzzle, g.answer, paths, g.givens);
      const r = solve(g.puzzle, g.givens, 3000);
      assert.equal(r.status, "solved");
      r.solutions.forEach((b) =>
        independentCheck(g.puzzle, b, paths, g.givens),
      );
    }
});

test("endless playground rounds preserve each original layout and independently solve", async () => {
  const { generateRound } = await import("../src/puzzle/playgrounds.ts");
  for (let playground = 0; playground < 6; playground++) {
    const inventories = new Set();
    for (let round = 1; round <= 100; round++) {
      const run = { playground, round, seed: 2026 };
      const g = generateRound(run);
      assert.deepEqual(g.puzzle.mask, levels[playground].mask);
      assert.deepEqual(
        generateRound(run),
        g,
        "Seeded rounds must reproduce exactly for previous-puzzle navigation",
      );
      const paths = slots(levels[playground]).map((s) => s.cells);
      independentCheck(g.puzzle, g.answer, paths);
      const result = solve(g.puzzle, blank(g.puzzle), 3000, 1);
      assert.equal(result.status, "solved");
      independentCheck(g.puzzle, result.solutions[0], paths);
      inventories.add(JSON.stringify(g.puzzle.pieces.map(String).sort()));
    }
    assert.ok(
      inventories.size > 80,
      `Playground ${playground} should offer varied inventories (${inventories.size})`,
    );
  }
});
test("playground generation rejects invalid round identifiers", async () => {
  const { generateRound } = await import("../src/puzzle/playgrounds.ts");
  for (const run of [
    { playground: 6, round: 1, seed: 2 },
    { playground: 0, round: 0, seed: 2 },
    { playground: 0, round: NaN, seed: 2 },
  ])
    assert.throws(() => generateRound(run));
});

test("malformed and transitional equations with two equals signs cannot recurse or throw", () => {
  for (const a of [null, 0, 1, 2, "+", "="])
    for (const b of [null, 0, 1, 2, "-", "="])
      for (const c of [null, 0, 1, 2, "*", "="]) {
        assert.equal(validEquation([a, "=", b, "=", c]), false);
      }
  const p = levels[0],
    r = solve(p);
  let transitional = [...r.solutions[0]];
  for (let i = 0; i < transitional.length; i++) {
    transitional[i] = r.solutions[1][i];
    for (const s of slots(p))
      assert.doesNotThrow(() =>
        validEquation(s.cells.map((id) => transitional[id])),
      );
  }
});
test("alternate solution playback starts from a legal baseline and never duplicates physical pieces", async () => {
  const { revealBaseline } = await import("../src/puzzle/reveal.ts");
  const p = levels[0],
    r = solve(p),
    origin = blank(p),
    givens = blank(p);
  for (const answer of [r.solutions[0], r.solutions[1], r.solutions[0]]) {
    const board = revealBaseline(p, answer, origin, givens);
    assert.deepEqual(board, origin);
    for (let i = 0; i < board.length; i++)
      if (p.mask[i]) {
        board[i] = answer[i];
        assert.doesNotThrow(() => validate(p, board));
        for (const s of slots(p))
          assert.doesNotThrow(() =>
            validEquation(s.cells.map((id) => board[id])),
          );
      }
    independentCheck(
      p,
      board,
      slots(p).map((s) => s.cells),
    );
  }
  const fixed = blank(p);
  fixed[0] = r.solutions[0][0];
  assert.equal(revealBaseline(p, r.solutions[0], fixed, fixed)[0], fixed[0]);
  const bad = [...r.solutions[0]];
  bad[0] = 999;
  assert.throws(() => revealBaseline(p, bad, origin, givens));
  assert.throws(() =>
    revealBaseline(p, r.solutions[0], Array(2).fill(null), givens),
  );
});
test("ten ancient ranks grow in dimensions and equations, generate connected layouts, and solve", async () => {
  const { generateRank, ranks } = await import("../src/puzzle/ranks.ts");
  assert.equal(ranks.length, 10);
  for (let rank = 0; rank < 10; rank++) {
    if (rank) {
      assert.ok(ranks[rank].rows > ranks[rank - 1].rows);
      assert.ok(ranks[rank].cols > ranks[rank - 1].cols);
      assert.ok(ranks[rank].equations > ranks[rank - 1].equations);
    }
    const variety = new Set();
    for (let round = 1; round <= 30; round++) {
      const run = { playground: 0, rank, seed: 551, round },
        g = generateRank(run);
      assert.deepEqual(generateRank(run), g);
      assert.equal(g.puzzle.rows, ranks[rank].rows);
      assert.equal(g.puzzle.cols, ranks[rank].cols);
      // Independently reconstruct uninterrupted row/column equation runs.
      const paths = [];
      for (const horizontal of [true, false])
        for (
          let line = 0;
          line < (horizontal ? g.puzzle.rows : g.puzzle.cols);
          line++
        ) {
          let run = [];
          const flush = () => {
            if (run.length > 1) {
              assert.equal((run.length - 1) % 4, 0);
              for (let at = 0; at < run.length - 1; at += 4)
                paths.push(run.slice(at, at + 5));
            }
            run = [];
          };
          for (
            let at = 0;
            at < (horizontal ? g.puzzle.cols : g.puzzle.rows);
            at++
          ) {
            const id = horizontal
              ? line * g.puzzle.cols + at
              : at * g.puzzle.cols + line;
            if (g.puzzle.mask[id]) run.push(id);
            else flush();
          }
          flush();
        }
      assert.equal(paths.length, ranks[rank].equations);
      independentCheck(g.puzzle, g.answer, paths, g.givens);
      const start = g.puzzle.mask.findIndex(Boolean),
        seen = new Set([start]),
        queue = [start];
      for (const id of queue)
        for (const delta of [-g.puzzle.cols, g.puzzle.cols, -1, 1]) {
          const next = id + delta;
          if (
            next < 0 ||
            next >= g.puzzle.mask.length ||
            (Math.abs(delta) === 1 &&
              Math.floor(next / g.puzzle.cols) !==
                Math.floor(id / g.puzzle.cols))
          )
            continue;
          if (g.puzzle.mask[next] && !seen.has(next)) {
            seen.add(next);
            queue.push(next);
          }
        }
      assert.equal(
        seen.size,
        g.puzzle.pieces.length,
        "Every ranked puzzle must be one connected crossword",
      );
      assert.ok(g.givens.some((v) => v !== null));
      assert.ok(
        g.givens.filter((v) => v !== null).length < g.puzzle.pieces.length,
      );
      const result = solve(g.puzzle, g.givens, 3000);
      assert.equal(result.status, "solved");
      result.solutions.forEach((b) =>
        independentCheck(g.puzzle, b, paths, g.givens),
      );
      variety.add(JSON.stringify(g.puzzle.pieces.map(String).sort()));
    }
    assert.ok(variety.size > 20);
  }
  for (const rank of [-1, 10, NaN])
    assert.throws(() =>
      generateRank({ playground: 0, rank, seed: 1, round: 1 }),
    );
});
