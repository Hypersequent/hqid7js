import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fromTimestamp, parse, uuid7 } from "../src/index.ts";

const toBinary = (u: Uint8Array): string =>
  Array.from(u, (b) => b.toString(2).padStart(8, "0")).join("");

describe("uuid7 binary layout (RFC 9562)", () => {
  it("sets the timestamp, version and variant fields correctly", () => {
    let prev = "";
    for (let i = 0; i < 120; i++) {
      const millis = Date.now() + i; // strictly increasing ms
      const uuid = fromTimestamp(millis);
      const bits = toBinary(uuid);

      // unix_ts_ms occupies bits 0..47.
      const expected = millis.toString(2).padStart(48, "0");
      assert.equal(bits.slice(0, 48), expected, "unix_ts_ms");

      // ver occupies bits 48..51, set to 0b0111.
      assert.equal(bits.slice(48, 52), "0111", "version");

      // var occupies bits 64..65, set to 0b10.
      assert.equal(bits.slice(64, 66), "10", "variant");

      if (prev !== "") assert.ok(bits > prev, "monotonic by timestamp");
      prev = bits;
    }
  });

  it("round-trips through parse()", () => {
    const millis = 1_695_383_315_074; // 2023-09-22T11:48:35.074Z
    const info = parse(fromTimestamp(millis));
    assert.equal(info.timestampMillis, millis);
    assert.equal(info.version, 7);
    assert.equal(info.variant, 2);
    assert.equal(info.date.toISOString(), "2023-09-22T11:48:35.074Z");
  });

  it("fills sub-millisecond precision from the fractional part", () => {
    // 0.5 ms -> floor(0.5 * 4096) = 2048
    assert.equal(parse(fromTimestamp(1000.5)).subMillisPrecision, 2048);
    assert.equal(parse(fromTimestamp(1000)).subMillisPrecision, 0);
  });

  it("uuid7() returns 16 bytes with a current timestamp", () => {
    const before = Date.now();
    const info = parse(uuid7());
    const after = Date.now();
    assert.ok(info.timestampMillis >= before - 1);
    assert.ok(info.timestampMillis <= after + 1);
    assert.equal(info.version, 7);
    assert.equal(info.variant, 2);
  });
});
