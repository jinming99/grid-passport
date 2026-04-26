# Spec P1.4 — Proper-scoring-rule calibration harness (unverifiable-field subset)

> **Student follow-on.** Owner: engine student. Review gates: Ming (scoring-rule choice + calibration interpretation). ~2–3 weeks total. Unblocks: the unverifiable-field-subset half of research-thesis §3.2 (proper scoring rules as incentive-compatible mechanism for type-uncertain private fields).

## Goal

Measure whether the Skill-substrate Interviewer produces **better-calibrated** distribution reports for fields the applicant is genuinely uncertain about (workloadMix, internalScheduleConfidence, flexPercent) than a flat-prompt baseline does. "Better-calibrated" is defined formally via a proper scoring rule: honest calibration of the reported distribution against realized outcomes is the dominant reporting strategy (Winkler 1969, Good 1952, Gneiting-Raftery 2007).

If honest calibration is the dominant strategy AND the Skill substrate produces better calibration than flat-prompt, the substrate supports the §3.2 unverifiable-subset claim.

## What makes this different from point-estimate elicitation

Current Interviewer elicits point values: `workloadMix.trainingShare = 0.55`. That's a commitment to a number the applicant may not genuinely hold — they have a distribution over quarterly mixes, not a point. P1.4 upgrades Interviewer to elicit **distributions** (P10/P50/P90 or equivalent band), then scores the reported distributions against realized outcomes from the F_S ensemble.

Under a proper scoring rule, the expected score is maximized when the reported distribution matches the applicant's honest subjective distribution. The applicant has no incentive to shade in either direction. This is the §3.2 claim for unverifiable fields.

## Hypothesis

**H-CAL (calibration primary).** For unverifiable fields (`workloadMix.trainingShare`, `internalScheduleConfidence`, `flexPercent`), the Skill-substrate Interviewer produces reported distributions whose CRPS (or Brier, or log-score) against realized-ensemble outcomes is at least 20% lower than the flat-prompt baseline.

$$\text{CRPS}_{\text{Skill}} \leq 0.80 \times \text{CRPS}_{\text{prompt-only}}$$

**H-COV (coverage).** The Skill-substrate reported 80% CI contains the realized value in at least 70% of ensemble draws (under-coverage by at most 10 percentage points — honest-enough calibration).

## Interviewer extension

Add structured-elicitation mode to `.claude/skills/interviewer/SKILL.md`. For unverifiable fields, Interviewer elicits:
- `workloadMix.trainingShare`: P10 / P50 / P90 (each 0–1)
- `internalScheduleConfidence`: P10 / P50 / P90 (each 0–1)
- `flexPercent`: P10 / P50 / P90 (each integer 0–100)

Store as `PrivateProfile.distributions[field_path]: {p10, p50, p90}`. The scalar value (for backward compatibility with existing schema) is `p50`.

## Scoring rule choice

**Primary: CRPS** (Continuous Ranked Probability Score). Proper for any real-valued field; handles bands naturally; reduces to MAE in the deterministic limit. Implement via triangular-distribution approximation from P10/P50/P90 (pre-register the mapping).

**Secondary: Brier score** for categorical fields (`responseClass`, `siteReadinessClass`). Proper for classification; interpretable as mean squared error of probability forecasts.

**Tertiary: Coverage of nominal CIs** — frequentist spot-check. If applicant claims 80% CI, does the realized value fall inside 80% of the time? Provides intuitive calibration check.

Lock these before running per §3.2 amendment protocol.

## Protocol

### Scenarios and realized outcomes

Reuse the F_S ensemble from `packages/eval-sim/eval_sim/schemas/scenario.py` (per-scenario 3–4 realized futures). For each scenario, a "realized outcome" is one draw from F_S. For calibration, run **30 realized-outcome draws per scenario × condition** (= 30 × 6 × 2 = 360 draws).

### Running the harness

For each scenario s × substrate σ ∈ {Skill, prompt-only}:
1. Generate 30 prose intake variants (reuse P1.2 authoring if done, or author 30 new).
2. For each variant, run Interviewer(σ) with structured elicitation → reported distribution D_{s,σ}.
3. For each realized-outcome draw from F_S, compute CRPS(D_{s,σ}, realized_outcome).

### Deliverable metrics

- Per-scenario CRPS mean + 80% CI (bootstrap)
- Skill-vs-prompt CRPS ratio
- 80% CI coverage frequency per substrate
- Honest-limits commentary: which fields did Skill calibrate better on? which were flat?

## Deliverables

1. **Interviewer SKILL.md extension** for structured P10/P50/P90 elicitation on unverifiable fields (update `.claude/skills/interviewer/SKILL.md` + REFERENCE.md)
2. **Schema extension** at `packages/core/src/types.ts` — `PrivateProfile.distributions`
3. **Calibration scorer** at `packages/eval-sim/eval_sim/scorers/calibration.py` with CRPS + Brier + coverage implementations
4. **Batch script** at `packages/eval-sim/scripts/calibration_benchmark.py`
5. **Report section** in `sim-bench-results.md` as "§3.2 proper-scoring-rule evidence (unverifiable subset)"

## Dependencies

- P1.2 paired-prose authoring (can reuse T-variants as intake inputs)
- F_S ensemble already in scenario cards
- Interviewer Skill already shipped

## Cost estimate

360 Interviewer calls at Opus 4.7 × ~5k tokens each ≈ $40–60 SDK. Scoring is deterministic Python (no LLM).

## Risk: is CRPS the right scoring rule?

CRPS has desirable properties (properness, reducibility to MAE, no arbitrary binning) but its interpretation depends on the triangular-distribution fit from P10/P50/P90. Alternative: use Brier score on pre-registered bucketizations (e.g. `responseClass` is already a 3-way classification). Choose primary scoring rule BEFORE running to avoid p-hacking; lock in the amendment.

Ming's review at spec-acceptance should ratify the scoring-rule choice.

## What this spec does NOT cover

- Verifiable-field cross-check (that's P1.3 Referee Skill).
- Formal proof that proper scoring rules imply honest calibration dominance — the theorem is in Gneiting-Raftery 2007; we cite it, we don't re-prove it.
- Incentive alignment for applicants who are uncertain about their own uncertainty (meta-uncertainty). Out of scope; flagged for §3.2 follow-up research.
