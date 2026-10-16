import { describe, expect, it } from "vitest";
import { describeResult, resultToPgn } from "./result";

describe("resultToPgn", () => {
  it("vitória das brancas é 1-0", () => {
    expect(resultToPgn({ winner: "white", reason: "checkmate" })).toBe("1-0");
  });

  it("vitória das pretas é 0-1", () => {
    expect(resultToPgn({ winner: "black", reason: "resign" })).toBe("0-1");
  });

  it("empate é 1/2-1/2", () => {
    expect(resultToPgn({ winner: null, reason: "stalemate" })).toBe("1/2-1/2");
  });

  it("partida sem resultado é *", () => {
    expect(resultToPgn(undefined)).toBe("*");
  });
});

describe("describeResult", () => {
  it("descreve vitória com o motivo", () => {
    expect(describeResult({ winner: "white", reason: "checkmate" })).toBe(
      "Brancas vencem por xeque-mate",
    );
    expect(describeResult({ winner: "black", reason: "timeout" })).toBe("Pretas vencem por tempo");
  });

  it("descreve empate com o motivo", () => {
    expect(describeResult({ winner: null, reason: "repetition" })).toBe(
      "Empate por repetição tripla",
    );
    expect(describeResult({ winner: null, reason: "agreement" })).toBe("Empate por acordo");
  });
});
