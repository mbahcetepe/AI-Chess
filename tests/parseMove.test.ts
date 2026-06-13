import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { parseMove } from "../src/llm/parseMove";

const START = new Chess().fen();

describe("parseMove", () => {
  it("temiz SAN'ı ayrıştırır", () => {
    const r = parseMove(START, "Nf3");
    expect(r?.san).toBe("Nf3");
    expect(r?.uci).toBe("g1f3");
  });

  it("<move> etiketini ayrıştırır", () => {
    const r = parseMove(START, "<move>e4</move>");
    expect(r?.san).toBe("e4");
  });

  it("etiket etrafındaki gevezeliği yok sayar", () => {
    const r = parseMove(START, "I think the best opening is...\n<move>d4</move>\nGood luck!");
    expect(r?.san).toBe("d4");
  });

  it("UCI formatını ayrıştırır (e2e4)", () => {
    const r = parseMove(START, "e2e4");
    expect(r?.san).toBe("e4");
    expect(r?.uci).toBe("e2e4");
  });

  it("UCI terfiyi ayrıştırır (e7e8q)", () => {
    // Beyaz piyon e7'de, terfi karesi boş (siyah şah h8'de)
    const fen = "7k/4P3/8/8/8/8/8/4K3 w - - 0 1";
    const r = parseMove(fen, "e7e8q");
    expect(r?.san).toBe("e8=Q+");
    expect(r?.uci).toBe("e7e8q");
  });

  it("düzyazı içindeki hamleyi bulur", () => {
    const r = parseMove(START, "I'll play Nf3 because it develops a piece and controls e5.");
    expect(r?.san).toBe("Nf3");
  });

  it("şah işaretli SAN'ı kabul eder", () => {
    const fen = "rnbqkbnr/ppppp1pp/8/5p2/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
    const r = parseMove(fen, "<move>Qh5+</move>");
    expect(r?.san).toBe("Qh5+");
  });

  it("rok hamlesini ayrıştırır (O-O ve 0-0)", () => {
    const fen = "rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";
    expect(parseMove(fen, "O-O")?.san).toBe("O-O");
    expect(parseMove(fen, "0-0")?.san).toBe("O-O");
  });

  it("yasadışı hamleyi reddeder, sonraki adayı dener", () => {
    // "Qxh7 yasal değil ama Nf3 yasal" — metinde ikisi de var
    const r = parseMove(START, "Qxh7 is tempting but I'll go with Nf3 instead");
    expect(r?.san).toBe("Nf3");
  });

  it("tamamen yasadışı cevapta null döner", () => {
    expect(parseMove(START, "<move>Qxh7</move>")).toBeNull();
  });

  it("anlamsız metinde null döner", () => {
    expect(parseMove(START, "Hello! How can I help you today?")).toBeNull();
    expect(parseMove(START, "")).toBeNull();
  });
});
