/**
 * Stockfish 18 (lite, single-thread) UCI sürücüsü.
 * Hem oyun (ayarlanabilir seviye) hem de pozisyon değerlendirme için.
 * Komutlar tek kuyrukta sıralanır; webview içinde SharedArrayBuffer gerektirmez.
 */

const ENGINE_URL = "/engine/stockfish-18-lite-single.js";

export interface EngineLevel {
  id: number;
  label: string; // i18n dışı kısa etiket; UI ayrıca çevirir
  elo: number;
  skill: number; // 0-20
  movetimeMs: number;
}

/** UI'da gösterilen seviye listesi (zayıf → güçlü). */
export const ENGINE_LEVELS: EngineLevel[] = [
  { id: 1, label: "Acemi", elo: 1320, skill: 0, movetimeMs: 200 },
  { id: 2, label: "Başlangıç", elo: 1500, skill: 3, movetimeMs: 300 },
  { id: 3, label: "Orta", elo: 1750, skill: 6, movetimeMs: 400 },
  { id: 4, label: "İyi", elo: 2000, skill: 9, movetimeMs: 600 },
  { id: 5, label: "Güçlü", elo: 2300, skill: 13, movetimeMs: 800 },
  { id: 6, label: "Uzman", elo: 2600, skill: 16, movetimeMs: 1000 },
  { id: 7, label: "Usta", elo: 2850, skill: 19, movetimeMs: 1200 },
  { id: 8, label: "En Güçlü", elo: 3190, skill: 20, movetimeMs: 1500 },
];

export interface EvalResult {
  /** Beyaz lehine santipiyon. Mat varsa ±100000 - mate mesafesi. */
  cp: number;
  mate: number | null; // pozitif: beyaz mat ediyor; negatif: siyah
  bestMoveUci: string | null;
  depth: number;
}

export interface PvLine {
  rank: number; // 1..N (1 = en iyi)
  cp: number; // beyaz lehine
  mate: number | null;
  movesUci: string[]; // varyantın UCI hamleleri
}

const MATE_SCORE = 100000;

type Task<T> = () => Promise<T>;

class StockfishEngine {
  private worker: Worker | null = null;
  private booting: Promise<void> | null = null;
  private lineHandlers: ((line: string) => void)[] = [];
  private queue: Promise<unknown> = Promise.resolve();
  private limitStrength = false;

