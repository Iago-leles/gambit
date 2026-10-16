/**
 * Token do assento de cada sala, guardado no navegador (ADR 008).
 * O `localStorage` pode falhar (janela anônima, bloqueio de cookies), então nada aqui lança erro.
 */

export type TokenStorage = Pick<Storage, "getItem" | "setItem">;

const key = (code: string) => `gambit:seat:${code}`;

function defaultStorage(): TokenStorage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export function loadSeatToken(
  code: string,
  storage: TokenStorage | undefined = defaultStorage(),
): string | undefined {
  try {
    return storage?.getItem(key(code)) ?? undefined;
  } catch {
    return undefined;
  }
}

export function saveSeatToken(
  code: string,
  token: string,
  storage: TokenStorage | undefined = defaultStorage(),
): void {
  try {
    storage?.setItem(key(code), token);
  } catch {
    // Sem armazenamento, o jogador só perde a reconexão automática.
  }
}
