import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { httpRequest, startServer } from "./helpers";

/** Limite curto para o teste: 3 salas por 3 segundos. O IP é o de reserva (sem CF-Connecting-IP). */
const WINDOW_SECONDS = 3;
const DOMAIN = "https://gambit.iagoleles.com";
const EVIL = "https://evil.example";

let server: Awaited<ReturnType<typeof startServer>>;

beforeAll(async () => {
  server = await startServer({
    RATE_LIMIT_MAX_ROOMS: "3",
    RATE_LIMIT_WINDOW_SECONDS: String(WINDOW_SECONDS),
  });
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

describe("POST /api/rooms: limite por IP", () => {
  it("passa do limite, devolve 429 com Retry-After e CORS; depois da janela volta a 201", async () => {
    for (let i = 0; i < 3; i++) expect((await post(DOMAIN)).status).toBe(201);

    // Origem recusada continua 403 e não conta.
    expect((await post(EVIL)).status).toBe(403);
    // Regras inválidas continuam 400 e não contam.
    expect((await post(DOMAIN, { variant: "shogi" })).status).toBe(400);

    const limited = await post(DOMAIN);
    expect(limited.status).toBe(429);
    const body = JSON.parse(limited.body) as { error: string; retryAfterSeconds: number };
    expect(body.error).toBe("rate_limited");
    expect(body.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(body.retryAfterSeconds).toBeLessThanOrEqual(WINDOW_SECONDS);
    expect(limited.headers["retry-after"]).toBe(String(body.retryAfterSeconds));
    expect(limited.headers["access-control-allow-origin"]).toBe(DOMAIN);

    // Sem Origin (curl) também é limitado, sem cabeçalhos CORS.
    const curl = await post();
    expect(curl.status).toBe(429);
    expect(curl.headers["access-control-allow-origin"]).toBeUndefined();

    await new Promise((r) => setTimeout(r, (body.retryAfterSeconds + 0.5) * 1000));
    expect((await post(DOMAIN)).status).toBe(201);
  });
});
