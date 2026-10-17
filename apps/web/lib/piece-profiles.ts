import type { Role } from "./board-view";

/**
 * Perfis das peças para o torno (`LatheGeometry`): pares [raio, altura].
 * A casa mede 1 x 1. Os perfis são simples de propósito: o estilo é low-poly.
 * O cavalo só usa o perfil para a base; a cabeça é desenhada à parte.
 */
export type Profile = readonly (readonly [number, number])[];

export const PIECE_PROFILES: Record<Role, Profile> = {
  pawn: [
    [0, 0],
    [0.3, 0],
    [0.3, 0.08],
    [0.16, 0.2],
    [0.12, 0.38],
    [0.2, 0.42],
    [0.2, 0.48],
    [0, 0.5],
  ],
  rook: [
    [0, 0],
    [0.34, 0],
    [0.34, 0.1],
    [0.24, 0.22],
    [0.22, 0.52],
    [0.32, 0.56],
    [0.32, 0.78],
    [0, 0.78],
  ],
  knight: [
    [0, 0],
    [0.33, 0],
    [0.33, 0.1],
    [0.24, 0.2],
    [0, 0.2],
  ],
  bishop: [
    [0, 0],
    [0.33, 0],
    [0.33, 0.1],
    [0.2, 0.22],
    [0.14, 0.5],
    [0.26, 0.58],
    [0.2, 0.8],
    [0, 0.92],
  ],
  queen: [
    [0, 0],
    [0.36, 0],
    [0.36, 0.1],
    [0.22, 0.24],
    [0.16, 0.6],
    [0.3, 0.7],
    [0.3, 0.9],
    [0.14, 0.94],
    [0, 0.98],
  ],
  king: [
    [0, 0],
    [0.36, 0],
    [0.36, 0.1],
    [0.22, 0.24],
    [0.16, 0.62],
    [0.3, 0.72],
    [0.26, 0.96],
    [0.1, 1.04],
    [0, 1.04],
  ],
};
