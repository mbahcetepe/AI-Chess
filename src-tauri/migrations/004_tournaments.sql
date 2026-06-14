CREATE TABLE IF NOT EXISTS tournaments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  status       TEXT NOT NULL DEFAULT 'running',
  rounds       INTEGER NOT NULL DEFAULT 2,
  participants TEXT NOT NULL,
  move_cap     INTEGER NOT NULL DEFAULT 200
);

ALTER TABLE games ADD COLUMN tournament_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_games_tournament ON games(tournament_id);
