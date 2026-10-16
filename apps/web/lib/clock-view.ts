import type { Color, Snapshot } from "@gambit/core";

/**
 * Relógio na tela. O servidor manda o tempo de cada lado no instante do snapshot (ADR 007).
 * O cliente só faz a contagem regressiva do lado que está correndo.
 */

export function clockAt(
  clock: Snapshot["clock"],
  receivedAt: number,
  now: number,
): Record<Color, number> | null {
  if (!clock) return null;
  const elapsed = Math.max(0, now - receivedAt);
  const left = (color: Color) =>
    clock.running === color ? Math.max(0, clock[color] - elapsed) : clock[color];
  return { white: left("white"), black: left("black") };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** `5:00`, `1:02:03`; abaixo de 10 s mostra décimos: `0:09.4`. */
export function formatClock(ms: number): string {
  if (ms < 10_000) {
    const tenths = Math.floor(ms / 100);
    return `0:0${Math.floor(tenths / 10)}.${tenths % 10}`;
  }
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
