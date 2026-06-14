import { create } from "zustand";
import { Chess } from "chess.js";
import type { GameResult, PlayerConfig, TournamentParticipant } from "../types";
import { playHeadlessGame } from "../engine/gameRunner";
import { contextFromSettings } from "../llm/providers";
import { useSettingsStore } from "./settingsStore";
import * as repo from "../db/gamesRepo";

interface Match {
  whiteIdx: number;
  blackIdx: number;
  result?: GameResult;
  gameId?: number | null;
}

export interface Standing {
  idx: number;
  participant: TournamentParticipant;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  games: number;
}

interface TournamentStore {
  participants: TournamentParticipant[];
  schedule: Match[];
  current: number;
  status: "idle" | "running" | "paused" | "finished";
  tournamentId: number | null;
  moveCap: number;
  liveFen: string;
  livePly: number;
  generation: number;

  start: (participants: TournamentParticipant[], rounds: number, moveCap: number) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  standings: () => Standing[];
  resultBetween: (whiteIdx: number, blackIdx: number) => GameResult | null;
}

function toPlayer(p: TournamentParticipant): PlayerConfig {
  return {
    type: "ai", provider: p.provider, model: p.model, name: p.name,
    emoji: p.emoji, color: p.color, rating: p.rating, systemPrompt: p.systemPrompt,
  };
}

function buildSchedule(n: number, rounds: number): Match[] {
  const s: Match[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      s.push({ whiteIdx: i, blackIdx: j });
      if (rounds >= 2) s.push({ whiteIdx: j, blackIdx: i });
    }
  }
  return s;
}

export const useTournamentStore = create<TournamentStore>((set, get) => {
  async function run() {
    const gen = get().generation;
    const ctx = contextFromSettings(useSettingsStore.getState());
    const theme = useSettingsStore.getState().theme;
    const { participants, moveCap, tournamentId } = get();

    for (let idx = get().current; idx < get().schedule.length; idx++) {
      if (get().status !== "running" || get().generation !== gen) return;
      set({ current: idx, liveFen: new Chess().fen(), livePly: 0 });
      const m = get().schedule[idx];
      const white = toPlayer(participants[m.whiteIdx]);
      const black = toPlayer(participants[m.blackIdx]);

      const outcome = await playHeadlessGame(white, black, ctx, {
        moveCap,
        onProgress: (fen, ply) => {
          if (get().generation === gen) set({ liveFen: fen, livePly: ply });
        },
        shouldStop: () => get().status !== "running" || get().generation !== gen,
      });

      // Duraklatıldı/durduruldu → bu maçı kaydetme (yeniden başlatınca baştan oynanır)
      if (get().status !== "running" || get().generation !== gen) return;

      const gameId = await repo.createGame("ai_vs_ai", white, black, theme, tournamentId ?? undefined);
      await repo.saveMoves(gameId, outcome.moves);
      await repo.finishGame(gameId, outcome.result, outcome.termination, outcome.pgn, outcome.fenFinal, outcome.moves.length, outcome.opening);

      const sched = [...get().schedule];
      sched[idx] = { ...m, result: outcome.result, gameId };
      set({ schedule: sched, current: idx + 1 });
    }

    set({ status: "finished" });
    if (get().tournamentId != null) void repo.setTournamentStatus(get().tournamentId!, "finished");
  }

  return {
    participants: [],
    schedule: [],
    current: 0,
    status: "idle",
    tournamentId: null,
    moveCap: 200,
    liveFen: new Chess().fen(),
    livePly: 0,
    generation: 0,

    start: async (participants, rounds, moveCap) => {
      const tournamentId = await repo
        .createTournament("Turnuva", participants, rounds, moveCap)
        .catch(() => null);
      set({
        participants,
        schedule: buildSchedule(participants.length, rounds),
        current: 0,
        status: "running",
        tournamentId,
        moveCap,
        liveFen: new Chess().fen(),
        livePly: 0,
        generation: get().generation + 1,
      });
      void run();
    },

    pause: () => set({ status: "paused" }),

    resume: () => {
      if (get().status !== "paused") return;
      set({ status: "running" });
      void run();
    },

    stop: () => {
      set({ status: "finished", generation: get().generation + 1 });
      if (get().tournamentId != null) void repo.setTournamentStatus(get().tournamentId!, "stopped");
    },

    standings: () => {
      const { participants, schedule } = get();
      const st: Standing[] = participants.map((p, idx) => ({
        idx, participant: p, points: 0, wins: 0, draws: 0, losses: 0, games: 0,
      }));
      for (const m of schedule) {
        if (!m.result || m.result === "*") continue;
        const w = st[m.whiteIdx], b = st[m.blackIdx];
        w.games++; b.games++;
        if (m.result === "1-0") { w.points += 1; w.wins++; b.losses++; }
        else if (m.result === "0-1") { b.points += 1; b.wins++; w.losses++; }
        else { w.points += 0.5; b.points += 0.5; w.draws++; b.draws++; }
      }
      return st.sort((x, y) => y.points - x.points || y.wins - x.wins);
    },

    resultBetween: (whiteIdx, blackIdx) => {
      const m = get().schedule.find((x) => x.whiteIdx === whiteIdx && x.blackIdx === blackIdx);
      return m?.result ?? null;
    },
  };
});
