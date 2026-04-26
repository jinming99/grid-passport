"""Regression fences for the §8e judge rubric.

Byte-level sentinel checks. Any edit to the anchor text in
`judge_rubric.py` will fail one of these; the intended workflow is:
1. land an Amendment block in sim-bench-design.md §3.2 with the new text
2. update the constant in judge_rubric.py
3. update the sentinels here to match
All three steps or nothing.
"""

from __future__ import annotations

from eval_sim.scorers.judge_rubric import (
    APPLICANT_EXPERIENCE_RUBRIC,
    FIVE_DIMENSION_RUBRIC_TEXT,
    PLANNING_DEFENSIBILITY_RUBRIC,
    PRIVACY_INTEGRITY_RUBRIC,
    REGULATORY_AUDITABILITY_RUBRIC,
    RUBRIC_BY_DIMENSION,
    STAKEHOLDER_ALIGNMENT_RUBRIC,
)


def test_rubric_registry_has_five_dimensions() -> None:
    """§8e has exactly five dimensions — no more, no less."""
    assert set(RUBRIC_BY_DIMENSION) == {
        "stakeholder_alignment",
        "planning_defensibility",
        "privacy_integrity",
        "regulatory_auditability",
        "applicant_experience",
    }


def test_stakeholder_alignment_sentinels() -> None:
    r = STAKEHOLDER_ALIGNMENT_RUBRIC
    # Grounding citation
    assert "SOTOPIA-Eval" in r
    # Level-5 + level-1 anchors
    assert "All three parties operate throughout the transcript on a consistent" in r
    assert "Parties talked past each other" in r


def test_planning_defensibility_sentinels() -> None:
    r = PLANNING_DEFENSIBILITY_RUBRIC
    assert "FERC Order 2023" in r
    assert "NERC TPL-001-5.1" in r
    assert "cluster-study tier" in r
    assert "FERC Order 2023 commercial-readiness screen" in r


def test_privacy_integrity_sentinels() -> None:
    r = PRIVACY_INTEGRITY_RUBRIC
    assert "SOC 2 Trust Services Criteria" in r
    assert "NIST SP 800-53 SC-8" in r
    assert "Nissenbaum Contextual Integrity" in r
    assert "No CI transmission-principle violations are detected" in r


def test_regulatory_auditability_sentinels() -> None:
    r = REGULATORY_AUDITABILITY_RUBRIC
    assert "NERC CIP Compliance Monitoring and Enforcement Program" in r
    assert "FERC-docket reconstruction" in r
    assert "signed bundle + policy file + audit events" in r


def test_applicant_experience_sentinels() -> None:
    r = APPLICANT_EXPERIENCE_RUBRIC
    assert "Self-grounded" in r
    assert 'worth doing again' in r
    assert "welfare-distribution" in r


def test_five_dimension_rubric_composes_all_five() -> None:
    """The composite rubric string must include content from every dimension
    so the judge sees all five anchor ladders in one prompt.
    """
    for dim_text in RUBRIC_BY_DIMENSION.values():
        # Use the grounding citation or a distinctive anchor as the probe.
        assert dim_text.strip()
        first_line = dim_text.strip().splitlines()[0]
        assert first_line in FIVE_DIMENSION_RUBRIC_TEXT


def test_every_dimension_has_all_five_anchor_levels() -> None:
    """Each dimension must carry all five Likert-level anchors 1-5."""
    for dim, text in RUBRIC_BY_DIMENSION.items():
        for level in ("1.", "2.", "3.", "4.", "5."):
            assert f"\n{level}" in text, f"{dim} missing anchor level {level}"
