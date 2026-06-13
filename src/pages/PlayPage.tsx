import { useEffect, useMemo, useRef, useState } from "react";
import type { Square } from "chess.js";
import type { GameMode } from "../types";
import Board, { type BoardArrow } from "../components/Board";
import EvalBar from "../components/EvalBar";
import GameOverDialog from "../components/GameOverDialog";
import GameSetupDialog from "../components/GameSetupDialog";
import MoveList from "../components/MoveList";
import PlayerPanel from "../components/PlayerPanel";
import PromotionDialog from "../components/PromotionDialog";
import WelcomeScreen from "../components/WelcomeScreen";
import { useGameStore } from "../store/gameStore";
import { useSettingsStore } from "../store/settingsStore";
import { engine } from "../engine/stockfish";
import { detectOpening } from "../engine/openings";
import { capturedFromFen, kingSquare } from "../chessUtils";
import { sounds } from "../sound";
import { useT } from "../i18n/strings";

export default function PlayPage() {
  const t = useT();
  const game = useGameStore();
  const showHints = useSettingsStore((s) => s.showHints);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupMode, setSetupMode] = useState<GameMode | undefined>(undefined);
  const [setupPrefer, setSetupPrefer] = useState<"engine" | "ai" | undefined>(undefined);
  const [liveEval, setLiveEval] = useState<number | null>(null);
  const [hintArrow, setHintArrow] = useState<BoardArrow | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const evalReqId = useRef(0);

  const turn = game.chess.turn();
  const gameRunning = game.status === "playing";
  const showWelcome = game.status === "idle" && !setupOpen;

  // Canlı değerlendirme çubuğu (motor sırayla işler)
  useEffect(() => {
    if (game.status === "idle") {
      setLiveEval(null);
      return;
    }
    const id = ++evalReqId.current;
    engine
      .evaluate(game.fen, 10)
      .then((r) => {
        if (evalReqId.current === id) setLiveEval(r.mate != null ? (r.mate > 0 ? 99000 : -99000) : r.cp);
      })
      .catch(() => {});
  }, [game.fen, game.status]);

  // Hamle değişince ipucu okunu temizle
  useEffect(() => setHintArrow(null), [game.fen]);

  // Saat tıkırtısı
  useEffect(() => {
    if (!game.clockEnabled || !gameRunning) return;
    const id = setInterval(() => game.tickClock(250), 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.clockEnabled, gameRunning, game.fen]);

  // Klavye: ESC setup kapat, ← geri al
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && setupOpen) setSetupOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setupOpen]);

  const checkSquare = useMemo(() => {
    if (game.status === "idle" || !game.chess.inCheck()) return null;
    return kingSquare(game.chess, turn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.fen, game.status]);

  const captured = useMemo(() => capturedFromFen(game.fen), [game.fen]);

  // Etkin yönelim: temel + manuel çevirme
  const baseOrientation: "white" | "black" =
    game.mode === "human_vs_ai" && game.players.b.type === "human" ? "black" : "white";
  const orientation: "white" | "black" =
    game.flipped !== (baseOrientation === "black") ? "black" : "white";

  const humanCanAct = gameRunning && !game.aiThinking && game.players[turn].type === "human";

  const requestHint = async () => {
    if (hintLoading) return;
    setHintLoading(true);
    try {
      const r = await engine.evaluate(game.fen, 12);
      if (r.bestMoveUci) {
        setHintArrow({ from: r.bestMoveUci.slice(0, 2), to: r.bestMoveUci.slice(2, 4), color: "#3aa757" });
      }
    } catch {
      /* yok say */
    } finally {
      setHintLoading(false);
    }
  };

  const openSetup = (mode?: GameMode, prefer?: "engine" | "ai") => {
    setSetupMode(mode);
    setSetupPrefer(prefer);
    setSetupOpen(true);
  };

  const topPanel = (which: "top" | "bottom") => {
    const isWhite = (which === "bottom") === (orientation === "white");
    const color = isWhite ? "w" : "b";
    return (
      <PlayerPanel
        color={color}
        player={color === "w" ? game.players.w : game.players.b}
        accumulatedMs={color === "w" ? game.whiteMs : game.blackMs}
        remainMs={color === "w" ? game.whiteRemainMs : game.blackRemainMs}
        clockEnabled={game.clockEnabled}
        isTurn={gameRunning && turn === color}
        isThinking={game.aiThinking && turn === color}
        turnStartedAt={game.turnStartedAt}
        gameRunning={gameRunning}
        captured={color === "w" ? captured.byWhite : captured.byBlack}
        advantage={captured.advantage}
      />
    );
  };

  if (showWelcome) {
    return (
      <>
        <WelcomeScreen onNewGame={(m, prefer) => openSetup(m, prefer)} />
        <GameSetupDialog
          open={setupOpen}
          initialMode={setupMode}
          initialPrefer={setupPrefer}
          onClose={() => setSetupOpen(false)}
          onStart={(mode, white, black, fen) => {
            setSetupOpen(false);
            void game.startGame(mode, white, black, fen);
          }}
        />
      </>
    );
  }

  return (
    <div className="play-layout">
      <div className="board-area">
        <EvalBar cp={liveEval} orientation={orientation} />
        <div className="board-column">
          {topPanel("top")}
          <div className="board-wrap">
            <Board
              fen={game.fen}
              interactive={humanCanAct}
              orientation={orientation}
              selected={game.selected}
              legalTargets={game.legalTargets}
              lastMove={game.lastMove}
              checkSquare={checkSquare}
              showHints={showHints}
              arrows={hintArrow ? [hintArrow] : []}
              onSquareClick={(sq) => game.selectSquare(sq as Square)}
              onDrop={(from, to) => game.attemptMove(from as Square, to as Square)}
              canDrag={(sq) => {
                if (!sq || !humanCanAct) return false;
                const piece = game.chess.get(sq as Square);
                return !!piece && piece.color === turn;
              }}
            />
          </div>
          {topPanel("bottom")}
        </div>
      </div>

      <div className="side-column">
        <div className="side-header">
          <h3 style={{ margin: 0 }}>{t("game.moves")}</h3>
          {gameRunning && game.chess.inCheck() && <span className="check-badge">{t("game.check")}</span>}
        </div>
        {(() => {
          const op = detectOpening(game.chess.history());
          return op ? <div className="opening-pill">📖 {op}</div> : null;
        })()}
        <MoveList moves={game.moves} />

        <div className="game-controls">
          {gameRunning && game.mode === "ai_vs_ai" && (
            <>
              <button onClick={() => game.setAiPaused(!game.aiPaused)}>
                {game.aiPaused ? t("game.resume") : t("game.pause")}
              </button>
              <button className="danger" onClick={() => game.stopGame()}>{t("game.stop")}</button>
            </>
          )}
          {gameRunning && game.mode !== "ai_vs_ai" && (
            <>
              <button onClick={() => { sounds.click(); game.takeback(); }} disabled={game.moves.length === 0}>
                ↶ {t("game.takeback")}
              </button>
              <button onClick={requestHint} disabled={!humanCanAct || hintLoading}>
                💡 {hintLoading ? t("game.hintThinking") : t("game.hint")}
              </button>
              <button onClick={() => game.endDraw()}>½ {t("game.draw")}</button>
              <button className="danger" onClick={() => {
                const humanColor =
                  game.players.w.type === "human" && game.players.b.type === "human" ? turn
                  : game.players.w.type === "human" ? "w" : "b";
                game.resign(humanColor);
              }}>{t("game.resign")}</button>
            </>
          )}
          <button onClick={() => { sounds.click(); game.toggleFlip(); }}>⇅ {t("game.flip")}</button>
        </div>

        {game.aiError && (
          <div className="error-box">
            <div>{t("error.providerUnreachable")}</div>
            <div className="error-detail">{game.aiError}</div>
            <button onClick={() => game.retryAi()}>{t("error.retry")}</button>
          </div>
        )}

        {game.status === "over" && (
          <button className="primary" onClick={() => openSetup()} style={{ marginTop: "auto" }}>
            {t("game.newGame")}
          </button>
        )}
      </div>

      <GameSetupDialog
        open={setupOpen}
        initialMode={setupMode}
        initialPrefer={setupPrefer}
        onClose={() => setSetupOpen(false)}
        onStart={(mode, white, black, fen) => {
          setSetupOpen(false);
          void game.startGame(mode, white, black, fen);
        }}
      />
      <PromotionDialog />
      {!setupOpen && <GameOverDialog onNewGame={() => openSetup()} onRematch={() => void game.rematch()} />}
    </div>
  );
}
