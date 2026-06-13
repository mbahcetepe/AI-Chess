import type { PvLine } from "../engine/stockfish";
import { formatEval, pvToSan } from "../chessUtils";
import { useT } from "../i18n/strings";

interface AnalysisPanelProps {
  fen: string;
  lines: PvLine[];
  loading: boolean;
}

export default function AnalysisPanel({ fen, lines, loading }: AnalysisPanelProps) {
  const t = useT();
  return (
    <div className="analysis-panel">
      <div className="muted-small" style={{ fontWeight: 700 }}>
        {t("analysis.title")} {loading && <span className="spin">⏳</span>}
      </div>
      {lines.length === 0 ? (
        <div className="muted-small">…</div>
      ) : (
        lines.map((l) => (
          <div className="analysis-line" key={l.rank}>
            <span className={`analysis-score ${l.cp >= 0 ? "pos" : "neg"}`}>
              {formatEval(l.cp, l.mate)}
            </span>
            <span className="analysis-moves">{pvToSan(fen, l.movesUci, 8)}</span>
          </div>
        ))
      )}
    </div>
  );
}
