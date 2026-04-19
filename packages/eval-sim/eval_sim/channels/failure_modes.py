"""Condition-B failure-mode sampler — sim-bench-design.md §6a.

Deterministic from `SHA256(scenarioId || seedIndex)` per §10.2 so that a
given seed produces the same failure-mode sequence across reruns. Base
rates come from `eval_sim.config.FAILURE_RATES_B`, which are the locked
§6a archetype-specific parameters.

Pure functions — no I/O, no LLM calls. Sensitivity analysis re-runs
with rates scaled at {0.5×, 1×, 2×} per §10.4 by passing a `scale`
parameter.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass

from eval_sim.config import FAILURE_RATES_B


def _seed_bytes(scenario_id: str, seed_index: int) -> bytes:
    """Deterministic bytes per §10.2: `SHA256(scenarioId || seedIndex)`.
    The first 16 bytes provide 128 bits of determinism; callers consume
    bytes in sequence for repeated sampling within one run.
    """
    payload = f"{scenario_id}|{seed_index}".encode()
    return hashlib.sha256(payload).digest()


def _sample_bits(digest: bytes, cursor: int) -> tuple[float, int]:
    """Consume 4 bytes of digest starting at `cursor`, return a float in
    [0, 1) + new cursor. If we run past the end, rehash the digest to
    get fresh bytes (with the cursor-as-counter for determinism).
    """
    if cursor + 4 > len(digest):
        digest = hashlib.sha256(digest + cursor.to_bytes(4, "big")).digest()
        cursor = 0
    chunk = digest[cursor : cursor + 4]
    value = int.from_bytes(chunk, "big") / 0x1_0000_0000  # [0, 1)
    return value, cursor + 4


@dataclass(frozen=True)
class FailureModeSample:
    """One deterministic sample for a given (scenario, seed, scale) tuple."""

    wrong_cc: bool
    scheduler_assistant_cc: bool
    paraphrase_loss: bool
    expertise_gap_leak: bool
    meeting_notes_reuse: bool
    wrong_spec_form_field: bool


def sample_failure_modes(
    scenario_id: str,
    seed_index: int,
    *,
    scale: float = 1.0,
) -> FailureModeSample:
    """Sample which failure modes fire for this (scenario, seed) per §6a.

    `scale` multiplies every base rate — sensitivity analysis at {0.5, 1,
    2} per §10.4 passes the scale factor. Rates are clamped to [0, 1].
    """
    if scenario_id not in FAILURE_RATES_B:
        raise KeyError(f"no §6a failure rates for scenario {scenario_id}")
    rates = FAILURE_RATES_B[scenario_id]
    digest = _seed_bytes(scenario_id, seed_index)
    cursor = 0

    def _fire(rate_name: str) -> bool:
        nonlocal cursor
        base = rates.get(rate_name, 0.0)
        scaled = max(0.0, min(1.0, base * scale))
        draw, cursor = _sample_bits(digest, cursor)
        return draw < scaled

    return FailureModeSample(
        wrong_cc=_fire("wrong_cc"),
        scheduler_assistant_cc=_fire("scheduler_assistant_cc"),
        paraphrase_loss=_fire("paraphrase_loss"),
        expertise_gap_leak=_fire("expertise_gap_leak"),
        meeting_notes_reuse=_fire("meeting_notes_reuse"),
        wrong_spec_form_field=_fire("wrong_spec_form_field"),
    )


@dataclass(frozen=True)
class MeetingTriggerState:
    """Tracks cross-org email rounds between applicant-ch and utility
    so the channel can trigger a meeting after 3+ unresolved rounds
    per §6a meeting protocol.
    """

    unresolved_rounds: int

    def should_trigger(self, threshold: int = 3) -> bool:
        return self.unresolved_rounds >= threshold

    def advance(self, resolved: bool) -> MeetingTriggerState:
        if resolved:
            return MeetingTriggerState(0)
        return MeetingTriggerState(self.unresolved_rounds + 1)
