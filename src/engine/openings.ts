/**
 * Yaygın açılışların derlenmiş listesi (SAN hamle ön ekiyle eşleşir).
 * En uzun eşleşen ön ek kazanır. Kapsam: amatör oyunların büyük kısmı.
 */
interface Opening {
  eco: string;
  name: string;
  moves: string[]; // SAN dizisi
}

const OPENINGS: Opening[] = [
  { eco: "B00", name: "King's Pawn", moves: ["e4"] },
  { eco: "A00", name: "Uncommon Opening", moves: ["a3"] },
  { eco: "A40", name: "Queen's Pawn", moves: ["d4"] },
  { eco: "A04", name: "Réti Opening", moves: ["Nf3"] },
  { eco: "A10", name: "English Opening", moves: ["c4"] },
  { eco: "C20", name: "King's Pawn Game", moves: ["e4", "e5"] },
  { eco: "B20", name: "Sicilian Defence", moves: ["e4", "c5"] },
  { eco: "B01", name: "Scandinavian Defence", moves: ["e4", "d5"] },
  { eco: "C00", name: "French Defence", moves: ["e4", "e6"] },
  { eco: "B10", name: "Caro-Kann Defence", moves: ["e4", "c6"] },
  { eco: "B07", name: "Pirc Defence", moves: ["e4", "d6"] },
  { eco: "B02", name: "Alekhine Defence", moves: ["e4", "Nf6"] },
  { eco: "C40", name: "King's Knight Opening", moves: ["e4", "e5", "Nf3"] },
  { eco: "C44", name: "King's Pawn Game", moves: ["e4", "e5", "Nf3", "Nc6"] },
  { eco: "C60", name: "Ruy López (Spanish)", moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"] },
  { eco: "C50", name: "Italian Game", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"] },
  { eco: "C50", name: "Giuoco Piano", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"] },
  { eco: "C55", name: "Two Knights Defence", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6"] },
  { eco: "C46", name: "Three Knights", moves: ["e4", "e5", "Nf3", "Nc6", "Nc3"] },
  { eco: "C47", name: "Four Knights", moves: ["e4", "e5", "Nf3", "Nc6", "Nc3", "Nf6"] },
  { eco: "C45", name: "Scotch Game", moves: ["e4", "e5", "Nf3", "Nc6", "d4"] },
  { eco: "C41", name: "Philidor Defence", moves: ["e4", "e5", "Nf3", "d6"] },
  { eco: "C42", name: "Petrov's Defence", moves: ["e4", "e5", "Nf3", "Nf6"] },
  { eco: "C30", name: "King's Gambit", moves: ["e4", "e5", "f4"] },
  { eco: "C23", name: "Bishop's Opening", moves: ["e4", "e5", "Bc4"] },
  { eco: "C21", name: "Centre Game", moves: ["e4", "e5", "d4"] },
  { eco: "B21", name: "Sicilian, Smith-Morra", moves: ["e4", "c5", "d4"] },
  { eco: "B27", name: "Sicilian Defence", moves: ["e4", "c5", "Nf3"] },
  { eco: "B23", name: "Sicilian, Closed", moves: ["e4", "c5", "Nc3"] },
  { eco: "B90", name: "Sicilian, Najdorf", moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"] },
  { eco: "D06", name: "Queen's Gambit", moves: ["d4", "d5", "c4"] },
  { eco: "D20", name: "Queen's Gambit Accepted", moves: ["d4", "d5", "c4", "dxc4"] },
  { eco: "D30", name: "Queen's Gambit Declined", moves: ["d4", "d5", "c4", "e6"] },
  { eco: "D10", name: "Slav Defence", moves: ["d4", "d5", "c4", "c6"] },
  { eco: "A45", name: "Indian Defence", moves: ["d4", "Nf6"] },
  { eco: "E60", name: "King's Indian Defence", moves: ["d4", "Nf6", "c4", "g6"] },
  { eco: "E20", name: "Nimzo-Indian Defence", moves: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4"] },
  { eco: "E12", name: "Queen's Indian Defence", moves: ["d4", "Nf6", "c4", "e6", "Nf3", "b6"] },
  { eco: "D70", name: "Grünfeld Defence", moves: ["d4", "Nf6", "c4", "g6", "Nc3", "d5"] },
  { eco: "A80", name: "Dutch Defence", moves: ["d4", "f5"] },
  { eco: "D00", name: "London System", moves: ["d4", "d5", "Bf4"] },
  { eco: "A15", name: "English, Anglo-Indian", moves: ["c4", "Nf6"] },
  { eco: "B06", name: "Modern Defence", moves: ["e4", "g6"] },
  { eco: "C00", name: "French, Advance", moves: ["e4", "e6", "d4", "d5", "e5"] },
  { eco: "C02", name: "French Defence", moves: ["e4", "e6", "d4", "d5"] },
];

/** SAN hamle dizisinden açılış adını döndürür (en uzun ön ek eşleşmesi). */
export function detectOpening(sanMoves: string[]): string | null {
  let best: Opening | null = null;
  for (const op of OPENINGS) {
    if (op.moves.length > sanMoves.length) continue;
    const matches = op.moves.every((m, i) => sanMoves[i] === m);
    if (matches && (!best || op.moves.length > best.moves.length)) best = op;
  }
  return best ? `${best.eco} ${best.name}` : null;
}

/** Bir ply'nin hâlâ kitap (açılış teorisi) içinde olup olmadığını kabaca belirler. */
export function bookDepth(sanMoves: string[]): number {
  let depth = 0;
  for (const op of OPENINGS) {
    if (op.moves.length > sanMoves.length) continue;
    if (op.moves.every((m, i) => sanMoves[i] === m)) {
      depth = Math.max(depth, op.moves.length);
    }
  }
  return depth;
}
