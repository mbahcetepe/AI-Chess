# Değişiklik Günlüğü — AI Chess

Murat Bahçetepe için geliştirilen, yapay zekâ modellerine ve Stockfish motoruna karşı
satranç oynama masaüstü uygulaması.
Motto: *"Hayatta en hakiki mürşit ilimdir"*

---

## v1.0 — Temel Uygulama

### Mimari
- **Tauri 2 + React + TypeScript** masaüstü uygulaması (tek `Chess.exe`, kurulum gerektirmez).
- **chess.js** kural motoru (yasal hamle, FEN/PGN, mat/pat/beraberlik tespiti).
- **react-chessboard** tahta; **Zustand** state; **react-router** sayfalar.
- **SQLite** (tauri-plugin-sql) ile kalıcı maç kaydı.

### Oyun
- 3 mod: İnsan vs AI, AI vs AI (izle, duraklat/devam/durdur), İnsan vs İnsan.
- 2 tema: Klasik (ahşap + staunton taşlar), Modern (gri-mavi + düz taşlar).
- Yasal hamle ipuçları, terfi penceresi, şah vurgusu, sürükle-bırak + tıkla-tıkla.

### AI Sağlayıcıları
- Claude (Anthropic, varsayılan `claude-opus-4-8`), ChatGPT (OpenAI), Gemini (Google),
  Ollama (lokal), mock (anahtarsız test).
- **Retry/fallback mantığı**: model yasadışı hamle verirse geri bildirimle tekrar dener,
  son çare rastgele yasal hamle (⚠ ile işaretlenir) — oyun asla takılmaz.

### Kayıt / Replay / Rapor
- Tüm maçlar SQLite'a kaydedilir (tarih, saat, hamleler, model, sonuç).
- Replay: otomatik oynatma (0.5x–4x), adım adım, hamleye atlama.
- Maç raporu: bir AI modeli Markdown analiz raporu üretir, `.md` olarak kaydedilebilir.
- TR/EN dil seçici, Ayarlar, API anahtarı girişi + test.

---

## v1.1 — Masaüstü Dağıtım Düzeltmeleri

- **MSVC C++ araçları**: VS2019 BuildTools üzerinden derleme (VS2022'de x64 lib eksikti).
- **Rust 1.90.0'a sabitlendi** (`rust-toolchain.toml`) — Rust 1.96, tauri-utils ile
  E0119 coherence hatası veriyordu.
- **`time` crate 0.3.47'ye düşürüldü** (0.3.48 bozuk).

---

## v1.2 — Ollama Erişimi (CORS)

- **Ollama "HTTP 403" sorunu çözüldü**: istekler artık Rust backend'inden (reqwest)
  gidiyor (`http_proxy` komutu). Backend Origin başlığı göndermez → Ollama'nın CORS
  reddi tetiklenmez. Hem Ollama hem Open WebUI/OpenRouter bu proxy'den geçer.
- Ayarlar'da Ollama bağlantı durumu + gerçek hata mesajı gösterimi.
- Hardcoded IP kaldırıldı (varsayılan `http://localhost:11434`).

---

## v1.3 — 10/10 Profesyonel Sürüm

### Stockfish motoru (gömülü)
- **Stockfish 18 Lite** WASM gömülü (anahtarsız, çevrimdışı).
- 8 seviye (Acemi ~1320 → En Güçlü ~3190).
- İpucu: en iyi hamleyi yeşil okla gösterir.

### Nesnel analiz (chess.com seviyesi)
- Canlı değerlendirme çubuğu (eval bar).
- "Maçı Analiz Et": her hamleye En iyi/İyi/Yanlışlık/Hata/Vahim hata etiketi.
- Doğruluk % (lichess formülü), eval grafiği.
- Replay'de **çoklu hat (Multi-PV, en iyi 3 varyant)** + en-iyi-hamle oku.
- "Gözden Geçir": hatalar arası gezinme.

### Profil sistemi (chess.com botları gibi)
- 5 hazır persona (Stockfish destekli): Acemi Aslı, Sabırlı Sami, Sert Sırrı,
  Stratejist Selin, Usta Umut.
- Kullanıcı profilleri: model + isim + emoji avatar + renk + puan + **kişilik promptu**.
- Kişilik promptu LLM'in oyun tarzını belirler (Stockfish'te yok sayılır).
- Oyun kurulumunda avatarlı profil grid'i (bot kartları).

### Oyun derinliği
- Geri al, beraberlik, rövanş, tahta çevir, açılış (ECO) adı, FEN'den başlat,
  isteğe bağlı saat (blitz/rapid).

### Cila
- Avatarlı + puanlı oyuncu kartları, alınan taşlar + materyal göstergesi.
- Hamle/alma/şah/oyun sonu sesleri (WebAudio, dosyasız), klavye.
- **Hakkında** (Murat Bahçetepe + motto), **detaylı TR/EN Yardım** sayfası.

---

## v1.4 — Düzen Düzeltmeleri

- Tahta artık ekran yüksekliğine göre büyür (640px sınırı kaldırıldı); sayfa 1280px
  genişlik sınırı kaldırıldı → iki yandaki boşluk gitti.
- Yeni Oyun penceresi kaydırılabilir, "Oyunu Başlat" alta sabit.
- Hamle listesi panel içinde kayar; uzun maçlarda tahta yerinde sabit kalır.

---

## v1.5 — Ollama Hamle Kalitesi (test edilerek)

### Sorun
- gemma4:12b gibi modeller yasadışı/rastgele hamle yapıyor, hatta mat oluyordu.
- Eklenen enum-kısıtlı structured output ve `num_predict` sınırı durumu **kötüleştirdi**.

### Kök sebep (gerçek Ollama testiyle bulundu)
- **gemma4:12b bir "düşünme" (reasoning) modeli.** Uzun reasoning üretiyor; `num_predict`
  sınırı modeli düşünme aşamasında kesiyor → `content` boş → fallback.
- enum `format` da bu modelde boş içerik döndürüyordu.

### Çözüm (gemma4:12b'ye karşı canlı test edildi)
- Ollama isteğine **`think: false`** eklendi → model saniyeler süren reasoning yerine
  doğrudan hamle verir.
- num_predict sınırı kaldırıldı; `content` boşsa `thinking` alanı da değerlendirilir.
- enum/structured output kaldırıldı (serbest düşünme + parser + retry).
- **Test sonucu**: 0 fallback (önce 10/12), 15/16 ilk denemede yasal, ~615ms/hamle,
  gerçek satranç (`1.e4 e5 2.Nf3 Nc6...`).

### Not
- Daha iyi oyun kalitesi için `llama3.1:8b`/`qwen2.5:7b` veya Stockfish profilleri önerilir.
