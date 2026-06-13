import { Chess } from "chess.js";
import { parseMove, type ParsedMove } from "./parseMove";
import { ProviderUnreachableError, type LlmContext, type LlmProvider, type MoveRequest } from "./types";

export interface AiMoveResult extends ParsedMove {
  retries: number;
  wasFallback: boolean;
  rawResponse: string;
  thinkingTimeMs: number;
}

const MAX_ATTEMPTS = 4;

/**
 * Sağlayıcıdan yasal bir hamle alma döngüsü:
 * dene → ayrıştır → doğrula → (geçersizse feedback ile tekrar) → fallback.
 *
 * - Geçersiz/ayrıştırılamayan cevaplar feedback ile MAX_ATTEMPTS kez yeniden denenir;
 *   hepsi başarısızsa yasal listeden rastgele hamle seçilir (wasFallback=true) — oyun takılmaz.
 * - TÜM denemeler ağ hatasıysa ProviderUnreachableError fırlatılır (sessiz fallback yok).
 */
export async function getAiMove(
  provider: LlmProvider,
  request: Omit<MoveRequest, "feedback">,
  ctx: LlmContext,
): Promise<AiMoveResult> {
  const started = Date.now();
  let feedback: string | undefined;
  let lastRaw = "";
  let networkErrors = 0;
  let lastNetworkError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let raw: string;
    try {
      raw = await provider.getMoveRaw({ ...request, feedback }, ctx);
    } catch (err) {
      networkErrors++;
      lastNetworkError = err instanceof Error ? err : new Error(String(err));
      continue;
    }

    lastRaw = raw;
    const parsed = parseMove(request.fen, raw);
    if (parsed) {
      return {
        ...parsed,
        retries: attempt - 1,
        wasFallback: false,
        rawResponse: raw,
        thinkingTimeMs: Date.now() - started,
      };
    }

    const snippet = raw.slice(0, 120).replace(/\s+/g, " ").trim();
    feedback = `Your answer "${snippet}" did not contain a legal move from the list.`;
  }

  // Hiç cevap alınamadıysa (hepsi ağ hatası) → kullanıcıya hata göster
  if (networkErrors === MAX_ATTEMPTS) {
    throw new ProviderUnreachableError(
      provider.id,
      lastNetworkError?.message ?? "provider unreachable",
    );
  }

  // Cevaplar geldi ama hiçbiri yasal değildi → rastgele yasal hamle (oyun takılmasın)
  const fallbackSan = request.legalMoves[Math.floor(Math.random() * request.legalMoves.length)];
  const chess = new Chess(request.fen);
  const move = chess.move(fallbackSan);
  return {
    san: move.san,
    uci: move.from + move.to + (move.promotion ?? ""),
    fenAfter: chess.fen(),
    retries: MAX_ATTEMPTS,
    wasFallback: true,
    rawResponse: lastRaw,
    thinkingTimeMs: Date.now() - started,
  };
}
