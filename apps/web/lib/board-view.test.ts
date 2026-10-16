import { Game } from "@gambit/core";
import { describe, expect, it } from "vitest";
import {
  checkSquare,
  destsFrom,
  isLightSquare,
  isPromotion,
  moveSquares,
  piecesFromFen,
  squaresFor,
} from "./board-view";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("piecesFromFen", () => {
  it("lê as 32 peças da posição inicial", () => {
    const pieces = piecesFromFen(START);
    expect(pieces.size).toBe(32);
    expect(pieces.get("e1")).toEqual({ color: "white", role: "king" });
    expect(pieces.get("d8")).toEqual({ color: "black", role: "queen" });
    expect(pieces.get("g1")).toEqual({ color: "white", role: "knight" });
    expect(pieces.get("a7")).toEqual({ color: "black", role: "pawn" });
    expect(pieces.has("e4")).toBe(false);
  });

  it("respeita casas vazias no meio da fileira", () => {
    const pieces = piecesFromFen("8/8/8/3k4/8/8/8/R3K3 w - - 0 1");
    expect([...pieces.keys()].sort()).toEqual(["a1", "d5", "e1"]);
  });
});

describe("squaresFor", () => {
  it("brancas embaixo: começa em a8 e termina em h1", () => {
    const squares = squaresFor("white");
    expect(squares).toHaveLength(64);
    expect(squares[0]).toBe("a8");
    expect(squares[7]).toBe("h8");
    expect(squares[63]).toBe("h1");
  });

  it("pretas embaixo: começa em h1 e termina em a8", () => {
    const squares = squaresFor("black");
    expect(squares[0]).toBe("h1");
    expect(squares[63]).toBe("a8");
  });
});

describe("isLightSquare", () => {
  it("a1 é escura e h1 é clara", () => {
    expect(isLightSquare("a1")).toBe(false);
    expect(isLightSquare("h1")).toBe(true);
    expect(isLightSquare("d1")).toBe(true);
  });
});

describe("destsFrom", () => {
  it("lista os destinos de uma casa sem repetir promoções", () => {
    const legal = ["e2e3", "e2e4", "g1f3", "a7a8q", "a7a8r", "a7a8b", "a7a8n"];
    expect(destsFrom(legal, "e2")).toEqual(["e3", "e4"]);
    expect(destsFrom(legal, "a7")).toEqual(["a8"]);
    expect(destsFrom(legal, "h2")).toEqual([]);
  });
});

describe("isPromotion", () => {
  it("é promoção quando existe lance legal com peça", () => {
    const legal = ["a7a8q", "a7a8r", "a7a8b", "a7a8n", "e2e4"];
    expect(isPromotion(legal, "a7", "a8")).toBe(true);
    expect(isPromotion(legal, "e2", "e4")).toBe(false);
  });
});

describe("moveSquares", () => {
  it("separa origem e destino do UCI", () => {
    expect(moveSquares("e7e8q")).toEqual({ from: "e7", to: "e8" });
  });

  it("drop só tem destino", () => {
    expect(moveSquares("P@e4")).toEqual({ to: "e4" });
  });

  it("sem lance devolve undefined", () => {
    expect(moveSquares(undefined)).toBeUndefined();
  });
});

describe("checkSquare", () => {
  it("aponta o rei de quem está em xeque", () => {
    const game = Game.fromFen();
    for (const uci of ["e2e4", "f7f6", "d1h5"]) game.play(uci);
    expect(checkSquare(game.fen, game.isCheck)).toBe("e8");
  });

  it("sem xeque devolve undefined", () => {
    expect(checkSquare(START, false)).toBeUndefined();
  });
});
