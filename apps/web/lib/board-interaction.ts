import type { Color } from "@gambit/core";
import { destsFrom, isPromotion, type BoardPiece } from "./board-view";

/**
 * O que um clique numa casa significa, no fluxo clique-clique.
 * Usado pela partida local e pela online.
 */
export type ClickOutcome =
  | { type: "select"; square: string | null }
  | { type: "move"; uci: string }
  | { type: "promote"; from: string; to: string };

interface ClickInput {
  square: string;
  selected: string | null;
  pieces: Map<string, BoardPiece>;
  turn: Color;
  legalMoves: readonly string[];
}

export function clickSquare({
  square,
  selected,
  pieces,
  turn,
  legalMoves,
}: ClickInput): ClickOutcome {
  if (selected && destsFrom(legalMoves, selected).includes(square)) {
    return isPromotion(legalMoves, selected, square)
      ? { type: "promote", from: selected, to: square }
      : { type: "move", uci: selected + square };
  }
  const isOwn = pieces.get(square)?.color === turn;
  return { type: "select", square: isOwn && square !== selected ? square : null };
}
