import type { Language } from "../types";

const tr = `# AI Chess — Kullanım Kılavuzu

AI Chess; yapay zekâ modellerine (Claude, ChatGPT, Gemini, Ollama, OpenAI-uyumlu servisler) ve güçlü **Stockfish** motoruna karşı satranç oynadığın, maçlarını kaydedip analiz ettiğin ve turnuvalar düzenlediğin bir masaüstü uygulamasıdır. Kurulum gerektirmez — aç ve oyna.

---

## 1. İlk Açılış
- Uygulama ilk açıldığında **adını veya takma adını** sorar. Bu ad maçlarda "İnsan" yerine kullanılır ve geçmişte kimin oynadığını gösterir.
- Adını sonradan **Ayarlar → Genel → Profil**'den değiştirebilirsin.
- Anahtar gerekmeden hemen denemek için ana ekrandan **Motora Karşı Oyna**'yı seç.

## 2. Hızlı Başlangıç
Ana ekrandaki kartlarla tek tıkla başla:
- **Motora Karşı Oyna** — Stockfish'e karşı (internet/anahtar gerekmez, seviye seçilebilir).
- **AI Modeline Karşı** — Claude/ChatGPT/Gemini/Ollama/OpenAI-uyumlu servislere karşı (anahtar gerekir).
- **İki AI'yı İzle** — İki modeli birbirine karşı oynat, izle.
- **İki Kişi** — Aynı bilgisayarda iki oyuncu sırayla.

Her kart, renk ve rakip seçtiğin **Yeni Oyun** penceresini açar. Rakibi **Profiller** sekmesinden (hazır personalar) veya **Model Seç** sekmesinden (sağlayıcı + model) seçebilirsin.

## 3. Hamle Yapma
- **Sürükle-bırak** veya **tıkla-tıkla** ile taş oynat.
- Bir taşa tıklayınca **yasal hamleler** noktalarla, alınabilir taşlar halkayla gösterilir (Ayarlar → Genel'den kapatılabilir).
- Piyon son sıraya ulaşınca **terfi penceresi** açılır; taşını seç.

## 4. Oyun Sırasında Butonlar
- **Geri Al** — Son hamleyi (AI'ya karşı son iki yarım hamleyi) geri alır.
- **İpucu** — Stockfish'in en iyi hamlesini tahtaya ok olarak çizer (öğrenmek için).
- **Tahtayı Çevir** — Görüş açısını değiştirir.
- **Berabere Bitir** — Oyunu anlaşmalı beraberlikle sonlandırır.
- **Terk Et** — Oyunu kaybederek bitirir.
- **AI vs AI** modunda: **Duraklat / Devam / Durdur** ve hız ayarı.

## 5. Rakip Profilleri ve Personalar (Ayarlar → Profiller)
- Uygulama 5 hazır persona ile gelir (ör. **Rookie Rosa** 1200 → **Master Mark** 2900) — hepsi Stockfish tabanlı, anahtarsız çalışır.
- **Kendi profilini oluştur:** model + isim + emoji avatar + renk + puan + **kişilik promptu**.
- **Kişilik promptu**, modelin oyun tarzını belirler. Örnek: *"Agresif oyna, erken hücum başlat, taş feda etmekten çekinme"* veya *"Sağlam ve pozisyonel oyna, merkez kontrolüne öncelik ver"*.
- Profiller; **Yeni Oyun** penceresinde ve **Turnuva** kurulumunda katılımcı olarak kullanılır.

## 6. Stockfish Motoru ve Seviyeler
- Motor tamamen **çevrimdışı** çalışır; internet veya API anahtarı gerektirmez.
- **Ayarlar → Oyun → Motor seviyesi**: Acemi'den En Güçlü'ye (ELO ~1320–3190).
- Düşük seviyeler hızlı ve zayıf, yüksek seviyeler güçlü oynar.

## 7. Analiz (Değerlendirme)
- Tahtanın yanındaki **değerlendirme çubuğu** o anki üstünlüğü gösterir (yukarı = beyaz iyi).
- **Otomatik analiz:** **Ayarlar → Oyun → Otomatik analiz** açıkken, maç biter bitmez tüm hamleler arka planda Stockfish'le değerlendirilir (oyunu yavaşlatmaz; ayrı motorda çalışır).
- Bir maçı incelemek için **Geçmiş → İzle** ile aç, sonra **Maçı Analiz Et**'e bas. Her hamle şu kalite etiketlerinden birini alır:
  - **Parlak (!!)** — en iyi hamle + sağlam taş fedası
  - **En iyi**, **İyi**, **Yanlışlık (?!)**, **Hata (?)**, **Vahim hata (??)**, **Kitap** (açılış)
- **Doğruluk %** her oyuncunun ne kadar iyi oynadığını özetler; **Değerlendirme Grafiği** maçın gidişatını görselleştirir.
- **Gözden Geçir** modu: **← Önceki hata / Sonraki hata →** ile hatalar arasında gezin; motor o pozisyonda **en iyi hattı** ve önerilen hamleyi ok olarak gösterir.

## 8. Maç Raporu (Yapay Zekâ)
- **Geçmiş → İzle → Rapor** sekmesinde bir AI modeli maçı analiz edip Markdown rapor yazar: genel değerlendirme, hamle listesi, kritik hatalar, dönüm noktaları, sonuç.
- **MD Olarak Kaydet** ile raporu .md dosyası olarak diske kaydet.
- Rapor için en az bir AI sağlayıcı anahtarı gerekir (Stockfish rapor üretmez).

## 9. AI Sağlayıcılarını Ayarlama (Ayarlar → AI Erişimi)
- **Claude / ChatGPT / Gemini**: API anahtarını gir, **Test Et** ile doğrula.
- **Ollama**: Adresini gir (ör. http://localhost:11434). Anahtar gerekmez; çalışıyorsa kurulu modeller listelenir.
- **OpenAI-Uyumlu Uç Noktalar** (Open WebUI, OpenRouter, LM Studio…):
  - **+ Uç Nokta Ekle** → Ad, Adres (ör. https://openrouter.ai/api/v1), API Anahtarı (Open WebUI/OpenRouter için gerekli, LM Studio için boş bırakılabilir).
  - Modeller otomatik çekilir ya da virgülle elle yazılır. Birden fazla uç nokta eklenebilir.
- **Güvenlik:** Anahtarların bilgisayarında **Windows DPAPI ile şifreli** saklanır; kaynak koda veya düz metin dosyaya yazılmaz.

## 10. Geçmiş ve Tekrar İzleme
- **Geçmiş** sekmesi tüm maçları tarih, oyuncular, sonuç, mod ve açılış adıyla listeler (mod/sağlayıcı/sonuç filtreleri var).
- Bir maçı **İzle** ile aç: başa/geri/ileri/sona düğmeleriyle adım adım, **▶ Oynat** ile otomatik (0.5x–4x hız).
- Hamle listesinde bir hamleye tıklayınca o pozisyona atlar.
- **PGN İndir** ile maçı standart PGN olarak kaydet.

## 11. Turnuva (Model Turnuvası)
- **Turnuva** sekmesinden **en az 2 katılımcı** seç (profiller ve/veya Stockfish seviyeleri).
- **Format:** Tek devreli veya **Çift devreli** (herkes her renkle oynar).
- **Hamle sınırı (ply):** sınıra ulaşan maçlar berabere sayılır (sonsuz oyunları önler).
- **Turnuvayı Başlat** sonrası: canlı maç tahtası, **Puan Durumu**, **Çapraz Tablo** ve **Karşılaştırma** sekmesi. İstediğinde **Duraklat / Devam / Durdur**.

## 12. Saat (İsteğe Bağlı)
- **Ayarlar → Oyun → Saat**'ten etkinleştir (ör. 5 dakika + 3 saniye artırım).
- İnsan ve motor oyunlarında geçerlidir; LLM oyunlarında kapalıdır (cevap süreleri değişken).

## 13. Tema, Dil ve Ses
- **Tema**: Klasik (ahşap) veya Modern (gri-mavi) — taşlar da değişir.
- **Dil**: Türkçe / İngilizce (varsayılan İngilizce).
- **Ses**: Hamle, alma, şah ve oyun sonu sesleri açılıp kapatılabilir.

## 14. Güncellemeler
- **Hakkında → Güncellemeleri Kontrol Et** ile yeni sürümü ara. Varsa imzalı kurulum indirilip kurulur ve uygulama yeniden başlar (GitHub Releases üzerinden).

## 15. Veriler Nerede?
- Tüm maçlar bilgisayarındaki tek bir SQLite dosyasında saklanır: \`%APPDATA%\\com.murat.chess\\chess.db\`.
- Yedeklemek için bu dosyayı kopyalaman yeterli.

---
*"Hayatta en hakiki mürşit ilimdir."*`;

