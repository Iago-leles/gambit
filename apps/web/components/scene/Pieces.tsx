"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { MeshStandardMaterial, Object3D, type BufferGeometry, type InstancedMesh } from "three";
import type { Color } from "@gambit/core";
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

  const groups = useMemo(() => groupPieces(pieces), [pieces]);

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
    </>
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
