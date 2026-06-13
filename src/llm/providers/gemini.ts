import { GoogleGenAI } from "@google/genai";
import { moveSystem, buildMovePrompt } from "../prompt";
import { ProviderUnreachableError, type LlmContext, type LlmProvider, type MoveRequest } from "../types";

/** Anahtar girilince canlı listelenir; bu yalnızca yedek. */
export const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-flash-latest"];

/** Anahtar varsa generateContent destekleyen güncel modelleri canlı listele. */
export async function listGeminiModels(ctx: LlmContext): Promise<string[]> {
  try {
    const ai = new GoogleGenAI({ apiKey: ctx.apiKeys.gemini });
    const ids: string[] = [];
    for await (const m of await ai.models.list()) {
      const name = (m.name ?? "").replace(/^models\//, "");
      const actions = m.supportedActions ?? [];
      const chatOk = actions.length === 0 || actions.includes("generateContent");
      if (chatOk && /^(gemini|gemma)/.test(name) && !/(tts|image|embedding|aqa|vision|preview-tts)/.test(name)) {
        ids.push(name);
      }
    }
    return ids.length > 0 ? ids.sort() : GEMINI_MODELS;
  } catch {
    return GEMINI_MODELS;
  }
}

async function generate(
  ctx: LlmContext,
  model: string,
  system: string,
  user: string,
  maxTokens: number,
  fastMove = false,
): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: ctx.apiKeys.gemini });
    const config: Record<string, unknown> = {
      systemInstruction: system,
      maxOutputTokens: maxTokens,
    };
    // Gemini 2.5-flash: hamle için düşünmeyi kapat (token'ı yiyip içeriği boş bırakmasın)
    if (fastMove && /2\.5-flash/i.test(model)) {
      config.thinkingConfig = { thinkingBudget: 0 };
    }
    const response = await ai.models.generateContent({ model, contents: user, config });
    return response.text ?? "";
  } catch (err) {
    throw new ProviderUnreachableError("gemini", err instanceof Error ? err.message : String(err));
  }
}

export const geminiProvider: LlmProvider = {
  id: "gemini",

  getMoveRaw(req: MoveRequest, ctx: LlmContext): Promise<string> {
    // Yüksek bütçe (pro düşünmesi + cevap sığsın) + flash'ta düşünme kapalı
    return generate(ctx, req.model, moveSystem(req.persona), buildMovePrompt(req), 8000, true);
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
