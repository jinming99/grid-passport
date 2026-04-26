"""Channel base + shared types — sim-bench-design.md §6.

Each `Channel` encapsulates one of the four condition-specific
communication layers (§4.1–§4.4) — it owns the turn-routing logic, the
message-format, and the failure-mode application for its condition.
The `Channel.run()` method drives a multi-turn loop between
pre-built Concordia `EntityAgent`s and emits a typed `RunLedger`.

We deliberately do not use `concordia.environment.engines.Sequential`:
that engine is itself LLM-driven (every step uses an LLM to decide
whose turn is next, format observations, resolve actions) which would
add ~3,360 wasted Sonnet calls in main run with no decision-theoretic
content for our deterministic-routing setting (§6 specifies typed
channels + seed-hashed failure-mode sampling + fixed meeting protocol).
We keep the substrate claim — Concordia `EntityAgent`/`ContextComponent`/
`AssociativeMemoryBank` — and write our own thin orchestrator.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Any, Protocol

from concordia.agents import entity_agent_with_logging
from concordia.typing import entity

from eval_sim.runner import RunKey, RunLedger
from eval_sim.schemas.channel import Channel as ChannelEnum
from eval_sim.schemas.condition import Condition
from eval_sim.schemas.role import Role
from eval_sim.schemas.scenario import ScenarioCard
from eval_sim.schemas.turn import TurnMessage

# ────────────────────────────────────────────────────────────────────────
# Agent bundle — what every Channel.run() consumes
# ────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class AgentBundle:
    """The three role agents passed to a `Channel.run()`.

    Built per-run (per-seed) by the runner using `eval_sim.agents.builders`
    with the condition-appropriate model tier per §5e + §4.1.
    """

    applicant: entity_agent_with_logging.EntityAgentWithLogging
    utility: entity_agent_with_logging.EntityAgentWithLogging
    regulator: entity_agent_with_logging.EntityAgentWithLogging


# ────────────────────────────────────────────────────────────────────────
# Channel Protocol — what every condition implements
# ────────────────────────────────────────────────────────────────────────


class Channel(Protocol):
    """One condition's full orchestration logic.

    Implementations:
    - `OracleChannel`              — §4.1 / §6d
    - `EmailChannel`               — §4.2 / §6a
    - `PromptOnlyBundleChannel`    — §4.3 / §6c
    - `SkillBundleChannel`         — §4.4 / §6b
    """

    condition: Condition

    def run(
        self,
        *,
        scenario: ScenarioCard,
        seed: int,
        agents: AgentBundle,
        max_turns: int = 12,
    ) -> RunLedger: ...


# ────────────────────────────────────────────────────────────────────────
# Shared helpers
# ────────────────────────────────────────────────────────────────────────


def make_turn_id(turn_index: int) -> str:
    """Format the §5d turn ID. `turn_index` is 1-based; `T{n:03d}`."""
    if turn_index < 1:
        raise ValueError(f"turn_index must be >= 1; got {turn_index}")
    return f"T{turn_index:03d}"


def free_action_spec(call_to_action: str) -> entity.ActionSpec:
    """Convenience for the most common action spec — free-form text."""
    return entity.ActionSpec(
        call_to_action=call_to_action,
        output_type=entity.OutputType.FREE,
    )


def strip_agent_name_prefix(action_text: str, agent_name: str) -> str:
    """Concordia's `ConcatActComponent(prefix_entity_name=True)` prepends
    `<agent_name> ` to every action. Strip it for cleaner transcript
    storage; the speaker role is already on the `TurnMessage`.
    """
    prefix = f"{agent_name} "
    if action_text.startswith(prefix):
        return action_text[len(prefix) :]
    return action_text


def observe(agent: entity_agent_with_logging.EntityAgentWithLogging, observation: str) -> None:
    """Push an observation into an agent's memory. Concordia's
    `agent.observe(text)` writes through `ObservationToMemory` into the
    associative memory bank.
    """
    agent.observe(observation)


@dataclass
class TranscriptBuilder:
    """Helper to accumulate turns + bookkeep simulated-elapsed-days +
    paraphrase audits as a `Channel.run()` proceeds. Returned via
    `to_ledger(key, **extras)` at the end.
    """

    key: RunKey
    turns: list[TurnMessage] = field(default_factory=list)
    artifacts: dict[str, Any] = field(default_factory=dict)
    scorer_inputs: dict[str, Any] = field(default_factory=dict)
    paraphrase_audit: list[Mapping[str, Any]] = field(default_factory=list)
    cache_hash: str = ""
    simulated_day: float = 0.0

    def add_turn(
        self,
        *,
        speaker: Role,
        recipients: list[Role],
        content: str,
        channel: ChannelEnum,
        day_advance: float = 0.0,
        artifact_refs: list[str] | None = None,
    ) -> TurnMessage:
        self.simulated_day += day_advance
        turn = TurnMessage(
            turn_id=make_turn_id(len(self.turns) + 1),
            speaker=speaker,
            recipients=recipients,
            content=content,
            channel=channel,
            simulated_day=self.simulated_day,
            artifact_refs=artifact_refs or [],
        )
        self.turns.append(turn)
        return turn

    def record_paraphrase_from(
        self,
        agent: entity_agent_with_logging.EntityAgentWithLogging,
    ) -> None:
        """If the agent carries a `ParaphrasedPrivateProfile` component,
        snapshot its most recent paraphrase result into the audit log so
        the §8c.iii trace scorer has the raw vs. paraphrased pair to
        compare outbound artifacts against.
        """
        try:
            component = agent.get_component("private_profile_paraphrased")
        except (KeyError, AttributeError, ValueError):
            return
        last = getattr(component, "last_paraphrase", None)
        if last is None:
            return
        # Reference the turn this paraphrase ATTRIBUTES TO — that's the
        # turn the caller is about to `add_turn` next, hence +1.
        next_turn_id = make_turn_id(len(self.turns) + 1)
        self.paraphrase_audit.append(
            {
                "turn_id": next_turn_id,
                "loss_rate": last.loss_rate,
                "added_simulated_days": last.added_simulated_days,
                "raw": last.original,
                "paraphrased": last.paraphrased,
            }
        )

    def to_ledger(self) -> RunLedger:
        return RunLedger(
            key=self.key,
            transcript=self.turns,
            artifacts=self.artifacts,
            cache_hash=self.cache_hash,
            scorer_inputs={
                **self.scorer_inputs,
                "paraphrase_audit": self.paraphrase_audit,
            },
        )
