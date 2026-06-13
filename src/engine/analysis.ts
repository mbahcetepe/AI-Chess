import { Chess } from "chess.js";
import { engine } from "./stockfish";
import { bookDepth } from "./openings";
import type { MoveQuality, MoveRecord } from "../types";

export interface AnalyzedMove {
  ply: number;
  evalCp: number; // beyaz lehine, hamleden SONRA
  quality: MoveQuality;
}

export interface GameAnalysis {
  moves: AnalyzedMove[];
  whiteAccuracy: number;
  blackAccuracy: number;
}

/** Santipiyon → kazanma yüzdesi (hamleyi yapan taraf perspektifi). */
function winPercent(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/** Lichess tarzı tek hamle doğruluğu. */
function moveAccuracy(winBefore: number, winAfter: number): number {
  const acc = 103.1668 * Math.exp(-0.04354 * (winBefore - winAfter)) - 3.1669;
  return Math.max(0, Math.min(100, acc));
}

function classify(cpLoss: number, isBook: boolean): MoveQuality {
  if (isBook) return "book";
  if (cpLoss <= 15) return "best";
  if (cpLoss <= 50) return "good";
  if (cpLoss <= 120) return "inaccuracy";
  if (cpLoss <= 250) return "mistake";
  return "blunder";
}

/**
 * Maçı baştan oynatıp her hamleyi tam güçte değerlendirir.
 * onProgress: 0..1 ilerleme (UI göstergesi için).
 */
export async function analyzeGame(
  moves: MoveRecord[],
  depth: number,
  onProgress?: (done: number, total: number) => void,
): Promise<GameAnalysis> {
  const chess = new Chess();
  const sanSoFar: string[] = [];
  const analyzed: AnalyzedMove[] = [];
  const whiteAccs: number[] = [];
  const blackAccs: number[] = [];

  for (let i = 0; i < moves.length; i++) {
    const rec = moves[i];
    const fenBefore = chess.fen();
    const moverIsWhite = chess.turn() === "w";
    const book = i < bookDepth(sanSoFar.concat(rec.san));

    // Hamleden önceki en iyi değerlendirme (hamleyi yapan perspektifi)
    const before = await engine.evaluate(fenBefore, depth);
    const bestCpMover = moverIsWhite ? before.cp : -before.cp;

    chess.move(rec.san);
    sanSoFar.push(rec.san);
    const fenAfter = chess.fen();

    // Hamleden sonraki değerlendirme; rakip sırada → o perspektiften çevir
    const after = await engine.evaluate(fenAfter, depth);
    const afterCpMover = moverIsWhite ? after.cp : -after.cp;

    const cpLoss = Math.max(0, bestCpMover - afterCpMover);
    const quality = classify(cpLoss, book);

    const winBefore = winPercent(bestCpMover);
    const winAfter = winPercent(afterCpMover);
    const acc = book ? 100 : moveAccuracy(winBefore, winAfter);
    if (moverIsWhite) whiteAccs.push(acc);
    else blackAccs.push(acc);

    analyzed.push({ ply: rec.ply, evalCp: after.cp, quality });
    onProgress?.(i + 1, moves.length);
  }

  const mean = (arr: number[]) =>
    arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 100;

  return {
    moves: analyzed,
    whiteAccuracy: mean(whiteAccs),
    blackAccuracy: mean(blackAccs),
  };
}
