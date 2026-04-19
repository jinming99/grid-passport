"""Aggregation — BCa bootstrap + quadratic-weighted κ + length-residual regression.

Per sim-bench-design.md §8 + §10.4 + §15. Pure statistics; no LLM calls.

- BCa bootstrap CIs via `scipy.stats.bootstrap(method='BCa', n_resamples=10_000,
  confidence_level=0.95)` — §10.4 locked.
- Per-dimension inter-rater agreement via
  `sklearn.metrics.cohen_kappa_score(weights='quadratic')`.
- Length-residual regression via `statsmodels.formula.api.ols` on the
  `score ~ log(word_count) + C(condition) + C(scenario)` formula — Dubois
  et al. COLM 2024. We use OLS with scenario fixed effects rather than
  mixedlm for v1 simplicity; upgrade path to mixedlm lives in the
  post-lock amendment if the length-control reviewer wants it.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np
from scipy import stats
from sklearn.metrics import cohen_kappa_score

from eval_sim.config import (
    BOOTSTRAP_CONFIDENCE_LEVEL,
    BOOTSTRAP_METHOD,
    BOOTSTRAP_N_RESAMPLES,
)


@dataclass(frozen=True)
class BootstrapCI:
    """BCa bootstrap 95% CI for one mean-like statistic."""

    mean: float
    low: float
    high: float
    n_resamples: int
    method: str


def bootstrap_mean_ci(
    data: Sequence[float],
    *,
    confidence_level: float = BOOTSTRAP_CONFIDENCE_LEVEL,
    n_resamples: int = BOOTSTRAP_N_RESAMPLES,
    method: str = BOOTSTRAP_METHOD,
) -> BootstrapCI:
    """BCa bootstrap CI on the mean of `data`. Uses
    `scipy.stats.bootstrap` per §10.4 locked statistical protocol.

    With N < 5, BCa acceleration may fail to compute; we fall back to the
    percentile method in that case and flag in the returned `method`.
    """
    values = np.asarray(data, dtype=float)
    if values.size == 0:
        return BootstrapCI(
            mean=float("nan"),
            low=float("nan"),
            high=float("nan"),
            n_resamples=0,
            method="empty",
        )
    mean = float(values.mean())
    if values.size == 1:
        return BootstrapCI(
            mean=mean,
            low=mean,
            high=mean,
            n_resamples=0,
            method="degenerate-n=1",
        )
    if float(np.std(values)) == 0.0:
        # All samples identical — BCa acceleration divides by zero
        # jackknife variance and emits NaN. Short-circuit with the
        # correct degenerate answer: the CI is the point.
        return BootstrapCI(
            mean=mean,
            low=mean,
            high=mean,
            n_resamples=0,
            method="degenerate-zero-variance",
        )

    effective_method = method
    try:
        result = stats.bootstrap(
            (values,),
            statistic=np.mean,
            method=method.lower(),
            confidence_level=confidence_level,
            n_resamples=n_resamples,
            rng=np.random.default_rng(seed=0xBC),
        )
        ci_low, ci_high = float(result.confidence_interval.low), float(
            result.confidence_interval.high
        )
        # scipy may emit NaN bounds under degenerate jackknife even for
        # non-constant data (rare). If that happens, fall back to percentile.
        if not (np.isfinite(ci_low) and np.isfinite(ci_high)):
            raise ValueError("BCa produced non-finite bounds")
    except (ValueError, ZeroDivisionError):
        effective_method = "percentile"
        result = stats.bootstrap(
            (values,),
            statistic=np.mean,
            method="percentile",
            confidence_level=confidence_level,
            n_resamples=n_resamples,
            rng=np.random.default_rng(seed=0xBC),
        )
    ci = result.confidence_interval
    return BootstrapCI(
        mean=mean,
        low=float(ci.low),
        high=float(ci.high),
        n_resamples=n_resamples,
        method=effective_method,
    )


def quadratic_weighted_kappa(
    rater_1: Sequence[int],
    rater_2: Sequence[int],
) -> float:
    """Per-dimension inter-rater agreement. 5-point Likert → quadratic
    weights per §5d + §10.4 locked.
    """
    y1 = np.asarray(rater_1, dtype=int)
    y2 = np.asarray(rater_2, dtype=int)
    if y1.size == 0 or y1.size != y2.size:
        raise ValueError(f"quadratic kappa requires equal non-empty inputs; got {y1.size} vs {y2.size}")
    # sklearn complains if there is only one observed class in both raters
    # (can't compute a meaningful kappa). Return 1.0 if they agree
    # perfectly on that class; 0.0 otherwise.
    if len(set(np.concatenate([y1, y2]))) == 1:
        return 1.0 if np.array_equal(y1, y2) else 0.0
    return float(cohen_kappa_score(y1, y2, weights="quadratic"))


# ────────────────────────────────────────────────────────────────────────
# Length-residual regression — §10.4 + Dubois et al. COLM 2024
# ────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class LengthResidualFit:
    """Summary of `score ~ log(word_count) + C(condition) + C(scenario)` OLS.

    `condition_coefs` is a mapping from condition label (e.g. "B", "C", "D")
    to its coefficient relative to the baseline (lexicographically first).
    If any `condition_coefs` value survives the length control — i.e. has
    a t-statistic that meets significance — the raw-score ranking is
    length-independent and the raw mean is the headline. Otherwise the
    length-controlled residual is the headline (§15 rule).
    """

    condition_coefs: dict[str, float]
    condition_pvalues: dict[str, float]
    log_wc_coef: float
    log_wc_pvalue: float
    n_observations: int
    r_squared: float


def length_residual_regression(
    *,
    scores: Sequence[float],
    word_counts: Sequence[int],
    conditions: Sequence[str],
    scenarios: Sequence[str],
) -> LengthResidualFit:
    """OLS regression with scenario as fixed effect per §10.4.

    Formula: `score ~ log(word_count) + C(condition) + C(scenario)`.

    Lazy-imports statsmodels to keep the top-of-module imports quick.
    """
    import pandas as pd
    import statsmodels.formula.api as smf

    if not (len(scores) == len(word_counts) == len(conditions) == len(scenarios)):
        raise ValueError("length_residual_regression inputs must have equal lengths")
    df = pd.DataFrame(
        {
            "score": scores,
            "word_count": word_counts,
            "condition": conditions,
            "scenario": scenarios,
        }
    )
    df["log_wc"] = np.log(df["word_count"].astype(float).clip(lower=1.0))
    model = smf.ols("score ~ log_wc + C(condition) + C(scenario)", data=df).fit()

    condition_coefs: dict[str, float] = {}
    condition_pvalues: dict[str, float] = {}
    for name in model.params.index:
        if name.startswith("C(condition)[T."):
            label = name.removeprefix("C(condition)[T.").removesuffix("]")
            condition_coefs[label] = float(model.params[name])
            condition_pvalues[label] = float(model.pvalues[name])

    return LengthResidualFit(
        condition_coefs=condition_coefs,
        condition_pvalues=condition_pvalues,
        log_wc_coef=float(model.params.get("log_wc", float("nan"))),
        log_wc_pvalue=float(model.pvalues.get("log_wc", float("nan"))),
        n_observations=int(model.nobs),
        r_squared=float(model.rsquared),
    )


__all__ = [
    "BootstrapCI",
    "LengthResidualFit",
    "bootstrap_mean_ci",
    "length_residual_regression",
    "quadratic_weighted_kappa",
]
