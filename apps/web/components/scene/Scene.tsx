"use client";

import { ContactShadows } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { Color } from "@gambit/core";
import { CAMERA_AZIMUTH, cameraPosition } from "@/lib/board-3d";
import type { BoardPiece } from "@/lib/board-view";
import { Board3D } from "./Board3D";
import { CAMERA_START, CameraRig } from "./CameraRig";
import { Pieces } from "./Pieces";

/**
 * Cena 3D. Só lê o que recebe e avisa os cliques (ADR 009).
 * `frameloop="demand"`: desenha só quando algo muda.
 */
export interface SceneProps {
  pieces: ReadonlyMap<string, BoardPiece>;
  orientation: Color;
  onSquareClick: (square: string) => void;
}

export default function Scene({ pieces, orientation, onSquareClick }: SceneProps) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{
        fov: 45,
        near: 0.1,
        far: 80,
        position: cameraPosition(
          CAMERA_AZIMUTH[orientation],
          CAMERA_START.polar,
          CAMERA_START.distance,
        ),
      }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <hemisphereLight args={["#ffffff", "#7f8c99", 1.1]} />
      <directionalLight position={[5, 10, 6]} intensity={2.2} />
      <Board3D onSquareClick={onSquareClick} />
      <Pieces pieces={pieces} onSquareClick={onSquareClick} />
      <ContactShadows
        position={[0, 0.005, 0]}
        scale={9}
        blur={2}
        far={1.5}
        opacity={0.45}
        resolution={512}
      />
      <CameraRig orientation={orientation} />
    </Canvas>
  );
}
