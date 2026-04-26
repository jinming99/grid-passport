"""Turn message — transcript unit (sim-bench-design.md §5d turn-ID format)."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from eval_sim.schemas.channel import Channel
from eval_sim.schemas.role import Role


class TurnMessage(BaseModel):
    """One speaker-turn in a run transcript.

    Turn ID format is `T{n:03d}` — zero-padded to 3 digits, monotonic
    within a single run. The judge cites these IDs in its rationales
    (§5d turn-tagged scoring).
    """

    model_config = ConfigDict(extra="forbid")

    turn_id: str = Field(pattern=r"^T[0-9]{3,}$")
    speaker: Role
    recipients: list[Role] = Field(default_factory=list)
    content: str
    channel: Channel
    simulated_day: float = Field(
        ge=0.0,
        description=(
            "Simulated elapsed days from first contact (0.0) to now. "
            "Deterministic from the §6 turnaround-parameter table."
        ),
    )
    artifact_refs: list[str] = Field(
        default_factory=list,
        description=(
            "Paths to artifacts produced/referenced by this turn — "
            "email bodies, meeting notes, bundle paths, log events."
        ),
    )
