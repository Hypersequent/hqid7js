# hqid7 (TypeScript)

A TypeScript/JavaScript library for generating lexicographically sortable identifiers with a custom Base58 string encoding. It uses the UUIDv7 binary format from [RFC 9562](https://www.rfc-editor.org/rfc/rfc9562.html) but provides a more compact and URL-friendly string representation than the standard hex format.

This is a port of the Go [hqid7](https://github.com/Hypersequent/hqid7) library and is byte-for-byte compatible with it (same binary layout, same string encoding).

The string encoding uses Bitcoin's Base58 alphabet and is always 23 characters long with an underscore separator after the 9th character for visual clarity.

Example:

```txt
1C3XR6Gzv_es6ViopPLabMW
1C3XR6Gzv_gnTYagGW7m6AU
1C3VGAJyH_iXkB2HfuhEusP
1C3Rttz29_K2U2o4AdhPF5b
```

## Install

```bash
npm install hqid7
```

Requires Node.js 20+ (uses the Web Crypto and `performance` globals). Ships as ESM with type declarations and has **zero runtime dependencies**. Works in the browser too.

## Usage

```ts
import { hqid7 } from "hqid7";
// default export works too: import hqid7 from "hqid7";

const id = hqid7(); // "1C3Rttz29_K2U2o4AdhPF5b" — always 23 characters
```

### Lower-level API

```ts
import {
  uuid7,
  fromTimestamp,
  encodeBase58,
  decodeBase58,
  parse,
  type UUID,
} from "hqid7";

const uuid: UUID = uuid7();          // raw 16-byte Uint8Array (UUIDv7)
const id = encodeBase58(uuid);       // canonical 23-char string
const back = decodeBase58(id);       // -> Uint8Array, deep-equals `uuid`

const at = fromTimestamp(Date.now()); // build from a specific epoch-ms value

const info = parse(id);              // or parse(uuid)
// {
//   timestampMillis, date, version: 7, variant: 2,
//   subMillisPrecision, randomBits
// }
```

## Binary format

```plain
    0                   1                   2                   3
    0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |                           unix_ts_ms                          |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |          unix_ts_ms           |  ver  |       rand_a          |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |var|                        rand_b                             |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |                            rand_b                             |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

- **unix_ts_ms** is filled from `performance.timeOrigin + performance.now()` (high-resolution wall clock).
- **ver** is `0b0111` for UUIDv7 (RFC 9562).
- **rand_a** is filled using "Replace Leftmost Random Bits with Increased Clock Precision" (Method 3 in RFC 9562) from the sub-millisecond fraction of the timestamp.
- **var** is `0b10` for UUIDv7 (RFC 9562).
- **rand_b** is cryptographically random bits from the Web Crypto API (`crypto.getRandomValues`).

## String encoding

The UUID is encoded using Base58 with the Bitcoin alphabet, the same one used in [Bitcoin](https://en.bitcoin.it/wiki/Base58Check_encoding) (no checksum).

The encoded string is always 23 characters long (the 22-char Base58 value, padded with leading "zero" digit `1` if needed, plus the `_` separator).

To make the string representation visually distinguishable from other UUIDs, a `_` character is inserted after the first 9 characters.

The string representation is sortable lexicographically, which is a useful property when using it as a key in databases.

> [!WARNING]
> Correct sort order (chronological by timestamp) is only guaranteed with **"C" collation** (case-sensitive ASCII). Using locale-specific collations like `en_US.UTF-8` or case-insensitive collations may result in incorrect sort order. In PostgreSQL, use `COLLATE "C"` for columns storing hqid7 values.

## CLI

The package installs a `hqid7` binary (and can be run via `npx hqid7`).

```bash
hqid7 new                              # generate a new hqid7
hqid7 parse 1C3XR6Gzv_es6ViopPLabMW    # show timestamp and random parts
```

## Development

```bash
npm install
npm run typecheck   # type-check with tsc
npm test            # run the test suite (node --test, TypeScript run natively)
npm run build       # emit dist/ (ESM + .d.ts)
```

## License

MIT
