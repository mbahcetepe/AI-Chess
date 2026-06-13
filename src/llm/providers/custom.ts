import OpenAI from "openai";
import { moveSystem, buildMovePrompt, moveSchema } from "../prompt";
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

/** Enum-kısıtlı yapısal hamle isteği; desteklenmezse düz çağrıya düşer. */
async function structuredMove(ep: CustomEndpoint, req: MoveRequest): Promise<string> {
  const messages = [
    { role: "system" as const, content: moveSystem(req.persona) },
    { role: "user" as const, content: buildMovePrompt(req) },
  ];
  try {
    const res = await client(ep).chat.completions.create({
      model: req.model,
      max_tokens: 1024,
      temperature: 0.3,
      response_format: {
        type: "json_schema",
        json_schema: { name: "chess_move", strict: true, schema: moveSchema(req.legalMoves) },
      },
      messages,
    });
    const content = res.choices[0]?.message?.content ?? "";
    try {
      const obj = JSON.parse(content) as { move?: string };
      if (obj.move) return obj.move;
    } catch {
      /* parser yedeği */
    }
    return content;
  } catch (err) {
    // Uç nokta json_schema desteklemiyorsa düz çağrıya düş
    const msg = err instanceof Error ? err.message : String(err);
    if (/response_format|json_schema|schema|not supported|invalid/i.test(msg)) {
      return chat(ep, req.model, moveSystem(req.persona), buildMovePrompt(req), 1024, 0.3);
    }
    throw new ProviderUnreachableError(ep.id as ProviderRef, msg);
  }
}

/** Belirli bir custom uç noktaya bağlı LlmProvider üretir. */
export function makeCustomProvider(ref: ProviderRef): LlmProvider {
  return {
    id: "openai", // şekil olarak OpenAI uyumlu; gerçek kimlik ref'te
    getMoveRaw(req: MoveRequest, ctx: LlmContext): Promise<string> {
      const ep = endpointOf(ctx, ref);
      if (!ep) throw new ProviderUnreachableError(ref, "uç nokta bulunamadı");
      return structuredMove(ep, req);
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
