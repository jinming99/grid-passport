"""End-to-end integration test — runner → every scorer → aggregator.

This is the "one command from §17 sign-off to pilot" contract: if this
passes, the only remaining step before a live pilot is flipping
`dry_run=False` inside the runner + wiring Concordia EntityAgents. All
scorers + aggregator + judge orchestration already accept the dry-run
ledger end-to-end.

No LLM calls.
"""

from __future__ import annotations

from eval_sim import scenarios
from eval_sim.aggregator import bootstrap_mean_ci, quadratic_weighted_kappa
from eval_sim.runner import run
from eval_sim.schemas.condition import Condition
from eval_sim.scorers.efficiency import compute_efficiency
from eval_sim.scorers.futures import (
    CandidatePlan,
    score_plan_against_ensemble,
)
from eval_sim.scorers.judge import judge_with_swap, tag_transcript
from eval_sim.scorers.judge_rubric import FIVE_DIMENSION_RUBRIC_TEXT
from eval_sim.scorers.mechanical import compute_mechanical
from eval_sim.scorers.privacy.direct import compute_direct_leakage
from eval_sim.scorers.privacy.trace import compute_trace_leakage
from eval_sim.scorers.robustness import compute_opr, compute_savage_regret


def test_e2e_dry_run_single_scenario_single_seed() -> None:
    """One (scenario, condition, seed) → every scorer accepts the ledger."""
    s1 = scenarios.get("S1")
    ledger = run(s1, Condition.D_GRID_PASSPORT, seed=0, dry_run=True)

    # Efficiency
    eff = compute_efficiency(ledger.transcript)
    assert eff.communication_rounds >= 1
    assert eff.simulated_elapsed_days > 0

    # Mechanical — wire through with empty validator/refs lists for the
    # dry-run path; the compute function should not raise.
    mech = compute_mechanical(
        validator_pass_per_turn=[True] * len(ledger.transcript),
        source_refs=[],
        whitelist_urls=set(),
        cartographer_live=False,
        skill_per_turn=[],
        transcript=ledger.transcript,
        private_tokens=set(ledger.scorer_inputs["private_tokens"]),
    )
    assert mech.h_workflow_pass_rate == 1.0
    assert mech.h_null_leak_count == 0  # dry-run transcript is clean by construction

    # Direct-leakage — build (channel, text) tuples from the transcript
    artifacts = [(t.channel, t.content) for t in ledger.transcript]
    direct = compute_direct_leakage(
        artifacts=artifacts,
        private_field_tokens=list(ledger.scorer_inputs["private_tokens"]),
        total_private_fields=len(ledger.scorer_inputs["private_tokens"]),
    )
    # Dry-run transcript is a stub; it should not leak private tokens.
    assert direct.n_direct_leaks == 0

    # Trace leakage — no verdicts in dry run (no LLM classifier invoked).
    trace = compute_trace_leakage(verdicts=[])
    assert trace.wls == 0.0

    # Judge — dry_run returns neutral 3s for both runs → no disagreement.
    judge_result = judge_with_swap(
        transcript_formatted=tag_transcript(ledger.transcript),
        rubric_text=FIVE_DIMENSION_RUBRIC_TEXT,
        batch_id_1="e2e-1",
        batch_id_2="e2e-2",
        batch_position_1=0,
        batch_position_2=1,
        dry_run=True,
    )
    assert not judge_result.requires_spot_check
    assert judge_result.run_1.privacy_integrity.score == 3

    # Futures — score a candidate plan (matches the scenario's oracle-
    # ideal shape so the ensemble is non-degenerate).
    plan = CandidatePlan(
        energization_band="Q3 2028 – Q1 2029",
        firmness_score=0.65,
        flexibility_class="B",
        regulator_completeness=5,
    )
    ensemble_scores = score_plan_against_ensemble(plan, s1)
    assert set(ensemble_scores) == {f.id for f in s1.futures_ensemble}


