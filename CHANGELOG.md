# Changelog — AI Chess

A desktop app for playing chess against AI models and the Stockfish engine, built for
Murat Bahçetepe.
Motto: *"In life, the truest guide is science."*

The newest releases are listed first.

---

## 1.0.3
- **New Game dialog fixed:** the content now lives in a scrollable body — "Start from
  position (FEN)" and the other options no longer hide behind / get clipped by the footer
  buttons. Switching to the "Pick model" tab now auto-selects a valid default.

## 1.0.2
- **Revamped in-app User Guide** (TR + EN): added Profiles & Personas, Tournament, and
  Updates sections; documented auto-analysis, the brilliant (!!) move and the six quality
  grades, and Review mode; aligned all terms with the current UI.

## 1.0.1
- **Fixed a freeze:** post-game auto-analysis used to flood the shared engine and lock up
  gameplay when starting a new game. Analysis now runs on a **separate Stockfish engine**
  (never blocks live play) and is cancelled when a new game starts.
- Default UI language is now **English**; updated motto.

## 1.0.0
- First public release on **GitHub Releases** with **auto-update** (signed updater via
  GitHub Releases; About → Check for Updates).
- Auto post-game analysis and **brilliant move (!!) detection**.
- Settings redesigned into 4 tabs (General / Gameplay / AI Access / Profiles).
- Model Tournament + Comparison panel.

---

## Development Milestones (pre-release)

### v1.0 — Core App

#### Architecture
- **Tauri 2 + React + TypeScript** desktop app (single `Chess.exe`, no installation required).
- **chess.js** rules engine (legal moves, FEN/PGN, checkmate/stalemate/draw detection).
- **react-chessboard** board; **Zustand** state; **react-router** pages.
- **SQLite** (tauri-plugin-sql) for persistent game records.

#### Gameplay
- 3 modes: Human vs AI, AI vs AI (watch, pause/resume/stop), Human vs Human.
- 2 themes: Classic (wood + staunton pieces), Modern (gray-blue + flat pieces).
- Legal-move hints, promotion dialog, check highlight, drag-and-drop + click-click.

#### AI Providers
- Claude (Anthropic, default `claude-opus-4-8`), ChatGPT (OpenAI), Gemini (Google),
  Ollama (local), mock (key-free testing).
- **Retry/fallback logic**: if a model returns an illegal move it retries with feedback;
  last resort is a random legal move (marked with ⚠) — the game never stalls.

#### Records / Replay / Report
- All games saved to SQLite (date, time, moves, model, result).
- Replay: auto-play (0.5x–4x), step by step, jump to a move.
- Match report: an AI model generates a Markdown analysis report, saveable as `.md`.
- TR/EN language switcher, Settings, API key entry + test.

### v1.1 — Desktop Distribution Fixes
- **MSVC C++ tools**: build via VS2019 BuildTools (VS2022 was missing x64 libs).
- **Pinned Rust 1.90.0** (`rust-toolchain.toml`) — Rust 1.96 caused an E0119 coherence
  error with tauri-utils.
- **Downgraded the `time` crate to 0.3.47** (0.3.48 was broken).

### v1.2 — Ollama Access (CORS)
- **Fixed the Ollama "HTTP 403" issue**: requests now go through the Rust backend (reqwest,
  `http_proxy` command). The backend sends no Origin header → Ollama's CORS rejection is not
  triggered. Both Ollama and Open WebUI/OpenRouter go through this proxy.
- Ollama connection status + real error message shown in Settings.
- Removed hardcoded IP (default `http://localhost:11434`).

### v1.3 — Professional Release

#### Stockfish engine (embedded)
- **Stockfish 18 Lite** WASM embedded (key-free, offline).
- 8 levels (Beginner ~1320 → Strongest ~3190).
- Hint: shows the best move with a green arrow.

#### Objective analysis (chess.com-grade)
- Live evaluation bar.
- "Analyze Game": each move labeled Best/Good/Inaccuracy/Mistake/Blunder.
- Accuracy % (lichess formula), evaluation graph.
- Multi-line (Multi-PV, top 3 variations) + best-move arrow in replay.
- "Review": navigate between mistakes.

#### Profile system (like chess.com bots)
- 5 ready-made personas (Stockfish-backed): Rookie Rosa, Patient Pete, Tough Tom,
  Strategist Sara, Master Mark.
- Custom profiles: model + name + emoji avatar + color + rating + **personality prompt**.
- The personality prompt shapes the LLM's playing style (ignored for Stockfish).
- Profile grid with avatars in game setup (bot cards).

#### Game depth
- Takeback, draw, rematch, flip board, opening (ECO) name, start from FEN,
  optional clock (blitz/rapid).

#### Polish
- Player cards with avatars + ratings, captured pieces + material indicator.
- Move/capture/check/game-end sounds (WebAudio, file-free), keyboard.
- **About** (Murat Bahçetepe + motto), detailed **TR/EN Help** page.

### v1.4 — Layout Fixes
- The board now scales to window height (640px cap removed); the 1280px page width cap was
  removed → side gutters are gone.
- New Game dialog is scrollable with "Start Game" pinned at the bottom.
- The move list scrolls within its panel; the board stays put in long games.

### v1.5 — Ollama Move Quality (verified by testing)

#### Problem
- Models like gemma4:12b made illegal/random moves and even got checkmated.
- The added enum-constrained structured output and `num_predict` limit made it **worse**.

#### Root cause (found by testing against real Ollama)
- **gemma4:12b is a "reasoning" model.** It produces long reasoning; the `num_predict`
  limit cut the model off mid-thinking → empty `content` → fallback.
- The enum `format` also returned empty content on this model.

#### Solution (live-tested against gemma4:12b)
- Added **`think: false`** to the Ollama request → the model returns a move directly instead
  of spending seconds reasoning.
- Removed the num_predict limit; if `content` is empty, the `thinking` field is also read.
- Removed enum/structured output (free reasoning + parser + retry).
- **Result**: 0 fallbacks (was 10/12), 15/16 legal on the first try, ~615ms/move,
  real chess (`1.e4 e5 2.Nf3 Nc6...`).

#### Note
- For better play quality, `llama3.1:8b`/`qwen2.5:7b` or the Stockfish profiles are recommended.

### v1.6 — Encrypted Key Storage
- API keys are encrypted with **Windows DPAPI** and stored (hex) in the SQLite `secrets`
  table — never in plain text in `settings.json`. Legacy plaintext keys are migrated on first launch.
