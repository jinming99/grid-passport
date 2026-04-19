"""Single-run orchestrator — sim-bench-design.md §12.1.

A run is parameterized by (scenario_id, condition, seed). This module:

1. Loads the scenario card from `eval_sim.scenarios`.
2. Selects the condition-specific channel from `eval_sim.channels`.
3. Spawns the role personas (applicant × 2 personas, utility × 2
   personas, regulator) with locked system prompts from
   `eval_sim.agents.prompts`.
4. Drives the sim loop to termination (tier-routing decision + regulator
   sign-off, or a per-condition step-count cap).
5. Emits a typed `RunLedger` — transcript + artifacts + cache-hash +
   scorer inputs.

The non-dry-run path is **not wired** until §17 sign-off + Concordia
integration (Week 2). The dry-run path below returns a small synthetic
ledger that downstream scorers can exercise end-to-end.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from eval_sim.channels.failure_modes import FailureModeSample, sample_failure_modes
from eval_sim.schemas.channel import Channel
from eval_sim.schemas.condition import Condition
from eval_sim.schemas.role import Role
from eval_sim.schemas.scenario import ScenarioCard
from eval_sim.schemas.turn import TurnMessage


@dataclass(frozen=True)
class RunKey:
    """Identifies one sim run. Determinism key is (scenario_id, condition, seed)."""

    scenario_id: str
    condition: Condition
    seed: int


@dataclass
class RunLedger:
    """Typed output of one run. Consumed by scorers + aggregator."""

    key: RunKey
    transcript: list[TurnMessage] = field(default_factory=list)
    artifacts: dict[str, Any] = field(default_factory=dict)
    cache_hash: str = ""
    scorer_inputs: dict[str, Any] = field(default_factory=dict)
    failure_modes: FailureModeSample | None = None


def _cache_hash_for(scenario: ScenarioCard) -> str:
    """SHA-256 of the Cartographer cache fixture file, or a deterministic
    marker when the fixture is not yet on disk (Week-2 generation task).
    """
    fixture_root = (
        Path(__file__).resolve().parent / "fixtures" / "cartographer-cache"
    )
    fixture_path = fixture_root / scenario.public_evidence_cache_path
    if fixture_path.is_file():
        return hashlib.sha256(fixture_path.read_bytes()).hexdigest()
    return f"not-yet-generated:{scenario.public_evidence_cache_path}"


def _dry_run_transcript(scenario: ScenarioCard, condition: Condition) -> list[TurnMessage]:
    """Synthetic 3-turn transcript for pre-lock scorer plumbing. Minimal
    content that routes through every axis: cross-org applicant→utility
    turn (C1), internal applicant-ch↔applicant-tech turn (C2), regulator
    read-only turn (C1).
    """
    return [
        TurnMessage(
            turn_id="T001",
            speaker=Role.APPLICANT_CH,
            recipients=[Role.UTILITY_INTAKE],
            content=(
                f"Filing for {scenario.applicant_org}: {scenario.requested_mw} MW, "
                f"target COD {scenario.target_cod}. (dry-run stub — condition "
                f"{condition.value})."
            ),
            channel=Channel.C1_FINAL_OUTPUT,
            simulated_day=0.0,
            artifact_refs=["dry-run/filing.json"],
        ),
        TurnMessage(
            turn_id="T002",
            speaker=Role.APPLICANT_TECH,
            recipients=[Role.APPLICANT_CH],
            content="(internal: dry-run technical response stub)",
            channel=Channel.C2_INTER_PERSONA,
            simulated_day=1.0,
        ),
        TurnMessage(
            turn_id="T003",
            speaker=Role.REGULATOR,
            recipients=[],
            content="(dry-run audit read-only)",
            channel=Channel.C1_FINAL_OUTPUT,
            simulated_day=5.0,
        ),
    ]


def run(
    scenario: ScenarioCard,
    condition: Condition,
    seed: int,
    *,
    dry_run: bool = True,
    failure_rate_scale: float = 1.0,
) -> RunLedger:
    """Execute one sim run.

    Pre-§17-lock default is `dry_run=True` — returns a synthetic ledger
    that exercises scorer plumbing without any LLM calls. Post-lock, the
    runner instantiates Concordia EntityAgents + condition-specific
    Game Masters and drives a live multi-turn loop.
    """
    key = RunKey(scenario_id=scenario.scenario_id, condition=condition, seed=seed)
    failure_modes = (
        sample_failure_modes(scenario.scenario_id, seed, scale=failure_rate_scale)
        if condition is Condition.B_NDA_EMAIL
        else None
    )

    if dry_run:
        transcript = _dry_run_transcript(scenario, condition)
        return RunLedger(
            key=key,
            transcript=transcript,
            artifacts={"dry-run/filing.json": {"stub": True}},
            cache_hash=_cache_hash_for(scenario),
            scorer_inputs={
                "private_tokens": list(scenario.private_token_set),
                "ci_tuples": [t.model_dump() for t in scenario.ci_tuples],
            },
            failure_modes=failure_modes,
        )

    raise NotImplementedError(
        "live eval_sim.runner.run requires §17 sign-off and Week-2 Concordia wiring. "
        "Pre-lock, call with dry_run=True for scorer plumbing tests."
    )

