"""Composite privacy scorer — sim-bench-design.md §8c.

Three tiers reported independently; no summation into a single scalar
(§8c header). The ~400 LOC budget per §12.1 is split:

- `direct.py`   — Presidio exact-match + substring + AgentLeak-threshold
                  LLM paraphrase judge (§8c.i)
- `inferential.py` — Staab probe verbatim + Presidio-anonymized public-only
                     baseline (§8c.ii)
- `trace.py`    — channel-weighted classifier + CI-principle violation
                  (§8c.iii)

All LLM call-sites accept a `dry_run: bool = True` flag; default is
dry-run so pre-§17-lock imports + tests do not make API calls. After
lock, the runner flips the flag for main runs.
"""

from __future__ import annotations

from eval_sim.scorers.privacy.direct import (
    DirectLeakageScore,
    DirectLeakageVerdict,
    ParaphraseJudgeVerdict,
    compute_direct_leakage,
    grid_presidio_recognizers,
    healthcare_presidio_recognizers,
)
from eval_sim.scorers.privacy.inferential import (
    InferentialLiftScore,
    ProbeGuess,
    StaabProbe,
    compute_inferential_lift,
)
from eval_sim.scorers.privacy.trace import (
    TraceLeakageScore,
    TraceVerdict,
    compute_trace_leakage,
)

__all__ = [
    "DirectLeakageScore",
    "DirectLeakageVerdict",
    "InferentialLiftScore",
    "ParaphraseJudgeVerdict",
    "ProbeGuess",
    "StaabProbe",
    "TraceLeakageScore",
    "TraceVerdict",
    "compute_direct_leakage",
    "compute_inferential_lift",
    "compute_trace_leakage",
    "grid_presidio_recognizers",
    "healthcare_presidio_recognizers",
]
