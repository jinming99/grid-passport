"""Per-condition channels — sim-bench-design.md §6.

Each channel encapsulates one condition's full orchestration logic:
turn-routing, message format, failure-mode application, termination.
The runner dispatches to the right channel by `Condition`.

Channels (post-§17 status):
- `OracleChannel`            (A) — shared-state; cached Cartographer;
                                    3-turn deterministic loop; §4.1 + §6d
- `EmailChannel`             (B) — typed Email + Meeting; archetype-
                                    specific failure-mode sampler +
                                    3+-round meeting trigger; §6a
                                    *(pending step 4d)*
- `PromptOnlyBundleChannel`  (C) — bundle + live Cartographer with
                                    hallucination risk; §6c
                                    *(pending step 4c)*
- `SkillBundleChannel`       (D) — bundle + cached Cartographer +
                                    bounded-query channel; §6b + §6e
                                    *(pending step 4b)*

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
from eval_sim.channels.failure_modes import (
    FailureModeSample,
    MeetingTriggerState,
    sample_failure_modes,
)
from eval_sim.channels.oracle import OracleChannel

__all__ = [
    "AgentBundle",
    "Channel",
    "FailureModeSample",
    "MeetingTriggerState",
    "OracleChannel",
    "TranscriptBuilder",
    "free_action_spec",
    "make_turn_id",
    "observe",
    "sample_failure_modes",
    "strip_agent_name_prefix",
]
