import { type CSSProperties } from "react";
import { type Puzzle } from "./puzzle/model";
export default function PlaygroundMap({ puzzle }: { puzzle: Puzzle }) {
  return (
    <div
      className="playground-map"
      aria-hidden="true"
      style={
        {
          gridTemplateColumns: `repeat(${puzzle.cols},1fr)`,
          "--map-cols": puzzle.cols,
        } as CSSProperties
      }
    >
      {puzzle.mask.map((v, i) => (
        <i key={i} className={v ? "open" : ""} />
      ))}
    </div>
  );
}
