import { RoomRules, generateRoomCode, isValidCode } from "@gambit/core";
import { getServerByName, routePartykitRequest } from "partyserver";

export { Room } from "./room";

/** Tentativas de gerar um código livre antes de desistir. Com 887 milhões de códigos, colisão é rara. */
const CREATE_ATTEMPTS = 5;

/** O corpo de `POST /api/rooms` é pequeno: só as regras. */
const MAX_BODY_BYTES = 2048;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: CORS });
}

async function createRoom(request: Request, env: Env): Promise<Response> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json({ error: "too_large" }, 413);

  let input: unknown;
  try {
    input = text ? JSON.parse(text) : {};
  } catch {
    return json({ error: "invalid_rules" }, 400);
  }
  const rules = RoomRules.safeParse(input);
  if (!rules.success) return json({ error: "invalid_rules" }, 400);

  for (let attempt = 0; attempt < CREATE_ATTEMPTS; attempt++) {
    const code = generateRoomCode();
    const room = await getServerByName(env.Room, code);
    const result = await room.init(rules.data);
    if (result.created) return json({ code, creatorToken: result.creatorToken }, 201);
  }
  return json({ error: "no_free_code" }, 503);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/rooms") {
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
      if (request.method === "POST") return createRoom(request, env);
      return json({ error: "method_not_allowed" }, 405);
    }

    const response = await routePartykitRequest(request, env, {
      // Código mal formado nem chega a criar um Durable Object.
      onBeforeConnect: (_req, lobby) =>
        isValidCode(lobby.name) ? undefined : new Response("Not found", { status: 404 }),
    });
    return response ?? new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
