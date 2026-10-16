import {
  Game,
  opposite,
  type ClientMessage,
  type Color,
  type ErrorCode,
  type ServerMessage,
  type Snapshot,
} from "@gambit/core";
import { createStore } from "zustand/vanilla";
import { clickSquare } from "./board-interaction";
import { deriveBoard, type BoardDerived, type PromotionChoice } from "./board-state";

/**
 * Partida online. O servidor é a fonte da verdade (ADR 001).
 * O store só conhece uma função `send`, então funciona sem rede nos testes.
 *
 * UI otimista: o lance aparece na hora numa cópia local da partida.
 * O próximo `state` do servidor substitui a cópia; um `error` a desfaz.
 */

export type ConnectionStatus = "connecting" | "open" | "closed";
export type Role = Color | "spectator";

const EMPTY_BOARD: BoardDerived = {
  pieces: new Map(),
  legalMoves: [],
  dests: [],
  lastMove: undefined,
  checkSquare: undefined,
};

export interface OnlineGameState extends BoardDerived {
  code: string;
  connection: ConnectionStatus;
  role: Role | null;
  snapshot: Snapshot | null;
  /** Instante local em que o último snapshot chegou. Base para o relógio na tela. */
  receivedAt: number;
  /** Partida exibida: a do servidor ou a cópia otimista. */
  game: Game | null;
  pendingMove: string | null;
  selected: string | null;
  pendingPromotion: { from: string; to: string } | null;
  orientation: Color;
  error: { code: ErrorCode; message: string } | null;

  receive: (message: ServerMessage) => void;
  setConnection: (status: ConnectionStatus) => void;
  selectSquare: (square: string) => void;
  choosePromotion: (choice: PromotionChoice) => void;
  cancelPromotion: () => void;
  flip: () => void;
  resign: () => void;
  draw: (action: "offer" | "accept" | "decline") => void;
  dismissError: () => void;
}

interface Options {
  code: string;
  send: (message: ClientMessage) => void;
  saveToken?: (token: string) => void;
  now?: () => number;
}

function gameFrom(snapshot: Snapshot): Game {
  return Game.replay(
    snapshot.initialFen,
    snapshot.moves.map((m) => m.uci),
  );
}

export function createOnlineGameStore({ code, send, saveToken, now = Date.now }: Options) {
  return createStore<OnlineGameState>()((set, get) => {
    /** Mostra a partida do servidor, sem seleção nem lance pendente. */
    const showAuthoritative = (snapshot: Snapshot) => {
      const game = gameFrom(snapshot);
      set({
        snapshot,
        receivedAt: now(),
        game,
        pendingMove: null,
        selected: null,
        pendingPromotion: null,
        ...deriveBoard(game, null),
      });
    };

    const canMove = () => {
      const { role, game, snapshot, pendingMove } = get();
      return (
        game !== null &&
        snapshot?.status === "playing" &&
        role === game.turn &&
        pendingMove === null &&
        !game.result
      );
    };

    const play = (uci: string) => {
      const { game } = get();
      if (!game) return;
      const ply = game.ply;
      const next = game.clone();
      next.play(uci);
      set({
        game: next,
        pendingMove: uci,
        selected: null,
        pendingPromotion: null,
        ...deriveBoard(next, null),
      });
      send({ type: "move", uci, ply });
    };

    return {
      code,
      connection: "connecting",
      role: null,
      snapshot: null,
      receivedAt: 0,
      game: null,
      pendingMove: null,
      selected: null,
      pendingPromotion: null,
      orientation: "white",
      error: null,
      ...EMPTY_BOARD,

      receive(message) {
        switch (message.type) {
          case "welcome":
            if (message.playerToken) saveToken?.(message.playerToken);
            set({
              role: message.role,
              orientation: message.role === "black" ? "black" : "white",
            });
            showAuthoritative(message.snapshot);
            return;
          case "state":
            showAuthoritative(message.snapshot);
            return;
          case "error": {
            const { snapshot, pendingMove } = get();
            if (pendingMove && snapshot) showAuthoritative(snapshot);
            set({ error: { code: message.code, message: message.message } });
            return;
          }
          case "pong":
            return;
        }
      },

      setConnection(status) {
        set({ connection: status });
      },

      selectSquare(square) {
        const { game, selected, pieces, legalMoves, pendingPromotion } = get();
        if (!game || pendingPromotion || !canMove()) {
          set({ selected: null, dests: [] });
          return;
        }
        const outcome = clickSquare({ square, selected, pieces, turn: game.turn, legalMoves });
        if (outcome.type === "move") play(outcome.uci);
        else if (outcome.type === "promote")
          set({ pendingPromotion: { from: outcome.from, to: outcome.to } });
        else set({ selected: outcome.square, ...deriveBoard(game, outcome.square) });
      },

      choosePromotion(choice) {
        const pending = get().pendingPromotion;
        if (pending) play(pending.from + pending.to + choice);
      },

      cancelPromotion() {
        const { game } = get();
        set({ pendingPromotion: null, selected: null, ...(game && deriveBoard(game, null)) });
      },

      flip() {
        set({ orientation: opposite(get().orientation) });
      },

      resign() {
        send({ type: "resign" });
      },

      draw(action) {
        send({ type: "draw", action });
      },

      dismissError() {
        set({ error: null });
      },
    };
  });
}
