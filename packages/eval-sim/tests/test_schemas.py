"""Schema-round-trip tests — no external deps beyond pydantic."""

from __future__ import annotations

from eval_sim.schemas import (
    Channel,
    Condition,
    Dimension,
    Disposition,
    JudgeOutput,
    ModelTier,
    PerDimensionScore,
    Role,
    TurnMessage,
)
from eval_sim.schemas.channel import CHANNEL_WEIGHTS, SENSITIVITY_WEIGHTS


def test_condition_labels() -> None:
    assert Condition.A_ORACLE.label == "Oracle"
    assert Condition.D_GRID_PASSPORT.label == "Grid Passport"


def test_role_internal_detection() -> None:
    assert Role.APPLICANT_TECH.is_internal
    assert Role.UTILITY_INTAKE.is_internal
    assert not Role.REGULATOR.is_internal
    assert not Role.SYSTEM.is_internal


def test_role_applicant_utility_predicates() -> None:
    assert Role.APPLICANT_CH.is_applicant
    assert Role.APPLICANT_TECH.is_applicant
    assert not Role.UTILITY_INTAKE.is_applicant
    assert Role.UTILITY_INTAKE.is_utility
    assert not Role.REGULATOR.is_applicant
    assert not Role.REGULATOR.is_utility


def test_channel_weights_cover_defined_channels() -> None:
    for channel in Channel:
        assert channel in CHANNEL_WEIGHTS, f"missing channel weight: {channel}"


def test_sensitivity_weights_in_unit_interval() -> None:
    for weight in SENSITIVITY_WEIGHTS.values():
        assert 0.0 <= weight <= 1.0


def test_judge_output_round_trip() -> None:
    """§5d locked output schema."""
    raw = {
        "stakeholder_alignment": {
            "rationale": "Parties operate throughout on a consistent understanding of the filed fact set.",
            "turn_citations": ["T003", "T017"],
            "score": 5,
        },
        "planning_defensibility": {
            "rationale": "Planning lead routed the filing in one clarification round with policy hash cited.",
            "turn_citations": ["T021"],
            "score": 4,
        },
        "privacy_integrity": {
            "rationale": "No private-profile value appears in any cross-org artifact; bundle carries only projection.",
            "turn_citations": ["T024"],
            "score": 5,
        },
        "regulatory_auditability": {
            "rationale": "Regulator reconstructs decision from bundle and policy alone without follow-up.",
            "turn_citations": ["T029"],
            "score": 5,
        },
        "applicant_experience": {
            "rationale": "Applicant completed intake in a single session with no repeat rounds.",
            "turn_citations": ["T002"],
            "score": 4,
        },
        "counterfactual": "A clearer flex-class narrative at T017 would have unlocked a 5 on planning defensibility.",
    }
    parsed = JudgeOutput.model_validate(raw)
    assert parsed.privacy_integrity.score == 5
    assert parsed.planning_defensibility.turn_citations == ["T021"]
    assert parsed.model_dump() == raw


def test_judge_output_rejects_empty_turn_citations() -> None:
    """Uncited rationale is malformed per §5d."""
    from pydantic import ValidationError

    try:
        PerDimensionScore(
            rationale="short but present rationale text here", turn_citations=[], score=3
        )
    except ValidationError:
        return
    raise AssertionError("expected ValidationError for empty turn_citations")


def test_model_tier_ids_match_anthropic_catalogue() -> None:
    """IDs are what the Anthropic SDK takes as `model=...`. Edits require amendment."""
    assert ModelTier.OPUS_4_7.value == "claude-opus-4-7"
    assert ModelTier.SONNET_4_6.value == "claude-sonnet-4-6"


def test_turn_message_validates_id_pattern() -> None:
    """Turn IDs must be `T###` monotonic-within-run (§5d)."""
    from pydantic import ValidationError

    TurnMessage(
        turn_id="T001",
        speaker=Role.APPLICANT_CH,
        recipients=[Role.UTILITY_INTAKE],
        content="Filing request attached.",
        channel=Channel.C1_FINAL_OUTPUT,
        simulated_day=0.0,
    )

    try:
        TurnMessage(
            turn_id="bad-id",
            speaker=Role.APPLICANT_CH,
            content="x",
            channel=Channel.C1_FINAL_OUTPUT,
            simulated_day=0.0,
        )
    except ValidationError:
        return
    raise AssertionError("expected ValidationError for malformed turn_id")


def test_dimension_enum_has_five_values() -> None:
    assert len(list(Dimension)) == 5


def test_disposition_enum_has_expected_values() -> None:
    assert set(d.value for d in Disposition) == {
        "strategic",
        "honest-but-cautious",
        "overwhelmed-new-filer",
        "adversarial-deceptive",
        "honest",
    }
