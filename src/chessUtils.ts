import { Chess } from "chess.js";

const VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const ORDER = ["q", "r", "b", "n", "p"];

export interface CapturedInfo {
  /** Beyaz'ın aldığı siyah taşlar (taş tipi listesi) */
  byWhite: string[];
  byBlack: string[];
  /** Materyal farkı: pozitif = beyaz önde (piyon birimi) */
  advantage: number;
}

/** FEN'den her iki tarafın aldığı taşları ve materyal farkını hesaplar. */
export function capturedFromFen(fen: string): CapturedInfo {
  const placement = fen.split(" ")[0];
  const counts: Record<string, number> = {};
  for (const ch of placement) {
    if (/[a-zA-Z]/.test(ch)) counts[ch] = (counts[ch] ?? 0) + 1;
  }
  // Başlangıç sayıları
  const start: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  const byWhite: string[] = []; // beyaz'ın aldığı = eksik siyah taşlar
  const byBlack: string[] = [];
  for (const t of ORDER) {
    const missingBlack = start[t] - (counts[t] ?? 0); // küçük harf = siyah
    const missingWhite = start[t] - (counts[t.toUpperCase()] ?? 0);
    for (let i = 0; i < missingBlack; i++) byWhite.push(t);
    for (let i = 0; i < missingWhite; i++) byBlack.push(t);
  }
  let advantage = 0;
  for (const t of byWhite) advantage += VALUES[t] ?? 0;
  for (const t of byBlack) advantage -= VALUES[t] ?? 0;
  return { byWhite, byBlack, advantage };
}

/** Eval (santipiyon, beyaz +) → okunabilir metin. */
export function formatEval(cp: number | null | undefined, mateIn?: number | null): string {
  if (mateIn != null) return `M${Math.abs(mateIn)}`;
  if (cp == null) return "—";
  if (Math.abs(cp) >= 99000) return cp > 0 ? "M" : "-M";
  const v = cp / 100;
  return (v >= 0 ? "+" : "") + v.toFixed(1);
}

/** Eval bar için 0..1 arası beyaz üstünlük oranı. */
export function evalToWhiteShare(cp: number | null | undefined): number {
  if (cp == null) return 0.5;
  const clamped = Math.max(-1000, Math.min(1000, cp));
  return 1 / (1 + Math.exp(-0.004 * clamped));
}

/** UCI varyantını okunabilir SAN dizisine çevirir (analiz panelinde gösterim). */
export function pvToSan(fen: string, movesUci: string[], max = 6): string {
  try {
    const chess = new Chess(fen);
    const sans: string[] = [];
    for (const uci of movesUci.slice(0, max)) {
      const m = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: (uci.slice(4) || undefined) as "q" | "r" | "b" | "n" | undefined,
      });
      sans.push(m.san);
    }
    return sans.join(" ");
  } catch {
    return movesUci.slice(0, max).join(" ");
  }
}

/** Verilen renkteki kralın karesini bulur (şah vurgusu için). */
export function kingSquare(chess: Chess, color: "w" | "b"): string | null {
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.type === "k" && cell.color === color) return cell.square;
    }
  }
  return null;
}
