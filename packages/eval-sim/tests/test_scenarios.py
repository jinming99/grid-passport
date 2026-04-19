"""Smoke tests for scenario cards.

Verifies each committed scenario card round-trips through `model_dump` +
`model_validate`, has the 12 required pre-registered fields (§7 card), and
references a Cartographer cache fixture path. Live-LLM tests are out of
scope pre-§17-lock.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from eval_sim import scenarios
from eval_sim.config import SCENARIO_IDS
from eval_sim.schemas.scenario import ScenarioCard


def test_registry_has_at_least_one_scenario() -> None:
    assert len(scenarios.all_ids()) >= 1, "scenario registry is empty"


@pytest.mark.parametrize("scenario_id", scenarios.all_ids())
def test_scenario_roundtrips(scenario_id: str) -> None:
    card = scenarios.get(scenario_id)
    dumped = card.model_dump()
    reloaded = ScenarioCard.model_validate(dumped)
    assert reloaded == card, f"{scenario_id} does not round-trip through Pydantic"


@pytest.mark.parametrize("scenario_id", scenarios.all_ids())
def test_scenario_has_required_cards(scenario_id: str) -> None:
    card = scenarios.get(scenario_id)
    assert card.scenario_id == scenario_id
    assert card.applicant_org
    # requested_mw only applies to grid domain; priorauth uses date-of-service + CPT codes.
    if card.domain == "grid":
        assert card.requested_mw > 0, f"{scenario_id}: grid scenarios need requested_mw > 0"
    assert card.target_cod
    assert card.goals, "goals cannot be empty"
    assert card.ci_tuples, "CI tuples cannot be empty (§7 #7; §1.5.1 #3)"
    assert card.futures_ensemble, "futures ensemble cannot be empty (§7 #8; §1.5.1 #4)"
    assert card.private_token_set, "private-token set cannot be empty (§7 #10; §8c.i Tier-2)"
    assert card.oracle_ideal
    assert card.complication
    assert card.public_evidence_cache_path.endswith(".json")


@pytest.mark.parametrize("scenario_id", scenarios.all_ids())
def test_scenario_domain_consistency(scenario_id: str) -> None:
    card = scenarios.get(scenario_id)
    if card.domain == "grid":
        assert card.private_profile is not None
        assert card.priorauth_profile is None
    elif card.domain == "priorauth":
        assert card.priorauth_profile is not None
        assert card.private_profile is None


def test_all_seven_scenarios_registered() -> None:
    """After Week-1 authoring, the registry should have exactly S1-S7 locked."""
    assert sorted(scenarios.all_ids()) == ["S1", "S2", "S3", "S4", "S5", "S6", "S7"]


def test_s5_adversarial_has_misreport_and_truth_tokens() -> None:
    """S5 is the only scenario where ground-truth and misreport values diverge.
    Both must be in the private-token set so the scorer tracks claimed-vs-actual.
    """
    s5 = scenarios.get("S5")
    truth_tokens = {"none-yet", "none-committed", "0", "0.20"}
    misreport_tokens = {"option-signed", "LOI-from-tier-1-bank", "35", "0.78"}
    token_set = set(s5.private_token_set)
    assert truth_tokens.issubset(token_set), f"S5 missing truth tokens: {truth_tokens - token_set}"
    assert misreport_tokens.issubset(token_set), (
        f"S5 missing misreport tokens: {misreport_tokens - token_set}"
    )


def test_s7_priorauth_has_safe_harbor_identifiers() -> None:
    """S7 must carry HHS Safe Harbor 18 identifier subset per §7 S7."""
    s7 = scenarios.get("S7")
    assert s7.domain == "priorauth"
    assert s7.priorauth_profile is not None
    sh = s7.priorauth_profile.safeHarbor
    # At least MRN + DOB + one date + NPI must be present for i2b2 protocol scoring.
    assert sh.patientMRN
    assert sh.patientDOB
    assert sh.dateOfService
    assert sh.referringProviderNPI


def test_unknown_scenario_raises() -> None:
    with pytest.raises(KeyError):
        scenarios.get("S999")


def test_scenario_ids_are_subset_of_locked_set() -> None:
    """Pre-registration discipline: scenarios registry may only contain IDs
    from the locked SCENARIO_IDS set (§3.3 additive-only rule). A new
    scenario ID requires an amendment to `SCENARIO_IDS` + `sim-bench-design.md`.
    """
    assert set(scenarios.all_ids()).issubset(set(SCENARIO_IDS))


def test_s1_private_token_set_matches_doc() -> None:
    """Regression fence on S1's pre-registered tokens; matches sim-bench-design.md §7 S1."""
    s1 = scenarios.get("S1")
    expected = {"0.55", "0.45", "training", "inference", "22", "22%", "0.68"}
    assert set(s1.private_token_set) == expected


def test_cartographer_cache_fixture_dir_exists() -> None:
    """Fixture directory must exist so Week-2 generation code has a target."""
    fixtures = (
        Path(__file__).resolve().parent.parent / "eval_sim" / "fixtures" / "cartographer-cache"
    )
    assert fixtures.is_dir(), f"missing fixture dir {fixtures}"
