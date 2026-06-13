import { Chess } from "chess.js";
import type { GameSummary, Language, MoveRecord, ProviderRef } from "../types";
import { getProvider, providerDisplayName } from "./providers";
import type { LlmContext } from "./types";

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PIECE_NAMES_TR: Record<string, string> = {
  p: "piyon", n: "at", b: "fil", r: "kale", q: "vezir", k: "şah",
};
const PIECE_NAMES_EN: Record<string, string> = {
  p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king",
};

/** FEN'den materyal dengesi: pozitif = beyaz önde (piyon birimi) */
function materialBalance(fen: string): number {
  const placement = fen.split(" ")[0];
  let balance = 0;
  for (const ch of placement) {
    const lower = ch.toLowerCase();
    if (lower in PIECE_VALUES) {
      balance += ch === ch.toUpperCase() ? PIECE_VALUES[lower] : -PIECE_VALUES[lower];
    }
  }
  return balance;
}

/**
 * LLM'den önce nesnel olgular: her hamle için alınan taş, şah/mat, materyal dengesi,
 * fallback/retry bilgisi. Analizi temellendirmek için prompt'a eklenir.
 */
export function buildMoveFacts(moves: MoveRecord[], lang: Language): string {
  const chess = new Chess();
  const names = lang === "tr" ? PIECE_NAMES_TR : PIECE_NAMES_EN;
  const lines: string[] = [];

  for (const rec of moves) {
    const move = chess.move(rec.san);
    const num = Math.ceil(rec.ply / 2);
    const side = rec.ply % 2 === 1 ? (lang === "tr" ? "Beyaz" : "White") : lang === "tr" ? "Siyah" : "Black";
    const facts: string[] = [];

    if (move.captured) {
      facts.push(lang === "tr" ? `${names[move.captured]} aldı` : `captured ${names[move.captured]}`);
    }
    if (move.san.includes("#")) facts.push(lang === "tr" ? "ŞAH MAT" : "CHECKMATE");
    else if (move.san.includes("+")) facts.push(lang === "tr" ? "şah" : "check");
    if (move.san.startsWith("O-O")) facts.push(lang === "tr" ? "rok" : "castles");
    if (move.promotion) facts.push(lang === "tr" ? "terfi" : "promotion");
    if (rec.was_fallback) {
      facts.push(
        lang === "tr"
          ? "RASTGELE HAMLE (model yasal hamle veremedi)"
          : "RANDOM FALLBACK (model failed to produce a legal move)",
      );
    } else if (rec.retries > 0) {
      facts.push(
        lang === "tr"
          ? `${rec.retries} geçersiz denemeden sonra`
          : `after ${rec.retries} invalid attempts`,
      );
    }

    const balance = materialBalance(chess.fen());
    const balanceStr = balance > 0 ? `+${balance}` : `${balance}`;
    lines.push(
      `${num}.${rec.ply % 2 === 1 ? "" : ".."} ${rec.san} (${side})${
        facts.length ? " — " + facts.join(", ") : ""
      } [${lang === "tr" ? "materyal" : "material"}: ${balanceStr}]`,
    );
  }
  return lines.join("\n");
}

function playerDesc(
  type: string,
  provider: string | null,
  model: string | null,
  lang: Language,
): string {
  if (type === "human") return lang === "tr" ? "İnsan" : "Human";
  return `${model ?? "?"} (${provider ?? "?"})`;
}

const REPORT_SYSTEM_TR = `Sen deneyimli bir satranç analisti ve yorumcususun. Sana bir satranç maçının
tüm verileri verilecek. Maçı analiz edip Türkçe, iyi yapılandırılmış bir Markdown raporu yazacaksın.
Analizlerini verilen nesnel olgulara (alınan taşlar, materyal dengesi, şah/mat anları) dayandır.
Yalnızca Markdown raporu döndür — başka açıklama ekleme.`;

const REPORT_SYSTEM_EN = `You are an experienced chess analyst and commentator. You will be given the
full data of a chess game. Analyze it and write a well-structured Markdown report in English.
Ground your analysis in the provided objective facts (captures, material balance, check/mate moments).
Return ONLY the Markdown report — no other commentary.`;

export function buildReportPrompt(
  game: GameSummary,
  moves: MoveRecord[],
  lang: Language,
): { system: string; user: string } {
  const white = playerDesc(game.white_type, game.white_provider, game.white_model, lang);
  const black = playerDesc(game.black_type, game.black_provider, game.black_model, lang);
  const facts = buildMoveFacts(moves, lang);
  const isAiVsAi = game.mode === "ai_vs_ai";

  const user =
    lang === "tr"
      ? `Aşağıdaki satranç maçını analiz et ve Markdown raporu yaz.

## Maç bilgileri
- Tarih/Saat: ${game.started_at}${game.ended_at ? " → " + game.ended_at : ""}
- Mod: ${game.mode}
- Beyaz: ${white}
- Siyah: ${black}
- Sonuç: ${game.result}
- Bitiş şekli: ${game.termination ?? "?"}
- Toplam yarım hamle: ${game.ply_count}

## PGN
${game.pgn ?? "(yok)"}

## Hamle olguları (nesnel veriler)
${facts}

Rapor TAM OLARAK şu bölümleri içermeli (Markdown başlıklarıyla):

# Maç Raporu — ${white} vs ${black}
## Maç Bilgileri
(tablo: tarih, oyuncular/modeller, sonuç, bitiş şekli, hamle sayısı)
## Genel Değerlendirme
(maçın seyri, 2-3 paragraf)
## Hamle Listesi
(numaralı tam liste; önemli hamlelere kısa not düş)
## Kritik Hatalar
(hangi hamle, neden hata, yerine ne oynanabilirdi)
## Dönüm Noktaları
(maçın kaderini değiştiren anlar)
## Sonuç
(kazananın neden kazandığı${isAiVsAi ? ", iki modelin oyun tarzlarının karşılaştırması" : ", oyuncuların oyun tarzı hakkında gözlem"})`
      : `Analyze the following chess game and write a Markdown report.

## Game info
- Date/Time: ${game.started_at}${game.ended_at ? " → " + game.ended_at : ""}
- Mode: ${game.mode}
- White: ${white}
- Black: ${black}
- Result: ${game.result}
- Termination: ${game.termination ?? "?"}
- Total plies: ${game.ply_count}

## PGN
${game.pgn ?? "(none)"}

## Move facts (objective data)
${facts}

The report MUST contain exactly these sections (as Markdown headings):

# Match Report — ${white} vs ${black}
## Game Information
(table: date, players/models, result, termination, move count)
## Overview
(the flow of the game, 2-3 paragraphs)
## Move List
(full numbered list; brief notes on important moves)
## Critical Mistakes
(which move, why it was a mistake, what was better)
## Turning Points
(moments that changed the course of the game)
## Conclusion
(why the winner won${isAiVsAi ? ", comparison of the two models' playing styles" : ", observations about the players' styles"})`;

  return { system: lang === "tr" ? REPORT_SYSTEM_TR : REPORT_SYSTEM_EN, user };
}

export async function generateReport(
  game: GameSummary,
  moves: MoveRecord[],
  providerId: ProviderRef,
  model: string,
  ctx: LlmContext,
  lang: Language,
): Promise<string> {
  const { system, user } = buildReportPrompt(game, moves, lang);
  const provider = getProvider(providerId);
  const report = await provider.getCompletion(system, user, model, ctx, 8000);
  if (!report.trim()) {
    throw new Error(`${providerDisplayName(providerId, ctx)} boş rapor döndürdü`);
  }
  return report.trim();
}
