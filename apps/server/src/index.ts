import { RoomRules, generateRoomCode, isValidCode } from "@gambit/core";
import { getServerByName, routePartykitRequest } from "partyserver";
import { corsHeaders, isOriginAllowed, parseAllowedOrigins } from "./origin";
import { clientKey, parseRateLimitConfig, retryAfterSeconds } from "./rate-limit";

export { Room } from "./room";
export { RateLimiter } from "./rate-limiter";

/** Tentativas de gerar um código livre antes de desistir. Com 887 milhões de códigos, colisão é rara. */
const CREATE_ATTEMPTS = 5;

/** O corpo de `POST /api/rooms` é pequeno: só as regras. */
const MAX_BODY_BYTES = 2048;

/** `origin` é a origem já aprovada do pedido, ou `null` se o pedido não veio de um navegador. */
function json(
  body: unknown,
  status: number,
  origin: string | null,
  extraHeaders: Record<string, string> = {},
) {
  return Response.json(body, {
    status,
    headers: { ...(origin && corsHeaders(origin)), ...extraHeaders },
  });
}

async function createRoom(request: Request, env: Env, origin: string | null): Promise<Response> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json({ error: "too_large" }, 413, origin);

  let input: unknown;
  try {
    input = text ? JSON.parse(text) : {};
  } catch {
    return json({ error: "invalid_rules" }, 400, origin);
  }
  const rules = RoomRules.safeParse(input);
  if (!rules.success) return json({ error: "invalid_rules" }, 400, origin);

  // O limite vem depois de validar as regras: pedido inválido não cria sala e não gasta cota.
  const limiter = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName(clientKey(request)));
  const taken = await limiter.take(parseRateLimitConfig(env));
  if (!taken.allowed) {
    const retryAfterSecs = retryAfterSeconds(taken.retryAfterMs);
    return json({ error: "rate_limited", retryAfterSeconds: retryAfterSecs }, 429, origin, {
      "retry-after": String(retryAfterSecs),
    });
  }

  for (let attempt = 0; attempt < CREATE_ATTEMPTS; attempt++) {
    const code = generateRoomCode();
    const room = await getServerByName(env.Room, code);
    const result = await room.init(rules.data);
    if (result.created) return json({ code, creatorToken: result.creatorToken }, 201, origin);
  }
  return json({ error: "no_free_code" }, 503, origin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    const allowed = parseAllowedOrigins(env.ALLOWED_ORIGINS);
    const originOk = isOriginAllowed(origin, { allowed, requestUrl: request.url });

    if (url.pathname === "/api/rooms") {
      // A origem é checada antes de ler o corpo: pedido de site de fora não faz nada.
      if (!originOk) return Response.json({ error: "origin_not_allowed" }, { status: 403 });
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, ...(origin && { headers: corsHeaders(origin) }) });
      }
      if (request.method === "POST") return createRoom(request, env, origin);
      return json({ error: "method_not_allowed" }, 405, origin);
    }

    const response = await routePartykitRequest(request, env, {
      onBeforeConnect: (req, lobby) => {
        // O navegador sempre manda `Origin` no WebSocket. Site de fora não entra.
        const wsOrigin = req.headers.get("origin");
        if (!isOriginAllowed(wsOrigin, { allowed, requestUrl: req.url })) {
          return new Response("Forbidden", { status: 403 });
        }
        // Código mal formado nem chega a criar um Durable Object.
        return isValidCode(lobby.name) ? undefined : new Response("Not found", { status: 404 });
      },
    });
    return response ?? new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
