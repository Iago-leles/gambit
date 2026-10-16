import { describe, expect, it } from "vitest";
import { createLocalGameStore } from "./local-game-store";

const PROMO_FEN = "8/P6k/8/8/8/8/8/K7 w - - 0 1";

function setup(fen?: string) {
  const store = createLocalGameStore(fen);
  const click = (...squares: string[]) => {
    for (const sq of squares) store.getState().selectSquare(sq);
  };
  return { store, click, state: () => store.getState() };
}

describe("seleção", () => {
  it("clicar numa peça da vez seleciona e mostra os destinos", () => {
    const { click, state } = setup();
    click("e2");
    expect(state().selected).toBe("e2");
    expect(state().dests).toEqual(["e3", "e4"]);
  });

  it("clicar numa peça do oponente não seleciona", () => {
    const { click, state } = setup();
    click("e7");
    expect(state().selected).toBeNull();
    expect(state().dests).toEqual([]);
  });

  it("clicar de novo na mesma peça desfaz a seleção", () => {
    const { click, state } = setup();
    click("e2", "e2");
    expect(state().selected).toBeNull();
  });

  it("clicar em outra peça própria troca a seleção", () => {
    const { click, state } = setup();
    click("e2", "g1");
    expect(state().selected).toBe("g1");
    expect(state().dests.sort()).toEqual(["f3", "h3"]);
  });

  it("clicar numa casa vazia que não é destino limpa a seleção", () => {
    const { click, state } = setup();
    click("e2", "e5");
    expect(state().selected).toBeNull();
  });
});

describe("lances", () => {
  it("clicar num destino joga o lance e limpa a seleção", () => {
    const { click, state } = setup();
    click("e2", "e4");
    expect(state().game.moves).toEqual([{ uci: "e2e4", san: "e4" }]);
    expect(state().game.turn).toBe("black");
    expect(state().selected).toBeNull();
    expect(state().lastMove).toEqual({ from: "e2", to: "e4" });
  });

  it("cada lance gera um objeto Game novo (para o React re-renderizar)", () => {
    const { click, state } = setup();
    const before = state().game;
    click("e2", "e4");
    expect(state().game).not.toBe(before);
    expect(before.ply).toBe(0);
  });

  it("joga até o mate e para de aceitar seleção", () => {
    const { click, state } = setup();
    click("f2", "f3", "e7", "e5", "g2", "g4", "d8", "h4");
    expect(state().game.result).toEqual({ winner: "black", reason: "checkmate" });
    expect(state().checkSquare).toBe("e1");
    click("a2");
    expect(state().selected).toBeNull();
  });
});

describe("promoção", () => {
  it("clicar no destino de promoção abre a escolha sem jogar", () => {
    const { click, state } = setup(PROMO_FEN);
    click("a7", "a8");
    expect(state().pendingPromotion).toEqual({ from: "a7", to: "a8" });
    expect(state().game.ply).toBe(0);
  });

  it("escolher a peça joga a promoção", () => {
    const { click, state } = setup(PROMO_FEN);
    click("a7", "a8");
    state().choosePromotion("n");
    expect(state().game.moves.at(-1)).toEqual({ uci: "a7a8n", san: "a8=N" });
    expect(state().pendingPromotion).toBeNull();
    expect(state().selected).toBeNull();
  });

  it("cancelar volta ao estado sem seleção", () => {
    const { click, state } = setup(PROMO_FEN);
    click("a7", "a8");
    state().cancelPromotion();
    expect(state().pendingPromotion).toBeNull();
    expect(state().selected).toBeNull();
    expect(state().game.ply).toBe(0);
  });

  it("cliques no tabuleiro são ignorados com a escolha aberta", () => {
    const { click, state } = setup(PROMO_FEN);
    click("a7", "a8", "a1");
    expect(state().pendingPromotion).toEqual({ from: "a7", to: "a8" });
  });
});

describe("controles", () => {
  it("flip inverte o lado de baixo", () => {
    const { state } = setup();
    expect(state().orientation).toBe("white");
    state().flip();
    expect(state().orientation).toBe("black");
  });

  it("newGame volta à posição inicial", () => {
    const { click, state } = setup();
    click("e2", "e4");
    state().newGame();
    expect(state().game.ply).toBe(0);
    expect(state().lastMove).toBeUndefined();
  });

  it("resign encerra a partida a favor do oponente de quem está na vez", () => {
    const { state } = setup();
    state().resign();
    expect(state().game.result).toEqual({ winner: "black", reason: "resign" });
  });
});
