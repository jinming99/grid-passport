"""Tests for eval_sim.scorers.mechanical (§8d H-axes with A-2 decomposition)."""

from __future__ import annotations

import pytest

from eval_sim.schemas.channel import Channel
from eval_sim.schemas.role import Role
from eval_sim.schemas.turn import TurnMessage
from eval_sim.scorers.mechanical import (
    SourceRefRecord,
    compute_h_null,
    compute_h_spec,
    compute_h_trigger,
    compute_h_workflow,
    compute_mechanical,
)


def test_h_workflow_empty_is_unit() -> None:
    assert compute_h_workflow([]) == 1.0


def test_h_workflow_fraction_of_passes() -> None:
    assert compute_h_workflow([True, True, False, True]) == 0.75


def test_h_spec_all_whitelisted_is_clean() -> None:
    refs = [
        SourceRefRecord(
            url="https://msc.fema.gov/portal",
            generated_at_turn="T003",
            accepted_into_artifact=True,
            matches_whitelist=True,
            exists_on_web=True,
            finding_attributable_to_endpoint=True,
        ),
    ]
    rates = compute_h_spec(refs, {"https://msc.fema.gov/portal"}, cartographer_live=False)
    cite_correct, halluc_pre, halluc_post, validator_refused, _skill_never = rates
    assert cite_correct == 1.0
    assert halluc_pre == 0.0
    assert halluc_post == 0.0
    assert validator_refused == 0


def test_h_spec_validator_refusal_decomposition() -> None:
    """The §8d A-2 decomposition: a hallucinated URL refused by the
    validator should count in pre-validator rate but not in-artifact rate.
    """
    refs = [
        SourceRefRecord(
            url="https://fema.example-fake.gov/nonexistent",
            generated_at_turn="T004",
            accepted_into_artifact=False,  # paired validator refused it
            matches_whitelist=False,
            exists_on_web=False,
            finding_attributable_to_endpoint=False,
        ),
        SourceRefRecord(
            url="https://msc.fema.gov/portal",
            generated_at_turn="T005",
            accepted_into_artifact=True,
            matches_whitelist=True,
            exists_on_web=True,
            finding_attributable_to_endpoint=True,
        ),
    ]
    _, halluc_pre, halluc_post, validator_refused, _ = compute_h_spec(
        refs,
        {"https://msc.fema.gov/portal"},
        cartographer_live=False,
    )
    # 1 out of 2 is hallucinated pre-validator; 0 reached the artifact; 1 refused.
    assert halluc_pre == 0.5
    assert halluc_post == 0.0
    assert validator_refused == 1


def test_h_spec_condition_c_no_validator_refusal() -> None:
    """Condition C (live, no paired validator): everything generated
    reaches the artifact. halluc_post == halluc_pre.
    """
    refs = [
        SourceRefRecord(
            url="https://fabricated.example",
            generated_at_turn="T006",
            accepted_into_artifact=True,  # no validator to refuse
            matches_whitelist=False,
            exists_on_web=False,
            finding_attributable_to_endpoint=None,
        ),
    ]
    _, halluc_pre, halluc_post, validator_refused, _ = compute_h_spec(
        refs, set(), cartographer_live=True
    )
    assert halluc_pre == 1.0
    assert halluc_post == 1.0
    assert validator_refused == 0


def test_h_trigger_matches() -> None:
    pairs = [
        ("interviewer", "interviewer"),
        ("cartographer", "cartographer"),
        ("interviewer", "cartographer"),  # wrong Skill
    ]
    assert compute_h_trigger(pairs) == pytest.approx(2 / 3)


def test_h_null_applicant_leak_to_utility() -> None:
    """Private token in a cross-org applicant→utility turn counts as a leak."""
    transcript = [
        TurnMessage(
            turn_id="T001",
            speaker=Role.APPLICANT_CH,
            recipients=[Role.UTILITY_INTAKE],
            content="Our workload mix is 55% training / 45% inference.",
            channel=Channel.C1_FINAL_OUTPUT,
            simulated_day=0.0,
        ),
    ]
    leaks = compute_h_null(transcript, private_tokens={"55", "45"})
    assert leaks == 1


