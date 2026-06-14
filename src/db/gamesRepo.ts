import { getDb, isTauri } from "./database";
import type {
  GameMode,
  GameResult,
  GameSummary,
  MoveRecord,
  PlayerConfig,
  Termination,
  ThemeId,
} from "../types";

export interface HistoryFilters {
  mode?: GameMode;
  provider?: string;
  result?: GameResult;
  limit?: number;
  offset?: number;
}

export async function createGame(
  mode: GameMode,
  white: PlayerConfig,
  black: PlayerConfig,
  theme: ThemeId,
  tournamentId?: number,
): Promise<number | null> {
  if (!isTauri) return null;
  const db = await getDb();
  const res = await db.execute(
    `INSERT INTO games (mode, white_type, white_provider, white_model, white_name,
       black_type, black_provider, black_model, black_name, theme, tournament_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      mode,
      white.type, white.provider ?? null, white.model ?? null, white.name ?? null,
      black.type, black.provider ?? null, black.model ?? null, black.name ?? null,
      theme, tournamentId ?? null,
    ],
  );
  return res.lastInsertId ?? null;
}

export async function addMove(gameId: number | null, move: MoveRecord): Promise<void> {
  if (!isTauri || gameId === null) return;
  const db = await getDb();
  await db.execute(
    `INSERT OR IGNORE INTO moves (game_id, ply, san, uci, fen_after, played_by, thinking_time_ms, was_fallback, retries, raw_response)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      gameId, move.ply, move.san, move.uci, move.fen_after, move.played_by,
      move.thinking_time_ms, move.was_fallback ? 1 : 0, move.retries, move.raw_response ?? null,
    ],
  );
}

