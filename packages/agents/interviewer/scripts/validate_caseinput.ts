/**
 * Interviewer output validator — CLI entry + fixture-backed self-test.
 *
 * The pure browser-safe validator function lives at
 * `packages/agents/interviewer/src/validator.ts` so the Tauri webview
 * (apps/desktop/) can import it under Track 2.1. This file wraps it with
 * `node:fs` + `getCase`-backed fixtures for CLI use (both the `agents:validate`
 * gate and manual single-file validation).
 *
 * This is the first empirical check for the research-thesis §3.2 claim:
 *   "the Interviewer is structurally incapable of writing outside its scope."
 * A failure here is a contract violation, not a warning.
 *
 * Usage:
 *   tsx interviewer/scripts/validate_caseinput.ts            # runs self-test against fixtures
 *   tsx interviewer/scripts/validate_caseinput.ts <path.json> # validates a single file
 */

import { readFileSync } from "node:fs";
import { argv, exit } from "node:process";
import { getCase } from "@grid-passport/core/fixtures";
import type { CaseInput } from "@grid-passport/core/types";
import {
  InterviewerContractViolation,
  validateInterviewerOutput,
} from "../src/validator";

// Re-export for downstream consumers that already import from this CLI file.
export { InterviewerContractViolation, validateInterviewerOutput };

// ---------------------------------------------------------------------------
// Self-test: derive Interviewer-shaped outputs from the 3 canonical fixtures
// by stripping the non-Interviewer-writable sections, then validate.
// ---------------------------------------------------------------------------

function stripToInterviewerScope(
  c: CaseInput,
): Record<string, unknown> {
  const stripped: Record<string, unknown> = {
    applicantOrg: c.applicantOrg,
    requestedMW: c.requestedMW,
    targetCOD: c.targetCOD,
    phases: c.phases,
    status: "draft",
    site: { ...c.site },
    customerContact: { ...c.customerContact },
    loadType: c.loadType,
    connectionVoltageKV: c.connectionVoltageKV,
    netMetered: c.netMetered,
    privateProfile: {
      flexPercent: c.privateProfile.flexPercent,
      redundancyShiftPercent: c.privateProfile.redundancyShiftPercent,
      backupGenHours: c.privateProfile.backupGenHours,
      backupGenMW: c.privateProfile.backupGenMW,
      bessMW: c.privateProfile.bessMW,
      bessHours: c.privateProfile.bessHours,
      internalScheduleConfidence: c.privateProfile.internalScheduleConfidence,
      workloadMix: { ...c.privateProfile.workloadMix },
    },
  };
  if (c.nettedGenerationStation !== undefined) {
    stripped.nettedGenerationStation = c.nettedGenerationStation;
  }
  return stripped;
}

function mustGet(caseId: string): CaseInput {
  const c = getCase(caseId);
  if (!c) {
    throw new Error(`unknown fixture caseId: ${caseId}`);
  }
  return c;
}

function runSelfTest(): void {
  const cases: Array<{ name: string; fixture: CaseInput }> = [
    { name: "owl-compute", fixture: mustGet("owl-compute") },
    { name: "lantern-cloud", fixture: mustGet("lantern-cloud") },
    { name: "kraken-train", fixture: mustGet("kraken-train") },
  ];

  const failures: Array<{ name: string; err: Error }> = [];
  for (const { name, fixture } of cases) {
    const candidate = stripToInterviewerScope(fixture);
    try {
      validateInterviewerOutput(candidate);
      console.log(`  ok   ${name}`);
    } catch (err) {
      failures.push({ name, err: err as Error });
      console.log(`  FAIL ${name} — ${(err as Error).message}`);
    }
  }

  // Negative test: publicEvidence populated should fail.
  const leaky = {
    ...stripToInterviewerScope(mustGet("owl-compute")),
    publicEvidence: {
      floodRisk: "low",
      permitRisk: "medium",
      zoningRisk: "low",
      siteControlEvidence: true,
      sourceRefs: [],
      notes: [],
    },
  };
  try {
    validateInterviewerOutput(leaky);
    failures.push({
      name: "negative:publicEvidence-populated",
      err: new Error("expected write-scope violation but validator passed"),
    });
    console.log(
      `  FAIL negative:publicEvidence-populated — validator did not catch write-scope violation`,
    );
  } catch (err) {
    if (err instanceof InterviewerContractViolation) {
      console.log(`  ok   negative:publicEvidence-populated (rejected)`);
    } else {
      failures.push({ name: "negative:publicEvidence-populated", err: err as Error });
    }
  }

  // Negative test: derivedProof present should fail.
  const forecastBleed = {
    ...stripToInterviewerScope(mustGet("owl-compute")),
    derivedProof: { firmnessScore: 59 },
  };
  try {
    validateInterviewerOutput(forecastBleed);
    failures.push({
      name: "negative:derivedProof-present",
      err: new Error("expected write-scope violation but validator passed"),
    });
    console.log(
      `  FAIL negative:derivedProof-present — validator did not catch write-scope violation`,
    );
  } catch (err) {
    if (err instanceof InterviewerContractViolation) {
      console.log(`  ok   negative:derivedProof-present (rejected)`);
    } else {
      failures.push({ name: "negative:derivedProof-present", err: err as Error });
    }
  }

  // Negative test: workloadMix sum ≠ 1.0 should fail.
  const badMix = stripToInterviewerScope(mustGet("owl-compute"));
  (badMix.privateProfile as Record<string, unknown>).workloadMix = {
    training: 0.6,
    inference: 0.6,
  };
  try {
    validateInterviewerOutput(badMix);
    failures.push({
      name: "negative:workloadMix-sum",
      err: new Error("expected sum-check failure but validator passed"),
    });
    console.log(`  FAIL negative:workloadMix-sum — sum-check not enforced`);
  } catch (err) {
    if (err instanceof InterviewerContractViolation) {
      console.log(`  ok   negative:workloadMix-sum (rejected)`);
    } else {
      failures.push({ name: "negative:workloadMix-sum", err: err as Error });
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} validator failure(s).`);
    exit(1);
  }
  console.log(`\nall interviewer-output contract checks passed.`);
}

function validateFile(path: string): void {
  const text = readFileSync(path, "utf8");
  const raw: unknown = JSON.parse(text);
  try {
    validateInterviewerOutput(raw);
    console.log(`ok — ${path}`);
  } catch (err) {
    console.error(`fail — ${path}`);
    console.error(`  ${(err as Error).message}`);
    exit(1);
  }
}

// CLI entry
const fileArg = argv[2];
if (fileArg) {
  validateFile(fileArg);
} else {
  runSelfTest();
}
