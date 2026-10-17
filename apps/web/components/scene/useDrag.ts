"use client";

import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Mesh } from "three";
import type { Color } from "@gambit/core";
import { squareFromPosition } from "@/lib/board-3d";
import { canStartDrag, dropTarget, projectToPlane } from "@/lib/drag";
import type { BoardPiece } from "@/lib/board-view";

/** Altura em que a peça arrastada flutua, em casas. */
export const DRAG_LIFT = 0.7;

export interface DragState {
  square: string;
  color: Color;
  role: BoardPiece["role"];
}

interface UseDragArgs {
  selected: string | null;
  dests: readonly string[];
  onSquareClick: (square: string) => void;
}

type PointerEvent3D = ThreeEvent<PointerEvent>;

interface Capturable {
  setPointerCapture: (id: number) => void;
  releasePointerCapture: (id: number) => void;
}

/**
 * Arrastar uma peça: o cursor é projetado num plano na altura do tabuleiro.
 * Reaproveita o clique-clique: ao começar, seleciona a peça; ao soltar num destino legal, joga.
 * O hook não guarda estado de jogo, só a peça que está no ar.
 */
export type DragHandlers = ReturnType<typeof useDrag>["handlers"];

export function useDrag({ selected, dests, onSquareClick }: UseDragArgs) {
  const [dragging, setDragging] = useState<DragState | null>(null);
  const ghost = useRef<Mesh>(null);
  const pending = useRef<DragState | null>(null);
  const active = useRef(false);
  const origin = useRef({ x: 0, y: 0 });
  const latest = useRef({ selected, dests, onSquareClick });
  const getState = useThree((state) => state.get);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    latest.current = { selected, dests, onSquareClick };
  });

  const setOrbit = (enabled: boolean) => {
    const orbit = getState().controls as { enabled: boolean } | null;
    if (orbit) orbit.enabled = enabled;
  };

  const finish = (event: PointerEvent3D) => {
    (event.target as unknown as Capturable).releasePointerCapture(event.pointerId);
    pending.current = null;
    active.current = false;
    setDragging(null);
    setOrbit(true);
    invalidate();
  };

  const handlers = {
    onPointerDown: (square: string, piece: BoardPiece, event: PointerEvent3D) => {
      event.stopPropagation();
      pending.current = { square, ...piece };
      origin.current = { x: event.clientX, y: event.clientY };
      (event.target as unknown as Capturable).setPointerCapture(event.pointerId);
      setOrbit(false);
    },

    onPointerMove: (event: PointerEvent3D) => {
      const start = pending.current;
      if (!start) return;
      if (!active.current) {
        if (
          !canStartDrag(
            Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y),
            start.square,
            latest.current.dests,
          )
        )
          return;
        active.current = true;
        if (latest.current.selected !== start.square) latest.current.onSquareClick(start.square);
        setDragging(start);
        return;
      }
      const hit = projectToPlane(event.ray.origin, event.ray.direction, DRAG_LIFT);
      if (hit && ghost.current) {
        ghost.current.position.set(hit.x, DRAG_LIFT, hit.z);
        invalidate();
      }
    },

    onPointerUp: (event: PointerEvent3D) => {
      if (!pending.current) return;
      if (active.current) {
        const hit = projectToPlane(event.ray.origin, event.ray.direction, 0);
        const target = dropTarget(hit && squareFromPosition(hit.x, hit.z), latest.current.dests);
        if (target) latest.current.onSquareClick(target);
      }
      finish(event);
    },

    onPointerCancel: (event: PointerEvent3D) => {
      if (pending.current) finish(event);
    },
  };

  return { dragging, ghost, handlers };
}
