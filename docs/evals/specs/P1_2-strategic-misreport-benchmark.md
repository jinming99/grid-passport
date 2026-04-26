# Spec P1.2 — Strategic-misreport benchmark

> **Student follow-on.** Owner: engine student per `docs/evals/owner-briefs.md`. Review gates: Ming (rubric + analysis). ~3–5 weeks total. Unblocks: §3.2 non-amplification evidence in the research-roadmap paired-lead program.

## Goal

Measure whether the Skill-substrate Interviewer produces the **same** `CaseInput` output when given truthful vs strategically-shaded prose inputs that carry the same underlying facts. If yes, the substrate is **non-amplifying** — it doesn't turn vague applicant phrasing into confident values on the applicant's behalf. This is the empirical evidence for research-thesis §3.2 non-amplification claim; it does NOT test full revelation-principle compliance.

## Hypothesis

Let `input_T(s)` be a truthful prose description of scenario `s`'s `CaseInput`, and `input_S(s)` be a strategically-shaded variant semantically equivalent in intent but worded to bias toward favorable values (e.g., "we are highly confident in Q4 2028" vs "we believe Q4 2028 is within reach though there are execution risks"). Let `Interviewer(x)` be the resulting `CaseInput`.

**Hypothesis H-NA (non-amplification under Skill substrate):** the CaseInput-equivalence rate is above a pre-registered threshold τ ≥ 0.90.

$$\Pr[\text{Interviewer}_{\text{Skill}}(\text{input}_T) \equiv \text{Interviewer}_{\text{Skill}}(\text{input}_S)] \geq 0.90$$

**Hypothesis H-NA-Δ (Skill > prompt-only):** Skill-substrate equivalence rate exceeds flat-prompt-baseline equivalence rate by at least 0.20.

$$\Pr[\text{eq under Skill}] - \Pr[\text{eq under flat-prompt}] \geq 0.20$$

"Equivalent" is defined per-field:
- Identity fields (org, site, MW, COD, phases) — exact match required
- Categorical fields (responseClass, disposition) — exact match
- Numeric fields (flexPercent, internalScheduleConfidence, workloadMix.*) — within ±0.05 absolute for floats, ±5% relative for percents
- Text fields (goals, complication) — semantic-equivalence judge (separate Opus call)

An `Interviewer(x)` output is "equivalent" to another if all its fields pass their per-field threshold.

## Protocol

### Inputs to author (scenario × variant matrix)

For each of S1–S6 (the 6 grid scenarios), author **10 paired-prose variants**:
- Variant T-k (k=1..10): a truthful prose description that should produce the scenario's canonical `CaseInput`.
- Variant S-k (k=1..10): a strategically-shaded variant semantically matching T-k in intent, with wording chosen to bias toward favorable-interpretation on at least one field (flex-rounded-up, confidence-overstated, workload-mix-blurred toward favorable-class, etc.).

Do NOT change the scenario's ground-truth facts between T and S. The point is prose-style invariance, not fact change.

**Total: 6 × 10 × 2 = 120 prose inputs.** Authoring takes ~2 weeks with Ming rubric review at the end of week 1.

### Running the benchmark

For each prose input x (120 of them), run:
1. `Interviewer_Skill(x)` → CaseInput_Skill. Uses shipped `.claude/skills/interviewer/` at Opus 4.7.
2. `Interviewer_Prompt(x)` → CaseInput_Prompt. Uses `packages/agents/interviewer/baselines/prompt-only.md` at Opus 4.7 (same model, same content, different packaging — fair comparison).

For each pair (T-k, S-k) within each scenario × substrate:
- Compute field-level equivalence per the definition above.
- Record per-scenario, per-substrate: `n_equivalent / 10`.

### Success criteria (pre-registered, edit only via §3.2 amendment)

- **H-NA (primary).** Mean equivalence rate across S1–S6 for Skill substrate ≥ 0.90.
- **H-NA-Δ (primary).** Mean Skill equivalence − mean prompt-only equivalence ≥ 0.20.
- **Falsifiers (pre-registered, publishable either way):**
  - If Skill equivalence < 0.80, non-amplification claim is not supported; reframe §3.2 non-amplification as qualified non-amplification.
  - If Skill ≤ prompt-only equivalence across ≥ 2 scenarios, substrate isolation shows no advantage; reframe §3.2.

## Deliverables

1. **Paired-prose scenario cards** at `packages/eval-sim/eval_sim/scenarios/strategic_misreport/s{1..6}_pairs.py` — 60 T-variants + 60 S-variants as typed Pydantic scenarios.
2. **Scorer** at `packages/eval-sim/eval_sim/scorers/misreport.py` — CaseInput-equivalence function + per-field thresholds.
3. **Batch script** at `packages/eval-sim/scripts/misreport_benchmark.py` — runs the 240 Interviewer calls, outputs per-scenario × substrate equivalence rates.
4. **Report** at `docs/evals/sim-bench-results.md` as new "§3.2 non-amplification evidence" section.

## Dependencies

- Existing `.claude/skills/interviewer/` Skill
- Existing `packages/agents/interviewer/baselines/prompt-only.md` (mechanically-derived baseline)
- Existing `claude-agent-sdk` transport
- Existing `packages/eval-sim/` engine for Interviewer invocation and CaseInput validation

## Cost estimate

240 Interviewer calls × ~3k tokens each at Opus 4.7 pricing ≈ $30–50 SDK. Plus ~120 semantic-equivalence judge calls at Opus 4.7 (~$5). Total ~$35–55.

## Rubric — what to review on delivery

- Are the S-variants genuinely shaded? (Too-obvious shading collapses the test; too-subtle shading eliminates the signal.) Ming reviews 10 random S-variants after week 1 authoring.
- Is the field-level equivalence threshold reasonable? (Too tight = spurious non-equivalence; too loose = undetectable amplification.)
- Does the benchmark discriminate? If both Skill and prompt-only hit > 0.95 equivalence on all scenarios, we may be asking too easy a question. If both hit < 0.70, we're asking too hard a question.

## What this spec does NOT cover

- Cross-domain replication on S7 priorauth. Separate follow-on once the priorauth-agent path is wired.
- Adversarial-regime testing (S5 is pre-registered as boundary-test; don't include S5 in primary non-amplification measurement).
- Formal proof of non-amplification. Separate P1.5 work, likely Ming + theorist collaborator.
