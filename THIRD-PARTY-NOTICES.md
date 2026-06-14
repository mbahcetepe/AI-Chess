# Third-Party License Notices

AI Chess uses the open-source components below. The license terms of each apply.

---

## ⚠️ Stockfish — GPL-3.0 (copyleft)

This application uses **Stockfish 18** as its chess engine (embedded WASM,
`public/engine/stockfish-18-lite-single.*`).

- **License:** GNU General Public License v3.0 (GPL-3.0-or-later)
- **Copyright:** The Stockfish developers (see AUTHORS — https://github.com/official-stockfish/Stockfish)
- **Source:** https://github.com/official-stockfish/Stockfish

**IMPORTANT — copyleft effect:** Stockfish is licensed under GPL-3.0. If you **distribute**
this application, which embeds Stockfish, the **entire combined work is subject to GPL-3.0**:
you must provide recipients with the **complete source code** and include the GPL-3.0 license
text and copyright notices. The GPL **permits commercial use and sale** but **does not permit
making the work closed-source (proprietary).**

If a proprietary/closed product is intended, Stockfish must not be embedded; instead, talk to a
separately user-installed UCI engine over a separate process (consult a lawyer for legal certainty).

Full GPL-3.0 text: https://www.gnu.org/licenses/gpl-3.0.txt

---

## Permissively Licensed Components (MIT / BSD / Apache-2.0)

| Component | License | Purpose |
|---|---|---|
| Tauri | MIT / Apache-2.0 | Desktop shell |
| React, React DOM | MIT | UI |
| react-router-dom | MIT | Routing |
| react-chessboard | MIT | Chessboard |
| react-markdown | MIT | Report rendering |
| zustand | MIT | State management |
| chess.js | BSD-2-Clause | Chess rules, PGN/FEN |
| @anthropic-ai/sdk | MIT | Claude API |
| openai | Apache-2.0 | OpenAI / OpenAI-compatible API |
| @google/genai | Apache-2.0 | Gemini API |
| @tauri-apps/plugin-* | MIT / Apache-2.0 | SQL, HTTP, Store, Dialog, FS, Updater, Process |
| reqwest (Rust) | MIT / Apache-2.0 | Backend HTTP proxy |

These components may be used freely in commercial and closed products as long as attribution
(copyright + license notice) is preserved.

---

## Full Text of the Stockfish License

Found in `node_modules/stockfish/Copying.txt` (GNU GPL v3, 29 June 2007). This text must be
included with any distribution.
