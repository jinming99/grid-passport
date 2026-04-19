"""Per-future scoring — sim-bench-design.md §7.7 + §8b.

Each scenario's `Future.scoring_spec` dict carries the pre-registered inputs
for scoring a condition's filed plan *against that future*. This module
implements the scoring function that takes:

  (plan, future, scenario) → FutureOutcomeScore

per §8b table. Deterministic; no LLM calls; pre-lock the scoring function
is a simple rule-based mapping that honors the `scoring_spec` shape laid
down in the scenario cards. Week 2 can refine against real plan outputs.

The per-future scoring function specified in §7.7 is what the robustness
scorer (OPR + Savage regret) consumes; this is the bridge.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from eval_sim.schemas.scenario import Future, FutureOutcomeScore, ScenarioCard


@dataclass(frozen=True)
class CandidatePlan:
    """What a condition's run produced: the filed plan as it would be
    scored against a realized future.

    This is a minimal typed struct — not a full plan object, because the
    bench only needs the five dimensions §8b reports. Fields align 1:1
    with `FutureOutcomeScore`. Condition-specific plan extraction
    (Week 2) populates these from the simulation transcript + bundle.
    """

    energization_band: str | None = None
    firmness_score: float | None = None
    flexibility_class: str | None = None
    blockers_surfaced: list[str] = field(default_factory=list)
    regulator_completeness: float | None = None  # 1-5 Likert from judge
    policy_version_linked: bool = False
    has_amendment_path: bool = False


def score_plan_against_future(
    plan: CandidatePlan,
    future: Future,
    scenario: ScenarioCard,
) -> FutureOutcomeScore:
    """Deterministic scoring of a filed plan against a realized future.

    Each dimension is normalized to [0, 1] per §8b. The rules below are
    pre-registered as §7.7 scoring functions:

    - `band_accuracy`: fraction of the oracle-target band preserved under
      the realized future. Weighted by whether the condition's band is
      the expected one and whether the future's amendment path was taken.
    - `firmness_preservation`: |plan.firmness − future.target_firmness|,
      inverted and clipped to [0, 1].
    - `flexibility_acceptance`: 1.0 if the plan's flex_class matches the
      future's expected class, else 0.0.
    - `blocker_recall`: fraction of oracle-identified blockers the plan
      surfaced; only meaningful for S2/S4/S7.
    - `regulator_completeness`: mapped from the Likert 1–5 field.
    """
    # Dimension 1: band accuracy — start from the f_1 (materialize) check
    # and degrade based on future kind.
    target_band = future.scoring_spec.get("target_band", "")
    if future.kind == "materializes":
        band_accuracy = (
            1.0 if plan.energization_band == target_band else 0.5
        )
    elif future.kind == "fails":
        # Plan can't control a failure-future, but plans with honest
        # yellow-triage + documented-remediation preserve optionality.
        band_accuracy = 0.7 if plan.blockers_surfaced else 0.3
    elif future.kind == "amends":
        # Plan that budgeted an amendment path scores higher under amend.
        band_accuracy = 0.9 if plan.has_amendment_path else 0.4
    else:  # exogenous
        band_accuracy = 0.5  # plan can't anticipate neighbor-cluster delay

    # Dimension 2: firmness preservation
    target_firmness = float(future.scoring_spec.get("firmness_threshold", 0.65))
    if plan.firmness_score is None:
        firmness_preservation = 0.0
    else:
        delta = abs(plan.firmness_score - target_firmness)
        firmness_preservation = max(0.0, min(1.0, 1.0 - delta))

    # Dimension 3: flexibility acceptance
    target_class = future.scoring_spec.get("flex_commitment_class")
    if target_class is None or plan.flexibility_class is None:
        flexibility_acceptance = 0.5  # no evidence either way
    else:
        flexibility_acceptance = 1.0 if plan.flexibility_class == target_class else 0.0

    # Dimension 4: blocker recall (only meaningful for scenarios with
    # pre-registered blocker lists — S2 / S4 / S7).
    expected_blockers = _expected_blockers_for(scenario)
    if not expected_blockers:
        blocker_recall = 1.0  # not applicable ⇒ perfect score by construction
    else:
        recalled = sum(
            1
            for expected in expected_blockers
            if any(expected in surfaced for surfaced in plan.blockers_surfaced)
        )
        blocker_recall = recalled / len(expected_blockers)

    # Dimension 5: regulator completeness — direct pass-through of the
    # Likert 1–5 score from the judge, normalized to [0, 1].
    if plan.regulator_completeness is None:
        regulator_completeness = 0.5
    else:
        regulator_completeness = max(0.0, min(1.0, (plan.regulator_completeness - 1) / 4))

    # Policy-version-linkage bonus for `amends` futures where the bench
    # doc says this is the key discriminator (§7 S6 f_2, §7 S1 f_3).
    if future.kind == "amends" and future.scoring_spec.get("policy_version_linkage_required"):
        if plan.policy_version_linked:
            regulator_completeness = max(regulator_completeness, 0.8)
        else:
            regulator_completeness = min(regulator_completeness, 0.4)

    return FutureOutcomeScore(
        band_accuracy=band_accuracy,
        firmness_preservation=firmness_preservation,
        flexibility_acceptance=flexibility_acceptance,
        blocker_recall=blocker_recall,
        regulator_completeness=regulator_completeness,
    )


def _expected_blockers_for(scenario: ScenarioCard) -> list[str]:
    """Pre-registered blocker list per scenario. Empty when the scenario
    doesn't have blocker-recall as a primary axis (S1, S3 — sophisticated
    archetypes with no upstream blockers).
    """
    if scenario.scenario_id == "S2":
        return ["flood", "site-control", "permit"]
    if scenario.scenario_id == "S4":
        return ["financing", "operating-experience"]
    if scenario.scenario_id == "S5":
        return ["site-control", "financing", "committed-workload"]
    if scenario.scenario_id == "S7":
        return ["clinical-indication", "cpt-coding", "phi-redaction"]
    return []


def score_plan_against_ensemble(
    plan: CandidatePlan,
    scenario: ScenarioCard,
) -> dict[str, FutureOutcomeScore]:
    """Score one plan against every Future in the scenario's F_S ensemble.

    Returns `{future.id: FutureOutcomeScore}` which is exactly the shape
    `eval_sim.scorers.robustness.compute_opr` and
    `compute_savage_regret` expect.
    """
    return {
        future.id: score_plan_against_future(plan, future, scenario)
        for future in scenario.futures_ensemble
    }
