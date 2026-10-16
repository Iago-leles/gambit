import { describe, expect, it } from "vitest";
import { loadSeatToken, saveSeatToken, type TokenStorage } from "./seat-tokens";

function memoryStorage(): TokenStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

const broken: TokenStorage = {
  getItem: () => {
    throw new Error("bloqueado");
  },
  setItem: () => {
    throw new Error("bloqueado");
  },
};

describe("seat tokens", () => {
  it("guarda e lê o token por sala", () => {
    const storage = memoryStorage();
    saveSeatToken("K7P2QX", "tok-1", storage);
    saveSeatToken("ABCDEF", "tok-2", storage);
    expect(loadSeatToken("K7P2QX", storage)).toBe("tok-1");
    expect(loadSeatToken("ABCDEF", storage)).toBe("tok-2");
  });

  it("sala sem token devolve undefined", () => {
    expect(loadSeatToken("K7P2QX", memoryStorage())).toBeUndefined();
  });

  it("armazenamento bloqueado não quebra (janela anônima)", () => {
    expect(() => {
      saveSeatToken("K7P2QX", "tok", broken);
    }).not.toThrow();
    expect(loadSeatToken("K7P2QX", broken)).toBeUndefined();
  });

  it("sem armazenamento disponível também não quebra", () => {
    expect(loadSeatToken("K7P2QX", undefined)).toBeUndefined();
  });
});
