import {
  DEFAULT_RULES,
  Game,
  INITIAL_FEN,
  type ClientMessage,
  type ServerMessage,
  type Snapshot,
} from "@gambit/core";
import { describe, expect, it } from "vitest";
import { createOnlineGameStore } from "./online-game-store";

/** Snapshot de uma partida em andamento depois dos lances dados. */
function snapshot(moves: string[] = [], overrides: Partial<Snapshot> = {}): Snapshot {
  const game = Game.replay(INITIAL_FEN, moves);
  return {
    code: "K7P2QX",
    rules: DEFAULT_RULES,
    initialFen: INITIAL_FEN,
    moves: [...game.moves],
    fen: game.fen,
    turn: game.turn,
    isCheck: game.isCheck,
    status: "playing",
    clock: { white: 300_000, black: 300_000, running: null },
    serverNow: 1000,
    players: { white: { connected: true }, black: { connected: true } },
    drawOffer: null,
    ...overrides,
  };
}

function setup() {
  const sent: ClientMessage[] = [];
  const tokens: string[] = [];
  const store = createOnlineGameStore({
    code: "K7P2QX",
    send: (m) => sent.push(m),
    saveToken: (t) => tokens.push(t),
    now: () => 5000,
  });
  const state = () => store.getState();
  const receive = (m: ServerMessage) => {
    state().receive(m);
  };
  const click = (...squares: string[]) => {
    for (const sq of squares) state().selectSquare(sq);
  };
  return { store, state, receive, click, sent, tokens };
}

function asWhite(moves: string[] = []) {
  const ctx = setup();
  ctx.receive({ type: "welcome", role: "white", playerToken: "tok", snapshot: snapshot(moves) });
  return ctx;
}

describe("conexão e boas-vindas", () => {
  it("começa conectando, sem partida", () => {
    const { state } = setup();
    expect(state().connection).toBe("connecting");
    expect(state().game).toBeNull();
    expect(state().role).toBeNull();
  });

  it("welcome define papel, partida e guarda o token", () => {
    const { state, tokens } = asWhite();
    expect(state().role).toBe("white");
    expect(state().game?.fen).toBe(INITIAL_FEN);
    expect(state().pieces.size).toBe(32);
    expect(tokens).toEqual(["tok"]);
  });

  it("jogador de pretas vê o tabuleiro do lado das pretas", () => {
    const { state, receive } = setup();
    receive({ type: "welcome", role: "black", playerToken: "tok", snapshot: snapshot() });
    expect(state().orientation).toBe("black");
  });

  it("guarda o instante local em que o snapshot chegou", () => {
    const { state } = asWhite();
    expect(state().receivedAt).toBe(5000);
  });
});

describe("lances com UI otimista", () => {
  it("lance na vez move a peça na hora e envia ao servidor com o ply", () => {
    const { state, click, sent } = asWhite();
    click("e2", "e4");
    expect(state().game?.moves.map((m) => m.uci)).toEqual(["e2e4"]);
    expect(state().pendingMove).toBe("e2e4");
    expect(sent).toEqual([{ type: "move", uci: "e2e4", ply: 0 }]);
  });

  it("não deixa selecionar fora da vez", () => {
    const { state, click } = asWhite(["e2e4"]);
    click("e7");
    expect(state().selected).toBeNull();
  });

  it("espectador não seleciona peças", () => {
    const { state, receive, click } = setup();
    receive({ type: "welcome", role: "spectator", snapshot: snapshot() });
    click("e2");
    expect(state().selected).toBeNull();
  });

  it("não seleciona enquanto espera o oponente entrar", () => {
    const { state, receive, click } = setup();
    receive({
      type: "welcome",
      role: "white",
      playerToken: "tok",
      snapshot: snapshot([], { status: "waiting" }),
    });
    click("e2");
    expect(state().selected).toBeNull();
  });

  it("state do servidor confirma o lance", () => {
    const { state, click, receive } = asWhite();
    click("e2", "e4");
    receive({ type: "state", snapshot: snapshot(["e2e4"]) });
    expect(state().pendingMove).toBeNull();
    expect(state().game?.moves).toHaveLength(1);
  });

  it("erro do servidor desfaz o lance otimista e mostra o erro", () => {
    const { state, click, receive } = asWhite();
    click("e2", "e4");
    receive({ type: "error", code: "stale_ply", message: "Lance fora de sincronia" });
    expect(state().pendingMove).toBeNull();
    expect(state().game?.moves).toHaveLength(0);
    expect(state().error).toEqual({ code: "stale_ply", message: "Lance fora de sincronia" });
  });

  it("não envia outro lance enquanto o anterior está pendente", () => {
    const { click, sent } = asWhite();
    click("e2", "e4", "d2", "d4");
    expect(sent).toHaveLength(1);
  });

  it("promoção pede a peça e envia o UCI completo", () => {
    const { state, receive, click, sent } = setup();
    receive({
      type: "welcome",
      role: "white",
      playerToken: "tok",
      snapshot: snapshot([], { initialFen: "8/P6k/8/8/8/8/8/K7 w - - 0 1", moves: [] }),
    });
    click("a7", "a8");
    expect(state().pendingPromotion).toEqual({ from: "a7", to: "a8" });
    state().choosePromotion("q");
    expect(sent).toEqual([{ type: "move", uci: "a7a8q", ply: 0 }]);
  });
});

describe("ações", () => {
  it("desistir envia resign", () => {
    const { state, sent } = asWhite();
    state().resign();
    expect(sent).toEqual([{ type: "resign" }]);
  });

  it("empate envia a ação pedida", () => {
    const { state, sent } = asWhite();
    state().draw("offer");
    expect(sent).toEqual([{ type: "draw", action: "offer" }]);
  });

  it("dismissError limpa o erro", () => {
    const { state, receive } = asWhite();
    receive({ type: "error", code: "not_your_turn", message: "Não é a sua vez" });
    state().dismissError();
    expect(state().error).toBeNull();
  });

  it("setConnection atualiza o estado da conexão", () => {
    const { state } = setup();
    state().setConnection("open");
    expect(state().connection).toBe("open");
  });
});
