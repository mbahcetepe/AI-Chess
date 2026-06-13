import { moveSystem, buildMovePrompt } from "../prompt";
import { ProviderUnreachableError, type LlmContext, type LlmProvider, type MoveRequest } from "../types";
import { proxyRequest } from "../httpProxy";

const HEADERS = { "Content-Type": "application/json" };

interface OllamaBody {
  model: string;
  stream: false;
  think?: boolean;
  options?: Record<string, unknown>;
  messages: { role: string; content: string }[];
}

async function postChat(ctx: LlmContext, body: OllamaBody): Promise<string> {
  const r = await proxyRequest(`${ctx.ollamaBaseUrl}/api/chat`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (r.status !== 200) throw new Error(`Ollama HTTP ${r.status}: ${r.body.slice(0, 160)}`);
  const data = JSON.parse(r.body) as { message?: { content?: string; thinking?: string } };
  // "Düşünme" modellerinde içerik boş kalıp tüm çıktı thinking'e gidebilir → ikisini de değerlendir
  return data.message?.content || data.message?.thinking || "";
}

export const ollamaProvider: LlmProvider = {
  id: "ollama",

  async getMoveRaw(req: MoveRequest, ctx: LlmContext): Promise<string> {
    // Derin düşünme açıksa: think serbest (model akıl yürütür → güçlü ama yavaş, num_predict yok).
    // Kapalıysa: think:false → "düşünme" modelleri ~0.6sn'de doğrudan hamle verir (hızlı ama zayıf).
    const deep = !!ctx.ollamaDeepThink;
    try {
      return await postChat(ctx, {
        model: req.model,
        stream: false,
        think: deep ? undefined : false,
        options: deep ? { temperature: 0.4, top_p: 0.9 } : { temperature: 0.4, top_p: 0.9, num_predict: 1024 },
        messages: [
          { role: "system", content: moveSystem(req.persona) },
          { role: "user", content: buildMovePrompt(req) },
        ],
      });
    } catch (err) {
      throw new ProviderUnreachableError("ollama", err instanceof Error ? err.message : String(err));
    }
  },

  async getCompletion(system, user, model, ctx): Promise<string> {
    // Rapor üretimi: düşünme açık kalabilir (kalite > hız)
    try {
      return await postChat(ctx, {
        model,
        stream: false,
        options: { temperature: 0.5 },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
    } catch (err) {
      throw new ProviderUnreachableError("ollama", err instanceof Error ? err.message : String(err));
    }
  },
};

export type OllamaProbe = { ok: true; models: string[] } | { ok: false; error: string };

/** Ollama erişilebilir mi + kurulu model listesi + hata detayı (backend proxy üzerinden). */
export async function probeOllama(ctx: LlmContext): Promise<OllamaProbe> {
  if (!ctx.ollamaBaseUrl) return { ok: false, error: "Adres boş" };
  try {
    const r = await proxyRequest(`${ctx.ollamaBaseUrl}/api/tags`, { method: "GET" });
    if (r.status !== 200) {
      return { ok: false, error: `HTTP ${r.status}${r.body ? ` — ${r.body.slice(0, 120)}` : ""}` };
    }
    const data = JSON.parse(r.body) as { models?: { name: string }[] };
    return { ok: true, models: (data.models ?? []).map((m) => m.name) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

export async function listOllamaModels(ctx: LlmContext): Promise<string[] | null> {
  const p = await probeOllama(ctx);
  return p.ok ? p.models : null;
}
