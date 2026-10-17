"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  CircleGeometry,
  Color,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  type InstancedMesh,
} from "three";
import { squareToPosition } from "@/lib/board-3d";
import type { Highlights as HighlightsData, TintKind } from "@/lib/highlights";

const TINT_COLORS: Record<TintKind, string> = {
  check: "#e0483c",
  selected: "#f0b429",
  capture: "#e0483c",
  last: "#f0c75e",
};

const TINT_OPACITY = 0.6;
const DOT_COLOR = "#1c2630";

// Reaproveitados para montar as matrizes e as cores. Nunca criados dentro de um quadro.
const dummy = new Object3D();
const color = new Color();

/** Cor nas casas e pontos nos destinos. Não recebe cliques: o raycast passa para a casa. */
export function Highlights({ tints, dots }: HighlightsData) {
  const tintMesh = useRef<InstancedMesh>(null);
  const dotMesh = useRef<InstancedMesh>(null);
  const invalidate = useThree((state) => state.invalidate);

  const resources = useMemo(
    () => ({
      square: new PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      dot: new CircleGeometry(0.16, 16).rotateX(-Math.PI / 2),
      tintMaterial: new MeshBasicMaterial({
        transparent: true,
        opacity: TINT_OPACITY,
        depthWrite: false,
        toneMapped: false,
      }),
      dotMaterial: new MeshBasicMaterial({
        color: DOT_COLOR,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        toneMapped: false,
      }),
    }),
    [],
  );

  useEffect(
    () => () => {
      resources.square.dispose();
      resources.dot.dispose();
      resources.tintMaterial.dispose();
      resources.dotMaterial.dispose();
    },
    [resources],
  );

  useLayoutEffect(() => {
    const mesh = tintMesh.current;
    if (!mesh) return;
    tints.forEach(({ square, kind }, index) => {
      const { x, z } = squareToPosition(square);
      dummy.position.set(x, 0.01, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, color.set(TINT_COLORS[kind]));
    });
    mesh.count = tints.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [tints, invalidate]);

  useLayoutEffect(() => {
    const mesh = dotMesh.current;
    if (!mesh) return;
    dots.forEach((square, index) => {
      const { x, z } = squareToPosition(square);
      dummy.position.set(x, 0.02, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.count = dots.length;
    mesh.instanceMatrix.needsUpdate = true;
    invalidate();
  }, [dots, invalidate]);

  return (
    <>
      <instancedMesh
        ref={tintMesh}
        args={[resources.square, resources.tintMaterial, 64]}
        frustumCulled={false}
        raycast={() => null}
      />
      <instancedMesh
        ref={dotMesh}
        args={[resources.dot, resources.dotMaterial, 32]}
        frustumCulled={false}
        raycast={() => null}
      />
    </>
  );
}
