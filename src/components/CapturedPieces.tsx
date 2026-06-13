import { useSettingsStore } from "../store/settingsStore";
import { THEMES } from "../themes/themes";

interface CapturedPiecesProps {
  /** Bu panelin sahibi hangi renk taşları aldı: "w" = beyaz oyuncu (siyah taşları aldı) */
  owner: "w" | "b";
  captured: string[]; // taş tipleri (p,n,b,r,q)
  advantage: number; // pozitif = beyaz önde
}

export default function CapturedPieces({ owner, captured, advantage }: CapturedPiecesProps) {
  const themeId = useSettingsStore((s) => s.theme);
  const pieces = THEMES[themeId].pieces;
  // owner beyazsa aldığı taşlar siyah taşlardır → 'b' + tip
  const colorPrefix = owner === "w" ? "b" : "w";
  const adv = owner === "w" ? advantage : -advantage;

  return (
    <div className="captured">
      {captured.map((t, i) => {
        const Piece = pieces[`${colorPrefix}${t.toUpperCase()}`];
        return (
          <span className="captured-piece" key={i}>
            {Piece ? <Piece /> : t}
          </span>
        );
      })}
      {adv > 0 && <span className="captured-adv">+{adv}</span>}
    </div>
  );
}
