import { defaultPieces } from "react-chessboard";
import type { PieceRenderObject } from "react-chessboard";
import type { ThemeId } from "../types";
import { modernPieces } from "./modernPieces";

export interface ThemeDef {
  id: ThemeId;
  boardLight: string;
  boardDark: string;
  pieces: PieceRenderObject;
}

export const THEMES: Record<ThemeId, ThemeDef> = {
  classic: {
    id: "classic",
    boardLight: "#f0d9b5",
    boardDark: "#b58863",
    pieces: defaultPieces, // staunton/cburnett stili standart set
  },
  modern: {
    id: "modern",
    boardLight: "#dee3e6",
    boardDark: "#8ca2ad",
    pieces: modernPieces, // düz geometrik set
  },
};
