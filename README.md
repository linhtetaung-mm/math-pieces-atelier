# Math Pieces · The Arithmetic Atelier

A React + TypeScript refactor of [Lin Htet Aung’s original Math-Pieces](https://github.com/linhtetaung-mm/Math-Pieces), built in this folder. The equation-first recursive idea is preserved and extended into a general constraint solver. Parchment, stone fragments, terracotta, classical typography, and an original courtyard fresco give it its own visual identity.

## Run locally

Node.js 22.12+ and npm are required.

```sh
npm install
npm run dev
```

Use the local address printed by Vite. `npm run check` runs independent solver tests, TypeScript checks, and the production build. `npm run preview` serves `dist/`. Any static web host can serve the production output; no backend or account is required.

## Three modes

- **Play:** ten ancient ranks, each with endless generated layouts, plus six selectable classic playgrounds with continuously generated puzzles in each shape, plus an Original fragments archive containing the unchanged level-1/2/3/13/28/29 examples. The picker previews each shape. New puzzle and the completion screen continue the selected playground; previous-puzzle navigation reproduces its earlier round. The latest arrangement in every playground is saved separately. Select a stone then a piece, choose a piece first, or drag. Drag placed pieces to swap them. Double-click or Delete returns a piece; arrows navigate. Includes undo, reset, balance checks, continuation hints, and an animated, pausable solution reveal. Any valid arrangement counts.
- **Build & solve:** a distinct sage-colored workbench with a dotted layout canvas, a selected-cell placement editor, an equation ledger, explicit input validation, and search results. Supports rectangular layouts up to 33 × 33, cell carving, integer and symbol inventory editing, fixed clues, current-placement constraints, custom play, and JSON import/export. Use `Fix clue` on a placed piece to preserve it during reset; `Free clue` releases it. Include all physical pieces in the inventory, including those already placed. `Set pieces` starts a fresh arrangement with the updated inventory.
- **God mode:** a connected page-sized arithmetic crossword at 13 × 9, 17 × 9, 21 × 13, or 29 × 17. Choose Guided (fixed signs and shared endpoints), Scholar (signs and fewer shared numbers), or Uninscribed (all pieces free), then create a new manuscript. Every generated board has a valid arrangement. Guided mode is an arithmetic warm-up; the others introduce intersecting placement constraints. Mobile scrolling stays inside the board, with the materials below it.

Play, editor, and God Mode sessions persist in browser storage when available. Switching modes preserves each arrangement and stops pending search/reveal work. Each playground retains its latest puzzle; changing rounds starts a blank arrangement of the reproducible puzzle. Undo history is limited to the current page visit. Reset starts a fresh attempt and clears its undo history. Hints/reveals label a completion as assisted; there is no unassisted leaderboard or scoring system.

## Rules

Use every physical piece once. Each five-cell horizontal or vertical slot must read `a op b = c` or `c = a op b`, with `op` one of `+ - * /`. Shared cells consume one piece, even when they serve two equations. Duplicate values remain separate physical pieces. Zero and negative integers are supported; division by zero and fractional results are forbidden. Only safe JavaScript integers are accepted.

A continuous run of 9, 13, 17… cells is an extension of the original five-cell rule: consecutive equations share their endpoint number. Other multi-cell run lengths and isolated cells are rejected. Unused outer padding was removed from some original masks without changing intersections.

## Solver and verification

The background worker enumerates valid equation tuples, respects shared cells and a counted piece inventory, filters domains, and recursively selects the equation with the fewest available candidates. Search can be cancelled immediately, with 3/10/30 second budgets. It returns up to two distinct arrangements and distinguishes invalid input, proven impossibility, a solution, and timeout. A time limit is not a proof of impossibility or uniqueness.

All six original patterns have at least two valid arrangements. Twelve test groups also check 300 ranked rounds (30 per rank), connected layouts, exact equation counts, reproducibility, clue-respecting solutions, and safe switching between revealed arrangements. The suite additionally constructs, independently verifies, solves, and reproduces 600 seeded playground rounds, checking inventory variety across all six shapes. It independently verifies their equations and inventories, compares complete solution sets against separate exhaustive searches for 150 small puzzles and a crossing layout, checks gap handling, chained equations, duplicates, zero/division, fixed placements, invalid inputs and timeout semantics, and verifies 100 generated boards across all God Mode sizes.

See [the algorithm explanation](docs/ALGORITHM.md) and [verification notes](docs/VERIFICATION.md). General search is exponential; large unconstrained manuscripts can legitimately exceed the budget. Generated answers are not consulted by hints or the solver.

## Source layout

- `src/App.tsx`: gameplay, three independent sessions, editor, persistence and worker/reveal lifecycle.
- `src/puzzle/model.ts`: rules, slot extraction, inventories and validation.
- `src/puzzle/solver.ts`: pure constraint search.
- `src/puzzle/solver.worker.ts`: background solver.
- `src/puzzle/levels.ts`: original patterns and connected crossword generator.
- `src/puzzle/playgrounds.ts`: deterministic equation-based generation for endless play.
- `src/puzzle/ranks.ts`: ten growing ranks and connected seeded layout generation.
- `src/puzzle/reveal.ts`: validated reveal baselines for safely switching arrangements.
- `src/PlaygroundMap.tsx`: miniature layout previews in the playground picker.
- `src/styles.css`: responsive atelier design and stone/parchment textures.
- `tests/solver.test.mjs`: independent solver verification.
- `docs/original/`: preserved upstream JavaScript for attribution and comparison.

The original puzzle data and algorithm belong to Lin Htet Aung. No new license is imposed on the original source. The active generated mural depicts a classical courtyard and an imagined marble mathematician bust, not a historical portrait or a claim about who invented modern signs. Google Fonts are optional and have local fallbacks. No remote image request is needed: the mural is included in `public/`.

The six supplied layouts are examples, not an exhaustive classification of how equations can connect. Generated play rounds have a guaranteed arrangement but are not promised unique solutions or calibrated difficulty. Seeds reproduce rounds; continuous play does not guarantee that an inventory never repeats. Play exposes only guidance and a solution reveal; solver budgets, search metrics and alternative arrangements belong to Build & solve.

## Ancient ranks

Every rank is selectable and supports continuous rounds. Dimensions are rows × columns.

| Rank | Board | Equations |
| --- | --- | --- |
| Initiate of the Abacus | 6 × 8 | 4 |
| Keeper of the Tablet | 7 × 9 | 6 |
| Scribe of the Agora | 9 × 10 | 10 |
| Scholar of the Lyceum | 10 × 13 | 14 |
| Geometer of the Academy | 13 × 14 | 20 |
| Sage of Alexandria | 14 × 17 | 26 |
| Oracle of Delphi | 17 × 18 | 33 |
| Architect of the Pantheon | 18 × 21 | 41 |
| Titan of the Cosmos | 21 × 22 | 50 |
| Immortal of the Infinite | 22 × 25 | 60 |

Ranked puzzles start with fixed inscriptions, marked with dots. Each rank preserves its latest round and arrangement independently. Increasing rank increases board dimensions and equation counts; these are size tiers, not empirically calibrated difficulty ratings.
