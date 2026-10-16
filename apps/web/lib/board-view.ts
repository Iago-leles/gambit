import type { Color } from "@gambit/core";

/**
 * Transforma FEN e UCI no que o tabuleiro desenha.
 * Serve ao 2D e, mais tarde, ao 3D (ADR 009).
 */

export type Role = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";

export interface BoardPiece {
  color: Color;
  role: Role;
}

const FILES = "abcdefgh";

const ROLE_BY_CHAR: Record<string, Role> = {
  k: "king",
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
  p: "pawn",
};

/** Lê só a parte do tabuleiro do FEN. Chave = nome da casa (`"e4"`). */
export function piecesFromFen(fen: string): Map<string, BoardPiece> {
  const pieces = new Map<string, BoardPiece>();
  const rows = (fen.split(" ")[0] ?? "").split("/");
  rows.forEach((row, index) => {
    const rank = 8 - index;
    let file = 0;
    for (const char of row) {
      const empty = Number(char);
      if (empty) {
        file += empty;
        continue;
      }
      const role = ROLE_BY_CHAR[char.toLowerCase()];
      if (role) {
        const color = char === char.toUpperCase() ? "white" : "black";
        pieces.set(`${FILES.charAt(file)}${rank}`, { color, role });
      }
      file++;
    }
  });
  return pieces;
}

/** As 64 casas na ordem de leitura da tela (esquerda→direita, cima→baixo). */
export function squaresFor(orientation: Color): string[] {
  const squares: string[] = [];
  for (let rank = 8; rank >= 1; rank--) {
    for (const file of FILES) squares.push(`${file}${rank}`);
  }
  return orientation === "white" ? squares : squares.reverse();
}

export function isLightSquare(square: string): boolean {
  const file = FILES.indexOf(square.charAt(0));
  const rank = Number(square.charAt(1));
  return (file + rank) % 2 === 0;
}

/** Destinos legais a partir de `from`, sem repetir as 4 opções de promoção. */
export function destsFrom(legalMoves: readonly string[], from: string): string[] {
  const dests = new Set<string>();
  for (const uci of legalMoves) {
    if (uci.startsWith(from)) dests.add(uci.slice(2, 4));
  }
  return [...dests];
}

export function isPromotion(legalMoves: readonly string[], from: string, to: string): boolean {
  return legalMoves.some((uci) => uci.length === 5 && uci.startsWith(from + to));
}

/** Casas de um lance UCI, para destacar o último lance. Drop (`P@e4`) só tem destino. */
export function moveSquares(uci: string | undefined): { from?: string; to: string } | undefined {
  if (!uci) return undefined;
  if (uci.includes("@")) return { to: uci.slice(2, 4) };
  return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
}

/** Casa do rei de quem está na vez, se ele está em xeque. */
export function checkSquare(fen: string, isCheck: boolean): string | undefined {
  if (!isCheck) return undefined;
  const turn: Color = fen.split(" ")[1] === "b" ? "black" : "white";
  for (const [square, piece] of piecesFromFen(fen)) {
    if (piece.role === "king" && piece.color === turn) return square;
  }
  return undefined;
}
