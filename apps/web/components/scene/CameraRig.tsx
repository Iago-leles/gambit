"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef, type ComponentRef } from "react";
import type { Color } from "@gambit/core";
import { easeInOutCubic, lerpAngle, prefersReducedMotion } from "@/lib/animation";
import { CAMERA_AZIMUTH, cameraPositionInto } from "@/lib/board-3d";

export const CAMERA_START = { polar: 0.9, distance: 14.5 };

const TURN_SECONDS = 0.8;

interface Turn {
  from: number;
  to: number;
  startedAt: number | null;
}

/** Órbita com limites. Quando o lado muda, a câmera gira até trás da outra cor. */
export function CameraRig({ orientation }: { orientation: Color }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const turn = useRef<Turn | null>(null);
  const lastOrientation = useRef(orientation);
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    const orbit = controls.current;
    if (!orbit || lastOrientation.current === orientation) return;
    lastOrientation.current = orientation;
    if (prefersReducedMotion()) {
      cameraPositionInto(
        camera.position,
        CAMERA_AZIMUTH[orientation],
        orbit.getPolarAngle(),
        orbit.getDistance(),
      );
      orbit.update();
    } else {
      turn.current = {
        from: orbit.getAzimuthalAngle(),
        to: CAMERA_AZIMUTH[orientation],
        startedAt: null,
      };
    }
    invalidate();
  }, [orientation, camera, invalidate]);

  useFrame(() => {
    const orbit = controls.current;
    const current = turn.current;
    if (!orbit || !current) return;
    const now = performance.now();
    current.startedAt ??= now;
    const t = Math.min(1, (now - current.startedAt) / (TURN_SECONDS * 1000));
    cameraPositionInto(
      camera.position,
      lerpAngle(current.from, current.to, easeInOutCubic(t)),
      orbit.getPolarAngle(),
      orbit.getDistance(),
    );
    orbit.update();
    if (t >= 1) turn.current = null;
    else invalidate();
  });

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
