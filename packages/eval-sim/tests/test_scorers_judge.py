"""Tests for eval_sim.scorers.judge (§5d + §8e judge orchestration)."""

from __future__ import annotations

import pytest

from eval_sim.schemas.channel import Channel
from eval_sim.schemas.judge import Dimension, JudgeOutput, PerDimensionScore
from eval_sim.schemas.role import Role
from eval_sim.schemas.turn import TurnMessage
from eval_sim.scorers.judge import (
    JUDGE_PROMPT_TEMPLATE,
    JudgeInvocation,
    find_disagreements,
    invoke_judge,
    judge_with_swap,
    parse_judge_output,
    tag_transcript,
)

# ────────────────────────────────────────────────────────────────────────
# Locked-prompt fences
# ────────────────────────────────────────────────────────────────────────


def test_judge_prompt_is_locked() -> None:
    """Byte-level sentinels verifying the Prometheus ABSOLUTE_PROMPT_WO_REF
    verbatim + our turn-tagged extension (§1.5.1 #2)."""
    # Prometheus marker
    assert "###Task Description:" in JUDGE_PROMPT_TEMPLATE
    assert "###Score Rubric:" in JUDGE_PROMPT_TEMPLATE
    # Turn-tagged extension
    assert "multi-agent, turn-tagged" in JUDGE_PROMPT_TEMPLATE
    assert "rationales without turn citations are malformed" in JUDGE_PROMPT_TEMPLATE
    # Placeholders match the caller's format() args
    assert "{transcript_with_turn_ids}" in JUDGE_PROMPT_TEMPLATE
    assert "{five_dimension_rubric}" in JUDGE_PROMPT_TEMPLATE


# ────────────────────────────────────────────────────────────────────────
# Transcript tagging
# ────────────────────────────────────────────────────────────────────────


def test_tag_transcript_formats_t_prefix_and_role() -> None:
    turns = [
        TurnMessage(
            turn_id="T001",
            speaker=Role.APPLICANT_CH,
            recipients=[Role.UTILITY_INTAKE],
            content="Filing request attached.",
            channel=Channel.C1_FINAL_OUTPUT,
            simulated_day=0.0,
        ),
        TurnMessage(
            turn_id="T002",
            speaker=Role.UTILITY_INTAKE,
            recipients=[Role.APPLICANT_CH],
            content="Received.",
            channel=Channel.C1_FINAL_OUTPUT,
            simulated_day=3.0,
        ),
    ]
    formatted = tag_transcript(turns)
    assert "[T001][applicant-ch] Filing request attached." in formatted
    assert "[T002][utility-intake] Received." in formatted


# ────────────────────────────────────────────────────────────────────────
# Dry-run judge
# ────────────────────────────────────────────────────────────────────────


def test_invoke_judge_dry_run_returns_neutral_scores() -> None:
    invocation = JudgeInvocation(
        transcript_formatted="[T001][applicant-ch] hello",
        rubric_text="(rubric text)",
        batch_position=0,
        batch_id="test-batch",
    )
    out = invoke_judge(invocation=invocation, dry_run=True)
    assert isinstance(out, JudgeOutput)
    assert out.stakeholder_alignment.score == 3
    assert out.privacy_integrity.turn_citations == ["T001"]
    assert out.counterfactual.startswith("dry_run")


# ────────────────────────────────────────────────────────────────────────
# JSON parse tolerance
# ────────────────────────────────────────────────────────────────────────


def test_parse_judge_output_extracts_outermost_json() -> None:
    raw = """Some preamble.
```json
{
  "stakeholder_alignment":    {"rationale": "Parties aligned throughout the transcript.", "turn_citations": ["T003"], "score": 4},
  "planning_defensibility":   {"rationale": "Planning lead routed with one clarification.", "turn_citations": ["T007"], "score": 4},
  "privacy_integrity":        {"rationale": "No raw value appeared in any cross-org artifact.", "turn_citations": ["T012"], "score": 5},
  "regulatory_auditability":  {"rationale": "Regulator reconstructs decision from bundle alone.", "turn_citations": ["T020"], "score": 5},
  "applicant_experience":     {"rationale": "Applicant completed intake in one session.", "turn_citations": ["T001"], "score": 4},
  "counterfactual": "A clearer flex-class narrative at T007 would have unlocked a 5 on defensibility."
}
```
trailing prose
"""
    out = parse_judge_output(raw)
    assert out.privacy_integrity.score == 5
    assert out.stakeholder_alignment.turn_citations == ["T003"]


def test_parse_judge_output_rejects_missing_turn_citations() -> None:
    """Rationale without turn_citations must fail Pydantic validation per §5d."""
    from pydantic import ValidationError

    raw = """{
  "stakeholder_alignment":    {"rationale": "Parties aligned throughout the transcript.", "turn_citations": [], "score": 4},
  "planning_defensibility":   {"rationale": "ok ok ok.", "turn_citations": ["T001"], "score": 3},
  "privacy_integrity":        {"rationale": "ok ok ok.", "turn_citations": ["T002"], "score": 3},
  "regulatory_auditability":  {"rationale": "ok ok ok.", "turn_citations": ["T003"], "score": 3},
  "applicant_experience":     {"rationale": "ok ok ok.", "turn_citations": ["T004"], "score": 3},
  "counterfactual": "something at T001"
}"""
    with pytest.raises(ValidationError):
        parse_judge_output(raw)


def test_parse_judge_output_raises_on_no_json() -> None:
    with pytest.raises(ValueError, match="no JSON object"):
        parse_judge_output("not a JSON payload at all")


