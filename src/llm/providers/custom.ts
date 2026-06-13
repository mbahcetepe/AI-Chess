import OpenAI from "openai";
import { moveSystem, buildMovePrompt } from "../prompt";
import { ProviderUnreachableError, type LlmContext, type LlmProvider, type MoveRequest } from "../types";
import { proxyFetch } from "../httpProxy";
import type { CustomEndpoint, ProviderRef } from "../../types";

function endpointOf(ctx: LlmContext, ref: ProviderRef): CustomEndpoint | undefined {
  return ctx.customEndpoints.find((e) => e.id === ref);
}

function client(ep: CustomEndpoint): OpenAI {
  return new OpenAI({
    apiKey: ep.apiKey || "no-key",
    baseURL: ep.baseUrl,
    fetch: proxyFetch,
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
  });
}

async function chat(
  ep: CustomEndpoint,
  model: string,
  system: string,
  user: string,
  maxTokens: number,
  temperature?: number,
): Promise<string> {
  try {
    const res = await client(ep).chat.completions.create({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return res.choices[0]?.message?.content ?? "";
  } catch (err) {
    throw new ProviderUnreachableError(ep.id as ProviderRef, err instanceof Error ? err.message : String(err));
  }
}

/** Belirli bir custom uç noktaya bağlı LlmProvider üretir. */
export function makeCustomProvider(ref: ProviderRef): LlmProvider {
  return {
    id: "openai", // şekil olarak OpenAI uyumlu; gerçek kimlik ref'te
    getMoveRaw(req: MoveRequest, ctx: LlmContext): Promise<string> {
      const ep = endpointOf(ctx, ref);
      if (!ep) throw new ProviderUnreachableError(ref, "uç nokta bulunamadı");
      return chat(ep, req.model, moveSystem(req.persona), buildMovePrompt(req), 1024, 0.4);
    },
    getCompletion(system, user, model, ctx, maxTokens = 8000): Promise<string> {
      const ep = endpointOf(ctx, ref);
      if (!ep) throw new ProviderUnreachableError(ref, "uç nokta bulunamadı");
      return chat(ep, model, system, user, maxTokens);
    },
  };
}

/** Uç noktanın model listesi: manuel (virgüllü) varsa onu, yoksa /models'tan çek. */
export async function listCustomModels(ep: CustomEndpoint): Promise<string[]> {
  const manual = ep.models
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  if (manual.length > 0) return manual;
  if (!ep.baseUrl) return [];
  try {
    const models = await client(ep).models.list();
    return models.data.map((m) => m.id).sort();
  } catch {
    return [];
  }
}
