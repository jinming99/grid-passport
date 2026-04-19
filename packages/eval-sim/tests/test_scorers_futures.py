"""Tests for eval_sim.scorers.futures (§7.7 per-future scoring)."""

from __future__ import annotations

import pytest

from eval_sim import scenarios
from eval_sim.scorers.futures import (
    CandidatePlan,
    score_plan_against_ensemble,
    score_plan_against_future,
)


def test_materializes_future_rewards_matching_band() -> None:
    s1 = scenarios.get("S1")
    f1 = next(f for f in s1.futures_ensemble if f.kind == "materializes")
    matching = CandidatePlan(
        energization_band="Q3 2028 – Q1 2029",
        firmness_score=0.65,
        flexibility_class="B",
        regulator_completeness=5,
    )
    mismatch = CandidatePlan(
        energization_band="Q2 2030 – Q4 2030",
        firmness_score=0.65,
        flexibility_class="B",
        regulator_completeness=5,
    )
    good = score_plan_against_future(matching, f1, s1)
    bad = score_plan_against_future(mismatch, f1, s1)
    assert good.band_accuracy > bad.band_accuracy


def test_amends_future_rewards_amendment_path_plan() -> None:
    s6 = scenarios.get("S6")
    amends_future = next(f for f in s6.futures_ensemble if f.kind == "amends")
    with_path = CandidatePlan(
        has_amendment_path=True,
        firmness_score=0.65,
        regulator_completeness=4,
    )
    without_path = CandidatePlan(
        has_amendment_path=False,
        firmness_score=0.65,
        regulator_completeness=4,
    )
    a = score_plan_against_future(with_path, amends_future, s6)
    b = score_plan_against_future(without_path, amends_future, s6)
    assert a.band_accuracy > b.band_accuracy


def test_policy_version_linkage_boosts_regulator_completeness_on_amends() -> None:
    """§7 S6 f_2 is the policy-version-linkage test. A plan with the
    linkage scores higher on regulator_completeness than a plan without.
    """
    s6 = scenarios.get("S6")
    amends_future = next(
        f
        for f in s6.futures_ensemble
        if f.kind == "amends" and f.scoring_spec.get("policy_version_linkage_required")
    )
    linked = CandidatePlan(
        has_amendment_path=True,
        policy_version_linked=True,
        firmness_score=0.65,
        regulator_completeness=3,
    )
    unlinked = CandidatePlan(
        has_amendment_path=True,
        policy_version_linked=False,
        firmness_score=0.65,
        regulator_completeness=3,
    )
    a = score_plan_against_future(linked, amends_future, s6)
    b = score_plan_against_future(unlinked, amends_future, s6)
    assert a.regulator_completeness > b.regulator_completeness


def test_blocker_recall_zero_for_missed_blockers() -> None:
    """S2 has pre-registered blockers (flood / site-control / permit).
    A plan that surfaces none of them should get blocker_recall = 0.
    """
    s2 = scenarios.get("S2")
    f1 = next(f for f in s2.futures_ensemble if f.kind == "materializes")
    silent = CandidatePlan(
        energization_band="Q1 2028 – Q3 2028",
        firmness_score=0.55,
        blockers_surfaced=[],
    )
    assert score_plan_against_future(silent, f1, s2).blocker_recall == 0.0


def test_blocker_recall_perfect_for_full_surfacing() -> None:
    s2 = scenarios.get("S2")
    f1 = next(f for f in s2.futures_ensemble if f.kind == "materializes")
    comprehensive = CandidatePlan(
        energization_band="Q1 2028 – Q3 2028",
        firmness_score=0.55,
        blockers_surfaced=[
            "flood overlay identified",
            "site-control recordation pending",
            "Tier-2 permit timeline flagged",
        ],
    )
    assert score_plan_against_future(comprehensive, f1, s2).blocker_recall == 1.0


def test_blocker_recall_is_unity_when_scenario_has_no_blockers() -> None:
    """S1 + S3 have no pre-registered blocker list (sophisticated archetypes)."""
    s1 = scenarios.get("S1")
    f1 = next(f for f in s1.futures_ensemble if f.kind == "materializes")
    plan = CandidatePlan(firmness_score=0.65, regulator_completeness=5)
    assert score_plan_against_future(plan, f1, s1).blocker_recall == 1.0


def test_firmness_preservation_inversely_proportional_to_delta() -> None:
    s1 = scenarios.get("S1")
    f1 = next(f for f in s1.futures_ensemble if f.kind == "materializes")
    # f1 has firmness_threshold=0.65 per S1's scoring_spec.
    exact = CandidatePlan(firmness_score=0.65, regulator_completeness=5)
    close = CandidatePlan(firmness_score=0.75, regulator_completeness=5)
    far = CandidatePlan(firmness_score=0.20, regulator_completeness=5)
    assert score_plan_against_future(exact, f1, s1).firmness_preservation == pytest.approx(1.0)
    # close is within 0.1 of target → ~0.9
    assert score_plan_against_future(close, f1, s1).firmness_preservation > 0.85
    # far is 0.45 off → ~0.55
    assert score_plan_against_future(far, f1, s1).firmness_preservation < 0.6


def test_flexibility_acceptance_binary_on_class_match() -> None:
    s1 = scenarios.get("S1")
    f1 = next(f for f in s1.futures_ensemble if f.kind == "materializes")
    match = CandidatePlan(flexibility_class="B", firmness_score=0.65)
    miss = CandidatePlan(flexibility_class="A", firmness_score=0.65)
    assert score_plan_against_future(match, f1, s1).flexibility_acceptance == 1.0
    assert score_plan_against_future(miss, f1, s1).flexibility_acceptance == 0.0


def test_score_plan_against_ensemble_returns_all_futures() -> None:
    s1 = scenarios.get("S1")
    plan = CandidatePlan(
        energization_band="Q3 2028 – Q1 2029",
        firmness_score=0.65,
        flexibility_class="B",
        regulator_completeness=5,
    )
    scores = score_plan_against_ensemble(plan, s1)
    assert set(scores) == {f.id for f in s1.futures_ensemble}


def test_ensemble_scores_feed_opr() -> None:
    """Integration fence — the ensemble-scoring output is the exact shape
    `robustness.compute_opr(condition_scores, oracle_scores)` expects.
    """
    from eval_sim.scorers.robustness import compute_opr

    s1 = scenarios.get("S1")
    d_plan = CandidatePlan(
        energization_band="Q3 2028 – Q1 2029",
        firmness_score=0.65,
        flexibility_class="B",
        regulator_completeness=5,
    )
    oracle_plan = CandidatePlan(
        energization_band="Q3 2028 – Q1 2029",
        firmness_score=0.65,
        flexibility_class="B",
        regulator_completeness=5,
    )
    d_scores = score_plan_against_ensemble(d_plan, s1)
    oracle_scores = score_plan_against_ensemble(oracle_plan, s1)
    opr = compute_opr(d_scores, oracle_scores)
    assert opr.scalar == pytest.approx(1.0)
