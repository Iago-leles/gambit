import { INITIAL_FEN } from "chessops/fen";
import { describe, expect, it } from "vitest";
import { Game, IllegalMoveError } from "./game";

/** Conta as folhas da árvore de lances usando só a API pública da Game. */
function perft(game: Game, depth: number): number {
  if (depth === 0) return 1;
  const moves = game.legalMoves();
  if (depth === 1) return moves.length;
  let nodes = 0;
  for (const uci of moves) {
    const next = game.clone();
    next.play(uci);
    nodes += perft(next, depth - 1);
  }
  return nodes;
}

function playAll(game: Game, moves: string): Game {
  for (const uci of moves.split(" ")) game.play(uci);
  return game;
}

describe("perft (posições de referência do chessprogramming.org)", () => {
  it.each([
    { name: "inicial", fen: INITIAL_FEN, depth: 4, nodes: 197281 },
    {
      name: "kiwipete",
      fen: "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
      depth: 3,
      nodes: 97862,
    },
    { name: "posição 3", fen: "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", depth: 3, nodes: 2812 },
    {
      name: "posição 4",
      fen: "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1",
      depth: 2,
      nodes: 264,
    },
    {
      name: "posição 5",
      fen: "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8",
      depth: 2,
      nodes: 1486,
    },
    {
      name: "posição 6",
      fen: "r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10",
      depth: 2,
      nodes: 2079,
    },
  ])("$name: profundidade $depth = $nodes", ({ fen, depth, nodes }) => {
    expect(perft(Game.fromFen(fen), depth)).toBe(nodes);
  });
});

describe("estado inicial", () => {
  it("começa na posição padrão, vez das brancas, sem lances", () => {
    const game = Game.fromFen();
    expect(game.initialFen).toBe(INITIAL_FEN);
    expect(game.fen).toBe(INITIAL_FEN);
    expect(game.turn).toBe("white");
    expect(game.ply).toBe(0);
    expect(game.moves).toEqual([]);
    expect(game.isCheck).toBe(false);
    expect(game.result).toBeUndefined();
  });

  it("rejeita FEN inválido", () => {
    expect(() => Game.fromFen("lixo")).toThrow();
  });
});

describe("play", () => {
  it("registra UCI e SAN e troca a vez", () => {
    const game = Game.fromFen();
    expect(game.play("e2e4")).toEqual({ uci: "e2e4", san: "e4" });
    expect(game.turn).toBe("black");
    expect(game.ply).toBe(1);
    expect(game.fen).toBe("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1");
  });

  it("recusa lance ilegal sem mudar o estado", () => {
    const game = Game.fromFen();
    expect(() => game.play("e2e5")).toThrow(IllegalMoveError);
    expect(game.ply).toBe(0);
  });

  it("recusa UCI mal formado", () => {
    expect(() => Game.fromFen().play("zz")).toThrow(IllegalMoveError);
  });

  it("recusa peça do lado errado", () => {
    expect(() => Game.fromFen().play("e7e5")).toThrow(IllegalMoveError);
  });

  it("isLegal responde sem jogar", () => {
    const game = Game.fromFen();
    expect(game.isLegal("g1f3")).toBe(true);
    expect(game.isLegal("g1g3")).toBe(false);
    expect(game.ply).toBe(0);
  });
});

describe("roque", () => {
  const ready = "r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1";

  it("legalMoves usa a notação padrão (rei anda duas casas)", () => {
    const moves = Game.fromFen(ready).legalMoves();
    expect(moves).toContain("e1g1");
    expect(moves).toContain("e1c1");
    expect(moves).not.toContain("e1h1");
  });

  it("aceita o roque nas duas notações e grava a padrão", () => {
    expect(Game.fromFen(ready).play("e1g1")).toEqual({ uci: "e1g1", san: "O-O" });
    expect(Game.fromFen(ready).play("e1h1")).toEqual({ uci: "e1g1", san: "O-O" });
    expect(Game.fromFen(ready).play("e1c1")).toEqual({ uci: "e1c1", san: "O-O-O" });
  });
});

describe("promoção", () => {
  const fen = "8/P6k/8/8/8/8/8/K7 w - - 0 1";

  it("legalMoves lista as quatro peças", () => {
    const promos = Game.fromFen(fen)
      .legalMoves()
      .filter((m) => m.startsWith("a7a8"));
    expect(promos.sort()).toEqual(["a7a8b", "a7a8n", "a7a8q", "a7a8r"]);
  });

  it("joga a promoção com SAN correto", () => {
    expect(Game.fromFen(fen).play("a7a8q")).toEqual({ uci: "a7a8q", san: "a8=Q" });
  });

  it("recusa promoção sem peça", () => {
    expect(() => Game.fromFen(fen).play("a7a8")).toThrow(IllegalMoveError);
  });
});

