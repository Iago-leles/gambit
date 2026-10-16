import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, RoomRules, parseRules } from "./rules";

const KIWIPETE = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1";

describe("RoomRules: padrões", () => {
  it("objeto vazio vira as regras padrão", () => {
    expect(parseRules({})).toEqual(DEFAULT_RULES);
  });

  it("padrão é xadrez 5+3, cor aleatória, com espectadores", () => {
    expect(DEFAULT_RULES).toEqual({
      variant: "chess",
      timeControl: { kind: "fischer", initialSeconds: 300, incrementSeconds: 3 },
      creatorColor: "random",
      allowSpectators: true,
      theme: "classic",
    });
  });
});

describe("RoomRules: timeControl", () => {
  it("aceita tempo ilimitado", () => {
    expect(parseRules({ timeControl: { kind: "unlimited" } }).timeControl).toEqual({
      kind: "unlimited",
    });
  });

  it("aceita os limites do fischer: 10 s a 3 h, incremento 0 a 180 s", () => {
    const min = { kind: "fischer", initialSeconds: 10, incrementSeconds: 0 };
    const max = { kind: "fischer", initialSeconds: 10800, incrementSeconds: 180 };
    expect(RoomRules.safeParse({ timeControl: min }).success).toBe(true);
    expect(RoomRules.safeParse({ timeControl: max }).success).toBe(true);
  });

  it.each([
    { initialSeconds: 9, incrementSeconds: 0 },
    { initialSeconds: 10801, incrementSeconds: 0 },
    { initialSeconds: 60, incrementSeconds: -1 },
    { initialSeconds: 60, incrementSeconds: 181 },
    { initialSeconds: 60.5, incrementSeconds: 0 },
  ])("rejeita fischer fora dos limites: %o", (tc) => {
    expect(RoomRules.safeParse({ timeControl: { kind: "fischer", ...tc } }).success).toBe(false);
  });

  it("rejeita tipo de relógio desconhecido", () => {
    expect(RoomRules.safeParse({ timeControl: { kind: "bronstein" } }).success).toBe(false);
  });
});

describe("RoomRules: initialFen", () => {
  it("aceita FEN válido no xadrez padrão", () => {
    expect(parseRules({ initialFen: KIWIPETE }).initialFen).toBe(KIWIPETE);
  });

  it("rejeita FEN mal formado", () => {
    expect(RoomRules.safeParse({ initialFen: "isso não é fen" }).success).toBe(false);
  });

  it("rejeita posição impossível (sem rei)", () => {
    expect(RoomRules.safeParse({ initialFen: "8/8/8/8/8/8/8/8 w - - 0 1" }).success).toBe(false);
  });
});

describe("RoomRules: outros campos", () => {
  it("rejeita variante desconhecida", () => {
    expect(RoomRules.safeParse({ variant: "shogi" }).success).toBe(false);
  });

  it("rejeita cor inválida", () => {
    expect(RoomRules.safeParse({ creatorColor: "green" }).success).toBe(false);
  });

  it("rejeita tema com caracteres estranhos", () => {
    expect(RoomRules.safeParse({ theme: "<script>" }).success).toBe(false);
  });

  it("rejeita campos extras", () => {
    expect(RoomRules.safeParse({ hacked: true }).success).toBe(false);
  });
});
