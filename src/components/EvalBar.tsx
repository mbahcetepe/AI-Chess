import { evalToWhiteShare, formatEval } from "../chessUtils";

interface EvalBarProps {
  cp: number | null | undefined;
  orientation: "white" | "black";
}

/** Dikey değerlendirme çubuğu: beyaz altta (orientation white) üstünlüğü gösterir. */
export default function EvalBar({ cp, orientation }: EvalBarProps) {
  const whiteShare = evalToWhiteShare(cp);
  // orientation black ise görsel olarak ters çevir
  const whitePct = (orientation === "white" ? whiteShare : 1 - whiteShare) * 100;
  const label = formatEval(cp);
  const whiteWinning = (cp ?? 0) >= 0;

  return (
    <div className="eval-bar" title={`Değerlendirme: ${label}`}>
      <div className="eval-white" style={{ height: `${whitePct}%` }} />
      <span className={`eval-label ${whiteWinning ? "on-white" : "on-black"}`}>{label}</span>
    </div>
  );
}
