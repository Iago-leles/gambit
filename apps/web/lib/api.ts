import { isValidCode } from "@gambit/core";

/** Endereço do Worker. Em desenvolvimento, o `wrangler dev` sobe na porta 8787. */
export const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://127.0.0.1:8787";

export class ApiError extends Error {
  constructor(readonly code: string) {
    super(`Erro da API: ${code}`);
    this.name = "ApiError";
  }
}

interface ApiOptions {
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface CreatedRoom {
  code: string;
  creatorToken: string;
}

/** Cria a sala. As regras são validadas no servidor; aqui só passam adiante. */
export async function createRoom(
  rules: unknown,
  { baseUrl = SERVER_URL, fetchFn = fetch }: ApiOptions = {},
): Promise<CreatedRoom> {
  let response: Response;
  try {
    response = await fetchFn(new URL("/api/rooms", baseUrl).href, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(rules),
    });
  } catch {
    throw new ApiError("network");
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code = isRecord(body) && typeof body.error === "string" ? body.error : "unknown";
    throw new ApiError(code);
  }
  if (
    isRecord(body) &&
    typeof body.code === "string" &&
    isValidCode(body.code) &&
    typeof body.creatorToken === "string"
  ) {
    return { code: body.code, creatorToken: body.creatorToken };
  }
  throw new ApiError("bad_response");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
