"""Tests for eval_sim.channels.failure_modes (§6a deterministic sampler)."""

from __future__ import annotations

import pytest

from eval_sim.channels.failure_modes import (
    MeetingTriggerState,
    sample_failure_modes,
)


def test_sample_failure_modes_deterministic_by_seed() -> None:
    """§10.2 — `SHA256(scenarioId || seedIndex)` means the same inputs
    produce the same outputs across reruns. Fundamental for reproducibility.
    """
    s1 = sample_failure_modes("S1", 42)
    s2 = sample_failure_modes("S1", 42)
    assert s1 == s2


def test_sample_failure_modes_different_seeds_typically_diverge() -> None:
    """Different seeds sampling from non-extreme probabilities should produce
    different outcomes for at least one failure mode across a handful of
    attempts. (This test can flake theoretically with extreme rates, so we
    compare ~5 pairs of seeds and require at least one divergence.)
    """
    baseline = sample_failure_modes("S1", 0)
    diverged = False
    for s in range(1, 6):
        if sample_failure_modes("S1", s) != baseline:
            diverged = True
            break
    assert diverged, "seeds 1-5 all produced identical failure-mode samples vs seed 0"


def test_sample_failure_modes_unknown_scenario_raises() -> None:
    with pytest.raises(KeyError, match="S99"):
        sample_failure_modes("S99", 0)


def test_sample_failure_modes_scale_zero_suppresses_everything() -> None:
    """scale=0.0 means every failure mode is effectively rate 0 — nothing fires."""
    sample = sample_failure_modes("S1", 0, scale=0.0)
    assert sample.wrong_cc is False
    assert sample.scheduler_assistant_cc is False
    assert sample.paraphrase_loss is False
    assert sample.expertise_gap_leak is False
    assert sample.meeting_notes_reuse is False
    assert sample.wrong_spec_form_field is False


def test_sample_failure_modes_scale_two_x_increases_hit_rate() -> None:
    """scale=2.0 roughly doubles each base rate (clamped to 1). Across N
    seeds we should see at least as many hits as scale=1.0 — this is a
    statistical property, tested across 50 seeds as a sanity check.
    """
    baseline_hits = sum(
        any(
            getattr(sample_failure_modes("S1", s, scale=1.0), f)
            for f in ("wrong_cc", "paraphrase_loss", "meeting_notes_reuse")
        )
        for s in range(50)
    )
    doubled_hits = sum(
        any(
            getattr(sample_failure_modes("S1", s, scale=2.0), f)
            for f in ("wrong_cc", "paraphrase_loss", "meeting_notes_reuse")
        )
        for s in range(50)
    )
    assert doubled_hits >= baseline_hits


def test_meeting_trigger_state_increments_on_unresolved() -> None:
    state = MeetingTriggerState(unresolved_rounds=0)
    state = state.advance(resolved=False)
    assert state.unresolved_rounds == 1
    state = state.advance(resolved=False)
    assert state.unresolved_rounds == 2
    assert state.should_trigger() is False
    state = state.advance(resolved=False)
    assert state.should_trigger() is True  # 3 meets the default threshold


def test_meeting_trigger_state_resets_on_resolved() -> None:
    state = MeetingTriggerState(unresolved_rounds=2)
    state = state.advance(resolved=True)
    assert state.unresolved_rounds == 0
