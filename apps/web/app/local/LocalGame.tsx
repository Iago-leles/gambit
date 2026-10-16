"use client";

import { describeResult, type PlayedMove } from "@gambit/core";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "zustand";
import { Board2D } from "@/components/Board2D";
import { createLocalGameStore } from "@/lib/local-game-store";
import styles from "./LocalGame.module.css";

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

        <MoveList moves={game.moves} />

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

function MoveList({ moves }: { moves: readonly PlayedMove[] }) {
  if (moves.length === 0) {
    return <p className={styles.empty}>As brancas começam. Clique numa peça para ver os lances.</p>;
  }

  const rows: { number: number; white: string; black?: string }[] = [];
  moves.forEach((move, ply) => {
    if (ply % 2 === 0) rows.push({ number: ply / 2 + 1, white: move.san });
    else {
      const row = rows.at(-1);
      if (row) row.black = move.san;
    }
  });

  return (
    <ol className={styles.moves} aria-label="Lances">
      {rows.map((row) => (
        <li key={row.number} className={styles.moveRow}>
          <span className={styles.moveNumber}>{row.number}.</span>
          <span>{row.white}</span>
          <span>{row.black}</span>
        </li>
      ))}
    </ol>
  );
}
