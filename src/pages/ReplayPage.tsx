import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Chess } from "chess.js";
import Board, { type BoardArrow } from "../components/Board";
import EvalBar from "../components/EvalBar";
import EvalGraph from "../components/EvalGraph";
import MoveList from "../components/MoveList";
import AnalysisPanel from "../components/AnalysisPanel";
import type { GameSummary, MoveRecord, ProviderRef, ProviderInfo } from "../types";
import * as repo from "../db/gamesRepo";
import { contextFromSettings, getProviders, providerDisplayName } from "../llm/providers";
import { generateReport } from "../llm/reportService";
import { analyzeGame } from "../engine/analysis";
import { engine, type PvLine } from "../engine/stockfish";
import { useSettingsStore } from "../store/settingsStore";
import { useT } from "../i18n/strings";

const START_FEN = new Chess().fen();
const SPEEDS = [0.5, 1, 2, 4];
const BASE_INTERVAL_MS = 1600;

export default function ReplayPage() {
  const t = useT();
  const { id } = useParams();
  const settings = useSettingsStore();
  const [data, setData] = useState<{ game: GameSummary; moves: MoveRecord[] } | null | "missing">(null);
  const [ply, setPly] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [flipped, setFlipped] = useState(false);
  const [tab, setTab] = useState<"board" | "report">("board");

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [lines, setLines] = useState<PvLine[]>([]);
  const [linesLoading, setLinesLoading] = useState(false);
  const linesReq = useRef(0);

  const [reportProviders, setReportProviders] = useState<ProviderInfo[]>([]);
  const [reportSel, setReportSel] = useState<{ provider: ProviderRef; model: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;
    repo.getGameWithMoves(Number(id))
      .then((res) => { setData(res ?? "missing"); if (res) setPly(res.moves.length); })
      .catch(() => setData("missing"));
  }, [id]);

  useEffect(() => {
    getProviders(contextFromSettings(settings))
      .then((list) => {
        const usable = list.filter((p) => p.id !== "mock" && p.id !== "stockfish" && p.configured && p.models.length > 0);
        setReportProviders(usable);
        if (usable.length > 0) {
          const first = usable.find((p) => p.id === "anthropic") ?? usable[0];
          setReportSel({ provider: first.id, model: first.models[0] });
        }
      })
      .catch(() => setReportProviders([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moves = data !== null && data !== "missing" ? data.moves : [];
  const game = data !== null && data !== "missing" ? data.game : null;

  const fen = useMemo(() => {
    if (ply === 0 || moves.length === 0) return START_FEN;
    return moves[Math.min(ply, moves.length) - 1].fen_after;
  }, [ply, moves]);

  const lastMove = useMemo(() => {
    if (ply === 0 || moves.length === 0) return null;
    const uci = moves[Math.min(ply, moves.length) - 1].uci;
    return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
  }, [ply, moves]);

  const liveEval = useMemo(() => {
    if (ply === 0 || moves.length === 0) return null;
    return moves[Math.min(ply, moves.length) - 1].eval_cp ?? null;
  }, [ply, moves]);

  // Canlı çoklu-hat analiz (board sekmesi)
  useEffect(() => {
    if (tab !== "board") return;
    const id = ++linesReq.current;
    setLinesLoading(true);
    engine
      .evaluateLines(fen, 14, 3)
      .then((r) => { if (linesReq.current === id) { setLines(r); setLinesLoading(false); } })
      .catch(() => { if (linesReq.current === id) setLinesLoading(false); });
  }, [fen, tab]);

  const bestArrow: BoardArrow[] = lines[0]?.movesUci[0]
    ? [{ from: lines[0].movesUci[0].slice(0, 2), to: lines[0].movesUci[0].slice(2, 4), color: "#3aa757" }]
    : [];

  // Gözden geçir: hata içeren ply'lere atla
  const mistakePlies = useMemo(
    () => moves.filter((m) => ["inaccuracy", "mistake", "blunder"].includes(m.quality ?? "")).map((m) => m.ply),
    [moves],
  );
  const gotoNextMistake = () => {
    const next = mistakePlies.find((p) => p > ply);
    if (next) setPly(next);
  };
  const gotoPrevMistake = () => {
    const prev = [...mistakePlies].reverse().find((p) => p < ply);
    if (prev) setPly(prev);
  };

  useEffect(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (!playing) return;
    timerRef.current = window.setInterval(() => {
      setPly((p) => { if (p >= moves.length) { setPlaying(false); return p; } return p + 1; });
    }, BASE_INTERVAL_MS / speed);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, speed, moves.length]);

  const handleAnalyze = useCallback(async () => {
    if (!game) return;
    setAnalyzing(true);
    setAnalyzeProgress(0);
    try {
      const result = await analyzeGame(moves, settings.analysisDepth, (done, total) =>
        setAnalyzeProgress(Math.round((done / total) * 100)),
      );
      await repo.saveAnalysis(
        game.id, result.whiteAccuracy, result.blackAccuracy,
        result.moves.map((m) => ({ ply: m.ply, evalCp: m.evalCp, quality: m.quality })),
      );
      // Lokal state'i güncelle
      const byPly = new Map(result.moves.map((m) => [m.ply, m]));
      setData({
        game: { ...game, white_accuracy: result.whiteAccuracy, black_accuracy: result.blackAccuracy },
        moves: moves.map((mv) => {
          const a = byPly.get(mv.ply);
          return a ? { ...mv, eval_cp: a.evalCp, quality: a.quality } : mv;
        }),
      });
    } catch (err) {
      setReportError(err instanceof Error ? err.message : String(err));
    } finally {
      setAnalyzing(false);
    }
  }, [game, moves, settings.analysisDepth]);

  const handleGenerateReport = useCallback(async () => {
    if (!game || !reportSel) return;
    setGenerating(true);
    setReportError(null);
    try {
      const md = await generateReport(game, moves, reportSel.provider, reportSel.model, contextFromSettings(settings), settings.language);
      const modelTag = `${reportSel.provider}/${reportSel.model}`;
      await repo.saveReport(game.id, md, modelTag);
      setData({ game: { ...game, report_md: md, report_model: modelTag }, moves });
    } catch (err) {
      setReportError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }, [game, moves, reportSel, settings]);

  const handleSaveMd = useCallback(async () => {
    if (!game?.report_md) return;
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const path = await save({ defaultPath: `Mac_Raporu_${game.id}_${game.started_at.slice(0, 10)}.md`, filters: [{ name: "Markdown", extensions: ["md"] }] });
      if (path) { await writeTextFile(path, game.report_md); setSaveNote(t("report.saved")); setTimeout(() => setSaveNote(null), 3000); }
    } catch (err) {
      setReportError(err instanceof Error ? err.message : String(err));
    }
  }, [game, t]);

  if (data === "missing") return <div className="empty-state">{t("replay.notFound")}</div>;
  if (data === null || !game) return null;

  const whiteLabel = game.white_type === "human" ? (game.white_name ?? t("game.human")) : (game.white_model ?? "AI");
  const blackLabel = game.black_type === "human" ? (game.black_name ?? t("game.human")) : (game.black_model ?? "AI");
  const orientation: "white" | "black" = flipped ? "black" : "white";
  const ctx = contextFromSettings(settings);

  return (
    <div>
      <div className="tab-bar">
        <button className={tab === "board" ? "active" : ""} onClick={() => setTab("board")}>{t("replay.board")}</button>
        <button className={tab === "report" ? "active" : ""} onClick={() => setTab("report")}>
          {t("replay.report")} {game.report_md ? "📄" : ""}
        </button>
      </div>

      {tab === "board" ? (
        <div className="replay-layout">
          <div className="board-area">
            <EvalBar cp={liveEval} orientation={orientation} />
            <div className="board-column">
              <div className="board-wrap">
                <Board fen={fen} lastMove={lastMove} orientation={orientation} arrows={bestArrow} />
              </div>
              <div className="replay-controls">
                <button onClick={() => setPly(0)} title={t("replay.start")}>⏮</button>
                <button onClick={() => setPly((p) => Math.max(0, p - 1))} title={t("replay.back")}>◀</button>
                <button className="primary" onClick={() => setPlaying((p) => !p)}>{playing ? `⏸` : `▶`}</button>
                <button onClick={() => setPly((p) => Math.min(moves.length, p + 1))} title={t("replay.forward")}>▶▶</button>
                <button onClick={() => setPly(moves.length)} title={t("replay.end")}>⏭</button>
                <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                  {SPEEDS.map((s) => <option key={s} value={s}>{s}x</option>)}
                </select>
                <button onClick={() => setFlipped((f) => !f)} title={t("replay.flip")}>⇅</button>
              </div>
            </div>
          </div>

          <div className="side-column">
            <div className="replay-meta">
              <div>⚪ {whiteLabel} — ⚫ {blackLabel}</div>
              <div className="muted-small">
                {game.started_at.replace("T", " ").slice(0, 16)} · {game.result}
                {game.termination ? ` · ${t(`term.${game.termination}` as Parameters<typeof t>[0])}` : ""}
              </div>
              {game.opening && <div className="muted-small">{t("history.opening")}: {game.opening}</div>}
              {(game.white_accuracy != null || game.black_accuracy != null) && (
                <div className="accuracy-row">
                  <span>{t("replay.accuracy")}:</span>
                  <span className="acc-white">⚪ {game.white_accuracy?.toFixed(1)}%</span>
                  <span className="acc-black">⚫ {game.black_accuracy?.toFixed(1)}%</span>
                </div>
              )}
            </div>

            <AnalysisPanel fen={fen} lines={lines} loading={linesLoading} />

            <div className="analyze-bar">
              <button className="primary" disabled={analyzing} onClick={handleAnalyze}>
                {analyzing ? `${t("replay.analyzing")} ${analyzeProgress}%`
                  : game.white_accuracy != null ? t("replay.reanalyze") : t("replay.analyze")}
              </button>
            </div>

            {mistakePlies.length > 0 && (
              <div className="review-bar">
                <button onClick={gotoPrevMistake}>{t("analysis.prevMistake")}</button>
                <button onClick={gotoNextMistake}>{t("analysis.nextMistake")}</button>
              </div>
            )}

            {moves.some((m) => m.eval_cp != null) && (
              <EvalGraph moves={moves} currentPly={ply} onSelectPly={setPly} />
            )}

            <MoveList moves={moves} currentPly={ply} onSelectPly={setPly} />
          </div>
        </div>
      ) : (
        <div className="doc-page">
          <div className="report-actions">
            {reportProviders.length === 0 ? (
              <span>{t("report.noProvider")}</span>
            ) : (
              <>
                <select value={reportSel?.provider ?? ""} onChange={(e) => {
                  const p = reportProviders.find((x) => x.id === e.target.value);
                  if (p) setReportSel({ provider: p.id, model: p.models[0] });
                }}>
                  {reportProviders.map((p) => <option key={p.id} value={p.id}>{providerDisplayName(p.id, ctx)}</option>)}
                </select>
                <select value={reportSel?.model ?? ""} onChange={(e) => reportSel && setReportSel({ ...reportSel, model: e.target.value })}>
                  {(reportProviders.find((p) => p.id === reportSel?.provider)?.models ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <button className="primary" disabled={generating} onClick={handleGenerateReport}>
                  {generating ? <><span className="spin">⏳</span> {t("report.generating")}</>
                    : game.report_md ? t("report.regenerate") : t("report.generate")}
                </button>
              </>
            )}
            {game.report_md && <button onClick={handleSaveMd}>{t("report.saveMd")}</button>}
            {saveNote && <span className="badge ok">{saveNote}</span>}
          </div>

          {reportError && (
            <div className="error-box" style={{ marginBottom: 12 }}>
              <div>{t("report.error")}</div>
              <div className="error-detail">{reportError}</div>
            </div>
          )}

          {game.report_md ? (
            <>
              {game.report_model && <div className="muted-small" style={{ marginBottom: 8 }}>{t("report.generatedBy")}: {game.report_model}</div>}
              <div className="report-view"><ReactMarkdown>{game.report_md}</ReactMarkdown></div>
            </>
          ) : (!generating && <div className="empty-state">{t("report.none")}</div>)}
        </div>
      )}
    </div>
  );
}
