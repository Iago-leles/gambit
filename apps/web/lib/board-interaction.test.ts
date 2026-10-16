import { describe, expect, it } from "vitest";
import { piecesFromFen } from "./board-view";
import { clickSquare } from "./board-interaction";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const START_MOVES = ["e2e3", "e2e4", "g1f3", "g1h3"];
const PROMO = "8/P6k/8/8/8/8/8/K7 w - - 0 1";
const PROMO_MOVES = ["a7a8q", "a7a8r", "a7a8b", "a7a8n", "a1b1", "a1b2"];

function click(square: string, selected: string | null, fen = START, legal = START_MOVES) {
  return clickSquare({
    square,
    selected,
    pieces: piecesFromFen(fen),
    turn: "white",
    legalMoves: legal,
  });
}

describe("clickSquare", () => {
  it("peça da vez sem seleção: seleciona", () => {
    expect(click("e2", null)).toEqual({ type: "select", square: "e2" });
  });

  it("mesma peça de novo: desfaz a seleção", () => {
    expect(click("e2", "e2")).toEqual({ type: "select", square: null });
  });

  it("outra peça própria: troca a seleção", () => {
    expect(click("g1", "e2")).toEqual({ type: "select", square: "g1" });
  });

  it("peça do oponente sem ser destino: limpa a seleção", () => {
    expect(click("e7", "e2")).toEqual({ type: "select", square: null });
  });

  it("destino legal: joga o lance", () => {
    expect(click("e4", "e2")).toEqual({ type: "move", uci: "e2e4" });
  });

  it("destino de promoção: pede a peça", () => {
    expect(click("a8", "a7", PROMO, PROMO_MOVES)).toEqual({
      type: "promote",
      from: "a7",
      to: "a8",
    });
  });
});
