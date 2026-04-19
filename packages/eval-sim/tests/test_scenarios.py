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
    assert card.requested_mw > 0
    assert card.target_cod
    assert card.goals, "goals cannot be empty"
    assert card.ci_tuples, "CI tuples cannot be empty (§7 #7; §1.5.1 #3)"
    assert card.futures_ensemble, "futures ensemble cannot be empty (§7 #8; §1.5.1 #4)"
    assert card.private_token_set, "private-token set cannot be empty (§7 #10; §8c.i Tier-2)"
    assert card.oracle_ideal
    assert card.complication
    assert card.public_evidence_cache_path.endswith(".json")


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
