# Üçüncü Taraf Lisans Bildirimleri

AI Chess aşağıdaki açık kaynak bileşenleri kullanır. Her birinin lisans koşulları geçerlidir.

---

## ⚠️ Stockfish — GPL-3.0 (copyleft)

Bu uygulama, satranç motoru olarak **Stockfish 18**'i (gömülü WASM,
`public/engine/stockfish-18-lite-single.*`) kullanır.

- **Lisans:** GNU General Public License v3.0 (GPL-3.0-or-later)
- **Telif:** The Stockfish developers (bkz. AUTHORS — https://github.com/official-stockfish/Stockfish)
- **Kaynak:** https://github.com/official-stockfish/Stockfish

**ÖNEMLİ — copyleft etkisi:** Stockfish GPL-3.0 ile lisanslıdır. Stockfish'i içeren bu
uygulamayı **dağıtırsanız**, dağıttığınız **birleşik eserin tamamı GPL-3.0 koşullarına
tabidir**: alıcılara **tam kaynak kodunu** sağlamanız, GPL-3.0 lisans metnini ve telif
bildirimlerini eklemeniz gerekir. GPL **ticari kullanıma/satışa izin verir** ancak
**kapalı kaynak (proprietary) yapmaya izin vermez.**

Proprietary/kapalı bir ürün hedefleniyorsa Stockfish gömülmemeli; kullanıcı tarafından
ayrıca kurulan bir UCI motoruyla ayrı süreç üzerinden konuşulmalıdır (hukuki kesinlik
için danışmanlık önerilir).

GPL-3.0 tam metni: https://www.gnu.org/licenses/gpl-3.0.txt

---

## İzin Veren Lisanslı Bileşenler (MIT / BSD / Apache-2.0)

| Bileşen | Lisans | Amaç |
|---|---|---|
| Tauri | MIT / Apache-2.0 | Masaüstü kabuk |
| React, React DOM | MIT | Arayüz |
| react-router-dom | MIT | Yönlendirme |
| react-chessboard | MIT | Satranç tahtası |
| react-markdown | MIT | Rapor görüntüleme |
| zustand | MIT | Durum yönetimi |
| chess.js | BSD-2-Clause | Satranç kuralları, PGN/FEN |
| @anthropic-ai/sdk | MIT | Claude API |
| openai | Apache-2.0 | OpenAI / OpenAI-uyumlu API |
| @google/genai | Apache-2.0 | Gemini API |
| @tauri-apps/plugin-* | MIT / Apache-2.0 | SQL, HTTP, Store, Dialog, FS |
| reqwest (Rust) | MIT / Apache-2.0 | Backend HTTP proxy |

Bu bileşenler atıf (copyright + lisans bildirimi) korunarak ticari ve kapalı ürünlerde
serbestçe kullanılabilir.

---

## Stockfish Lisansının Tam Metni

`node_modules/stockfish/Copying.txt` dosyasında bulunur (GNU GPL v3, 29 June 2007).
Dağıtımda bu metin dahil edilmelidir.
