import { describe, expect, it } from "vitest";
import { buildHighlights } from "./highlights";
import type { BoardPiece } from "./board-view";

const pieces = new Map<string, BoardPiece>([["d5", { color: "black", role: "pawn" }]]);
const base = { selected: null, dests: [], lastMove: undefined, checkSquare: undefined, pieces };

describe("buildHighlights", () => {
  it("sem nada marcado, não há destaque", () => {
    expect(buildHighlights(base)).toEqual({ tints: [], dots: [] });
  });

  it("marca a seleção, os destinos e a captura", () => {
    const result = buildHighlights({ ...base, selected: "e4", dests: ["e5", "d5"] });
    expect(result.tints).toEqual(
      expect.arrayContaining([
        { square: "e4", kind: "selected" },
        { square: "d5", kind: "capture" },
      ]),
    );
    expect(result.dots).toEqual(["e5"]);
  });

  it("marca o último lance", () => {
    const result = buildHighlights({ ...base, lastMove: { from: "e2", to: "e4" } });
    expect(result.tints).toEqual([
      { square: "e2", kind: "last" },
      { square: "e4", kind: "last" },
    ]);
  });

  it("lance de drop só marca o destino", () => {
    expect(buildHighlights({ ...base, lastMove: { to: "e4" } }).tints).toEqual([
      { square: "e4", kind: "last" },
    ]);
  });

  it("xeque vence seleção e último lance na mesma casa", () => {
    const result = buildHighlights({
      ...base,
      selected: "e1",
      lastMove: { from: "e2", to: "e1" },
      checkSquare: "e1",
    });
    expect(result.tints.filter((t) => t.square === "e1")).toEqual([
      { square: "e1", kind: "check" },
    ]);
  });
});
