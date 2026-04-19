/**
 * Emit a freshly-signed bundle to disk for cross-implementation testing.
 *
 * Usage: tsx packages/verifier/scripts/emit-fixture.ts <out-dir>
 *   writes: <out-dir>/bundle.json
 *           <out-dir>/pubkey.b64
 *           <out-dir>/secret.b64   (for round-trip re-signing only — do
 *                                   NOT use this as a real identity key)
 *
 * Consumed by the Python parity verifier and the e2e demo script.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as ed from "@noble/ed25519";
import {
  signBundle,
  localSigner,
  newBundleId,
  bytesToBase64,
} from "@grid-passport/core/bundle";
import { getCase, CASE_METAS } from "@grid-passport/core/fixtures";
import { buildRecord } from "@grid-passport/core/forecast";
import { projectForRole } from "@grid-passport/core/projection";
import { buildAuditTrail } from "@grid-passport/core/audit";
import { POLICY_VERSION } from "@grid-passport/core/policy";
import type { Role } from "@grid-passport/core/types";

const ROLES: Role[] = ["applicant", "utility", "regulator"];

async function main() {
  const outDir = resolve(process.argv[2] ?? "/tmp/grid-passport-bundle");
  mkdirSync(outDir, { recursive: true });

  const caseId = process.argv[3] ?? CASE_METAS[0].caseId;
  const input = getCase(caseId);
  if (!input) throw new Error(`unknown case: ${caseId}`);

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
      issuerLabel: `Fixture Applicant · ${caseId}`,
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

  writeFileSync(join(outDir, "bundle.json"), JSON.stringify(bundle, null, 2));
  writeFileSync(join(outDir, "payload.json"), JSON.stringify(bundle.payload, null, 2));
  writeFileSync(join(outDir, "pubkey.b64"), bytesToBase64(signer.publicKey));
  writeFileSync(join(outDir, "secret.b64"), bytesToBase64(secret));

  process.stdout.write(`[emit-fixture] wrote ${outDir}/bundle.json\n`);
  process.stdout.write(`[emit-fixture] wrote ${outDir}/pubkey.b64\n`);
  process.stdout.write(`[emit-fixture] caseId=${caseId} · keyId=${bundle.payload.issuer.keyId}\n`);
}

main().catch((err) => {
  process.stderr.write(`[emit-fixture] error: ${err}\n`);
  process.exit(1);
});
