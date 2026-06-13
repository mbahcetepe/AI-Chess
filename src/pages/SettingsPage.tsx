import { useEffect, useState } from "react";
import type { Language, ThemeId } from "../types";
import { contextFromSettings, getProvider, getProviders, providerDisplayName } from "../llm/providers";
import { probeOllama, type OllamaProbe } from "../llm/providers/ollama";
import { listCustomModels } from "../llm/providers/custom";
import { ENGINE_LEVELS } from "../engine/stockfish";
import { useSettingsStore, type ApiKeys } from "../store/settingsStore";
import { useT } from "../i18n/strings";
import type { ProviderInfo, ProviderRef } from "../types";
import Avatar from "../components/Avatar";

type TestState = "idle" | "testing" | "ok" | "fail";

const KEY_PROVIDERS: { id: keyof ApiKeys; label: string; testModel: string }[] = [
  { id: "anthropic", label: "Claude (Anthropic)", testModel: "claude-haiku-4-5" },
  { id: "openai", label: "ChatGPT (OpenAI)", testModel: "gpt-4o-mini" },
  { id: "gemini", label: "Gemini (Google)", testModel: "gemini-2.0-flash" },
];

export default function SettingsPage() {
  const t = useT();
  const s = useSettingsStore();
  const [tests, setTests] = useState<Record<string, TestState>>({});
  const [ollama, setOllama] = useState<OllamaProbe | "checking">("checking");
  const [customModelCounts, setCustomModelCounts] = useState<Record<string, number>>({});
  const [providers, setProviders] = useState<ProviderInfo[]>([]);

  useEffect(() => {
    getProviders(contextFromSettings(useSettingsStore.getState())).then(setProviders).catch(() => setProviders([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.customEndpoints.length]);

  useEffect(() => {
    setOllama("checking");
    const h = setTimeout(() => probeOllama(contextFromSettings(useSettingsStore.getState())).then(setOllama), 400);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.ollamaBaseUrl]);

  const testKey = async (id: keyof ApiKeys, model: string) => {
    setTests((p) => ({ ...p, [id]: "testing" }));
    try {
      const text = await getProvider(id).getCompletion("Reply with: OK", "ping", model, contextFromSettings(useSettingsStore.getState()), 16);
      setTests((p) => ({ ...p, [id]: text.length > 0 ? "ok" : "fail" }));
    } catch {
      setTests((p) => ({ ...p, [id]: "fail" }));
    }
  };

  const testCustom = async (id: string) => {
    setTests((p) => ({ ...p, [id]: "testing" }));
    const ep = useSettingsStore.getState().customEndpoints.find((e) => e.id === id);
    if (!ep) return;
    try {
      const models = await listCustomModels(ep);
      setCustomModelCounts((p) => ({ ...p, [id]: models.length }));
      setTests((p) => ({ ...p, [id]: models.length > 0 ? "ok" : "fail" }));
    } catch {
      setTests((p) => ({ ...p, [id]: "fail" }));
    }
  };

  const badge = (state: TestState) =>
    state === "ok" ? <span className="badge ok">{t("settings.testOk")}</span>
    : state === "fail" ? <span className="badge warn">{t("settings.testFail")}</span>
    : null;

  return (
    <div className="settings-wrap">
      <h2>{t("settings.title")}</h2>

      <section className="settings-section">
        <h3>{t("settings.profile")}</h3>
        <div className="settings-row">
          <label>{t("settings.nickname")}</label>
          <input value={s.nickname} onChange={(e) => s.setNickname(e.target.value)} maxLength={32} placeholder="—" />
        </div>
      </section>

      <section className="settings-section">
        <h3>{t("settings.appearance")}</h3>
        <div className="settings-row">
          <label>{t("settings.theme")}</label>
          <select value={s.theme} onChange={(e) => s.setTheme(e.target.value as ThemeId)}>
            <option value="classic">{t("settings.theme.classic")}</option>
            <option value="modern">{t("settings.theme.modern")}</option>
          </select>
        </div>
        <div className="settings-row">
          <label>{t("settings.language")}</label>
          <select value={s.language} onChange={(e) => s.setLanguage(e.target.value as Language)}>
            <option value="tr">Türkçe</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="settings-row">
          <label>{t("settings.hints")}</label>
          <input type="checkbox" checked={s.showHints} onChange={(e) => s.setShowHints(e.target.checked)} className="chk" />
        </div>
        <div className="settings-row">
          <label>{t("settings.sound")}</label>
          <input type="checkbox" checked={s.soundEnabled} onChange={(e) => s.setSoundEnabled(e.target.checked)} className="chk" />
        </div>
      </section>

      <section className="settings-section">
        <h3>{t("settings.gameplay")}</h3>
        <div className="settings-row">
          <label>{t("settings.engineLevel")}</label>
          <select value={s.engineLevel} onChange={(e) => s.setEngineLevel(Number(e.target.value))}>
            {ENGINE_LEVELS.map((l) => (
              <option key={l.id} value={l.id}>{l.label} (~{l.elo})</option>
            ))}
          </select>
        </div>
        <div className="settings-row">
          <label>{t("settings.analysisDepth")}</label>
          <input type="number" min={6} max={20} value={s.analysisDepth}
            onChange={(e) => s.setAnalysisDepth(Math.max(6, Math.min(20, Number(e.target.value))))} style={{ width: 90 }} />
        </div>
        <div className="settings-row">
          <label>{t("settings.clockEnabled")}</label>
          <input type="checkbox" checked={s.clock.enabled} onChange={(e) => s.setClock({ enabled: e.target.checked })} className="chk" />
        </div>
        {s.clock.enabled && (
          <>
            <div className="settings-row">
              <label>{t("settings.clockInitial")}</label>
              <input type="number" min={1} max={180} value={s.clock.initialMin}
                onChange={(e) => s.setClock({ initialMin: Number(e.target.value) })} style={{ width: 90 }} />
            </div>
            <div className="settings-row">
              <label>{t("settings.clockIncrement")}</label>
              <input type="number" min={0} max={60} value={s.clock.incrementSec}
                onChange={(e) => s.setClock({ incrementSec: Number(e.target.value) })} style={{ width: 90 }} />
            </div>
          </>
        )}
        <div className="settings-row">
          <label>{t("settings.aiDelay")}</label>
          <input type="number" min={0} max={10000} step={100} value={s.aiVsAiDelayMs}
            onChange={(e) => s.setAiVsAiDelayMs(Number(e.target.value))} style={{ width: 110 }} />
        </div>
      </section>

      <section className="settings-section">
        <h3>{t("settings.providers")}</h3>
        {KEY_PROVIDERS.map(({ id, label, testModel }) => {
          const hasKey = !!s.apiKeys[id];
          const state = tests[id] ?? "idle";
          return (
            <div className="settings-row" key={id}>
              <label style={{ minWidth: 160 }}>{label}</label>
              <div className="key-row">
                <input type="password" placeholder={t("settings.apiKey")} value={s.apiKeys[id]}
                  onChange={(e) => s.setApiKey(id, e.target.value)} autoComplete="off" />
                <span className={`badge ${hasKey ? "ok" : "off"}`}>{hasKey ? t("settings.keyStored") : t("settings.keyMissing")}</span>
                <button disabled={!hasKey || state === "testing"} onClick={() => testKey(id, testModel)}>
                  {state === "testing" ? t("settings.testing") : t("settings.test")}
                </button>
                {badge(state)}
              </div>
            </div>
          );
        })}

        <div className="settings-row">
          <label style={{ minWidth: 160 }}>{t("settings.ollamaUrl")}</label>
          <div className="key-row">
            <input value={s.ollamaBaseUrl} onChange={(e) => s.setOllamaBaseUrl(e.target.value)} placeholder="http://localhost:11434" />
            {ollama === "checking" ? <span className="badge off">…</span>
              : ollama.ok ? <span className="badge ok">{t("settings.ollamaOnline")} · {ollama.models.length}</span>
              : <span className="badge warn">{t("settings.ollamaOffline")}</span>}
          </div>
        </div>
        {ollama !== "checking" && !ollama.ok && (
          <div className="settings-row">
            <label style={{ minWidth: 160 }} />
            <div className="muted-small" style={{ color: "var(--danger)" }}>⚠ {ollama.error}</div>
          </div>
        )}
        {ollama !== "checking" && ollama.ok && ollama.models.length > 0 && (
          <div className="settings-row">
            <label style={{ minWidth: 160 }}>{t("settings.ollamaModels")}</label>
            <div className="muted-small">{ollama.models.join(", ")}</div>
          </div>
        )}
      </section>

      <section className="settings-section">
        <h3>{t("settings.custom")}</h3>
        {s.customEndpoints.map((ep) => {
          const state = tests[ep.id] ?? "idle";
          return (
            <div className="custom-ep" key={ep.id}>
              <div className="custom-ep-row">
                <input placeholder={t("settings.customName")} value={ep.name}
                  onChange={(e) => s.updateCustomEndpoint(ep.id, { name: e.target.value })} style={{ flex: "0 0 160px" }} />
                <input placeholder={t("settings.customBaseUrl")} value={ep.baseUrl}
                  onChange={(e) => s.updateCustomEndpoint(ep.id, { baseUrl: e.target.value })} style={{ flex: 1 }} />
                <button className="danger" onClick={() => s.removeCustomEndpoint(ep.id)}>{t("settings.customRemove")}</button>
              </div>
              <div className="custom-ep-row">
                <input type="password" placeholder={t("settings.customApiKey")} value={ep.apiKey}
                  onChange={(e) => s.updateCustomEndpoint(ep.id, { apiKey: e.target.value })} style={{ flex: "0 0 200px" }} />
                <input placeholder={t("settings.customModels")} value={ep.models}
                  onChange={(e) => s.updateCustomEndpoint(ep.id, { models: e.target.value })} style={{ flex: 1 }} />
                <button disabled={!ep.baseUrl || state === "testing"} onClick={() => testCustom(ep.id)}>
                  {state === "testing" ? t("settings.testing") : t("settings.test")}
                </button>
                {state === "ok" && <span className="badge ok">{customModelCounts[ep.id] ?? 0} {t("settings.customModelsLoaded")}</span>}
                {state === "fail" && <span className="badge warn">{t("settings.testFail")}</span>}
              </div>
            </div>
          );
        })}
        <button onClick={() => s.addCustomEndpoint()}>{t("settings.customAdd")}</button>
      </section>

      <section className="settings-section">
        <h3>{t("profiles.title")}</h3>
        <p className="muted-small">{t("profiles.desc")} {t("profiles.builtinNote")}</p>
        {s.profiles.map((p) => {
          const provInfo = providers.find((x) => x.id === p.provider);
          const isEngine = p.provider === "stockfish";
          return (
            <div className="profile-editor" key={p.id}>
              <div className="profile-editor-head">
                <Avatar emoji={p.emoji || "🤖"} color={p.color} size={40} />
                <strong>{p.name || "—"}</strong>
                {p.builtin && <span className="badge off">{t("profiles.builtin")}</span>}
                <span style={{ marginLeft: "auto" }} />
                <button className="danger" onClick={() => s.removeProfile(p.id)}>{t("profiles.delete")}</button>
              </div>
              <div className="profile-editor-grid">
                <div>
                  <label>{t("profiles.name")}</label>
                  <input value={p.name} onChange={(e) => s.updateProfile(p.id, { name: e.target.value })} />
                </div>
                <div>
                  <label>{t("profiles.emoji")}</label>
                  <input className="emoji-input" value={p.emoji} maxLength={4} onChange={(e) => s.updateProfile(p.id, { emoji: e.target.value })} />
                </div>
                <div>
                  <label>{t("profiles.color")}</label>
                  <input type="color" value={p.color} onChange={(e) => s.updateProfile(p.id, { color: e.target.value })} style={{ height: 38, padding: 2 }} />
                </div>
                <div>
                  <label>{t("profiles.rating")}</label>
                  <input type="number" value={p.rating} onChange={(e) => s.updateProfile(p.id, { rating: Number(e.target.value) })} />
                </div>
                <div>
                  <label>{t("profiles.provider")}</label>
                  <select value={p.provider} onChange={(e) => {
                    const ref = e.target.value as ProviderRef;
                    const info = providers.find((x) => x.id === ref);
                    s.updateProfile(p.id, { provider: ref, model: info?.models[0] ?? "" });
                  }}>
                    {providers.filter((x) => x.id !== "mock").map((x) => (
                      <option key={x.id} value={x.id}>{providerDisplayName(x.id, contextFromSettings(s))}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>{t("profiles.model")}</label>
                  <select value={p.model} onChange={(e) => s.updateProfile(p.id, { model: e.target.value })}>
                    {(provInfo?.models ?? []).map((m) => {
                      const lvl = isEngine ? ENGINE_LEVELS.find((l) => `level-${l.id}` === m) : null;
                      return <option key={m} value={m}>{lvl ? `${lvl.label} (~${lvl.elo})` : m}</option>;
                    })}
                  </select>
                </div>
              </div>
              {!isEngine && (
                <div>
                  <label>{t("profiles.prompt")}</label>
                  <textarea value={p.systemPrompt} placeholder={t("profiles.promptPlaceholder")}
                    onChange={(e) => s.updateProfile(p.id, { systemPrompt: e.target.value })} />
                </div>
              )}
            </div>
          );
        })}
        <button onClick={() => s.addProfile()}>{t("profiles.add")}</button>
      </section>
    </div>
  );
}
