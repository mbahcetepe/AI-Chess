import type { Language } from "../types";

const tr = `# AI Chess — Kullanım Kılavuzu

AI Chess, yapay zekâ modellerine (Claude, ChatGPT, Gemini, Ollama, OpenAI-uyumlu servisler) ve güçlü **Stockfish** motoruna karşı satranç oynayabileceğin, maçlarını kaydedip analiz edebileceğin bir masaüstü uygulamasıdır.

---

## 1. İlk Açılış
- Uygulama ilk açıldığında **adını veya takma adını** sorar. Bu ad maçlarda "İnsan" yerine kullanılır ve geçmişte kimin oynadığını gösterir.
- Adını sonradan **Ayarlar → Profil**'den değiştirebilirsin.

## 2. Hızlı Başlangıç
Ana ekrandaki kartlarla tek tıkla başlayabilirsin:
- **Motora Karşı Oyna** — Stockfish'e karşı (internet/anahtar gerekmez). Seviye seçilebilir.
- **AI Modeline Karşı** — Claude/ChatGPT/Gemini/Ollama'ya karşı (anahtar gerekir).
- **İki AI'yı İzle** — İki modeli birbirine karşı oynat, izle.
- **İki Kişi** — Aynı bilgisayarda iki oyuncu sırayla.

## 3. Hamle Yapma
- **Sürükle-bırak** veya **tıkla-tıkla** ile taş oynat.
- Bir taşa tıklayınca **yasal hamleler** noktalarla, alınabilir taşlar halkayla gösterilir (Ayarlar'dan kapatılabilir).
- Piyon son sıraya ulaşınca **terfi penceresi** açılır; taş seç.

## 4. Oyun Sırasında Butonlar
- **Geri Al** — Son hamleyi (AI'ya karşı son iki yarım hamleyi) geri alır.
- **İpucu** — Stockfish'in önerdiği en iyi hamleyi oka çizer (öğrenmek için).
- **Tahtayı Çevir** — Görüş açısını değiştirir.
- **Berabere Bitir** — Oyunu anlaşmalı beraberlikle sonlandırır.
- **Terk Et** — Oyunu kaybederek bitirir.
- **AI vs AI** modunda: **Duraklat / Devam / Durdur**.

## 5. Stockfish Motoru ve Seviyeler
- Motor tamamen **çevrimdışı** çalışır, internet veya API anahtarı gerektirmez.
- **Ayarlar → Oyun → Motor seviyesi**: Acemi'den En Güçlü'ye (ELO ~1320–3190).
- Düşük seviyeler daha hızlı ve zayıf, yüksek seviyeler güçlü oynar.

## 6. Analiz (Değerlendirme)
- Tahtanın yanındaki **değerlendirme çubuğu** o anki üstünlüğü gösterir (yukarı = beyaz iyi).
- Maç bitince **İzle** ekranında **"Maçı Analiz Et"** ile her hamle Stockfish'le değerlendirilir:
  - Her hamle **En iyi / İyi / Yanlışlık / Hata / Vahim hata** olarak işaretlenir.
  - **Doğruluk %**: oyuncuların ne kadar iyi oynadığını özetler.
  - **Değerlendirme grafiği**: maçın gidişatını görsel gösterir.

## 7. Maç Raporu (Yapay Zekâ)
- **İzle → Rapor** sekmesinde bir AI modeli maçı analiz edip Markdown rapor yazar:
  - Genel değerlendirme, hamle listesi, kritik hatalar, dönüm noktaları, sonuç.
- **"MD Olarak Kaydet"** ile raporu .md dosyası olarak diske kaydedebilirsin.
- Rapor için en az bir AI sağlayıcı anahtarı gerekir (mock/Stockfish rapor üretmez).

## 8. AI Sağlayıcılarını Ayarlama (Ayarlar → AI Sağlayıcıları)
- **Claude / ChatGPT / Gemini**: API anahtarını gir, **Test Et** ile doğrula.
- **Ollama**: Adresini gir (örn. http://localhost:11434). Anahtar gerekmez; çalışıyorsa kurulu modeller listelenir.
- **OpenAI-Uyumlu Uç Noktalar**: Open WebUI, OpenRouter, LM Studio gibi servisler için:
  - **+ Uç Nokta Ekle** → Ad, Adres (örn. http://host:3000/v1 veya https://openrouter.ai/api/v1), API Anahtarı (Open WebUI/OpenRouter için gerekli, LM Studio için boş).
  - Modeller otomatik çekilir (/models) ya da virgülle elle yazılır.
  - Birden fazla uç nokta ekleyebilirsin.

## 9. Geçmiş ve Tekrar İzleme
- **Geçmiş** sekmesi tüm maçları tarih, oyuncular, sonuç, mod ile listeler. Mod/sağlayıcı/sonuç filtreleri vardır.
- Bir maçı **İzle** ile aç: baştan/geri/ileri/sona düğmeleriyle adım adım, **▶ Oynat** ile otomatik (0.5x–4x hız).
- Hamle listesinde bir hamleye tıklayınca o pozisyona atlar.
- **PGN İndir** ile maçı standart PGN olarak kaydet.

## 10. Saat (İsteğe Bağlı)
- **Ayarlar → Saat**'ten etkinleştir (örn. 5 dakika + 3 saniye artırım).
- İnsan ve motor oyunlarında geçerlidir; LLM oyunlarında kapalıdır (cevap süreleri değişken).

## 11. Tema, Dil ve Ses
- **Tema**: Klasik (ahşap) veya Modern (gri-mavi) — taşlar da değişir.
- **Dil**: Türkçe / İngilizce.
- **Ses**: Hamle, alma, şah ve oyun sonu sesleri açılıp kapatılabilir.

## 12. Veriler Nerede?
- Tüm maçlar bilgisayarındaki tek bir SQLite dosyasında saklanır (%APPDATA%\\com.murat.chess\\chess.db).
- Yedeklemek için bu dosyayı kopyalaman yeterli.

---
*"Hayatta en hakiki mürşit ilimdir."*`;

