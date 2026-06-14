import { useEffect, useState } from "react";
import type { ModelStat, TournamentParticipant } from "../types";
import { useTournamentStore } from "../store/tournamentStore";
import { useSettingsStore } from "../store/settingsStore";
import * as repo from "../db/gamesRepo";
import Board from "../components/Board";
import Avatar from "../components/Avatar";
import { useT } from "../i18n/strings";

export default function TournamentPage() {
  const t = useT();
  const [tab, setTab] = useState<"tournament" | "stats">("tournament");
  return (
    <div className="doc-page" style={{ maxWidth: 1100 }}>
      <div className="tab-bar">
        <button className={tab === "tournament" ? "active" : ""} onClick={() => setTab("tournament")}>{t("tour.title")}</button>
        <button className={tab === "stats" ? "active" : ""} onClick={() => setTab("stats")}>{t("tour.stats")}</button>
      </div>
      {tab === "tournament" ? <TournamentTab /> : <StatsTab />}
    </div>
  );
}

function TournamentTab() {
  const t = useT();
  const profiles = useSettingsStore((s) => s.profiles);
  const tour = useTournamentStore();

  const [selected, setSelected] = useState<string[]>([]);
  const [rounds, setRounds] = useState(2);
  const [moveCap, setMoveCap] = useState(200);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const startTournament = () => {
    const parts: TournamentParticipant[] = selected
      .map((id) => profiles.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => ({
        provider: p.provider, model: p.model, name: p.name || p.model,
        emoji: p.emoji, color: p.color, rating: p.rating, systemPrompt: p.systemPrompt,
      }));
    void tour.start(parts, rounds, moveCap);
  };

  // Kurulum ekranı
  if (tour.status === "idle") {
    if (profiles.length === 0) return <div className="empty-state">{t("tour.noProfiles")}</div>;
    return (
      <div className="tour-setup">
        <h3>{t("tour.setup")}</h3>
        <div className="field-label">{t("tour.participants")}</div>
        <div className="profile-grid" style={{ maxHeight: 300 }}>
          {profiles.map((p) => (
            <button key={p.id} className={`profile-card ${selected.includes(p.id) ? "selected" : ""}`}
              onClick={() => toggle(p.id)} style={selected.includes(p.id) ? { borderColor: p.color } : undefined}>
              <Avatar emoji={p.emoji} color={p.color} size={36} />
              <div className="profile-card-info">
                <div className="profile-card-name">{p.name || p.model}</div>
                <div className="profile-card-rating">{p.rating}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="settings-row" style={{ marginTop: 12 }}>
          <label>{t("tour.format")}</label>
          <select value={rounds} onChange={(e) => setRounds(Number(e.target.value))}>
            <option value={2}>{t("tour.double")}</option>
            <option value={1}>{t("tour.single")}</option>
          </select>
        </div>
        <div className="settings-row">
          <label>{t("tour.moveCap")}</label>
          <input type="number" min={40} max={400} step={20} value={moveCap}
            onChange={(e) => setMoveCap(Number(e.target.value))} style={{ width: 100 }} />
        </div>
        <button className="primary" disabled={selected.length < 2} onClick={startTournament} style={{ marginTop: 12 }}>
          {t("tour.start")}
        </button>
        {selected.length < 2 && <div className="muted-small" style={{ marginTop: 6 }}>{t("tour.need2")}</div>}
      </div>
    );
  }

  // Canlı / bitmiş turnuva
  const standings = tour.standings();
  const done = tour.schedule.filter((m) => m.result).length;
  const total = tour.schedule.length;

  return (
    <div className="tour-running">
      <div className="tour-topbar">
        <div className="muted-small">{t("tour.progress")}: {done}/{total} · {tour.status === "finished" ? t("tour.finished") : ""}</div>
        <div className="tour-controls">
          {tour.status === "running" && <button onClick={() => tour.pause()}>{t("tour.pause")}</button>}
          {tour.status === "paused" && <button className="primary" onClick={() => tour.resume()}>{t("tour.resume")}</button>}
          {(tour.status === "running" || tour.status === "paused") && <button className="danger" onClick={() => tour.stop()}>{t("tour.stop")}</button>}
          {tour.status === "finished" && <button className="primary" onClick={() => useTournamentStore.setState({ status: "idle" })}>{t("tour.newTournament")}</button>}
        </div>
      </div>

      <div className="tour-grid">
        <div className="tour-live">
          <div className="field-label">{t("tour.live")}{tour.status === "running" ? ` · ${tour.livePly} ${t("tour.move")}` : ""}</div>
          {(() => {
            const cur = tour.schedule[tour.current];
            if (!cur || tour.status === "finished") return null;
            const w = tour.participants[cur.whiteIdx];
            const b = tour.participants[cur.blackIdx];
            return (
              <div className="tour-matchup">
                <span className="tour-side">
                  <Avatar emoji={w.emoji} color={w.color} size={30} />
                  <span><b>{w.name}</b><br /><span className="muted-small">⚪ {t("setup.white")}</span></span>
                </span>
                <span className="tour-vs">vs</span>
                <span className="tour-side right">
                  <span style={{ textAlign: "right" }}><b>{b.name}</b><br /><span className="muted-small">⚫ {t("setup.black")}</span></span>
                  <Avatar emoji={b.emoji} color={b.color} size={30} />
                </span>
              </div>
            );
          })()}
          <div style={{ width: "100%" }}>
            <Board fen={tour.liveFen} orientation="white" />
          </div>
        </div>

        <div className="tour-tables">
          <div className="field-label">{t("tour.standings")}</div>
          <table className="data-table">
            <thead><tr><th>{t("tour.rank")}</th><th>{t("tour.player")}</th><th>{t("tour.points")}</th><th>{t("tour.wdl")}</th><th>{t("tour.games")}</th></tr></thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.idx}>
                  <td>{i + 1}</td>
                  <td><span className="cell-player"><Avatar emoji={s.participant.emoji} color={s.participant.color} size={24} /> {s.participant.name}</span></td>
                  <td><strong>{s.points}</strong></td>
                  <td>{s.wins}-{s.draws}-{s.losses}</td>
                  <td>{s.games}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="field-label" style={{ marginTop: 14 }}>{t("tour.crosstable")}</div>
          <div className="crosstable-wrap">
            <table className="crosstable">
              <thead>
                <tr><th></th>{tour.participants.map((p, j) => <th key={j} title={p.name}>{p.emoji}</th>)}</tr>
              </thead>
              <tbody>
                {tour.participants.map((p, i) => (
                  <tr key={i}>
                    <th title={p.name}>{p.emoji} {p.name}</th>
                    {tour.participants.map((_, j) => {
                      if (i === j) return <td key={j} className="ct-self">—</td>;
                      const r = tour.resultBetween(i, j);
                      const sym = r === "1-0" ? "1" : r === "0-1" ? "0" : r === "1/2-1/2" ? "½" : "·";
                      return <td key={j} className={`ct-${r === "1-0" ? "win" : r === "0-1" ? "loss" : r ? "draw" : "pending"}`}>{sym}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsTab() {
  const t = useT();
  const [stats, setStats] = useState<ModelStat[] | null>(null);
  useEffect(() => { repo.modelStats().then(setStats).catch(() => setStats([])); }, []);

  if (stats === null) return null;
  if (stats.length === 0) return <div className="empty-state">{t("stats.empty")}</div>;
  const maxWin = Math.max(...stats.map((s) => s.winPct), 1);

  return (
    <div>
      <p className="muted-small">{t("stats.note")}</p>
      <table className="data-table">
        <thead><tr><th>{t("stats.model")}</th><th>{t("stats.games")}</th><th>{t("stats.winPct")}</th><th>{t("stats.wdl")}</th><th>{t("stats.accuracy")}</th></tr></thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.key}>
              <td>{s.name}</td>
              <td>{s.games}</td>
              <td>
                <div className="winbar"><div className="winbar-fill" style={{ width: `${(s.winPct / maxWin) * 100}%` }} /><span>{s.winPct}%</span></div>
              </td>
              <td>{s.wins}-{s.draws}-{s.losses}</td>
              <td>{s.avgAccuracy != null ? `${s.avgAccuracy}%` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
