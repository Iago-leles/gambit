import { Game, opposite, type Color } from "@gambit/core";
import { createStore } from "zustand/vanilla";
import {
  checkSquare,
  destsFrom,
  isPromotion,
  moveSquares,
  piecesFromFen,
  type BoardPiece,
} from "./board-view";

/**
 * Partida local (os dois lados no mesmo navegador), sem rede.
 * A `Game` é tratada como imutável: cada lance gera um clone.
 */

export type PromotionChoice = "q" | "r" | "b" | "n";

/** Valores calculados a partir da partida e da seleção. A UI só lê. */
interface Derived {
  pieces: Map<string, BoardPiece>;
  legalMoves: string[];
  dests: string[];
  lastMove: { from?: string; to: string } | undefined;
  checkSquare: string | undefined;
}

export interface LocalGameState extends Derived {
  game: Game;
  selected: string | null;
  pendingPromotion: { from: string; to: string } | null;
  orientation: Color;

  selectSquare: (square: string) => void;
  choosePromotion: (choice: PromotionChoice) => void;
  cancelPromotion: () => void;
  flip: () => void;
  newGame: (fen?: string) => void;
  resign: () => void;
}

function derive(game: Game, selected: string | null): Derived {
  const legalMoves = game.legalMoves();
  return {
    pieces: piecesFromFen(game.fen),
    legalMoves,
    dests: selected ? destsFrom(legalMoves, selected) : [],
    lastMove: moveSquares(game.moves.at(-1)?.uci),
    checkSquare: checkSquare(game.fen, game.isCheck),
  };
}

/** Estado de uma partida nova ou depois de um lance: sem seleção. */
function fresh(game: Game) {
  return { game, selected: null, pendingPromotion: null, ...derive(game, null) };
}

export function createLocalGameStore(initialFen?: string) {
  return createStore<LocalGameState>()((set, get) => {
    const play = (uci: string) => {
      const next = get().game.clone();
      next.play(uci);
      set(fresh(next));
    };

    const select = (square: string | null) => {
      set({ selected: square, ...derive(get().game, square) });
    };

    return {
      ...fresh(Game.fromFen(initialFen)),
      orientation: "white",

      selectSquare(square) {
        const { game, selected, dests, pieces, legalMoves, pendingPromotion } = get();
        if (game.result || pendingPromotion) return;

        if (selected && dests.includes(square)) {
          if (isPromotion(legalMoves, selected, square)) {
            set({ pendingPromotion: { from: selected, to: square } });
          } else {
            play(selected + square);
          }
          return;
        }

        const piece = pieces.get(square);
        const isOwn = piece?.color === game.turn;
        select(isOwn && square !== selected ? square : null);
      },

      choosePromotion(choice) {
        const pending = get().pendingPromotion;
        if (pending) play(pending.from + pending.to + choice);
      },

      cancelPromotion() {
        set({ pendingPromotion: null });
        select(null);
      },

      flip() {
        set({ orientation: opposite(get().orientation) });
      },

      newGame(fen) {
        set(fresh(Game.fromFen(fen)));
      },

      resign() {
        const next = get().game.clone();
        next.resign(next.turn);
        set(fresh(next));
      },
    };
  });
}
