import {
  INITIAL_FEN,
  Game,
  IllegalMoveError,
  applyMove as clockMove,
  createClock,
  flagTime,
  isFlagged,
  opposite,
  remaining,
  type ClockState,
  type Color,
  type ErrorCode,
  type GameResult,
  type GameStatus,
  type RoomRules,
  type Snapshot,
} from "@gambit/core";

/**
 * Toda a lógica de uma sala, sem rede nem armazenamento.
 * O Durable Object só carrega o registro, chama estes métodos, salva e avisa os clientes.
 * O tempo (`now`) e a geração de tokens chegam de fora, para os testes serem determinísticos.
 */

/** A sala expira depois de 24 h sem atividade. */
export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

export type Role = Color | "spectator";

export interface Seat {
  token: string;
  name?: string;
}

/** O que fica salvo. A posição é derivada ao reaplicar os lances (ADR 005). */
export interface RoomRecord {
  code: string;
  rules: RoomRules;
  initialFen: string;
  moves: string[];
  seats: Record<Color, Seat | null>;
  clock: ClockState | null;
  result: GameResult | null;
  drawOffer: Color | null;
  createdAt: number;
  lastActivity: number;
}

export type ActionResult = { ok: true } | { ok: false; code: ErrorCode };

export type HelloResult =
  | { ok: true; role: Color; token: string }
  | { ok: true; role: "spectator" }
  | { ok: false; code: ErrorCode };

interface CreateOptions {
  code: string;
  rules: RoomRules;
  now: number;
  newToken: () => string;
  /** Número em [0, 1) para sortear a cor do criador. */
  random?: () => number;
}

interface HelloOptions {
  token?: string | undefined;
  name?: string | undefined;
  now: number;
  newToken: () => string;
}

const OK: ActionResult = { ok: true };
const fail = (code: ErrorCode): { ok: false; code: ErrorCode } => ({ ok: false, code });

export class RoomCore {
  private constructor(
    private data: RoomRecord,
    private game: Game,
  ) {}

  static create({ code, rules, now, newToken, random = Math.random }: CreateOptions) {
    const creatorColor: Color =
      rules.creatorColor === "random" ? (random() < 0.5 ? "white" : "black") : rules.creatorColor;
    const creatorToken = newToken();
    const initialFen = rules.initialFen ?? INITIAL_FEN;

    const record: RoomRecord = {
      code,
      rules,
      initialFen,
      moves: [],
      seats: { white: null, black: null, [creatorColor]: { token: creatorToken } },
      clock: rules.timeControl.kind === "fischer" ? createClock(rules.timeControl) : null,
      result: null,
      drawOffer: null,
      createdAt: now,
      lastActivity: now,
    };
    return { room: new RoomCore(record, Game.fromFen(initialFen)), creatorToken };
  }

  /** Reconstrói a sala de um registro salvo, reaplicando os lances. */
  static restore(record: RoomRecord): RoomCore {
    return new RoomCore(record, Game.replay(record.initialFen, record.moves));
  }

  get record(): RoomRecord {
    return this.data;
  }

  get status(): GameStatus {
    if (this.data.result) return "ended";
    return this.data.seats.white && this.data.seats.black ? "playing" : "waiting";
  }

  hello({ token, name, now, newToken }: HelloOptions): HelloResult {
    const seats = this.data.seats;
    const owned = (["white", "black"] as const).find((c) => token && seats[c]?.token === token);
    const free = (["white", "black"] as const).find((c) => seats[c] === null);
    const color = owned ?? free;

    if (!color) {
      if (!this.data.rules.allowSpectators) return fail("spectators_disabled");
      this.touch(now);
      return { ok: true, role: "spectator" };
    }

    const seatToken = owned ? (seats[color]?.token ?? newToken()) : newToken();
    const previousName = seats[color]?.name;
    const seatName = name ?? previousName;
    seats[color] =
      seatName === undefined ? { token: seatToken } : { token: seatToken, name: seatName };
    this.touch(now);
    return { ok: true, role: color, token: seatToken };
  }

