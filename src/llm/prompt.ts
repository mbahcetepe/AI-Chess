import { Chess } from "chess.js";
import type { MoveRequest } from "./types";

/** FEN'den ASCII tahta — modelin pozisyonu "görmesi" hamle kalitesini artırır. */
export function asciiBoard(fen: string): string {
  try {
    const board = new Chess(fen).board();
    const rows = board.map((row, i) => {
      const rank = 8 - i;
      const cells = row.map((c) => (c ? (c.color === "w" ? c.type.toUpperCase() : c.type) : ".")).join(" ");
      return `${rank}  ${cells}`;
    });
    return rows.join("\n") + "\n   a b c d e f g h";
  } catch {
    return "";
  }
}

/** Yapısal çıktı şeması: model yalnızca listedeki yasal bir hamleyi seçebilir. */
export function moveSchema(legalMoves: string[]): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      reasoning: { type: "string", description: "One short sentence of reasoning." },
      move: { type: "string", enum: legalMoves, description: "Your move — MUST be one of the listed legal moves." },
    },
    required: ["reasoning", "move"],
  };
}

export const MOVE_SYSTEM_PROMPT = `You are a strong chess engine playing a serious game. You will be given the
current position (FEN), the game so far (PGN), and the complete list of legal
moves. You MUST choose exactly one move from the legal move list.

Respond with ONLY the chosen move in Standard Algebraic Notation (SAN),
exactly as it appears in the legal move list, wrapped like this:
<move>Nf3</move>
No commentary, no analysis, no other text.`;

/** Persona (oyun tarzı) promptunu temel sistem promptuyla birleştirir. */
export function moveSystem(persona?: string): string {
  const p = persona?.trim();
  if (!p) return MOVE_SYSTEM_PROMPT;
  return `${MOVE_SYSTEM_PROMPT}\n\nYour playing style / personality (stay in character while always choosing a legal move):\n${p}`;
}

export function buildMovePrompt(req: MoveRequest): string {
  const parts = [
    `You are playing ${req.color}.`,
    ``,
    `Position (FEN): ${req.fen}`,
    ``,
    `Board (UPPERCASE = White, lowercase = Black, . = empty):`,
    asciiBoard(req.fen),
    ``,
    `Game so far (PGN):`,
    req.pgn.trim() || "(game start)",
    ``,
    `LEGAL MOVES — you may ONLY pick one of these exact strings:`,
    req.legalMoves.join(", "),
    ``,
    `Rules:`,
    `- Copy ONE move from the list above EXACTLY, character for character.`,
    `- Do NOT invent a move that is not in the list.`,
    `- Do NOT explain. Output only the move tag.`,
    `Example: <move>${req.legalMoves[0] ?? "e4"}</move>`,
  ];

  if (req.feedback) {
    parts.push(
      ``,
      `IMPORTANT — your previous answer was REJECTED:`,
      req.feedback,
      `You MUST pick one of the exact strings from the legal move list above.`,
    );
  }

  parts.push(``, `Your move (only the tag): <move>...</move>`);
  return parts.join("\n");
}