describe("fim de partida", () => {
  it("xeque-mate (mate do pastor)", () => {
    const game = playAll(Game.fromFen(), "e2e4 e7e5 f1c4 b8c6 d1h5 g8f6 h5f7");
    expect(game.moves.at(-1)?.san).toBe("Qxf7#");
    expect(game.isCheck).toBe(true);
    expect(game.result).toEqual({ winner: "white", reason: "checkmate" });
  });

  it("não aceita lance depois do fim", () => {
    const game = playAll(Game.fromFen(), "f2f3 e7e5 g2g4 d8h4");
    expect(game.result).toEqual({ winner: "black", reason: "checkmate" });
    expect(game.legalMoves()).toEqual([]);
    expect(() => game.play("a2a3")).toThrow(IllegalMoveError);
  });

  it("afogamento", () => {
    const game = Game.fromFen("k7/8/8/8/8/8/8/1Q5K w - - 0 1");
    game.play("b1b6");
    expect(game.result).toEqual({ winner: null, reason: "stalemate" });
  });

  it("material insuficiente", () => {
    const game = Game.fromFen("8/8/8/4k3/8/8/3rK3/8 w - - 0 1");
    game.play("e2d2");
    expect(game.result).toEqual({ winner: null, reason: "insufficient" });
  });

  it("repetição tripla encerra automaticamente", () => {
    const game = playAll(Game.fromFen(), "g1f3 g8f6 f3g1 f6g8 g1f3 g8f6 f3g1");
    expect(game.result).toBeUndefined();
    game.play("f6g8");
    expect(game.result).toEqual({ winner: null, reason: "repetition" });
  });

  it("regra dos 75 lances encerra automaticamente", () => {
    const game = Game.fromFen("8/8/8/4k3/8/8/4K3/R7 w - - 149 100");
    game.play("a1a2");
    expect(game.result).toEqual({ winner: null, reason: "seventyFiveMoves" });
  });

  it("mate no 150º meio-lance vale mais que a regra dos 75", () => {
    const game = Game.fromFen("k7/8/1K6/8/8/8/8/7R w - - 149 100");
    game.play("h1h8");
    expect(game.result).toEqual({ winner: "white", reason: "checkmate" });
  });
});

describe("fins externos", () => {
  it("desistência dá a vitória ao oponente", () => {
    const game = Game.fromFen();
    game.resign("white");
    expect(game.result).toEqual({ winner: "black", reason: "resign" });
  });

  it("empate por acordo", () => {
    const game = Game.fromFen();
    game.agreeDraw();
    expect(game.result).toEqual({ winner: null, reason: "agreement" });
  });

  it("tempo esgotado dá a vitória ao oponente", () => {
    const game = Game.fromFen();
    game.timeout("black");
    expect(game.result).toEqual({ winner: "white", reason: "timeout" });
  });

  it("tempo esgotado é empate se o oponente não tem material para mate", () => {
    const game = Game.fromFen("8/8/8/4k3/8/8/4K3/R7 w - - 0 1");
    game.timeout("white");
    expect(game.result).toEqual({ winner: null, reason: "timeout" });
  });

  it("não sobrescreve um resultado existente", () => {
    const game = Game.fromFen();
    game.resign("white");
    game.timeout("black");
    expect(game.result).toEqual({ winner: "black", reason: "resign" });
  });
});

describe("replay (ADR 005)", () => {
  it("reaplicar a lista de lances chega ao mesmo estado", () => {
    const original = playAll(Game.fromFen(), "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4");
    const replayed = Game.replay(
      original.initialFen,
      original.moves.map((m) => m.uci),
    );
    expect(replayed.fen).toBe(original.fen);
    expect(replayed.moves).toEqual(original.moves);
  });

  it("replay com lance ilegal lança erro", () => {
    expect(() => Game.replay(INITIAL_FEN, ["e2e4", "e2e4"])).toThrow(IllegalMoveError);
  });

  it("clone é independente do original", () => {
    const game = Game.fromFen();
    const copy = game.clone();
    copy.play("e2e4");
    expect(game.ply).toBe(0);
    expect(copy.ply).toBe(1);
  });
});
