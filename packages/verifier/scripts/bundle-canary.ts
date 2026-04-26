/**
 * End-to-end bundle canary:
 *   1. Build a real case's projections + audit chain
 *   2. Sign a bundle with a fresh Ed25519 keypair
 *   3. Verify → must pass
 *   4. Tamper one byte → verify must fail
 *
 * Intended as a CI gate for the signed-bundle protocol. Output is parseable:
 *   [bundle-canary] sign ok
 *   [bundle-canary] verify ok · keyId=<hex>
 *   [bundle-canary] tamper rejected ok
 *   [bundle-canary] all clear
 */
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
import { verifyBundle } from "../src/index.ts";

const ROLES: Role[] = ["applicant", "utility", "regulator"];

function fail(msg: string): never {
  process.stderr.write(`[bundle-canary] FAIL · ${msg}\n`);
  process.exit(1);
}

async function main() {
  for (const meta of CASE_METAS) {
    const input = getCase(meta.caseId)!;
    const record = buildRecord(input);
    const projections = {} as Record<Role, ReturnType<typeof projectForRole>>;
    for (const r of ROLES) projections[r] = projectForRole(record, r);
    const auditChain = await buildAuditTrail(input, record, "utility", undefined);

    const secretKey = ed.utils.randomSecretKey();
    const signer = await localSigner(secretKey);

    const bundle = await signBundle(
      {
        bundleId: newBundleId(),
        caseId: input.caseId,
        requestId: input.id,
        issuerLabel: `Canary Applicant · ${meta.caseId}`,
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
    process.stdout.write(`[bundle-canary] sign ok · ${meta.caseId}\n`);

    const ok = await verifyBundle(JSON.stringify(bundle), signer.publicKey);
    if (!ok.ok) fail(`verify failed for ${meta.caseId}: ${ok.reasons.join("; ")}`);
    process.stdout.write(
      `[bundle-canary] verify ok · ${meta.caseId} · keyId=${ok.payload?.issuer.keyId}\n`,
    );

    const tampered = JSON.parse(JSON.stringify(bundle));
    tampered.payload.auditChain[0].action = "FORGED";
    const bad = await verifyBundle(JSON.stringify(tampered), signer.publicKey);
    if (bad.ok) fail(`tampered bundle should fail for ${meta.caseId}`);
    process.stdout.write(
      `[bundle-canary] tamper rejected ok · ${meta.caseId} · ${bad.reasons.length} reason(s)\n`,
    );
  }

  process.stdout.write(
    `[bundle-canary] all clear · bundle v1.0.0 · ${CASE_METAS.length} case(s)\n`,
  );
}

main().catch((err) => fail(String(err)));
