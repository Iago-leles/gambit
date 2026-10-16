import { Game, opposite, type Color } from "@gambit/core";
import { createStore } from "zustand/vanilla";
import { clickSquare } from "./board-interaction";
import { deriveBoard, type BoardDerived, type PromotionChoice } from "./board-state";

/**
 * Partida local (os dois lados no mesmo navegador), sem rede.
 * A `Game` é tratada como imutável: cada lance gera um clone.
 */

export type { PromotionChoice };

export interface LocalGameState extends BoardDerived {
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

/** Estado de uma partida nova ou depois de um lance: sem seleção. */
function fresh(game: Game) {
  return { game, selected: null, pendingPromotion: null, ...deriveBoard(game, null) };
}

export function createLocalGameStore(initialFen?: string) {
  return createStore<LocalGameState>()((set, get) => {
    const play = (uci: string) => {
      const next = get().game.clone();
      next.play(uci);
      set(fresh(next));
    };

    const select = (square: string | null) => {
      set({ selected: square, ...deriveBoard(get().game, square) });
    };

    return {
      ...fresh(Game.fromFen(initialFen)),
      orientation: "white",

      selectSquare(square) {
        const { game, selected, pieces, legalMoves, pendingPromotion } = get();
        if (game.result || pendingPromotion) return;

        const outcome = clickSquare({ square, selected, pieces, turn: game.turn, legalMoves });
        if (outcome.type === "move") play(outcome.uci);
        else if (outcome.type === "promote")
          set({ pendingPromotion: { from: outcome.from, to: outcome.to } });
        else select(outcome.square);
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