def test_h_null_internal_turn_does_not_leak() -> None:
    """Applicant-internal C2 turn with a private token is not a leak — it's
    authorized-within-applicant-org traffic.
    """
    transcript = [
        TurnMessage(
            turn_id="T002",
            speaker=Role.APPLICANT_TECH,
            recipients=[Role.APPLICANT_CH],
            content="Internal note: flex is 22%.",
            channel=Channel.C2_INTER_PERSONA,
            simulated_day=0.0,
        ),
    ]
    assert compute_h_null(transcript, private_tokens={"22"}) == 0


def test_h_null_word_boundary_rejects_ambiguous_substring() -> None:
    """Amendment A-4: `"9"` must NOT match inside `"95 MW"` or `"2028"`.
    Pre-A-4 this was a false positive; post-A-4 word-boundary matching
    catches only standalone numerics.
    """
    transcript = [
        TurnMessage(
            turn_id="T001",
            speaker=Role.APPLICANT_CH,
            recipients=[Role.UTILITY_INTAKE],
            content="Filing for 95 MW at Leesburg, target COD Q2 2028.",
            channel=Channel.C1_FINAL_OUTPUT,
            simulated_day=0.0,
        ),
    ]
    # Bare "9" must NOT match "95" or "2028" under word-boundary rule.
    assert compute_h_null(transcript, private_tokens={"9"}) == 0


def test_h_null_word_boundary_still_catches_standalone() -> None:
    """Amendment A-4: word-boundary is NOT the LLM judge — bare standalone
    numerics are still caught. Ensures the canary still fires where it
    should.
    """
    transcript = [
        TurnMessage(
            turn_id="T001",
            speaker=Role.APPLICANT_CH,
            recipients=[Role.UTILITY_INTAKE],
            content="Our flex percent is 9 for this filing.",
            channel=Channel.C1_FINAL_OUTPUT,
            simulated_day=0.0,
        ),
    ]
    # Standalone "9" (surrounded by whitespace) IS a leak.
    assert compute_h_null(transcript, private_tokens={"9"}) == 1


def test_h_null_word_boundary_catches_canonical_unit_forms() -> None:
    """Amendment A-4: canonical-unit forms like "9%" work because `%` is
    a non-word character — `\\b9%\\b` matches "9%" but not "19%" (boundary
    fails before the `9`).
    """
    transcript = [
        TurnMessage(
            turn_id="T001",
            speaker=Role.APPLICANT_CH,
            recipients=[Role.UTILITY_INTAKE],
            content="Flex commitment: 9% of nameplate.",
            channel=Channel.C1_FINAL_OUTPUT,
            simulated_day=0.0,
        ),
        TurnMessage(
            turn_id="T002",
            speaker=Role.APPLICANT_CH,
            recipients=[Role.UTILITY_INTAKE],
            content="Unrelated note: peak load is 19% above baseline.",
            channel=Channel.C1_FINAL_OUTPUT,
            simulated_day=1.0,
        ),
    ]
    # "9%" matches turn 1 but NOT turn 2 where "9%" appears inside "19%".
    assert compute_h_null(transcript, private_tokens={"9%"}) == 1


def test_compute_mechanical_integrates() -> None:
    """Smoke test that the orchestration helper wires every axis through."""
    refs = [
        SourceRefRecord(
            url="https://msc.fema.gov/portal",
            generated_at_turn="T003",
            accepted_into_artifact=True,
            matches_whitelist=True,
            exists_on_web=True,
            finding_attributable_to_endpoint=True,
        ),
    ]
    result = compute_mechanical(
        validator_pass_per_turn=[True, True, True],
        source_refs=refs,
        whitelist_urls={"https://msc.fema.gov/portal"},
        cartographer_live=False,
        skill_per_turn=[("interviewer", "interviewer")],
        transcript=[
            TurnMessage(
                turn_id="T001",
                speaker=Role.APPLICANT_CH,
                recipients=[Role.UTILITY_INTAKE],
                content="Filing.",
                channel=Channel.C1_FINAL_OUTPUT,
                simulated_day=0.0,
            )
        ],
        private_tokens=set(),
    )
    assert result.h_workflow_pass_rate == 1.0
    assert result.h_spec_cite_correct_rate == 1.0
    assert result.h_spec_hallucination_in_artifact_rate == 0.0
    assert result.h_null_leak_count == 0
