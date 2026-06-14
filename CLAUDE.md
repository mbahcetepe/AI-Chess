# CLAUDE.md — AI Chess Proje Rehberi

Yapay zekâ modellerine (Claude, ChatGPT, Gemini, Ollama, OpenAI-uyumlu) ve gömülü
Stockfish motoruna karşı satranç oynanan Tauri masaüstü uygulaması.
**Sahip:** Murat Bahçetepe · **Motto:** "Hayatta en hakiki mürşit ilimdir"

---

## ⚙️ Derleme — KRİTİK (her seferinde gerekli)

Bu makinede normal `npm run tauri build` C++ linker hatası verir. **Mutlaka VS2019
BuildTools ortamı yüklenmeli.** Hazır komut: `build-tauri.bat`.

```bat
call "C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
npm run tauri build      :: veya: build-tauri.bat build
```

- **Rust 1.90.0'a sabit** (`src-tauri/rust-toolchain.toml`). Rust 1.96 → tauri-utils
  E0119 coherence hatası. DEĞİŞTİRME.
- **`time` crate 0.3.47** (Cargo.lock). 0.3.48 bozuk — yükseltme.
- VS2022 Community'de x64 MSVC lib'leri eksik; C++ araçları **VS2019 BuildTools**'a kurulu.
- Acronis antivirüs ara sıra derleme çıktısını karantinaya alabilir.

### Çıktılar
- Taşınabilir exe: `src-tauri/target/release/ai-chess.exe` (~13 MB)
- Kurulum: `src-tauri/target/release/bundle/nsis/AI Chess_0.1.0_x64-setup.exe`
- Teslimat: exe `Masaüstü\AI Chess.exe`'ye kopyalanır.

### Diğer komutlar
```
npm run dev        # vite dev (5173)
npm run build      # tsc + vite (frontend)
npm test           # vitest (16 test)
npx tsc --noEmit   # tip kontrolü
```

---

## 🗂️ Mimari

```
src/                         React + TS (tüm uygulama mantığı)
  engine/stockfish.ts        Stockfish 18 Lite UCI sürücüsü (Web Worker), evaluate, evaluateLines, bestMove
  engine/analysis.ts         Maç analizi (hamle kalitesi, doğruluk %)
  engine/openings.ts         ECO açılış tespiti
  llm/prompt.ts              moveSystem(persona), buildMovePrompt (ASCII tahta dahil)
  llm/parseMove.ts           Ham LLM metninden SAN/UCI çıkarma
  llm/moveService.ts         retry(4) → doğrula → feedback → rastgele fallback (asla takılmaz)
  llm/httpProxy.ts           Backend (reqwest) HTTP proxy — Ollama/custom CORS aşımı
  llm/providers/             anthropic, openai, gemini, ollama, custom (OpenAI-uyumlu), mock
  store/gameStore.ts         chess.js state, tur döngüsü, AI-vs-AI, geri al, saat, ses
  store/settingsStore.ts     nickname, anahtarlar, custom uç noktalar, profiller, tema, dil
  components/, pages/         UI
src-tauri/src/lib.rs         Tauri bootstrap + http_proxy komutu + SQL migration
src-tauri/migrations/        001_init.sql, 002_analysis.sql
public/engine/               stockfish-18-lite-single.{js,wasm} (gömülü motor)
```

---

## 🔑 Anahtarlar / Şifreler — ÖNEMLİ

**API anahtarları KAYNAK KODA veya .env'e YAZILMAZ.** Kullanıcı bunları çalışma
zamanında **Ayarlar → AI Sağlayıcıları**'ndan girer.

- **Şifreli saklama (v1.6+):** Anahtarlar **Windows DPAPI** ile şifrelenip SQLite
  `secrets` tablosuna (hex) yazılır — `settings.json`'a DÜZ METİN YAZILMAZ. DPAPI,
  anahtarı Windows kullanıcı hesabına bağlar (başka kullanıcı/işlem çözemez).
  Rust: `src-tauri/src/secret.rs` (`encrypt_secret`/`decrypt_secret` komutları).
  Frontend: `src/secrets.ts` (`getSecret`/`setSecret`). Eski düz-metin anahtarlar
  ilk açılışta otomatik şifreli DB'ye taşınır ve settings.json'dan temizlenir.
- `.env` repoya **commit edilmez** (`.gitignore`'da). `.env.example` yalnızca şablondur.
- Ollama anahtar gerektirmez. Open WebUI/OpenRouter anahtarı custom uç nokta olarak girilir.

---

## 🧠 Önemli Öğrenilenler (tekrar düşme)

1. **Ollama CORS (HTTP 403):** tauri-plugin-http webview origin'i (`tauri.localhost`)
   gönderir, Ollama reddeder. **Çözüm:** istekleri Rust backend'inden (`http_proxy`,
   reqwest) gönder — Origin eklenmez, CORS tetiklenmez. Ollama + custom hep bu proxy'den.

