/** Resultados e motivos de fim de partida. */

export type Color = "white" | "black";

export type GameStatus = "waiting" | "playing" | "ended";

export type EndReason =
  | "checkmate"
  | "stalemate"
  | "insufficient"
  | "repetition"
  | "seventyFiveMoves"
  | "timeout"
  | "resign"
  | "agreement"
  | "variantWin";

/** `winner: null` é empate. */
export interface GameResult {
  winner: Color | null;
  reason: EndReason;
}

export function opposite(color: Color): Color {
  return color === "white" ? "black" : "white";
}

export function resultToPgn(result: GameResult | undefined): "1-0" | "0-1" | "1/2-1/2" | "*" {
  if (!result) return "*";
  if (result.winner === "white") return "1-0";
  if (result.winner === "black") return "0-1";
  return "1/2-1/2";
}

const REASON_TEXT: Record<EndReason, string> = {
  checkmate: "xeque-mate",
  stalemate: "afogamento",
  insufficient: "material insuficiente",
  repetition: "repetição tripla",
  seventyFiveMoves: "regra dos 75 lances",
  timeout: "tempo",
  resign: "desistência",
  agreement: "acordo",
  variantWin: "regra da variante",
};

export function describeResult(result: GameResult): string {
  const reason = REASON_TEXT[result.reason];
  if (result.winner === null) return `Empate por ${reason}`;
  const side = result.winner === "white" ? "Brancas" : "Pretas";
  return `${side} vencem por ${reason}`;
}
