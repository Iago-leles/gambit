import { Chess } from "chessops/chess";
import { parseFen } from "chessops/fen";
import { z } from "zod";

/** Regras da sala. Tudo o que muda a forma de jogar vive aqui (ADR 004). */

/** Novas variantes entram na Fase 4. */
export const Variant = z.enum(["chess"]);
export type Variant = z.infer<typeof Variant>;

export const TimeControl = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("unlimited") }),
  z.strictObject({
    kind: z.literal("fischer"),
    initialSeconds: z
      .int()
      .min(10)
      .max(3 * 60 * 60),
    incrementSeconds: z.int().min(0).max(180),
  }),
]);
export type TimeControl = z.infer<typeof TimeControl>;

export const CreatorColor = z.enum(["white", "black", "random"]);
export type CreatorColor = z.infer<typeof CreatorColor>;

/** FEN que o chessops lê e que forma uma posição legal de xadrez padrão. */
export const Fen = z
  .string()
  .max(100)
  .refine((fen) => parseFen(fen).chain((setup) => Chess.fromSetup(setup)).isOk, {
    message: "FEN inválido",
  });

export const RoomRules = z.strictObject({
  variant: Variant.default("chess"),
  timeControl: TimeControl.default({ kind: "fischer", initialSeconds: 300, incrementSeconds: 3 }),
  creatorColor: CreatorColor.default("random"),
  allowSpectators: z.boolean().default(true),
  initialFen: Fen.optional(),
  theme: z
    .string()
    .regex(/^[a-z0-9-]{1,32}$/)
    .default("classic"),
});
export type RoomRules = z.infer<typeof RoomRules>;

export const DEFAULT_RULES: RoomRules = RoomRules.parse({});

/** Valida e completa com os padrões. Lança `ZodError` se for inválido. */
export function parseRules(input: unknown): RoomRules {
  return RoomRules.parse(input);
}
