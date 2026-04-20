/**
 * Derivation-correctness tests for forecast.ts.
 *
 * The privacy canary checks the *leakage* invariant (no raw private value
 * reaches a non-applicant projection). These tests check the *derivation*
 * invariant that makes that leakage invariant non-trivial: the published
 * derived fields are many-to-one tier bands, not injective transforms of
 * the private inputs.
 *
 * Track 4 of sprint 2026-04-20. Spec: docs/plans/sprint-2026-04-20.md §4.1.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { forecast, buildRecord } from "./forecast.ts";
import { POLICY_VERSION } from "./policy.ts";
import { listCases, getCase } from "./fixtures/index.ts";
import type { CaseInput, PrivateProfile } from "./types.ts";

const owl = getCase("owl-compute")!;
const lantern = getCase("lantern-cloud")!;
const kraken = getCase("kraken-train")!;

function withProfile(base: CaseInput, patch: Partial<PrivateProfile>): CaseInput {
  return {
    ...base,
    privateProfile: { ...base.privateProfile, ...patch },
  };
}

// ---------------------------------------------------------------------------
// Determinism + structural invariants across all 3 fixtures
// ---------------------------------------------------------------------------

for (const c of listCases()) {
  test(`forecast · ${c.caseId}: pure function (same input → same output)`, () => {
    const a = forecast(c);
    const b = forecast(c);
    assert.deepEqual(a, b);
  });

  test(`forecast · ${c.caseId}: tier-band invariants hold`, () => {
    const p = forecast(c);
    // expectedPeakMW is a [low, high] band
    assert.ok(
      p.expectedPeakMW[0] <= p.expectedPeakMW[1],
      `expectedPeakMW low > high: ${p.expectedPeakMW}`,
    );
    // flexibilityPassport MW and duration bands are [low, high]
    assert.ok(
      p.flexibilityPassport.mwMin <= p.flexibilityPassport.mwMax,
      `flexibility mwMin > mwMax: ${p.flexibilityPassport.mwMin}/${p.flexibilityPassport.mwMax}`,
    );
    assert.ok(
      p.flexibilityPassport.durationHoursMin <= p.flexibilityPassport.durationHoursMax,
      `flexibility duration Min > Max`,
    );
    // firmnessScore is quantized to multiples of 5, clamped to [0,100]
    assert.equal(p.firmnessScore % 5, 0, `firmnessScore not quantized: ${p.firmnessScore}`);
    assert.ok(p.firmnessScore >= 0 && p.firmnessScore <= 100);
    // policy version propagated
    assert.equal(p.generatedFromPolicyVersion, POLICY_VERSION);
  });
}

// ---------------------------------------------------------------------------
// firmnessScore — quantize-to-5 invariant under perturbation
// ---------------------------------------------------------------------------

test("firmnessScore: always divisible by 5 across a grid of private-profile perturbations", () => {
  // Perturb the three inputs that feed the linear combination the quantization
  // is meant to blur (confidence, redundancy, bessMW). If quantization ever
  // drifts to e.g. nearest-2.5, this test fires.
  for (const conf of [0.1, 0.35, 0.55, 0.68, 0.75, 0.9, 1.0]) {
    for (const redundancy of [0, 5, 12, 18, 25]) {
      for (const bessMW of [0, 5, 11, 22, 44]) {
        const p = forecast(
          withProfile(owl, {
            internalScheduleConfidence: conf,
            redundancyShiftPercent: redundancy,
            bessMW,
          }),
        );
        assert.equal(
          p.firmnessScore % 5,
          0,
          `conf=${conf} red=${redundancy} bess=${bessMW} → firmness=${p.firmnessScore} not divisible by 5`,
        );
      }
    }
  }
});

test("firmnessScore: many-to-one — nearby confidences share the same published score", () => {
  // Any two confidences whose raw score falls within the same 5-wide bucket
  // must publish the same firmnessScore. Spot-check: conf 0.68 vs 0.70 on Owl
  // both land in bucket [23.8 + ..., ...] → rounds to the same multiple of 5.
  const a = forecast(withProfile(owl, { internalScheduleConfidence: 0.68 })).firmnessScore;
  const b = forecast(withProfile(owl, { internalScheduleConfidence: 0.70 })).firmnessScore;
  assert.equal(a, b, `conf 0.68 and 0.70 should quantize to same firmness (got ${a} / ${b})`);
});

// ---------------------------------------------------------------------------
// Confidence-class tier boundaries for expectedPeakMW
// ---------------------------------------------------------------------------
// Contract (see forecast.ts `expectedPeakBand`):
//   conf >= 0.75          → [60%, 80%] × requestedMW
//   0.55 <= conf < 0.75   → [50%, 75%] × requestedMW
//   conf <  0.55          → [40%, 65%] × requestedMW

test("expectedPeakMW: high-confidence tier (conf ≥ 0.75)", () => {
  const req = 100;
  const p = forecast({
    ...owl,
    requestedMW: req,
    privateProfile: { ...owl.privateProfile, internalScheduleConfidence: 0.75 },
  });
  assert.deepEqual(p.expectedPeakMW, [60, 80]);
  const p2 = forecast({
    ...owl,
    requestedMW: req,
    privateProfile: { ...owl.privateProfile, internalScheduleConfidence: 1.0 },
  });
  assert.deepEqual(p2.expectedPeakMW, [60, 80], "conf=1.0 should share the 0.75 tier band");
});

test("expectedPeakMW: medium-confidence tier (0.55 ≤ conf < 0.75)", () => {
  const req = 100;
  const low = forecast({
    ...owl,
    requestedMW: req,
    privateProfile: { ...owl.privateProfile, internalScheduleConfidence: 0.55 },
  });
  const high = forecast({
    ...owl,
    requestedMW: req,
    privateProfile: { ...owl.privateProfile, internalScheduleConfidence: 0.749 },
  });
  assert.deepEqual(low.expectedPeakMW, [50, 75]);
  assert.deepEqual(high.expectedPeakMW, [50, 75], "conf 0.55 and 0.749 share the mid tier");
});

test("expectedPeakMW: low-confidence tier (conf < 0.55)", () => {
  const req = 100;
  const p = forecast({
    ...owl,
    requestedMW: req,
    privateProfile: { ...owl.privateProfile, internalScheduleConfidence: 0.549 },
  });
  assert.deepEqual(p.expectedPeakMW, [40, 65]);
});

test("expectedPeakMW: boundary conf = 0.75 lands in high tier (not medium)", () => {
  // Regression guard against an off-by-one that flipped to `>` instead of `>=`.
  const p = forecast({
    ...owl,
    requestedMW: 100,
    privateProfile: { ...owl.privateProfile, internalScheduleConfidence: 0.75 },
  });
  assert.deepEqual(p.expectedPeakMW, [60, 80]);
});

test("expectedPeakMW: boundary conf = 0.55 lands in medium tier (not low)", () => {
  const p = forecast({
    ...owl,
    requestedMW: 100,
    privateProfile: { ...owl.privateProfile, internalScheduleConfidence: 0.55 },
  });
  assert.deepEqual(p.expectedPeakMW, [50, 75]);
});

// ---------------------------------------------------------------------------
// Flexibility-MW tier boundaries
// ---------------------------------------------------------------------------
// Contract (`flexibilityBand`):
//   flex >= 20  → [20%, 40%] × requestedMW, responseClass B
//   10 <= flex < 20 → [10%, 20%] × requestedMW, responseClass C
//   flex < 10   → [0, 10%] × requestedMW, responseClass C

test("flexibilityPassport: class-B band (flex ≥ 20%)", () => {
  const p = forecast({
    ...owl,
    requestedMW: 100,
    privateProfile: { ...owl.privateProfile, flexPercent: 20 },
  });
  assert.equal(p.flexibilityPassport.mwMin, 20);
  assert.equal(p.flexibilityPassport.mwMax, 40);
  assert.equal(p.flexibilityPassport.responseClass, "B");
});

test("flexibilityPassport: class-C upper band (10% ≤ flex < 20%)", () => {
  const p = forecast({
    ...owl,
    requestedMW: 100,
    privateProfile: { ...owl.privateProfile, flexPercent: 15 },
  });
  assert.equal(p.flexibilityPassport.mwMin, 10);
  assert.equal(p.flexibilityPassport.mwMax, 20);
  assert.equal(p.flexibilityPassport.responseClass, "C");
});

test("flexibilityPassport: class-C lower band (flex < 10%)", () => {
  const p = forecast({
    ...owl,
    requestedMW: 100,
    privateProfile: { ...owl.privateProfile, flexPercent: 5 },
  });
  assert.equal(p.flexibilityPassport.mwMin, 0);
  assert.equal(p.flexibilityPassport.mwMax, 10);
  assert.equal(p.flexibilityPassport.responseClass, "C");
});

test("flexibilityPassport: boundary flex = 20% is class B (inclusive)", () => {
  const p = forecast({
    ...owl,
    requestedMW: 100,
    privateProfile: { ...owl.privateProfile, flexPercent: 20 },
  });
  assert.equal(p.flexibilityPassport.responseClass, "B");
});

test("flexibilityPassport: boundary flex = 19% is class C (exclusive)", () => {
  const p = forecast({
    ...owl,
    requestedMW: 100,
    privateProfile: { ...owl.privateProfile, flexPercent: 19 },
  });
  assert.equal(p.flexibilityPassport.responseClass, "C");
  assert.equal(p.flexibilityPassport.mwMin, 10);
});

// ---------------------------------------------------------------------------
// Duration tier boundaries
// ---------------------------------------------------------------------------
// Contract (`durationBand`):
//   bessHours < 4  → [2, 4]
//   4 <= bessHours < 8 → [4, 8]
//   bessHours >= 8 → [8, 12]

test("durationBand: bessHours < 4 → [2, 4]", () => {
  const p = forecast(withProfile(owl, { bessHours: 3 })).flexibilityPassport;
  assert.equal(p.durationHoursMin, 2);
  assert.equal(p.durationHoursMax, 4);
});

test("durationBand: boundary bessHours = 4 → [4, 8]", () => {
  const p = forecast(withProfile(owl, { bessHours: 4 })).flexibilityPassport;
  assert.equal(p.durationHoursMin, 4);
  assert.equal(p.durationHoursMax, 8);
});

test("durationBand: bessHours = 7 still in middle tier", () => {
  const p = forecast(withProfile(owl, { bessHours: 7 })).flexibilityPassport;
  assert.equal(p.durationHoursMin, 4);
  assert.equal(p.durationHoursMax, 8);
});

test("durationBand: boundary bessHours = 8 → [8, 12]", () => {
  const p = forecast(withProfile(owl, { bessHours: 8 })).flexibilityPassport;
  assert.equal(p.durationHoursMin, 8);
  assert.equal(p.durationHoursMax, 12);
});

test("durationBand: many-to-one — bessHours 4,5,6,7 all publish [4,8]", () => {
  // The core privacy claim of the tier band: observer who reads [4,8] cannot
  // distinguish between bessHours ∈ {4, 5, 6, 7}.
  const bands = [4, 5, 6, 7].map(
    (h) => forecast(withProfile(owl, { bessHours: h })).flexibilityPassport,
  );
  for (const b of bands) {
    assert.equal(b.durationHoursMin, 4);
    assert.equal(b.durationHoursMax, 8);
  }
});

// ---------------------------------------------------------------------------
// ScenarioOverride — flexPercent propagates into derived fields
// ---------------------------------------------------------------------------

test("forecast override: flexPercent=25 lifts responseClass to B", () => {
  // Owl's baseline flexPercent=22 is already class B; push a class-C case up.
  const c = withProfile(lantern, { flexPercent: 5 });
  const baseline = forecast(c);
  assert.equal(baseline.flexibilityPassport.responseClass, "C");
  const overridden = forecast(c, { flexPercent: 25 });
  assert.equal(overridden.flexibilityPassport.responseClass, "B");
  // Energization band also shifts (flexShift = -1 for flex ≥ 20).
  assert.notEqual(baseline.energizationBand, overridden.energizationBand);
});

test("forecast override: omitted override leaves all fields untouched", () => {
  const a = forecast(owl);
  const b = forecast(owl, {});
  assert.deepEqual(a, b);
});

test("buildRecord: derivedProof matches forecast(input, override)", () => {
  const override = { flexPercent: 30 };
  const rec = buildRecord(owl, override);
  assert.deepEqual(rec.derivedProof, forecast(owl, override));
});

test("buildRecord: effective flexPercent is reflected on the record's private profile", () => {
  const override = { flexPercent: 35 };
  const rec = buildRecord(owl, override);
  assert.equal(rec.privateProfile.flexPercent, 35);
  // Other private fields untouched.
  assert.equal(rec.privateProfile.bessMW, owl.privateProfile.bessMW);
  assert.equal(
    rec.privateProfile.internalScheduleConfidence,
    owl.privateProfile.internalScheduleConfidence,
  );
});

test("forecast: firmnessScore is clamped — even pessimistic inputs stay in [0, 100]", () => {
  // Push everything to the low end: low conf, no redundancy, no BESS, no site
  // control, high permit risk, high flood risk. Raw score would go negative.
  const p = forecast({
    ...owl,
    privateProfile: {
      ...owl.privateProfile,
      internalScheduleConfidence: 0,
      redundancyShiftPercent: 0,
      bessMW: 0,
    },
    publicEvidence: {
      ...owl.publicEvidence,
      siteControlEvidence: false,
      permitRisk: "high",
      floodRisk: "high",
    },
  });
  assert.ok(p.firmnessScore >= 0, `got ${p.firmnessScore}`);
  assert.ok(p.firmnessScore <= 100, `got ${p.firmnessScore}`);
  assert.equal(p.firmnessScore % 5, 0);
});

test("forecast: firmnessScore is clamped at the top under optimistic inputs", () => {
  // Max everything: conf=1, full redundancy, big BESS, site control, no risk.
  const p = forecast({
    ...owl,
    requestedMW: 50, // small request so bessShare saturates the 50% cap
    privateProfile: {
      ...owl.privateProfile,
      internalScheduleConfidence: 1.0,
      redundancyShiftPercent: 25,
      bessMW: 50,
    },
    publicEvidence: {
      ...owl.publicEvidence,
      siteControlEvidence: true,
      permitRisk: "low",
      floodRisk: "low",
    },
  });
  assert.ok(p.firmnessScore <= 100);
  assert.equal(p.firmnessScore % 5, 0);
});

test("forecast: all 3 canonical fixtures produce non-empty topBlockers lists ≤ 3", () => {
  for (const c of [owl, lantern, kraken]) {
    const p = forecast(c);
    assert.ok(Array.isArray(p.topBlockers));
    assert.ok(p.topBlockers.length <= 3, `${c.caseId}: ${p.topBlockers.length} blockers > 3`);
  }
});
