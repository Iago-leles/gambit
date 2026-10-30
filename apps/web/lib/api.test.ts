import { describe, expect, it } from "vitest";
import { ApiError, createRoom, rateLimitMessage } from "./api";

const BASE = "http://servidor.test";

function fakeFetch(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const fetchFn = (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: input instanceof Request ? input.url : input.toString(), init });
    return Promise.resolve(Response.json(body, { status }));
  };
  return { fetchFn, calls };
}

describe("createRoom", () => {
  it("envia as regras e devolve código e token", async () => {
    const { fetchFn, calls } = fakeFetch(201, { code: "K7P2QX", creatorToken: "tok" });
    const room = await createRoom({ creatorColor: "white" }, { baseUrl: BASE, fetchFn });
    expect(room).toEqual({ code: "K7P2QX", creatorToken: "tok" });
    expect(calls[0]?.url).toBe("http://servidor.test/api/rooms");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.init?.body).toBe(JSON.stringify({ creatorColor: "white" }));
  });

  it("erro do servidor vira ApiError com o código", async () => {
    const { fetchFn } = fakeFetch(400, { error: "invalid_rules" });
    await expect(createRoom({}, { baseUrl: BASE, fetchFn })).rejects.toEqual(
      new ApiError("invalid_rules"),
    );
  });

  it("resposta fora do formato vira ApiError", async () => {
    const { fetchFn } = fakeFetch(201, { code: 123 });
    await expect(createRoom({}, { baseUrl: BASE, fetchFn })).rejects.toBeInstanceOf(ApiError);
  });

  it("falha de rede vira ApiError network", async () => {
    const fetchFn = (() => Promise.reject(new TypeError("offline"))) as typeof fetch;
    await expect(createRoom({}, { baseUrl: BASE, fetchFn })).rejects.toEqual(
      new ApiError("network"),
    );
  });
});

describe("limite de criação de sala", () => {
  it("429 vira ApiError rate_limited com os segundos de espera", async () => {
    const { fetchFn } = fakeFetch(429, { error: "rate_limited", retryAfterSeconds: 240 });
    const error = await createRoom({}, { baseUrl: BASE, fetchFn }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "rate_limited", retryAfterSeconds: 240 });
  });

  it("ignora tempo de espera inválido", async () => {
    const { fetchFn } = fakeFetch(429, { error: "rate_limited", retryAfterSeconds: "logo" });
    const error = await createRoom({}, { baseUrl: BASE, fetchFn }).catch((e: unknown) => e);
    expect(error).toMatchObject({ code: "rate_limited", retryAfterSeconds: undefined });
  });
});

describe("rateLimitMessage", () => {
  it("arredonda os segundos para minutos, para cima", () => {
    expect(rateLimitMessage(1)).toBe(
      "Muitas salas criadas por este endereço. Tente de novo em 1 minuto.",
    );
    expect(rateLimitMessage(61)).toContain("em 2 minutos.");
    expect(rateLimitMessage(600)).toContain("em 10 minutos.");
  });

  it("sem tempo conhecido, pede para tentar daqui a pouco", () => {
    expect(rateLimitMessage(undefined)).toContain("daqui a pouco");
  });
});
