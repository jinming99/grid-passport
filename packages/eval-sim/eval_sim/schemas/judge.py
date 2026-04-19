"""Judge output schema (sim-bench-design.md §5d)."""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class Dimension(StrEnum):
    """Five scoring dimensions — §8e Prometheus-style rubric with external-
    standard grounding.
    """

    STAKEHOLDER_ALIGNMENT = "stakeholder_alignment"
    PLANNING_DEFENSIBILITY = "planning_defensibility"
    PRIVACY_INTEGRITY = "privacy_integrity"
    REGULATORY_AUDITABILITY = "regulatory_auditability"
    APPLICANT_EXPERIENCE = "applicant_experience"


class PerDimensionScore(BaseModel):
    """One judge verdict per dimension. Must cite at least one turn ID — an
    uncited rationale is malformed and gets re-requested (§5d).
    """

    model_config = ConfigDict(extra="forbid")

    rationale: str = Field(min_length=20)
    turn_citations: list[str] = Field(
        min_length=1,
        description=(
            "Turn IDs the rationale is grounded in (e.g. ['T003', 'T017']). "
            "The turn-anchored-rubric contribution (§1.5.1 #2) — rationales "
            "without turn citations are malformed."
        ),
    )
    score: int = Field(ge=1, le=5)


class JudgeOutput(BaseModel):
    """Locked output schema per §5d. Two independent runs per transcript;
    batch-position randomized; swap-augmentation per Zheng et al. MT-Bench.
    """

    model_config = ConfigDict(extra="forbid")

    stakeholder_alignment: PerDimensionScore
    planning_defensibility: PerDimensionScore
    privacy_integrity: PerDimensionScore
    regulatory_auditability: PerDimensionScore
    applicant_experience: PerDimensionScore
    counterfactual: str = Field(
        min_length=10,
        description=(
            "'What single change would most have altered the outcome?' — one "
            "sentence referencing a specific turn. §5d §8e rubric final line."
        ),
    )
