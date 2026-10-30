import { describeReason, type GameResult } from "@gambit/core";

export type ResultCardAction = "newGame" | "newRoom" | "home";

export interface ResultCardView {
  headline: string;
  reason: string;
  /** Ordem dos botões. A revanche (#29) entra aqui depois. */
  actions: ResultCardAction[];
}

/** O que o cartão de fim de partida mostra. `local`: dois lados no mesmo aparelho. */
export function resultCardView(result: GameResult, mode: "online" | "local"): ResultCardView {
  const headline =
    result.winner === null
      ? "Empate"
      : `${result.winner === "white" ? "Brancas" : "Pretas"} vencem`;
  return {
    headline,
    reason: `Motivo: ${describeReason(result.reason)}`,
    actions: mode === "local" ? ["newGame", "home"] : ["newRoom", "home"],
  };
}
