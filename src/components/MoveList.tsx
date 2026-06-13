import { useEffect, useRef } from "react";
import type { MoveRecord } from "../types";
import { useT } from "../i18n/strings";

interface MoveListProps {
  moves: MoveRecord[];
  /** Replay'de vurgulanan yarım hamle (1 tabanlı); -1 = vurgusuz, son hamle vurgulanır */
  currentPly?: number;
  onSelectPly?: (ply: number) => void;
}

export default function MoveList({ moves, currentPly, onSelectPly }: MoveListProps) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const highlighted = currentPly ?? moves.length;

  useEffect(() => {
    const el = ref.current?.querySelector("[data-active='true']");
    el?.scrollIntoView({ block: "nearest" });
  }, [highlighted, moves.length]);

  if (moves.length === 0) {
    return <div className="movelist-empty">{t("game.noMoves")}</div>;
  }

  const rows: { num: number; white?: MoveRecord; black?: MoveRecord }[] = [];
  for (const m of moves) {
    const num = Math.ceil(m.ply / 2);
    if (m.ply % 2 === 1) {
      rows.push({ num, white: m });
    } else {
      const row = rows[rows.length - 1];
      if (row && row.num === num) row.black = m;
      else rows.push({ num, black: m });
    }
  }

  const QUALITY_MARK: Record<string, string> = {
    blunder: "??", mistake: "?", inaccuracy: "?!", best: "", good: "", book: "",
  };
  const cell = (m?: MoveRecord) =>
    m ? (
      <button
        className={`move-cell ${m.quality ? `q-${m.quality}` : ""}`}
        data-active={m.ply === highlighted}
        onClick={() => onSelectPly?.(m.ply)}
        title={m.was_fallback ? t("game.fallbackNote") : undefined}
      >
        {m.san}
        {m.quality && QUALITY_MARK[m.quality] ? QUALITY_MARK[m.quality] : ""}
        {m.was_fallback ? " ⚠" : ""}
      </button>
    ) : (
      <span className="move-cell" />
    );

  return (
    <div className="movelist" ref={ref}>
      {rows.map((row) => (
        <div className="move-row" key={row.num}>
          <span className="move-num">{row.num}.</span>
          {cell(row.white)}
          {cell(row.black)}
        </div>
      ))}
    </div>
  );
}
