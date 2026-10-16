/**
 * Posições iniciais do Chess960, pela numeração de Scharnagl (0–959).
 * A posição 518 é a do xadrez padrão.
 */

export const CHESS960_COUNT = 960;

/** Pares de casas dos cavalos entre as 5 casas livres, na ordem de Scharnagl. */
const KNIGHT_PAIRS: readonly (readonly [number, number])[] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [1, 2],
  [1, 3],
  [1, 4],
  [2, 3],
  [2, 4],
  [3, 4],
];

/** Fileira das brancas, da coluna a até a h. Ex.: `"RNBQKBNR"`. */
export function chess960BackRank(id: number): string {
  if (!Number.isInteger(id) || id < 0 || id >= CHESS960_COUNT) {
    throw new RangeError(`id Chess960 fora de 0..959: ${id}`);
  }

  const rank: string[] = Array.from({ length: 8 }, () => "");

  /** Coloca a peça na `index`-ésima casa livre, da esquerda para a direita. */
  const placeOnFree = (piece: string, index: number) => {
    const square = rank.flatMap((p, i) => (p === "" ? [i] : []))[index];
    if (square === undefined) throw new Error(`Sem casa livre ${index} (id ${id})`);
    rank[square] = piece;
  };

  let n = id;
  rank[(n % 4) * 2 + 1] = "B"; // bispo de casa clara: b, d, f, h
  n = Math.floor(n / 4);
  rank[(n % 4) * 2] = "B"; // bispo de casa escura: a, c, e, g
  n = Math.floor(n / 4);
  placeOnFree("Q", n % 6);
  n = Math.floor(n / 6);

  const knights = KNIGHT_PAIRS[n];
  if (!knights) throw new Error(`Par de cavalos inválido (id ${id})`);
  // O segundo cavalo primeiro, para não deslocar o índice do primeiro.
  placeOnFree("N", knights[1]);
  placeOnFree("N", knights[0]);

  // As 3 casas restantes recebem torre, rei e torre, nessa ordem.
  placeOnFree("R", 0);
  placeOnFree("K", 0);
  placeOnFree("R", 0);

  return rank.join("");
}

export function chess960Fen(id: number): string {
  const white = chess960BackRank(id);
  return `${white.toLowerCase()}/pppppppp/8/8/8/8/PPPPPPPP/${white} w KQkq - 0 1`;
}

/** Sorteia um id com `crypto.getRandomValues` e amostragem por rejeição. */
export function randomChess960Id(): number {
  const limit = 65536 - (65536 % CHESS960_COUNT);
  const buf = new Uint16Array(1);
  for (;;) {
    for (const value of crypto.getRandomValues(buf)) {
      if (value < limit) return value % CHESS960_COUNT;
    }
  }
}
