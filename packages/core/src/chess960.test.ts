import { Chess } from "chessops/chess";
import { INITIAL_FEN, parseFen } from "chessops/fen";
import { describe, expect, it } from "vitest";
import { chess960BackRank, chess960Fen, randomChess960Id } from "./chess960";

const ALL_IDS = Array.from({ length: 960 }, (_, i) => i);

describe("chess960BackRank", () => {
  it("posição 518 é a posição inicial do xadrez padrão", () => {
    expect(chess960BackRank(518)).toBe("RNBQKBNR");
  });

  it("posição 0 é BBQNNRKR", () => {
    expect(chess960BackRank(0)).toBe("BBQNNRKR");
  });

  it("as 960 posições são todas diferentes", () => {
    expect(new Set(ALL_IDS.map(chess960BackRank)).size).toBe(960);
  });

  it("bispos ficam em casas de cores opostas", () => {
    for (const id of ALL_IDS) {
      const rank = chess960BackRank(id);
      const first = rank.indexOf("B");
      const last = rank.lastIndexOf("B");
      expect(first).not.toBe(last);
      expect((first + last) % 2).toBe(1);
    }
  });

  it("rei fica entre as torres", () => {
    for (const id of ALL_IDS) {
      const rank = chess960BackRank(id);
      const king = rank.indexOf("K");
      expect(rank.indexOf("R")).toBeLessThan(king);
      expect(rank.lastIndexOf("R")).toBeGreaterThan(king);
    }
  });

  it.each([-1, 960, 1.5])("rejeita id fora de 0..959: %d", (id) => {
    expect(() => chess960BackRank(id)).toThrow();
  });
});

describe("chess960Fen", () => {
  it("518 gera o FEN inicial padrão", () => {
    expect(chess960Fen(518)).toBe(INITIAL_FEN);
  });

  it("todas as posições são legais para o chessops", () => {
    for (const id of ALL_IDS) {
      const pos = parseFen(chess960Fen(id)).chain((s) => Chess.fromSetup(s));
      expect(pos.isOk, `id ${id}`).toBe(true);
    }
  });
});

describe("randomChess960Id", () => {
  it("fica entre 0 e 959", () => {
    for (let i = 0; i < 500; i++) {
      const id = randomChess960Id();
      expect(Number.isInteger(id)).toBe(true);
      expect(id).toBeGreaterThanOrEqual(0);
      expect(id).toBeLessThan(960);
    }
  });
});
