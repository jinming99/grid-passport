/**
 * Fuzz test: random mutation → must reject.
 *
 * Generates a freshly-signed bundle, then randomly mutates N bytes of the
 * serialized form across K iterations. The verifier MUST reject every
 * mutation. A single ok:true result is a failing test.
 *
 * Turns the deterministic tamper matrix (T1–T4) into a property:
 *   ∀ mutation m ≠ identity: verify(m(bundle), pk) = reject
 *
 * Uses Node's built-in random for speed; not a cryptographic fuzzer, just
 * a surface-coverage check. Scale iterations with env GP_FUZZ_ITERS.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as ed from "@noble/ed25519";
import {
  signBundle,
  localSigner,
  newBundleId,
} from "@grid-passport/core/bundle";
import { getCase, CASE_METAS } from "@grid-passport/core/fixtures";
import { buildRecord } from "@grid-passport/core/forecast";
import { projectForRole } from "@grid-passport/core/projection";
import { buildAuditTrail } from "@grid-passport/core/audit";
import { POLICY_VERSION } from "@grid-passport/core/policy";
import type { Role } from "@grid-passport/core/types";
import { verifyBundle } from "./index.ts";

const ITERATIONS = Number.parseInt(process.env.GP_FUZZ_ITERS ?? "2000", 10);
const ROLES: Role[] = ["applicant", "utility", "regulator"];

function randInt(max: number) {
  return Math.floor(Math.random() * max);
}

/**
 * Byte-level mutation of the bundle text. We mutate the payload section
 * specifically, because mutating the top-level wrapper ({schema, version})
 * should also fail — but those are structural and caught before the
 * signature check. The interesting property is: every mutation inside
 * the signed payload region produces rejection.
 */
function mutate(text: string): string {
  const payloadIdx = text.indexOf('"payload"');
  const sigIdx = text.indexOf('"signature"', payloadIdx);
  if (payloadIdx < 0 || sigIdx < 0) return text;

  const lo = payloadIdx;
  const hi = sigIdx;

  const i = lo + randInt(hi - lo);
  const original = text.charCodeAt(i);
  // Pick a different printable character to keep the bundle parseable
  let replacement = 0x20 + randInt(94); // 0x20..0x7d
  if (replacement === original) replacement = (replacement + 1) & 0x7f;
  return text.slice(0, i) + String.fromCharCode(replacement) + text.slice(i + 1);
}

test(`fuzz: ${ITERATIONS} random byte-flips in payload → all rejected`, async () => {
  const input = getCase(CASE_METAS[0].caseId)!;
  const record = buildRecord(input);
  const projections = {} as Record<Role, ReturnType<typeof projectForRole>>;
  for (const r of ROLES) projections[r] = projectForRole(record, r);
  const auditChain = await buildAuditTrail(input, record, "utility", undefined);

  const secret = ed.utils.randomSecretKey();
  const signer = await localSigner(secret);
  const bundle = await signBundle(
    {
      bundleId: newBundleId(),
      caseId: input.caseId,
      requestId: input.id,
      issuerLabel: "fuzz applicant",
      policyHash: {
        rego: "sha256:" + "a".repeat(64),
        runtime: "sha256:" + "b".repeat(64),
      },
      policyVersion: POLICY_VERSION,
      projections,
      auditChain,
    },
    signer,
  );

  const text = JSON.stringify(bundle);
  let invalid = 0;
  let parseErrors = 0;
  let accepted = 0;

  for (let i = 0; i < ITERATIONS; i++) {
    const mutated = mutate(text);
    if (mutated === text) continue;
    const res = await verifyBundle(mutated, signer.publicKey);
    if (res.ok) {
      accepted++;
      assert.fail(
        `mutation #${i} was accepted: diff at position ${[...text].findIndex((c, j) => c !== mutated[j])}`,
      );
    }
    if (res.reasons.some((r) => r.includes("not valid JSON"))) parseErrors++;
    else invalid++;
  }

  assert.equal(accepted, 0, `fuzz saw ${accepted} false positives`);
  // Minimal sanity: at least a few mutations produced non-JSON-parse failures,
  // i.e. the mutation hit something inside the JSON structure that parsed fine
  // but invalidated the signature.
  assert.ok(
    invalid > 0,
    `fuzz needs to exercise structural-integrity rejection at least once (got 0)`,
  );
});
