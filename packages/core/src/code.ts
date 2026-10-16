/**
 * Códigos de sala: 6 símbolos de um alfabeto sem ambiguidades.
 * 31^6 ≈ 887 milhões de combinações.
 */

/** Dígitos 2–9 e letras sem I, L e O. */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_LENGTH = 6;

/** Maior múltiplo de 31 que cabe num byte. Bytes acima disso são descartados. */
const REJECT_FROM = 256 - (256 % CODE_ALPHABET.length);

export type RandomFill = (buf: Uint8Array) => Uint8Array;

const cryptoFill: RandomFill = (buf) => crypto.getRandomValues(buf);

/**
 * Gera um código normalizado (sem hífen), como `K7P2QX`.
 * Usa amostragem por rejeição para que todos os símbolos sejam igualmente prováveis.
 */
export function generateRoomCode(fill: RandomFill = cryptoFill): string {
  let code = "";
  const buf = new Uint8Array(CODE_LENGTH * 2);
  while (code.length < CODE_LENGTH) {
    fill(buf);
    for (const byte of buf) {
      if (byte >= REJECT_FROM) continue;
      code += CODE_ALPHABET.charAt(byte % CODE_ALPHABET.length);
      if (code.length === CODE_LENGTH) break;
    }
  }
  return code;
}

/** `" k7p-2qx "` → `"K7P2QX"`. Não valida. */
export function normalizeCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

/** `"K7P2QX"` → `"K7P-2QX"`, para exibição. */
export function formatCode(input: string): string {
  const code = normalizeCode(input);
  const half = CODE_LENGTH / 2;
  return `${code.slice(0, half)}-${code.slice(half)}`;
}

const VALID_CODE = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

/** Verifica um código já normalizado. */
export function isValidCode(code: string): boolean {
  return VALID_CODE.test(code);
}
