import { create } from "zustand";
import type { CustomEndpoint, Language, OpponentProfile, ThemeId } from "../types";
import { getSecret, setSecret } from "../secrets";

/** İlk açılışta gelen hazır personalar (Stockfish destekli — anahtarsız çalışır). */
const BUILTIN_PROFILES: OpponentProfile[] = [
  { id: "profile:builtin-1", name: "Rookie Rosa", emoji: "🐣", color: "#5ab46e", provider: "stockfish", model: "level-1", systemPrompt: "", rating: 1200, builtin: true },
  { id: "profile:builtin-2", name: "Patient Pete", emoji: "🧘", color: "#4d9fff", provider: "stockfish", model: "level-3", systemPrompt: "", rating: 1500, builtin: true },
  { id: "profile:builtin-3", name: "Tough Tom", emoji: "😤", color: "#e0894a", provider: "stockfish", model: "level-5", systemPrompt: "", rating: 1900, builtin: true },
  { id: "profile:builtin-4", name: "Strategist Sara", emoji: "🦊", color: "#a855f7", provider: "stockfish", model: "level-6", systemPrompt: "", rating: 2200, builtin: true },
  { id: "profile:builtin-5", name: "Master Mark", emoji: "🎓", color: "#f4c14e", provider: "stockfish", model: "level-8", systemPrompt: "", rating: 2900, builtin: true },
];

export interface ApiKeys {
  anthropic: string;
  openai: string;
  gemini: string;
}

export interface ClockConfig {
  enabled: boolean;
  initialMin: number;
  incrementSec: number;
}

interface SettingsState {
  nickname: string;
  theme: ThemeId;
  language: Language;
  showHints: boolean;
  soundEnabled: boolean;
  apiKeys: ApiKeys;
  ollamaBaseUrl: string;
  customEndpoints: CustomEndpoint[];
  profiles: OpponentProfile[];
  profilesSeeded: boolean;
  engineLevel: number;
  analysisDepth: number;
  clock: ClockConfig;
  aiVsAiDelayMs: number;
  ollamaDeepThink: boolean;
  autoAnalyze: boolean;
  loaded: boolean;

  setNickname: (n: string) => void;
  setTheme: (t: ThemeId) => void;
  setLanguage: (l: Language) => void;
  setShowHints: (v: boolean) => void;
  setSoundEnabled: (v: boolean) => void;
  setApiKey: (provider: keyof ApiKeys, key: string) => void;
  setOllamaBaseUrl: (url: string) => void;
  addCustomEndpoint: () => void;
  updateCustomEndpoint: (id: string, patch: Partial<CustomEndpoint>) => void;
  removeCustomEndpoint: (id: string) => void;
  addProfile: () => string;
  updateProfile: (id: string, patch: Partial<OpponentProfile>) => void;
  removeProfile: (id: string) => void;
  setEngineLevel: (l: number) => void;
  setAnalysisDepth: (d: number) => void;
  setClock: (c: Partial<ClockConfig>) => void;
  setAiVsAiDelayMs: (ms: number) => void;
  setOllamaDeepThink: (v: boolean) => void;
  setAutoAnalyze: (v: boolean) => void;
  load: () => Promise<void>;
}

type Persisted = Omit<
  SettingsState,
  | "loaded"
  | "setNickname" | "setTheme" | "setLanguage" | "setShowHints" | "setSoundEnabled"
  | "setApiKey" | "setOllamaBaseUrl" | "addCustomEndpoint" | "updateCustomEndpoint"
  | "removeCustomEndpoint" | "addProfile" | "updateProfile" | "removeProfile"
  | "setEngineLevel" | "setAnalysisDepth" | "setClock"
  | "setAiVsAiDelayMs" | "setOllamaDeepThink" | "setAutoAnalyze" | "load"
>;

const DEFAULTS: Persisted = {
  nickname: "",
  theme: "classic",
  language: "en",
  showHints: true,
  soundEnabled: true,
  apiKeys: { anthropic: "", openai: "", gemini: "" },
  ollamaBaseUrl: "http://localhost:11434",
  customEndpoints: [],
  profiles: [],
  profilesSeeded: false,
  engineLevel: 3,
  analysisDepth: 12,
  clock: { enabled: false, initialMin: 5, incrementSec: 3 },
  aiVsAiDelayMs: 800,
  ollamaDeepThink: false,
  autoAnalyze: true,
};

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx".replace(/x/g, () => ((Math.random() * 16) | 0).toString(16));
}

async function persistToDisk(data: Persisted): Promise<void> {
  if (isTauri) {
    const { load } = await import("@tauri-apps/plugin-store");
    const store = await load("settings.json", { autoSave: false, defaults: {} });
    await store.set("settings", data);
    await store.save();
  } else {
    localStorage.setItem("settings", JSON.stringify(data));
  }
}

async function readFromDisk(): Promise<Partial<Persisted>> {
  try {
    if (isTauri) {
      const { load } = await import("@tauri-apps/plugin-store");
      const store = await load("settings.json", { autoSave: false, defaults: {} });
      return ((await store.get("settings")) as Persisted | undefined) ?? {};
    }
    return JSON.parse(localStorage.getItem("settings") ?? "{}");
  } catch {
    return {};
  }
}

