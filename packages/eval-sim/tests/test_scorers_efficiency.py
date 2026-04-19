"""Tests for eval_sim.scorers.efficiency (§8a deterministic counts)."""

from __future__ import annotations

from eval_sim.schemas.channel import Channel
from eval_sim.schemas.role import Role
from eval_sim.schemas.turn import TurnMessage
from eval_sim.scorers.efficiency import compute_efficiency


def _t(
    turn_id: str,
    speaker: Role,
    recipients: list[Role],
    content: str,
    channel: Channel,
    day: float,
    artifact_refs: list[str] | None = None,
) -> TurnMessage:
    return TurnMessage(
        turn_id=turn_id,
        speaker=speaker,
        recipients=recipients,
        content=content,
        channel=channel,
        simulated_day=day,
        artifact_refs=artifact_refs or [],
    )


def test_empty_transcript_zero_metrics() -> None:
    m = compute_efficiency([])
    assert m.communication_rounds == 0
    assert m.simulated_elapsed_days == 0.0


def test_cross_org_round_counted() -> None:
    transcript = [
        _t(
            "T001",
            Role.APPLICANT_CH,
            [Role.UTILITY_INTAKE],
            "Filing request attached.",
            Channel.C1_FINAL_OUTPUT,
            0.0,
        ),
        _t(
            "T002",
            Role.UTILITY_INTAKE,
            [Role.APPLICANT_CH],
            "Received, routing to planning.",
            Channel.C1_FINAL_OUTPUT,
            3.0,
        ),
    ]
    m = compute_efficiency(transcript)
    assert m.communication_rounds == 2


def test_internal_persona_turn_not_counted_as_round() -> None:
    transcript = [
        _t(
            "T001",
            Role.APPLICANT_CH,
            [Role.APPLICANT_TECH],
            "What's our actual flex percent?",
            Channel.C2_INTER_PERSONA,
            0.0,
        ),
        _t(
            "T002",
            Role.APPLICANT_TECH,
            [Role.APPLICANT_CH],
            "22%",
            Channel.C2_INTER_PERSONA,
            1.0,
        ),
    ]
    m = compute_efficiency(transcript)
    assert m.communication_rounds == 0, "internal turns are not cross-org rounds"


def test_clarification_round_substring_match() -> None:
    transcript = [
        _t(
            "T001",
            Role.UTILITY_INTAKE,
            [Role.APPLICANT_CH],
            "Could you clarify the workload mix breakdown?",
            Channel.C1_FINAL_OUTPUT,
            4.0,
        ),
        _t(
            "T002",
            Role.APPLICANT_CH,
            [Role.UTILITY_INTAKE],
            "Attached: revised filing.",
            Channel.C1_FINAL_OUTPUT,
            7.0,
        ),
    ]
    m = compute_efficiency(transcript)
    assert m.communication_rounds == 2
    assert m.clarification_rounds == 1


def test_simulated_elapsed_days_is_max() -> None:
    transcript = [
        _t("T001", Role.APPLICANT_CH, [Role.UTILITY_INTAKE], "a", Channel.C1_FINAL_OUTPUT, 0.0),
        _t("T002", Role.UTILITY_INTAKE, [Role.APPLICANT_CH], "b", Channel.C1_FINAL_OUTPUT, 5.0),
        _t("T003", Role.APPLICANT_CH, [Role.UTILITY_INTAKE], "c", Channel.C1_FINAL_OUTPUT, 12.0),
    ]
    m = compute_efficiency(transcript)
    assert m.simulated_elapsed_days == 12.0


def test_artifact_count_sums() -> None:
    transcript = [
        _t(
            "T001",
            Role.APPLICANT_CH,
            [Role.UTILITY_INTAKE],
            "Filing + bundle attached.",
            Channel.C1_FINAL_OUTPUT,
            0.0,
            artifact_refs=["bundle.json", "filing.pdf"],
        ),
        _t(
            "T002",
            Role.UTILITY_INTAKE,
            [Role.APPLICANT_CH],
            "Confirmation + receipt.",
            Channel.C1_FINAL_OUTPUT,
            3.0,
            artifact_refs=["receipt.pdf"],
        ),
    ]
    m = compute_efficiency(transcript)
    assert m.artifact_count == 3


def test_meeting_count_from_system_turns() -> None:
    transcript = [
        _t(
            "T010",
            Role.SYSTEM,
            [],
            "Meeting scheduled for 2026-05-15.",
            Channel.C7_ARTIFACTS,
            10.0,
        ),
    ]
    m = compute_efficiency(transcript)
    assert m.meeting_count == 1


def test_total_words_across_turns() -> None:
    transcript = [
        _t(
            "T001",
            Role.APPLICANT_CH,
            [Role.UTILITY_INTAKE],
            "Five words in this turn",  # 5 words
            Channel.C1_FINAL_OUTPUT,
            0.0,
        ),
        _t(
            "T002",
            Role.UTILITY_INTAKE,
            [Role.APPLICANT_CH],
            "Three more words",  # 3 words
            Channel.C1_FINAL_OUTPUT,
            3.0,
        ),
    ]
    m = compute_efficiency(transcript)
    assert m.total_words_exchanged == 8
