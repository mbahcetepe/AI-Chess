<div align="center">

# ♞ AI Chess

### Yapay zekâ modellerine ve güçlü Stockfish motoruna karşı satranç

*"Hayatta en hakiki mürşit ilimdir"*

Claude · ChatGPT · Gemini · Ollama · OpenAI-uyumlu servisler · Stockfish 18

**Tauri** • **React** • **TypeScript** • **chess.js** • **SQLite**

</div>

---

## 📖 Nedir?

**AI Chess**, yapay zekâ modellerine ve gömülü **Stockfish** motoruna karşı satranç
oynayabileceğiniz, maçlarınızı kaydedip analiz edebileceğiniz bir **masaüstü uygulamasıdır**.
Kurulum gerektirmez — tek bir `Chess.exe`'ye çift tıklayın, oynamaya başlayın.

Bulut modellerine (Claude, ChatGPT, Gemini) ve lokal modellere (Ollama, Open WebUI,
OpenRouter, LM Studio) karşı oynayabilir; iki modeli birbirine karşı izleyebilir;
maçlarınızı chess.com seviyesinde analiz edebilirsiniz.

---

## ✨ Özellikler

### 🎮 Oyun Modları
- **İnsan vs Yapay Zekâ** — bir AI modeline veya Stockfish'e karşı oyna
- **Yapay Zekâ vs Yapay Zekâ** — iki modeli karşı karşıya getir, izle (duraklat/hız)
- **İnsan vs İnsan** — aynı bilgisayarda iki oyuncu

### 🤖 Rakipler
- **Stockfish 18 motoru** (gömülü, anahtarsız, çevrimdışı) — 8 seviye, ELO ~1320–3190
- **Claude · ChatGPT · Gemini** — API anahtarınızı girin
- **Ollama** (lokal modeller) — adresinizi girin, anahtar gerekmez
- **OpenAI-uyumlu uç noktalar** — Open WebUI, OpenRouter, LM Studio…

### 🎭 Profiller (chess.com botları gibi)
- 5 hazır persona (Acemi Aslı 🐣 → Usta Umut 🎓)
- **Kendi profilini oluştur:** model + isim + emoji avatar + renk + puan + **kişilik promptu**
- Kişilik promptu modelin oyun tarzını belirler (örn. *"Agresif oyna, gambit sev"*)

### 🔬 Analiz (Stockfish)
- Canlı **değerlendirme çubuğu** (eval bar)
- **Maçı Analiz Et:** her hamleye *En iyi / İyi / Yanlışlık / Hata / Vahim hata* etiketi
- **Doğruluk %** ve **değerlendirme grafiği**
- **Çoklu hat** (en iyi 3 varyant) + tahtada en-iyi-hamle oku
- **Gözden Geçir** modu (hatalar arası gezinme)

### 📝 Kayıt, Replay, Rapor
- Tüm maçlar SQLite'a kaydedilir (tarih, saat, hamleler, model, sonuç, açılış adı)
- **Replay:** otomatik oynatma (0.5x–4x), adım adım, hamleye atlama
- **YZ Maç Raporu:** bir model maçı analiz edip Markdown rapor yazar → `.md` olarak kaydet
- **PGN dışa aktarma**

### 🎨 Arayüz
- 2 tema: **Klasik** (ahşap + staunton taşlar) ve **Modern** (gri-mavi + düz taşlar)
- Yasal hamle ipuçları, geri al, beraberlik, rövanş, tahta çevir, FEN'den başlat
- İsteğe bağlı satranç saati (blitz/rapid)
- Alınan taşlar + materyal göstergesi, hamle/alma/şah sesleri, klavye
- **Türkçe / İngilizce** dil seçici

---

## 🚀 Kurulum & Kullanım

### Son kullanıcı
1. **`AI Chess.exe`**'ye çift tıklayın (kurulum gerektirmez, taşınabilir)
2. İlk açılışta **adınızı** girin
3. **Oyna** → bir profile/modele karşı başlayın
   - Anahtarsız hemen denemek için **Stockfish profilleri** veya **"Motora Karşı Oyna"**
4. **Ayarlar → AI Sağlayıcıları**'ndan API anahtarlarınızı / Ollama adresinizi girin

### API Anahtarları
Anahtarlar **uygulama içinden** (Ayarlar) girilir ve `%APPDATA%\com.murat.chess\settings.json`
dosyasına kaydedilir. **Kaynak koda veya repoya yazılmaz** — güvenlik gereği.

