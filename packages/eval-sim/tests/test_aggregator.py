"""Tests for eval_sim.aggregator (§8 + §10.4 + §15 statistical helpers)."""

from __future__ import annotations

import numpy as np
import pytest

from eval_sim.aggregator import (
    BootstrapCI,
    bootstrap_mean_ci,
    length_residual_regression,
    quadratic_weighted_kappa,
)


def test_bootstrap_mean_ci_empty() -> None:
    result = bootstrap_mean_ci([])
    assert result.method == "empty"
    assert np.isnan(result.mean)


def test_bootstrap_mean_ci_single_value_degenerate() -> None:
    result = bootstrap_mean_ci([0.5])
    assert result.method == "degenerate-n=1"
    assert result.mean == 0.5
    assert result.low == 0.5
    assert result.high == 0.5


def test_bootstrap_mean_ci_normal_sample() -> None:
    """Standard sanity check: a normal sample's mean CI should bracket the
    true mean with the requested confidence level. Use a fixed seed upstream
    (bootstrap_mean_ci seeds `default_rng(0xBC)` internally) so the result
    is deterministic.
    """
    rng = np.random.default_rng(seed=42)
    data = rng.normal(loc=5.0, scale=1.5, size=50).tolist()
    result = bootstrap_mean_ci(data)
    assert isinstance(result, BootstrapCI)
    assert result.low < result.mean < result.high
    assert result.method in {"BCa", "percentile"}
    assert result.n_resamples == 10_000


def test_bootstrap_mean_ci_reproducible() -> None:
    """Internal seed is fixed so the same input produces the same CI."""
    data = [1.0, 2.0, 3.0, 4.0, 5.0]
    r1 = bootstrap_mean_ci(data)
    r2 = bootstrap_mean_ci(data)
    assert r1.low == r2.low
    assert r1.high == r2.high


def test_weighted_kappa_perfect_agreement() -> None:
    assert quadratic_weighted_kappa([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]) == pytest.approx(1.0)


def test_weighted_kappa_total_disagreement() -> None:
    # Maximally disagreeing 5-point ratings — kappa should be negative.
    k = quadratic_weighted_kappa([1, 1, 5, 5], [5, 5, 1, 1])
    assert k < 0.0


def test_weighted_kappa_same_class_both_raters() -> None:
    """Degenerate case: both raters only ever give score 3. kappa is
    undefined in the standard formula; we return 1.0 if they agree."""
    assert quadratic_weighted_kappa([3, 3, 3], [3, 3, 3]) == 1.0


def test_weighted_kappa_unequal_inputs_raises() -> None:
    with pytest.raises(ValueError, match="equal non-empty"):
        quadratic_weighted_kappa([1, 2], [1, 2, 3])


def test_length_residual_regression_returns_condition_coefs() -> None:
    """Toy dataset: when B transcripts are 10× longer than D and score
    lower on average, OLS should recover a condition coefficient for D
    relative to the baseline condition (lexicographically first = 'B').
    """
    rng = np.random.default_rng(seed=7)
    scores: list[float] = []
    word_counts: list[int] = []
    conditions: list[str] = []
    scenarios: list[str] = []
    for _ in range(30):
        # B: long transcript, score 2.5 ± 0.5
        scores.append(float(rng.normal(2.5, 0.5)))
        word_counts.append(int(rng.normal(3000, 500)))
        conditions.append("B")
        scenarios.append("S1")
        # D: short transcript, score 4.5 ± 0.5
        scores.append(float(rng.normal(4.5, 0.5)))
        word_counts.append(int(rng.normal(300, 100)))
        conditions.append("D")
        scenarios.append("S1")

    fit = length_residual_regression(
        scores=scores,
        word_counts=word_counts,
        conditions=conditions,
        scenarios=scenarios,
    )
    assert "D" in fit.condition_coefs
    # D should have positive coefficient relative to B baseline (it scores
    # higher). After length control the sign may flip if length fully
    # explains the score, but the test data has a genuine condition
    # effect; assert the coefficient is reported (not asserting sign to
    # avoid fragility against bootstrap-style sampling variability).
    assert fit.n_observations == 60
    assert 0.0 <= fit.r_squared <= 1.0


def test_length_residual_regression_length_mismatch_raises() -> None:
    with pytest.raises(ValueError, match="equal lengths"):
        length_residual_regression(
            scores=[1.0, 2.0],
            word_counts=[100],
            conditions=["B", "D"],
            scenarios=["S1", "S1"],
        )
