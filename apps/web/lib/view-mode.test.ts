import { describe, expect, it } from "vitest";
import { DEFAULT_VIEW_MODE, loadViewMode, saveViewMode, type ViewStorage } from "./view-mode";

function memoryStorage(): ViewStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

const broken: ViewStorage = {
  getItem: () => {
    throw new Error("bloqueado");
  },
  setItem: () => {
    throw new Error("bloqueado");
  },
};

describe("view mode", () => {
  it("usa o padrão quando nada foi salvo", () => {
    expect(loadViewMode(memoryStorage())).toBe(DEFAULT_VIEW_MODE);
  });

  it("guarda e lê a escolha", () => {
    const storage = memoryStorage();
    saveViewMode("3d", storage);
    expect(loadViewMode(storage)).toBe("3d");
    saveViewMode("2d", storage);
    expect(loadViewMode(storage)).toBe("2d");
  });

  it("ignora valor inválido", () => {
    const storage = memoryStorage();
    storage.setItem("gambit:view", "4d");
    expect(loadViewMode(storage)).toBe(DEFAULT_VIEW_MODE);
  });

  it("não lança erro sem armazenamento", () => {
    expect(loadViewMode(broken)).toBe(DEFAULT_VIEW_MODE);
    expect(() => {
      saveViewMode("3d", broken);
    }).not.toThrow();
    expect(loadViewMode(undefined)).toBe(DEFAULT_VIEW_MODE);
  });
});
