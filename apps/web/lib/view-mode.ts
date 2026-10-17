/**
 * Escolha entre tabuleiro 2D e 3D, guardada no navegador.
 * O `localStorage` pode falhar (janela anônima, bloqueio de cookies), então nada aqui lança erro.
 */

export type ViewMode = "2d" | "3d";

/** O 2D segue como padrão até o 3D estar pronto. */
export const DEFAULT_VIEW_MODE: ViewMode = "2d";

export type ViewStorage = Pick<Storage, "getItem" | "setItem">;

const KEY = "gambit:view";

function defaultStorage(): ViewStorage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export function loadViewMode(storage: ViewStorage | undefined = defaultStorage()): ViewMode {
  try {
    const value = storage?.getItem(KEY);
    return value === "2d" || value === "3d" ? value : DEFAULT_VIEW_MODE;
  } catch {
    return DEFAULT_VIEW_MODE;
  }
}

export function saveViewMode(
  mode: ViewMode,
  storage: ViewStorage | undefined = defaultStorage(),
): void {
  try {
    storage?.setItem(KEY, mode);
  } catch {
    // Sem armazenamento, a escolha só vale até recarregar a página.
  }
}
