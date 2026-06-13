import { GoogleGenAI } from "@google/genai";
import { moveSystem, buildMovePrompt } from "../prompt";
import { ProviderUnreachableError, type LlmContext, type LlmProvider, type MoveRequest } from "../types";

export const GEMINI_MODELS = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"];

async function generate(
  ctx: LlmContext,
  model: string,
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: ctx.apiKeys.gemini });
    const response = await ai.models.generateContent({
      model,
      contents: user,
      config: {
        systemInstruction: system,
        maxOutputTokens: maxTokens,
      },
    });
    return response.text ?? "";
  } catch (err) {
    throw new ProviderUnreachableError("gemini", err instanceof Error ? err.message : String(err));
  }
}

export const geminiProvider: LlmProvider = {
  id: "gemini",

  getMoveRaw(req: MoveRequest, ctx: LlmContext): Promise<string> {
    return generate(ctx, req.model, moveSystem(req.persona), buildMovePrompt(req), 1024);
  },

  getCompletion(
    system: string,
    user: string,
    model: string,
    ctx: LlmContext,
    maxTokens = 8000,
  ): Promise<string> {
    return generate(ctx, model, system, user, maxTokens);
  },
};
