import { describe, expect, it } from "vitest";
import {
  DEFAULT_RATE_LIMIT,
  FALLBACK_KEY,
  clientKey,
  hit,
  parseRateLimitConfig,
  retryAfterSeconds,
  type RateLimitState,
} from "./rate-limit";

const CONFIG = { max: 3, windowMs: 60_000 };

describe("hit", () => {
  it("deixa passar até o máximo e recusa o seguinte", () => {
    let state: RateLimitState | null = null;
    for (let i = 0; i < 3; i++) {
      const d = hit(state, 1_000 + i, CONFIG);
      expect(d.allowed).toBe(true);
      state = d.state;
    }
    const refused = hit(state, 1_003, CONFIG);
    expect(refused.allowed).toBe(false);
    if (!refused.allowed) expect(refused.retryAfterMs).toBe(1_000 + 60_000 - 1_003);
  });

  it("o pedido recusado não aumenta o contador nem estende a janela", () => {
    const full: RateLimitState = { windowStart: 0, count: 3 };
    const refused = hit(full, 10_000, CONFIG);
    expect(refused.state).toEqual(full);
    expect(hit(refused.state, 59_999, CONFIG).allowed).toBe(false);
  });

  it("volta a funcionar quando a janela acaba", () => {
    const full: RateLimitState = { windowStart: 0, count: 3 };
    const d = hit(full, 60_000, CONFIG);
    expect(d.allowed).toBe(true);
    expect(d.state).toEqual({ windowStart: 60_000, count: 1 });
  });

  it("informa quando a janela termina", () => {
    const d = hit(null, 5_000, CONFIG);
    expect(d.allowed && d.windowEndsAt).toBe(65_000);
  });
});

describe("retryAfterSeconds", () => {
  it("arredonda para cima e nunca devolve menos de 1", () => {
    expect(retryAfterSeconds(1)).toBe(1);
    expect(retryAfterSeconds(0)).toBe(1);
    expect(retryAfterSeconds(1_001)).toBe(2);
    expect(retryAfterSeconds(60_000)).toBe(60);
  });
});

describe("parseRateLimitConfig", () => {
  it("usa o padrão quando falta ou é inválido", () => {
    expect(parseRateLimitConfig({})).toEqual(DEFAULT_RATE_LIMIT);
    expect(
      parseRateLimitConfig({ RATE_LIMIT_MAX_ROOMS: "abc", RATE_LIMIT_WINDOW_SECONDS: "-5" }),
    ).toEqual(DEFAULT_RATE_LIMIT);
    expect(parseRateLimitConfig({ RATE_LIMIT_MAX_ROOMS: "0" }).max).toBe(DEFAULT_RATE_LIMIT.max);
  });

  it("lê os valores em segundos", () => {
    expect(
      parseRateLimitConfig({ RATE_LIMIT_MAX_ROOMS: "5", RATE_LIMIT_WINDOW_SECONDS: "30" }),
    ).toEqual({ max: 5, windowMs: 30_000 });
  });
});

describe("clientKey", () => {
  it("usa CF-Connecting-IP, ou a chave de reserva sem ele", () => {
    const withIp = new Request("http://x", { headers: { "cf-connecting-ip": "203.0.113.7" } });
    expect(clientKey(withIp)).toBe("203.0.113.7");
    expect(clientKey(new Request("http://x"))).toBe(FALLBACK_KEY);
  });
});
