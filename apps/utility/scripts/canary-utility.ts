/**
 * Gate 15 — canary:utility.
 *
 * Three guards over the utility binary:
 *
 *  (i) Write-scope guard at the import graph. `apps/utility/src` MUST NOT
 *      import any of @grid-passport/core/{fixtures, forecast, audit} —
 *      those are the applicant-side writers. The utility has no source of
 *      raw CaseInput values, so no runtime path can reconstruct a raw
 *      private profile. This enforces the structural claim in the sprint
 *      plan ("option B — import-graph-level write-scope").
 *
 * (ii) Positive: at least one file under apps/utility/src must import
 *      `@grid-passport/verifier`. Without this the utility has no
 *      verification path; the whole point of the binary is absent.
 *
 * (iii) End-to-end parity: sign a fresh bundle (from this script, which
 *       lives outside src/ and is allowed to pull fixtures for test data),
 *       verify → must pass, tamper → must fail. Proves the import chain
 *       actually works beyond typecheck.
 *
 * Fixture helpers live in scripts/, NOT src/ — the grep restriction in (i)
 * targets src/ only. Importing @grid-passport/core/fixtures here is a test
 * affordance, not a runtime capability of the shipped utility binary.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as ed from "@noble/ed25519";
import {
  signBundle,
  localSigner,
  newBundleId,
} from "@grid-passport/core/bundle";
import { getCase } from "@grid-passport/core/fixtures";
import { buildRecord } from "@grid-passport/core/forecast";
import { projectForRole } from "@grid-passport/core/projection";
import { buildAuditTrail } from "@grid-passport/core/audit";
import { POLICY_VERSION } from "@grid-passport/core/policy";
import type { Role } from "@grid-passport/core/types";
import { verifyBundle } from "@grid-passport/verifier";

const HERE = dirname(fileURLToPath(import.meta.url));
const UTILITY_SRC = join(HERE, "..", "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (p.endsWith(".ts") || p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

function fail(msg: string): never {
  process.stderr.write(`[canary:utility] FAIL · ${msg}\n`);
  process.exit(1);
}

// ----------------------------------------------------------------------------
// (i) Write-scope import guard.
// ----------------------------------------------------------------------------

const FORBIDDEN = [
  "@grid-passport/core/fixtures",
  "@grid-passport/core/forecast",
  "@grid-passport/core/audit",
];

const srcFiles = walk(UTILITY_SRC);
const violations: string[] = [];
for (const f of srcFiles) {
  const text = readFileSync(f, "utf8");
  for (const banned of FORBIDDEN) {
    if (text.includes(banned)) {
      violations.push(`${f.replace(UTILITY_SRC, "src")} imports ${banned}`);
    }
  }
}
if (violations.length > 0) {
  process.stderr.write("[canary:utility] FAIL · forbidden imports in src/:\n");
  for (const v of violations) process.stderr.write(`  - ${v}\n`);
  process.stderr.write(
    "  Utility has no runtime need for applicant-side writers. If this import is legitimate, reconsider the architecture.\n",
  );
  process.exit(1);
}
console.log(
  `[canary:utility] write-scope guard: pass (${srcFiles.length} src file${srcFiles.length === 1 ? "" : "s"} scanned; 0 forbidden imports)`,
);

// ----------------------------------------------------------------------------
// (ii) Positive: verifier must be imported somewhere in src/.
// ----------------------------------------------------------------------------

const verifierImporters = srcFiles.filter((f) =>
  readFileSync(f, "utf8").includes("@grid-passport/verifier"),
);
if (verifierImporters.length === 0) {
  fail("no apps/utility/src file imports @grid-passport/verifier — the utility has no verification path.");
}
console.log(
  `[canary:utility] verifier wiring: pass (${verifierImporters.length} file${verifierImporters.length === 1 ? "" : "s"} import @grid-passport/verifier)`,
);

// ----------------------------------------------------------------------------
// (iii) Sign + verify + tamper + reject on a fresh owl-compute bundle.
// ----------------------------------------------------------------------------

async function e2e(): Promise<void> {
  const input = getCase("owl-compute")!;
  const record = buildRecord(input);
  const ROLES: Role[] = ["applicant", "utility", "regulator"];
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
      issuerLabel: "Canary Applicant · owl-compute",
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

  const ok = await verifyBundle(JSON.stringify(bundle), signer.publicKey);
  if (!ok.ok) {
    fail(`verify failed on fresh bundle: ${ok.reasons.join("; ")}`);
  }
  console.log(
    `[canary:utility] verify fresh bundle: pass (keyId=${ok.payload?.issuer.keyId})`,
  );

  const tampered = JSON.parse(JSON.stringify(bundle));
  tampered.payload.projections.utility.policyVersion = "grid-passport-policy@99.9.9";
  const bad = await verifyBundle(JSON.stringify(tampered), signer.publicKey);
  if (bad.ok) {
    fail("tampered bundle passed verification — verifier is broken or bundle signature binding is weak.");
  }
  console.log(
    `[canary:utility] tamper rejected: pass (${bad.reasons.length} reason${bad.reasons.length === 1 ? "" : "s"})`,
  );
}

await e2e();

console.log("[canary:utility] all clear");
