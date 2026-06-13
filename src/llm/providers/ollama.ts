import { moveSystem, buildMovePrompt, moveSchema } from "../prompt";
import { ProviderUnreachableError, type LlmContext, type LlmProvider, type MoveRequest } from "../types";
import { proxyRequest } from "../httpProxy";

// Ollama varsayılan CORS yalnızca localhost'a izin verir; backend proxy Origin
// göndermez, böylece 403 alınmaz.
const HEADERS = { "Content-Type": "application/json" };

interface OllamaBody {
  model: string;
  stream: false;
  options: Record<string, unknown>;
  messages: { role: string; content: string }[];
  format?: Record<string, unknown>;
}

async function postChat(ctx: LlmContext, body: OllamaBody): Promise<string> {
  const r = await proxyRequest(`${ctx.ollamaBaseUrl}/api/chat`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (r.status !== 200) throw new Error(`Ollama HTTP ${r.status}: ${r.body.slice(0, 160)}`);
  const data = JSON.parse(r.body) as { message?: { content?: string } };
  return data.message?.content ?? "";
}

export const ollamaProvider: LlmProvider = {
  id: "ollama",

  async getMoveRaw(req: MoveRequest, ctx: LlmContext): Promise<string> {
    try {
      // Enum-kısıtlı yapısal çıktı: model SADECE listedeki yasal bir hamleyi üretebilir
      const content = await postChat(ctx, {
        model: req.model,
        stream: false,
        options: { temperature: 0.2, top_p: 0.9, num_predict: 512 },
        format: moveSchema(req.legalMoves),
        messages: [
          { role: "system", content: moveSystem(req.persona) },
          { role: "user", content: buildMovePrompt(req) },
        ],
      });
      // JSON {reasoning, move} → move'u çıkar; çözülemezse ham içerik (parser yakalar)
      try {
        const obj = JSON.parse(content) as { move?: string };
        if (obj.move) return obj.move;
      } catch {
        /* ham içeriği döndür */
      }
      return content;
    } catch (err) {
      throw new ProviderUnreachableError("ollama", err instanceof Error ? err.message : String(err));
    }
  },

  async getCompletion(system, user, model, ctx): Promise<string> {
    try {
      return await postChat(ctx, {
        model,
        stream: false,
        options: { temperature: 0.4 },
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
