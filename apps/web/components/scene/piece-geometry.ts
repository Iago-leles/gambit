import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  Vector2,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PIECE_PROFILES } from "@/lib/piece-profiles";
import type { Role } from "@/lib/board-view";

/**
 * Geometria low-poly das peças, gerada por código (sem arquivo de modelo).
 * O chamador é dono do resultado e deve chamar `dispose()` quando não usar mais.
 */

const SEGMENTS = 8;

/** Silhueta da cabeça do cavalo, olhando para +x. */
const KNIGHT_HEAD: readonly (readonly [number, number])[] = [
  [-0.22, 0.18],
  [0.22, 0.18],
  [0.18, 0.4],
  [0.34, 0.56],
  [0.36, 0.68],
  [0.12, 0.84],
  [0.04, 0.96],
  [-0.08, 0.84],
  [-0.22, 0.6],
  [-0.24, 0.4],
];

function lathe(role: Role): BufferGeometry {
  const points = PIECE_PROFILES[role].map(([radius, y]) => new Vector2(radius, y));
  return new LatheGeometry(points, SEGMENTS);
}

function knightHead(): BufferGeometry {
  const shape = new Shape(KNIGHT_HEAD.map(([x, y]) => new Vector2(x, y)));
  const head = new ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false });
  head.translate(0, 0, -0.15);
  // Vira para -z, de frente para o lado das pretas.
  head.rotateY(Math.PI / 2);
  return head;
}

function kingCross(top: number): BufferGeometry {
  const upright = new BoxGeometry(0.1, 0.3, 0.1);
  upright.translate(0, top + 0.15, 0);
  const arm = new BoxGeometry(0.26, 0.09, 0.09);
  arm.translate(0, top + 0.18, 0);
  const merged = mergeGeometries([upright.toNonIndexed(), arm.toNonIndexed()]);
  upright.dispose();
  arm.dispose();
  return merged;
}

function rookCrown(): BufferGeometry {
  const crown = new CylinderGeometry(0.2, 0.2, 0.08, 4);
  crown.rotateY(Math.PI / 4);
  crown.translate(0, 0.82, 0);
  return crown;
}

export function createPieceGeometry(role: Role): BufferGeometry {
  const parts: BufferGeometry[] = [lathe(role)];
  if (role === "knight") parts.push(knightHead());
  if (role === "rook") parts.push(rookCrown());
  if (role === "king") parts.push(kingCross(PIECE_PROFILES.king.at(-1)?.[1] ?? 1));
  // O merge exige todas as partes com o mesmo formato. O torno e a extrusão já vêm sem índice.
  const flat = parts.map((part) => (part.index ? part.toNonIndexed() : part));
  const merged = mergeGeometries(flat);
  for (const part of [...parts, ...flat]) part.dispose();
  return merged;
}
