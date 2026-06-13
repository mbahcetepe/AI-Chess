import type Database from "@tauri-apps/plugin-sql";

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

let dbPromise: Promise<Database> | null = null;

/** Tek paylaşılan SQLite bağlantısı. Migration'lar Rust tarafında tanımlı (001_init.sql). */
export async function getDb(): Promise<Database> {
  if (!isTauri) {
    throw new Error("SQLite yalnızca Tauri penceresi içinde kullanılabilir");
  }
  if (!dbPromise) {
    dbPromise = import("@tauri-apps/plugin-sql").then((m) => m.default.load("sqlite:chess.db"));
  }
  return dbPromise;
}
