import { describe, expect, it } from "vitest";
import { canStartDrag, dropTarget, projectToPlane, DRAG_THRESHOLD_PX } from "./drag";

describe("projectToPlane", () => {
  it("acha onde o raio corta o plano na altura dada", () => {
    // Câmera em (0, 10, 10) olhando para (0, 0, 0).
    const hit = projectToPlane({ x: 0, y: 10, z: 10 }, { x: 0, y: -1, z: -1 }, 0);
    expect(hit?.x).toBeCloseTo(0);
    expect(hit?.z).toBeCloseTo(0);
  });

  it("respeita a altura do plano", () => {
    const hit = projectToPlane({ x: 1, y: 10, z: 0 }, { x: 0, y: -1, z: 0 }, 2);
    expect(hit).toEqual({ x: 1, z: 0 });
  });

  it("não acha nada com raio paralelo ao plano ou apontando para cima", () => {
    expect(projectToPlane({ x: 0, y: 5, z: 0 }, { x: 1, y: 0, z: 0 }, 0)).toBeUndefined();
    expect(projectToPlane({ x: 0, y: 5, z: 0 }, { x: 0, y: 1, z: 0 }, 0)).toBeUndefined();
  });
});

describe("canStartDrag", () => {
  it("só começa depois de mexer o suficiente", () => {
    expect(canStartDrag(DRAG_THRESHOLD_PX - 1, "e2", [])).toBe(false);
    expect(canStartDrag(DRAG_THRESHOLD_PX + 1, "e2", [])).toBe(true);
  });

  it("não arrasta uma peça que é alvo de captura da peça selecionada", () => {
    expect(canStartDrag(20, "d5", ["d5", "e5"])).toBe(false);
  });
});

describe("dropTarget", () => {
  it("devolve a casa só se for um destino legal", () => {
    expect(dropTarget("e4", ["e3", "e4"])).toBe("e4");
    expect(dropTarget("e5", ["e3", "e4"])).toBeUndefined();
    expect(dropTarget(undefined, ["e3"])).toBeUndefined();
  });
});
