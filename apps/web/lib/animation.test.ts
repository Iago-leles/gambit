import { describe, expect, it } from "vitest";
import {
  arcPosition,
  detectMoves,
  easeInOutCubic,
  lerpAngle,
  moveDuration,
  type Vec3,
} from "./animation";
import { piecesFromFen } from "./board-view";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("easeInOutCubic", () => {
  it("vai de 0 a 1 e passa por 0.5 no meio", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
  });
});

describe("arcPosition", () => {
  const from = { x: 0, z: 0 };
  const to = { x: 2, z: -4 };

  it("começa na origem e termina no destino, no chão", () => {
    const out: Vec3 = { x: 0, y: 0, z: 0 };
    arcPosition(0, from, to, 1, out);
    expect(out).toEqual({ x: 0, y: 0, z: 0 });
    arcPosition(1, from, to, 1, out);
    expect(out.x).toBeCloseTo(2);
    expect(out.z).toBeCloseTo(-4);
    expect(out.y).toBeCloseTo(0);
  });

  it("sobe até a altura máxima no meio e nunca fica abaixo do chão", () => {
    const out: Vec3 = { x: 0, y: 0, z: 0 };
    arcPosition(0.5, from, to, 1.2, out);
    expect(out.y).toBeCloseTo(1.2);
    for (let t = 0; t <= 1; t += 0.05) {
      arcPosition(t, from, to, 1.2, out);
      expect(out.y).toBeGreaterThanOrEqual(-1e-9);
    }
  });
});

describe("moveDuration", () => {
  it("cresce com a distância, com teto", () => {
    expect(moveDuration(1, false)).toBeLessThan(moveDuration(5, false));
    expect(moveDuration(100, false)).toBeLessThanOrEqual(0.9);
  });
  it("é zero com movimento reduzido", () => {
    expect(moveDuration(5, true)).toBe(0);
  });
});

describe("lerpAngle", () => {
  it("anda pelo lado mais curto", () => {
    expect(lerpAngle(0.1, 2 * Math.PI - 0.1, 0.5)).toBeCloseTo(0, 5);
    expect(lerpAngle(0, Math.PI / 2, 0.5)).toBeCloseTo(Math.PI / 4);
  });
});

describe("detectMoves", () => {
  const apply = (fen: string) => piecesFromFen(fen);

  it("lance simples", () => {
    const next = apply("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1");
    expect(detectMoves(apply(START), next)).toEqual([{ from: "e2", to: "e4" }]);
  });

  it("captura", () => {
    const before = apply("4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1");
    const after = apply("4k3/8/8/3P4/8/8/8/4K3 b - - 0 1");
    expect(detectMoves(before, after)).toEqual([{ from: "e4", to: "d5" }]);
  });

  it("roque move rei e torre", () => {
    const before = apply("4k3/8/8/8/8/8/8/4K2R w K - 0 1");
    const after = apply("4k3/8/8/8/8/8/8/5RK1 b - - 1 1");
    expect(detectMoves(before, after)).toEqual(
      expect.arrayContaining([
        { from: "e1", to: "g1" },
        { from: "h1", to: "f1" },
      ]),
    );
  });

  it("en passant", () => {
    const before = apply("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1");
    const after = apply("4k3/8/3P4/8/8/8/8/4K3 b - - 0 1");
    expect(detectMoves(before, after)).toEqual([{ from: "e5", to: "d6" }]);
  });

  it("promoção", () => {
    const before = apply("8/4P3/8/8/8/8/8/k6K w - - 0 1");
    const after = apply("4Q3/8/8/8/8/8/8/k6K b - - 0 1");
    expect(detectMoves(before, after)).toEqual([{ from: "e7", to: "e8" }]);
  });

  it("sem mudança ou posição nova inteira, não anima", () => {
    expect(detectMoves(apply(START), apply(START))).toEqual([]);
    expect(detectMoves(apply(START), apply("4k3/8/8/8/8/8/8/4K3 w - - 0 1"))).toEqual([]);
    expect(detectMoves(new Map(), apply(START))).toEqual([]);
  });
});
