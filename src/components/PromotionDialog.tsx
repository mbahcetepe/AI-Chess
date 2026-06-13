import { useGameStore } from "../store/gameStore";
import { useSettingsStore } from "../store/settingsStore";
import { THEMES } from "../themes/themes";
import { useT } from "../i18n/strings";

const PIECES: ("q" | "r" | "b" | "n")[] = ["q", "r", "b", "n"];

export default function PromotionDialog() {
  const t = useT();
  const pending = useGameStore((s) => s.pendingPromotion);
  const choose = useGameStore((s) => s.choosePromotion);
  const cancel = useGameStore((s) => s.cancelPromotion);
  const chess = useGameStore((s) => s.chess);
  const themeId = useSettingsStore((s) => s.theme);

  if (!pending) return null;

  const color = chess.turn(); // terfi eden taraf
  const pieces = THEMES[themeId].pieces;

  return (
    <div className="overlay" onClick={cancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{t("game.promotion")}</h3>
        <div style={{ display: "flex", gap: 12 }}>
          {PIECES.map((p) => {
            const key = `${color}${p.toUpperCase()}`;
            const Piece = pieces[key];
            return (
              <button
                key={p}
                onClick={() => choose(p)}
                style={{ width: 72, height: 72, padding: 8 }}
                aria-label={p}
              >
                {Piece ? <Piece /> : p.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
