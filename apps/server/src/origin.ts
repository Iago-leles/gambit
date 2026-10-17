/**
 * Quais sites podem falar com este servidor (CORS e WebSocket).
 *
 * Um navegador sempre manda o cabeçalho `Origin` no `fetch` entre sites e no WebSocket.
 * Pedidos sem `Origin` (curl, servidor, CI) não são de navegador e passam: o cabeçalho
 * protege os jogadores contra outros sites, não funciona como senha.
 */

/** Cabeçalhos CORS para uma origem já aprovada. Devolve a origem, nunca `*`. */
export function corsHeaders(origin: string): Record<string, string> {
  return {
    "access-control-allow-origin": origin,
    vary: "Origin",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
  };
}

/** Lê `ALLOWED_ORIGINS` (lista separada por vírgula). Entradas inválidas são descartadas. */
export function parseAllowedOrigins(value: string | undefined): string[] {
  const origins = new Set<string>();
  for (const entry of (value ?? "").split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    try {
      const url = new URL(trimmed);
      if (url.protocol === "http:" || url.protocol === "https:") origins.add(url.origin);
    } catch {
      // Não é uma URL: fica de fora.
    }
  }
  return [...origins];
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

interface OriginContext {
  allowed: readonly string[];
  /** URL do pedido que chegou ao servidor. Mostra se este servidor está rodando local. */
  requestUrl: string;
}

/**
 * `origin` é o valor do cabeçalho `Origin`, ou `null` se ele não veio.
 *
 * Aceita: pedido sem `Origin`, origem da lista, e origem local quando o próprio
 * servidor é local (desenvolvimento e testes). Em produção, origem local é recusada.
 */
export function isOriginAllowed(origin: string | null, { allowed, requestUrl }: OriginContext) {
  if (origin === null) return true;

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  // O navegador manda a origem já normalizada. Qualquer coisa diferente (usuário,
  // caminho, maiúsculas, porta padrão) não veio de um navegador de verdade.
  if (parsed.origin !== origin) return false;

  if (allowed.includes(origin)) return true;

  const serverIsLocal = LOOPBACK_HOSTS.has(new URL(requestUrl).hostname);
  return serverIsLocal && LOOPBACK_HOSTS.has(parsed.hostname);
}