/** Oyun sonunda tüm hamleleri topluca kaydeder (geri al ile tutarlılık için). */
export async function saveMoves(gameId: number | null, moves: MoveRecord[]): Promise<void> {
  if (!isTauri || gameId === null) return;
  const db = await getDb();
  await db.execute(`DELETE FROM moves WHERE game_id = $1`, [gameId]);
  for (const move of moves) {
    await db.execute(
      `INSERT INTO moves (game_id, ply, san, uci, fen_after, played_by, thinking_time_ms, was_fallback, retries, raw_response)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        gameId, move.ply, move.san, move.uci, move.fen_after, move.played_by,
        move.thinking_time_ms, move.was_fallback ? 1 : 0, move.retries, move.raw_response ?? null,
      ],
    );
  }
}

export async function finishGame(
  gameId: number | null,
  result: GameResult,
  termination: Termination,
  pgn: string,
  fenFinal: string,
  plyCount: number,
  opening: string | null,
): Promise<void> {
  if (!isTauri || gameId === null) return;
  const db = await getDb();
  await db.execute(
    `UPDATE games SET result=$1, termination=$2, pgn=$3, fen_final=$4, ply_count=$5, opening=$6, ended_at=datetime('now')
     WHERE id=$7`,
    [result, termination, pgn, fenFinal, plyCount, opening, gameId],
  );
}

export async function saveAnalysis(
  gameId: number,
  whiteAccuracy: number,
  blackAccuracy: number,
  perMove: { ply: number; evalCp: number; quality: string }[],
): Promise<void> {
  if (!isTauri) return;
  const db = await getDb();
  await db.execute(`UPDATE games SET white_accuracy=$1, black_accuracy=$2 WHERE id=$3`, [
    whiteAccuracy, blackAccuracy, gameId,
  ]);
  for (const m of perMove) {
    await db.execute(`UPDATE moves SET eval_cp=$1, quality=$2 WHERE game_id=$3 AND ply=$4`, [
      m.evalCp, m.quality, gameId, m.ply,
    ]);
  }
}

export async function listGames(filters: HistoryFilters = {}): Promise<GameSummary[]> {
  if (!isTauri) return [];
  const db = await getDb();
  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (filters.mode) { where.push(`mode = $${i++}`); params.push(filters.mode); }
  if (filters.provider) { where.push(`(white_provider = $${i} OR black_provider = $${i})`); params.push(filters.provider); i++; }
  if (filters.result) { where.push(`result = $${i++}`); params.push(filters.result); }
  // LIMIT/OFFSET'i kesinlikle tam sayıya zorla (SQL enjeksiyonuna karşı savunma)
  const limit = Math.max(1, Math.min(10000, Math.trunc(Number(filters.limit) || 200)));
  const offset = Math.max(0, Math.trunc(Number(filters.offset) || 0));
  const sql = `SELECT * FROM games
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY started_at DESC LIMIT ${limit} OFFSET ${offset}`;
  return db.select<GameSummary[]>(sql, params);
}

export async function getGameWithMoves(
  gameId: number,
): Promise<{ game: GameSummary; moves: MoveRecord[] } | null> {
  if (!isTauri) return null;
  const db = await getDb();
  const games = await db.select<GameSummary[]>(`SELECT * FROM games WHERE id = $1`, [gameId]);
  if (games.length === 0) return null;
  const rawMoves = await db.select<(Omit<MoveRecord, "was_fallback"> & { was_fallback: number })[]>(
    `SELECT * FROM moves WHERE game_id = $1 ORDER BY ply ASC`,
    [gameId],
  );
  const moves: MoveRecord[] = rawMoves.map((m) => ({ ...m, was_fallback: !!m.was_fallback }));
  return { game: games[0], moves };
}

export async function deleteGame(gameId: number): Promise<void> {
  if (!isTauri) return;
  const db = await getDb();
  await db.execute("PRAGMA foreign_keys = ON", []);
  await db.execute(`DELETE FROM games WHERE id = $1`, [gameId]);
}

export async function saveReport(gameId: number, reportMd: string, reportModel: string): Promise<void> {
  if (!isTauri) return;
  const db = await getDb();
  await db.execute(
    `UPDATE games SET report_md=$1, report_model=$2, report_created_at=datetime('now') WHERE id=$3`,
    [reportMd, reportModel, gameId],
  );
}

// ─────────────────────────── Turnuvalar ───────────────────────────

import type { TournamentParticipant, TournamentRecord, ModelStat } from "../types";

export async function createTournament(
  name: string,
  participants: TournamentParticipant[],
  rounds: number,
  moveCap: number,
): Promise<number | null> {
  if (!isTauri) return null;
  const db = await getDb();
  const res = await db.execute(
    `INSERT INTO tournaments (name, participants, rounds, move_cap) VALUES ($1,$2,$3,$4)`,
    [name, JSON.stringify(participants), rounds, moveCap],
  );
  return res.lastInsertId ?? null;
}

export async function setTournamentStatus(id: number, status: string): Promise<void> {
  if (!isTauri || id == null) return;
  const db = await getDb();
  await db.execute(`UPDATE tournaments SET status=$1 WHERE id=$2`, [status, id]);
}

export async function listTournaments(): Promise<TournamentRecord[]> {
  if (!isTauri) return [];
  const db = await getDb();
  return db.select<TournamentRecord[]>(`SELECT * FROM tournaments ORDER BY created_at DESC LIMIT 50`);
}

export async function getTournamentGames(tournamentId: number): Promise<GameSummary[]> {
  if (!isTauri) return [];
  const db = await getDb();
  return db.select<GameSummary[]>(
    `SELECT * FROM games WHERE tournament_id=$1 ORDER BY id ASC`,
    [tournamentId],
  );
}

/** Tüm maçlardan model başına istatistik (karşılaştırma paneli). */
export async function modelStats(): Promise<ModelStat[]> {
  if (!isTauri) return [];
  const db = await getDb();
  const rows = await db.select<GameSummary[]>(
    `SELECT * FROM games WHERE result IN ('1-0','0-1','1/2-1/2') AND
       (white_type='ai' OR black_type='ai')`,
  );
  const map = new Map<string, ModelStat>();
  const accSum = new Map<string, { sum: number; n: number }>();
  const get = (key: string, name: string): ModelStat => {
    let s = map.get(key);
    if (!s) {
      s = { key, name, games: 0, wins: 0, draws: 0, losses: 0, winPct: 0, avgAccuracy: null, avgMoveMs: null };
      map.set(key, s);
    }
    return s;
  };
  for (const g of rows) {
    for (const side of ["white", "black"] as const) {
      const type = g[`${side}_type`];
      if (type !== "ai") continue;
      const model = g[`${side}_model`];
      const provider = g[`${side}_provider`];
      if (!model) continue;
      const key = `${provider ?? "?"}/${model}`;
      const s = get(key, model);
      s.games++;
      const win = (side === "white" && g.result === "1-0") || (side === "black" && g.result === "0-1");
      const loss = (side === "white" && g.result === "0-1") || (side === "black" && g.result === "1-0");
      if (g.result === "1/2-1/2") s.draws++;
      else if (win) s.wins++;
      else if (loss) s.losses++;
      const acc = side === "white" ? g.white_accuracy : g.black_accuracy;
      if (acc != null) {
        const a = accSum.get(key) ?? { sum: 0, n: 0 };
        a.sum += acc; a.n++;
        accSum.set(key, a);
      }
    }
  }
  const out = [...map.values()].map((s) => {
    const a = accSum.get(s.key);
    return {
      ...s,
      winPct: s.games ? Math.round(((s.wins + s.draws * 0.5) / s.games) * 1000) / 10 : 0,
      avgAccuracy: a && a.n ? Math.round((a.sum / a.n) * 10) / 10 : null,
    };
  });
  return out.sort((x, y) => y.winPct - x.winPct || y.games - x.games);
}
