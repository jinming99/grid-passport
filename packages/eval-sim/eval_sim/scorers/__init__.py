"""Scorers — sim-bench-design.md §8.

Four categories. Each module lands in Week 2 per §12.2.

- `efficiency.py` — deterministic counts (rounds, days, artifacts, words) — §8a
- `robustness.py` — OPR + Savage-regret hybrid (~50 LOC tailored) — §8b
- `privacy/` — composite scorer (~400 LOC) with three tiers — §8c
  - `direct.py` — Presidio + substring + AgentLeak Tier-3 judge at 0.72
  - `inferential.py` — Staab probe with Presidio-anonymized public-only baseline
  - `trace.py` — channel-weighted classifier per C1/C2/C3/C5/C6/C7
- `mechanical.py` — H-workflow / H-spec.cite-correct / H-spec.hallucination-
  rate / H-spec.hallucination-in-artifact / H-trigger / H-null — §8d
- `judge.py` — Opus-judge orchestration with Prometheus template +
  swap-augmentation + BCa aggregation — §8e + §5d
"""

__all__: list[str] = []
