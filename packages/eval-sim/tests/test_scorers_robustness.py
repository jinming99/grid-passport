"""Tests for eval_sim.scorers.robustness (§8b OPR + Savage regret hybrid)."""

from __future__ import annotations

import math

import pytest

from eval_sim.schemas.condition import Condition
from eval_sim.schemas.scenario import FutureOutcomeScore
from eval_sim.scorers.robustness import (
    DIMENSIONS,
    compute_opr,
    compute_savage_regret,
)


def _score(v: float) -> FutureOutcomeScore:
    """Shortcut: all five dimensions = v."""
    return FutureOutcomeScore(
        band_accuracy=v,
        firmness_preservation=v,
        flexibility_acceptance=v,
        blocker_recall=v,
        regulator_completeness=v,
    )


def test_opr_is_one_when_condition_matches_oracle() -> None:
    """OPR(X, S) = 1 when condition exactly matches oracle across F_S."""
    cond = {"f_1": _score(0.9), "f_2": _score(0.7), "f_3": _score(0.8)}
    oracle = {"f_1": _score(0.9), "f_2": _score(0.7), "f_3": _score(0.8)}
    result = compute_opr(cond, oracle)
    for d in DIMENSIONS:
        assert result.per_dimension[d] == pytest.approx(1.0)
    assert result.scalar == pytest.approx(1.0)


def test_opr_below_one_when_condition_underperforms() -> None:
    cond = {"f_1": _score(0.6), "f_2": _score(0.5)}
    oracle = {"f_1": _score(1.0), "f_2": _score(1.0)}
    result = compute_opr(cond, oracle)
    # mean(0.6, 0.5) / mean(1.0, 1.0) = 0.55
    assert result.scalar == pytest.approx(0.55)


def test_opr_requires_matching_future_ids() -> None:
    cond = {"f_1": _score(0.9)}
    oracle = {"f_2": _score(0.9)}
    with pytest.raises(ValueError, match="matching future IDs"):
        compute_opr(cond, oracle)


def test_opr_empty_futures_raises() -> None:
    with pytest.raises(ValueError, match="empty F_S"):
        compute_opr({}, {})


def test_savage_regret_zero_for_best_condition_on_each_future() -> None:
    """If the same condition wins on every future, its regret is zero."""
    per_condition = {
        Condition.D_GRID_PASSPORT: {"f_1": _score(0.9), "f_2": _score(0.8)},
        Condition.B_NDA_EMAIL: {"f_1": _score(0.6), "f_2": _score(0.5)},
    }
    results = compute_savage_regret(per_condition)
    d = results[Condition.D_GRID_PASSPORT]
    for dim in DIMENSIONS:
        assert d.max_regret_per_dimension[dim] == pytest.approx(0.0)
        assert d.mean_regret_per_dimension[dim] == pytest.approx(0.0)
    assert d.max_regret_scalar == pytest.approx(0.0)


def test_savage_regret_range_normalized() -> None:
    """Regret for the worst condition equals 1.0 under range normalization
    (modulo epsilon) on each dimension for each future — since best-worst
    fills the full range.
    """
    per_condition = {
        Condition.D_GRID_PASSPORT: {"f_1": _score(1.0)},
        Condition.B_NDA_EMAIL: {"f_1": _score(0.0)},
    }
    results = compute_savage_regret(per_condition)
    b = results[Condition.B_NDA_EMAIL]
    for dim in DIMENSIONS:
        assert math.isclose(b.max_regret_per_dimension[dim], 1.0, abs_tol=1e-5)


def test_savage_regret_hurwicz_is_avg_of_max_and_mean() -> None:
    per_condition = {
        Condition.D_GRID_PASSPORT: {"f_1": _score(1.0), "f_2": _score(0.5)},
        Condition.B_NDA_EMAIL: {"f_1": _score(0.0), "f_2": _score(1.0)},
    }
    results = compute_savage_regret(per_condition)
    for result in results.values():
        for dim in DIMENSIONS:
            expected = (
                0.5 * result.max_regret_per_dimension[dim]
                + 0.5 * result.mean_regret_per_dimension[dim]
            )
            assert result.hurwicz_05_per_dimension[dim] == pytest.approx(expected)


def test_oracle_has_non_zero_regret_when_another_condition_wins_a_future() -> None:
    """The §1.5.1 #4 novel claim: Oracle is a reference strategy, not an
    automatic optimum. If some condition beats Oracle on some future,
    Oracle's regret on that future is non-zero — honest framing.
    """
    per_condition = {
        Condition.A_ORACLE: {"f_1": _score(0.9), "f_2": _score(0.5)},
        Condition.D_GRID_PASSPORT: {"f_1": _score(0.6), "f_2": _score(0.9)},
    }
    results = compute_savage_regret(per_condition)
    a = results[Condition.A_ORACLE]
    # Oracle loses on f_2, so max_regret > 0.
    assert a.max_regret_scalar > 0.0
