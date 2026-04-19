"""Single-run orchestrator — sim-bench-design.md §12.1.

A run is parameterized by (scenario_id, condition, seed). This module:
1. Loads the scenario card from `eval_sim.scenarios`.
2. Instantiates the condition-specific Game Master from `eval_sim.channels`.
3. Spawns the four role agents (applicant × 2 personas, utility × 2
   personas, regulator) from `eval_sim.agents`.
4. Drives the sim loop to termination (tier-routing decision + regulator
   sign-off, or a per-condition step-count cap).
5. Emits a typed `RunLedger` — transcript + artifacts + cache-hash +
   scorer inputs.

Wiring deferred to Week 2. The stub below asserts preconditions so a caller
gets a clear error during early integration tests.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from eval_sim.schemas.condition import Condition
from eval_sim.schemas.scenario import ScenarioCard


@dataclass(frozen=True)
class RunKey:
    """Identifies a single sim run. Determinism key is (scenario_id, condition, seed)."""

    scenario_id: str
    condition: Condition
    seed: int


@dataclass
class RunLedger:
    """Typed output of a single run. Consumed by scorers + aggregator."""

    key: RunKey
    transcript: list[Any]  # list[TurnMessage] once §5d types land
    artifacts: dict[str, Any]  # typed per-artifact kind; §6
    cache_hash: str  # SHA-256 of the cartographer-cache fixture used; §6e
    scorer_inputs: dict[str, Any]  # tokens / CI tuples / scorer-ready payloads


def run(scenario: ScenarioCard, condition: Condition, seed: int) -> RunLedger:
    """Execute one sim run. Not wired to live LLMs before §17 sign-off."""
    raise NotImplementedError(
        "eval_sim.runner.run is not live before §17 sign-off. "
        "Week-2 implementation lands Concordia GM wiring + agent construction."
    )
