import { useEffect, useState } from "react";
import { HashRouter, NavLink, Route, Routes } from "react-router-dom";
import PlayPage from "./pages/PlayPage";
import HistoryPage from "./pages/HistoryPage";
import ReplayPage from "./pages/ReplayPage";
import SettingsPage from "./pages/SettingsPage";
import HelpPage from "./pages/HelpPage";
import AboutPage from "./pages/AboutPage";
import TournamentPage from "./pages/TournamentPage";
import { useSettingsStore } from "./store/settingsStore";
import { setSoundEnabled } from "./sound";
import { useT } from "./i18n/strings";

function Nav() {
  const t = useT();
  return (
    <nav className="topnav">
      <span className="brand">♞ AI Chess</span>
      <span className="brand-motto">“{t("app.motto")}”</span>
      <div className="nav-spacer" />
      <NavLink to="/" end>{t("nav.play")}</NavLink>
      <NavLink to="/tournament">{t("nav.tournament")}</NavLink>
      <NavLink to="/history">{t("nav.history")}</NavLink>
      <NavLink to="/settings">{t("nav.settings")}</NavLink>
      <NavLink to="/help">{t("nav.help")}</NavLink>
      <NavLink to="/about">{t("nav.about")}</NavLink>
    </nav>
  );
}

export default function App() {
  const load = useSettingsStore((s) => s.load);
  const loaded = useSettingsStore((s) => s.loaded);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load().catch((e) => setError(String(e)));
  }, [load]);

  useEffect(() => {
    setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  if (error) return <div style={{ padding: 32 }}>Ayarlar yüklenemedi: {error}</div>;
  if (!loaded) return null;

  return (
    <HashRouter>
      <Nav />
      <main className="page">
        <Routes>
          <Route path="/" element={<PlayPage />} />
          <Route path="/tournament" element={<TournamentPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/replay/:id" element={<ReplayPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>
    </HashRouter>
  );
}
