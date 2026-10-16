import { z } from "zod";
import type { EndReason, GameResult } from "./result";
import { RoomRules } from "./rules";

/**
 * Mensagens entre cliente e servidor. Todas são JSON validado com Zod nos dois lados.
 */

/** Limite em caracteres. Mensagens maiores são rejeitadas antes do parse. */
export const MAX_MESSAGE_LENGTH = 1024;

const ColorSchema = z.enum(["white", "black"]);

/** `e2e4`, `e7e8q` e drops como `P@e4`. */
const Uci = z.string().regex(/^(?:[a-h][1-8][a-h][1-8][qrbn]?|[PNBRQ]@[a-h][1-8])$/);

// ---------- Cliente → servidor ----------

export const ClientMessage = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("hello"),
    playerToken: z.string().min(1).max(64).optional(),
    name: z.string().trim().min(1).max(24).optional(),
  }),
  z.strictObject({
    type: z.literal("move"),
    uci: Uci,
    /** Número do lance esperado. Descarta pedidos atrasados ou duplicados. */
    ply: z.int().min(0),
  }),
  z.strictObject({ type: z.literal("resign") }),
  z.strictObject({ type: z.literal("draw"), action: z.enum(["offer", "accept", "decline"]) }),
  z.strictObject({ type: z.literal("ping"), t: z.number() }),
]);
export type ClientMessage = z.infer<typeof ClientMessage>;

export type ParseResult =
  { ok: true; message: ClientMessage } | { ok: false; error: "too_large" | "bad_message" };

export function parseClientMessage(raw: string): ParseResult {
  if (raw.length > MAX_MESSAGE_LENGTH) return { ok: false, error: "too_large" };
  const parsed = ClientMessage.safeParse(safeJson(raw));
  return parsed.success ? { ok: true, message: parsed.data } : { ok: false, error: "bad_message" };
}

// ---------- Snapshot ----------

const END_REASONS = [
  "checkmate",
  "stalemate",
  "insufficient",
  "repetition",
  "seventyFiveMoves",
  "timeout",
  "resign",
  "agreement",
  "variantWin",
] as const satisfies readonly EndReason[];

const GameResultSchema = z.strictObject({
  winner: ColorSchema.nullable(),
  reason: z.enum(END_REASONS),
}) satisfies z.ZodType<GameResult>;

const Player = z.strictObject({
  name: z.string().optional(),
  connected: z.boolean(),
});

export const Snapshot = z.strictObject({
  code: z.string(),
  rules: RoomRules,
  initialFen: z.string(),
  moves: z.array(z.strictObject({ uci: z.string(), san: z.string() })),
  fen: z.string(),
  turn: ColorSchema,
  isCheck: z.boolean(),
  status: z.enum(["waiting", "playing", "ended"]),
  result: GameResultSchema.optional(),
  /** Tempo de cada lado em ms, no instante `serverNow`. `null` sem relógio. */
  clock: z
    .strictObject({
      white: z.number(),
      black: z.number(),
      /** Lado cujo relógio está correndo, ou `null` se está parado. */
      running: ColorSchema.nullable(),
    })
    .nullable(),
  serverNow: z.number(),
  /** `null` = assento livre. */
  players: z.strictObject({ white: Player.nullable(), black: Player.nullable() }),
  drawOffer: ColorSchema.nullable(),
});
export type Snapshot = z.infer<typeof Snapshot>;

// ---------- Servidor → cliente ----------

export const ErrorCode = z.enum([
  "bad_message",
  "too_large",
  "illegal_move",
  "not_your_turn",
  "waiting_for_opponent",
  "stale_ply",
  "game_over",
  "not_a_player",
  "room_full",
  "spectators_disabled",
  "no_draw_offer",
  "room_not_found",
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ServerMessage = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("welcome"),
    role: z.enum(["white", "black", "spectator"]),
    /** Só para jogadores. O cliente guarda no `localStorage`. */
    playerToken: z.string().optional(),
    snapshot: Snapshot,
  }),
  z.strictObject({ type: z.literal("state"), snapshot: Snapshot }),
  z.strictObject({ type: z.literal("error"), code: ErrorCode, message: z.string() }),
  z.strictObject({ type: z.literal("pong"), t: z.number(), serverNow: z.number() }),
]);
export type ServerMessage = z.infer<typeof ServerMessage>;

/** Para o cliente. Devolve `undefined` se a mensagem não for válida. */
export function parseServerMessage(raw: string): ServerMessage | undefined {
  const parsed = ServerMessage.safeParse(safeJson(raw));
  return parsed.success ? parsed.data : undefined;
}

export function encodeMessage(message: ClientMessage | ServerMessage): string {
  return JSON.stringify(message);
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
