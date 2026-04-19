"""Role, disposition, model-tier, and role-config types (sim-bench-design.md §5)."""

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field


class Role(StrEnum):
    """Turn speakers. Extends TS `Role` to per-persona granularity for the
    internal-team architecture (§5a, §5b). `system` covers automated
    events — email-send, meeting-scheduled, bundle-signed.
    """

    APPLICANT_CH = "applicant-ch"
    APPLICANT_TECH = "applicant-tech"
    UTILITY_INTAKE = "utility-intake"
    UTILITY_PLANNING = "utility-planning"
    REGULATOR = "regulator"
    SYSTEM = "system"

    @property
    def is_applicant(self) -> bool:
        return self in (Role.APPLICANT_CH, Role.APPLICANT_TECH)

    @property
    def is_utility(self) -> bool:
        return self in (Role.UTILITY_INTAKE, Role.UTILITY_PLANNING)

    @property
    def is_internal(self) -> bool:
        """Messages between personas inside the same organization are
        internal-channel traffic (C2 in §8c.iii). Used by the trace-leakage
        classifier to weight channel sensitivity correctly.
        """
        return self in (Role.APPLICANT_TECH, Role.UTILITY_INTAKE)


class Disposition(StrEnum):
    """Applicant disclosure disposition — locked per scenario (§5a)."""

    STRATEGIC = "strategic"
    HONEST_BUT_CAUTIOUS = "honest-but-cautious"
    OVERWHELMED_NEW_FILER = "overwhelmed-new-filer"
    ADVERSARIAL_DECEPTIVE = "adversarial-deceptive"
    HONEST = "honest"


class ModelTier(StrEnum):
    """Anthropic model IDs. Tier-locking per §5e — switching mid-experiment
    requires amendment per §3.2.
    """

    OPUS_4_7 = "claude-opus-4-7"
    SONNET_4_6 = "claude-sonnet-4-6"
    HAIKU_4_5 = "claude-haiku-4-5-20251001"


RolePurpose = Literal[
    "product-agent",  # D's Skill stack + A's Oracle — Opus 4.7 per §5e
    "user-sim",  # applicant / utility / regulator user-simulation — Sonnet 4.6
    "judge",  # Opus 4.7 per §5d
    "probe",  # Sonnet 4.6 per §5e — matches Staab et al. 2024 tier
    "scorer",  # Sonnet 4.6 per §5e — AgentLeak 0.72 threshold calibrated at this tier
    "paraphrase-barrier",  # Sonnet 4.6 per §5a — within-role rewriting
]


class RoleConfig(BaseModel):
    """Locked configuration for one role-persona in the sim. One instance per
    (role, scenario, condition) triple — the agent reads this instead of
    carrying config in the prompt.
    """

    role: Role
    purpose: RolePurpose
    model_tier: ModelTier
    system_prompt_template: str = Field(
        description=(
            "Prompt template with `{scenario.*}`-style placeholders. Filled in "
            "by the runner at scenario load; the result is the locked system "
            "prompt for the agent. Post-lock edits require amendment per §3.2."
        ),
    )
    visibility: list[str] = Field(
        default_factory=list,
        description=(
            "Field paths this role-persona can READ. The applicant-ch cannot "
            "read raw privateProfile details except via internal-escalation "
            "moves that route through the ParaphraseBarrierComponent; the "
            "applicant-tech can read all of privateProfile; utility roles "
            "can read only the projection / bundle."
        ),
    )
