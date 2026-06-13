import { Chess } from "chess.js";

export interface ParsedMove {
  san: string;
  uci: string;
  fenAfter: string;
}

const SAN_RE =
  /^(O-O(?:-O)?|0-0(?:-0)?|[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x?[a-h]?[1-8](?:=[QRBN])?)[+#]?$/;
const UCI_RE = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/i;

/** Adayı SAN ya da UCI olarak FEN üzerinde dener; yasalsa sonucu döner. */
function tryCandidate(fen: string, candidate: string): ParsedMove | null {
  const cleaned = candidate
    .replace(/[!?]+$/g, "")
    .replace(/^['"`[({]+|['"`\])}.,;:]+$/g, "")
    .replace(/0-0-0/g, "O-O-O")
    .replace(/0-0/g, "O-O")
    .trim();
  if (!cleaned || cleaned.length > 7) return null;

  // 1) SAN dene (chess.js esnek ayrıştırır: Nf3, Nf3+, e8=Q...)
  try {
    const chess = new Chess(fen);
    const move = chess.move(cleaned);
    if (move) {
      return {
        san: move.san,
        uci: move.from + move.to + (move.promotion ?? ""),
        fenAfter: chess.fen(),
      };
    }
  } catch {
    /* geçersiz SAN — UCI dene */
  }

  // 2) UCI dene (e2e4, e7e8q)
  const uciMatch = cleaned.toLowerCase().match(UCI_RE);
  if (uciMatch) {
    try {
      const chess = new Chess(fen);
      const move = chess.move({
        from: uciMatch[1],
        to: uciMatch[2],
        promotion: uciMatch[3] as "q" | "r" | "b" | "n" | undefined,
      });
      if (move) {
        return {
          san: move.san,
          uci: move.from + move.to + (move.promotion ?? ""),
          fenAfter: chess.fen(),
        };
      }
    } catch {
      /* geçersiz UCI */
    }
  }

  return null;
}

/**
 * LLM'in ham cevabından yasal bir hamle çıkarmaya çalışır.
 * Öncelik: <move>...</move> etiketi → metindeki SAN/UCI benzeri token'lar.
 */
export function parseMove(fen: string, raw: string): ParsedMove | null {
  if (!raw) return null;
  const candidates: string[] = [];

  // 1) <move>...</move> etiketi (büyük/küçük harf duyarsız, çok satırlı)
  const tagMatches = raw.matchAll(/<move>\s*([^<]+?)\s*<\/move>/gis);
  for (const m of tagMatches) candidates.push(m[1]);

  // 2) Metindeki tüm token'ları tara (düzyazı cevaplar için)
  const tokens = raw.split(/[\s,.;:()[\]{}"'`*_]+/).filter(Boolean);
  for (const tok of tokens) {
    const bare = tok.replace(/[+#!?]+$/g, "");
    if (SAN_RE.test(bare) || SAN_RE.test(tok) || UCI_RE.test(bare)) {
      candidates.push(tok);
    }
  }

  for (const candidate of candidates) {
    const result = tryCandidate(fen, candidate);
    if (result) return result;
  }
  return null;
}
