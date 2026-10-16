import { describe, expect, it } from "vitest";
import { clockAt, formatClock } from "./clock-view";

describe("clockAt", () => {
  const clock = { white: 60_000, black: 45_000, running: "white" as const };

  it("desconta do lado que está correndo o tempo desde a chegada do snapshot", () => {
    expect(clockAt(clock, 1000, 4000)).toEqual({ white: 57_000, black: 45_000 });
  });

  it("nunca fica negativo", () => {
    expect(clockAt(clock, 0, 999_999)).toEqual({ white: 0, black: 45_000 });
  });

  it("relógio parado não muda", () => {
    expect(clockAt({ ...clock, running: null }, 0, 50_000)).toEqual({
      white: 60_000,
      black: 45_000,
    });
  });

  it("sem relógio devolve null", () => {
    expect(clockAt(null, 0, 0)).toBeNull();
  });
});

describe("formatClock", () => {
  it.each([
    [300_000, "5:00"],
    [65_400, "1:05"],
    [10_000, "0:10"],
    [9_450, "0:09.4"],
    [0, "0:00.0"],
    [3_723_000, "1:02:03"],
  ])("%d ms vira %s", (ms, text) => {
    expect(formatClock(ms)).toBe(text);
  });
});
