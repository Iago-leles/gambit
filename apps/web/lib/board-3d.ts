import type { Color } from "@gambit/core";
import type { BoardPiece, Role } from "./board-view";

/**
 * Geometria do tabuleiro no mundo 3D. Cada casa mede 1 x 1, centrado na origem.
 * O mundo não gira: quem gira é a câmera. As brancas ficam no lado +z.
 */

const FILES = "abcdefgh";

export function squareToPosition(square: string): { x: number; z: number } {
  const file = FILES.indexOf(square.charAt(0));
  const rank = Number(square.charAt(1));
  return { x: file - 3.5, z: 3.5 - (rank - 1) };
}

export function squareFromPosition(x: number, z: number): string | undefined {
  const file = Math.round(x + 3.5);
  const rank = Math.round(4.5 - z);
  if (file < 0 || file > 7 || rank < 1 || rank > 8) return undefined;
  if (Math.abs(x - (file - 3.5)) > 0.5 || Math.abs(z - (3.5 - (rank - 1))) > 0.5) return undefined;
  return `${FILES.charAt(file)}${rank}`;
}

/** Ângulo da câmera em volta do eixo y. 0 = atrás das brancas (+z). */
export const CAMERA_AZIMUTH: Record<Color, number> = { white: 0, black: Math.PI };

/** Posição da câmera em coordenadas esféricas em volta do centro do tabuleiro. */
export function cameraPosition(
  azimuth: number,
  polar: number,
  distance: number,
): [number, number, number] {
  return [
    distance * Math.sin(polar) * Math.sin(azimuth),
    distance * Math.cos(polar),
    distance * Math.sin(polar) * Math.cos(azimuth),
  ];
}

export interface PieceGroup {
  color: Color;
  role: Role;
  squares: string[];
}

/** Agrupa as pe�as por cor e tipo. Cada grupo vira um `InstancedMesh`. */
export function groupPieces(pieces: ReadonlyMap<string, BoardPiece>): PieceGroup[] {
  const groups = new Map<string, PieceGroup>();
  for (const [square, { color, role }] of pieces) {
    const key = `${color}-${role}`;
    const group = groups.get(key);
    if (group) group.squares.push(square);
    else groups.set(key, { color, role, squares: [square] });
  }
  return [...groups.values()];
}
