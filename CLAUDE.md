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
zamanında **Ayarlar → AI Sağlayıcıları**'ndan girer; şuraya kaydedilir:
`%APPDATA%\com.murat.chess\settings.json` (tauri-plugin-store).

- Bu tasarım gereği güvenlidir: anahtarlar repoda durmaz, sızma riski yoktur.
- `.env` repoya **commit edilmez** (`.gitignore`'da). `.env.example` yalnızca şablondur.
- Ollama anahtar gerektirmez. Open WebUI/OpenRouter anahtarı custom uç nokta olarak girilir.

---

## 🧠 Önemli Öğrenilenler (tekrar düşme)

1. **Ollama CORS (HTTP 403):** tauri-plugin-http webview origin'i (`tauri.localhost`)
   gönderir, Ollama reddeder. **Çözüm:** istekleri Rust backend'inden (`http_proxy`,
   reqwest) gönder — Origin eklenmez, CORS tetiklenmez. Ollama + custom hep bu proxy'den.

2. **Ollama "düşünme" modelleri (gemma vb.):** Uzun reasoning üretirler. `num_predict`
   sınırı modeli düşünme aşamasında keser → `content` boş → fallback. enum `format` da
   boş döndürebilir. **Çözüm:** istek gövdesine **`think: false`** ekle (hamle için);
   num_predict sınırı koyma; `content` boşsa `thinking` alanını da oku. Gerçek
   gemma4:12b testinde: 0 fallback, 15/16 ilk deneme, ~615ms/hamle.

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

## 🧪 Ollama'yı gerçek modele karşı test etme

Kullanıcının Ollama'sı erişilebilirken (`/api/tags` 200 dönerken), hamle mantığını
gerçek modele karşı doğrulamak için geçici `.mjs` betiği yaz: chess.js + `think:false`
+ `/api/chat` ile birkaç hamle oynat, fallback oranını ölç. Doğrulanınca betiği sil.
