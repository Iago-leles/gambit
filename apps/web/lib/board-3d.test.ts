import { describe, expect, it } from "vitest";
import {
  CAMERA_AZIMUTH,
  cameraPosition,
  groupPieces,
  squareFromPosition,
  squareToPosition,
} from "./board-3d";
import type { BoardPiece } from "./board-view";

describe("board-3d", () => {
  it("põe as brancas no lado +z e a coluna a no lado -x", () => {
    expect(squareToPosition("a1")).toEqual({ x: -3.5, z: 3.5 });
    expect(squareToPosition("h8")).toEqual({ x: 3.5, z: -3.5 });
    expect(squareToPosition("e4")).toEqual({ x: 0.5, z: 0.5 });
  });

  it("converte posição de volta para casa", () => {
    for (const name of ["a1", "h1", "a8", "h8", "d4", "e5"]) {
      const { x, z } = squareToPosition(name);
      expect(squareFromPosition(x, z)).toBe(name);
    }
  });

  it("devolve undefined fora do tabuleiro", () => {
    expect(squareFromPosition(4.1, 0)).toBeUndefined();
    expect(squareFromPosition(0, -4.1)).toBeUndefined();
  });

  it("a câmera olha de trás de cada cor", () => {
    expect(CAMERA_AZIMUTH.white).toBe(0);
    expect(CAMERA_AZIMUTH.black).toBe(Math.PI);
  });

  it("posiciona a c�mera atr�s de cada cor", () => {
    const [wx, wy, wz] = cameraPosition(CAMERA_AZIMUTH.white, Math.PI / 4, 10);
    expect(wx).toBeCloseTo(0);
    expect(wy).toBeCloseTo(7.071, 2);
    expect(wz).toBeCloseTo(7.071, 2);
    const [, , bz] = cameraPosition(CAMERA_AZIMUTH.black, Math.PI / 4, 10);
    expect(bz).toBeCloseTo(-7.071, 2);
  });
});

describe("groupPieces", () => {
  it("agrupa as casas por cor e tipo, na ordem das casas", () => {
    const pieces = new Map<string, BoardPiece>([
      ["e2", { color: "white", role: "pawn" }],
      ["d2", { color: "white", role: "pawn" }],
      ["g8", { color: "black", role: "knight" }],
    ]);
    expect(groupPieces(pieces)).toEqual([
      { color: "white", role: "pawn", squares: ["e2", "d2"] },
      { color: "black", role: "knight", squares: ["g8"] },
    ]);
  });

  it("não devolve grupos vazios", () => {
    expect(groupPieces(new Map())).toEqual([]);
  });
});
