import { useT } from "../i18n/strings";
import { useSettingsStore } from "../store/settingsStore";

const APP_VERSION = "1.0.0";

export default function AboutPage() {
  const t = useT();
  const lang = useSettingsStore((s) => s.language);

  return (
    <div className="doc-page">
      <div className="about-card">
        <div className="about-logo">♞</div>
        <h1 className="about-title">AI Chess</h1>
        <div className="about-motto">“{t("app.motto")}”</div>
        <div className="about-version">v{APP_VERSION}</div>

        <div className="about-section">
          <h3>{lang === "tr" ? "Geliştiren" : "Developed by"}</h3>
          <p className="about-author">Murat Bahçetepe</p>
        </div>

        <div className="about-section">
          <h3>{lang === "tr" ? "Hakkında" : "About"}</h3>
          <p>
            {lang === "tr"
              ? "AI Chess; Claude, ChatGPT, Gemini, Ollama ve OpenAI-uyumlu modellere ve güçlü Stockfish motoruna karşı satranç oynamak, maçları kaydedip analiz etmek ve yapay zekâ destekli maç raporları üretmek için geliştirilmiş bir masaüstü uygulamasıdır."
              : "AI Chess is a desktop application for playing chess against Claude, ChatGPT, Gemini, Ollama and OpenAI-compatible models as well as the strong Stockfish engine, recording and analyzing games, and generating AI-powered match reports."}
          </p>
        </div>

        <div className="about-section">
          <h3>{lang === "tr" ? "Teknoloji" : "Built with"}</h3>
          <p className="about-tech">Tauri · React · TypeScript · chess.js · Stockfish 18 · SQLite</p>
        </div>
      </div>
    </div>
  );
}
