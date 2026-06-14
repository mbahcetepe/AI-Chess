import { create } from "zustand";
import { Chess, type Square } from "chess.js";
import type { GameMode, GameResult, MoveRecord, PlayerConfig, Termination } from "../types";
import * as repo from "../db/gamesRepo";
import { getAiMove } from "../llm/moveService";
import { contextFromSettings, getProvider, providerDisplayName } from "../llm/providers";
import { ProviderUnreachableError } from "../llm/types";
import { engine, levelById } from "../engine/stockfish";
import { detectOpening } from "../engine/openings";
import { useSettingsStore } from "./settingsStore";
import { sounds } from "../sound";

export interface LegalTarget {
  square: string;
  isCapture: boolean;
}

interface MoveMeta {
  playedBy: "human" | "ai";
  thinkingTimeMs?: number;
  wasFallback?: boolean;
  retries?: number;
  raw?: string | null;
}

type MoveInput = string | { from: Square; to: Square; promotion?: string };

interface GameStore {
  chess: Chess;
  fen: string;
  mode: GameMode | null;
  players: { w: PlayerConfig; b: PlayerConfig };
  status: "idle" | "playing" | "over";
  aiThinking: boolean;
  aiPaused: boolean;
  aiError: string | null;
  gameId: number | null;
  moves: MoveRecord[];
  selected: Square | null;
  legalTargets: LegalTarget[];
  lastMove: { from: string; to: string } | null;
  result: GameResult | null;
  termination: Termination | null;
  pendingPromotion: { from: Square; to: Square } | null;
  generation: number;
  turnStartedAt: number;
  whiteMs: number;
  blackMs: number;
  flipped: boolean;
  clockEnabled: boolean;
  whiteRemainMs: number;
  blackRemainMs: number;