2. **Reasoning ("düşünme") modelleri tüm sağlayıcılarda token bütçesini yer → içerik boş → fallback:**
   - **Ollama (gemma vb.):** istek gövdesine **`think: false`** ekle (hamle için); num_predict
     sınırı koyma; `content` boşsa `thinking` alanını da oku. gemma4:12b: 0 fallback, ~615ms.
     **Ama think:false zayıf oynatır** → "Ollama derin düşünme" ayarı (settingsStore.ollamaDeepThink)
     açıkken think serbest (güçlü, ~20-30sn), kapalıyken hızlı. (`src/llm/providers/ollama.ts`)
   - **OpenAI o-serisi (o1/o3):** `max_completion_tokens` 1024 reasoning'de tükeniyordu
     (finish_reason=length, content boş). **Çözüm:** o-serisini tespit et → `max_completion_tokens`
     16000 + **`reasoning_effort: "low"`**. CANLI test: eski=boş⚠ → yeni=Nxd4. (`openai.ts` isReasoning)
   - **Gemini 2.5:** varsayılan düşünür → token yer. **Çözüm:** hamle için maxOutputTokens 8000 +
     2.5-flash'ta `thinkingConfig:{thinkingBudget:0}`. Ayrıca modelleri CANLI listele
     (`listGeminiModels`) — sabit liste `gemini-2.0-flash` retired olmuştu. (`gemini.ts`)
   - **Claude:** thinking varsayılan KAPALI (param göndermezsen) → 1024 yeter; güvenlik için 2000 yaptım.
   - **Enum/structured output** yasallığı garanti eder AMA reasoning modellerinde boş döndürür ve
     modeli aptallaştırır → KULLANMA. Serbest düşünme + parser + retry + son çare rastgele fallback tercih edildi.

3. **Enum/grammar-kısıtlı structured output yasallığı garanti eder AMA modeli
   aptallaştırır** (serbest düşünmeyi engeller). Kalite için serbest düşünme + parser +
   retry tercih edildi. Yasallık için son çare rastgele fallback (nadiren tetiklenir).

4. **Layout:** Tahta yüksekliğe göre `min(calc(100vh-300px), calc(100vw-480px), 900px)`.
   Yan panel **sabit yükseklik + overflow hidden**, hamle listesi içeride kayar —
   yoksa uzun maçta tahtayı iter. Sayfada genişlik sınırı YOK.

5. **Stockfish worker:** `public/engine/stockfish-18-lite-single.js` classic Worker
   olarak yüklenir; `.js` → `.wasm` kendi adından bulur. Tek-thread (SharedArrayBuffer
   gerektirmez), Tauri webview'de sorunsuz.

---

## 📋 Kullanıcı Direktifleri (uyulması gereken)

- **Test etmeden teslim etme.** Özellikle LLM/Ollama davranışını gerçek modele karşı
  (gemma4:12b @ kullanıcının Ollama'sı) test et, sonra exe ver. Kullanıcıyı test
  makinesi gibi kullanma.
- **Önce plan/öneri sun, onay al, sonra uygula** — büyük değişikliklerde.
- **Kullanıcının Ollama IP'sini hardcode etme** (gerekirse kendisi girer).
- **Bittiğinde exe'yi `Masaüstü\AI Chess.exe`'ye kopyala.**
- Arayüz ticari/profesyonel kalitede olmalı (chess.com referans).
- Türkçe iletişim.

---

## 📍 Güncel Durum / Devam (devir teslim)

**Tamamlanan (v1.0–v1.6):** Tüm temel + 10/10 özellikler (bkz. CHANGELOG.md). Reasoning-model
düzeltmeleri tüm sağlayıcılarda (yukarı, Öğrenilen #2). **Güvenlik:** #1 fs scope daraltıldı,
#4 CSP eklendi, #5 SQL int, **#3 API anahtarları DPAPI ile şifreli DB'de** (uçtan uca doğrulandı).

**Kalan güvenlik kalemleri (yapılacak):** #2 `http_proxy`'yi bilinen host'larla sınırla (SSRF),
#6 exe kod imzalama (SmartScreen), #7 custom uç noktada https önerisi.

**Faz 2 — DEVAM EDİYOR (bu oturumda yazıldı, in-app TEST EDİLMEDİ):**
Model Turnuvası + Karşılaştırma Paneli. Kararlar: çift devreli (seçilebilir), otomatik analiz YOK,
200 ply sınırı (→ berabere). Dosyalar: `types.ts` (Tournament*/ModelStat/TournamentParticipant +
termination 'move_cap'), `migrations/004_tournaments.sql` (tournaments tablosu + games.tournament_id),
`db/gamesRepo.ts` (createTournament, setTournamentStatus, listTournaments, getTournamentGames,
modelStats, createGame'e tournamentId param), `engine/gameRunner.ts` (playHeadlessGame — iki AI'yı
tahta olmadan oynatır), `store/tournamentStore.ts` (orkestrasyon: schedule/standings/pause/stop/live),
`pages/TournamentPage.tsx` (kurulum + canlı board + puan tablosu + çapraz tablo + Karşılaştırma sekmesi),
`App.tsx` (nav + /tournament route). **TEST için en hızlısı:** sadece Stockfish profilleriyle turnuva
(API gerekmez, hızlı biter). Katılımcılar = seçilen profiller.

**Faz 2 sıradaki (ROADMAP.md ilk dalga):** Otomatik maç-sonu analizi + Parlak hamle tespiti,
PGN içe aktarma + İstatistik panosu, Otomatik güncelleme.

**Lisans:** GPL-3.0 (Stockfish gömülü). LICENSE + THIRD-PARTY-NOTICES.md var. Kapalı kaynak istenirse
Stockfish'i gömme, kullanıcı ayrı UCI motoru kursun.

## 🧪 Ollama'yı gerçek modele karşı test etme

Kullanıcının Ollama'sı erişilebilirken (`/api/tags` 200 dönerken), hamle mantığını
gerçek modele karşı doğrulamak için geçici `.mjs` betiği yaz: chess.js + `think:false`
+ `/api/chat` ile birkaç hamle oynat, fallback oranını ölç. Doğrulanınca betiği sil.
