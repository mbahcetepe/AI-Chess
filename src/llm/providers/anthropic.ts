import Anthropic from "@anthropic-ai/sdk";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { moveSystem, buildMovePrompt } from "../prompt";
import { ProviderUnreachableError, type LlmContext, type LlmProvider, type MoveRequest } from "../types";

export const ANTHROPIC_MODELS = ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"];

function client(ctx: LlmContext): Anthropic {
  return new Anthropic({
    apiKey: ctx.apiKeys.anthropic,
    // Webview içinden çağrı: anahtar kullanıcının kendi makinesinde, CORS'u tauri fetch aşar
    fetch: tauriFetch as unknown as typeof globalThis.fetch,
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
  });
}

function extractText(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

export const anthropicProvider: LlmProvider = {
  id: "anthropic",

  async getMoveRaw(req: MoveRequest, ctx: LlmContext): Promise<string> {
    try {
      const response = await client(ctx).messages.create({
        model: req.model,
        max_tokens: 1024,
        system: moveSystem(req.persona),
        messages: [{ role: "user", content: buildMovePrompt(req) }],
      });
      return extractText(response);
    } catch (err) {
      throw toUnreachable(err);
    }
  },

  async getCompletion(
    system: string,
    user: string,
    model: string,
    ctx: LlmContext,
    maxTokens = 8000,
  ): Promise<string> {
    try {
      const stream = client(ctx).messages.stream({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      });
      const final = await stream.finalMessage();
      return extractText(final);
    } catch (err) {
      throw toUnreachable(err);
    }
  },
};

function toUnreachable(err: unknown): ProviderUnreachableError {
  const msg = err instanceof Error ? err.message : String(err);
  return new ProviderUnreachableError("anthropic", msg);
}
