import type { ProviderId, ProviderInfo, ProviderRef } from "../../types";
import type { LlmContext, LlmProvider } from "../types";
import { anthropicProvider, ANTHROPIC_MODELS } from "./anthropic";
import { geminiProvider, GEMINI_MODELS, listGeminiModels } from "./gemini";
import { mockProvider, MOCK_MODELS } from "./mock";
import { ollamaProvider, listOllamaModels } from "./ollama";
import { openaiProvider, listOpenAiModels } from "./openai";
import { makeCustomProvider, listCustomModels } from "./custom";
import { ENGINE_LEVELS } from "../../engine/stockfish";

const builtin: Partial<Record<ProviderId, LlmProvider>> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  gemini: geminiProvider,
  ollama: ollamaProvider,
  mock: mockProvider,
};

/** Sağlayıcı referansını (yerleşik id veya custom:<uuid>) LlmProvider'a çözer. */
export function getProvider(ref: ProviderRef): LlmProvider {
  if (ref.startsWith("custom:")) return makeCustomProvider(ref);
  const p = builtin[ref as ProviderId];
  if (!p) throw new Error(`Bilinmeyen sağlayıcı: ${ref}`);
  return p;
}

export const PROVIDER_NAMES: Record<ProviderId, string> = {
  anthropic: "Claude (Anthropic)",
  openai: "ChatGPT (OpenAI)",
  gemini: "Gemini (Google)",
  ollama: "Ollama (Lokal)",
  stockfish: "Stockfish (Motor)",
  mock: "Rastgele / Random",
};

/** stockfish seviyelerini "model" gibi sunar (UI tek tip dropdown gösterir). */
const ENGINE_MODEL_IDS = ENGINE_LEVELS.map((l) => `level-${l.id}`);

export function providerDisplayName(ref: ProviderRef, ctx: LlmContext): string {
  if (ref.startsWith("custom:")) {
    return ctx.customEndpoints.find((e) => e.id === ref)?.name || "OpenAI Uyumlu";
  }
  return PROVIDER_NAMES[ref as ProviderId] ?? ref;
}

/** Yapılandırma durumu + model listeleri. */
export async function getProviders(ctx: LlmContext): Promise<ProviderInfo[]> {
  const [ollamaModels, openaiModels, geminiModels, ...customModelLists] = await Promise.all([
    listOllamaModels(ctx),
    ctx.apiKeys.openai ? listOpenAiModels(ctx) : Promise.resolve([]),
    ctx.apiKeys.gemini ? listGeminiModels(ctx) : Promise.resolve(GEMINI_MODELS),
    ...ctx.customEndpoints.map((e) => listCustomModels(e)),
  ]);

  const list: ProviderInfo[] = [
    { id: "stockfish", name: PROVIDER_NAMES.stockfish, configured: true, models: ENGINE_MODEL_IDS, isEngine: true },
    { id: "anthropic", name: PROVIDER_NAMES.anthropic, configured: !!ctx.apiKeys.anthropic, models: ANTHROPIC_MODELS },
    { id: "openai", name: PROVIDER_NAMES.openai, configured: !!ctx.apiKeys.openai, models: openaiModels },
    { id: "gemini", name: PROVIDER_NAMES.gemini, configured: !!ctx.apiKeys.gemini, models: geminiModels },
    { id: "ollama", name: PROVIDER_NAMES.ollama, configured: ollamaModels !== null && ollamaModels.length > 0, models: ollamaModels ?? [] },
  ];

  ctx.customEndpoints.forEach((ep, i) => {
    const models = customModelLists[i] ?? [];
    list.push({
      id: ep.id as ProviderRef,
      name: ep.name || "OpenAI Uyumlu",
      configured: !!ep.baseUrl && models.length > 0,
      models,
    });
  });

  list.push({ id: "mock", name: PROVIDER_NAMES.mock, configured: true, models: MOCK_MODELS });
  return list;
}

export function contextFromSettings(s: {
  apiKeys: { anthropic: string; openai: string; gemini: string };
  ollamaBaseUrl: string;
  customEndpoints: import("../../types").CustomEndpoint[];
  ollamaDeepThink?: boolean;
}): LlmContext {
  return {
    apiKeys: s.apiKeys,
    ollamaBaseUrl: s.ollamaBaseUrl,
    customEndpoints: s.customEndpoints,
    ollamaDeepThink: s.ollamaDeepThink,
  };
}