  startGame: (mode: GameMode, white: PlayerConfig, black: PlayerConfig, startFen?: string) => Promise<void>;
  rematch: () => Promise<void>;
  selectSquare: (sq: Square | null) => void;
  attemptMove: (from: Square, to: Square, promotion?: string) => boolean;
  choosePromotion: (piece: "q" | "r" | "b" | "n") => void;
  cancelPromotion: () => void;
  resign: (color: "w" | "b") => void;
  endDraw: () => void;
  takeback: () => void;
  toggleFlip: () => void;
  stopGame: () => void;
  setAiPaused: (paused: boolean) => void;
  retryAi: () => void;
  tickClock: (deltaMs: number) => void;
  reset: () => void;
  runAiTurnIfNeeded: () => Promise<void>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function detectTermination(chess: Chess): { result: GameResult; termination: Termination } | null {
  if (chess.isCheckmate()) return { result: chess.turn() === "w" ? "0-1" : "1-0", termination: "checkmate" };
  if (chess.isStalemate()) return { result: "1/2-1/2", termination: "stalemate" };
  if (chess.isThreefoldRepetition()) return { result: "1/2-1/2", termination: "threefold" };
  if (chess.isInsufficientMaterial()) return { result: "1/2-1/2", termination: "insufficient_material" };
  if (chess.isDraw()) return { result: "1/2-1/2", termination: "fifty_move" };
  return null;
}

function playSound(san: string, isCheck: boolean): void {
  if (san.startsWith("O-O")) sounds.castle();
  else if (san.includes("x")) sounds.capture();
  else sounds.move();
  if (isCheck) sounds.check();
}

export const useGameStore = create<GameStore>((set, get) => {
  function persistMovesAndFinish(result: GameResult, termination: Termination): void {
    const s = get();
    const opening = detectOpening(s.chess.history());
    void repo.saveMoves(s.gameId, s.moves).catch(console.error);
    void repo
      .finishGame(s.gameId, result, termination, s.chess.pgn(), s.chess.fen(), s.chess.history().length, opening)
      .catch(console.error);
  }

  function endGame(result: GameResult, termination: Termination): void {
    set({ status: "over", result, termination, aiThinking: false });
    sounds.gameEnd();
    persistMovesAndFinish(result, termination);
    void autoAnalyze();
  }

  // Oyun bitince arka planda otomatik analiz (ayar açıksa)
  async function autoAnalyze(): Promise<void> {
    const s = get();
    const settings = useSettingsStore.getState();
    if (!settings.autoAnalyze || s.gameId == null || s.moves.length < 2) return;
    try {
      const { analyzeGame } = await import("../engine/analysis");
      const result = await analyzeGame(s.moves, Math.min(settings.analysisDepth, 12));
      await repo.saveAnalysis(
        s.gameId,
        result.whiteAccuracy,
        result.blackAccuracy,
        result.moves.map((m) => ({ ply: m.ply, evalCp: m.evalCp, quality: m.quality })),
      );
    } catch {
      /* analiz başarısızsa sessiz geç */
    }
  }

  function applyMove(input: MoveInput, meta: MoveMeta): void {
    const s = get();
    const move = s.chess.move(input);
    const now = Date.now();
    const elapsed = meta.thinkingTimeMs ?? now - s.turnStartedAt;
    const isCheck = s.chess.inCheck();

    playSound(move.san, isCheck);

    const record: MoveRecord = {
      ply: s.chess.history().length,
      san: move.san,
      uci: move.from + move.to + (move.promotion ?? ""),
      fen_after: s.chess.fen(),
      played_by: meta.playedBy,
      thinking_time_ms: elapsed,
      was_fallback: meta.wasFallback ?? false,
      retries: meta.retries ?? 0,
      raw_response: meta.raw ?? null,
    };

    // Saat: hamleyi yapan tarafa artırım ekle
    const inc = s.clockEnabled ? useSettingsStore.getState().clock.incrementSec * 1000 : 0;
    set({
      fen: s.chess.fen(),
      moves: [...s.moves, record],
      lastMove: { from: move.from, to: move.to },
      selected: null,
      legalTargets: [],
      pendingPromotion: null,
      aiThinking: false,
      turnStartedAt: now,
      whiteMs: s.whiteMs + (move.color === "w" ? elapsed : 0),
      blackMs: s.blackMs + (move.color === "b" ? elapsed : 0),
      whiteRemainMs: s.whiteRemainMs + (move.color === "w" ? inc : 0),
      blackRemainMs: s.blackRemainMs + (move.color === "b" ? inc : 0),
    });

    const over = detectTermination(s.chess);
    if (over) endGame(over.result, over.termination);
    else void get().runAiTurnIfNeeded();
  }

  async function init(mode: GameMode, white: PlayerConfig, black: PlayerConfig, startFen?: string): Promise<void> {
    const settings = useSettingsStore.getState();
    let chess: Chess;
    try {
      chess = startFen ? new Chess(startFen) : new Chess();
    } catch {
      chess = new Chess();
    }
    const ctx = contextFromSettings(settings);
    const label = (p: PlayerConfig) =>
      p.type === "human" ? p.name?.trim() || "Human" : `${providerDisplayName(p.provider!, ctx)}/${p.model}`;
    chess.header("Event", "AI Chess");
    chess.header("Site", "AI Chess Desktop");
    chess.header("White", label(white));
    chess.header("Black", label(black));

    const gameId = await repo.createGame(mode, white, black, settings.theme).catch(() => null);
    const clockMs = settings.clock.enabled ? settings.clock.initialMin * 60_000 : 0;
    const clockOn = settings.clock.enabled && mode !== "ai_vs_ai";

    sounds.gameStart();
    set({
      chess, fen: chess.fen(), mode, players: { w: white, b: black },
      status: "playing", aiThinking: false, aiPaused: false, aiError: null, gameId,
      moves: [], selected: null, legalTargets: [], lastMove: null,
      result: null, termination: null, pendingPromotion: null,
      generation: get().generation + 1, turnStartedAt: Date.now(),
      whiteMs: 0, blackMs: 0,
      flipped: mode === "human_vs_ai" && black.type === "human",
      clockEnabled: clockOn, whiteRemainMs: clockMs, blackRemainMs: clockMs,
    });
    void get().runAiTurnIfNeeded();
  }

  return {
    chess: new Chess(),
    fen: new Chess().fen(),
    mode: null,
    players: { w: { type: "human" }, b: { type: "human" } },
    status: "idle",
    aiThinking: false, aiPaused: false, aiError: null,
    gameId: null, moves: [], selected: null, legalTargets: [], lastMove: null,
    result: null, termination: null, pendingPromotion: null,
    generation: 0, turnStartedAt: Date.now(), whiteMs: 0, blackMs: 0,
    flipped: false, clockEnabled: false, whiteRemainMs: 0, blackRemainMs: 0,

    startGame: (mode, white, black, startFen) => init(mode, white, black, startFen),

    rematch: () => {
      const s = get();
      if (!s.mode) return Promise.resolve();
      // Renkleri değiştir
      return init(s.mode, s.players.b, s.players.w);
    },

    selectSquare: (sq) => {
      const s = get();
      if (s.status !== "playing" || s.aiThinking) return;
      const turn = s.chess.turn();
      if (s.players[turn].type !== "human") return;
      if (sq === null) { set({ selected: null, legalTargets: [] }); return; }
      if (s.selected && s.legalTargets.some((t) => t.square === sq)) {
        get().attemptMove(s.selected, sq);
        return;
      }
      const piece = s.chess.get(sq);
      if (piece && piece.color === turn) {
        const showHints = useSettingsStore.getState().showHints;
        const verbose = s.chess.moves({ square: sq, verbose: true });
        set({
          selected: sq,
          legalTargets: verbose.map((m) => ({
            square: m.to,
            isCapture: showHints ? !!m.captured || m.flags.includes("e") : false,
          })),
        });
      } else {
        set({ selected: null, legalTargets: [] });
      }
    },

    attemptMove: (from, to, promotion) => {
      const s = get();
      if (s.status !== "playing" || s.aiThinking) return false;
      const turn = s.chess.turn();
      if (s.players[turn].type !== "human") return false;
      const piece = s.chess.get(from);
      const isPromotion =
        piece?.type === "p" && piece.color === turn &&
        ((turn === "w" && to[1] === "8") || (turn === "b" && to[1] === "1"));
      if (isPromotion && !promotion) {
        const legal = s.chess.moves({ square: from, verbose: true }).some((m) => m.to === to);
        if (!legal) return false;
        set({ pendingPromotion: { from, to } });
        return true;
      }
      try {
        applyMove({ from, to, promotion }, { playedBy: "human" });
        return true;
      } catch {
        return false;
      }
    },

    choosePromotion: (piece) => {
      const p = get().pendingPromotion;
      if (!p) return;
      try {
        applyMove({ from: p.from, to: p.to, promotion: piece }, { playedBy: "human" });
      } catch {
        set({ pendingPromotion: null });
      }
    },

    cancelPromotion: () => set({ pendingPromotion: null, selected: null, legalTargets: [] }),

    resign: (color) => {
      if (get().status !== "playing") return;
      set({ generation: get().generation + 1 });
      endGame(color === "w" ? "0-1" : "1-0", "resignation");
    },

    endDraw: () => {
      if (get().status !== "playing") return;
      set({ generation: get().generation + 1 });
      endGame("1/2-1/2", "draw_agreement");
    },

    takeback: () => {
      const s = get();
      if (s.status !== "playing" || s.moves.length === 0) return;
      // İnsan vs AI: insanın tekrar oynayabilmesi için 2 yarım hamle geri al
      const undoCount = s.mode === "human_vs_ai" && s.moves.length >= 2 ? 2 : 1;
      for (let i = 0; i < undoCount; i++) s.chess.undo();
      const moves = s.moves.slice(0, s.moves.length - undoCount);
      const last = moves[moves.length - 1];
      set({
        fen: s.chess.fen(),
        moves,
        lastMove: last ? { from: last.uci.slice(0, 2), to: last.uci.slice(2, 4) } : null,
        selected: null, legalTargets: [], aiError: null,
        generation: s.generation + 1, // bekleyen AI cevabını geçersiz kıl
        turnStartedAt: Date.now(),
      });
      void get().runAiTurnIfNeeded();
    },

    toggleFlip: () => set({ flipped: !get().flipped }),

    stopGame: () => {
      const s = get();
      if (s.status !== "playing") return;
      set({ generation: s.generation + 1 });
      endGame("*", "abandoned");
    },

    setAiPaused: (paused) => {
      set({ aiPaused: paused });
      if (!paused) void get().runAiTurnIfNeeded();
    },

    retryAi: () => {
      set({ aiError: null });
      void get().runAiTurnIfNeeded();
    },

    tickClock: (deltaMs) => {
      const s = get();
      if (!s.clockEnabled || s.status !== "playing") return;
      const turn = s.chess.turn();
      if (turn === "w") {
        const r = Math.max(0, s.whiteRemainMs - deltaMs);
        set({ whiteRemainMs: r });
        if (r <= 0) { set({ generation: s.generation + 1 }); endGame("0-1", "timeout"); }
      } else {
        const r = Math.max(0, s.blackRemainMs - deltaMs);
        set({ blackRemainMs: r });
        if (r <= 0) { set({ generation: s.generation + 1 }); endGame("1-0", "timeout"); }
      }
    },

    reset: () => {
      const c = new Chess();
      set({
        chess: c, fen: c.fen(), mode: null, status: "idle",
        aiThinking: false, aiPaused: false, aiError: null, gameId: null,
        moves: [], selected: null, legalTargets: [], lastMove: null,
        result: null, termination: null, pendingPromotion: null,
        generation: get().generation + 1, whiteMs: 0, blackMs: 0,
        flipped: false, clockEnabled: false, whiteRemainMs: 0, blackRemainMs: 0,
      });
    },

    runAiTurnIfNeeded: async () => {
      const s = get();
      if (s.status !== "playing" || s.aiPaused || s.aiThinking || s.aiError) return;
      const turn = s.chess.turn();
      const player = s.players[turn];
      if (player.type !== "ai" || !player.provider || !player.model) return;

      const gen = s.generation;
      set({ aiThinking: true });
      const settings = useSettingsStore.getState();

      if (s.mode === "ai_vs_ai" && s.moves.length > 0) {
        await sleep(settings.aiVsAiDelayMs);
        const cur = get();
        if (cur.generation !== gen || cur.status !== "playing" || cur.aiPaused) { set({ aiThinking: false }); return; }
      }

      const chess = get().chess;
      try {
        // Stockfish motoru
        if (player.provider === "stockfish") {
          const levelId = Number(player.model.replace("level-", "")) || settings.engineLevel;
          const started = Date.now();
          const uci = await engine.bestMove(chess.fen(), levelById(levelId));
          const cur = get();
          if (cur.generation !== gen || cur.status !== "playing") return;
          if (cur.aiPaused) { set({ aiThinking: false }); return; }
          applyMove(
            { from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, promotion: uci.slice(4) || undefined },
            { playedBy: "ai", thinkingTimeMs: Date.now() - started },
          );
          return;
        }

        // LLM sağlayıcılar
        const result = await getAiMove(
          getProvider(player.provider),
          {
            fen: chess.fen(), pgn: chess.pgn(), legalMoves: chess.moves(),
            color: turn === "w" ? "white" : "black", model: player.model,
            persona: player.systemPrompt,
          },
          contextFromSettings(settings),
        );
        const cur = get();
        if (cur.generation !== gen || cur.status !== "playing") return;
        if (cur.aiPaused) { set({ aiThinking: false }); return; }
        applyMove(result.san, {
          playedBy: "ai", thinkingTimeMs: result.thinkingTimeMs,
          wasFallback: result.wasFallback, retries: result.retries, raw: result.rawResponse,
        });
      } catch (err) {
        if (get().generation !== gen) return;
        const msg =
          err instanceof ProviderUnreachableError ? `${err.providerId}: ${err.message}`
          : err instanceof Error ? err.message : String(err);
        set({ aiThinking: false, aiError: msg });
      }
    },
  };
});
