CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('human_vs_ai','ai_vs_ai','human_vs_human')),
  white_type TEXT NOT NULL CHECK (white_type IN ('human','ai')),
  white_provider TEXT,
  white_model TEXT,
  black_type TEXT NOT NULL CHECK (black_type IN ('human','ai')),
  black_provider TEXT,
  black_model TEXT,
  result TEXT CHECK (result IN ('1-0','0-1','1/2-1/2','*')) DEFAULT '*',
  termination TEXT,
  pgn TEXT,
  fen_final TEXT,
  theme TEXT,
  ply_count INTEGER NOT NULL DEFAULT 0,
  report_md TEXT,
  report_model TEXT,
  report_created_at TEXT
);

CREATE TABLE IF NOT EXISTS moves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  ply INTEGER NOT NULL,
  san TEXT NOT NULL,
  uci TEXT NOT NULL,
  fen_after TEXT NOT NULL,
  played_by TEXT NOT NULL CHECK (played_by IN ('human','ai')),
  thinking_time_ms INTEGER,
  was_fallback INTEGER NOT NULL DEFAULT 0,
  retries INTEGER NOT NULL DEFAULT 0,
  raw_response TEXT,
  UNIQUE (game_id, ply)
);

CREATE INDEX IF NOT EXISTS idx_games_started_at ON games(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_moves_game ON moves(game_id, ply);
