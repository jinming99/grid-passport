"""Efficiency metrics — sim-bench-design.md §8a.

Deterministic counts from the run log. No LLM calls; no I/O beyond reading
the TurnMessage sequence + run metadata. Pure functions so the numbers
reproduce byte-for-byte from the same input.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass

from eval_sim.schemas.role import Role
from eval_sim.schemas.turn import TurnMessage


@dataclass(frozen=True)
class EfficiencyMetrics:
    """Per-run efficiency summary per §8a table.

    All counts are from the TurnMessage log; no external state.
    """

    communication_rounds: int
    clarification_rounds: int
    simulated_elapsed_days: float
    artifact_count: int
    total_words_exchanged: int
    meeting_count: int


def _is_cross_org_round(turn: TurnMessage) -> bool:
    """A cross-org turn is one whose speaker and at least one recipient are
    in different organizational buckets (applicant / utility / regulator).
    Internal turns (C2/C5) don't count as communication rounds.
    """
    if not turn.recipients:
        return False
    speaker_org = _org(turn.speaker)
    return any(_org(r) != speaker_org for r in turn.recipients if r != Role.SYSTEM)


def _org(role: Role) -> str:
    if role.is_applicant:
        return "applicant"
    if role.is_utility:
        return "utility"
    if role == Role.REGULATOR:
        return "regulator"
    return "system"


def _count_words(text: str) -> int:
    """Split on whitespace. Crude but matches how the §8a "total_words"
    proxy-for-staff-burden is intended (not tokenized-BPE).
    """
    return len(text.split())


def compute_efficiency(
    transcript: Iterable[TurnMessage],
    clarification_tags: set[str] | None = None,
) -> EfficiencyMetrics:
    """Compute §8a efficiency metrics from a run's transcript.

    `clarification_tags` is an optional set of substrings that, if present
    in a cross-org turn's content, mark it as a clarification round (as
    opposed to an original message or a decision). Default is a minimal
    English-language tag set; scenarios can extend per run.
    """
    tags = clarification_tags or {
        "could you clarify",
        "can you clarify",
        "please confirm",
        "to confirm",
        "we need",
        "missing",
        "unclear",
        "follow up",
    }

    turns = list(transcript)
    if not turns:
        return EfficiencyMetrics(0, 0, 0.0, 0, 0, 0)

    communication_rounds = sum(1 for t in turns if _is_cross_org_round(t))
    clarification_rounds = sum(
        1
        for t in turns
        if _is_cross_org_round(t) and any(tag in t.content.lower() for tag in tags)
    )
    simulated_elapsed_days = max(t.simulated_day for t in turns)
    artifact_count = sum(len(t.artifact_refs) for t in turns)
    total_words_exchanged = sum(_count_words(t.content) for t in turns)
    meeting_count = sum(
        1
        for t in turns
        if t.speaker == Role.SYSTEM and "meeting" in t.content.lower()
    )

    return EfficiencyMetrics(
        communication_rounds=communication_rounds,
        clarification_rounds=clarification_rounds,
        simulated_elapsed_days=simulated_elapsed_days,
        artifact_count=artifact_count,
        total_words_exchanged=total_words_exchanged,
        meeting_count=meeting_count,
    )