### Veriler
Tüm maçlar `%APPDATA%\com.murat.chess\chess.db` dosyasında. Yedek = bu dosyayı kopyalayın.

---

## 🛠️ Geliştirme

### Önkoşullar
- Node.js 20+
- Rust **1.90.0** (proje `rust-toolchain.toml` ile sabitler)
- Windows'ta **Visual Studio 2019 BuildTools** (C++ masaüstü iş yükü)

### Komutlar
```bash
npm install
npm run dev          # Vite dev sunucusu (tarayıcı, kısmi)
npm run tauri dev    # masaüstü pencere (geliştirme)
npm test             # vitest birim testleri
npx tsc --noEmit     # tip kontrolü
```

### Üretim derlemesi (Windows — KRİTİK)
Bu makinede C++ linker'ı **VS2019 BuildTools** ortamı gerektirir. Hazır betik:
```bat
build-tauri.bat build
```
veya elle:
```bat
call "C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
npm run tauri build
```
Çıktı: `src-tauri/target/release/ai-chess.exe` (~13 MB) ve NSIS kurulum paketi.

> ⚠️ Rust 1.96 → `tauri-utils` E0119 hatası verir; **1.90.0 kullanın**.
> `time` crate **0.3.47**'de sabit (0.3.48 bozuk).

---

## 🗂️ Mimari

```
src/                      React + TS (tüm uygulama mantığı)
  engine/                 Stockfish sürücüsü, analiz, açılış tespiti
  llm/                    prompt, parseMove, moveService, providers/, httpProxy
  store/                  gameStore, settingsStore (Zustand)
  components/, pages/      UI
src-tauri/                Rust çekirdeği: http_proxy komutu + SQL migration
public/engine/            Stockfish 18 Lite WASM (gömülü)
```

| Katman | Teknoloji |
|---|---|
| Masaüstü kabuk | Tauri 2 (WebView2) |
| Arayüz | React 19 + TypeScript |
| Kural motoru | chess.js |
| Tahta | react-chessboard |
| Analiz motoru | Stockfish 18 Lite (WASM, Web Worker) |
| Durum | Zustand |
| Veritabanı | SQLite (tauri-plugin-sql) |

---

## 🧠 Teknik Notlar

- **Ollama CORS:** İstekler Rust backend'inden (reqwest, `http_proxy`) gider — webview
  origin'i gönderilmediği için Ollama'nın 403 reddi tetiklenmez.
- **"Düşünme" modelleri (gemma vb.):** Hamle isteğine `think: false` eklenir; aksi halde
  model saniyelerce reasoning üretip token sınırına takılır. Test: gemma4:12b'de
  0 fallback, ~615ms/hamle.
- **Yasadışı hamle güvencesi:** Serbest düşünme + parser + 4 denemeli geri bildirim
  döngüsü; son çare rastgele yasal hamle (oyun asla takılmaz).

Ayrıntılar için [`CHANGELOG.md`](./CHANGELOG.md) ve [`CLAUDE.md`](./CLAUDE.md).

---

## 📜 Lisans

Bu proje **GPL-3.0** ile lisanslanmıştır — çünkü satranç motoru olarak **Stockfish**
(GPL-3.0) gömülüdür. Ayrıntılar: [`LICENSE`](./LICENSE) ve
[`THIRD-PARTY-NOTICES.md`](./THIRD-PARTY-NOTICES.md).

- ✅ Ticari kullanım ve satış serbesttir.
- ⚠️ Dağıtırken **tam kaynak kodu** GPL-3.0 koşullarıyla sağlanmalıdır; kapalı kaynak
  (proprietary) yapılamaz. Kapalı bir ürün için Stockfish gömülmemeli, kullanıcı tarafından
  ayrıca kurulan bir UCI motoruyla çalışılmalıdır.

> Bu bir hukuki tavsiye değildir; kesinlik için bir hukukçuya danışın.

---

## 👤 Geliştiren

**Murat Bahçetepe**

Bu uygulamayı tasarlayıp geliştiren kişi. Yapay zekâ, satranç ve yazılımın kesişiminde
keyifli, profesyonel bir araç ortaya koymayı amaçladı. Geri bildirim, öneri, hata
bildirimi veya işbirliği için çekinmeden ulaşın:

📧 **[mbahcetepe@gmail.com](mailto:mbahcetepe@gmail.com)**

<div align="center">

*"Hayatta en hakiki mürşit ilimdir."*

</div>