function applyBodyTheme(theme: ThemeId) {
  document.body.dataset.theme = theme;
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const persist = () => {
    const s = get();
    void persistToDisk({
      nickname: s.nickname,
      theme: s.theme,
      language: s.language,
      showHints: s.showHints,
      soundEnabled: s.soundEnabled,
      // API anahtarları settings.json'a DÜZ METİN yazılmaz; DPAPI ile şifreli DB'de tutulur
      apiKeys: { anthropic: "", openai: "", gemini: "" },
      ollamaBaseUrl: s.ollamaBaseUrl,
      customEndpoints: s.customEndpoints,
      profiles: s.profiles,
      profilesSeeded: s.profilesSeeded,
      engineLevel: s.engineLevel,
      analysisDepth: s.analysisDepth,
      clock: s.clock,
      aiVsAiDelayMs: s.aiVsAiDelayMs,
      ollamaDeepThink: s.ollamaDeepThink,
      autoAnalyze: s.autoAnalyze,
    });
  };

  return {
    ...DEFAULTS,
    loaded: false,

    setNickname: (nickname) => { set({ nickname }); persist(); },
    setTheme: (theme) => { applyBodyTheme(theme); set({ theme }); persist(); },
    setLanguage: (language) => { set({ language }); persist(); },
    setShowHints: (showHints) => { set({ showHints }); persist(); },
    setSoundEnabled: (soundEnabled) => { set({ soundEnabled }); persist(); },
    setApiKey: (provider, key) => {
      const trimmed = key.trim();
      set({ apiKeys: { ...get().apiKeys, [provider]: trimmed } });
      // Şifreli DB'ye yaz (settings.json'a değil)
      void setSecret(`apikey:${provider}`, trimmed);
    },
    setOllamaBaseUrl: (url) => {
      set({ ollamaBaseUrl: url.trim().replace(/\/+$/, "") });
      persist();
    },
    addCustomEndpoint: () => {
      const ep: CustomEndpoint = {
        id: `custom:${uuid()}`,
        name: "",
        baseUrl: "",
        apiKey: "",
        models: "",
      };
      set({ customEndpoints: [...get().customEndpoints, ep] });
      persist();
    },
    updateCustomEndpoint: (id, patch) => {
      set({
        customEndpoints: get().customEndpoints.map((e) =>
          e.id === id ? { ...e, ...patch } : e,
        ),
      });
      persist();
    },
    removeCustomEndpoint: (id) => {
      set({ customEndpoints: get().customEndpoints.filter((e) => e.id !== id) });
      persist();
    },
    addProfile: () => {
      const id = `profile:${uuid()}`;
      const ep: OpponentProfile = {
        id, name: "", emoji: "🤖", color: "#4d9fff",
        provider: "stockfish", model: "level-3", systemPrompt: "", rating: 1500,
      };
      set({ profiles: [...get().profiles, ep] });
      persist();
      return id;
    },
    updateProfile: (id, patch) => {
      set({ profiles: get().profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
      persist();
    },
    removeProfile: (id) => {
      set({ profiles: get().profiles.filter((p) => p.id !== id) });
      persist();
    },
    setEngineLevel: (engineLevel) => { set({ engineLevel }); persist(); },
    setAnalysisDepth: (analysisDepth) => { set({ analysisDepth }); persist(); },
    setClock: (c) => { set({ clock: { ...get().clock, ...c } }); persist(); },
    setAiVsAiDelayMs: (aiVsAiDelayMs) => { set({ aiVsAiDelayMs }); persist(); },
    setOllamaDeepThink: (ollamaDeepThink) => { set({ ollamaDeepThink }); persist(); },
    setAutoAnalyze: (autoAnalyze) => { set({ autoAnalyze }); persist(); },

    load: async () => {
      const saved = await readFromDisk();
      const merged: Persisted = {
        ...DEFAULTS,
        ...saved,
        apiKeys: { ...DEFAULTS.apiKeys, ...(saved.apiKeys ?? {}) },
        clock: { ...DEFAULTS.clock, ...(saved.clock ?? {}) },
        customEndpoints: saved.customEndpoints ?? [],
        profiles: saved.profiles ?? [],
        profilesSeeded: saved.profilesSeeded ?? false,
      };
      // İlk açılışta hazır personaları bir kez ekle
      if (!merged.profilesSeeded) {
        merged.profiles = [...BUILTIN_PROFILES, ...merged.profiles];
        merged.profilesSeeded = true;
      }

      // --- API anahtarları: şifreli DB'den yükle + eski düz-metin anahtarları taşı ---
      const legacy = saved.apiKeys ?? { anthropic: "", openai: "", gemini: "" };
      let migrated = false;
      const keys = { anthropic: "", openai: "", gemini: "" };
      for (const p of ["anthropic", "openai", "gemini"] as const) {
        let v = await getSecret(`apikey:${p}`);
        // DB'de yoksa ama settings.json'da düz metin varsa → şifreli DB'ye taşı
        if (!v && legacy[p]) {
          v = legacy[p];
          await setSecret(`apikey:${p}`, v);
          migrated = true;
        }
        keys[p] = v;
      }
      merged.apiKeys = keys;

      applyBodyTheme(merged.theme);
      set({ ...merged, loaded: true });
      // Düz-metin anahtarları settings.json'dan temizle (artık şifreli DB'de)
      if (migrated) persist();
    },
  };
});
