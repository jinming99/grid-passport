/**
 * Interviewer output validator.
 *
 * Enforces the write-scope contract declared in SKILL.md:
 *   - identity, operational, sensitive bucket fields MAY be populated
 *   - `publicEvidence` MUST be empty / absent (Cartographer's scope)
 *   - `derivedProof` MUST NOT be present (Forecaster's scope)
 *   - `status` MUST be "draft" on Interviewer hand-off
 *   - structural shapes + types must match @grid-passport/core/types CaseInput
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

export class InterviewerContractViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InterviewerContractViolation";
  }
}

function requireString(
  obj: Record<string, unknown>,
  key: string,
  ctx: string,
): string {
  const v = obj[key];
  if (typeof v !== "string") {
    throw new InterviewerContractViolation(`${ctx}.${key} must be a string`);
  }
  return v;
}

function requireNumber(
  obj: Record<string, unknown>,
  key: string,
  ctx: string,
): number {
  const v = obj[key];
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new InterviewerContractViolation(
      `${ctx}.${key} must be a finite number`,
    );
  }
  return v;
}

function requireObject(
  obj: Record<string, unknown>,
  key: string,
  ctx: string,
): Record<string, unknown> {
  const v = obj[key];
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    throw new InterviewerContractViolation(`${ctx}.${key} must be an object`);
  }
  return v as Record<string, unknown>;
}

/**
 * Validate an Interviewer hand-off output.
 *
 * Accepts a raw object (typically parsed JSON). Enforces shape, types, and
 * the write-scope contract. Throws `InterviewerContractViolation` on the
 * first violation with a path-scoped message.
 */
export function validateInterviewerOutput(raw: unknown): CaseInput {
  if (typeof raw !== "object" || raw === null) {
    throw new InterviewerContractViolation(
      "top-level value must be a JSON object",
    );
  }
  const r = raw as Record<string, unknown>;

  requireString(r, "applicantOrg", "root");
  requireNumber(r, "requestedMW", "root");
  requireString(r, "targetCOD", "root");
  requireNumber(r, "phases", "root");

  const status = requireString(r, "status", "root");
  if (status !== "draft") {
    throw new InterviewerContractViolation(
      `status must be "draft" on Interviewer hand-off (got "${status}"); ` +
        `Interviewer does not advance workflow state`,
    );
  }

  const site = requireObject(r, "site", "root");
  requireString(site, "state", "site");
  requireString(site, "county", "site");
  requireString(site, "parcelId", "site");
  requireString(site, "displayName", "site");

  const pp = requireObject(r, "privateProfile", "root");
  const numericPrivateKeys = [
    "flexPercent",
    "redundancyShiftPercent",
    "backupGenHours",
    "backupGenMW",
    "bessMW",
    "bessHours",
    "internalScheduleConfidence",
  ] as const;
  for (const key of numericPrivateKeys) {
    requireNumber(pp, key, "privateProfile");
  }
  const mix = requireObject(pp, "workloadMix", "privateProfile");
  const training = requireNumber(mix, "training", "workloadMix");
  const inference = requireNumber(mix, "inference", "workloadMix");
  const sum = training + inference;
  if (Math.abs(sum - 1.0) > 0.02) {
    throw new InterviewerContractViolation(
      `workloadMix.training + workloadMix.inference must sum to ~1.0 ` +
        `(got ${sum.toFixed(3)}); Interviewer sum-check failed`,
    );
  }

  // Write-scope contract: publicEvidence must be structurally absent or empty.
  // The Interviewer never writes this section; Cartographer does.
  if ("publicEvidence" in r) {
    const pe = r.publicEvidence;
    if (pe !== null && pe !== undefined) {
      if (typeof pe !== "object" || Array.isArray(pe)) {
        throw new InterviewerContractViolation(
          "publicEvidence, if present, must be an empty object {} or null; " +
            "the Interviewer is not allowed to write this section",
        );
      }
      const peKeys = Object.keys(pe as Record<string, unknown>).filter(
        (k) => (pe as Record<string, unknown>)[k] !== undefined,
      );
      if (peKeys.length > 0) {
        throw new InterviewerContractViolation(
          `publicEvidence must be empty on Interviewer hand-off ` +
            `(found keys: ${peKeys.join(", ")}); write-scope violation — ` +
            `that section belongs to Cartographer`,
        );
      }
    }
  }

  // Write-scope contract: derivedProof must not be present at all.
  // That section is Forecaster's / Referee's scope; any value here is a leak.
  if ("derivedProof" in r) {
    throw new InterviewerContractViolation(
      "derivedProof must not be present on Interviewer hand-off; " +
        "that section is populated downstream by Forecaster/Referee",
    );
  }

  return raw as CaseInput;
}

// ---------------------------------------------------------------------------
// Self-test: derive Interviewer-shaped outputs from the 3 canonical fixtures
// by stripping the non-Interviewer-writable sections, then validate.
// ---------------------------------------------------------------------------

function stripToInterviewerScope(
  c: CaseInput,
): Record<string, unknown> {
  return {
    applicantOrg: c.applicantOrg,
    requestedMW: c.requestedMW,
    targetCOD: c.targetCOD,
    phases: c.phases,
    status: "draft",
    site: { ...c.site },
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