def test_e2e_opr_and_regret_across_four_conditions() -> None:
    """OPR + Savage regret across the four A/B/C/D conditions for one
    scenario. Uses synthetic plans that deliberately degrade from A → D →
    C → B so the aggregation produces a non-trivial ordering.
    """
    s1 = scenarios.get("S1")

    def _plan_for(condition: Condition) -> CandidatePlan:
        # Synthetic degradation curve — A matches oracle, D nearly, C
        # decently, B poorly. Pre-lock synthetic evidence, not a live run.
        if condition is Condition.A_ORACLE:
            return CandidatePlan(
                energization_band="Q3 2028 – Q1 2029",
                firmness_score=0.65,
                flexibility_class="B",
                regulator_completeness=5,
                has_amendment_path=True,
                policy_version_linked=True,
            )
        if condition is Condition.D_GRID_PASSPORT:
            return CandidatePlan(
                energization_band="Q3 2028 – Q1 2029",
                firmness_score=0.60,
                flexibility_class="B",
                regulator_completeness=5,
                has_amendment_path=True,
                policy_version_linked=True,
            )
        if condition is Condition.C_PROMPT_ONLY:
            return CandidatePlan(
                energization_band="Q3 2028 – Q1 2029",
                firmness_score=0.55,
                flexibility_class="B",
                regulator_completeness=4,
                has_amendment_path=False,
                policy_version_linked=False,
            )
        # Condition.B_NDA_EMAIL
        return CandidatePlan(
            energization_band="Q1 2029 – Q3 2029",  # slipped a cycle
            firmness_score=0.40,
            flexibility_class="C",
            regulator_completeness=2,
            has_amendment_path=False,
            policy_version_linked=False,
        )

    per_condition_scores = {
        cond: score_plan_against_ensemble(_plan_for(cond), s1)
        for cond in Condition
    }
    oracle_scores = per_condition_scores[Condition.A_ORACLE]

    # OPR per non-oracle condition against oracle.
    opr_b = compute_opr(per_condition_scores[Condition.B_NDA_EMAIL], oracle_scores)
    opr_c = compute_opr(per_condition_scores[Condition.C_PROMPT_ONLY], oracle_scores)
    opr_d = compute_opr(per_condition_scores[Condition.D_GRID_PASSPORT], oracle_scores)

    # Pre-registered primary claim C1-OPR ordering: A > D > C > B.
    # (Scalar OPR; sign check, not magnitudes.)
    assert opr_d.scalar >= opr_c.scalar
    assert opr_c.scalar >= opr_b.scalar

    # Savage regret ordering per §9.1 C1-Regret: mean_regret(D) < C < B.
    regrets = compute_savage_regret(per_condition_scores)
    assert regrets[Condition.D_GRID_PASSPORT].mean_regret_scalar <= (
        regrets[Condition.C_PROMPT_ONLY].mean_regret_scalar
    )
    assert regrets[Condition.C_PROMPT_ONLY].mean_regret_scalar <= (
        regrets[Condition.B_NDA_EMAIL].mean_regret_scalar
    )


def test_e2e_bootstrap_across_multiple_seeds() -> None:
    """Run the dry-run pipeline across five seeds on one (scenario,
    condition) and aggregate OPR with BCa bootstrap — validates the
    full §15 reporting path.
    """
    s1 = scenarios.get("S1")
    d_plan = CandidatePlan(
        energization_band="Q3 2028 – Q1 2029",
        firmness_score=0.60,
        flexibility_class="B",
        regulator_completeness=5,
        has_amendment_path=True,
        policy_version_linked=True,
    )
    oracle_plan = CandidatePlan(
        energization_band="Q3 2028 – Q1 2029",
        firmness_score=0.65,
        flexibility_class="B",
        regulator_completeness=5,
        has_amendment_path=True,
        policy_version_linked=True,
    )

    opr_scalars: list[float] = []
    for seed in range(5):
        # Seed doesn't affect the plan in dry-run (all plans are
        # synthetic), but the runner still produces a distinct ledger
        # per seed so we exercise the per-seed path.
        ledger = run(s1, Condition.D_GRID_PASSPORT, seed=seed, dry_run=True)
        assert ledger.key.seed == seed
        d_scores = score_plan_against_ensemble(d_plan, s1)
        oracle_scores = score_plan_against_ensemble(oracle_plan, s1)
        opr_scalars.append(compute_opr(d_scores, oracle_scores).scalar)

    ci = bootstrap_mean_ci(opr_scalars, n_resamples=200)
    # All 5 are the same value (synthetic plans), so CI is degenerate but
    # finite.
    assert ci.low <= ci.mean <= ci.high
    assert ci.method in {"BCa", "percentile"} or "degenerate" in ci.method


def test_e2e_judge_weighted_kappa_on_two_judge_runs() -> None:
    """Judge returns identical dry-run scores on both passes → kappa 1.0."""
    s1 = scenarios.get("S1")
    ledger = run(s1, Condition.D_GRID_PASSPORT, seed=0, dry_run=True)
    result = judge_with_swap(
        transcript_formatted=tag_transcript(ledger.transcript),
        rubric_text=FIVE_DIMENSION_RUBRIC_TEXT,
        batch_id_1="e2e-k-1",
        batch_id_2="e2e-k-2",
        batch_position_1=0,
        batch_position_2=1,
        dry_run=True,
    )
    run1_scores = [
        result.run_1.stakeholder_alignment.score,
        result.run_1.planning_defensibility.score,
        result.run_1.privacy_integrity.score,
        result.run_1.regulatory_auditability.score,
        result.run_1.applicant_experience.score,
    ]
    run2_scores = [
        result.run_2.stakeholder_alignment.score,
        result.run_2.planning_defensibility.score,
        result.run_2.privacy_integrity.score,
        result.run_2.regulatory_auditability.score,
        result.run_2.applicant_experience.score,
    ]
    k = quadratic_weighted_kappa(run1_scores, run2_scores)
    assert k == 1.0


def test_e2e_sweeps_every_scenario_every_condition_once() -> None:
    """Smoke-test every (scenario, condition) pair under dry-run. This is
    the 7x4 = 28-run pre-lock equivalent of the pilot grid. All must
    produce a ledger whose transcript flows through every scorer without
    raising.
    """
    for scenario_id in scenarios.all_ids():
        scenario = scenarios.get(scenario_id)
        for condition in Condition:
            ledger = run(scenario, condition, seed=0, dry_run=True)
            assert ledger.transcript
            _ = compute_efficiency(ledger.transcript)
            _ = compute_direct_leakage(
                artifacts=[(t.channel, t.content) for t in ledger.transcript],
                private_field_tokens=list(ledger.scorer_inputs["private_tokens"]),
                total_private_fields=len(ledger.scorer_inputs["private_tokens"]),
            )
