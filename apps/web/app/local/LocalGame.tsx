"use client";

import { describeResult } from "@gambit/core";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "zustand";
import { Board2D } from "@/components/Board2D";
import { createLocalGameStore } from "@/lib/local-game-store";
import styles from "@/components/GameLayout.module.css";
import { MoveList } from "@/components/MoveList";

export function LocalGame() {
  const [store] = useState(() => createLocalGameStore());
  const state = useStore(store);
  const { game } = state;
  const isOver = game.result !== undefined;

  return (
    <main className={styles.layout}>
      <div className={styles.boardArea}>
        <Board2D
          pieces={state.pieces}
          orientation={state.orientation}
          selected={state.selected}
          dests={state.dests}
          lastMove={state.lastMove}
          checkSquare={state.checkSquare}
          onSquareClick={state.selectSquare}
          {...(state.pendingPromotion && {
            promotion: {
              color: game.turn,
              onChoose: state.choosePromotion,
              onCancel: state.cancelPromotion,
            },
          })}
        />
      </div>

      <aside className={styles.panel}>
        <Link href="/" className={styles.back}>
          Gambit
        </Link>

        <p className={styles.status} role="status" aria-live="polite">
          {game.result
            ? describeResult(game.result)
            : `${game.turn === "white" ? "Brancas" : "Pretas"} jogam${game.isCheck ? ". Xeque." : ""}`}
        </p>

        <MoveList
          moves={game.moves}
          emptyText="As brancas começam. Clique numa peça para ver os lances."
        />

        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={state.flip}>
            Virar tabuleiro
          </button>
          {isOver ? (
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              onClick={() => {
                state.newGame();
              }}
            >
              Nova partida
            </button>
          ) : (
            <button type="button" className={styles.button} onClick={state.resign}>
              Desistir
            </button>
          )}
        </div>
      </aside>
    </main>
  );
}
