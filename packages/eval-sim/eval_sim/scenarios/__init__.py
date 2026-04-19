"""Pre-registered scenario cards — S1–S7 per sim-bench-design.md §7.

Each scenario is a typed Pydantic instance. Post-§17-lock edits require an
amendment per §3.2. S4 has a deliberate TBD marker (see handoff §Now) that
must be concretized during Week 1 scenario authoring.
"""

from __future__ import annotations

from eval_sim.scenarios.s1_owl import S1
from eval_sim.schemas.scenario import ScenarioCard

# Registry — populated as scenarios are authored. S2–S7 land in Week 1.
SCENARIOS: dict[str, ScenarioCard] = {
    S1.scenario_id: S1,
}


def get(scenario_id: str) -> ScenarioCard:
    if scenario_id not in SCENARIOS:
        raise KeyError(f"unknown scenario '{scenario_id}'; known: {sorted(SCENARIOS)}")
    return SCENARIOS[scenario_id]


def all_ids() -> list[str]:
    return sorted(SCENARIOS)


__all__ = ["S1", "SCENARIOS", "all_ids", "get"]