  private async boot(): Promise<void> {
    if (this.worker) return;
    if (this.booting) return this.booting;

    this.booting = new Promise<void>((resolve, reject) => {
      try {
        const w = new Worker(ENGINE_URL);
        this.worker = w;
        w.onmessage = (e: MessageEvent) => {
          const line = typeof e.data === "string" ? e.data : String(e.data);
          for (const h of this.lineHandlers) h(line);
        };
        w.onerror = (e) => reject(new Error(`Stockfish worker hatası: ${e.message}`));

        const onLine = (line: string) => {
          if (line.includes("uciok")) {
            this.send("isready");
          } else if (line.includes("readyok")) {
            this.off(onLine);
            resolve();
          }
        };
        this.on(onLine);
        this.send("uci");
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
    return this.booting;
  }

  private on(h: (line: string) => void): void {
    this.lineHandlers.push(h);
  }
  private off(h: (line: string) => void): void {
    this.lineHandlers = this.lineHandlers.filter((x) => x !== h);
  }
  private send(cmd: string): void {
    this.worker?.postMessage(cmd);
  }

  /** Görevleri sırayla çalıştır (motor tek seferde tek iş yapar). */
  private enqueue<T>(task: Task<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run as Promise<T>;
  }

  private async configureStrength(level: EngineLevel | null): Promise<void> {
    await this.boot();
    if (level) {
      this.send("setoption name UCI_LimitStrength value true");
      this.send(`setoption name UCI_Elo value ${level.elo}`);
      this.send(`setoption name Skill Level value ${level.skill}`);
      this.limitStrength = true;
    } else if (this.limitStrength) {
      this.send("setoption name UCI_LimitStrength value false");
      this.send("setoption name Skill Level value 20");
      this.limitStrength = false;
    }
  }

  /** Belirtilen seviyede en iyi hamleyi (UCI) döndürür. */
  bestMove(fen: string, level: EngineLevel): Promise<string> {
    return this.enqueue(async () => {
      await this.configureStrength(level);
      return new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.off(handler);
          reject(new Error("Stockfish zaman aşımı"));
        }, level.movetimeMs + 8000);
        const handler = (line: string) => {
          if (line.startsWith("bestmove")) {
            clearTimeout(timeout);
            this.off(handler);
            const mv = line.split(/\s+/)[1];
            if (mv && mv !== "(none)") resolve(mv);
            else reject(new Error("Stockfish hamle bulamadı"));
          }
        };
        this.on(handler);
        this.send("ucinewgame");
        this.send(`position fen ${fen}`);
        this.send(`go movetime ${level.movetimeMs}`);
      });
    });
  }

  /** En iyi N varyantı (Multi-PV) — chess.com tarzı analiz paneli için. */
  evaluateLines(fen: string, depth = 14, multipv = 3): Promise<PvLine[]> {
    return this.enqueue(async () => {
      await this.configureStrength(null);
      this.send(`setoption name MultiPV value ${multipv}`);
      const whiteToMove = fen.split(" ")[1] !== "b";
      return new Promise<PvLine[]>((resolve, reject) => {
        const lines = new Map<number, PvLine>();
        const timeout = setTimeout(() => {
          this.off(handler);
          this.send("setoption name MultiPV value 1");
          reject(new Error("Multi-PV zaman aşımı"));
        }, 20000);
        const handler = (line: string) => {
          if (line.startsWith("info") && line.includes(" multipv ") && line.includes(" pv ")) {
            const rank = Number(line.match(/ multipv (\d+)/)?.[1] ?? "0");
            const cpM = line.match(/ score cp (-?\d+)/);
            const mateM = line.match(/ score mate (-?\d+)/);
            const pvM = line.match(/ pv (.+)$/);
            if (!rank || !pvM) return;
            let cp = cpM ? Number(cpM[1]) : 0;
            let mate: number | null = mateM ? Number(mateM[1]) : null;
            if (mate !== null) cp = mate > 0 ? MATE_SCORE - mate : -MATE_SCORE - mate;
            if (!whiteToMove) { cp = -cp; if (mate !== null) mate = -mate; }
            lines.set(rank, { rank, cp, mate, movesUci: pvM[1].trim().split(/\s+/) });
          } else if (line.startsWith("bestmove")) {
            clearTimeout(timeout);
            this.off(handler);
            this.send("setoption name MultiPV value 1");
            resolve([...lines.values()].sort((a, b) => a.rank - b.rank));
          }
        };
        this.on(handler);
        this.send(`position fen ${fen}`);
        this.send(`go depth ${depth}`);
      });
    });
  }

  /** Tam güçte pozisyon değerlendirmesi (beyaz lehine cp). */
  evaluate(fen: string, depth = 14): Promise<EvalResult> {
    return this.enqueue(async () => {
      await this.configureStrength(null);
      this.send("setoption name MultiPV value 1");
      const whiteToMove = fen.split(" ")[1] !== "b";
      return new Promise<EvalResult>((resolve, reject) => {
        let lastCp = 0;
        let lastMate: number | null = null;
        let lastDepth = 0;
        let bestMoveUci: string | null = null;
        const timeout = setTimeout(() => {
          this.off(handler);
          reject(new Error("Stockfish değerlendirme zaman aşımı"));
        }, 20000);

        const handler = (line: string) => {
          if (line.startsWith("info") && line.includes(" score ")) {
            const dMatch = line.match(/ depth (\d+)/);
            if (dMatch) lastDepth = Number(dMatch[1]);
            const cpMatch = line.match(/ score cp (-?\d+)/);
            const mateMatch = line.match(/ score mate (-?\d+)/);
            if (cpMatch) {
              lastCp = Number(cpMatch[1]);
              lastMate = null;
            } else if (mateMatch) {
              const m = Number(mateMatch[1]);
              lastMate = m;
              lastCp = m > 0 ? MATE_SCORE - m : -MATE_SCORE - m;
            }
          } else if (line.startsWith("bestmove")) {
            clearTimeout(timeout);
            this.off(handler);
            bestMoveUci = line.split(/\s+/)[1] ?? null;
            if (bestMoveUci === "(none)") bestMoveUci = null;
            // Sıra siyahtaysa skoru beyaz perspektifine çevir
            const cp = whiteToMove ? lastCp : -lastCp;
            const mate = lastMate === null ? null : whiteToMove ? lastMate : -lastMate;
            resolve({ cp, mate, bestMoveUci, depth: lastDepth });
          }
        };
        this.on(handler);
        this.send(`position fen ${fen}`);
        this.send(`go depth ${depth}`);
      });
    });
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.booting = null;
    this.lineHandlers = [];
    this.queue = Promise.resolve();
  }
}

export const engine = new StockfishEngine();

/**
 * Maç-sonu toplu analizi (analyzeGame) için AYRI motor örneği — kendi worker'ı
 * ve kuyruğu var. Böylece arka plan analizi, canlı oyun motorunu (hamle/eval bar)
 * ASLA bloklamaz; yoksa analiz biterken yeni oyunda AI hamlesi kuyrukta bekleyip
 * uygulama donmuş gibi görünür.
 */
export const analysisEngine = new StockfishEngine();

export function levelById(id: number): EngineLevel {
  return ENGINE_LEVELS.find((l) => l.id === id) ?? ENGINE_LEVELS[2];
}
