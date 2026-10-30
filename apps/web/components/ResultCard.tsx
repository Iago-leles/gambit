import type { GameResult } from "@gambit/core";
import Link from "next/link";
import type { ReactNode } from "react";
import { resultCardView } from "@/lib/result-card";
import styles from "./ResultCard.module.css";

interface ResultCardProps {
  result: GameResult;
  mode: "online" | "local";
  /** Só no modo local: recomeça a partida. */
  onNewGame?: () => void;
  /** Botões extras, como a revanche. */
  children?: ReactNode;
}

/**
 * Cartão de fim de partida. Fica no painel, ao lado do tabuleiro, sem cobrir a posição final.
 * Não é um diálogo e não prende o foco. O anúncio para leitor de tela é do `role="status"` da página.
 */
export function ResultCard({ result, mode, onNewGame, children }: ResultCardProps) {
  const view = resultCardView(result, mode);

  return (
    <section className={styles.card} aria-labelledby="result-card-title" data-testid="result-card">
      <h2 id="result-card-title" className={styles.headline}>
        {view.headline}
      </h2>
      <p className={styles.reason}>{view.reason}</p>
      <div className={styles.actions}>
        {view.actions.map((action) => {
          switch (action) {
            case "newGame":
              return (
                <button
                  key={action}
                  type="button"
                  className={`${styles.button} ${styles.primary}`}
                  onClick={onNewGame}
                >
                  Nova partida
                </button>
              );
            case "newRoom":
              return (
                <Link
                  key={action}
                  href="/#criar-sala"
                  className={`${styles.button} ${styles.primary}`}
                >
                  Nova sala
                </Link>
              );
            case "home":
              return (
                <Link key={action} href="/" className={styles.button}>
                  Voltar ao início
                </Link>
              );
          }
        })}
        {children}
      </div>
    </section>
  );
}
