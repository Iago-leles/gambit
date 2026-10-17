import type { BoardPiece } from "./board-view";
import { squareToPosition } from "./board-3d";

/** Matemática da animação das peças e da câmera. Pura, sem three.js. */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * Posição da peça no instante `t` (0 a 1): sobe, desliza e desce.
 * Escreve em `out` para não criar objetos a cada quadro.
 */
export function arcPosition(
  t: number,
  from: { x: number; z: number },
  to: { x: number; z: number },
  lift: number,
  out: Vec3,
): Vec3 {
  const slide = easeInOutCubic(t);
  out.x = from.x + (to.x - from.x) * slide;
  out.z = from.z + (to.z - from.z) * slide;
  out.y = lift * Math.sin(Math.PI * t);
  return out;
}

/** Segundos de animação para um lance de `distance` casas. Zero com movimento reduzido. */
export function moveDuration(distance: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  return Math.min(0.9, 0.3 + 0.07 * distance);
}

export function prefersReducedMotion(): boolean {
  try {
    return (
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  } catch {
    return false;
  }
}

/** Interpola ângulos pelo lado mais curto. */
export function lerpAngle(a: number, b: number, t: number): number {
  const full = Math.PI * 2;
  const diff = ((((b - a) % full) + full + Math.PI) % full) - Math.PI;
  return a + diff * t;
}

export interface PieceMove {
  from: string;
  to: string;
}

/** Mais que isso numa troca de posição só pode ser reconexão ou posição nova: não anima. */
const MAX_ANIMATED_MOVES = 2;

const sameKind = (a: BoardPiece, b: BoardPiece) => a.color === b.color && a.role === b.role;

/**
 * Descobre quais peças andaram entre duas posições. Cobre captura, roque, en passant e promoção.
 * Devolve `[]` quando nada mudou ou quando a mudança é grande demais para ser um lance.
 */
export function detectMoves(
  prev: ReadonlyMap<string, BoardPiece>,
  next: ReadonlyMap<string, BoardPiece>,
): PieceMove[] {
  const gone: string[] = [];
  const arrived: string[] = [];
  for (const [square, piece] of prev) {
    const now = next.get(square);
    if (!now || !sameKind(now, piece)) gone.push(square);
  }
  for (const [square, piece] of next) {
    const before = prev.get(square);
    if (!before || !sameKind(before, piece)) arrived.push(square);
  }
  if (arrived.length === 0 || arrived.length > MAX_ANIMATED_MOVES) return [];

  const moves: PieceMove[] = [];
  const usedSources = new Set<string>();
  for (const to of arrived) {
    const piece = next.get(to);
    if (!piece) continue;
    const exact = gone.find((from) => {
      const p = prev.get(from);
      return p && !usedSources.has(from) && sameKind(p, piece);
    });
    // Promoção: o peão some e outra peça da mesma cor aparece.
    const source =
      exact ??
      gone.find((from) => {
        const p = prev.get(from);
        return p && !usedSources.has(from) && p.color === piece.color && p.role === "pawn";
      });
    if (!source) return [];
    usedSources.add(source);
    moves.push({ from: source, to });
  }
  return moves;
}

export function moveDistance(move: PieceMove): number {
  const a = squareToPosition(move.from);
  const b = squareToPosition(move.to);
  return Math.hypot(a.x - b.x, a.z - b.z);
}
