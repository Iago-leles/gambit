import { describe, expect, it } from "vitest";
import { resultCardView } from "./result-card";

describe("resultCardView", () => {
  it("mostra o vencedor e o motivo", () => {
    const view = resultCardView({ winner: "black", reason: "timeout" }, "online");
    expect(view.headline).toBe("Pretas vencem");
    expect(view.reason).toBe("Motivo: tempo");
  });

  it("empate não tem vencedor", () => {
    const view = resultCardView({ winner: null, reason: "stalemate" }, "online");
    expect(view.headline).toBe("Empate");
    expect(view.reason).toBe("Motivo: afogamento");
  });

  it("cobre os motivos de fim de partida", () => {
    const reasons = {
      checkmate: "xeque-mate",
      resign: "desistência",
      agreement: "acordo",
      repetition: "repetição tripla",
      insufficient: "material insuficiente",
      seventyFiveMoves: "regra dos 75 lances",
    } as const;
    for (const [reason, text] of Object.entries(reasons)) {
      const view = resultCardView(
        { winner: null, reason: reason as keyof typeof reasons },
        "online",
      );
      expect(view.reason).toBe(`Motivo: ${text}`);
    }
  });

  it("online oferece nova sala e voltar; local oferece nova partida e voltar", () => {
    const result = { winner: "white", reason: "checkmate" } as const;
    expect(resultCardView(result, "online").actions).toEqual(["newRoom", "home"]);
    expect(resultCardView(result, "local").actions).toEqual(["newGame", "home"]);
  });
});
