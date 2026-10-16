import { isValidCode } from "@gambit/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TestClient, createRoom, startServer } from "./helpers";

let server: Awaited<ReturnType<typeof startServer>>;

beforeAll(async () => {
  server = await startServer();
});

afterAll(async () => {
  await server.worker.dispose();
});

const WHITE = { creatorColor: "white" };

/** Cria a sala e senta os dois jogadores: criador de brancas e visitante de pretas. */
async function seatedRoom() {
  const { body } = await createRoom(server.base, WHITE);
  const code = String(body.code);
  const creatorToken = String(body.creatorToken);

  const white = await TestClient.connect(server.base, code);
  white.send({ type: "hello", playerToken: creatorToken, name: "Iago" });
  await white.next("welcome");

  const black = await TestClient.connect(server.base, code);
  black.send({ type: "hello", name: "Ana" });
  const welcome = await black.next("welcome");
  return { code, creatorToken, white, black, blackWelcome: welcome };
}

describe("POST /api/rooms", () => {
  it("cria a sala e devolve código e token do criador", async () => {
    const { status, body } = await createRoom(server.base);
    expect(status).toBe(201);
    expect(isValidCode(String(body.code))).toBe(true);
    expect(body.creatorToken).toEqual(expect.any(String));
  });

  it("recusa regras inválidas com 400", async () => {
    const { status, body } = await createRoom(server.base, { variant: "shogi" });
    expect(status).toBe(400);
    expect(body.error).toBe("invalid_rules");
  });

  it("libera CORS para o frontend", async () => {
    const res = await fetch(new URL("/api/rooms", server.base), { method: "OPTIONS" });
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
});

describe("rotas", () => {
  it("rota desconhecida dá 404", async () => {
    const res = await fetch(new URL("/nada", server.base));
    expect(res.status).toBe(404);
  });

  it("código mal formado não abre WebSocket", async () => {
    await expect(TestClient.connect(server.base, "lixo")).rejects.toThrow();
  });

  it("sala que não existe responde erro e fecha", async () => {
    const client = await TestClient.connect(server.base, "ZZZZZZ");
    const error = await client.next("error");
    expect(error.code).toBe("room_not_found");
    expect((await client.closed).code).toBe(4004);
  });
});

describe("assentos", () => {
  it("criador recupera o assento e visitante ocupa o outro", async () => {
    const { blackWelcome, white } = await seatedRoom();
    expect(blackWelcome.role).toBe("black");
    expect(blackWelcome.playerToken).toEqual(expect.any(String));
    expect(blackWelcome.snapshot.status).toBe("playing");

    const state = await white.next("state", (m) => m.snapshot.players.black !== null);
    expect(state.snapshot.players).toEqual({
      white: { name: "Iago", connected: true },
      black: { name: "Ana", connected: true },
    });
  });

  it("terceiro visitante vira espectador", async () => {
    const { code } = await seatedRoom();
    const spectator = await TestClient.connect(server.base, code);
    spectator.send({ type: "hello" });
    const welcome = await spectator.next("welcome");
    expect(welcome.role).toBe("spectator");
    expect(welcome.playerToken).toBeUndefined();
  });

  it("reconectar com o token devolve o mesmo assento", async () => {
    const { code, black, blackWelcome } = await seatedRoom();
    black.close();
    await black.closed;

    const again = await TestClient.connect(server.base, code);
    again.send({ type: "hello", playerToken: blackWelcome.playerToken });
    const welcome = await again.next("welcome");
    expect(welcome.role).toBe("black");
  });
});

describe("lances", () => {
  it("lance legal chega aos dois lados", async () => {
    const { white, black } = await seatedRoom();
    white.send({ type: "move", uci: "e2e4", ply: 0 });
    for (const client of [white, black]) {
      const state = await client.next("state", (m) => m.snapshot.moves.length === 1);
      expect(state.snapshot.moves).toEqual([{ uci: "e2e4", san: "e4" }]);
      expect(state.snapshot.turn).toBe("black");
    }
  });

  it("lance fora da vez responde erro só para quem enviou", async () => {
    const { black } = await seatedRoom();
    black.send({ type: "move", uci: "e7e5", ply: 0 });
    expect((await black.next("error")).code).toBe("not_your_turn");
  });

  it("mensagem inválida responde bad_message", async () => {
    const { white } = await seatedRoom();
    white.send({ type: "move", uci: "e2e4", ply: -1 } as never);
    expect((await white.next("error")).code).toBe("bad_message");
  });

  it("partida até o mate", async () => {
    const { white, black } = await seatedRoom();
    const moves = ["f2f3", "e7e5", "g2g4", "d8h4"];
    for (const [ply, uci] of moves.entries()) {
      const mover = ply % 2 === 0 ? white : black;
      mover.send({ type: "move", uci, ply });
      await white.next("state", (m) => m.snapshot.moves.length === ply + 1);
    }
    const final = await black.next("state", (m) => m.snapshot.status === "ended");
    expect(final.snapshot.result).toEqual({ winner: "black", reason: "checkmate" });
  });
});

describe("ping", () => {
  it("responde pong com o horário do servidor", async () => {
    const { white } = await seatedRoom();
    white.send({ type: "ping", t: 42 });
    const pong = await white.next("pong");
    expect(pong.t).toBe(42);
    expect(pong.serverNow).toBeGreaterThan(0);
  });
});
