import { useMemo } from "react";
import { Chessboard } from "react-chessboard";
import type { CSSProperties } from "react";
import { useSettingsStore } from "../store/settingsStore";
import { THEMES } from "../themes/themes";
import type { LegalTarget } from "../store/gameStore";

export interface BoardArrow {
  from: string;
  to: string;
  color?: string;
}

export interface BoardProps {
  fen: string;
  interactive?: boolean;
  orientation?: "white" | "black";
  selected?: string | null;
  legalTargets?: LegalTarget[];
  lastMove?: { from: string; to: string } | null;
  checkSquare?: string | null;
  showHints?: boolean;
  arrows?: BoardArrow[];
  onSquareClick?: (square: string) => void;
  onDrop?: (from: string, to: string) => boolean;
  canDrag?: (square: string | null) => boolean;
}

export default function Board({
  fen,
  interactive = false,
  orientation = "white",
  selected,
  legalTargets = [],
  lastMove,
  checkSquare,
  showHints = true,
  arrows = [],
  onSquareClick,
  onDrop,
  canDrag,
}: BoardProps) {
  const themeId = useSettingsStore((s) => s.theme);
  const theme = THEMES[themeId];

  const squareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};
    if (lastMove) {
      styles[lastMove.from] = { backgroundColor: "var(--hl-lastmove)" };
      styles[lastMove.to] = { backgroundColor: "var(--hl-lastmove)" };
    }
    if (selected) {
      styles[selected] = { backgroundColor: "var(--hl-select)" };
    }
    if (showHints) {
      for (const t of legalTargets) {
        styles[t.square] = {
          ...styles[t.square],
          background: t.isCapture
            ? `${styles[t.square]?.backgroundColor ?? "transparent"} radial-gradient(circle, transparent 56%, var(--hl-capture) 59%, var(--hl-capture) 73%, transparent 76%)`
            : `${styles[t.square]?.backgroundColor ?? "transparent"} radial-gradient(circle, var(--hl-target) 21%, transparent 24%)`,
        };
      }
    }
    if (checkSquare) {
      styles[checkSquare] = {
        ...styles[checkSquare],
        background:
          "radial-gradient(circle, rgba(220, 60, 50, 0.85) 18%, rgba(220, 60, 50, 0.35) 55%, transparent 75%)",
      };
    }
    return styles;
  }, [selected, legalTargets, lastMove, checkSquare, showHints]);

  return (
    <Chessboard
      options={{
        id: "board",
        position: fen,
        boardOrientation: orientation,
        pieces: theme.pieces,
        darkSquareStyle: { backgroundColor: theme.boardDark },
        lightSquareStyle: { backgroundColor: theme.boardLight },
        squareStyles,
        arrows: arrows.map((a) => ({
          startSquare: a.from,
          endSquare: a.to,
          color: a.color ?? "var(--accent)",
        })),
        animationDurationInMs: 200,
        allowDragging: interactive,
        showNotation: true,
        boardStyle: {
          borderRadius: 8,
          boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
          overflow: "hidden",
        },
        onSquareClick: interactive
          ? ({ square }) => {
              if (square) onSquareClick?.(square);
            }
          : undefined,
        onPieceDrop: interactive
          ? ({ sourceSquare, targetSquare }) => {
              if (!targetSquare) return false;
              return onDrop?.(sourceSquare, targetSquare) ?? false;
            }
          : undefined,
        canDragPiece: interactive
          ? ({ square }) => canDrag?.(square) ?? true
          : () => false,
      }}
    />
  );
}
