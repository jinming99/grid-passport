"""Condition C — PromptOnlyBundle channel — §4.3 + §6c.

Same wire protocol as D (signed disclosure bundle + bounded-query
channel) — what differs is **what's in the prompt** for the applicant
agent and **how Cartographer is invoked**:

- The applicant agent's system prompt carries the **flat-prompt
  baseline** Skill content (mechanically derived from the Skill source
  by `pnpm agents:baseline`). This is set at agent-build time by the
  runner, not at the channel level — so this channel's loop is
  structurally identical to `SkillBundleChannel`.
- Cartographer issues **live SDK calls every turn** rather than reading
  the §6e cache fixture. Hallucination of `sourceRefs[].url` is a
  measured outcome (§8d H-spec.hallucination, both pre-validator-rate
  and in-artifact-rate per the §6e fairness pilot decomposition).

Per §1.5.1 #1 the substrate-isolation novelty depends on this exact
parity at the wire-protocol level — C and D share the bundle + query
channel + scenario card; only substrate (prompt vs Skill) differs.

Per §5e + §4.3 Condition C uses Opus 4.7 for the product-agent side
(applicant) — same tier as D, isolating the substrate variable rather
than model capability. The runner builds the right tier; this channel
just drives the loop and tags the metadata.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from eval_sim.channels.base import AgentBundle
from eval_sim.channels.skill_bundle import run_bundle_workflow
from eval_sim.runner import RunLedger
from eval_sim.schemas.condition import Condition
from eval_sim.schemas.scenario import ScenarioCard


@dataclass(frozen=True)
class PromptOnlyBundleChannel:
    """Condition C orchestrator — flat-prompt baseline + live Cartographer.

    `cache_hash` is recorded for audit (the cache is not READ under C —
    Cartographer runs live every turn — but the cache hash is part of
    the run's reproducibility envelope per §15.5).

    `cartographer_mode_override` is symmetrical to the one on
    `SkillBundleChannel`: native C is always 'live', but the override
    field is present so the runner can carry the same plumbing through
    both condition paths without a type divergence. Setting it to
    `'cached'` on C would be nonsense (C's whole point is live SDK) and
    is rejected at runner level.
    """

    cache_hash: str = ""
    max_query_rounds: int = 2
    cartographer_mode_override: str | None = None
    condition: Condition = field(default=Condition.C_PROMPT_ONLY, init=False)

    def run(
        self,
        *,
        scenario: ScenarioCard,
        seed: int,
        agents: AgentBundle,
        max_turns: int = 12,
    ) -> RunLedger:
        return run_bundle_workflow(
            scenario=scenario,
            seed=seed,
            agents=agents,
            condition=self.condition,
            cache_hash=self.cache_hash,
            max_query_rounds=self.max_query_rounds,
            max_turns=max_turns,
            cartographer_mode=self.cartographer_mode_override or "live",
        )
