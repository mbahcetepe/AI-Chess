import { useEffect, useState } from "react";
import type { PlayerConfig } from "../types";
import { providerDisplayName, contextFromSettings } from "../llm/providers";
import { useSettingsStore } from "../store/settingsStore";
import { useT } from "../i18n/strings";
import Avatar from "./Avatar";
import CapturedPieces from "./CapturedPieces";

interface PlayerPanelProps {
  color: "w" | "b";
  player: PlayerConfig;
  accumulatedMs: number;
  remainMs: number;
  clockEnabled: boolean;
  isTurn: boolean;
  isThinking: boolean;
  turnStartedAt: number;
  gameRunning: boolean;
  captured: string[];
  advantage: number;
}

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PlayerPanel({
  color, player, accumulatedMs, remainMs, clockEnabled,
  isTurn, isThinking, turnStartedAt, gameRunning, captured, advantage,
}: PlayerPanelProps) {
  const t = useT();
  const settings = useSettingsStore();
  const [, tick] = useState(0);

  useEffect(() => {
    if (!isTurn || !gameRunning) return;
    const id = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [isTurn, gameRunning]);

  const liveElapsed = accumulatedMs + (isTurn && gameRunning ? Date.now() - turnStartedAt : 0);
  const liveRemain = remainMs - (isTurn && gameRunning ? Date.now() - turnStartedAt : 0);
  const clockMs = clockEnabled ? liveRemain : liveElapsed;
  const lowTime = clockEnabled && clockMs < 20000;

  const isHuman = player.type === "human";
  const name = isHuman ? player.name?.trim() || t("game.human") : player.name?.trim() || player.model || "AI";
  const emoji = player.emoji ?? (isHuman ? "👤" : "🤖");
  const avColor = player.color ?? (isHuman ? "#6b8cae" : "#8aa0b8");
  const sub = isHuman
    ? ""
    : player.provider
      ? `${providerDisplayName(player.provider, contextFromSettings(settings))}${player.model ? ` · ${player.model}` : ""}`
      : "";

  return (
    <div className={`player-panel ${isTurn ? "is-turn" : ""}`}>
      <Avatar emoji={emoji} color={avColor} size={42} />
      <div className="player-info">
        <div className="player-name-row">
          <span className="player-name">{name}</span>
          {player.rating != null && <span className="player-rating">{player.rating}</span>}
          {isThinking && isTurn && <span className="thinking">· {t("game.thinking")}</span>}
        </div>
        {sub && <div className="player-sub">{sub}</div>}
        <CapturedPieces owner={color} captured={captured} advantage={advantage} />
      </div>
      <div className={`player-clock ${lowTime ? "low" : ""}`}>{fmt(clockMs)}</div>
    </div>
  );
}
