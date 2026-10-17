"use client";

import { Board2D, type Board2DProps } from "./Board2D";
import { Board3DView } from "./Board3DView";
import type { ViewMode } from "@/lib/view-mode";

/** Escolhe o tabuleiro 2D ou 3D. Os dois recebem as mesmas props (ADR 009). */
export function BoardView({ view, ...props }: Board2DProps & { view: ViewMode }) {
  return view === "3d" ? <Board3DView {...props} /> : <Board2D {...props} />;
}
