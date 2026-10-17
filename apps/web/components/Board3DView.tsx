"use client";

import dynamic from "next/dynamic";
import { PromotionPicker, type Board2DProps } from "./Board2D";
import { pieceLabel } from "./piece-label";
import { squaresFor } from "@/lib/board-view";
import { buildHighlights } from "@/lib/highlights";
import { useMemo } from "react";
import styles from "./Board3DView.module.css";

// A cena pesa (three.js). Só carrega quando alguém escolhe o 3D, e nunca no servidor.
const Scene = dynamic(() => import("./scene/Scene"), {
  ssr: false,
  loading: () => <div className={styles.loading}>Carregando o 3D…</div>,
});

/**
 * Tabuleiro 3D com as mesmas props do 2D. A cena desenha; a grade de botões
 * escondida dá acesso por teclado e leitor de tela com os mesmos nomes de casa.
 */
export function Board3DView({
  pieces,
  orientation,
  selected,
  dests,
  lastMove,
  checkSquare,
  onSquareClick,
  promotion,
}: Board2DProps) {
  const highlights = useMemo(
    () => buildHighlights({ selected, dests, lastMove, checkSquare, pieces }),
    [selected, dests, lastMove, checkSquare, pieces],
  );
  return (
    <div className={styles.frame} data-testid="board-3d">
      <div className={styles.canvas}>
        <Scene
          pieces={pieces}
          orientation={orientation}
          highlights={highlights}
          selected={selected}
          dests={dests}
          onSquareClick={onSquareClick}
        />
      </div>
      <div className={styles.a11yGrid} role="grid" aria-label="Tabuleiro">
        {squaresFor(orientation).map((square) => {
          const piece = pieces.get(square);
          return (
            <button
              key={square}
              type="button"
              onClick={() => {
                onSquareClick(square);
              }}
              aria-label={piece ? `${square}, ${pieceLabel(piece)}` : square}
            >
              {square}
            </button>
          );
        })}
      </div>
      {promotion && <PromotionPicker {...promotion} />}
    </div>
  );
}