const en = `# AI Chess — User Guide

AI Chess is a desktop app where you play chess against AI models (Claude, ChatGPT, Gemini, Ollama, OpenAI-compatible services) and the strong **Stockfish** engine, then save and analyze your games.

---

## 1. First Launch
- On first launch the app asks for your **name or nickname**. It is used instead of "Human" in games and shows who played in history.
- You can change it later in **Settings → Profile**.

## 2. Quick Start
Use the home-screen cards to start with one click:
- **Play vs Engine** — against Stockfish (no internet/key needed). Level selectable.
- **Play vs AI Model** — against Claude/ChatGPT/Gemini/Ollama (key required).
- **Watch Two AIs** — pit two models against each other and watch.
- **Two Players** — two people taking turns on the same computer.

## 3. Making Moves
- Move pieces by **drag-and-drop** or **click-click**.
- Selecting a piece shows **legal moves** as dots, captures as rings (can be turned off in Settings).
- When a pawn reaches the last rank a **promotion dialog** appears.

## 4. In-Game Buttons
- **Takeback** — undoes the last move (last two half-moves vs AI).
- **Hint** — draws Stockfish's best move as an arrow (for learning).
- **Flip Board** — switches the viewpoint.
- **End in Draw** — ends the game as an agreed draw.
- **Resign** — ends the game as a loss.
- In **AI vs AI**: **Pause / Resume / Stop**.

## 5. Stockfish Engine and Levels
- The engine runs fully **offline**, no internet or API key needed.
- **Settings → Gameplay → Engine level**: from Beginner to Strongest (ELO ~1320–3190).
- Lower levels are faster and weaker; higher levels play strongly.

## 6. Analysis
- The **evaluation bar** next to the board shows the current advantage (up = White is better).
- After a game, in the **Watch** screen use **"Analyze Game"** to evaluate every move with Stockfish:
  - Each move is marked **Best / Good / Inaccuracy / Mistake / Blunder**.
  - **Accuracy %** summarizes how well each player played.
  - **Evaluation graph** visualizes the flow of the game.

## 7. AI Match Report
- In **Watch → Report** an AI model analyzes the game and writes a Markdown report:
  - Overview, move list, critical mistakes, turning points, conclusion.
- Use **"Save as MD"** to save the report to disk as a .md file.
- A configured AI provider key is required (mock/Stockfish do not generate reports).

## 8. Configuring AI Providers (Settings → AI Providers)
- **Claude / ChatGPT / Gemini**: enter the API key, verify with **Test**.
- **Ollama**: enter the URL (e.g. http://localhost:11434). No key needed; if running, installed models are listed.
- **OpenAI-Compatible Endpoints**: for services like Open WebUI, OpenRouter, LM Studio:
  - **+ Add Endpoint** → Name, URL (e.g. http://host:3000/v1 or https://openrouter.ai/api/v1), API Key (required for Open WebUI/OpenRouter, empty for LM Studio).
  - Models are auto-fetched (/models) or typed manually (comma-separated).
  - You can add multiple endpoints.

## 9. History and Replay
- The **History** tab lists all games with date, players, result, mode. Filters: mode/provider/result.
- Open a game with **Watch**: step with the start/back/forward/end buttons, auto-play with **▶ Play** (0.5x–4x speed).
- Click a move in the list to jump to that position.
- **Download PGN** to save the game as standard PGN.

## 10. Clock (Optional)
- Enable it in **Settings → Clock** (e.g. 5 minutes + 3 seconds increment).
- Applies to human and engine games; disabled for LLM games (variable response times).

## 11. Theme, Language and Sound
- **Theme**: Classic (wood) or Modern (gray-blue) — pieces change too.
- **Language**: Turkish / English.
- **Sound**: move, capture, check and game-end sounds can be toggled.

## 12. Where Is My Data?
- All games are stored in a single SQLite file on your computer (%APPDATA%\\com.murat.chess\\chess.db).
- To back up, just copy that file.

---
*"The truest guide in life is knowledge."*`;

export function helpContent(lang: Language): string {
  return lang === "tr" ? tr : en;
}
