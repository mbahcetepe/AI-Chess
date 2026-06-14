import type { Update } from "@tauri-apps/plugin-updater";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export type UpdateState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "uptodate" }
  | { status: "available"; version: string; notes?: string; update: Update }
  | { status: "downloading"; pct: number }
  | { status: "error"; error: string }
  | { status: "unsupported" };

export async function checkForUpdate(): Promise<UpdateState> {
  if (!isTauri) return { status: "unsupported" };
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (!update) return { status: "uptodate" };
    return { status: "available", version: update.version, notes: update.body, update };
  } catch (e) {
    return { status: "error", error: e instanceof Error ? e.message : String(e) };
  }
}

export async function installUpdate(update: Update, onProgress: (pct: number) => void): Promise<void> {
  let total = 0;
  let got = 0;
  await update.downloadAndInstall((ev) => {
    if (ev.event === "Started") total = ev.data.contentLength ?? 0;
    else if (ev.event === "Progress") {
      got += ev.data.chunkLength;
      if (total) onProgress(Math.round((got / total) * 100));
    } else if (ev.event === "Finished") onProgress(100);
  });
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}
