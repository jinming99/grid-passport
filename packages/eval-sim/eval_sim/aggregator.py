"""Aggregation — BCa bootstrap + quadratic-weighted κ + length-residual regression.

Per sim-bench-design.md §8 + §10.4 + §15. Week-2 item.

- BCa bootstrap CIs via `scipy.stats.bootstrap(method='BCa', n_resamples=10_000,
  confidence_level=0.95)` — §10.4 locked.
- Per-dimension inter-rater agreement via
  `sklearn.metrics.cohen_kappa_score(weights='quadratic')`.
- Length-residual regression via `statsmodels.formula.api.mixedlm(score ~
  log(word_count) + condition, groups=scenario)` — Dubois et al. COLM 2024.
"""

from __future__ import annotations

__all__: list[str] = []
