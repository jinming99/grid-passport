"""Tests for eval_sim.scorers.plan_extraction (P0.1 — §8b unblocker)."""

from __future__ import annotations

import json

import pytest

from eval_sim.llm import FakeTransport
from eval_sim.scorers.futures import CandidatePlan
from eval_sim.scorers.plan_extraction import (
    PLAN_EXTRACTION_PROMPT,
    ExtractionResult,
    PlanExtractionOutput,
    _artifact_strings_for,
    _assemble_extraction_input,
    _parse_extraction,
    extract_plan,
)

# ────────────────────────────────────────────────────────────────────────
# Prompt lock — regression-fence the exact bytes per §17 lock discipline.
# ────────────────────────────────────────────────────────────────────────


def test_prompt_is_locked_non_empty_bytes() -> None:
    """The locked prompt is a module-level constant; edits require §3.2
    amendment. This test fences the byte count as a proxy for lock drift.
    """
    assert len(PLAN_EXTRACTION_PROMPT) == 3031
    assert "CandidatePlan" in PLAN_EXTRACTION_PROMPT
    assert "energization_band" in PLAN_EXTRACTION_PROMPT
    assert "has_amendment_path" in PLAN_EXTRACTION_PROMPT


# ────────────────────────────────────────────────────────────────────────
# JSON parse — tolerant extraction + Pydantic validation
# ────────────────────────────────────────────────────────────────────────


def test_parse_accepts_plain_json() -> None:
    raw = (
        '{"energization_band":"Q4 2028 – Q2 2029","firmness_score":0.75,'
        '"flexibility_class":"B","blockers_surfaced":["flood"],'
        '"regulator_completeness":4,"policy_version_linked":true,'
        '"has_amendment_path":true}'
    )
    out = _parse_extraction(raw)
    assert out.energization_band == "Q4 2028 – Q2 2029"
    assert out.firmness_score == pytest.approx(0.75)
    assert out.flexibility_class == "B"
    assert out.blockers_surfaced == ["flood"]
    assert out.regulator_completeness == pytest.approx(4.0)
    assert out.policy_version_linked is True
    assert out.has_amendment_path is True


def test_parse_strips_markdown_fences() -> None:
    raw = (
        "Here's the extraction:\n\n```json\n"
        '{"energization_band":null,"firmness_score":null,'
        '"flexibility_class":null,"blockers_surfaced":[],'
        '"regulator_completeness":null,"policy_version_linked":false,'
        '"has_amendment_path":false}\n```\n'
    )
    out = _parse_extraction(raw)
    assert out.energization_band is None
    assert out.firmness_score is None


def test_parse_rejects_no_json() -> None:
    with pytest.raises(ValueError, match="no JSON object"):
        _parse_extraction("No JSON here, just prose.")


def test_flex_class_normalizer_rejects_out_of_domain() -> None:
    """Guardrail: extractor emits only A/B/C; anything else → None."""
    out = PlanExtractionOutput(flexibility_class="Z")  # type: ignore[arg-type]
    assert out.flexibility_class is None


def test_flex_class_normalizer_uppercases() -> None:
    out = PlanExtractionOutput(flexibility_class="b")
    assert out.flexibility_class == "B"


def test_firmness_score_rejects_out_of_range() -> None:
    with pytest.raises(ValueError):
        PlanExtractionOutput(firmness_score=1.5)


def test_regulator_completeness_rejects_out_of_range() -> None:
    with pytest.raises(ValueError):
        PlanExtractionOutput(regulator_completeness=6.0)


# ────────────────────────────────────────────────────────────────────────
# to_candidate_plan — type-clean conversion to the frozen dataclass
# ────────────────────────────────────────────────────────────────────────


def test_to_candidate_plan_copies_all_fields() -> None:
    out = PlanExtractionOutput(
        energization_band="Q4 2028 – Q2 2029",
        firmness_score=0.8,
        flexibility_class="A",
        blockers_surfaced=["flood", "site-control"],
        regulator_completeness=4,
        policy_version_linked=True,
        has_amendment_path=False,
    )
    plan = out.to_candidate_plan()
    assert isinstance(plan, CandidatePlan)
    assert plan.energization_band == "Q4 2028 – Q2 2029"
    assert plan.firmness_score == pytest.approx(0.8)
    assert plan.flexibility_class == "A"
    assert plan.blockers_surfaced == ["flood", "site-control"]
    assert plan.regulator_completeness == pytest.approx(4.0)
    assert plan.policy_version_linked is True
    assert plan.has_amendment_path is False


# ────────────────────────────────────────────────────────────────────────
# Input assembly per condition
# ────────────────────────────────────────────────────────────────────────


def test_artifact_strings_picks_oracle_decision_for_oracle_condition() -> None:
    arts = {
        "oracle_decision": {
            "applicant_disclosure": "Full disclosure prose",
            "utility_decision": "Decision letter prose",
            "regulator_verdict": "Regulator verdict prose",
        }
    }
    parts = _artifact_strings_for(arts, "A")
    assert any("### applicant_disclosure" in p for p in parts)
    assert any("### utility_decision" in p for p in parts)
    assert any("### regulator_verdict" in p for p in parts)


