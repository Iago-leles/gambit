import { describe, expect, it } from "vitest";
import { applyMove, createClock, flagTime, isFlagged, remaining } from "./clock";

/** 1 minuto + 2 segundos. */
const tc = { kind: "fischer", initialSeconds: 60, incrementSeconds: 2 } as const;

/** Joga os dois primeiros lances (um de cada lado) nos instantes dados. */
function afterOpening(whiteAt = 1_000, blackAt = 5_000) {
  return applyMove(applyMove(createClock(tc), whiteAt), blackAt);
}

describe("createClock", () => {
  it("começa parado, com o tempo inicial para os dois, vez das brancas", () => {
    const clock = createClock(tc);
    expect(clock.turn).toBe("white");
    expect(clock.turnStartedAt).toBeNull();
    expect(remaining(clock, "white", 999_999)).toBe(60_000);
    expect(remaining(clock, "black", 999_999)).toBe(60_000);
  });
});

describe("início do relógio", () => {
  it("o primeiro lance das brancas não gasta tempo nem ganha incremento", () => {
    const clock = applyMove(createClock(tc), 30_000);
    expect(clock.remaining.white).toBe(60_000);
    expect(clock.turn).toBe("black");
    expect(clock.turnStartedAt).toBeNull();
  });

  it("o primeiro lance das pretas também não, e o relógio passa a correr", () => {
    const clock = afterOpening(1_000, 40_000);
    expect(clock.remaining.black).toBe(60_000);
    expect(clock.turn).toBe("white");
    expect(clock.turnStartedAt).toBe(40_000);
  });
});

describe("relógio correndo", () => {
  it("desconta o tempo de quem está na vez", () => {
    const clock = afterOpening(1_000, 5_000);
    expect(remaining(clock, "white", 15_000)).toBe(50_000);
    expect(remaining(clock, "black", 15_000)).toBe(60_000);
  });

  it("soma o incremento depois do lance", () => {
    const clock = applyMove(afterOpening(1_000, 5_000), 15_000);
    expect(clock.remaining.white).toBe(52_000);
    expect(clock.turn).toBe("black");
    expect(clock.turnStartedAt).toBe(15_000);
  });

  it("remaining nunca fica negativo", () => {
    const clock = afterOpening(1_000, 5_000);
    expect(remaining(clock, "white", 500_000)).toBe(0);
  });
});

describe("fim de tempo", () => {
  it("flagTime é o instante em que o relógio da vez zera", () => {
    expect(flagTime(afterOpening(1_000, 5_000))).toBe(65_000);
  });

  it("flagTime é null com o relógio parado", () => {
    expect(flagTime(createClock(tc))).toBeNull();
  });

  it("isFlagged é falso um ms antes e verdadeiro no instante exato", () => {
    const clock = afterOpening(1_000, 5_000);
    expect(isFlagged(clock, 64_999)).toBe(false);
    expect(isFlagged(clock, 65_000)).toBe(true);
  });

  it("applyMove recusa lance depois do fim de tempo", () => {
    const clock = afterOpening(1_000, 5_000);
    expect(() => applyMove(clock, 65_000)).toThrow();
  });
});

describe("pureza", () => {
  it("applyMove não altera o relógio recebido", () => {
    const clock = afterOpening(1_000, 5_000);
    const copy = structuredClone(clock);
    applyMove(clock, 10_000);
    expect(clock).toEqual(copy);
  });
});
