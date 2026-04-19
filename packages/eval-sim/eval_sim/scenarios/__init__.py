"""Pre-registered scenario cards — S1–S7 per sim-bench-design.md §7.

Each scenario is a typed Pydantic instance. Post-§17-lock edits require an
amendment per §3.2. S4 has a deliberate TBD marker (see handoff §Now) that
must be concretized during Week 1 scenario authoring.
"""

from __future__ import annotations

from eval_sim.scenarios.s1_owl import S1
from eval_sim.scenarios.s2_lantern import S2
from eval_sim.scenarios.s3_kraken import S3
from eval_sim.scenarios.s4_firsttimer import S4
from eval_sim.scenarios.s5_adversarial import S5
from eval_sim.scenarios.s6_multiphase import S6
from eval_sim.scenarios.s7_priorauth import S7
from eval_sim.schemas.scenario import ScenarioCard

# Registry — all 7 scenarios pre-registered. Additive-only post-§17-lock per §3.3.
SCENARIOS: dict[str, ScenarioCard] = {
    S1.scenario_id: S1,
    S2.scenario_id: S2,
    S3.scenario_id: S3,
    S4.scenario_id: S4,
    S5.scenario_id: S5,
    S6.scenario_id: S6,
    S7.scenario_id: S7,
}


def get(scenario_id: str) -> ScenarioCard:
    if scenario_id not in SCENARIOS:
        raise KeyError(f"unknown scenario '{scenario_id}'; known: {sorted(SCENARIOS)}")
    return SCENARIOS[scenario_id]


def all_ids() -> list[str]:
    return sorted(SCENARIOS)


__all__ = [
    "S1",
    "S2",
    "S3",
    "S4",
    "S5",
    "S6",
    "S7",
    "SCENARIOS",
    "all_ids",
    "get",
]
