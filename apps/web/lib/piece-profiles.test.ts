import { describe, expect, it } from "vitest";
import { PIECE_PROFILES } from "./piece-profiles";
import type { Role } from "./board-view";

const ROLES: Role[] = ["king", "queen", "rook", "bishop", "knight", "pawn"];

describe("piece profiles", () => {
  it.each(ROLES)("%s tem um perfil válido para o torno", (role) => {
    const profile = PIECE_PROFILES[role];
    expect(profile.length).toBeGreaterThanOrEqual(4);
    expect(profile[0]?.[1]).toBe(0);
    for (const [radius, y] of profile) {
      expect(radius).toBeGreaterThanOrEqual(0);
      expect(radius).toBeLessThan(0.5);
      expect(y).toBeGreaterThanOrEqual(0);
    }
    const heights = profile.map(([, y]) => y);
    expect(heights).toEqual([...heights].sort((a, b) => a - b));
  });

  it("o rei é a peça mais alta e o peão a mais baixa", () => {
    const top = (role: Role) => PIECE_PROFILES[role].at(-1)?.[1] ?? 0;
    expect(top("king")).toBeGreaterThan(top("queen"));
    expect(top("queen")).toBeGreaterThan(top("bishop"));
    expect(top("pawn")).toBeLessThan(top("rook"));
  });
});
