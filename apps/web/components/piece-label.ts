import type { BoardPiece, Role } from "@/lib/board-view";

export const ROLE_NAME: Record<Role, string> = {
  king: "rei",
  queen: "dama",
  rook: "torre",
  bishop: "bispo",
  knight: "cavalo",
  pawn: "peão",
};

/** Nome falado da peça, para leitor de tela: "peão branco". */
export function pieceLabel(piece: BoardPiece): string {
  const color = piece.color === "white" ? "branco" : "preto";
  return `${ROLE_NAME[piece.role]} ${color}`;
}
