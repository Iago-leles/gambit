import {
  encodeMessage,
  parseClientMessage,
  type ClientMessage,
  type Color,
  type ErrorCode,
  type RoomRules,
  type ServerMessage,
} from "@gambit/core";
import { Server, type Connection, type WSMessage } from "partyserver";
import { RoomCore, type Role, type RoomRecord } from "./room-core";

/**
 * Uma sala = um Durable Object (ADR 002). O nome do objeto é o código da sala.
 * Toda a regra está em `RoomCore`; aqui só ficam armazenamento, sockets e alarme.
 */

const STORAGE_KEY = "room";

/** Código de fechamento do WebSocket quando a sala não existe. */
export const CLOSE_ROOM_NOT_FOUND = 4004;

const ERROR_TEXT: Record<ErrorCode, string> = {
  bad_message: "Mensagem inválida",
  too_large: "Mensagem grande demais",
  illegal_move: "Lance ilegal",
  not_your_turn: "Não é a sua vez",
  waiting_for_opponent: "Aguardando o oponente entrar",
  stale_ply: "Lance fora de sincronia",
  game_over: "A partida acabou",
  not_a_player: "Só jogadores podem fazer isso",
  room_full: "A sala está cheia",
  spectators_disabled: "Esta sala não aceita espectadores",
  no_draw_offer: "Não há oferta de empate",
  room_not_found: "Sala não encontrada",
};

interface ConnectionState {
  role: Role;
}

export class Room extends Server<Env> {
  static override options = { hibernate: true };

  /** `undefined` = ainda não carregou do armazenamento; `null` = a sala não existe. */
  private core: RoomCore | null | undefined;

  /** Chamado pelo Worker por RPC ao criar a sala. Não sobrescreve uma sala existente. */
  async init(
    rules: RoomRules,
  ): Promise<{ created: true; creatorToken: string } | { created: false }> {
    if (await this.load()) return { created: false };
    const { room, creatorToken } = RoomCore.create({
      code: this.name,
      rules,
      now: Date.now(),
      newToken: () => crypto.randomUUID(),
    });
    this.core = room;
    await this.save();
    return { created: true, creatorToken };
  }

  override async onConnect(connection: Connection<ConnectionState>) {
    if (!(await this.load())) {
      this.sendError(connection, "room_not_found");
      connection.close(CLOSE_ROOM_NOT_FOUND, "room_not_found");
    }
  }

  override async onMessage(connection: Connection<ConnectionState>, raw: WSMessage) {
    const core = await this.load();
    if (!core) return;

    const parsed = parseClientMessage(typeof raw === "string" ? raw : "");
    if (!parsed.ok) {
      this.sendError(connection, parsed.error);
      return;
    }
    await this.handle(core, connection, parsed.message);
  }

  override async onClose() {
    const core = await this.load();
    if (core) this.broadcastState(core);
  }

  override async onAlarm() {
    const core = await this.load();
    if (!core) return;
    const now = Date.now();

    if (core.isExpired(now)) {
      for (const connection of this.getConnections()) connection.close(1000, "expired");
      await this.ctx.storage.deleteAll();
      this.core = null;
      return;
    }
    if (core.checkTimeout(now)) this.broadcastState(core);
    await this.save();
  }

  private async handle(
    core: RoomCore,
    connection: Connection<ConnectionState>,
    message: ClientMessage,
  ) {
    const now = Date.now();
    const role = connection.state?.role ?? "spectator";

    switch (message.type) {
      case "ping":
        this.send(connection, { type: "pong", t: message.t, serverNow: now });
        return;

      case "hello": {
        const result = core.hello({
          token: message.playerToken,
          name: message.name,
          now,
          newToken: () => crypto.randomUUID(),
        });
        if (!result.ok) {
          this.sendError(connection, result.code);
          connection.close(1008, result.code);
          return;
        }
        connection.setState({ role: result.role });
        await this.save();
        this.send(connection, {
          type: "welcome",
          role: result.role,
          ...(result.role !== "spectator" && { playerToken: result.token }),
          snapshot: this.snapshot(core, now),
        });
        this.broadcastState(core, [connection.id]);
        return;
      }

      case "move":
        await this.apply(core, connection, core.move(role, message.uci, message.ply, now));
        return;

      case "resign":
        await this.apply(core, connection, core.resign(role, now));
        return;

      case "draw":
        await this.apply(core, connection, core.draw(role, message.action, now));
        return;
    }
  }

  /** Salva e avisa todos. Em caso de erro, avisa só quem pediu (o estado pode ter mudado, ex.: fim de tempo). */
  private async apply(
    core: RoomCore,
    connection: Connection,
    result: { ok: true } | { ok: false; code: ErrorCode },
  ) {
    if (!result.ok) this.sendError(connection, result.code);
    await this.save();
    this.broadcastState(core);
  }

  private async load(): Promise<RoomCore | null> {
    if (this.core === undefined) {
      const record = await this.ctx.storage.get<RoomRecord>(STORAGE_KEY);
      this.core = record ? RoomCore.restore(record) : null;
    }
    return this.core;
  }

  private async save() {
    if (!this.core) return;
    await this.ctx.storage.put(STORAGE_KEY, this.core.record);
    await this.ctx.storage.setAlarm(this.core.nextAlarm());
  }

  private connectedSeats(): Record<Color, boolean> {
    const seats = { white: false, black: false };
    for (const connection of this.getConnections<ConnectionState>()) {
      const role = connection.state?.role;
      if (role === "white" || role === "black") seats[role] = true;
    }
    return seats;
  }

  private snapshot(core: RoomCore, now: number) {
    return core.snapshot(now, this.connectedSeats());
  }

  private broadcastState(core: RoomCore, without?: string[]) {
    const message: ServerMessage = { type: "state", snapshot: this.snapshot(core, Date.now()) };
    this.broadcast(encodeMessage(message), without);
  }

  private send(connection: Connection, message: ServerMessage) {
    connection.send(encodeMessage(message));
  }

  private sendError(connection: Connection, code: ErrorCode) {
    this.send(connection, { type: "error", code, message: ERROR_TEXT[code] });
  }
}
