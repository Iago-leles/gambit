"use client";

import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef, type ComponentRef } from "react";
import type { Color } from "@gambit/core";
import { CAMERA_AZIMUTH, cameraPosition } from "@/lib/board-3d";

export const CAMERA_START = { polar: 0.9, distance: 14.5 };

/** Órbita com limites. Quando o lado muda, a câmera passa para trás da outra cor. */
export function CameraRig({ orientation }: { orientation: Color }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    const [x, y, z] = cameraPosition(
      CAMERA_AZIMUTH[orientation],
      orbit.getPolarAngle(),
      orbit.getDistance(),
    );
    camera.position.set(x, y, z);
    orbit.update();
    invalidate();
  }, [orientation, camera, invalidate]);

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      minDistance={9}
      maxDistance={24}
      minPolarAngle={0.25}
      maxPolarAngle={1.4}
      enableDamping={false}
    />
  );
}
