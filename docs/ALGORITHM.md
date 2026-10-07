# From equation-first recursion to a general solver

## The original solving instinct

The 2022 implementation first extracts equation positions into `codi`, enumerates valid arithmetic equations from the supplied numbers, and recursively inserts whole equations. Its `isPossible` function checks compatibility with pieces already on the board and consumes unused pieces. This is an effective constraint-based idea: searching equations is much smaller than blindly permuting every tile.

The new solver keeps that structure. It does not replace your logic with a stored answer or an external AI service.

## Why some patterns were difficult

The preserved source under `original/` reveals several restrictions:

1. `isPossible` only reads existing pieces when `position.x` is an array (vertical). This relies on inserting horizontal equations first and cannot handle shared cells consistently in an arbitrary equation order.
2. Horizontal/vertical run scanners retain their temporary count across row/column boundaries and gaps. A disconnected layout can therefore be interpreted as one equation.
3. Arithmetic candidate generation looks for a result after the current pair's positions in the input array. This assumes ordering and can miss equations from unsorted or negative inventories. `addNumbers` also indexes `eqs[i]` using an index from the number loop, which need not identify the equation just added.
4. `checkNodes` gates candidate generation on a count of hypothetical row/column pairings, rather than actual overlap constraints. That count has no general mathematical relationship to solvability.
5. Numeric zero is treated as an empty cell through truthiness checks.
6. Whole-board and inventory copies are repeated for each candidate, and there is no time limit or worker isolation.

These observations explain implementation restrictions, not a flaw in the equation-first approach.

## Model

A puzzle contains a rectangular binary mask and a multiset of physical pieces. Every open cell is covered by at least one slot. Slots have five cells, with number positions at indices 0, 2 and 4 and symbol positions at 1 and 3. Maximal continuous runs of length `4k + 1` decompose into `k` slots overlapping at endpoint numbers. This explicit extension makes the connected God Mode field possible. Runs reset at every boundary and gap. Invalid masks are rejected.

For an equation, the accepted tuples are:

```
[a, op, b, '=', c]
[c, '=', a, op, b]
```

For division, `b != 0` and `a == b*c`. This avoids accepting fractional or approximate equations. Values and arithmetic candidates must be safe integers. Intersections may also share signs, as the original level-28/29 patterns demonstrate; there is no assumption that intersections are exclusively numbers.

## Candidate construction

Iterate over all distinct number values `a` and `b`, and every arithmetic operation actually present. Calculate `c`, require it in the inventory, and produce both equation orientations. Before accepting a tuple, require its own multiset to fit the original physical inventory. For instance, `2 + 2 = 4` needs two copies of 2. A number's position in the input list is irrelevant.

Initial placements are validated and deducted from the remaining multiset. Candidate domains for each slot are filtered against those placements. Null explicitly means empty, so zero remains a usable number.

## Recursive search

1. Filter each pending equation's candidates against the current board and remaining multiset. Check every shared cell regardless of slot direction.
2. If any domain is empty, backtrack immediately.
3. Choose the pending equation with the smallest remaining domain (minimum remaining values).
4. For each tuple in its domain, assign only previously empty cells. Deduct one piece per newly filled physical cell. Already filled intersections consume nothing further.
5. Recurse with the equation removed and the filtered domains carried forward.
6. Restore exactly the changed cells and their counts after the branch.
7. At a leaf, validate the entire board, its piece inventory, and every equation before accepting it.

This is forward checking, not full arc consistency between unassigned slots. The next recursive level propagates the selected tuple through all pending domains.

## Correctness

Candidate enumeration includes every allowed arithmetic tuple over the supplied values and signs. Tuple inventory pruning removes only tuples that cannot fit even the full inventory. Compatibility filtering removes only candidates conflicting with fixed/current cells or requiring unavailable pieces. Choosing a more constrained equation changes search order, not the set of possibilities. Exact assignment/rollback preserves board and inventory invariants. Every legal complete arrangement is represented by a branch, and every accepted leaf is independently checked by the model.

