"use client";

import type { ViewMode } from "@/lib/view-mode";
import styles from "./GameLayout.module.css";

/** Botão que alterna entre o tabuleiro 2D e o 3D. */
export function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  const next: ViewMode = view === "3d" ? "2d" : "3d";
  return (
    <button
      type="button"
      className={styles.button}
      onClick={() => {
        onChange(next);
      }}
    >
      Ver em {next.toUpperCase()}
    </button>
  );
}
