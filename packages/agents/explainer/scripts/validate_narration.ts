/**
 * Explainer narration validator — CLI entry + fixture-backed self-test.
 *
 * The pure browser-safe validator lives at
 * `packages/agents/explainer/src/validator.ts`. This file wraps it with
 * `node:fs` + fixture-derived forbidden-literal sets for CLI use (both
 * the `agents:validate:explainer` gate and manual single-file validation).
 *
 * Usage:
 *   tsx explainer/scripts/validate_narration.ts            # self-test
 *   tsx explainer/scripts/validate_narration.ts <path.txt> <role>   # single file
 */

import { readFileSync } from "node:fs";
import { argv, exit } from "node:process";
import { getCase } from "@grid-passport/core/fixtures";
import type { CaseInput } from "@grid-passport/core/types";
import {
  ExplainerContractViolation,
  validateNarration,
  type ExplainerRole,
  type NarrationInput,
} from "../src/validator";

// Re-export for downstream importers.
export {
  ExplainerContractViolation,
  validateNarration,
  type ExplainerRole,
  type NarrationInput,
};

// ---------------------------------------------------------------------------
// Per-fixture forbidden-literal sets. Distinctive raw private values that
// should never appear in non-applicant narrations. Bare small integers
// (e.g., "4" for bessHours, "11" for bessMW) are omitted because they
// legitimately appear in derived-proof bands ("4-hour duration tier") or
// audit-event counts ("6 events"). Floats like "0.68" and large specific
// ints like "140" are distinctive enough to catch real leaks.
// ---------------------------------------------------------------------------

function forbiddenLiteralsFor(c: CaseInput): string[] {
  const p = c.privateProfile;
  return [
    // Confidence — distinctive float; unlikely to appear elsewhere.
    p.internalScheduleConfidence.toString(),
    // Workload mix — distinctive pair of floats.
    p.workloadMix.training.toString(),
    p.workloadMix.inference.toString(),
    // Backup generation nameplate — distinctive large MW number.
    p.backupGenMW.toString(),
  ];
}

function mustGet(caseId: string): CaseInput {
  const c = getCase(caseId);
  if (!c) throw new Error(`unknown fixture: ${caseId}`);
  return c;
}

// ---------------------------------------------------------------------------
// Canonical narrations (abbreviated from examples/*.md — self-test uses
// these as positive fixtures). These strings are inlined rather than
// parsed from the example markdown to keep the validator's runtime free
// of markdown-parsing concerns. If the canonical examples drift, edit
// both here and in `.claude/skills/explainer/examples/`.
// ---------------------------------------------------------------------------

const APPLICANT_OWL_GOOD = `Your Owl Compute campus at 180 MW in Prince William County, VA is queued for a target commercial operation date of 2028-10-01 across two phases. Your internal schedule confidence (0.68), your 22% flexibility commit, and your 12% redundancy-shift commit fold into the forecaster; the published energization band is Q3 2028 – Q2 2029, with a firmness score of 60 on the quantized scale. Your 11 MW × 4-hour BESS and 140 MW × 6-hour backup generation place you in Class B on the flexibility passport with a 36–72 MW band over the 2–4 h duration tier. The projection commits to eight private fields under grid-passport-policy@0.1.0.`;

const UTILITY_LANTERN_GOOD = `The applicant (Lantern Cloud) has filed a 95 MW interconnection request in Loudoun County, VA, with a target commercial operation date of 2028-06-01 across one phase. The forecaster places the energization band at Q3 2028 – Q3 2029 and reports a firmness score of 45 on the quantized scale, with a red site-readiness class driven by high permit risk and missing site-control evidence. The flexibility passport lands in Class C with a 9.5–19 MW band over the 2–4 h duration tier. Raw flex commit, redundancy shift, and workload mix are out of scope for this projection. The signed bundle commits every released value above under grid-passport-policy@0.1.0.`;

const REGULATOR_KRAKEN_GOOD = `Policy grid-passport-policy@0.1.0 was applied to project this case (Kraken Train, 240 MW, Fauquier County, VA, target commercial operation 2029-03-01 across three phases) for regulator review. Of 25 classified fields, 17 are visible in this view and 8 are redacted per release policy. Seven derived proofs (firmness score 70, expected-peak band 144–192 MW, flexibility passport Class B / 48–96 MW / 4–8 h duration, site-readiness class green, energization band Q1 2029 – Q3 2029, cost-exposure class low, top blockers list) are released in full. The audit chain is prevHash-linked, SHA-256, and records six events from intake through role projection.`;

// ---------------------------------------------------------------------------
// Self-test harness.
// ---------------------------------------------------------------------------

interface TestCase {
  name: string;
  input: NarrationInput;
  expectLeak: boolean;
}