const en = `# AI Chess — User Guide

AI Chess is a desktop app where you play chess against AI models (Claude, ChatGPT, Gemini, Ollama, OpenAI-compatible services) and the strong **Stockfish** engine, then save, analyze and run tournaments with your games. No installation required — just open and play.

---

## 1. First Launch
- On first launch the app asks for your **name or nickname**. It is used instead of "Human" in games and shows who played in history.
- You can change it later in **Settings → General → Profile**.
- To try instantly without a key, pick **Play vs Engine** on the home screen.

## 2. Quick Start
Use the home-screen cards to start with one click:
- **Play vs Engine** — against Stockfish (no internet/key needed, level selectable).
- **Play vs AI Model** — against Claude/ChatGPT/Gemini/Ollama/OpenAI-compatible services (key required).
- **Watch Two AIs** — pit two models against each other and watch.
- **Two Players** — two people taking turns on the same computer.

Each card opens the **New Game** dialog where you choose color and opponent. Pick the opponent from the **Profiles** tab (ready-made personas) or the **Pick model** tab (provider + model).

## 3. Making Moves
- Move pieces by **drag-and-drop** or **click-click**.
- Selecting a piece shows **legal moves** as dots and captures as rings (can be turned off in Settings → General).
- When a pawn reaches the last rank a **promotion dialog** appears — pick your piece.

## 4. In-Game Buttons
- **Takeback** — undoes the last move (last two half-moves vs AI).
- **Hint** — draws Stockfish's best move as an arrow (for learning).
- **Flip Board** — switches the viewpoint.
- **End in Draw** — ends the game as an agreed draw.
- **Resign** — ends the game as a loss.
- In **AI vs AI**: **Pause / Resume / Stop** and a speed control.

## 5. Opponent Profiles & Personas (Settings → Profiles)
- The app ships with 5 ready-made personas (e.g. **Rookie Rosa** 1200 → **Master Mark** 2900) — all Stockfish-based, working without a key.
- **Create your own profile:** model + name + emoji avatar + color + rating + **personality prompt**.
- The **personality prompt** shapes the model's playing style. Examples: *"Play aggressively, attack early, don't shy away from sacrifices"* or *"Play solid and positional, prioritize central control"*.
- Profiles are used as opponents in the **New Game** dialog and as participants in a **Tournament**.

## 6. Stockfish Engine & Levels
- The engine runs fully **offline**, no internet or API key needed.
- **Settings → Gameplay → Engine level**: from Beginner to Strongest (ELO ~1320–3190).
- Lower levels are faster and weaker; higher levels play strongly.

## 7. Analysis
- The **evaluation bar** next to the board shows the current advantage (up = White is better).
- **Auto-analysis:** when **Settings → Gameplay → Auto-analyze** is on, every move is evaluated with Stockfish in the background as soon as the game ends (it never slows down play — it runs on a separate engine).
- To review a game, open it from **History → Watch**, then press **Analyze Game**. Each move gets a quality label:
  - **Brilliant (!!)** — best move plus a sound piece sacrifice
  - **Best**, **Good**, **Inaccuracy (?!)**, **Mistake (?)**, **Blunder (??)**, **Book** (opening)
- **Accuracy %** summarizes how well each player played; the **Evaluation Graph** visualizes the flow of the game.
- **Review** mode: step through mistakes with **← Previous mistake / Next mistake →**; the engine shows the **best line** and suggested move as an arrow for that position.

## 8. AI Match Report
- In **History → Watch → Report**, an AI model analyzes the game and writes a Markdown report: overview, move list, critical mistakes, turning points, conclusion.
- Use **Save as MD** to save the report to disk as a .md file.
- A configured AI provider key is required (Stockfish does not generate reports).

## 9. Configuring AI Providers (Settings → AI Access)
- **Claude / ChatGPT / Gemini**: enter the API key, verify with **Test**.
- **Ollama**: enter the URL (e.g. http://localhost:11434). No key needed; if running, installed models are listed.
- **OpenAI-Compatible Endpoints** (Open WebUI, OpenRouter, LM Studio…):
  - **+ Add Endpoint** → Name, URL (e.g. https://openrouter.ai/api/v1), API Key (required for Open WebUI/OpenRouter, can be empty for LM Studio).
  - Models are auto-fetched or typed manually (comma-separated). You can add multiple endpoints.
- **Security:** your keys are stored **encrypted with Windows DPAPI** on your machine; they are never written to source code or a plain-text file.

## 10. History & Replay
- The **History** tab lists all games with date, players, result, mode and opening name (filters: mode/provider/result).
- Open a game with **Watch**: step with the start/back/forward/end buttons, auto-play with **▶ Play** (0.5x–4x speed).
- Click a move in the list to jump to that position.
- **Download PGN** to save the game as standard PGN.

## 11. Tournament (Model Tournament)
- In the **Tournament** tab, pick **at least 2 participants** (profiles and/or Stockfish levels).
- **Format:** Single or **Double round-robin** (everyone plays both colors).
- **Move cap (ply):** games that hit the cap are scored as draws (prevents endless games).
- After **Start Tournament**: a live game board, **Standings**, a **Crosstable**, and a **Comparison** tab. **Pause / Resume / Stop** anytime.

## 12. Clock (Optional)
- Enable it in **Settings → Gameplay → Clock** (e.g. 5 minutes + 3 seconds increment).
- Applies to human and engine games; disabled for LLM games (variable response times).

## 13. Theme, Language & Sound
- **Theme**: Classic (wood) or Modern (gray-blue) — pieces change too.
- **Language**: Turkish / English (English by default).
- **Sound**: move, capture, check and game-end sounds can be toggled.

## 14. Updates
- Use **About → Check for Updates** to look for a new version. If one exists, a signed installer is downloaded and installed and the app restarts (via GitHub Releases).

## 15. Where Is My Data?
- All games are stored in a single SQLite file on your computer: \`%APPDATA%\\com.murat.chess\\chess.db\`.
- To back up, just copy that file.

---
*"In life, the truest guide is science."*`;

export function helpContent(lang: Language): string {
  return lang === "tr" ? tr : en;
}
