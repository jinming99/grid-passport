"""Single-run orchestrator — sim-bench-design.md §12.1.

A run is parameterized by (scenario_id, condition, seed). This module:

1. Loads the scenario card from `eval_sim.scenarios`.
2. Builds the per-role Concordia EntityAgents at the right model tier
   (Opus 4.7 for product agents under A/C/D per §4.1+§5e; Sonnet 4.6
   for everything else under B + the user-sim side everywhere).
3. Selects the condition-specific channel from `eval_sim.channels`
   and drives its multi-turn loop to termination.
4. Emits a typed `RunLedger` — transcript + artifacts + cache-hash +
   scorer inputs.

Dry-run mode (`dry_run=True`) skips agent build + LLM calls and
returns the synthetic 3-turn ledger used by the pre-lock scorer
plumbing tests. Live mode requires a `Transport` (default:
`get_default_transport()` → claude-agent-sdk).
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Any

from eval_sim.schemas.channel import Channel
from eval_sim.schemas.condition import Condition
from eval_sim.schemas.role import Role
from eval_sim.schemas.scenario import ScenarioCard
from eval_sim.schemas.turn import TurnMessage

if TYPE_CHECKING:
    from eval_sim.channels.failure_modes import FailureModeSample


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
    transport: object | None = None,
    max_turns: int = 12,
    cartographer_mode_override: str | None = None,
) -> RunLedger:
    """Execute one sim run.

    `dry_run=True` returns a synthetic 3-turn ledger (scorer plumbing
    tests). `dry_run=False` builds the right per-condition channel +
    EntityAgents and drives a live multi-turn loop.

    `transport` is a `eval_sim.llm.Transport`; if `None` and
    `dry_run=False`, the default claude-agent-sdk transport is used.

    `cartographer_mode_override` is the §6e fairness-pilot escape hatch.
    When set to `'live'` under Condition D, D calls Cartographer live
    like C — isolating the cache-vs-no-cache effect from the substrate
    effect. Legal values: `None` (native behavior), `'live'`, `'cached'`.
    Rejected for conditions A/B where Cartographer is not on the path,
    and for C when set to `'cached'` (nonsense per §6c).
    """
    # Lazy-import the failure-mode sampler so the channels package isn't
    # eagerly loaded at runner-import time (channels.base imports back
    # from this module — would form a circular import otherwise).
    from eval_sim.channels.failure_modes import sample_failure_modes

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

    # Live path — lazy imports to keep dry-run paths cheap.
    from eval_sim.agents.builders import (
        build_applicant,
        build_regulator,
        build_utility,
    )
    from eval_sim.channels import (
        AgentBundle,
        EmailChannel,
        OracleChannel,
        PromptOnlyBundleChannel,
        SkillBundleChannel,
    )
    from eval_sim.config import MODEL_TIERS
    from eval_sim.llm import get_default_transport

    if transport is None:
        transport = get_default_transport()
    # Transport is a structural Protocol; we don't isinstance-check it here.

    # Per §5e: product-agent tier (Opus) for A/C/D applicants; Sonnet for
    # the user-sim side (utility, regulator) and for B's applicant (no
    # AI intermediary; the agent role-plays the contract handler at the
    # user-sim tier).
    user_sim_tier = str(MODEL_TIERS["user-sim"])
    product_tier = str(MODEL_TIERS["product-agent"])
    applicant_tier = product_tier if condition is not Condition.B_NDA_EMAIL else user_sim_tier

    cache_hash = _cache_hash_for(scenario)
    agents = AgentBundle(
        applicant=build_applicant(
            scenario=scenario,
            transport=transport,  # type: ignore[arg-type]
            seed_index=seed,
            dry_run=False,
            model_tier=applicant_tier,
        ),
        utility=build_utility(
            scenario=scenario,
            transport=transport,  # type: ignore[arg-type]
            model_tier=user_sim_tier,
        ),
        regulator=build_regulator(
            scenario=scenario,
            transport=transport,  # type: ignore[arg-type]
            model_tier=user_sim_tier,
        ),
    )

    if cartographer_mode_override is not None:
        if cartographer_mode_override not in {"live", "cached"}:
            raise ValueError(
                f"cartographer_mode_override must be 'live' or 'cached'; "
                f"got {cartographer_mode_override!r}"
            )
        if condition in {Condition.A_ORACLE, Condition.B_NDA_EMAIL}:
            raise ValueError(
                f"cartographer_mode_override is only meaningful for C/D; "
                f"got condition={condition!r}"
            )
        if (
            condition is Condition.C_PROMPT_ONLY
            and cartographer_mode_override == "cached"
        ):
            raise ValueError(
                "Condition C runs Cartographer live by definition (§6c); "
                "cartographer_mode_override='cached' would collapse the "
                "substrate distinction. Use condition=D instead."
            )

    if condition is Condition.A_ORACLE:
        channel = OracleChannel(cache_hash=cache_hash)
    elif condition is Condition.B_NDA_EMAIL:
        channel = EmailChannel(failure_rate_scale=failure_rate_scale)
    elif condition is Condition.C_PROMPT_ONLY:
        channel = PromptOnlyBundleChannel(
            cache_hash=cache_hash,
            cartographer_mode_override=cartographer_mode_override,
        )
    elif condition is Condition.D_GRID_PASSPORT:
        channel = SkillBundleChannel(
            cache_hash=cache_hash,
            cartographer_mode_override=cartographer_mode_override,
        )
    else:
        raise ValueError(f"unknown condition: {condition!r}")

    ledger = channel.run(
        scenario=scenario,
        seed=seed,
        agents=agents,
        max_turns=max_turns,
    )
    if failure_modes is not None:
        ledger.failure_modes = failure_modes
    return ledger

