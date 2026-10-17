"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, MeshStandardMaterial, Object3D, type InstancedMesh } from "three";
import { squareToPosition } from "@/lib/board-3d";
import { isLightSquare, squaresFor } from "@/lib/board-view";

const SQUARE_HEIGHT = 0.2;
const dummy = new Object3D();

// Nomes de casa fixos: o mundo não gira, quem gira é a câmera.
const ALL_SQUARES = squaresFor("white");
const LIGHT = ALL_SQUARES.filter(isLightSquare);
const DARK = ALL_SQUARES.filter((square) => !isLightSquare(square));

interface Board3DProps {
  onSquareClick: (square: string) => void;
}

export function Board3D({ onSquareClick }: Board3DProps) {
  const geometry = useMemo(() => new BoxGeometry(1, SQUARE_HEIGHT, 1), []);
  const frameGeometry = useMemo(() => new BoxGeometry(8.6, 0.3, 8.6), []);
  const materials = useMemo(
    () => ({
      light: new MeshStandardMaterial({ color: "#d5dce2", roughness: 0.9 }),
      dark: new MeshStandardMaterial({ color: "#71808e", roughness: 0.9 }),
      frame: new MeshStandardMaterial({ color: "#3f4a55", roughness: 0.9 }),
    }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      frameGeometry.dispose();
      materials.light.dispose();
      materials.dark.dispose();
      materials.frame.dispose();
    },
    [geometry, frameGeometry, materials],
  );

  return (
    <group>
      <mesh geometry={frameGeometry} material={materials.frame} position={[0, -0.17, 0]} />
      <Squares
        squares={LIGHT}
        geometry={geometry}
        material={materials.light}
        onSquareClick={onSquareClick}
      />
      <Squares
        squares={DARK}
        geometry={geometry}
        material={materials.dark}
        onSquareClick={onSquareClick}
      />
    </group>
  );
}

interface SquaresProps {
  squares: string[];
  geometry: BoxGeometry;
  material: MeshStandardMaterial;
  onSquareClick: (square: string) => void;
}

/** Todas as casas de uma cor num só `InstancedMesh`. O raycast devolve o `instanceId`. */
function Squares({ squares, geometry, material, onSquareClick }: SquaresProps) {
  const mesh = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    squares.forEach((square, index) => {
      const { x, z } = squareToPosition(square);
      dummy.position.set(x, -SQUARE_HEIGHT / 2, z);
      dummy.updateMatrix();
      instanced.setMatrixAt(index, dummy.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
    instanced.computeBoundingSphere();
  }, [squares]);

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, squares.length]}
      onClick={(event) => {
        event.stopPropagation();
        if (event.delta > 4 || event.instanceId === undefined) return;
        const square = squares[event.instanceId];
        if (square) onSquareClick(square);
      }}
    />
  );
}
