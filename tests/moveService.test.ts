import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { getAiMove } from "../src/llm/moveService";
import { ProviderUnreachableError, type LlmContext, type LlmProvider, type MoveRequest } from "../src/llm/types";

const ctx: LlmContext = {
  apiKeys: { anthropic: "", openai: "", gemini: "" },
  ollamaBaseUrl: "http://localhost:11434",
  customEndpoints: [],
};

const chess = new Chess();
const baseReq = {
  fen: chess.fen(),
  pgn: "",
  legalMoves: chess.moves(),
  color: "white" as const,
  model: "test",
};

/** Sıralı senaryo sağlayıcısı: her çağrıda listedeki sıradaki davranışı uygular */
function scripted(responses: (string | Error)[]): {
  provider: LlmProvider;
  calls: MoveRequest[];
} {
  const calls: MoveRequest[] = [];
  let i = 0;
  const provider: LlmProvider = {
    id: "mock",
    async getMoveRaw(req) {
      calls.push(req);
      const r = responses[Math.min(i++, responses.length - 1)];
      if (r instanceof Error) throw r;
      return r;
    },
    async getCompletion() {
      return "";
    },
  };
  return { provider, calls };
}

describe("getAiMove", () => {
  it("ilk denemede yasal hamleyi kabul eder", async () => {
    const { provider } = scripted(["<move>e4</move>"]);
    const result = await getAiMove(provider, baseReq, ctx);
    expect(result.san).toBe("e4");
    expect(result.retries).toBe(0);
    expect(result.wasFallback).toBe(false);
  });

  it("geçersiz cevaptan sonra feedback ile yeniden dener", async () => {
    const { provider, calls } = scripted(["<move>Qxh7</move>", "<move>Nf3</move>"]);
    const result = await getAiMove(provider, baseReq, ctx);
    expect(result.san).toBe("Nf3");
    expect(result.retries).toBe(1);
    expect(result.wasFallback).toBe(false);
    expect(calls[1].feedback).toBeTruthy();
    expect(calls[1].feedback).toContain("Qxh7");
  });

  it("tüm geçersiz denemelerden sonra rastgele yasal hamleye düşer", async () => {
    const { provider, calls } = scripted(["garbage", "more garbage", "junk", "<move>Qxh7</move>"]);
    const result = await getAiMove(provider, baseReq, ctx);
    expect(result.wasFallback).toBe(true);
    expect(result.retries).toBe(4);
    expect(baseReq.legalMoves).toContain(result.san);
    expect(calls.length).toBe(4);
    // Fallback hamlesi de tahtada gerçekten yasal olmalı
    const verify = new Chess(baseReq.fen);
    expect(() => verify.move(result.san)).not.toThrow();
  });

  it("tüm denemeler ağ hatasıysa ProviderUnreachableError fırlatır", async () => {
    const { provider } = scripted([
      new Error("network down"),
      new Error("network down"),
      new Error("network down"),
      new Error("network down"),
    ]);
    await expect(getAiMove(provider, baseReq, ctx)).rejects.toThrow(ProviderUnreachableError);
  });

  it("karışık ağ hatası + geçersiz cevapta fallback uygular (takılmaz)", async () => {
    const { provider } = scripted([new Error("timeout"), "garbage", "still garbage"]);
    const result = await getAiMove(provider, baseReq, ctx);
    expect(result.wasFallback).toBe(true);
    expect(baseReq.legalMoves).toContain(result.san);
  });
});
