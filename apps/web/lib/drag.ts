/** Matemática do arrastar peças na cena 3D. Pura, sem three.js. */

/** Quantos pixels o ponteiro anda antes de o toque virar arrasto. Abaixo disso é clique. */
export const DRAG_THRESHOLD_PX = 6;

interface Vec {
  x: number;
  y: number;
  z: number;
}

/** Onde um raio corta o plano horizontal na altura `planeY`. `undefined` se não corta. */
export function projectToPlane(
  origin: Vec,
  direction: Vec,
  planeY: number,
): { x: number; z: number } | undefined {
  if (direction.y >= -1e-6) return undefined;
  const t = (planeY - origin.y) / direction.y;
  if (t < 0) return undefined;
  return { x: origin.x + direction.x * t, z: origin.z + direction.z * t };
}

export function canStartDrag(movedPx: number, square: string, dests: readonly string[]): boolean {
  return movedPx > DRAG_THRESHOLD_PX && !dests.includes(square);
}

/** A casa onde soltou, se for um destino legal da peça selecionada. */
export function dropTarget(
  square: string | undefined,
  dests: readonly string[],
): string | undefined {
  return square && dests.includes(square) ? square : undefined;
}
