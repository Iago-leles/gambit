import { opposite, type Color } from "./result";
import type { TimeControl } from "./rules";

/**
 * Relógio como dados (ADR 007). Nada fica "tiquetaqueando":
 * o servidor guarda o tempo de cada lado e o instante em que o turno começou.
 * Todas as funções são puras e recebem `now` em ms.
 */
export interface ClockState {
  incrementMs: number;
  /** Tempo de cada lado no início do turno atual. */
  remaining: Record<Color, number>;
  turn: Color;
  /** `null` enquanto o relógio está parado (antes do 1º lance de cada lado). */
  turnStartedAt: number | null;
  /** Lances (meios-lances) já registrados no relógio. */
  plies: number;
}

export type FischerControl = Extract<TimeControl, { kind: "fischer" }>;

export function createClock(tc: FischerControl): ClockState {
  const initialMs = tc.initialSeconds * 1000;
  return {
    incrementMs: tc.incrementSeconds * 1000,
    remaining: { white: initialMs, black: initialMs },
    turn: "white",
    turnStartedAt: null,
    plies: 0,
  };
}

/** Tempo restante de `color` no instante `now`. Nunca negativo. */
export function remaining(clock: ClockState, color: Color, now: number): number {
  const base = clock.remaining[color];
  if (clock.turnStartedAt === null || color !== clock.turn) return base;
  return Math.max(0, base - (now - clock.turnStartedAt));
}

/** Instante em que o relógio da vez zera, ou `null` se está parado. */
export function flagTime(clock: ClockState): number | null {
  if (clock.turnStartedAt === null) return null;
  return clock.turnStartedAt + clock.remaining[clock.turn];
}

export function isFlagged(clock: ClockState, now: number): boolean {
  const flag = flagTime(clock);
  return flag !== null && now >= flag;
}

/**
 * Registra o lance de quem está na vez.
 * Pré-condição: `isFlagged(clock, now)` é falso. O chamador encerra a partida por tempo antes.
 */
export function applyMove(clock: ClockState, now: number): ClockState {
  if (isFlagged(clock, now)) throw new Error("Lance depois do fim de tempo");

  const mover = clock.turn;
  const running = clock.turnStartedAt !== null;
  const left = running ? remaining(clock, mover, now) + clock.incrementMs : clock.remaining[mover];
  const plies = clock.plies + 1;

  return {
    ...clock,
    remaining: { ...clock.remaining, [mover]: left },
    turn: opposite(mover),
    // O relógio só começa a correr depois do 1º lance de cada lado.
    turnStartedAt: plies >= 2 ? now : null,
    plies,
  };
}