# ────────────────────────────────────────────────────────────────────────
# Disagreement detection + swap augmentation
# ────────────────────────────────────────────────────────────────────────


def _make_output(scores: dict[Dimension, int]) -> JudgeOutput:
    return JudgeOutput(
        stakeholder_alignment=PerDimensionScore(
            rationale="r" * 25, turn_citations=["T001"], score=scores[Dimension.STAKEHOLDER_ALIGNMENT]
        ),
        planning_defensibility=PerDimensionScore(
            rationale="r" * 25, turn_citations=["T001"], score=scores[Dimension.PLANNING_DEFENSIBILITY]
        ),
        privacy_integrity=PerDimensionScore(
            rationale="r" * 25, turn_citations=["T001"], score=scores[Dimension.PRIVACY_INTEGRITY]
        ),
        regulatory_auditability=PerDimensionScore(
            rationale="r" * 25, turn_citations=["T001"], score=scores[Dimension.REGULATORY_AUDITABILITY]
        ),
        applicant_experience=PerDimensionScore(
            rationale="r" * 25, turn_citations=["T001"], score=scores[Dimension.APPLICANT_EXPERIENCE]
        ),
        counterfactual="Testing — changing X at T001 would have altered the outcome.",
    )


def test_find_disagreements_flags_above_threshold() -> None:
    baseline = dict.fromkeys(Dimension, 3)
    # run 2 differs by 2 on privacy_integrity only — should flag that.
    divergent = dict(baseline)
    divergent[Dimension.PRIVACY_INTEGRITY] = 5
    disagreed = find_disagreements(
        _make_output(baseline),
        _make_output(divergent),
    )
    assert disagreed == frozenset({Dimension.PRIVACY_INTEGRITY})


def test_find_disagreements_ignores_within_threshold() -> None:
    baseline = dict.fromkeys(Dimension, 3)
    # run 2 differs by exactly 1 across all dimensions — within threshold (> 1).
    close = dict.fromkeys(Dimension, 4)
    disagreed = find_disagreements(_make_output(baseline), _make_output(close))
    assert disagreed == frozenset()


def test_judge_with_swap_dry_run_yields_two_runs_no_disagreement() -> None:
    """Dry-run always returns the same stub, so the two runs agree by
    construction and `requires_spot_check` is False.
    """
    result = judge_with_swap(
        transcript_formatted="[T001][applicant-ch] hi",
        rubric_text="(rubric)",
        batch_id_1="batch-a",
        batch_id_2="batch-b",
        batch_position_1=0,
        batch_position_2=3,
        dry_run=True,
    )
    assert result.run_1.stakeholder_alignment.score == 3
    assert result.run_2.stakeholder_alignment.score == 3
    assert result.disagreed_dimensions == frozenset()
    assert result.requires_spot_check is False


# ────────────────────────────────────────────────────────────────────────
# Live-path wiring via FakeTransport (no actual LLM calls)
# ────────────────────────────────────────────────────────────────────────


_VALID_JUDGE_JSON: str = """```json
{
  "stakeholder_alignment":    {"rationale": "Parties aligned throughout the transcript.", "turn_citations": ["T003"], "score": 4},
  "planning_defensibility":   {"rationale": "Planning lead routed with one clarification.", "turn_citations": ["T007"], "score": 4},
  "privacy_integrity":        {"rationale": "No raw value appeared in any cross-org artifact.", "turn_citations": ["T012"], "score": 5},
  "regulatory_auditability":  {"rationale": "Regulator reconstructs decision from bundle alone.", "turn_citations": ["T020"], "score": 5},
  "applicant_experience":     {"rationale": "Applicant completed intake in one session.", "turn_citations": ["T001"], "score": 4},
  "counterfactual": "A clearer flex-class narrative at T007 would have unlocked a 5 on defensibility."
}
```"""


def test_invoke_judge_uses_transport_and_parses_response() -> None:
    """Wiring test: with dry_run=False and a FakeTransport, the judge
    formats the locked prompt, calls transport.complete, and parses the
    returned JSON into a JudgeOutput.
    """
    from eval_sim.llm import FakeTransport

    fake = FakeTransport(responder=lambda _kwargs: _VALID_JUDGE_JSON)
    invocation = JudgeInvocation(
        transcript_formatted="[T001][applicant-ch] filing",
        rubric_text="(rubric body)",
        batch_position=0,
        batch_id="b1",
    )
    out = invoke_judge(
        invocation=invocation,
        transport=fake,
        dry_run=False,
    )
    assert out.privacy_integrity.score == 5
    assert out.applicant_experience.turn_citations == ["T001"]
    # Verify the transport saw the locked prompt + correct model.
    assert len(fake.calls) == 1
    call = fake.calls[0]
    assert call["model"] == "claude-opus-4-7"
    assert "###Task Description:" in call["user"]
    assert "[T001][applicant-ch] filing" in call["user"]
    assert "(rubric body)" in call["user"]


def test_invoke_judge_retries_on_parse_failure() -> None:
    """If the first response is malformed, retry; succeed on second try."""
    from eval_sim.llm import FakeTransport

    responses = iter([
        "not JSON at all",
        _VALID_JUDGE_JSON,
    ])
    fake = FakeTransport(responder=lambda _kwargs: next(responses))
    invocation = JudgeInvocation(
        transcript_formatted="x",
        rubric_text="x",
        batch_position=0,
        batch_id="b1",
    )
    out = invoke_judge(
        invocation=invocation,
        transport=fake,
        dry_run=False,
        max_retries=2,
    )
    assert out.privacy_integrity.score == 5
    assert len(fake.calls) == 2  # one failed, one succeeded