The tests additionally use separate permutation enumeration and separate arithmetic/inventory checks, so they do not rely exclusively on the implementation's own validator. Complete small-board solution sets are compared, not merely the existence of one returned answer.

## Result semantics and limits

The UI requests at most two arrangements. Finding two establishes non-uniqueness; it does not count all solutions. Finding one with an exhausted search establishes uniqueness within this model. Finding one before timeout establishes validity but leaves uniqueness unknown. A caller requesting only one arrangement also receives no uniqueness claim.

`impossible` is returned only after exhausting the search with no arrangement. `timeout` means the budget expired without a found arrangement. Cancellation terminates the worker and leaves the board intact. Time checks cover candidate construction and search; the budget is approximate, with small synchronous validation/filtering segments between checks.

Search remains exponential in the worst case. Guided fields usually have singleton equation domains. Scholar and Uninscribed fields can be far harder. No globally efficient algorithm or arbitrary-size time guarantee is claimed.

## Generator

Choose random integer values for shared lattice endpoints. Join each adjacent endpoint pair by a valid addition/subtraction equation, sometimes multiplication/division when the ratio is integral. Horizontal and vertical edges use the same endpoint values, so every crossing is consistent. The union of all assigned cells defines the exact piece multiset, counting shared endpoints once.

Guided clues expose symbols and shared endpoints. Scholar hides some endpoints; Uninscribed exposes none. Removing clues never invalidates the original constructed arrangement. The constructed answer is used for generator verification only; the live solver receives the mask, inventory and current placements and searches afresh.


## Endless playgrounds

The repository supplies six example masks, not an exhaustive set of equation-intersection topologies. Play now treats these as six named playgrounds. `playgrounds.ts` generates fresh inventories for their exact shapes rather than recycling the original examples or applying arithmetic-invalid global number substitutions.

For each seeded round, enumerate positive integer arithmetic tuples in a randomly selected range (2 through a maximum between 12 and 28). Exclude trivial identities. Shuffle tuple order using a deterministic seeded PRNG, then recursively choose the most constrained unfilled slot, enforcing agreement at every assigned intersection. At a complete assignment, collect the pieces from unique physical cells and validate the resulting puzzle. This handles shared signs as well as shared numbers. There is no pre-existing inventory to consume during construction; the solving algorithm still consumes the newly constructed inventory normally.

The seed, playground index and round number reproduce both the layout inventory and constructed arrangement. The previous-round button regenerates the same puzzle; it does not restore abandoned intermediate moves from that round. Each playground preserves its latest active arrangement when the player visits another playground or Build & solve. The original six inventories remain in a separate archive.

The constructed answer is discarded by the UI, which starts with an empty board. Hints and reveals run the ordinary worker solver. Generated puzzles may have multiple arrangements, and variation in number range is not a calibrated difficulty ranking. Continuous rounds are supported without a fixed level-list limit, but finite seeded domains do not imply infinitely many unique inventories.

## Ten ancient ranks

The rank generator first constructs a consistent arithmetic lattice using the existing crossword generator. It shuffles adjacent endpoint edges, takes a randomized Kruskal spanning tree to keep all lattice vertices connected, then adds edges up to the rank's exact equation count. Each edge occupies five cells. Shared endpoints consume a single physical piece. The selected edges are copied into the rank's rectangular canvas, with seeded placement within any spare border. This changes layout topology as well as numbers between rounds.

Equals signs, many shared endpoints, and some other symbols become fixed clues. Remaining cells are playable. Clues preserve the constructed answer but do not assert uniqueness. The UI discards that answer and uses the ordinary solver for hints and reveals. Rank index, seed and round reproduce the puzzle; independent storage keys keep classic and ranked sessions apart.

## Safe arrangement playback

The arithmetic checker rejects malformed equations, including two equals signs, without recursive reversal. Before revealing a new answer, the UI restores the original search placements and fixed clues. It validates this baseline against the selected answer, then animates only the missing pieces. It never overlays a new answer cell by cell onto a previous answer. Repeated search after an assisted reveal uses the original search placements; manual edits invalidate the old search context.
