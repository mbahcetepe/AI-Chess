import type { LlmProvider, MoveRequest } from "../types";

/** Anahtarsız test rakibi: yasal listeden rastgele hamle döner. */
export const mockProvider: LlmProvider = {
  id: "mock",

  async getMoveRaw(req: MoveRequest): Promise<string> {
    await new Promise((r) => setTimeout(r, 250));
    const san = req.legalMoves[Math.floor(Math.random() * req.legalMoves.length)];
    return `<move>${san}</move>`;
  },

  async getCompletion(): Promise<string> {
    throw new Error("mock provider rapor üretemez");
  },
};

export const MOCK_MODELS = ["random"];
