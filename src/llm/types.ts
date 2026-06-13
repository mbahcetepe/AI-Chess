import type { CustomEndpoint, ProviderId, ProviderRef } from "../types";

export interface MoveRequest {
  fen: string;
  pgn: string;
  legalMoves: string[];
  color: "white" | "black";
  model: string;
  /** Profil kişilik promptu (LLM oyun tarzı) */
  persona?: string;
  /** Retry'da: önceki cevabın neden reddedildiği */
  feedback?: string;
}

export interface LlmContext {
  apiKeys: { anthropic: string; openai: string; gemini: string };
  ollamaBaseUrl: string;
  customEndpoints: CustomEndpoint[];
  /** Ollama: derin düşünme (think açık) — güçlü ama yavaş */
  ollamaDeepThink?: boolean;
}

export interface LlmProvider {
  id: ProviderId;
  /** Hamle isteği — ham metin döner; ayrıştırma/doğrulama moveService'te */
  getMoveRaw(req: MoveRequest, ctx: LlmContext): Promise<string>;
  /** Genel tamamlama (maç raporu üretimi için) */
  getCompletion(
    system: string,
    user: string,
    model: string,
    ctx: LlmContext,
    maxTokens?: number,
  ): Promise<string>;
}

/** Ağ/kimlik hatası — illegal hamleden farklı ele alınır (fallback YOK, kullanıcıya hata) */
export class ProviderUnreachableError extends Error {
  constructor(
    public providerId: ProviderRef,
    message: string,
  ) {
    super(message);
    this.name = "ProviderUnreachableError";
  }
}
