import type { BoardPiece } from "./board-view";

/**
 * O que a cena 3D destaca. Uma cor por casa (`tints`) e pontos nos destinos vazios (`dots`).
 * Quando várias coisas caem na mesma casa, vale: xeque, seleção, captura, último lance.
 */
export type TintKind = "check" | "selected" | "capture" | "last";

export interface Tint {
  square: string;
  kind: TintKind;
}

export interface Highlights {
  tints: Tint[];
  dots: string[];
}

interface Input {
  selected: string | null;
  dests: readonly string[];
  lastMove: { from?: string; to: string } | undefined;
  checkSquare: string | undefined;
  pieces: ReadonlyMap<string, BoardPiece>;
}

export function buildHighlights({
  selected,
  dests,
  lastMove,
  checkSquare,
  pieces,
}: Input): Highlights {
  const tints = new Map<string, TintKind>();
  // Do menos para o mais importante: o último que escreve ganha.
  if (lastMove?.from) tints.set(lastMove.from, "last");
  if (lastMove) tints.set(lastMove.to, "last");
  const dots: string[] = [];
  for (const square of dests) {
    if (pieces.has(square)) tints.set(square, "capture");
    else dots.push(square);
  }
  if (selected) tints.set(selected, "selected");
  if (checkSquare) tints.set(checkSquare, "check");
  return { tints: [...tints].map(([square, kind]) => ({ square, kind })), dots };
}
