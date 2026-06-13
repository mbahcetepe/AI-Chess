import OpenAI from "openai";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { moveSystem, buildMovePrompt } from "../prompt";
import { ProviderUnreachableError, type LlmContext, type LlmProvider, type MoveRequest } from "../types";

/** Anahtar girilince canlı listelenir; bu liste yalnızca yedek. */
export const OPENAI_FALLBACK_MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini"];

function client(ctx: LlmContext): OpenAI {
  return new OpenAI({
    apiKey: ctx.apiKeys.openai,
    fetch: tauriFetch as unknown as typeof globalThis.fetch,
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
  });
}

async function chat(
  ctx: LlmContext,
  model: string,
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  try {
    const response = await client(ctx).chat.completions.create({
      model,
      max_completion_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return response.choices[0]?.message?.content ?? "";
  } catch (err) {
    throw new ProviderUnreachableError("openai", err instanceof Error ? err.message : String(err));
  }
}

export const openaiProvider: LlmProvider = {
  id: "openai",

  getMoveRaw(req: MoveRequest, ctx: LlmContext): Promise<string> {
    return chat(ctx, req.model, moveSystem(req.persona), buildMovePrompt(req), 1024);
  },

  getCompletion(
    system: string,
    user: string,
    model: string,
    ctx: LlmContext,
    maxTokens = 8000,
  ): Promise<string> {
    return chat(ctx, model, system, user, maxTokens);
  },
};

/** Anahtar varsa modelleri canlı listele (chat modelleriyle sınırla). */
export async function listOpenAiModels(ctx: LlmContext): Promise<string[]> {
  try {
    const models = await client(ctx).models.list();
    const ids = models.data
      .map((m) => m.id)
      .filter((id) => /^(gpt-|o\d)/.test(id) && !/(embed|audio|tts|whisper|image|dall|realtime|transcribe|moderation)/.test(id))
      .sort();
    return ids.length > 0 ? ids : OPENAI_FALLBACK_MODELS;
  } catch {
    return OPENAI_FALLBACK_MODELS;
  }
}
