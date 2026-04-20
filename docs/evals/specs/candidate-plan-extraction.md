# Spec — CandidatePlan extraction (§8b Robustness unblocker)

> **Student follow-on.** Owner: engine student. Review gates: Ming (scoring semantics). ~2–3 weeks total. Unblocks: §8b Robustness (OPR + Savage regret) axis of the sim bench — currently stubbed.

## Goal

Each per-run ledger needs a typed `CandidatePlan` struct that captures the condition's filed plan in the five pre-registered dimensions. This struct is what the robustness scorer (`eval_sim.scorers.robustness.compute_opr` + `compute_savage_regret`) consumes. Without it, the §9.1 primary claim `OPR(D) − OPR(B) ≥ 0.20` can't be measured.

## What the scorer expects

From `eval_sim/scorers/futures.py::CandidatePlan`:

```python
@dataclass(frozen=True)
class CandidatePlan:
    energization_band: str | None       # e.g. "Q4 2028 – Q2 2029"
    firmness_score: float | None        # 0–1 normalized
    flexibility_class: str | None       # e.g. "A" | "B" | "C"
    blockers_surfaced: list[str]        # e.g. ["flood", "site-control"]
    regulator_completeness: float | None  # 1–5 Likert from judge
    policy_version_linked: bool
    has_amendment_path: bool
```

## Where to find each field in a run transcript

For each condition, the plan extraction logic is different:

### Condition A (Oracle)
Oracle's `artifacts.oracle_decision.utility_decision` contains the full decision letter. Extract via regex + structured parse:
- `energization_band`: match `committed band: Q[0-9] YYYY – Q[0-9] YYYY`
- `firmness_score`: extract "credible" / "verdict" block → map to [0, 1]
- `flexibility_class`: match `Class [ABC]`
- `blockers_surfaced`: count explicit remediation items
- `regulator_completeness`: pull from the separate regulator-verdict Likert

### Conditions C, D (bundle-based)
The signed bundle (or its `cover_note` + bounded-query responses) carries the filed plan. Extract from `artifacts.bundle.*`:
- `energization_band`: from `derivedProof.energizationBand`
- `firmness_score`: from `derivedProof.firmnessScore / 100`
- `flexibility_class`: from `derivedProof.flexibilityPassport.responseClass`
- `blockers_surfaced`: from `derivedProof.topBlockers`
- `regulator_completeness`: **from the Prometheus judge's regulatory_auditability dimension** (judge output lives on the same ledger)
- `policy_version_linked`: check `derivedProof.generatedFromPolicyVersion` is non-empty
- `has_amendment_path`: parse bundle for amendment-path language

### Condition B (NDA-email)
The email thread contains the plan in prose. Extract via **Opus-based extraction pass** — one Opus call per ledger that reads the full transcript and emits a structured CandidatePlan JSON. Locked extraction prompt required.

## Extraction-prompt design (Condition B only)

```
You are extracting a filed interconnection plan from an email thread. Read the
transcript below and emit exactly this JSON structure:

{
  "energization_band": "Q? YYYY – Q? YYYY" | null,
  "firmness_score": 0.0-1.0 | null,
  "flexibility_class": "A" | "B" | "C" | null,
  "blockers_surfaced": ["string", ...],
  "regulator_completeness": 1-5 | null,
  "policy_version_linked": true | false,
  "has_amendment_path": true | false
}

Transcript:
<<<
{transcript}
>>>
```

Lock the prompt bytes. Test the extractor on the S1_B_seed00 ledger (hand-annotate the expected plan; assert the extractor recovers it within tolerance).

## Integration with score_ledgers.py

Add a `robustness` scorer section to `scripts/score_ledgers.py`:

```python
from eval_sim.scorers.futures import (
    CandidatePlan,
    score_plan_against_ensemble,
)
from eval_sim.scorers.robustness import compute_opr, compute_savage_regret

def _score_robustness(ledger, *, transport, budget, dry_run, judge_out):
    plan = _extract_candidate_plan(ledger, transport, budget, dry_run, judge_out)
    per_future_scores = score_plan_against_ensemble(plan, ledger.scenario_card)
    # OPR requires Oracle scores; aggregate across conditions happens in
    # summary aggregation, not per-cell.
    return {
        "plan": asdict(plan),
        "per_future_scores": {
            f_id: asdict(s) for f_id, s in per_future_scores.items()
        },
    }
```

The per-cell output carries the plan + per-future scores; the aggregator (separate step) cross-condition-joins to compute OPR and Savage regret.

## Aggregator update

`scripts/score_ledgers.py` summary should compute, per scenario:
- OPR(B, D) = E[outcome(D, f)] / E[outcome(A, f)] — expectation over F_S
- Savage regret per condition across F_S

This is aggregation across ledgers, not per-ledger. Add `_aggregate_robustness(cells)` that joins same-scenario different-condition cells.

## Deliverables

1. **Plan extractor** at `packages/eval-sim/eval_sim/scorers/plan_extraction.py` with condition-specific extraction + locked B-extraction prompt
2. **Test fixtures** — hand-annotated expected plans for at least S1_{A,B,C,D}_seed00 (4 fixtures) used as regression
3. **Score-batch integration** in `scripts/score_ledgers.py`
4. **Aggregator** at `eval_sim/aggregator.py` with OPR + Savage regret across conditions per scenario
5. **Report section** in `sim-bench-results.md` as "§8b robustness evidence"

## Dependencies

- Existing per-run ledgers under `results/pilot/transcripts/`
- Existing `eval_sim.scorers.futures` + `eval_sim.scorers.robustness` (ready, waiting for plan input)
- Prometheus judge output on the ledger (already produced by score_ledgers.py)
- claude-agent-sdk for the B-extraction prompt

## Cost estimate

Extraction is deterministic for A/C/D (parse artifacts); Condition B requires 1 Opus call per B-ledger. Main run: 35 B-cells × ~8k tokens each = ~$5 SDK. Pilot: 3 B-cells = ~$0.50. Trivial.

## Risk: extraction failures for Condition B

If the B-extractor fails on a ledger (e.g., the email thread didn't converge to a clean plan), flag `plan = None` and exclude from OPR/regret aggregation. Report exclusion rate as an honest-limit metric.

## What this spec does NOT cover

- Reward shaping for different scenario types. The F_S scoring is already pre-registered in `eval_sim/scorers/futures.py::score_plan_against_future`.
- Cross-seed aggregation. Separate aggregator work.
- Human spot-check on disagreement. Out of scope here; fold into the bench's existing disagreement protocol.
