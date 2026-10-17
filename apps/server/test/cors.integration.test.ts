import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRoom, httpRequest, startServer, tryUpgrade } from "./helpers";

/**
 * O Worker roda local (127.0.0.1), então origens locais passam.
 * As duas origens de produção vêm de `vars.ALLOWED_ORIGINS` no wrangler.jsonc.
 */
const LOCAL = "http://localhost:3000";
const WEB = "https://gambit-web.iago-leles.workers.dev";
const DOMAIN = "https://gambit.iagoleles.com";
const EVIL = "https://evil.example";

let server: Awaited<ReturnType<typeof startServer>>;

beforeAll(async () => {
  server = await startServer();
});

afterAll(async () => {
  await server.worker.dispose();
});

function post(origin?: string, body: unknown = {}) {
  return httpRequest(server.base, {
    method: "POST",
    path: "/api/rooms",
    headers: { "content-type": "application/json", ...(origin !== undefined && { origin }) },
    body: JSON.stringify(body),
  });
}

function preflight(origin: string) {
  return httpRequest(server.base, {
    method: "OPTIONS",
    path: "/api/rooms",
    headers: {
      origin,
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type",
    },
  });
}

describe("POST /api/rooms: origem", () => {
  it.each([
    ["local", LOCAL],
    ["site no workers.dev", WEB],
    ["domínio próprio", DOMAIN],
  ])("aceita %s e devolve essa origem, não *", async (_name, origin) => {
    const res = await post(origin);
    expect(res.status).toBe(201);
    expect(res.headers["access-control-allow-origin"]).toBe(origin);
    expect(res.headers.vary).toBe("Origin");
  });

  it("recusa site de fora com 403 e sem cabeçalhos CORS", async () => {
    const res = await post(EVIL);
    expect(res.status).toBe(403);
    expect(JSON.parse(res.body)).toEqual({ error: "origin_not_allowed" });
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("pedido sem Origin (curl, CI) continua funcionando, sem cabeçalhos CORS", async () => {
    const res = await post();
    expect(res.status).toBe(201);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("o erro de regras inválidas também carrega a origem, para o site conseguir ler", async () => {
    const res = await post(DOMAIN, { variant: "shogi" });
    expect(res.status).toBe(400);
    expect(res.headers["access-control-allow-origin"]).toBe(DOMAIN);
  });
});

describe("OPTIONS /api/rooms (preflight)", () => {
  it.each([LOCAL, WEB, DOMAIN])("aceita %s", async (origin) => {
    const res = await preflight(origin);
    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(origin);
    expect(res.headers["access-control-allow-methods"]).toBe("POST, OPTIONS");
    expect(res.headers["access-control-allow-headers"]).toBe("content-type");
  });

  it("recusa site de fora com 403", async () => {
    const res = await preflight(EVIL);
    expect(res.status).toBe(403);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("WebSocket: origem", () => {
  async function newRoomPath() {
    const { body } = await createRoom(server.base);
    return `/parties/room/${String(body.code)}`;
  }

  it.each([LOCAL, WEB, DOMAIN])("abre com a origem %s", async (origin) => {
    const path = await newRoomPath();
    expect((await tryUpgrade(server.base, path, origin)).status).toBe(101);
  });

  it("recusa site de fora com 403", async () => {
    const path = await newRoomPath();
    expect((await tryUpgrade(server.base, path, EVIL)).status).toBe(403);
  });

  it("abre sem Origin (cliente que não é navegador)", async () => {
    const path = await newRoomPath();
    expect((await tryUpgrade(server.base, path)).status).toBe(101);
  });

  it("código mal formado continua dando 404, mesmo com origem permitida", async () => {
    expect((await tryUpgrade(server.base, "/parties/room/lixo", DOMAIN)).status).toBe(404);
  });
});
