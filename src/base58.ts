/**
 * Base58 encoding using Bitcoin's alphabet (no checksum).
 *
 * This is the standard Bitcoin Base58 scheme: leading zero bytes are encoded
 * as leading `1` characters, the rest of the byte array is treated as one
 * big-endian integer and converted to base 58.
 */

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE = ALPHABET.length;

// Reverse lookup: character code -> digit value (-1 if not part of the alphabet).
const CODE_TO_DIGIT = (() => {
  const table = new Int8Array(128).fill(-1);
  for (let i = 0; i < ALPHABET.length; i++) {
    table[ALPHABET.charCodeAt(i)] = i;
  }
  return table;
})();

/** Encode a byte array to a Base58 string. */
export function base58Encode(bytes: Uint8Array): string {
  // Count leading zero bytes; each becomes a leading "1".
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) {
    zeros++;
  }

  // Convert the base-256 number to base-58 (little-endian digits).
  const digits: number[] = [];
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i]!;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j]! << 8;
      digits[j] = carry % BASE;
      carry = (carry / BASE) | 0;
    }
    while (carry > 0) {
      digits.push(carry % BASE);
      carry = (carry / BASE) | 0;
    }
  }

  let out = "1".repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i--) {
    out += ALPHABET[digits[i]!];
  }
  return out;
}

/** Decode a Base58 string back to a byte array. Throws on invalid characters. */
export function base58Decode(str: string): Uint8Array {
  // Leading "1" characters map back to leading zero bytes.
  let zeros = 0;
  while (zeros < str.length && str[zeros] === "1") {
    zeros++;
  }

  // Convert the base-58 number to base-256 (little-endian bytes).
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    const value = code < 128 ? CODE_TO_DIGIT[code]! : -1;
    if (value < 0) {
      throw new Error(`base58: invalid character ${JSON.stringify(str[i])}`);
    }
    let carry = value;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j]! * BASE;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  const out = new Uint8Array(zeros + bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[out.length - 1 - i] = bytes[i]!;
  }
  return out;
}
