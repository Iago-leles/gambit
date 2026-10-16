import type { Game } from "@gambit/core";
import { checkSquare, destsFrom, moveSquares, piecesFromFen, type BoardPiece } from "./board-view";

/** Estado do tabuleiro que a UI desenha. Compartilhado pela partida local e pela online. */

export type PromotionChoice = "q" | "r" | "b" | "n";

/** Valores calculados a partir da partida e da seleção. A UI só lê. */
export interface BoardDerived {
  pieces: Map<string, BoardPiece>;
  legalMoves: string[];
  dests: string[];
  lastMove: { from?: string; to: string } | undefined;
  checkSquare: string | undefined;
}

export function deriveBoard(game: Game, selected: string | null): BoardDerived {
  const legalMoves = game.legalMoves();
  return {
    pieces: piecesFromFen(game.fen),
    legalMoves,
    dests: selected ? destsFrom(legalMoves, selected) : [],
    lastMove: moveSquares(game.moves.at(-1)?.uci),
    checkSquare: checkSquare(game.fen, game.isCheck),
  };
}