  move(role: Role, uci: string, ply: number, now: number): ActionResult {
    if (role === "spectator") return fail("not_a_player");
    if (this.data.result) return fail("game_over");
    if (this.status === "waiting") return fail("waiting_for_opponent");
    if (this.game.turn !== role) return fail("not_your_turn");
    if (ply !== this.data.moves.length) return fail("stale_ply");
    if (this.checkTimeout(now)) return fail("game_over");

    try {
      this.game.play(uci);
    } catch (error) {
      if (error instanceof IllegalMoveError) return fail("illegal_move");
      throw error;
    }

    const played = this.game.moves.at(-1);
    if (played) this.data.moves.push(played.uci);
    if (this.data.clock) this.data.clock = clockMove(this.data.clock, now);
    this.data.drawOffer = null;
    this.syncResult(now);
    this.touch(now);
    return OK;
  }

  resign(role: Role, now: number): ActionResult {
    if (role === "spectator") return fail("not_a_player");
    if (this.data.result) return fail("game_over");
    this.game.resign(role);
    this.syncResult(now);
    this.touch(now);
    return OK;
  }

  draw(role: Role, action: "offer" | "accept" | "decline", now: number): ActionResult {
    if (role === "spectator") return fail("not_a_player");
    if (this.data.result) return fail("game_over");
    const opponentOffered = this.data.drawOffer === opposite(role);

    if (action === "offer" && !opponentOffered) {
      this.data.drawOffer = role;
    } else if (action === "decline") {
      if (!opponentOffered) return fail("no_draw_offer");
      this.data.drawOffer = null;
    } else {
      // Aceitar, ou oferecer quando o oponente já ofereceu.
      if (!opponentOffered) return fail("no_draw_offer");
      this.game.agreeDraw();
      this.syncResult(now);
    }
    this.touch(now);
    return OK;
  }

  /** Encerra por tempo se o relógio da vez zerou. Devolve `true` se encerrou agora. */
  checkTimeout(now: number): boolean {
    const clock = this.data.clock;
    if (this.data.result || !clock || !isFlagged(clock, now)) return false;
    this.game.timeout(clock.turn);
    this.syncResult(now);
    this.touch(now);
    return true;
  }

  /** Um único alarme: fim de tempo, se o relógio corre; senão, a expiração da sala. */
  nextAlarm(): number {
    const expiry = this.data.lastActivity + ROOM_TTL_MS;
    const flag = this.data.clock && !this.data.result ? flagTime(this.data.clock) : null;
    return flag === null ? expiry : Math.min(flag, expiry);
  }

  isExpired(now: number): boolean {
    return now >= this.data.lastActivity + ROOM_TTL_MS;
  }

  snapshot(now: number, connected: Record<Color, boolean>): Snapshot {
    const { data, game } = this;
    const player = (color: Color) => {
      const seat = data.seats[color];
      if (!seat) return null;
      return seat.name === undefined
        ? { connected: connected[color] }
        : { name: seat.name, connected: connected[color] };
    };
    const clock = data.clock;

    return {
      code: data.code,
      rules: data.rules,
      initialFen: data.initialFen,
      moves: [...game.moves],
      fen: game.fen,
      turn: game.turn,
      isCheck: game.isCheck,
      status: this.status,
      ...(data.result && { result: data.result }),
      clock: clock && {
        white: remaining(clock, "white", now),
        black: remaining(clock, "black", now),
        running: clock.turnStartedAt !== null && !data.result ? clock.turn : null,
      },
      serverNow: now,
      players: { white: player("white"), black: player("black") },
      drawOffer: data.drawOffer,
    };
  }

  /** Copia o resultado da partida e congela o relógio no instante do fim. */
  private syncResult(now: number) {
    if (!this.game.result) return;
    this.data.result = this.game.result;
    this.data.drawOffer = null;
    const clock = this.data.clock;
    if (clock?.turnStartedAt != null) {
      this.data.clock = {
        ...clock,
        remaining: { ...clock.remaining, [clock.turn]: remaining(clock, clock.turn, now) },
        turnStartedAt: null,
      };
    }
  }

  private touch(now: number) {
    this.data.lastActivity = now;
  }
}
