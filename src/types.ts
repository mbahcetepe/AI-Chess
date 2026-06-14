/** Yerleşik sağlayıcılar. Custom uç noktalar `custom:<uuid>` biçiminde referans edilir. */
export type ProviderId = "anthropic" | "openai" | "gemini" | "ollama" | "stockfish" | "mock";
/** Oyuncu için kullanılan sağlayıcı referansı: yerleşik id veya "custom:<uuid>" */
export type ProviderRef = ProviderId | `custom:${string}`;

export type PlayerType = "human" | "ai";
export type GameMode = "human_vs_ai" | "ai_vs_ai" | "human_vs_human";
export type GameResult = "1-0" | "0-1" | "1/2-1/2" | "*";
export type ThemeId = "classic" | "modern";
export type Language = "tr" | "en";

export type Termination =
  | "checkmate"
  | "stalemate"
  | "resignation"
  | "threefold"
  | "fifty_move"
  | "insufficient_material"
  | "draw_agreement"
  | "timeout"
  | "move_cap"
  | "abandoned";

export interface PlayerConfig {
  type: PlayerType;
  provider?: ProviderRef;
  model?: string;
  /** İnsan oyuncunun adı (nickname) veya AI profil adı */
  name?: string;
  /** Profil görseli/kişiliği (AI profilinden gelir) */
  emoji?: string;
  color?: string;
  rating?: number;
  /** LLM'e eklenen kişilik promptu (Stockfish'te yok sayılır) */
  systemPrompt?: string;
}

/** chess.com botları gibi: bir modele bağlı, isim+avatar+kişilikli rakip. */
export interface OpponentProfile {
  id: string; // "profile:<uuid>"
  name: string;
  emoji: string;
  color: string; // hex
  provider: ProviderRef;
  model: string;
  systemPrompt: string; // kişilik/oyun tarzı (LLM'ler için)
  rating: number; // gösterim amaçlı
  builtin?: boolean; // hazır persona mı
}

/** Kullanıcı tanımlı OpenAI-uyumlu uç nokta (Open WebUI, OpenRouter, LM Studio…) */
export interface CustomEndpoint {
  id: string; // "custom:<uuid>"
  name: string;
  baseUrl: string; // örn. http://host:3000/v1
  apiKey: string; // boş olabilir (LM Studio gibi)
  models: string; // virgülle ayrılmış manuel liste; boşsa /models'tan çekilir
}

export interface GameSummary {
  id: number;
  started_at: string;
  ended_at: string | null;
  mode: GameMode;
  white_type: PlayerType;
  white_provider: string | null;
  white_model: string | null;
  white_name: string | null;
  black_type: PlayerType;
  black_provider: string | null;
  black_model: string | null;
  black_name: string | null;
  result: GameResult;
  termination: Termination | null;
  pgn: string | null;
  fen_final: string | null;
  theme: ThemeId | null;
  ply_count: number;
  opening: string | null;
  white_accuracy: number | null;
  black_accuracy: number | null;
  report_md: string | null;
  report_model: string | null;
  report_created_at: string | null;
}

/** Bir hamlenin Stockfish analizi sonucu kalitesi */
export type MoveQuality = "brilliant" | "best" | "good" | "inaccuracy" | "mistake" | "blunder" | "book";

export interface MoveRecord {
  ply: number;
  san: string;
  uci: string;
  fen_after: string;
  played_by: PlayerType;
  thinking_time_ms: number | null;
  was_fallback: boolean;
  retries: number;
  raw_response?: string | null;
  /** Stockfish değerlendirmesi (santipiyon, beyaz lehine +). Mat ise büyük değer. */
  eval_cp?: number | null;
  quality?: MoveQuality | null;
}

export interface ProviderInfo {
  id: ProviderRef;
  name: string;
  configured: boolean;
  models: string[];
  /** stockfish için seviye seçimi olduğunu UI'a bildirir */
  isEngine?: boolean;
}

/** Turnuva katılımcısı (bir profile dayanır) ve sonuç istatistikleri */
export interface TournamentParticipant {
  provider: ProviderRef;
  model: string;
  name: string;
  emoji: string;
  color: string;
  rating: number;
  systemPrompt: string;
}

export interface TournamentRecord {
  id: number;
  name: string;
  created_at: string;
  status: "running" | "finished" | "stopped";
  rounds: number;
  participants: string; // JSON TournamentParticipant[]
  move_cap: number;
}

/** Karşılaştırma paneli: model başına istatistik */
export interface ModelStat {
  key: string; // provider/model
  name: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  winPct: number;
  avgAccuracy: number | null;
  avgMoveMs: number | null;
}

export function humanLabel(p: PlayerConfig, fallback: string): string {
  if (p.type === "human") return p.name?.trim() || fallback;
  return p.model ?? p.provider ?? "AI";
}
