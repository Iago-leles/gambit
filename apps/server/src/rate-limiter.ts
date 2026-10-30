import { DurableObject } from "cloudflare:workers";
import { hit, type RateLimitConfig, type RateLimitState } from "./rate-limit";

/**
 * Um Durable Object por IP (ADR 012). Guarda o contador da janela atual.
 * A conta está em `rate-limit.ts`; aqui ficam só o armazenamento e o alarme que limpa tudo
 * quando a janela acaba, para não sobrar registro de IP antigo.
 */

const STORAGE_KEY = "window";

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterMs: number };

export class RateLimiter extends DurableObject<Env> {
  /** Chamado pelo Worker por RPC antes de criar uma sala. */
  async take(config: RateLimitConfig): Promise<RateLimitResult> {
    const state = (await this.ctx.storage.get<RateLimitState>(STORAGE_KEY)) ?? null;
    const decision = hit(state, Date.now(), config);
    if (!decision.allowed) return { allowed: false, retryAfterMs: decision.retryAfterMs };

    await this.ctx.storage.put(STORAGE_KEY, decision.state);
    if (decision.state.count === 1) await this.ctx.storage.setAlarm(decision.windowEndsAt);
    return { allowed: true };
  }

  override async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}
