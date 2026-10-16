import { describe, expect, it } from "vitest";
import {
  MAX_MESSAGE_LENGTH,
  encodeMessage,
  parseClientMessage,
  parseServerMessage,
  type ServerMessage,
  type Snapshot,
} from "./protocol";
import { DEFAULT_RULES } from "./rules";

const json = (value: unknown) => JSON.stringify(value);

describe("parseClientMessage: mensagens válidas", () => {
  it.each([
    { type: "hello" },
    { type: "hello", playerToken: "abc123", name: "Iago" },
    { type: "move", uci: "e2e4", ply: 0 },
    { type: "move", uci: "e7e8q", ply: 13 },
    { type: "move", uci: "P@e4", ply: 20 },
    { type: "resign" },
    { type: "draw", action: "offer" },
    { type: "draw", action: "accept" },
    { type: "draw", action: "decline" },
    { type: "ping", t: 123.5 },
  ])("aceita %o", (msg) => {
    expect(parseClientMessage(json(msg))).toEqual({ ok: true, message: msg });
  });
});

describe("parseClientMessage: mensagens inválidas", () => {
  it.each([
    ["JSON quebrado", "{"],
    ["tipo desconhecido", json({ type: "hack" })],
    ["campo extra", json({ type: "resign", winner: "white" })],
    ["UCI mal formado", json({ type: "move", uci: "e2-e4", ply: 0 })],
    ["promoção para rei", json({ type: "move", uci: "e7e8k", ply: 0 })],
    ["ply negativo", json({ type: "move", uci: "e2e4", ply: -1 })],
    ["ply fracionário", json({ type: "move", uci: "e2e4", ply: 1.5 })],
    ["ação de empate inválida", json({ type: "draw", action: "force" })],
    ["nome vazio", json({ type: "hello", name: "" })],
    ["nome longo demais", json({ type: "hello", name: "x".repeat(25) })],
    ["token longo demais", json({ type: "hello", playerToken: "x".repeat(65) })],
    ["não é objeto", json([1, 2, 3])],
  ])("rejeita %s", (_, raw) => {
    const result = parseClientMessage(raw);
    expect(result.ok).toBe(false);
  });

  it("rejeita mensagem grande demais antes de fazer o parse", () => {
    const raw = json({ type: "hello", name: "x".repeat(MAX_MESSAGE_LENGTH) });
    expect(parseClientMessage(raw)).toEqual({ ok: false, error: "too_large" });
  });

  it("devolve bad_message para conteúdo inválido", () => {
    expect(parseClientMessage("{")).toEqual({ ok: false, error: "bad_message" });
  });
});

const snapshot: Snapshot = {
  code: "K7P2QX",
  rules: DEFAULT_RULES,
  initialFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  moves: [{ uci: "e2e4", san: "e4" }],
  fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  turn: "black",
  isCheck: false,
  status: "playing",
  clock: { white: 300_000, black: 300_000, running: null },
  serverNow: 1_700_000_000_000,
  players: {
    white: { name: "Iago", connected: true },
    black: { connected: false },
  },
  drawOffer: null,
};

describe("mensagens do servidor", () => {
  it.each<ServerMessage>([
    { type: "welcome", role: "white", playerToken: "tok", snapshot },
    { type: "welcome", role: "spectator", snapshot },
    { type: "state", snapshot },
    {
      type: "state",
      snapshot: {
        ...snapshot,
        status: "ended",
        result: { winner: null, reason: "agreement" },
        clock: null,
        players: { white: null, black: null },
      },
    },
    { type: "error", code: "illegal_move", message: "Lance ilegal" },
    { type: "pong", t: 1, serverNow: 2 },
  ])("ida e volta preserva a mensagem: $type", (msg) => {
    expect(parseServerMessage(encodeMessage(msg))).toEqual(msg);
  });

  it("parseServerMessage rejeita lixo", () => {
    expect(parseServerMessage(json({ type: "state" }))).toBeUndefined();
    expect(parseServerMessage("não é json")).toBeUndefined();
  });
});
