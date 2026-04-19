"""Per-condition channels — sim-bench-design.md §6.

Pre-§17-lock this module exposes the deterministic failure-mode sampler
(`failure_modes.py`) + meeting-trigger state machine. Full Concordia
Game Master wiring per condition lands Week 2.

Planned classes (Week 2):
- `OracleChannelGM` (A) — shared-state; Cartographer reads cache; §6d
- `EmailChannelGM` (B) — typed Email / Meeting structs + archetype-
  specific failure-mode sampler (from this module) + 3+-round meeting
  trigger (from this module); §6a
- `PromptOnlyBundleChannelGM` (C) — bundle + live Cartographer with
  hallucination risk; §6c
- `SkillBundleChannelGM` (D) — bundle + cached Cartographer + bounded-
  query channel; §6b + §6e
"""

from eval_sim.channels.failure_modes import (
    FailureModeSample,
    MeetingTriggerState,
    sample_failure_modes,
)

__all__ = [
    "FailureModeSample",
    "MeetingTriggerState",
    "sample_failure_modes",
]
