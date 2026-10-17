"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  MeshStandardMaterial,
  Object3D,
  type BufferGeometry,
  type InstancedMesh,
  type Mesh,
} from "three";
import type { Color } from "@gambit/core";
import {
  arcPosition,
  detectMoves,
  moveDistance,
  moveDuration,
  prefersReducedMotion,
  type PieceMove,
  type Vec3,
} from "@/lib/animation";
import { groupPieces, squareToPosition } from "@/lib/board-3d";
import type { BoardPiece, Role } from "@/lib/board-view";
import { createPieceGeometry } from "./piece-geometry";

const ROLES: readonly Role[] = ["king", "queen", "rook", "bishop", "knight", "pawn"];

/** Folga por tipo: 8 peões, e o resto sobra mesmo com promoções. */
const CAPACITY = 16;

const COLORS: Record<Color, string> = { white: "#f2efe6", black: "#2d3339" };

// Reaproveitado para montar as matrizes. Nunca criado dentro de um quadro.
const dummy = new Object3D();

interface PiecesProps {
  pieces: ReadonlyMap<string, BoardPiece>;
  onSquareClick: (square: string) => void;
}

export function Pieces({ pieces, onSquareClick }: PiecesProps) {
  const geometries = useMemo(
    () =>
      Object.fromEntries(ROLES.map((role) => [role, createPieceGeometry(role)])) as Record<
        Role,
        BufferGeometry
      >,
    [],
  );
  const materials = useMemo(
    () => ({
      white: new MeshStandardMaterial({ color: COLORS.white, flatShading: true, roughness: 0.75 }),
      black: new MeshStandardMaterial({ color: COLORS.black, flatShading: true, roughness: 0.6 }),
    }),
    [],
  );

  useEffect(
    () => () => {
      for (const geometry of Object.values(geometries)) geometry.dispose();
      materials.white.dispose();
      materials.black.dispose();
    },
    [geometries, materials],
  );

  // Animação é só vista: a posição verdadeira vem sempre das props (ADR 009).
  // Estado derivado durante a renderização, o padrão do React para reagir a uma prop nova.
  const [tracked, setTracked] = useState(pieces);
  const [version, setVersion] = useState(0);
  const [movers, setMovers] = useState<ActiveMove[]>([]);
  if (tracked !== pieces) {
    const id = version + 1;
    const reduced = prefersReducedMotion();
    setTracked(pieces);
    setVersion(id);
    setMovers(
      detectMoves(tracked, pieces).flatMap((move) => {
        const piece = pieces.get(move.to);
        const duration = moveDuration(moveDistance(move), reduced) * 1000;
        return piece && duration > 0
          ? [{ ...move, ...piece, duration, key: `${id}:${move.to}` }]
          : [];
      }),
    );
  }

  const groups = useMemo(() => {
    // A peça que está andando sai do instanciamento até chegar.
    const hidden = new Set(movers.map((mover) => mover.to));
    return groupPieces(pieces).map((group) => ({
      ...group,
      squares: group.squares.filter((square) => !hidden.has(square)),
    }));
  }, [pieces, movers]);

  return (
    <>
      {groups.map(({ color, role, squares }) => (
        <PieceGroup
          key={`${color}-${role}`}
          geometry={geometries[role]}
          material={materials[color]}
          squares={squares}
          // As pretas olham para as brancas.
          rotationY={color === "black" ? Math.PI : 0}
          onSquareClick={onSquareClick}
        />
      ))}
      {movers.map((mover) => (
        <Mover
          key={mover.key}
          move={mover}
          geometry={geometries[mover.role]}
          material={materials[mover.color]}
          onDone={(key) => {
            setMovers((current) => current.filter((m) => m.key !== key));
          }}
        />
      ))}
    </>
  );
}

interface ActiveMove extends PieceMove, BoardPiece {
  key: string;
  duration: number;
}

/** Altura do arco, em casas. */
const LIFT = 0.8;

interface MoverProps {
  move: ActiveMove;
  geometry: BufferGeometry;
  material: MeshStandardMaterial;
  onDone: (key: string) => void;
}

/** A peça em movimento: sobe, desliza e desce. Não cria objetos a cada quadro. */
function Mover({ move, geometry, material, onDone }: MoverProps) {
  const mesh = useRef<Mesh>(null);
  const startedAt = useRef<number | null>(null);
  const out = useRef<Vec3>({ x: 0, y: 0, z: 0 });
  const from = useMemo(() => squareToPosition(move.from), [move.from]);
  const to = useMemo(() => squareToPosition(move.to), [move.to]);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    invalidate();
  }, [invalidate]);

  useFrame(() => {
    const current = mesh.current;
    if (!current) return;
    const now = performance.now();
    startedAt.current ??= now;
    const t = Math.min(1, (now - startedAt.current) / move.duration);
    arcPosition(t, from, to, LIFT, out.current);
    current.position.set(out.current.x, out.current.y, out.current.z);
    if (t >= 1) onDone(move.key);
    else invalidate();
  });

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      material={material}
      position={[from.x, 0, from.z]}
      rotation={[0, move.color === "black" ? Math.PI : 0, 0]}
    />
  );
}

interface PieceGroupProps {
  geometry: BufferGeometry;
  material: MeshStandardMaterial;
  squares: string[];
  rotationY: number;
  onSquareClick: (square: string) => void;
}

function PieceGroup({ geometry, material, squares, rotationY, onSquareClick }: PieceGroupProps) {
  const mesh = useRef<InstancedMesh>(null);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    squares.forEach((square, index) => {
      const { x, z } = squareToPosition(square);
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, rotationY, 0);
      dummy.updateMatrix();
      instanced.setMatrixAt(index, dummy.matrix);
    });
    instanced.count = squares.length;
    instanced.instanceMatrix.needsUpdate = true;
    instanced.computeBoundingSphere();
    invalidate();
  }, [squares, rotationY, invalidate]);

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, CAPACITY]}
      onClick={(event) => {
        event.stopPropagation();
        if (event.delta > 4 || event.instanceId === undefined) return;
        const square = squares[event.instanceId];
        if (square) onSquareClick(square);
      }}
    />
  );
}
