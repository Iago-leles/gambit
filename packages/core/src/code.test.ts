import { describe, expect, it } from "vitest";
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  formatCode,
  generateRoomCode,
  isValidCode,
  normalizeCode,
} from "./code";

describe("CODE_ALPHABET", () => {
  it("tem 31 símbolos sem repetição", () => {
    expect(CODE_ALPHABET).toHaveLength(31);
    expect(new Set(CODE_ALPHABET).size).toBe(31);
  });

  it("não tem símbolos ambíguos", () => {
    for (const c of ["0", "O", "1", "I", "L"]) {
      expect(CODE_ALPHABET).not.toContain(c);
    }
  });
});

describe("generateRoomCode", () => {
  it("gera 6 símbolos do alfabeto", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect(isValidCode(code)).toBe(true);
    }
  });

  it("usa a fonte de aleatoriedade recebida", () => {
    // Bytes 0..5 mapeiam direto para os 6 primeiros símbolos.
    const fill = (buf: Uint8Array) => {
      buf.forEach((_, i) => (buf[i] = i));
      return buf;
    };
    expect(generateRoomCode(fill)).toBe(CODE_ALPHABET.slice(0, 6));
  });

  it("descarta bytes fora da faixa (amostragem por rejeição)", () => {
    // 248 = 31 * 8 é o primeiro byte rejeitado. 255 também.
    const sequence = [248, 255, 0, 1, 2, 3, 4, 5];
    let pos = 0;
    const fill = (buf: Uint8Array) => {
      buf.forEach((_, i) => (buf[i] = sequence[pos++ % sequence.length] ?? 0));
      return buf;
    };
    expect(generateRoomCode(fill)).toBe(CODE_ALPHABET.slice(0, 6));
  });

  it("distribui os símbolos de forma uniforme", () => {
    const counts = new Map<string, number>();
    const samples = 5000;
    for (let i = 0; i < samples; i++) {
      for (const c of generateRoomCode()) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    const expected = (samples * CODE_LENGTH) / CODE_ALPHABET.length;
    expect(counts.size).toBe(CODE_ALPHABET.length);
    for (const n of counts.values()) {
      // Margem larga para o teste não ser instável (~6 desvios padrão).
      expect(Math.abs(n - expected)).toBeLessThan(expected * 0.2);
    }
  });
});

describe("normalizeCode", () => {
  it("remove espaços e hífen e passa para maiúsculas", () => {
    expect(normalizeCode(" k7p-2qx ")).toBe("K7P2QX");
  });

  it("remove espaços internos", () => {
    expect(normalizeCode("k7p 2qx")).toBe("K7P2QX");
  });
});

describe("formatCode", () => {
  it("insere o hífen no meio", () => {
    expect(formatCode("K7P2QX")).toBe("K7P-2QX");
  });

  it("normaliza antes de formatar", () => {
    expect(formatCode(" k7p2qx")).toBe("K7P-2QX");
  });
});

describe("isValidCode", () => {
  it("aceita código normalizado válido", () => {
    expect(isValidCode("K7P2QX")).toBe(true);
  });

  it("rejeita tamanho errado", () => {
    expect(isValidCode("K7P2Q")).toBe(false);
    expect(isValidCode("K7P2QXA")).toBe(false);
  });

  it("rejeita símbolos fora do alfabeto", () => {
    expect(isValidCode("K7P2Q0")).toBe(false);
    expect(isValidCode("K7P2QL")).toBe(false);
  });

  it("rejeita código não normalizado", () => {
    expect(isValidCode("k7p-2qx")).toBe(false);
  });
});
