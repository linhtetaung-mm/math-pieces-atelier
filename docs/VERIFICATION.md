# Verification

Run `npm run check` to reproduce the twelve test groups plus TypeScript and production compilation.

- All six upstream patterns solve. Both returned arrangements for each are checked with independent arithmetic logic and exact physical inventory comparisons. Slot coordinates used for this verification are explicitly listed in the tests, rather than derived by the production extractor.
- For 150 deterministic single-equation inventories, including negative values, zero, duplicates and all four operations, complete solver solution sets match independent exhaustive permutation search.
- For a crossing layout, complete solution sets match independent exhaustive search, both unconstrained and with partial placements.
- Division direction, forbidden zero divisors, reversed equations, and repeated zero pieces are checked.
- Nine-cell chained equations share exactly one endpoint. Fragmented runs are rejected rather than bridged.
- Input validation, unavailable/excess placements, proven impossibility, solved initial boards, and zero-budget timeout are checked.
- 100 generated God Mode boards (25 at each of four sizes) have independently valid constructed answers. The live algorithm also solves them from their guided clues and its returned arrangements honor every clue.

Browser checks used the local Vite app:

- Piece selection and placement decrease the inventory; Undo restores it.
- The worker discovers multiple original arrangements, reveals one sequentially, and the checker confirms all four equations and zero unused pieces.
- Custom JSON imports correctly replace dimensions and inventory. A `6 ÷ 3 = 2` inventory solves; reveal pause/resume controls preserve the intermediate state.
- Switching modes preserves boards and cancels pending playback.
- Guided God Mode solves through the actual worker and reveal/check confirms all 22 equations.
- Responsive layouts were inspected at 1280 × 1000 and 390 × 844. The mobile page width matches the viewport; the larger God Mode board scrolls within its container.
- Help opens and closes with Escape. Dialog controls trap Tab focus.

Screenshots: `interface-desktop.jpg` and `interface-mobile.jpg`. They are development verification artifacts. Public gameplay begins from a blank original board; there are no stored answers in the six original level definitions.

Limits: browser drag and native file picker interaction were not separately automated. Pointer drag uses native HTML drag/drop; click and keyboard placement work on touch/mobile. Browser storage availability can vary. General large uninscribed puzzle searches are bounded and may time out.


Redesign and endless-play verification:

- 600 rounds (100 for each original mask) preserve all slot geometry, have independently checked equations and physical inventories, reproduce exactly from their seeds, and solve using the live algorithm. Each tested playground produced more than 80 distinct inventories over its 100-round sample.
- The playground picker displays miniature masks and offers endless or original play. New puzzle changes the round and pieces without changing the selected shape.
- A partially placed round was saved, another playground was visited, and returning restored the same round and placed piece. Reload retained the current round.
- Play's solution reveal completes a generated round and shows Next puzzle. Solver search metrics and budget controls are absent from Play.
- Build & solve has its own introductory workflow, canvas styling, equation ledger and selected-cell input. Entering 16 in the original first cell, fixing it as a clue, and solving returns valid arrangements respecting that clue.
- The replacement courtyard fresco and larger wordmark were inspected in the desktop preview. The active artwork uses a marble bust with no depicted hands.

Current previews: `interface-play-v2.jpg`, `interface-solver-v2.jpg`, `interface-play-mobile-v2.jpg`, and `interface-playgrounds-v2.jpg`. Both Play and Build & solve were checked at 390 × 844; document width was 390 in both modes.

Rank and arrangement regression verification:

- 300 ranked rounds (30 per rank) have connected masks, exact dimensions/equation counts, independently valid arithmetic and inventory, deterministic regeneration, and ordinary solver answers honoring every clue. Both dimensions and equation counts strictly increase across the ten ranks.
- Malformed and transitional equations containing two equals signs return false without throwing. Reveal baselines preserve clues and the original search entries, reject incompatible answers, and keep every animated frame within the physical inventory.
- In the browser, revealing arrangement one, switching to arrangement two, revealing again, then switching and searching again retained both valid answers without a blank page.
- The picker displays ten named ranks alongside endless classics and original fragments. Rank ten shows 22 × 25 and 60 equations. New puzzle changes its layout/pieces and advances the round.
- At 390 × 844 the largest rank's document width and scroll width are both 390; its board scrolls inside the panel.

Current rank previews: `interface-ranks.jpg` and `interface-ranked-play.jpg`.
