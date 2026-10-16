"use client";

import type { Color } from "@gambit/core";
import { useEffect, useRef } from "react";
import { isLightSquare, squaresFor, type BoardPiece, type Role } from "@/lib/board-view";
import styles from "./Board2D.module.css";

/**
 * Tabuleiro 2D. Só desenha o que recebe e avisa os cliques (ADR 009).
 * Serve à partida local agora e à online depois.
 */

// Glifos cheios para os dois lados; a cor vem do CSS. U+FE0E evita a versão emoji.
const GLYPH: Record<Role, string> = {
  king: "♚︎",
  queen: "♛︎",
  rook: "♜︎",
  bishop: "♝︎",
  knight: "♞︎",
  pawn: "♟︎",
};

const ROLE_NAME: Record<Role, string> = {
  king: "rei",
  queen: "dama",
  rook: "torre",
  bishop: "bispo",
  knight: "cavalo",
  pawn: "peão",
};

const PROMOTION_ROLES = [
  { choice: "q", role: "queen" },
  { choice: "r", role: "rook" },
  { choice: "b", role: "bishop" },
  { choice: "n", role: "knight" },
] as const;

export type PromotionChoice = (typeof PROMOTION_ROLES)[number]["choice"];

export interface Board2DProps {
  pieces: Map<string, BoardPiece>;
  orientation: Color;
  selected: string | null;
  dests: readonly string[];
  lastMove: { from?: string; to: string } | undefined;
  checkSquare: string | undefined;
  onSquareClick: (square: string) => void;
  promotion?: {
    color: Color;
    onChoose: (choice: PromotionChoice) => void;
    onCancel: () => void;
  };
}

function pieceLabel(piece: BoardPiece): string {
  const color = piece.color === "white" ? "branco" : "preto";
  return `${ROLE_NAME[piece.role]} ${color}`;
}

export function Board2D({
  pieces,
  orientation,
  selected,
  dests,
  lastMove,
  checkSquare,
  onSquareClick,
  promotion,
}: Board2DProps) {
  const squares = squaresFor(orientation);
  const bottomRank = orientation === "white" ? "1" : "8";
  const leftFile = orientation === "white" ? "a" : "h";

  return (
    <div className={styles.frame}>
      <div className={styles.board} role="grid" aria-label="Tabuleiro">
        {squares.map((square) => {
          const piece = pieces.get(square);
          const isDest = dests.includes(square);
          const classes = [
            styles.square,
            isLightSquare(square) ? styles.light : styles.dark,
            square === selected && styles.selected,
            (square === lastMove?.from || square === lastMove?.to) && styles.lastMove,
            square === checkSquare && styles.check,
            isDest && (piece ? styles.capture : styles.dest),
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={square}
              type="button"
              className={classes}
              onClick={() => {
                onSquareClick(square);
              }}
              aria-label={piece ? `${square}, ${pieceLabel(piece)}` : square}
              aria-pressed={square === selected}
            >
              {piece && (
                <span className={`${styles.piece} ${styles[piece.color]}`} aria-hidden>
                  {GLYPH[piece.role]}
                </span>
              )}
              {square.endsWith(bottomRank) && (
                <span className={styles.fileLabel} aria-hidden>
                  {square.charAt(0)}
                </span>
              )}
              {square.startsWith(leftFile) && (
                <span className={styles.rankLabel} aria-hidden>
                  {square.charAt(1)}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {promotion && <PromotionPicker {...promotion} />}
    </div>
  );
}

function PromotionPicker({ color, onChoose, onCancel }: NonNullable<Board2DProps["promotion"]>) {
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  return (
    <div className={styles.promotionBackdrop} onClick={onCancel}>
      <div
        className={styles.promotion}
        role="dialog"
        aria-label="Promover peão"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <p className={styles.promotionTitle}>Promover para</p>
        <div className={styles.promotionChoices}>
          {PROMOTION_ROLES.map(({ choice, role }, index) => (
            <button
              key={choice}
              ref={index === 0 ? first : undefined}
              type="button"
              className={styles.promotionChoice}
              onClick={() => {
                onChoose(choice);
              }}
              aria-label={ROLE_NAME[role]}
            >
              <span className={`${styles.piece} ${styles[color]}`} aria-hidden>
                {GLYPH[role]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
