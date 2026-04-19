"""Per-condition channels — sim-bench-design.md §6.

Each channel encapsulates one condition's full orchestration logic:
turn-routing, message format, failure-mode application, termination.
The runner dispatches to the right channel by `Condition`.

Channels (all live as of post-§17 step 4):
- `OracleChannel`            (A) — shared-state; cached Cartographer;
                                    3-turn deterministic loop; §4.1 + §6d
- `EmailChannel`             (B) — typed Email + Meeting; archetype-
                                    specific failure-mode sampler +
                                    3+-round meeting trigger; §6a
- `PromptOnlyBundleChannel`  (C) — bundle + live Cartographer with
                                    hallucination risk; §4.3 + §6c
- `SkillBundleChannel`       (D) — bundle + cached Cartographer +
                                    bounded-query channel; §4.4 + §6b + §6e

Common surface: `Channel.run(scenario, seed, agents, max_turns) -> RunLedger`
per `eval_sim.channels.base.Channel`.
"""

from eval_sim.channels.base import (
    AgentBundle,
    Channel,
    TranscriptBuilder,
    free_action_spec,
    make_turn_id,
    observe,
    strip_agent_name_prefix,
)
from eval_sim.channels.email import EmailChannel
from eval_sim.channels.failure_modes import (
    FailureModeSample,
    MeetingTriggerState,
    sample_failure_modes,
)
from eval_sim.channels.oracle import OracleChannel
from eval_sim.channels.prompt_bundle import PromptOnlyBundleChannel
from eval_sim.channels.skill_bundle import SkillBundleChannel

__all__ = [
    "AgentBundle",
    "Channel",
    "EmailChannel",
    "FailureModeSample",
    "MeetingTriggerState",
    "OracleChannel",
    "PromptOnlyBundleChannel",
    "SkillBundleChannel",
    "TranscriptBuilder",
    "free_action_spec",
    "make_turn_id",
    "observe",
    "sample_failure_modes",
    "strip_agent_name_prefix",
]
