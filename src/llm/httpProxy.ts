import { invoke } from "@tauri-apps/api/core";

interface ProxyResp {
  status: number;
  body: string;
}

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Backend (reqwest) üzerinden HTTP — Origin gönderilmez, CORS reddi olmaz. */
export async function proxyRequest(
  url: string,
  opts: { method?: string; body?: string; headers?: Record<string, string> } = {},
): Promise<ProxyResp> {
  if (!isTauri) {
    // Geliştirme/web: doğrudan fetch (CORS sınırlı olabilir)
    const res = await fetch(url, { method: opts.method, body: opts.body, headers: opts.headers });
    return { status: res.status, body: await res.text() };
  }
  return invoke<ProxyResp>("http_proxy", {
    url,
    method: opts.method ?? "GET",
    body: opts.body,
    headers: opts.headers,
  });
}

/**
 * OpenAI/diğer SDK'ların beklediği fetch imzasını backend proxy'ye bağlar.
 * Böylece self-hosted OpenAI-uyumlu servisler (Open WebUI) CORS'a takılmaz.
 */
export const proxyFetch: typeof globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const headers: Record<string, string> = {};
  if (init?.headers) new Headers(init.headers).forEach((v, k) => (headers[k] = v));
  const body = init?.body != null ? String(init.body) : undefined;
  const r = await proxyRequest(url, { method: init?.method ?? "GET", body, headers });
  return new Response(r.body, {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
};
