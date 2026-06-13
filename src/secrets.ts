import { invoke } from "@tauri-apps/api/core";
import { getDb, isTauri } from "./db/database";

/**
 * API anahtarlarını DB'de DPAPI ile ŞİFRELİ saklar.
 * encrypt_secret/decrypt_secret Rust komutları Windows DPAPI kullanır
 * (anahtar Windows kullanıcısına bağlı; başka kullanıcı/işlem çözemez).
 */

export async function setSecret(name: string, plaintext: string): Promise<void> {
  if (!isTauri) {
    if (plaintext) localStorage.setItem(`secret:${name}`, plaintext);
    else localStorage.removeItem(`secret:${name}`);
    return;
  }
  const db = await getDb();
  if (!plaintext) {
    await db.execute("DELETE FROM secrets WHERE name = $1", [name]);
    return;
  }
  const enc = await invoke<string>("encrypt_secret", { plaintext });
  await db.execute("INSERT OR REPLACE INTO secrets (name, value) VALUES ($1, $2)", [name, enc]);
}

export async function getSecret(name: string): Promise<string> {
  if (!isTauri) return localStorage.getItem(`secret:${name}`) ?? "";
  try {
    const db = await getDb();
    const rows = await db.select<{ value: string }[]>("SELECT value FROM secrets WHERE name = $1", [name]);
    if (rows.length === 0) return "";
    return await invoke<string>("decrypt_secret", { ciphertext: rows[0].value });
  } catch {
    return "";
  }
}
