import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  decodeBase58,
  encodeBase58,
  encodeBase58Raw,
  newString,
} from "../src/index.ts";

const u = (...init: Array<[number, number]>): Uint8Array => {
  const bytes = new Uint8Array(16);
  for (const [i, v] of init) bytes[i] = v;
  return bytes;
};

describe("encode/decode", () => {
  it("encodes the zero UUID", () => {
    assert.equal(encodeBase58(new Uint8Array(16)), "111111111_1111111111111");
  });

  it("matches known vectors and round-trips (TestOne)", () => {
    const vectors = [
      "18AQGAut7_N92awznwCnjuR",
      "112d7dWtQ_Mvj9WttA3mMnX",
      "1111NKioe_UVktgzXLJ1B3u",
      "111115qCH_TcgbQwpvYZQ9d",
      "11111126U_w2Vvq8EnJ7hRH",
      "11111111F_PBt6CHo3fovdM",
      "111111111_4FzkJ37568tQw",
      "111111111_11jpXCZedGfVR",
      "111111111_111Ahg1opVcGX",
      "111111111_11113CUsUpv9u",
      "111111111_111111VtB5VXd",
      "111111111_11111117YXq9H",
      "111111111_111111112UzHM",
      "111111111_1111111111LUw",
      "111111111_111111111115R",
      "111111111_1111111111112",
    ];

    for (let i = 0; i < 16; i++) {
      const uuid = u([i, 1]);
      const encoded = encodeBase58(uuid);
      assert.equal(encoded, vectors[i], `vector ${i}`);
      assert.deepEqual(decodeBase58(encoded), uuid, `round-trip ${i}`);
    }
  });

  it("round-trips and preserves order across a representative sweep", () => {
    // Port of TestEncodeDecode, sampled to stay fast in JS while still
    // crossing the encoded-length boundaries.
    let prev = "";
    for (let u0 = 0; u0 < 256; u0++) {
      for (const u1 of [0, 1, 2, 57, 58, 59, 200, 255]) {
        for (const u2 of [0, 1, 128, 255]) {
          for (let u3 = 0; u3 < 2; u3++) {
            const uuid = new Uint8Array([
              u0, u1, u2, u3, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
              255, u3 ^ u1,
            ]);
            const encoded = encodeBase58(uuid);
            assert.deepEqual(decodeBase58(encoded), uuid);
            if (prev !== "") {
              assert.ok(prev < encoded, `order: ${prev} < ${encoded}`);
            }
            prev = encoded;
          }
        }
      }
    }
  });

  it("rejects malformed strings", () => {
    assert.throws(() => decodeBase58("too-short"));
    assert.throws(() => decodeBase58("1234567890123456789012X")); // 23 chars, no `_`
    assert.throws(() => decodeBase58("123456789_01234567890XX")); // bad base58 char `X`? (0 is invalid)
  });

  it("fuzzes round-trips on random UUIDs", () => {
    for (let n = 0; n < 5000; n++) {
      const uuid = new Uint8Array(16);
      crypto.getRandomValues(uuid);
      const encoded = encodeBase58(uuid);
      assert.equal(encoded.length, 23);
      assert.equal(encoded[9], "_");
      assert.deepEqual(decodeBase58(encoded), uuid);
    }
  });
});

describe("padding preserves order across length changes", () => {
  // Port of TestLengthChange22to21.
  it("22->21 boundary", () => {
    for (let lastByte = 0; lastByte < 256; lastByte++) {
      const smaller = new Uint8Array([
        0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
        lastByte,
      ]);
      const larger = new Uint8Array([
        0, 1, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
        lastByte,
      ]);
      assert.equal(encodeBase58Raw(smaller).length, 22);
      assert.equal(encodeBase58Raw(larger).length, 21);
      assert.ok(encodeBase58Raw(smaller) <= encodeBase58Raw(larger));
      assert.ok(encodeBase58(smaller) <= encodeBase58(larger));
    }
  });

  // Port of TestLengthChange21to22: without padding the order *inverts*,
  // padding fixes it.
  it("21->22 boundary", () => {
    for (let lastByte = 0; lastByte < 256; lastByte++) {
      const smaller = new Uint8Array([
        0, 34, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
        lastByte,
      ]);
      const larger = new Uint8Array([
        0, 35, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
        lastByte,
      ]);
      assert.equal(encodeBase58Raw(smaller).length, 21);
      assert.equal(encodeBase58Raw(larger).length, 22);
      // Raw (unpadded) order is inverted for every lastByte.
      assert.ok(encodeBase58Raw(smaller) > encodeBase58Raw(larger));
      // Padded order is correct.
      assert.ok(encodeBase58(smaller) <= encodeBase58(larger));
      assert.deepEqual(decodeBase58(encodeBase58(smaller)), smaller);
      assert.deepEqual(decodeBase58(encodeBase58(larger)), larger);
    }
  });
});

describe("newString", () => {
  it("produces 23-char ids that are time-ordered", async () => {
    const a = newString();
    await new Promise((r) => setTimeout(r, 2));
    const b = newString();
    assert.equal(a.length, 23);
    assert.equal(b.length, 23);
    assert.ok(a < b, `${a} < ${b}`);
  });
});
