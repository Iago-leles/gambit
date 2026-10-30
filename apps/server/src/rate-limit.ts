/**
 * Limite de criação de salas por IP (ADR 012).
 *
 * Janela fixa: a primeira criação abre uma janela de `windowMs`. Dentro dela, cada IP
 * pode criar até `max` salas. Passou disso, recebe quanto falta para a janela acabar.
 * Sem rede nem armazenamento: o tempo (`now`) chega de fora, como em `room-core.ts`.
 */

export interface RateLimitConfig {
  /** Quantas salas cada IP pode criar por janela. */
  max: number;
  /** Duração da janela, em milissegundos. */
  windowMs: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = { max: 20, windowMs: 10 * 60 * 1000 };

/** Estado guardado por IP. `null` = nenhuma janela aberta. */
export interface RateLimitState {
  windowStart: number;
  count: number;
}

export type RateLimitDecision =
  | { allowed: true; state: RateLimitState; windowEndsAt: number }
  | { allowed: false; state: RateLimitState; retryAfterMs: number };

/** Conta um pedido. Pedido recusado não aumenta o contador. */
export function hit(
  state: RateLimitState | null,
  now: number,
  { max, windowMs }: RateLimitConfig,
): RateLimitDecision {
  const current = state && now - state.windowStart < windowMs ? state : null;
  const windowStart = current?.windowStart ?? now;
  const count = current?.count ?? 0;

  if (count >= max) {
    return {
      allowed: false,
      state: { windowStart, count },
      retryAfterMs: windowStart + windowMs - now,
    };
  }
  return {
    allowed: true,
    state: { windowStart, count: count + 1 },
    windowEndsAt: windowStart + windowMs,
  };
}

/** Segundos para o `Retry-After`: arredonda para cima, nunca menos de 1. */
export function retryAfterSeconds(retryAfterMs: number): number {
  return Math.max(1, Math.ceil(retryAfterMs / 1000));
}

function positiveInt(value: string | undefined): number | undefined {
  const n = Number(value);
  return value?.trim() && Number.isInteger(n) && n > 0 ? n : undefined;
}

/** Lê `RATE_LIMIT_MAX_ROOMS` e `RATE_LIMIT_WINDOW_SECONDS`. Valor ausente ou inválido usa o padrão. */
export function parseRateLimitConfig(env: {
  RATE_LIMIT_MAX_ROOMS?: string;
  RATE_LIMIT_WINDOW_SECONDS?: string;
}): RateLimitConfig {
  const seconds = positiveInt(env.RATE_LIMIT_WINDOW_SECONDS);
  return {
    max: positiveInt(env.RATE_LIMIT_MAX_ROOMS) ?? DEFAULT_RATE_LIMIT.max,
    windowMs: seconds ? seconds * 1000 : DEFAULT_RATE_LIMIT.windowMs,
  };
}

/** Quando o IP não vem (desenvolvimento, testes), todos dividem esta chave. */
export const FALLBACK_KEY = "no-ip";

/** O IP do cliente vem do cabeçalho que a Cloudflare preenche. Sem ele, usa a chave de reserva. */
export function clientKey(request: Request): string {
  return request.headers.get("cf-connecting-ip")?.trim() || FALLBACK_KEY;
}
