import { useState } from "react";
import type { GameMode } from "../types";
import { useSettingsStore } from "../store/settingsStore";
import { useT } from "../i18n/strings";

interface WelcomeScreenProps {
  onNewGame: (mode: GameMode, prefer?: "engine" | "ai") => void;
}

export default function WelcomeScreen({ onNewGame }: WelcomeScreenProps) {
  const t = useT();
  const nickname = useSettingsStore((s) => s.nickname);
  const setNickname = useSettingsStore((s) => s.setNickname);
  const [draft, setDraft] = useState("");

  // Ad henüz girilmemişse önce onu sor
  if (!nickname.trim()) {
    return (
      <div className="welcome">
        <div className="welcome-hero">
          <div className="welcome-logo">♞</div>
          <h1>{t("welcome.title")}</h1>
          <div className="welcome-motto">“{t("app.motto")}”</div>
        </div>
        <div className="welcome-name-card">
          <h3>{t("welcome.namePrompt")}</h3>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) setNickname(draft.trim());
            }}
            placeholder={t("welcome.namePlaceholder")}
            maxLength={32}
          />
          <button className="primary" disabled={!draft.trim()} onClick={() => setNickname(draft.trim())}>
            {t("welcome.continue")}
          </button>
        </div>
      </div>
    );
  }

  const cards: { mode: GameMode; prefer?: "engine" | "ai"; icon: string; label: string }[] = [
    { mode: "human_vs_ai", prefer: "engine", icon: "🤖", label: t("welcome.quickEngine") },
    { mode: "human_vs_ai", prefer: "ai", icon: "✨", label: t("welcome.quickAi") },
    { mode: "ai_vs_ai", icon: "👁", label: t("welcome.quickWatch") },
    { mode: "human_vs_human", icon: "👥", label: t("welcome.quickLocal") },
  ];

  return (
    <div className="welcome">
      <div className="welcome-hero">
        <div className="welcome-logo">♞</div>
        <h1>{t("welcome.greeting")}, {nickname}</h1>
        <div className="welcome-motto">“{t("app.motto")}”</div>
        <p className="welcome-sub">{t("welcome.subtitle")}</p>
      </div>
      <div className="welcome-cards">
        {cards.map((c, i) => (
          <button key={i} className="welcome-card" onClick={() => onNewGame(c.mode, c.prefer)}>
            <span className="welcome-card-icon">{c.icon}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
