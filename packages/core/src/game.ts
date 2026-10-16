import { Chess, castlingSide, normalizeMove, type Position } from "chessops/chess";
import { INITIAL_FEN, makeFen, parseFen } from "chessops/fen";
import { makeSanAndPlay } from "chessops/san";
import type { Move, NormalMove, Role } from "chessops/types";
import { makeUci, parseUci, squareFile } from "chessops/util";
import { opposite, type Color, type GameResult } from "./result";

/**
 * Partida = posição inicial + lista de lances (ADR 005).
 * Envolve o chessops e acrescenta o que ele não faz sozinho:
 * repetição tripla, regra dos 75 lances e fins externos (desistência, tempo, acordo).
 */

export { INITIAL_FEN };

export interface PlayedMove {
  /** UCI canônico. Roque em notação padrão (`e1g1`) quando a posição permite. */
  uci: string;
  san: string;
}

export class IllegalMoveError extends Error {
  constructor(
    readonly uci: string,
    reason: string,
  ) {
    super(`Lance ilegal ${uci}: ${reason}`);
    this.name = "IllegalMoveError";
  }
}

const PROMOTION_ROLES: readonly Role[] = ["queen", "rook", "bishop", "knight"];

/** 75 lances de cada lado sem captura nem lance de peão. */
const SEVENTY_FIVE_MOVES_PLIES = 150;

export class Game {
  private constructor(
    readonly initialFen: string,
    private pos: Position,
    private history: PlayedMove[],
    /** Quantas vezes cada posição (sem contadores de lance) já apareceu. */
    private seen: Map<string, number>,
    private ended: GameResult | undefined,
  ) {}

  static fromFen(fen: string = INITIAL_FEN): Game {
    const pos = parseFen(fen)
      .chain((setup) => Chess.fromSetup(setup))
      .unwrap();
    const game = new Game(fen, pos, [], new Map(), undefined);
    game.recordPosition();
    game.ended = game.detectEnd();
    return game;
  }

  /** Reconstrói a partida a partir dos lances. Lança `IllegalMoveError` se algum for ilegal. */
  static replay(initialFen: string, ucis: readonly string[]): Game {
    const game = Game.fromFen(initialFen);
    for (const uci of ucis) game.play(uci);
    return game;
  }

  clone(): Game {
    return new Game(
      this.initialFen,
      this.pos.clone(),
      [...this.history],
      new Map(this.seen),
      this.ended,
    );
  }

  get fen(): string {
    return makeFen(this.pos.toSetup());
  }

  get turn(): Color {
    return this.pos.turn;
  }

  get ply(): number {
    return this.history.length;
  }

  get moves(): readonly PlayedMove[] {
    return this.history;
  }

  get isCheck(): boolean {
    return this.pos.isCheck();
  }

  get result(): GameResult | undefined {
    return this.ended;
  }

  /** Todos os lances legais em UCI canônico. Vazio se a partida acabou. */
  legalMoves(): string[] {
    if (this.ended) return [];
    const ucis: string[] = [];
    for (const [from, dests] of this.pos.allDests()) {
      for (const to of dests) {
        const move: NormalMove = { from, to };
        if (this.isPromotion(move)) {
          for (const promotion of PROMOTION_ROLES) ucis.push(makeUci({ from, to, promotion }));
        } else {
          ucis.push(this.canonicalUci(move));
        }
      }
    }
    return ucis;
  }

  isLegal(uci: string): boolean {
    return this.parseLegal(uci) !== undefined;
  }

  /** Joga o lance. Lança `IllegalMoveError` sem mudar o estado se for ilegal. */
  play(uci: string): PlayedMove {
    if (this.ended) throw new IllegalMoveError(uci, "a partida acabou");
    const move = this.parseLegal(uci);
    if (!move) throw new IllegalMoveError(uci, "não é legal nesta posição");

    const played: PlayedMove = { uci: this.canonicalUci(move), san: "" };
    played.san = makeSanAndPlay(this.pos, move);
    this.history.push(played);
    this.recordPosition();
    this.ended = this.detectEnd();
    return played;
  }

  resign(color: Color): void {
    this.end({ winner: opposite(color), reason: "resign" });
  }

  agreeDraw(): void {
    this.end({ winner: null, reason: "agreement" });
  }

  /** Quem ficou sem tempo perde, a menos que o oponente não tenha material para dar mate. */
  timeout(color: Color): void {
    const winner = opposite(color);
    const canWin = !this.pos.hasInsufficientMaterial(winner);
    this.end({ winner: canWin ? winner : null, reason: "timeout" });
  }

  private end(result: GameResult): void {
    this.ended ??= result;
  }

  private parseLegal(uci: string): Move | undefined {
    const parsed = parseUci(uci);
    if (!parsed) return undefined;
    const move = normalizeMove(this.pos, parsed);
    return this.pos.isLegal(move) ? move : undefined;
  }

  private isPromotion(move: NormalMove): boolean {
    const piece = this.pos.board.get(move.from);
    if (piece?.role !== "pawn") return false;
    const rank = move.to >> 3;
    return rank === 0 || rank === 7;
  }

  /** Roque vem do chessops como "rei captura a torre". Na posição padrão, vira `e1g1`/`e1c1`. */
  private canonicalUci(move: Move): string {
    if (!("from" in move)) return makeUci(move);
    const side = castlingSide(this.pos, move);
    if (!side) return makeUci(move);

    const rookFile = squareFile(move.to);
    const standard = squareFile(move.from) === 4 && (rookFile === 0 || rookFile === 7);
    if (!standard) return makeUci(move);

    const kingTo = (move.from & ~7) | (side === "h" ? 6 : 2);
    return makeUci({ from: move.from, to: kingTo });
  }

  private positionKey(): string {
    // Sem os contadores de meio-lance e de lance.
    return makeFen(this.pos.toSetup()).split(" ").slice(0, 4).join(" ");
  }

  private recordPosition(): void {
    const key = this.positionKey();
    this.seen.set(key, (this.seen.get(key) ?? 0) + 1);
  }

  private detectEnd(): GameResult | undefined {
    if (this.pos.isCheckmate()) return { winner: opposite(this.pos.turn), reason: "checkmate" };
    if (this.pos.isStalemate()) return { winner: null, reason: "stalemate" };
    if (this.pos.isInsufficientMaterial()) return { winner: null, reason: "insufficient" };
    if (this.pos.halfmoves >= SEVENTY_FIVE_MOVES_PLIES) {
      return { winner: null, reason: "seventyFiveMoves" };
    }
    if ((this.seen.get(this.positionKey()) ?? 0) >= 3) {
      return { winner: null, reason: "repetition" };
    }
    return undefined;
  }
}
