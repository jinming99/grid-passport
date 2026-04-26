"""OPR + Savage-regret hybrid — sim-bench-design.md §8b.

Implements the §1.5.1 #4 novel contribution: EVPI-framed OPR plus DMDU
Savage regret across the pre-registered realized-future ensemble F_S.
~50 LOC core math; range-normalized regret per Rhodium `regret_type2`
pattern but re-implemented here tailored to our [0,1]-normalized outcome
vectors.

No LLM calls. Per-dimension + aggregate reporting; no scalar collapse
before inspection (§8b header).
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass

from eval_sim.schemas.condition import Condition
from eval_sim.schemas.scenario import FutureOutcomeScore

# Dimensions the scorer reports, matching FutureOutcomeScore fields.
DIMENSIONS: tuple[str, ...] = (
    "band_accuracy",
    "firmness_preservation",
    "flexibility_acceptance",
    "blocker_recall",
    "regulator_completeness",
)

# Pre-registered weights across dimensions. Uniform in v1 per §8b.i
# "weights pre-registered before running." Post-lock changes require
# amendment per §3.2.
DIMENSION_WEIGHTS: Mapping[str, float] = {d: 1.0 / len(DIMENSIONS) for d in DIMENSIONS}

# Small epsilon to avoid divide-by-zero in range normalization.
_REGRET_EPSILON = 1e-6


@dataclass(frozen=True)
class OPRResult:
    """Outcome-preservation ratio per §8b.i. Per-dimension + scalar."""

    per_dimension: Mapping[str, float]
    scalar: float


@dataclass(frozen=True)
class RegretResult:
    """Savage regret summary across F_S per §8b.ii.

    Hurwicz α spectrum reported: α=0 (max; Wald pessimistic), α=1
    (mean; Laplace neutral), α=0.5 (balanced). Per-dimension + scalar.
    """

    max_regret_per_dimension: Mapping[str, float]
    mean_regret_per_dimension: Mapping[str, float]
    hurwicz_05_per_dimension: Mapping[str, float]
    max_regret_scalar: float
    mean_regret_scalar: float
    hurwicz_05_scalar: float


def _weighted_scalar(per_dim: Mapping[str, float]) -> float:
    return sum(per_dim[d] * DIMENSION_WEIGHTS[d] for d in DIMENSIONS)


def _outcome_vector(score: FutureOutcomeScore) -> dict[str, float]:
    return {
        "band_accuracy": score.band_accuracy,
        "firmness_preservation": score.firmness_preservation,
        "flexibility_acceptance": score.flexibility_acceptance,
        "blocker_recall": score.blocker_recall,
        "regulator_completeness": score.regulator_completeness,
    }


def _mean_over_futures(
    scores: Mapping[str, FutureOutcomeScore],
) -> dict[str, float]:
    """Uniform-weight mean across F_S per §8b.i expectation."""
    n = len(scores)
    if n == 0:
        raise ValueError("cannot average over empty F_S")
    totals = {d: 0.0 for d in DIMENSIONS}
    for score in scores.values():
        vec = _outcome_vector(score)
        for d in DIMENSIONS:
            totals[d] += vec[d]
    return {d: totals[d] / n for d in DIMENSIONS}


def compute_opr(
    condition_scores: Mapping[str, FutureOutcomeScore],
    oracle_scores: Mapping[str, FutureOutcomeScore],
) -> OPRResult:
    """OPR(X, S) = E_f[outcome(X, S, f)] / E_f[outcome(A, S, f)] per §8b.i.

    Both mappings are {future_id: FutureOutcomeScore}. Keys must match.
    """
    if set(condition_scores) != set(oracle_scores):
        raise ValueError(
            f"OPR requires matching future IDs; got condition={sorted(condition_scores)}, "
            f"oracle={sorted(oracle_scores)}"
        )
    e_condition = _mean_over_futures(condition_scores)
    e_oracle = _mean_over_futures(oracle_scores)
    per_dim = {
        d: e_condition[d] / e_oracle[d] if e_oracle[d] > _REGRET_EPSILON else 0.0
        for d in DIMENSIONS
    }
    return OPRResult(per_dimension=per_dim, scalar=_weighted_scalar(per_dim))


def compute_savage_regret(
    per_condition_scores: Mapping[Condition, Mapping[str, FutureOutcomeScore]],
) -> dict[Condition, RegretResult]:
    """Compute range-normalized Savage regret per condition per §8b.ii.

    Input keys are conditions; values are {future_id: FutureOutcomeScore}.
    For each (dimension, future), regret(X, f) = best_Y outcome(Y, f) −
    outcome(X, f), then range-normalized by
    (max_Y outcome(Y, f) − min_Y outcome(Y, f) + ε).

    Returns per-condition summary statistics (max / mean / Hurwicz α=0.5).
    """
    conditions = list(per_condition_scores.keys())
    if not conditions:
        return {}
    future_ids = set(next(iter(per_condition_scores.values())).keys())
    for cond, scores in per_condition_scores.items():
        if set(scores) != future_ids:
            raise ValueError(
                f"regret requires matching future IDs across conditions; {cond} differs"
            )

    # Raw regret per (condition, dimension, future).
    # Shape: {condition: {dimension: {future: regret}}}
    regrets: dict[Condition, dict[str, dict[str, float]]] = {
        c: {d: {} for d in DIMENSIONS} for c in conditions
    }

    for f_id in future_ids:
        for dim in DIMENSIONS:
            outcomes = {
                c: _outcome_vector(per_condition_scores[c][f_id])[dim] for c in conditions
            }
            best = max(outcomes.values())
            worst = min(outcomes.values())
            denom = best - worst + _REGRET_EPSILON
            for c in conditions:
                raw = best - outcomes[c]
                normalized = raw / denom
                regrets[c][dim][f_id] = normalized

    results: dict[Condition, RegretResult] = {}
    for c in conditions:
        max_per_dim = {d: max(regrets[c][d].values()) for d in DIMENSIONS}
        mean_per_dim = {
            d: sum(regrets[c][d].values()) / len(regrets[c][d]) for d in DIMENSIONS
        }
        hurwicz_per_dim = {
            d: 0.5 * max_per_dim[d] + 0.5 * mean_per_dim[d] for d in DIMENSIONS
        }
        results[c] = RegretResult(
            max_regret_per_dimension=max_per_dim,
            mean_regret_per_dimension=mean_per_dim,
            hurwicz_05_per_dimension=hurwicz_per_dim,
            max_regret_scalar=_weighted_scalar(max_per_dim),
            mean_regret_scalar=_weighted_scalar(mean_per_dim),
            hurwicz_05_scalar=_weighted_scalar(hurwicz_per_dim),
        )
    return results
