import type { MoveRecord } from "../types";
import { evalToWhiteShare } from "../chessUtils";

interface EvalGraphProps {
  moves: MoveRecord[];
  currentPly: number;
  onSelectPly: (ply: number) => void;
}

/** Maç boyunca değerlendirmenin (beyaz lehine) alan grafiği. */
export default function EvalGraph({ moves, currentPly, onSelectPly }: EvalGraphProps) {
  const W = 100;
  const H = 40;
  const withEval = moves.filter((m) => m.eval_cp != null);
  if (withEval.length === 0) return null;

  const n = moves.length;
  const pts = moves.map((m, i) => {
    const share = evalToWhiteShare(m.eval_cp ?? 0); // 0..1 beyaz
    const x = (i / Math.max(1, n - 1)) * W;
    const y = (1 - share) * H; // beyaz üstte
    return { x, y };
  });

  const areaPath =
    `M 0 ${H} ` + pts.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ") + ` L ${W} ${H} Z`;
  const linePath = "M " + pts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" L ");
  const curX = n > 1 ? ((currentPly - 1) / (n - 1)) * W : 0;

  return (
    <svg
      className="eval-graph"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      onClick={(e) => {
        const rect = (e.target as SVGElement).closest("svg")!.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        onSelectPly(Math.round(ratio * (n - 1)) + 1);
      }}
    >
      <rect x="0" y="0" width={W} height={H} fill="var(--board-dark)" opacity="0.25" />
      <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="var(--fg-muted)" strokeWidth="0.3" opacity="0.5" />
      <path d={areaPath} fill="var(--accent)" opacity="0.25" />
      <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="0.7" />
      {currentPly > 0 && <line x1={curX} y1="0" x2={curX} y2={H} stroke="var(--danger)" strokeWidth="0.6" />}
    </svg>
  );
}
