import ReactMarkdown from "react-markdown";
import { useSettingsStore } from "../store/settingsStore";
import { helpContent } from "../i18n/helpContent";

export default function HelpPage() {
  const lang = useSettingsStore((s) => s.language);
  return (
    <div className="doc-page">
      <div className="report-view">
        <ReactMarkdown>{helpContent(lang)}</ReactMarkdown>
      </div>
    </div>
  );
}
