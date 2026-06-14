import { Chess, type Square } from "chess.js";
import type { GameResult, MoveRecord, PlayerConfig, Termination } from "../types";
import type { LlmContext } from "../llm/types";
import { getAiMove } from "../llm/moveService";
import { getProvider } from "../llm/providers";
import { engine, levelById } from "./stockfish";
import { detectOpening } from "./openings";

export interface GameOutcome {
  result: GameResult;
  termination: Termination;
  moves: MoveRecord[];
  pgn: string;
  fenFinal: string;
  opening: string | null;
}

interface RunOpts {
  moveCap: number;
  onProgress?: (fen: string, ply: number) => void;
  shouldStop?: () => boolean;
}

/** İki AI rakibi tahta etkileşimi olmadan tam bir maç oynatır (turnuva için). */
export async function playHeadlessGame(
  white: PlayerConfig,
  black: PlayerConfig,
  ctx: LlmContext,
  opts: RunOpts,
): Promise<GameOutcome> {
  const chess = new Chess();
  const moves: MoveRecord[] = [];

  const finish = (result: GameResult, termination: Termination): GameOutcome => ({
    result,
    termination,
    moves,
    pgn: chess.pgn(),
    fenFinal: chess.fen(),
    opening: detectOpening(chess.history()),
  });

  while (!chess.isGameOver() && chess.history().length < opts.moveCap) {
    if (opts.shouldStop?.()) break;
    const turn = chess.turn();
    const player = turn === "w" ? white : black;
    const started = Date.now();
    let wasFallback = false;
    let retries = 0;

    try {
      if (player.provider === "stockfish") {
        const levelId = Number(player.model?.replace("level-", "")) || 3;
        const uci = await engine.bestMove(chess.fen(), levelById(levelId));
        chess.move({
          from: uci.slice(0, 2) as Square,
          to: uci.slice(2, 4) as Square,
          promotion: uci.slice(4) || undefined,
        });
      } else {
        const r = await getAiMove(
          getProvider(player.provider!),
          {
            fen: chess.fen(),
            pgn: chess.pgn(),
            legalMoves: chess.moves(),
            color: turn === "w" ? "white" : "black",
            model: player.model!,
            persona: player.systemPrompt,
          },
          ctx,
        );
        chess.move(r.san);
        wasFallback = r.wasFallback;
        retries = r.retries;
      }
    } catch {
      // Sağlayıcı ulaşılamadı → bu taraf hükmen kaybeder
      return finish(turn === "w" ? "0-1" : "1-0", "abandoned");
    }

    const hist = chess.history({ verbose: true });
    const last = hist[hist.length - 1];
    moves.push({
      ply: hist.length,
      san: last.san,
      uci: last.from + last.to + (last.promotion ?? ""),
      fen_after: chess.fen(),
      played_by: "ai",
      thinking_time_ms: Date.now() - started,
      was_fallback: wasFallback,
      retries,
    });
    opts.onProgress?.(chess.fen(), hist.length);
  }

  if (chess.isCheckmate()) return finish(chess.turn() === "w" ? "0-1" : "1-0", "checkmate");
  if (chess.isStalemate()) return finish("1/2-1/2", "stalemate");
  if (chess.isThreefoldRepetition()) return finish("1/2-1/2", "threefold");
  if (chess.isInsufficientMaterial()) return finish("1/2-1/2", "insufficient_material");
  if (chess.isDraw()) return finish("1/2-1/2", "fifty_move");
  return finish("1/2-1/2", "move_cap");
}
