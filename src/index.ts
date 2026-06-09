/**
 * hqid7 — lexicographically sortable identifiers.
 *
 * Uses the UUIDv7 binary layout from RFC 9562 but serializes to a compact,
 * URL-friendly 23-character Base58 string (9 chars + `_` + 13 chars) instead
 * of the standard 36-character hex form. The string form sorts
 * lexicographically by timestamp under byte/C collation.
 */

import { base58Decode, base58Encode } from "./base58.ts";

/** A raw 16-byte UUID value. */
export type UUID = Uint8Array;

/** Length of the canonical encoded string, including the `_` separator. */
export const STRING_LENGTH = 23;

/** Index of the `_` separator in the canonical encoded string. */
const SEPARATOR_INDEX = 9;

/** Cryptographically secure random bytes, isomorphic across Node and browsers. */
function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Current wall-clock time in milliseconds since the Unix epoch, with
 * sub-millisecond fractional precision when the host clock provides it.
 */
function nowMillis(): number {
  return performance.timeOrigin + performance.now();
}

/**
 * Build a UUIDv7 from a Unix timestamp in milliseconds. A fractional part is
 * used to fill the 12-bit `rand_a` field with increased clock precision
 * (RFC 9562 "Method 3"); the remaining 62 bits are cryptographically random.
 */
export function fromTimestamp(epochMillis: number): UUID {
  const millis = Math.floor(epochMillis);
  const subMillis = epochMillis - millis; // fractional milliseconds in [0, 1)
  const precisionBits = Math.floor(subMillis * 4096) & 0xfff;

  const uuid = new Uint8Array(16);
  const view = new DataView(uuid.buffer);

  // First 64 bits: 48-bit timestamp | 4-bit version (0b0111) | 12-bit rand_a.
  const timeField =
    (BigInt(millis) << 16n) | (0x7n << 12n) | BigInt(precisionBits);
  view.setBigUint64(0, timeField, false);

  // Last 64 bits: 2-bit variant (0b10) | 62 random bits.
  const rnd = randomBytes(8);
  let randField = 0n;
  for (const b of rnd) {
    randField = (randField << 8n) | BigInt(b);
  }
  randField = (randField & ((1n << 62n) - 1n)) | (0b10n << 62n);
  view.setBigUint64(8, randField, false);

  return uuid;
}

/** Generate a new UUIDv7 from the current time. */
export function uuid7(): UUID {
  return fromTimestamp(nowMillis());
}

/** Generate a new hqid7 and return its canonical 23-character string form. */
export function hqid7(): string {
  return encodeBase58(uuid7());
}

export default hqid7;

/** Encode a UUID to raw Base58 (no padding, no separator). */
export function encodeBase58Raw(uuid: UUID): string {
  return base58Encode(uuid);
}

/**
 * Encode a UUID to the canonical hqid7 string: Base58 left-padded to 22
 * characters with `1` ("zero" in the Bitcoin alphabet), with a `_` inserted
 * after the 9th character.
 */
export function encodeBase58(uuid: UUID): string {
  let s = base58Encode(uuid);
  if (s.length < 22) {
    s = "1".repeat(22 - s.length) + s;
  }
  return s.slice(0, SEPARATOR_INDEX) + "_" + s.slice(SEPARATOR_INDEX);
}

/** Decode a canonical hqid7 string back to its 16-byte UUID. */
export function decodeBase58(s: string): UUID {
  if (s.length !== STRING_LENGTH) {
    throw new Error("hqid7 base58: invalid length");
  }
  if (s[SEPARATOR_INDEX] !== "_") {
    throw new Error("hqid7 base58: invalid separator");
  }

  const decoded = base58Decode(
    s.slice(0, SEPARATOR_INDEX) + s.slice(SEPARATOR_INDEX + 1),
  );

  // Normalize to exactly 16 bytes: trim excess leading "zero" bytes that come
  // from the padding, or left-pad if the value was shorter.
  if (decoded.length === 16) {
    return decoded;
  }
  if (decoded.length > 16) {
    return decoded.slice(decoded.length - 16);
  }
  const uuid = new Uint8Array(16);
  uuid.set(decoded, 16 - decoded.length);
  return uuid;
}

/** Structured view of the fields encoded in a UUIDv7. */
export interface Parsed {
  /** Unix timestamp in milliseconds (48-bit field). */
  timestampMillis: number;
  /** The decoded timestamp as a `Date`. */
  date: Date;
  /** Version field — always 7 for a valid hqid7. */
  version: number;
  /** Variant field — always 2 (0b10) for a valid hqid7. */
  variant: number;
  /** 12-bit sub-millisecond precision (`rand_a`). */
  subMillisPrecision: number;
  /** 62-bit random payload (`rand_b`). */
  randomBits: bigint;
}

/** Parse a UUID (or hqid7 string) into its constituent fields. */
export function parse(value: UUID | string): Parsed {
  const uuid = typeof value === "string" ? decodeBase58(value) : value;
  if (uuid.length !== 16) {
    throw new Error("hqid7: UUID must be 16 bytes");
  }

  const view = new DataView(uuid.buffer, uuid.byteOffset, uuid.byteLength);
  const timeField = view.getBigUint64(0, false);
  const randField = view.getBigUint64(8, false);

  const timestampMillis = Number(timeField >> 16n);
  return {
    timestampMillis,
    date: new Date(timestampMillis),
    version: Number((timeField >> 12n) & 0xfn),
    variant: Number((randField >> 62n) & 0x3n),
    subMillisPrecision: Number(timeField & 0xfffn),
    randomBits: randField & ((1n << 62n) - 1n),
  };
}
