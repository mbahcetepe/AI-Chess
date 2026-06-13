import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { GameMode, GameResult, GameSummary, PlayerType, ProviderId } from "../types";
import * as repo from "../db/gamesRepo";
import { PROVIDER_NAMES } from "../llm/providers";
import { useT } from "../i18n/strings";

function playerText(
  type: PlayerType,
  _provider: string | null,
  model: string | null,
  name: string | null,
  humanLabel: string,
): string {
  if (type === "human") return name || humanLabel;
  return model ?? "AI";
}

export default function HistoryPage() {
  const t = useT();
  const navigate = useNavigate();
  const [games, setGames] = useState<GameSummary[] | null>(null);
  const [mode, setMode] = useState<GameMode | "">("");
  const [provider, setProvider] = useState<string>("");
  const [result, setResult] = useState<GameResult | "">("");

  const refresh = useCallback(() => {
    repo
      .listGames({
        mode: mode || undefined,
        provider: provider || undefined,
        result: (result || undefined) as GameResult | undefined,
      })
      .then(setGames)
      .catch(() => setGames([]));
  }, [mode, provider, result]);

  useEffect(refresh, [refresh]);

  const handleDelete = async (id: number) => {
    if (!confirm(t("history.deleteConfirm"))) return;
    await repo.deleteGame(id).catch(console.error);
    refresh();
  };

  const handleExportPgn = async (g: GameSummary) => {
    if (!g.pgn) return;
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const path = await save({
        defaultPath: `game_${g.id}.pgn`,
        filters: [{ name: "PGN", extensions: ["pgn"] }],
      });
      if (path) await writeTextFile(path, g.pgn);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2>{t("history.title")}</h2>

      <div className="history-filters">
        <select value={mode} onChange={(e) => setMode(e.target.value as GameMode | "")}>
          <option value="">
            {t("history.filter.mode")}: {t("history.filter.all")}
          </option>
          <option value="human_vs_ai">{t("setup.mode.human_vs_ai")}</option>
          <option value="ai_vs_ai">{t("setup.mode.ai_vs_ai")}</option>
          <option value="human_vs_human">{t("setup.mode.human_vs_human")}</option>
        </select>
        <select value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="">
            {t("history.filter.provider")}: {t("history.filter.all")}
          </option>
          {(Object.keys(PROVIDER_NAMES) as ProviderId[]).map((p) => (
            <option key={p} value={p}>
              {PROVIDER_NAMES[p]}
            </option>
          ))}
        </select>
        <select value={result} onChange={(e) => setResult(e.target.value as GameResult | "")}>
          <option value="">
            {t("history.filter.result")}: {t("history.filter.all")}
          </option>
          <option value="1-0">1-0</option>
          <option value="0-1">0-1</option>
          <option value="1/2-1/2">1/2-1/2</option>
        </select>
      </div>

      {games !== null && games.length === 0 ? (
        <div className="empty-state">{t("history.empty")}</div>
      ) : (
        <table className="history-table">
          <thead>
            <tr>
              <th>{t("history.date")}</th>
              <th>{t("history.white")}</th>
              <th>{t("history.black")}</th>
              <th>{t("history.result")}</th>
              <th>{t("history.mode")}</th>
              <th>{t("history.movesCount")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(games ?? []).map((g) => (
              <tr key={g.id}>
                <td>{g.started_at.replace("T", " ").slice(0, 16)}</td>
                <td>{playerText(g.white_type, g.white_provider, g.white_model, g.white_name, t("game.human"))}</td>
                <td>{playerText(g.black_type, g.black_provider, g.black_model, g.black_name, t("game.human"))}</td>
                <td>
                  {g.result === "*" ? (
                    <span title={t("history.inProgress")}>—</span>
                  ) : (
                    g.result
                  )}
                  {g.report_md ? " 📄" : ""}
                </td>
                <td>{t(`setup.mode.${g.mode}` as Parameters<typeof t>[0])}</td>
                <td>{g.ply_count}</td>
                <td>
                  <div className="table-actions">
                    <button onClick={() => navigate(`/replay/${g.id}`)}>
                      {t("history.replay")}
                    </button>
                    {g.pgn && (
                      <button onClick={() => handleExportPgn(g)}>PGN</button>
                    )}
                    <button className="danger" onClick={() => handleDelete(g.id)}>
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
