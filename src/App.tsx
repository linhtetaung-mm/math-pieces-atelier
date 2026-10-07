import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  Eraser,
  Expand,
  FlaskConical,
  Grid2X2,
  Landmark,
  Lightbulb,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import {
  type Cell,
  type Piece,
  type Puzzle,
  available,
  counts,
  glyph,
  key,
  slots,
  solved,
  validEquation,
  validate,
} from "./puzzle/model";
import { generate, levels } from "./puzzle/levels";
import { generateRank, ranks, runKey } from "./puzzle/ranks";
import { revealBaseline } from "./puzzle/reveal";
import PlaygroundMap from "./PlaygroundMap";
import { generateRound, playgrounds, type Run } from "./puzzle/playgrounds";
import { type Result } from "./puzzle/solver";
type Mode = "play" | "lab" | "god";
type Session = {
  puzzle: Puzzle;
  board: Cell[];
  givens: Cell[];
  undo: Cell[][];
  assisted: boolean;
  run?: Run;
};
const empty = (p: Puzzle): Cell[] => Array(p.mask.length).fill(null);
const make = (p: Puzzle, givens = empty(p)): Session => ({
  puzzle: p,
  board: [...givens],
  givens: [...givens],
  undo: [],
  assisted: false,
});
function stored(name: string, fallback: Session): Session {
  try {
    const data = JSON.parse(localStorage.getItem(name) || "null");
    if (data) {
      validate(data.puzzle, data.board);
      validate(data.puzzle, data.givens);
      if (
        data.givens.some(
          (v: Cell, i: number) => v !== null && v !== data.board[i],
        )
      )
        return fallback;
      return { ...data, undo: [] };
    }
  } catch {
    /* Storage is optional. */
  }
  return fallback;
}
function freshPlayground(
  index: number,
  round = 1,
  seed = Math.floor(Math.random() * 4294967296),
): Session {
  const run = { playground: index, round, seed };
  return { ...make(generateRound(run).puzzle), run };
}
function freshRank(
  index: number,
  round = 1,
  seed = Math.floor(Math.random() * 4294967296),
): Session {
  const run = { playground: 0, rank: index, round, seed };
  const g = generateRank(run);
  return { ...make(g.puzzle, g.givens), run };
}
function savedPlaygrounds(): Record<string, Session> {
  try {
    const data = JSON.parse(
      localStorage.getItem("math-pieces-playgrounds") || "{}",
    );
    const valid: Record<string, Session> = {};
    for (const [k, v] of Object.entries(data)) {
      const s = v as Session;
      validate(s.puzzle, s.board);
      validate(s.puzzle, s.givens);
      if (
        s.run &&
        k === runKey(s.run) &&
        Number.isSafeInteger(s.run.round) &&
        s.run.round > 0 &&
        (s.run.rank === undefined
          ? !!levels[s.run.playground]
          : !!ranks[s.run.rank]) &&
        s.givens.every((v, i) => v === null || v === s.board[i])
      )
        valid[k] = { ...s, undo: [] };
    }
    return valid;
  } catch {
    return {};
  }
}
function parsePieces(text: string): Piece[] {
  return text
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((token) => {
      const t = token.replace("×", "*").replace("÷", "/").replace("−", "-");
      if (["+", "-", "*", "/", "="].includes(t)) return t as Piece;
      if (/^-?\d+$/.test(t) && Number.isSafeInteger(Number(t)))
        return Number(t);
      throw new Error(
        `Unrecognized piece: ${token}. Use integers or + − × ÷ =.`,
      );
    });
}
function download(session: Session) {
  const url = URL.createObjectURL(
    new Blob(
      [
        JSON.stringify(
          { ...session.puzzle, board: session.board, givens: session.givens },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "math-pieces.json";
  a.click();
  URL.revokeObjectURL(url);
}
export default function App() {
  const [mode, setMode] = useState<Mode>("play");
  const [level, setLevel] = useState(() =>
    Math.max(
      0,
      levels.findIndex(
        (p) =>
          p.name === stored("math-pieces-play", make(levels[0])).puzzle.name,
      ),
    ),
  );
  const [play, setPlay] = useState(() =>
    stored("math-pieces-play", freshPlayground(0)),
  );
  const [shelves, setShelves] = useState(savedPlaygrounds);
  const [collectionTab, setCollectionTab] = useState<
    "ranks" | "endless" | "original"
  >("ranks");
  const [cellInput, setCellInput] = useState("");
  const [lab, setLab] = useState(() =>
    stored("math-pieces-lab", make(levels[0])),
  );
  const [god, setGod] = useState(() => {
    const g = generate(4, 2);
    return stored("math-pieces-god", make(g.puzzle, g.givens));
  });
  const session = mode === "play" ? play : mode === "lab" ? lab : god;
  const setSession =
    mode === "play" ? setPlay : mode === "lab" ? setLab : setGod;
  const { puzzle, board, givens } = session;
  const [selected, setSelected] = useState<number | null>(null);
  const [picked, setPicked] = useState<Piece | null>(null);
  const [checked, setChecked] = useState(false);
  const [notice, setNotice] = useState("");
  const [help, setHelp] = useState(false);
  const [collection, setCollection] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [budget, setBudget] = useState(10);
  const [drawing, setDrawing] = useState(false);
  const [inventory, setInventory] = useState(
    levels[0].pieces.map(glyph).join(" "),
  );
  const [dimensions, setDimensions] = useState({ rows: 5, cols: 5 });
  const [godSize, setGodSize] = useState(
    () => `${(god.puzzle.cols - 1) / 4},${(god.puzzle.rows - 1) / 4}`,
  );
  const [clueStyle, setClueStyle] = useState("guided");
  const [json, setJson] = useState("");
  const [replay, setReplay] = useState<Cell[] | null>(null);
  const [paused, setPaused] = useState(false);
  const worker = useRef<Worker | null>(null);
  const searchOrigin = useRef<Cell[] | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (mode === "lab")
      setCellInput(
        selected === null || board[selected] === null
          ? ""
          : glyph(board[selected]!),
      );
  }, [selected, board, mode]);
  const latest = useRef(session);
  latest.current = session;
  useEffect(() => {
    for (const [name, s] of [
      ["play", play],
      ["lab", lab],
      ["god", god],
    ] as const) {
      try {
        localStorage.setItem(
          `math-pieces-${name}`,
          JSON.stringify({ ...s, undo: [] }),
        );
      } catch {
        /* Private browsers may disable storage. */
      }
    }
  }, [play, lab, god]);
  useEffect(() => {
    if (play.run)
      setShelves((s) => ({
        ...s,
        [runKey(play.run!)]: { ...play, undo: [] },
      }));
  }, [play]);
  useEffect(() => {
    try {
      localStorage.setItem("math-pieces-playgrounds", JSON.stringify(shelves));
    } catch {}
  }, [shelves]);
  useEffect(() => () => worker.current?.terminate(), []);
  useEffect(() => {
    if (!help && !collection) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHelp(false);
        setCollection(false);
      }
      if (e.key === "Tab") {
        const nodes = [
          ...document.querySelectorAll<HTMLElement>(
            ".modal button:not(:disabled), .modal a[href]",
          ),
        ];
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [help, collection]);
  function stop(clear = false) {
    worker.current?.terminate();
    worker.current = null;
    setBusy(false);
    setReplay(null);
    setPaused(false);
    if (clear) {
      setResult(null);
      setSolutionIndex(0);
      searchOrigin.current = null;
    }
  }
  function changeMode(m: Mode) {
    stop(true);
    setMode(m);
    setPicked(null);
    setSelected(null);
    setNotice("");
    setChecked(false);
    setDrawing(false);
    if (m === "lab") {
      setInventory(lab.puzzle.pieces.map(glyph).join(" "));
      setDimensions({ rows: lab.puzzle.rows, cols: lab.puzzle.cols });
    }
  }
  function commit(next: Cell[], assisted = session.assisted) {
    stop(true);
    setChecked(false);
    setNotice("");
    setSession((s) => ({
      ...s,
      board: next,
      undo: [...s.undo.slice(-99), s.board],
      assisted,
    }));
  }
  const bank = available(puzzle, board);
  const bankCounts = counts(bank);
  const uniqueBank = [...new Map(bank.map((p) => [key(p), p])).values()].sort(
    (a, b) =>
      typeof a === "number" && typeof b === "number"
        ? a - b
        : typeof a === "number"
          ? -1
          : typeof b === "number"
            ? 1
            : 0,
  );
  let equations: ReturnType<typeof slots> = [],
    layoutError = "";
  try {
    equations = slots(puzzle);
  } catch (e) {
    layoutError = (e as Error).message;
  }
  const complete = solved(puzzle, board);
  const correct = equations.filter((s) =>
    validEquation(s.cells.map((i) => board[i])),
  ).length;
  const related = new Set(
    equations
      .filter((s) => selected !== null && s.cells.includes(selected))
      .flatMap((s) => s.cells),
  );
  function place(id: number, value: Piece) {
    if (givens[id] !== null) {
      setNotice("This inscription is fixed. Choose an empty stone.");
      return;
    }
    const next = [...board];
    next[id] = null;
    if (!available(puzzle, next).some((p) => p === value)) {
      setNotice("All pieces of this value are already on the board.");
      return;
    }
    next[id] = value;
    commit(next);
    setPicked(null);
    setSelected(id);
  }
  function chooseCell(id: number) {
    if (drawing && mode === "lab") {
      stop(true);
      const mask = [...puzzle.mask];
      mask[id] = mask[id] ? 0 : 1;
      setLab((s) => ({
        ...s,
        puzzle: { ...s.puzzle, mask },
        board: empty(s.puzzle),
        givens: empty(s.puzzle),
        undo: [],
      }));
      setSelected(null);
      return;
    }
    if (picked !== null) place(id, picked);
    else setSelected(id);
  }
  function choosePiece(piece: Piece) {
    if (selected !== null && givens[selected] === null) place(selected, piece);
    else {
      setPicked(piece);
      setNotice("Choose a stone on the manuscript to place this piece.");
    }
  }
  function remove(id = selected) {
    if (id === null || givens[id] !== null || board[id] === null) return;
    const next = [...board];
    next[id] = null;
    commit(next);
  }
  function reset() {
    stop(true);
    setSession((s) => ({
      ...s,
      board: [...s.givens],
      undo: [],
      assisted: false,
    }));
    setChecked(false);
    setNotice("The manuscript is ready for a fresh start.");
    setSelected(null);
    setPicked(null);
  }
  function loadLevel(i: number) {
    stop(true);
    setLevel(i);
    setPlay(make(levels[i]));
    setSelected(null);
    setPicked(null);
    setChecked(false);
    setNotice("");
    setCollection(false);
  }
  function loadPlayground(index: number, next = false, previous = false) {
    stop(true);
    setLevel(index);
    const current =
      play.run?.rank === undefined && play.run?.playground === index
        ? play
        : shelves[index];
    const run = current?.run;
    const session =
      next || previous
        ? freshPlayground(
            index,
            Math.max(1, (run?.round || 0) + (previous ? -1 : 1)),
            run?.seed,
          )
        : current || freshPlayground(index);
    setPlay(session);
    setSelected(null);
    setPicked(null);
    setChecked(false);
    setNotice("");
    setCollection(false);
  }
  function loadRank(index: number, next = false, previous = false) {
    stop(true);
    const current = play.run?.rank === index ? play : shelves[`rank:${index}`];
    const run = current?.run;
    setPlay(
      next || previous
        ? freshRank(
            index,
            Math.max(1, (run?.round || 0) + (previous ? -1 : 1)),
            run?.seed,
          )
        : current || freshRank(index),
    );
    setSelected(null);
    setPicked(null);
    setChecked(false);
    setNotice("");
    setCollection(false);
  }
  function advancePlay(previous = false) {
    if (play.run?.rank !== undefined)
      loadRank(play.run.rank, !previous, previous);
    else if (play.run || !previous)
      loadPlayground(play.run?.playground ?? level, !previous, previous);
    else loadLevel(Math.max(0, level - 1));
  }
  function startReveal(
    answer: Cell[],
    origin = searchOrigin.current || givens,
  ) {
    try {
      const baseline = revealBaseline(puzzle, answer, origin, givens);
      setSession((s) => ({
        ...s,
        board: baseline,
        undo: [...s.undo.slice(-99), s.board],
        assisted: true,
      }));
      setReplay([...answer]);
      setPaused(false);
      setSelected(null);
      setPicked(null);
      setChecked(false);
      setNotice("");
    } catch (e) {
      setNotice((e as Error).message);
      setReplay(null);
    }
  }
  function search(kind: "solve" | "hint" | "reveal") {
    const input =
      kind === "solve" &&
      result?.solutions.length &&
      session.assisted &&
      searchOrigin.current
        ? [...searchOrigin.current]
        : [...board];
    stop(true);
    setNotice("");
    setDrawing(false);
    try {
      validate(puzzle, input);
    } catch (e) {
      setNotice((e as Error).message);
      return;
    }
    const w = new Worker(
      new URL("./puzzle/solver.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.current = w;
    setBusy(true);
    w.onerror = () => {
      if (worker.current !== w) return;
      stop();
      setNotice("The solver could not finish. Please try again.");
    };
    w.onmessage = (event: MessageEvent<Result>) => {
      if (worker.current !== w) return;
      const r = event.data;
      w.terminate();
      worker.current = null;
      setBusy(false);
      searchOrigin.current = [...input];
      setResult(r);
      setSolutionIndex(0);
      if (kind === "reveal" && r.solutions.length)
        startReveal(r.solutions[0], input);
      if (kind === "hint" && r.solutions.length) {
        const current = latest.current;
        const id = current.puzzle.mask.findIndex(
          (v, i) => v && current.board[i] === null,
        );
        if (id >= 0) {
          const next = [...current.board];
          next[id] = r.solutions[0][id];
          setSession((s) => ({
            ...s,
            board: next,
            undo: [...s.undo, s.board],
            assisted: true,
          }));
          setSelected(id);
          setNotice(
            `One fitting piece: ${glyph(next[id]!)}. It belongs to a complete valid arrangement.`,
          );
        } else
          setNotice(
            "All stones are filled. Check the equations or remove a piece.",
          );
      }
    };
    w.postMessage({
      puzzle,
      board: input,
      budget: mode === "play" ? 10000 : budget * 1000,
    });
  }
  function reveal() {
    const answer = result?.solutions[solutionIndex];
    if (answer) startReveal(answer);
    else setNotice("Choose an available arrangement before revealing.");
  }
  useEffect(() => {
    if (!replay || paused) return;
    const id = puzzle.mask.findIndex((v, i) => v && board[i] !== replay[i]);
    if (id < 0) {
      setReplay(null);
      return;
    }
    const timer = setTimeout(
      () => {
        setSession((s) => {
          const next = [...s.board];
          next[id] = replay[id];
          return { ...s, board: next, assisted: true };
        });
        setSelected(id);
      },
      mode === "god" || puzzle.pieces.length > 60 ? 35 : 160,
    );
    return () => clearTimeout(timer);
  }, [replay, paused, board, puzzle, mode]);
  function check() {
    setChecked(true);
    setNotice(
      complete
        ? "Beautifully balanced. Every equation is true and every piece has found its place."
        : `${correct} of ${equations.length} equations are true. ${bank.length} pieces remain. Completed incorrect equations are marked in terracotta.`,
    );
  }
  function updateInventory() {
    try {
      const pieces = parsePieces(inventory);
      stop(true);
      setLab((s) => ({
        ...s,
        puzzle: { ...s.puzzle, pieces },
        board: empty(s.puzzle),
        givens: empty(s.puzzle),
        undo: [],
      }));
      setNotice(
        `${pieces.length} pieces prepared. Your layout has ${puzzle.mask.filter(Boolean).length} open cells.`,
      );
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  function resize() {
    const { rows, cols } = dimensions;
    if (
      !Number.isInteger(rows) ||
      !Number.isInteger(cols) ||
      rows < 1 ||
      cols < 1 ||
      rows > 33 ||
      cols > 33
    ) {
      setNotice("Choose dimensions between 1 and 33.");
      return;
    }
    stop(true);
    const p = {
      name: "Your inscription",
      rows,
      cols,
      mask: Array(rows * cols).fill(0),
      pieces: [],
    };
    setLab(make(p));
    setInventory("");
    setDrawing(true);
    setSelected(null);
    setNotice(
      "Click cells to carve your layout. Each run must have 5, 9, 13… cells.",
    );
  }
  function importJSON(text: string) {
    try {
      const data = JSON.parse(text);
      const p: Puzzle = {
        name: typeof data.name === "string" ? data.name : "Imported manuscript",
        rows: data.rows,
        cols: data.cols,
        mask: data.mask,
        pieces: data.pieces,
      };
      const next = data.board || empty(p);
      validate(p, next);
      const g = data.givens || empty(p);
      validate(p, g);
      if (g.some((v: Cell, i: number) => v !== null && next[i] !== v))
        throw new Error("Fixed clues must match the placements.");
      stop(true);
      setLab({ ...make(p, g), board: next });
      setInventory(p.pieces.map(glyph).join(" "));
      setDimensions({ rows: p.rows, cols: p.cols });
      setDrawing(false);
      setNotice("Manuscript imported and validated.");
      setSelected(null);
    } catch (e) {
      setNotice(`Import failed: ${(e as Error).message}`);
    }
  }
  function godGenerate(size = godSize) {
    const [w, h] = size.split(",").map(Number);
    const g = generate(w, h);
    const clues =
      clueStyle === "guided"
        ? g.givens
        : clueStyle === "scholar"
          ? g.givens.map((v) =>
              typeof v === "number" && Math.random() > 0.35 ? null : v,
            )
          : empty(g.puzzle);
    stop(true);
    setGod(make(g.puzzle, clues));
    setSelected(null);
    setPicked(null);
    setChecked(false);
    setNotice(
      "A new connected manuscript, with a guaranteed valid arrangement.",
    );
  }
  function keyboard(event: React.KeyboardEvent, id: number) {
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      remove(id);
    }
    if (event.key === "Escape") {
      setPicked(null);
      setSelected(null);
    }
    const delta = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -puzzle.cols,
      ArrowDown: puzzle.cols,
    }[event.key];
    if (delta !== undefined) {
      event.preventDefault();
      let next = id + delta;
      while (next >= 0 && next < board.length) {
        if (
          Math.abs(delta) === 1 &&
          Math.floor(next / puzzle.cols) !== Math.floor(id / puzzle.cols)
        )
          break;
        if (puzzle.mask[next] || drawing) {
          document.getElementById(`cell-${mode}-${next}`)?.focus();
          setSelected(next);
          break;
        }
        next += delta;
      }
    }
  }
  const original = levels.findIndex(
    (p) =>
      p.name === play.puzzle.name &&
      JSON.stringify(p.mask) === JSON.stringify(play.puzzle.mask) &&
      JSON.stringify(p.pieces.map(key).sort()) ===
        JSON.stringify(play.puzzle.pieces.map(key).sort()),
  );
  const heading =
    mode === "play"
      ? "A little order. A little wonder."
      : mode === "lab"
        ? "Every puzzle begins with a question."
        : "A manuscript without limits.";
  return (
    <div
      className={`app ${mode === "god" ? "god-view" : mode === "lab" ? "lab-view" : "play-view"}`}
    >
      <header className="site-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            changeMode("play");
          }}
        >
          <span className="brand-icon">
            <Landmark size={25} />
          </span>
          <span>
            <span className="wordmark">
              MATH <b>PIECES</b>
            </span>
            <small>THE ART OF BALANCE</small>
          </span>
        </a>
        <nav aria-label="Game modes">
          {(
            [
              ["play", "Play", Grid2X2],
              ["lab", "Build & solve", FlaskConical],
              ["god", "God mode", Expand],
            ] as const
          ).map(([m, label, Icon]) => (
            <button
              key={m}
              className={mode === m ? "active" : ""}
              onClick={() => changeMode(m)}
            >
              <Icon size={16} />
              {label}
              {m === "god" && <span className="new-dot" />}
            </button>
          ))}
        </nav>
        <button className="help-link" onClick={() => setHelp(true)}>
          <CircleHelp size={17} />
          <span>How to play</span>
        </button>
      </header>
      <main>
        {mode === "play" && (
          <section className="hero">
            <div
              className="hero-art"
              role="img"
              aria-label="A classical courtyard with scrolls and a marble mathematician bust"
            />
            <div className="hero-copy">
              <div className="eyebrow">
                <span /> A PLAYGROUND FOR THE CURIOUS MIND
              </div>
              <h1>{heading}</h1>
              <p>
                Numbers are the pieces. Balance is the art.
                <br />
                Arrange each fragment until every equation finds its truth.
              </p>
              <div className="hero-foot">
                <span>Ⅰ</span> INSPIRED BY ANCIENT MINDS. MADE FOR YOURS.
              </div>
            </div>
            <span className="mural-credit">THE COURTYARD OF IDEAS</span>
          </section>
        )}
        {mode === "lab" && (
          <section className="lab-intro">
            <div>
              <div className="eyebrow">THE SOLVER ATELIER</div>
              <h1>A workbench for your ideas.</h1>
              <p>Draw a layout. Supply the fragments. Discover what fits.</p>
            </div>
            <span className="lab-intro-mark">
              <FlaskConical size={42} />
            </span>
            <div className="lab-steps">
              <span>
                <b>01</b> Draw
              </span>
              <ArrowRight size={15} />
              <span>
                <b>02</b> Enter pieces
              </span>
              <ArrowRight size={15} />
              <span>
                <b>03</b> Solve
              </span>
            </div>
          </section>
        )}
        {mode === "play" && (
          <section className="playground-ribbon">
            <div>
              <div className="eyebrow">
                TEN ANCIENT RANKS. ENDLESS CLASSICS.
              </div>
              <p>
                {play.run
                  ? play.run.rank === undefined
                    ? playgrounds[play.run.playground].description
                    : ranks[play.run.rank].description
                  : "Choose a favourite shape and keep discovering."}
              </p>
            </div>
            <button
              onClick={() => {
                setCollectionTab("ranks");
                setCollection(true);
              }}
            >
              <Grid2X2 size={16} /> Choose your path <ArrowUpRight size={15} />
            </button>
          </section>
        )}
        {mode === "god" && (
          <div className="god-heading">
            <div>
              <div className="eyebrow">THE GREAT MANUSCRIPT</div>
              <h1>{heading}</h1>
            </div>
            <button className="text-button" onClick={() => changeMode("play")}>
              <X size={16} /> Exit God mode
            </button>
          </div>
        )}
        <div className="workspace-top">
          <div className="workspace-title">
            <span className="section-number">
              {mode === "play" ? "01" : mode === "lab" ? "02" : "∞"}
            </span>
            <div>
              <div className="eyebrow">
                {mode === "play"
                  ? play.run
                    ? play.run.rank === undefined
                      ? "YOUR ENDLESS PLAYGROUND"
                      : `ANCIENT RANK ${play.run.rank + 1} / 10`
                    : original >= 0
                      ? "AN ORIGINAL FRAGMENT"
                      : "YOUR CUSTOM PUZZLE"
                  : mode === "lab"
                    ? "CARVE · ARRANGE · DISCOVER"
                    : "A CONNECTED ARITHMETIC CROSSWORD"}
              </div>
              <h2>
                {mode === "lab"
                  ? "The layout"
                  : mode === "play" && play.run
                    ? play.run.rank === undefined
                      ? playgrounds[play.run.playground].title
                      : ranks[play.run.rank].title
                    : puzzle.name}
              </h2>
            </div>
          </div>
          {mode === "play" ? (
            <div className="level-controls">
              <button
                aria-label="Previous puzzle"
                disabled={play.run ? play.run.round <= 1 : level === 0}
                onClick={() => advancePlay(true)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="level-label"
                onClick={() => setCollection(true)}
              >
                {play.run ? (
                  <>
                    Puzzle {play.run.round} <span> / ∞</span>
                  </>
                ) : original >= 0 ? (
                  <>Original {[1, 2, 3, 13, 28, 29][original]}</>
                ) : (
                  <>Custom inscription</>
                )}
                <Grid2X2 size={14} />
              </button>
              <button className="new-puzzle" onClick={() => advancePlay()}>
                <Sparkles size={14} /> New puzzle <ChevronRight size={14} />
              </button>
            </div>
          ) : mode === "god" ? (
            <div className="level-controls">
              <select
                aria-label="Manuscript size"
                value={godSize}
                onChange={(e) => setGodSize(e.target.value)}
              >
                <option value="3,2">13 × 9 · Courtyard</option>
                <option value="4,2">17 × 9 · Gallery</option>
                <option value="5,3">21 × 13 · Library</option>
                <option value="7,4">29 × 17 · Pantheon</option>
              </select>
              <select
                aria-label="Clue style for new manuscript"
                value={clueStyle}
                onChange={(e) => setClueStyle(e.target.value)}
              >
                <option value="guided">Guided · fixed intersections</option>
                <option value="scholar">Scholar · fewer clues</option>
                <option value="free">Uninscribed · all pieces free</option>
              </select>
              <button className="text-button" onClick={() => godGenerate()}>
                <RotateCcw size={15} /> New manuscript
              </button>
            </div>
          ) : (
            <div className="level-controls">
              <button
                className="text-button"
                onClick={() => {
                  try {
                    validate(puzzle, board);
                    setPlay({ ...session, undo: [] });
                    changeMode("play");
                    setNotice("Your manuscript is now ready to play.");
                  } catch (e) {
                    setNotice((e as Error).message);
                  }
                }}
              >
                <Play size={15} /> Play this puzzle
              </button>
            </div>
          )}
        </div>
        {mode === "play" && play.run?.rank !== undefined && (
          <div className="rank-note">
            <span className="rank-seal">
              {String(play.run.rank + 1).padStart(2, "0")}
            </span>
            <span>
              {ranks[play.run.rank].equations} connected equations ·{" "}
              {puzzle.rows} × {puzzle.cols} board. Dotted inscriptions are fixed
              clues; arrange every remaining fragment.
            </span>
          </div>
        )}
        {mode === "lab" && (
          <section className="editor-tools">
            <div>
              <label>Board dimensions</label>
              <div className="inline-inputs">
                <input
                  type="number"
                  aria-label="Rows"
                  min="1"
                  max="33"
                  value={dimensions.rows}
                  onChange={(e) =>
                    setDimensions((d) => ({
                      ...d,
                      rows: Number(e.target.value),
                    }))
                  }
                />
                <span>×</span>
                <input
                  type="number"
                  aria-label="Columns"
                  min="1"
                  max="33"
                  value={dimensions.cols}
                  onChange={(e) =>
                    setDimensions((d) => ({
                      ...d,
                      cols: Number(e.target.value),
                    }))
                  }
                />
                <button onClick={resize}>Create layout</button>
              </div>
            </div>
            <div>
              <label htmlFor="pieces">
                All physical pieces <small>include pieces already placed</small>
              </label>
              <div className="inline-inputs">
                <input
                  id="pieces"
                  value={inventory}
                  onChange={(e) => setInventory(e.target.value)}
                  placeholder="2 3 5 + ="
                />
                <button onClick={updateInventory}>Set pieces</button>
              </div>
            </div>
            <button
              className={`text-button ${drawing ? "chosen" : ""}`}
              onClick={() => {
                setDrawing(!drawing);
                setSelected(null);
              }}
            >
              <Eraser size={16} />
              {drawing ? "Finish carving" : "Edit layout"}
            </button>
          </section>
        )}
        <div
          className={`workspace ${mode === "play" && play.run?.rank !== undefined ? "rank-workspace" : ""}`}
        >
          <section className={`board-panel ${complete ? "completed" : ""}`}>
            <div className="board-top">
              <span>
                <span className={`status-dot ${complete ? "green" : ""}`} />
                {complete
                  ? "BALANCE ACHIEVED"
                  : drawing
                    ? "CARVING THE MANUSCRIPT"
                    : mode === "lab"
                      ? "LAYOUT CANVAS"
                      : "THE MANUSCRIPT"}
              </span>
              <span>
                {puzzle.rows} × {puzzle.cols} <i /> {equations.length} equations
              </span>
            </div>
            <div className="board-scroll">
              <div
                className={`board ${mode === "god" ? "grand-board" : mode === "play" && play.run?.rank !== undefined ? "ranked-board" : ""} ${drawing ? "drawing" : ""}`}
                role="group"
                aria-label="Arithmetic puzzle board"
                style={
                  {
                    "--cols": puzzle.cols,
                    "--rows": puzzle.rows,
                  } as React.CSSProperties
                }
              >
                {puzzle.mask.map((open, id) => {
                  const value = board[id],
                    fixed = givens[id] !== null;
                  const lines = equations.filter((s) => s.cells.includes(id));
                  const bad =
                    checked &&
                    lines.some(
                      (s) =>
                        s.cells.every((i) => board[i] !== null) &&
                        !validEquation(s.cells.map((i) => board[i])),
                    );
                  const good = lines.some((s) =>
                    validEquation(s.cells.map((i) => board[i])),
                  );
                  return open || drawing ? (
                    <button
                      key={id}
                      id={`cell-${mode}-${id}`}
                      className={`stone ${!open ? "blocked" : ""} ${value !== null ? "filled" : ""} ${typeof value === "string" ? "symbol" : ""} ${fixed ? "fixed" : ""} ${id === selected ? "selected" : ""} ${related.has(id) ? "related" : ""} ${bad ? "bad" : good ? "good" : ""}`}
                      aria-label={`Row ${Math.floor(id / puzzle.cols) + 1}, column ${(id % puzzle.cols) + 1}, ${value === null ? (open ? "empty" : "blocked") : glyph(value)}${fixed ? ", fixed clue" : ""}`}
                      aria-pressed={id === selected}
                      onClick={() => chooseCell(id)}
                      onDoubleClick={() => remove(id)}
                      onKeyDown={(e) => keyboard(e, id)}
                      draggable={value !== null && !fixed && !drawing}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          "text/plain",
                          JSON.stringify({ piece: value, from: id }),
                        );
                      }}
                      onDragOver={(e) => {
                        if (!fixed && !drawing) e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (fixed || drawing) return;
                        try {
                          const { piece, from } = JSON.parse(
                            e.dataTransfer.getData("text/plain"),
                          );
                          if (from !== undefined) {
                            if (
                              from === id ||
                              givens[from] !== null ||
                              board[from] !== piece
                            )
                              return;
                            const next = [...board];
                            [next[id], next[from]] = [next[from], next[id]];
                            commit(next);
                            setSelected(id);
                          } else place(id, piece);
                        } catch {
                          /* Ignore external drops. */
                        }
                      }}
                    >
                      {value === null ? (
                        <span className="stone-dot" />
                      ) : (
                        <span className="stone-value">{glyph(value)}</span>
                      )}
                      {fixed && <span className="fixed-mark">•</span>}
                    </button>
                  ) : (
                    <div key={id} className="void-cell" aria-hidden="true">
                      <span>·</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="board-instruction">
              {drawing ? (
                <>
                  <Eraser size={14} /> Click a cell to carve or close it.
                </>
              ) : complete ? (
                <>
                  <Check size={15} /> Every fragment has found its truth.
                  {session.assisted ? " · Assisted" : ""}
                </>
              ) : (
                <>
                  <ArrowDown size={14} />{" "}
                  {mode === "lab"
                    ? "Select a cell to enter a placement or fix a clue."
                    : "Select a stone, then choose a piece. Drag to place or swap."}
                </>
              )}
            </div>
            <div className="board-actions">
              <div>
                <button
                  disabled={!session.undo.length || busy || !!replay}
                  onClick={() => {
                    stop(true);
                    setSession((s) => ({
                      ...s,
                      board: s.undo[s.undo.length - 1],
                      undo: s.undo.slice(0, -1),
                    }));
                    setChecked(false);
                  }}
                >
                  <Undo2 size={16} />
                  <span>Undo</span>
                </button>
                <button
                  disabled={
                    selected === null ||
                    givens[selected] !== null ||
                    board[selected] === null
                  }
                  onClick={() => remove()}
                >
                  <Eraser size={16} />
                  <span>Remove</span>
                </button>
                <button onClick={reset}>
                  <RotateCcw size={16} />
                  <span>Reset</span>
                </button>
                {mode === "lab" && (
                  <button
                    disabled={selected === null || board[selected] === null}
                    onClick={() => {
                      if (selected === null) return;
                      stop(true);
                      setLab((s) => {
                        const clues = [...s.givens];
                        clues[selected] =
                          clues[selected] === null ? s.board[selected] : null;
                        return { ...s, givens: clues, undo: [] };
                      });
                    }}
                  >
                    <BookOpen size={16} />
                    <span>
                      {selected !== null && givens[selected] !== null
                        ? "Free clue"
                        : "Fix clue"}
                    </span>
                  </button>
                )}
              </div>
              <button
                className="primary"
                onClick={
                  mode === "lab"
                    ? () => {
                        try {
                          const lines = validate(puzzle, board);
                          setNotice(
                            `Valid setup: ${lines.length} equations, ${puzzle.pieces.length} pieces. Ready to solve.`,
                          );
                        } catch (e) {
                          setNotice((e as Error).message);
                        }
                      }
                    : check
                }
                disabled={!!layoutError || drawing}
              >
                <Check size={16} />{" "}
                {mode === "lab" ? "Validate setup" : "Check balance"}
              </button>
            </div>
          </section>
          {mode !== "lab" ? (
            <aside className="pieces-panel">
              <div className="pieces-heading">
                <div>
                  <div className="eyebrow">YOUR MATERIALS</div>
                  <h3>The fragments</h3>
                </div>
                <span className="count-pill">{bank.length} left</span>
              </div>
              <p>
                Each piece has a place.
                <br />
                Shared stones serve both equations.
              </p>
              <div className="bank-label">
                NUMBERS{" "}
                <span>{bank.filter((p) => typeof p === "number").length}</span>
              </div>
              <div className="piece-bank">
                {uniqueBank
                  .filter((p) => typeof p === "number")
                  .map((p) => (
                    <button
                      key={key(p)}
                      className={`bank-stone ${picked === p ? "picked" : ""}`}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData(
                          "text/plain",
                          JSON.stringify({ piece: p }),
                        )
                      }
                      onClick={() => choosePiece(p)}
                      aria-label={`Place ${glyph(p)}, ${bankCounts.get(key(p))} available`}
                    >
                      <span>{glyph(p)}</span>
                      {(bankCounts.get(key(p)) || 0) > 1 && (
                        <small>×{bankCounts.get(key(p))}</small>
                      )}
                    </button>
                  ))}
              </div>
              <div className="bank-label">
                SYMBOLS{" "}
                <span>{bank.filter((p) => typeof p !== "number").length}</span>
              </div>
              <div className="piece-bank symbols">
                {uniqueBank
                  .filter((p) => typeof p !== "number")
                  .map((p) => (
                    <button
                      key={key(p)}
                      className={`bank-stone ${picked === p ? "picked" : ""}`}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData(
                          "text/plain",
                          JSON.stringify({ piece: p }),
                        )
                      }
                      onClick={() => choosePiece(p)}
                      aria-label={`Place ${glyph(p)}, ${bankCounts.get(key(p))} available`}
                    >
                      <span>{glyph(p)}</span>
                      {(bankCounts.get(key(p)) || 0) > 1 && (
                        <small>×{bankCounts.get(key(p))}</small>
                      )}
                    </button>
                  ))}
              </div>
              {bank.length === 0 && (
                <div className="empty-bank">
                  <Sparkles size={22} />
                  {complete
                    ? "A beautiful arrangement."
                    : "All pieces placed. Check the balance."}
                </div>
              )}
              <div className="balance-progress">
                <span>
                  EQUATIONS IN BALANCE{" "}
                  <strong>
                    {correct} / {equations.length}
                  </strong>
                </span>
                <div>
                  <i
                    style={{
                      width: `${equations.length ? (correct / equations.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <button
                className="hint-button"
                disabled={busy || complete || drawing || !!layoutError}
                onClick={() => search("hint")}
              >
                <Lightbulb size={17} /> A little guidance{" "}
                <ArrowUpRight size={15} />
              </button>
              <small className="bank-foot">
                A hint continues your current arrangement.
              </small>
            </aside>
          ) : (
            <aside className="lab-inspector">
              <div className="eyebrow">CONSTRAINT INSPECTOR</div>
              <h3>The equation ledger</h3>
              <p>
                Across and down, each line is a constraint. Existing placements
                are respected by the solver.
              </p>
              <div className="cell-editor">
                <label htmlFor="cell-value">
                  {selected === null
                    ? "Select a cell on the canvas"
                    : `Row ${Math.floor(selected / puzzle.cols) + 1}, column ${(selected % puzzle.cols) + 1}`}
                </label>
                <div>
                  <input
                    id="cell-value"
                    aria-label="Selected cell value"
                    placeholder="Number or sign"
                    value={cellInput}
                    disabled={selected === null || drawing}
                    onChange={(e) => setCellInput(e.target.value)}
                  />
                  <button
                    disabled={selected === null || !cellInput.trim() || drawing}
                    onClick={() => {
                      try {
                        const p = parsePieces(cellInput);
                        if (p.length !== 1)
                          throw new Error("Enter one number or symbol.");
                        if (selected !== null) place(selected, p[0]);
                      } catch (e) {
                        setNotice((e as Error).message);
                      }
                    }}
                  >
                    Place
                  </button>
                </div>
                <small>
                  Place a known piece, then use Fix clue to preserve it.
                </small>
              </div>
              <ol className="equation-ledger">
                {equations.map((eq, i) => (
                  <li key={i}>
                    <span>
                      {eq.direction === "across" ? (
                        <ArrowRight size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )}{" "}
                      {i + 1}
                    </span>
                    <code>
                      {eq.cells
                        .map((id) =>
                          board[id] === null ? "·" : glyph(board[id]!),
                        )
                        .join(" ")}
                    </code>
                    <span
                      className={
                        validEquation(eq.cells.map((id) => board[id]))
                          ? "ledger-true"
                          : ""
                      }
                    >
                      {validEquation(eq.cells.map((id) => board[id]))
                        ? "True"
                        : eq.cells.some((id) => board[id] === null)
                          ? "Open"
                          : "Conflict"}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="lab-summary">
                <span>
                  Open cells <b>{puzzle.mask.filter(Boolean).length}</b>
                </span>
                <span>
                  Physical pieces <b>{puzzle.pieces.length}</b>
                </span>
                <span>
                  Unplaced pieces <b>{bank.length}</b>
                </span>
              </div>
              <p className="lab-note">
                Pieces are entered above as a complete inventory. Placements are
                optional. You can search a blank layout.
              </p>
            </aside>
          )}
        </div>
        {mode === "play" && (
          <div className="play-assistance">
            {busy ? (
              <button
                onClick={() => {
                  stop();
                  setNotice("Guidance cancelled.");
                }}
              >
                <X size={14} /> Cancel guidance
              </button>
            ) : replay ? (
              <>
                <button onClick={() => setPaused((v) => !v)}>
                  {paused ? <Play size={14} /> : <Pause size={14} />}{" "}
                  {paused ? "Resume reveal" : "Pause reveal"}
                </button>
                <button onClick={() => stop()}>
                  <X size={14} /> Stop reveal
                </button>
              </>
            ) : (
              !complete && (
                <button
                  disabled={!!layoutError}
                  onClick={() => search("reveal")}
                >
                  <BookOpen size={15} /> See a solution
                </button>
              )
            )}
            {complete && (
              <div className="next-discovery">
                <span>
                  <Sparkles size={18} /> Balance found. Another discovery
                  awaits.
                </span>
                <button className="primary" onClick={() => advancePlay()}>
                  Next puzzle <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        <div
          className={`feedback ${notice || layoutError ? "visible" : ""}`}
          role="status"
          aria-live="polite"
        >
          {notice || layoutError}
        </div>
        {mode !== "play" && (
          <section className="solver-strip">
            <div className="solver-intro">
              <span className="solver-emblem">
                <FlaskConical size={22} />
              </span>
              <div>
                <h3>
                  {mode === "lab"
                    ? "Search the possibilities."
                    : "Let reason lead the way."}
                </h3>
                <p>
                  {mode === "lab"
                    ? "Find arrangements that fit your layout and pieces."
                    : "Your equation-first idea, taken a little further."}
                </p>
              </div>
            </div>
            <div className="solver-controls">
              <label>
                Search budget{" "}
                <select
                  aria-label="Search time budget"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                >
                  <option value="3">3 seconds</option>
                  <option value="10">10 seconds</option>
                  <option value="30">30 seconds</option>
                </select>
              </label>
              {busy ? (
                <button
                  className="secondary"
                  onClick={() => {
                    stop();
                    setNotice(
                      "Search cancelled. Your arrangement is preserved.",
                    );
                  }}
                >
                  <X size={16} /> Cancel search
                </button>
              ) : (
                <button
                  className="secondary"
                  disabled={drawing || !!layoutError || !!replay}
                  onClick={() => search("solve")}
                >
                  <Sparkles size={16} />{" "}
                  {mode === "lab" ? "Solve this puzzle" : "Find an arrangement"}{" "}
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </section>
        )}
        {busy && (
          <div className="search-status" role="status">
            <LoaderCircle size={16} className="spin" /> Matching equations,
            intersections, and remaining pieces…
          </div>
        )}
        {mode === "play" && result && result.status !== "solved" && (
          <div className="feedback visible" role="status">
            {result.message} Try removing a piece or starting again.
          </div>
        )}
        {mode !== "play" && result && (
          <section className="result-panel" aria-live="polite">
            <div>
              <div className="eyebrow">
                {result.status === "solved"
                  ? "AN ARRANGEMENT DISCOVERED"
                  : result.status === "impossible"
                    ? "PROVEN IMPOSSIBLE"
                    : result.status === "timeout"
                      ? "TIME LIMIT REACHED"
                      : "CHECK THE MANUSCRIPT"}
              </div>
              <p>{result.message}</p>
              <small>
                {result.states.toLocaleString()} search states ·{" "}
                {result.elapsed.toFixed(1)} ms
                {result.solutions.length > 0 &&
                  ` · Arrangement ${solutionIndex + 1} of ${result.solutions.length}`}
              </small>
            </div>
            <div className="result-actions">
              {result.solutions.length > 1 && (
                <button
                  onClick={() => {
                    setReplay(null);
                    setPaused(false);
                    setSelected(null);
                    setSolutionIndex((i) => (i + 1) % result.solutions.length);
                  }}
                >
                  Other arrangement
                </button>
              )}
              {result.solutions.length > 0 &&
                (replay ? (
                  <>
                    <button onClick={() => setPaused((v) => !v)}>
                      {paused ? <Play size={15} /> : <Pause size={15} />}{" "}
                      {paused ? "Resume" : "Pause"}
                    </button>
                    <button
                      onClick={() => {
                        setReplay(null);
                        setPaused(false);
                      }}
                    >
                      Stop reveal
                    </button>
                  </>
                ) : (
                  <button className="primary" onClick={reveal}>
                    <Play size={15} /> Reveal arrangement
                  </button>
                ))}
            </div>
          </section>
        )}
        {mode === "lab" && (
          <section className="import-panel">
            <div>
              <div className="eyebrow">KEEP YOUR DISCOVERIES</div>
              <h3>A manuscript worth sharing.</h3>
              <p>
                Import a layout, or use Fix clue to inscribe a placed piece.
                <br />
                Or export your current arrangement to continue another time.
              </p>
              <div className="inline-inputs">
                <button onClick={() => download(session)}>
                  <Download size={15} /> Export JSON
                </button>
                <button onClick={() => fileRef.current?.click()}>
                  Import file
                </button>
                <button
                  onClick={() => {
                    stop(true);
                    setLab(make(play.puzzle));
                    setInventory(play.puzzle.pieces.map(glyph).join(" "));
                    setDimensions({
                      rows: play.puzzle.rows,
                      cols: play.puzzle.cols,
                    });
                    setDrawing(false);
                  }}
                >
                  Use play layout
                </button>
              </div>
              <input
                type="file"
                accept=".json,application/json"
                ref={fileRef}
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) importJSON(await file.text());
                  e.target.value = "";
                }}
              />
            </div>
            <div>
              <textarea
                aria-label="Puzzle JSON"
                value={json}
                onChange={(e) => setJson(e.target.value)}
                placeholder={
                  'Paste puzzle JSON here…\n{ "rows": 1, "cols": 5,\n  "mask": [1,1,1,1,1],\n  "pieces": [2,"+",3,"=",5] }'
                }
              />
              <button onClick={() => importJSON(json)} disabled={!json.trim()}>
                Import manuscript <ArrowRight size={14} />
              </button>
            </div>
          </section>
        )}
        {mode === "play" && (
          <section className="principles">
            <div>
              <span>Ⅰ</span>
              <h4>Make it true.</h4>
              <p>
                Every row and column of five
                <br />
                forms a complete equation.
              </p>
            </div>
            <div>
              <span>Ⅱ</span>
              <h4>Find the connection.</h4>
              <p>
                At an intersection, one piece
                <br />
                belongs to two ideas.
              </p>
            </div>
            <div>
              <span>Ⅲ</span>
              <h4>Leave nothing behind.</h4>
              <p>
                Use every physical fragment,
                <br />
                exactly once.
              </p>
            </div>
            <button onClick={() => setHelp(true)}>
              The art of balance <ArrowUpRight size={17} />
            </button>
          </section>
        )}
      </main>
      <footer>
        <span>
          <Landmark size={14} /> AN OLD IDEA. A NEW WAY TO PLAY.
        </span>
        <span>
          Original puzzle & solving instinct by{" "}
          <a
            href="https://github.com/linhtetaung-mm/Math-Pieces"
            target="_blank"
            rel="noreferrer"
          >
            Lin Htet Aung
          </a>
          <span className="footer-symbols">+ − × ÷ =</span>
        </span>
      </footer>
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              autoFocus
              onClick={() => setHelp(false)}
              aria-label="Close help"
            >
              <X size={20} />
            </button>
            <div className="eyebrow">THE ART OF BALANCE</div>
            <h2 id="help-title">A few first principles.</h2>
            <p>
              <strong>Ancient ranks:</strong> ten endless paths with
              progressively larger boards and more equations. Intersections and
              some signs are fixed inscriptions, while remaining pieces must be
              arranged. All ranks are available immediately.{" "}
              <strong>Endless classics:</strong> choose one of six playgrounds,
              then use New puzzle or Next puzzle for fresh equations in that
              shape. You can return to the latest puzzle in each playground. The
              Original fragments tab keeps the six supplied examples. These are
              six examples, not the only possible equation layouts.
            </p>
            <p>
              Fill every open stone using the supplied numbers and symbols. Each
              five-cell equation, read left to right or top to bottom, must be
              true.
            </p>
            <div className="example-equation">
              2 <span>+</span> 3 <span>=</span> 5
            </div>
            <p>
              Equations can also read <strong>5 = 2 + 3</strong>. Subtraction
              and division follow their written order. Division by zero is
              forbidden; all pieces are integers, including zero and negative
              numbers when provided.
            </p>
            <p>
              Intersecting equations share one physical piece. Repeated values
              are separate pieces: the small “×2” on a fragment means two copies
              are available.
            </p>
            <p>
              Select a board cell, then a fragment. You can also select a
              fragment first, or drag it onto a cell. Drag a placed stone to
              swap it with another. Double-click, or press Delete on a stone, to
              return it. Arrow keys navigate the board.
            </p>
            <p>
              Hints and the solver respect your current placements. If no
              continuation exists, undo or remove a piece.{" "}
              <strong>Reset</strong> returns to the fixed clues. All valid
              solutions count; uniqueness is not assumed.
            </p>
            <p>
              <strong>Solver atelier:</strong> carve a rectangular layout, enter
              every piece, and search. Long runs of 9, 13… cells form equations
              sharing their endpoints. <strong>God Mode:</strong> choose a grand
              connected crossword. Guided mode fixes intersections and signs;
              Scholar leaves fewer number clues; Uninscribed lets you arrange
              every piece. Your clue selection applies to the next new
              manuscript. Large unconstrained boards can exceed the search
              budget. Dotted inscriptions are fixed clues.
            </p>
            <div className="historical-note">
              <BookOpen size={19} />
              <span>
                This atelier celebrates the history of mathematical thought. The
                fresco is an imagined scholar, not a historical portrait. Modern
                +, −, ×, ÷ and = notation developed over centuries, long after
                ancient Greek mathematics.
              </span>
            </div>
            <button className="primary" onClick={() => setHelp(false)}>
              Let’s find the balance <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
      {collection && (
        <div className="modal-backdrop" onClick={() => setCollection(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="collection-title"
            className="modal collection playground-collection"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              autoFocus
              onClick={() => setCollection(false)}
              aria-label="Close collection"
            >
              <X size={20} />
            </button>
            <div className="eyebrow">CLASSIC SHAPES · ANCIENT RANKS</div>
            <h2 id="collection-title">Choose your path.</h2>
            <p>
              Ten ancient ranks grow in size and connections. Or return to six
              endless classic shapes. Each path keeps its latest puzzle for you.
            </p>
            <div className="collection-tabs">
              <button
                className={collectionTab === "ranks" ? "active" : ""}
                onClick={() => setCollectionTab("ranks")}
              >
                Ancient ranks <span>10</span>
              </button>
              <button
                className={collectionTab === "endless" ? "active" : ""}
                onClick={() => setCollectionTab("endless")}
              >
                Endless classics <span>∞</span>
              </button>
              <button
                className={collectionTab === "original" ? "active" : ""}
                onClick={() => setCollectionTab("original")}
              >
                Original fragments <span>6</span>
              </button>
            </div>
            {collectionTab === "ranks" ? (
              <div className="playground-grid rank-grid">
                {ranks.map((rank, i) => {
                  const preview = generateRank({
                    rank: i,
                    playground: 0,
                    round: 1,
                    seed: 2026,
                  }).puzzle;
                  const saved = shelves[`rank:${i}`];
                  return (
                    <button
                      key={rank.title}
                      className={`playground-card rank-card ${play.run?.rank === i ? "current" : ""}`}
                      onClick={() => loadRank(i)}
                    >
                      <div className="playground-card-top">
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <small>
                          {saved?.run
                            ? `Continue · ${saved.run.round}`
                            : "Endless puzzles"}
                        </small>
                      </div>
                      <PlaygroundMap puzzle={preview} />
                      <strong>{rank.title}</strong>
                      <small>
                        {rank.rows} × {rank.cols} · {rank.equations} equations
                      </small>
                      <span className="playground-card-action">
                        {saved ? "Continue your journey" : "Enter this rank"}{" "}
                        <ArrowRight size={14} />
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="playground-grid">
                {levels.map((p, i) => (
                  <button
                    key={p.name}
                    className={`playground-card ${play.run?.rank === undefined && i === level ? "current" : ""}`}
                    onClick={() =>
                      collectionTab === "endless"
                        ? loadPlayground(i)
                        : loadLevel(i)
                    }
                  >
                    <div className="playground-card-top">
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <small>
                        {collectionTab === "endless"
                          ? shelves[i]?.run
                            ? `Continue · ${shelves[i].run!.round}`
                            : "Endless play"
                          : `Original level ${[1, 2, 3, 13, 28, 29][i]}`}
                      </small>
                    </div>
                    <PlaygroundMap puzzle={p} />
                    <strong>
                      {collectionTab === "endless"
                        ? playgrounds[i].title
                        : p.name}
                    </strong>
                    <small>
                      {collectionTab === "endless"
                        ? playgrounds[i].description
                        : `${p.pieces.length} original fragments`}
                    </small>
                    <span className="playground-card-action">
                      {collectionTab === "endless"
                        ? shelves[i]
                          ? "Continue playing"
                          : "Enter playground"
                        : "Play original"}{" "}
                      <ArrowRight size={14} />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
