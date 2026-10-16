import type { PlayedMove } from "@gambit/core";
import styles from "./GameLayout.module.css";

/** Lista de lances em pares: `1. e4 e5`. */
export function MoveList({
  moves,
  emptyText,
}: {
  moves: readonly PlayedMove[];
  emptyText: string;
}) {
  if (moves.length === 0) return <p className={styles.empty}>{emptyText}</p>;

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