def test_artifact_strings_picks_bundle_for_bundle_conditions() -> None:
    arts = {
        "bundle:disclosure-v1.0.0.json": {
            "cover_note": "Cover note prose",
            "policy_hash": "abc123",
            "signed_by": "Owl Compute",
        },
        "bundle_summary": {
            "utility_decision": "Utility decision after bundle",
            "regulator_verdict": "Regulator verdict after bundle",
        },
    }
    parts = _artifact_strings_for(arts, "D")
    assert any("bundle.cover_note" in p for p in parts)
    assert any("bundle.policy_hash" in p for p in parts)
    assert any("bundle_summary.utility_decision" in p for p in parts)


def test_artifact_strings_handles_email_summary() -> None:
    arts = {
        "b_summary": {
            "meeting_triggered": True,
            "regulator_verdict": "Verdict after meeting",
            "unresolved_email_rounds": 3,
        }
    }
    parts = _artifact_strings_for(arts, "B")
    assert any("b_summary.regulator_verdict" in p for p in parts)
    assert any("b_summary.meeting_triggered" in p for p in parts)
    assert any("b_summary.unresolved_email_rounds" in p for p in parts)


def test_assemble_input_prepends_transcript_for_email_condition() -> None:
    arts = {"b_summary": {"regulator_verdict": "Summary verdict"}}
    blob = _assemble_extraction_input(
        artifacts=arts,
        condition="B",
        transcript_text="[T001][applicant] Hello utility",
    )
    # Transcript should precede the summary in the assembled blob.
    assert blob.index("transcript") < blob.index("b_summary.regulator_verdict")


def test_assemble_input_skips_transcript_for_non_email_conditions() -> None:
    arts = {"oracle_decision": {"utility_decision": "Decision"}}
    blob = _assemble_extraction_input(
        artifacts=arts,
        condition="A",
        transcript_text="[T001][applicant] Should not appear",
    )
    assert "[T001]" not in blob
    assert "utility_decision" in blob


def test_assemble_input_truncates_when_too_long() -> None:
    long_text = "X" * 120_000
    arts = {"oracle_decision": {"utility_decision": long_text}}
    blob = _assemble_extraction_input(
        artifacts=arts,
        condition="A",
        transcript_text=None,
        max_chars=10_000,
    )
    # Should be ≤ 10k (plus header / truncation marker overhead).
    assert len(blob) < 11_000
    assert "[truncated]" in blob


# ────────────────────────────────────────────────────────────────────────
# extract_plan — dry-run + FakeTransport live-path
# ────────────────────────────────────────────────────────────────────────


def test_extract_dry_run_returns_empty_plan() -> None:
    result = extract_plan(
        artifacts={"oracle_decision": {"utility_decision": "text"}},
        condition="A",
        scenario_id="S1",
        dry_run=True,
    )
    assert isinstance(result, ExtractionResult)
    assert isinstance(result.plan, CandidatePlan)
    assert result.plan.energization_band is None
    assert result.plan.blockers_surfaced == []
    assert result.error is None


def test_extract_with_fake_transport_parses_response() -> None:
    canned = json.dumps(
        {
            "energization_band": "Q1 2029 – Q3 2029",
            "firmness_score": 0.65,
            "flexibility_class": "C",
            "blockers_surfaced": ["flood", "site-control"],
            "regulator_completeness": 3,
            "policy_version_linked": True,
            "has_amendment_path": True,
        }
    )
    transport = FakeTransport(responder=lambda _kw: canned)
    result = extract_plan(
        artifacts={"oracle_decision": {"utility_decision": "text"}},
        condition="A",
        scenario_id="S2",
        transport=transport,
        dry_run=False,
    )
    assert result.plan is not None
    assert result.plan.energization_band == "Q1 2029 – Q3 2029"
    assert result.plan.firmness_score == pytest.approx(0.65)
    assert result.plan.flexibility_class == "C"
    assert result.plan.blockers_surfaced == ["flood", "site-control"]
    assert result.error is None


def test_extract_retries_on_bad_json_then_succeeds() -> None:
    good = json.dumps(
        {
            "energization_band": None,
            "firmness_score": None,
            "flexibility_class": None,
            "blockers_surfaced": [],
            "regulator_completeness": None,
            "policy_version_linked": False,
            "has_amendment_path": False,
        }
    )
    queue = ["not valid JSON", good]
    transport = FakeTransport(responder=lambda _kw: queue.pop(0))
    result = extract_plan(
        artifacts={},
        condition="A",
        scenario_id="S1",
        transport=transport,
        dry_run=False,
    )
    assert result.plan is not None
    assert result.error is None
    assert queue == []  # both canned responses consumed


def test_extract_flags_persistent_failure() -> None:
    transport = FakeTransport(responder=lambda _kw: "garbage no json")
    result = extract_plan(
        artifacts={},
        condition="A",
        scenario_id="S1",
        transport=transport,
        dry_run=False,
        max_retries=2,
    )
    assert result.plan is None
    assert result.error is not None
    assert "extraction failed" in result.error
