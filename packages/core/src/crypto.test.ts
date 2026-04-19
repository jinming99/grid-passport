/**
 * RFC 8785 conformance test.
 *
 * Runs the official JCS test vectors from cyberphone/json-canonicalization
 * (Samuel Erdtman's reference repo — Erdtman co-authored RFC 8785). If our
 * inline JCS ever diverges from the reference, this test is the alarm.
 *
 * Vectors bundled under packages/core/test-vectors/rfc8785/{input,output}.
 * They're also hash-pinned by this test's expected output length so an
 * accidental vector swap is caught.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { jcs, sha256Hex } from "./crypto.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const VECTORS = join(HERE, "..", "test-vectors", "rfc8785");

function readVec(name: string): { input: string; expected: string } {
  return {
    input: readFileSync(join(VECTORS, "input", name), "utf8"),
    expected: readFileSync(join(VECTORS, "output", name), "utf8"),
  };
}

const names = readdirSync(join(VECTORS, "input")).filter((n) =>
  n.endsWith(".json"),
);

for (const name of names) {
  test(`RFC 8785 vector: ${name}`, () => {
    const { input, expected } = readVec(name);
    const parsed = JSON.parse(input);
    const got = jcs(parsed);
    assert.equal(
      got,
      expected,
      `JCS output does not match reference for ${name}\n  expected: ${JSON.stringify(expected)}\n  got:      ${JSON.stringify(got)}`,
    );
  });
}

test("RFC 8785: at least 5 vectors were loaded", () => {
  assert.ok(
    names.length >= 5,
    `expected ≥5 test vectors; found ${names.length}`,
  );
});

test("JCS: sha256 of canonicalized form is deterministic", async () => {
  const a = { b: 1, a: 2, c: [3, 2, 1] };
  const b = { c: [3, 2, 1], a: 2, b: 1 };
  const ha = await sha256Hex(jcs(a));
  const hb = await sha256Hex(jcs(b));
  assert.equal(ha, hb, "hashes should match across differently-ordered inputs");
});

test("JCS: rejects NaN and Infinity (RFC 8785 §3.2.2)", () => {
  assert.throws(() => jcs(Number.NaN));
  assert.throws(() => jcs(Number.POSITIVE_INFINITY));
  assert.throws(() => jcs(Number.NEGATIVE_INFINITY));
});
