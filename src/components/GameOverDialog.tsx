import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../store/gameStore";
import { useT } from "../i18n/strings";

interface GameOverDialogProps {
  onNewGame: () => void;
  onRematch: () => void;
}

export default function GameOverDialog({ onNewGame, onRematch }: GameOverDialogProps) {
  const t = useT();
  const navigate = useNavigate();
  const status = useGameStore((s) => s.status);
  const result = useGameStore((s) => s.result);
  const termination = useGameStore((s) => s.termination);
  const gameId = useGameStore((s) => s.gameId);
  const [dismiss, setDismiss] = useState(false);

  // Yeni oyun başlayınca (over değilse) dismiss sıfırla
  useEffect(() => {
    if (status !== "over") setDismiss(false);
  }, [status]);

  if (status !== "over" || result === null || dismiss) return null;

  const resultText =
    result === "1-0" ? t("result.whiteWins")
    : result === "0-1" ? t("result.blackWins")
    : result === "1/2-1/2" ? t("result.draw")
    : t("term.abandoned");
  const termText = termination ? t(`term.${termination}` as Parameters<typeof t>[0]) : "";

  return (
    <div className="overlay" onClick={() => setDismiss(true)}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h2 style={{ margin: 0 }}>{t("result.title")}</h2>
          <button className="icon-btn" onClick={() => setDismiss(true)}>✕</button>
        </div>
        <div className="result-big">{resultText}</div>
        {termText && <div className="result-sub">{termText}</div>}
        <div className="dialog-actions" style={{ flexWrap: "wrap" }}>
          {gameId !== null && <button onClick={() => navigate(`/replay/${gameId}`)}>{t("history.replay")}</button>}
          <button onClick={onRematch}>↺ {t("game.rematch")}</button>
          <button className="primary" onClick={onNewGame}>{t("game.newGame")}</button>
        </div>
      </div>
    </div>
  );
}