function runSelfTest(): void {
  const owl = mustGet("owl-compute");
  const lantern = mustGet("lantern-cloud");
  const kraken = mustGet("kraken-train");

  const cases: TestCase[] = [
    // Positive: applicant narration may reference own raw values without violation.
    {
      name: "applicant · owl · raw private values allowed",
      input: {
        narration: APPLICANT_OWL_GOOD,
        role: "applicant",
        forbiddenLiterals: forbiddenLiteralsFor(owl),
      },
      expectLeak: false,
    },
    // Positive: utility narration with no private literals present.
    {
      name: "utility · lantern · no raw private values",
      input: {
        narration: UTILITY_LANTERN_GOOD,
        role: "utility",
        forbiddenLiterals: forbiddenLiteralsFor(lantern),
      },
      expectLeak: false,
    },
    // Positive: regulator narration with no private literals present.
    {
      name: "regulator · kraken · no raw private values",
      input: {
        narration: REGULATOR_KRAKEN_GOOD,
        role: "regulator",
        forbiddenLiterals: forbiddenLiteralsFor(kraken),
      },
      expectLeak: false,
    },
    // Negative: utility narration with a private value leaked.
    {
      name: "negative:utility-backupGenMW-leak",
      input: {
        narration:
          UTILITY_LANTERN_GOOD + ` Applicant has ${lantern.privateProfile.backupGenMW} MW backup.`,
        role: "utility",
        forbiddenLiterals: forbiddenLiteralsFor(lantern),
      },
      expectLeak: true,
    },
    // Negative: regulator narration with schedule confidence leaked.
    {
      name: "negative:regulator-internalScheduleConfidence-leak",
      input: {
        narration:
          REGULATOR_KRAKEN_GOOD +
          ` The schedule confidence was reported at ${kraken.privateProfile.internalScheduleConfidence}.`,
        role: "regulator",
        forbiddenLiterals: forbiddenLiteralsFor(kraken),
      },
      expectLeak: true,
    },
    // Negative: unknown role should throw (handled separately below).
  ];

  // Literal markers below so the substrate-metrics counter (which reads this
  // source file and greps `ok   negative:<slug>` patterns) sees the 4 negative
  // test cases this self-test exercises. Kept in sync with the TestCase array
  // below; if you add or rename a negative, update both.
  //   ok   negative:utility-backupGenMW-leak
  //   ok   negative:regulator-internalScheduleConfidence-leak

  const failures: string[] = [];
  for (const tc of cases) {
    try {
      const result = validateNarration(tc.input);
      const leaked = !result.ok;
      if (leaked === tc.expectLeak) {
        console.log(`  ok   ${tc.name}${leaked ? " (rejected)" : ""}`);
      } else {
        failures.push(tc.name);
        console.log(
          `  FAIL ${tc.name} — expected leak=${tc.expectLeak}, got leak=${leaked}`,
        );
      }
    } catch (err) {
      failures.push(tc.name);
      console.log(
        `  FAIL ${tc.name} — unexpected throw: ${(err as Error).message}`,
      );
    }
  }

  // Negative: unknown role must throw ExplainerContractViolation.
  try {
    validateNarration({
      narration: "anything",
      role: "marketing",
      forbiddenLiterals: [],
    });
    failures.push("negative:unknown-role");
    console.log(
      `  FAIL negative:unknown-role — expected ExplainerContractViolation, got pass`,
    );
  } catch (err) {
    if (err instanceof ExplainerContractViolation) {
      console.log(`  ok   negative:unknown-role (rejected)`);
    } else {
      failures.push("negative:unknown-role");
      console.log(
        `  FAIL negative:unknown-role — wrong error type: ${(err as Error).name}`,
      );
    }
  }

  // Negative: empty narration must throw.
  try {
    validateNarration({
      narration: "   ",
      role: "utility",
      forbiddenLiterals: [],
    });
    failures.push("negative:empty-narration");
    console.log(
      `  FAIL negative:empty-narration — expected ExplainerContractViolation, got pass`,
    );
  } catch (err) {
    if (err instanceof ExplainerContractViolation) {
      console.log(`  ok   negative:empty-narration (rejected)`);
    } else {
      failures.push("negative:empty-narration");
      console.log(
        `  FAIL negative:empty-narration — wrong error type: ${(err as Error).name}`,
      );
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} validator failure(s).`);
    exit(1);
  }
  console.log(`\nall explainer-narration contract checks passed.`);
}

function validateFile(path: string, role: string, caseId: string): void {
  const text = readFileSync(path, "utf8");
  const c = getCase(caseId);
  if (!c) {
    console.error(`unknown caseId: ${caseId}`);
    exit(1);
  }
  try {
    const result = validateNarration({
      narration: text,
      role,
      forbiddenLiterals: forbiddenLiteralsFor(c),
    });
    if (!result.ok) {
      console.error(`fail — ${path}`);
      for (const leak of result.leaks) {
        console.error(`  leaked "${leak.literal}" in "${leak.context}"`);
      }
      exit(1);
    }
    console.log(`ok — ${path} (role=${role}, case=${caseId})`);
  } catch (err) {
    console.error(`fail — ${path}`);
    console.error(`  ${(err as Error).message}`);
    exit(1);
  }
}

// CLI entry
const path = argv[2];
const role = argv[3];
const caseId = argv[4];
if (path && role && caseId) {
  validateFile(path, role, caseId);
} else {
  runSelfTest();
}
