// Smoke test for the published package, run inside each Node version container.
// Imports the installed `hqid7` package (ESM) and checks core behavior.
import {
  decodeBase58,
  encodeBase58,
  newString,
  parse,
  uuid7,
} from "hqid7";

// newString() shape: 23 chars, `_` separator at index 9.
const id = newString();
if (id.length !== 23) throw new Error(`bad length: ${id} (${id.length})`);
if (id[9] !== "_") throw new Error(`bad separator: ${id}`);

// Round-trip a random UUID through encode/decode.
const u = uuid7();
const round = decodeBase58(encodeBase58(u));
if (Buffer.compare(Buffer.from(u), Buffer.from(round)) !== 0) {
  throw new Error("encode/decode round-trip mismatch");
}

// Known vector from the Go reference: the zero UUID.
const zero = encodeBase58(new Uint8Array(16));
if (zero !== "111111111_1111111111111") {
  throw new Error(`bad zero encoding: ${zero}`);
}

// Parsed fields must report a valid UUIDv7.
const info = parse(id);
if (info.version !== 7) throw new Error(`bad version: ${info.version}`);
if (info.variant !== 2) throw new Error(`bad variant: ${info.variant}`);

console.log(`  ✓ library import OK (id=${id})`);
