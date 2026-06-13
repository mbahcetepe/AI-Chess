-- API anahtarları DPAPI ile şifrelenip (hex) burada saklanır; düz metin değil.
CREATE TABLE IF NOT EXISTS secrets (
  name  TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
