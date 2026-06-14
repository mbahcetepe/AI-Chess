import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import type { GameMode, OpponentProfile, PlayerConfig, ProviderInfo, ProviderRef } from "../types";
import { contextFromSettings, getProviders } from "../llm/providers";
import { ENGINE_LEVELS } from "../engine/stockfish";
import { useSettingsStore } from "../store/settingsStore";
import { useT } from "../i18n/strings";
import Avatar from "./Avatar";

interface GameSetupDialogProps {
  open: boolean;
  initialMode?: GameMode;
  initialPrefer?: "engine" | "ai";
  onStart: (mode: GameMode, white: PlayerConfig, black: PlayerConfig, fen?: string) => void;
  onClose: () => void;
}

const MODES: GameMode[] = ["human_vs_ai", "ai_vs_ai", "human_vs_human"];

type OppSel =
  | { kind: "profile"; profileId: string }
  | { kind: "model"; provider: ProviderRef; model: string };

function modelLabel(info: ProviderInfo | undefined, model: string): string {
  if (info?.isEngine) {
    const id = Number(model.replace("level-", ""));
    const lvl = ENGINE_LEVELS.find((l) => l.id === id);
    return lvl ? `${lvl.label} (~${lvl.elo})` : model;
  }
  return model;
}

export default function GameSetupDialog({ open, initialMode, initialPrefer, onStart, onClose }: GameSetupDialogProps) {
  const t = useT();
  const settings = useSettingsStore();
  const profiles = settings.profiles;
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  const [mode, setMode] = useState<GameMode>(initialMode ?? "human_vs_ai");
  const [humanColor, setHumanColor] = useState<"w" | "b">("w");
  const [oppW, setOppW] = useState<OppSel | null>(null);
  const [oppB, setOppB] = useState<OppSel | null>(null);
  const [tabW, setTabW] = useState<"profile" | "model">("profile");
  const [tabB, setTabB] = useState<"profile" | "model">("profile");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [fen, setFen] = useState("");
  const [showFen, setShowFen] = useState(false);

  useEffect(() => { if (initialMode) setMode(initialMode); }, [initialMode]);

  useEffect(() => {
    if (!open) return;
    setProviders(null);
    setP1(settings.nickname || t("game.human"));
    setP2(settings.language === "tr" ? "Misafir" : "Guest");

    const firstProfile = profiles[0];
    const defaultOpp: OppSel = firstProfile
      ? { kind: "profile", profileId: firstProfile.id }
      : { kind: "model", provider: "stockfish", model: "level-3" };
    // "AI Modeline Karşı" tercihinde Model sekmesini öne al
    if (initialPrefer === "ai") { setTabW("model"); setTabB("model"); }
    else { setTabW("profile"); setTabB("profile"); }
    setOppW(defaultOpp);
    setOppB(defaultOpp);

    getProviders(contextFromSettings(settings))
      .then(setProviders)
      .catch(() => setProviders([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const profileUsable = (p: OpponentProfile): boolean => {
    if (p.provider === "stockfish" || p.provider === "mock") return true;
    const info = providers?.find((x) => x.id === p.provider);
    return !!info?.configured;
  };

  const fenValid = (() => {
    if (!fen.trim()) return true;
    try { new Chess(fen.trim()); return true; } catch { return false; }
  })();

  const oppPicker = (
    tab: "profile" | "model",
    setTab: (v: "profile" | "model") => void,
    sel: OppSel | null,
    setSel: (s: OppSel) => void,
  ) => {
    if (!providers) return <div>{t("setup.providersLoading")}</div>;
    const current = sel?.kind === "model" ? providers.find((p) => p.id === sel.provider) : undefined;
    return (
      <div className="opp-picker">
        <div className="opp-tabs">
          <button
            className={tab === "profile" ? "active" : ""}
            onClick={() => {
              setTab("profile");
              if (sel?.kind !== "profile" && profiles[0]) setSel({ kind: "profile", profileId: profiles[0].id });
            }}
          >{t("setup.tabProfile")}</button>
          <button
            className={tab === "model" ? "active" : ""}
            onClick={() => {
              setTab("model");
              if (sel?.kind !== "model") {
                const p = providers.find((x) => x.configured && x.models.length > 0) ?? providers.find((x) => x.models.length > 0);
                if (p) setSel({ kind: "model", provider: p.id, model: p.models[0] });
              }
            }}
          >{t("setup.tabModel")}</button>
        </div>

        {tab === "profile" ? (
          profiles.length === 0 ? (
            <div className="muted-small">{t("setup.noProfiles")}</div>
          ) : (
            <div className="profile-grid">
              {profiles.map((p) => {
                const usable = profileUsable(p);
                const selected = sel?.kind === "profile" && sel.profileId === p.id;
                return (
                  <button
                    key={p.id}
                    className={`profile-card ${selected ? "selected" : ""}`}
                    disabled={!usable}
                    onClick={() => setSel({ kind: "profile", profileId: p.id })}
                    style={selected ? { borderColor: p.color } : undefined}
                  >
                    <Avatar emoji={p.emoji} color={p.color} size={38} />
                    <div className="profile-card-info">
                      <div className="profile-card-name">{p.name || "—"}</div>
                      <div className="profile-card-rating">{p.rating}{!usable ? ` · ${t("setup.notConfigured")}` : ""}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )
        ) : (
          <div className="ai-selector">
            <select
              value={sel?.kind === "model" ? sel.provider : ""}
              onChange={(e) => {
                const p = providers.find((x) => x.id === (e.target.value as ProviderRef));
                if (p) setSel({ kind: "model", provider: p.id, model: p.models[0] ?? "" });
              }}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id} disabled={!p.configured || p.models.length === 0}>
                  {p.name}{!p.configured ? ` ${t("setup.notConfigured")}` : ""}
                </option>
              ))}
            </select>
            <select
              value={sel?.kind === "model" ? sel.model : ""}
              onChange={(e) => sel?.kind === "model" && setSel({ ...sel, model: e.target.value })}
            >
              {(current?.models ?? []).map((m) => <option key={m} value={m}>{modelLabel(current, m)}</option>)}
            </select>
          </div>
        )}
      </div>
    );
  };

  const buildPlayer = (sel: OppSel): PlayerConfig => {
    if (sel.kind === "profile") {
      const p = profiles.find((x) => x.id === sel.profileId)!;
      return { type: "ai", provider: p.provider, model: p.model, name: p.name, emoji: p.emoji, color: p.color, rating: p.rating, systemPrompt: p.systemPrompt };
    }
    return { type: "ai", provider: sel.provider, model: sel.model };
  };

  const oppValid = (sel: OppSel | null) =>
    !!sel && (sel.kind === "model" ? !!sel.model : profiles.some((p) => p.id === (sel as { profileId: string }).profileId));

  const canStart =
    providers !== null && fenValid &&
    (mode === "human_vs_human" ||
      (mode === "human_vs_ai" && oppValid(oppW)) ||
      (mode === "ai_vs_ai" && oppValid(oppW) && oppValid(oppB)));

  const handleStart = () => {
    const cleanFen = fen.trim() || undefined;
    if (mode === "human_vs_human") {
      onStart(mode, { type: "human", name: p1 }, { type: "human", name: p2 }, cleanFen);
    } else if (mode === "human_vs_ai") {
      const human: PlayerConfig = { type: "human", name: settings.nickname || t("game.human") };
      const ai = buildPlayer(oppW!);
      if (humanColor === "w") onStart(mode, human, ai, cleanFen);
      else onStart(mode, ai, human, cleanFen);
    } else {
      onStart(mode, buildPlayer(oppW!), buildPlayer(oppB!), cleanFen);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog setup-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h2 style={{ margin: 0 }}>{t("setup.title")}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t("setup.close")}>✕</button>
        </div>

        <div className="setup-body">
        <div className="field-label">{t("setup.mode")}</div>
        <div className="mode-buttons">
          {MODES.map((m) => (
            <button key={m} className={mode === m ? "primary" : ""} onClick={() => setMode(m)}>
              {t(`setup.mode.${m}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>

        {mode === "human_vs_ai" && (
          <>
            <div className="field-label">{t("setup.humanColor")}</div>
            <div className="mode-buttons">
              <button className={humanColor === "w" ? "primary" : ""} onClick={() => setHumanColor("w")}>⚪ {t("setup.white")}</button>
              <button className={humanColor === "b" ? "primary" : ""} onClick={() => setHumanColor("b")}>⚫ {t("setup.black")}</button>
            </div>
            <div className="field-label">{t("setup.opponent")}</div>
            {oppPicker(tabW, setTabW, oppW, setOppW)}
          </>
        )}

        {mode === "ai_vs_ai" && (
          <>
            <div className="field-label">{t("setup.tabProfileWhite")}</div>
            {oppPicker(tabW, setTabW, oppW, setOppW)}
            <div className="field-label">{t("setup.tabProfileBlack")}</div>
            {oppPicker(tabB, setTabB, oppB, setOppB)}
          </>
        )}

        {mode === "human_vs_human" && (
          <>
            <div className="field-label">{t("setup.player1")}</div>
            <input value={p1} onChange={(e) => setP1(e.target.value)} />
            <div className="field-label">{t("setup.player2")}</div>
            <input value={p2} onChange={(e) => setP2(e.target.value)} />
          </>
        )}

        <div className="field-label">
          <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={showFen} onChange={(e) => setShowFen(e.target.checked)} />
            {t("setup.fenSetup")}
          </label>
        </div>
        {showFen && (
          <>
            <input value={fen} onChange={(e) => setFen(e.target.value)} placeholder={t("setup.fenPlaceholder")} style={{ width: "100%" }} />
            {!fenValid && <div className="field-error">{t("setup.fenInvalid")}</div>}
          </>
        )}
        </div>

        <div className="dialog-actions">
          <button onClick={onClose}>{t("setup.cancel")}</button>
          <button className="primary" disabled={!canStart} onClick={handleStart}>{t("setup.start")}</button>
        </div>
      </div>
    </div>
  );
}
