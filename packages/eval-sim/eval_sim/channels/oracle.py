"""Condition A — Oracle channel — sim-bench-design.md §4.1 + §6d.

All information is shared by design. No failure modes. No turnaround
delays. The applicant surfaces every private field; the utility plans
with full information; the regulator audits with full visibility.

Three-turn deterministic loop:
  T001  applicant  → utility   (full-disclosure filing, channel C1)
  T002  utility    → applicant (tier-routing decision, channel C1)
  T003  regulator  → ()        (audit verdict, channel C1)

The Oracle defines (a) the EVPI reference for §8b OPR — Oracle minus
condition is an empirical Monte-Carlo EVPI estimate per Howard 1966,
and (b) one of four reference strategies in the Savage regret
calculation — Oracle's plan is itself scored against F_S (§7.7) and
*has non-zero regret* on realized futures that deviate from its filed
plan. So the Oracle is a reference strategy, not an automatic optimum.

Cartographer reads the §6e cache fixture (same as D); no live SDK.

Per §4.1 the Oracle agents run at Opus 4.7 — fairness with D, so the
delta over D measures EVPI rather than model capability. The runner
(step 4e) builds Oracle-tier agents; this channel just drives the loop.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from eval_sim.channels.base import (
    AgentBundle,
    TranscriptBuilder,
    free_action_spec,
    observe,
    strip_agent_name_prefix,
)
from eval_sim.runner import RunKey, RunLedger
from eval_sim.schemas.channel import Channel as ChannelEnum
from eval_sim.schemas.condition import Condition
from eval_sim.schemas.role import Role
from eval_sim.schemas.scenario import ScenarioCard

# ────────────────────────────────────────────────────────────────────────
# Locked turn prompts — Oracle uses full-visibility framing
# ────────────────────────────────────────────────────────────────────────


_ORACLE_APPLICANT_PROMPT = (
    "You are operating in a no-information-gap regime: every detail of "
    "the private profile is shared with the utility and regulator by "
    "design. Compose your interconnection-request filing as a single "
    "comprehensive disclosure. Include: requested capacity, target COD, "
    "site identity, AND the full private profile (flexibility commitment, "
    "redundancy, backup generation, BESS architecture, internal schedule "
    "confidence, workload mix). Be explicit and quantitative — this is "
    "the no-privacy-constraint reference plan."
)

_ORACLE_UTILITY_PROMPT = (
    "You have just received an applicant filing under a no-information-"
    "gap regime — every disclosed field is verified ground-truth. Make "
    "your tier-routing decision in one go: (a) cluster-study tier (FERC "
    "Order 2023 first-ready), (b) energization band (the months you "
    "would commit to), (c) flexibility-commitment class (A/B/C/none), "
    "(d) firmness-rationale verdict. Be specific; the regulator will "
    "audit this decision against the disclosed ground-truth."
)

_ORACLE_REGULATOR_PROMPT = (
    "You have just observed a one-shot Oracle workflow: applicant fully "
    "disclosed, utility decided, and the entire transaction is on the "
    "record. Audit the process — verify (a) the tier-routing decision "
    "follows from disclosed fields, (b) the energization band is "
    "defensible against disclosed timing/firmness, (c) the flexibility "
    "class matches disclosed architecture, (d) nothing in the record "
    "would fail a CMEP evidence-to-requirement linkage check. Issue a "
    "two-sentence verdict: APPROVE / FLAG / REJECT and one-line reason."
)


# ────────────────────────────────────────────────────────────────────────
# Oracle channel
# ────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class OracleChannel:
    """Condition A orchestrator — three deterministic turns, full-info.

    `cache_hash` is a string identifier for the §6e Cartographer cache
    fixture in use (the runner computes the SHA-256 separately and
    passes it; this channel does not read the cache file directly).
    """

    cache_hash: str = ""
    condition: Condition = field(default=Condition.A_ORACLE, init=False)

    def run(
        self,
        *,
        scenario: ScenarioCard,
        seed: int,
        agents: AgentBundle,
        max_turns: int = 12,
    ) -> RunLedger:
        builder = TranscriptBuilder(
            key=RunKey(
                scenario_id=scenario.scenario_id,
                condition=self.condition,
                seed=seed,
            ),
            cache_hash=self.cache_hash,
        )
        builder.scorer_inputs.update(
            {
                "private_tokens": list(scenario.private_token_set),
                "ci_tuples": [t.model_dump() for t in scenario.ci_tuples],
                "condition": self.condition.value,
            }
        )

        # ── T001 — applicant full disclosure ──
        applicant_action_raw = agents.applicant.act(
            free_action_spec(_ORACLE_APPLICANT_PROMPT)
        )
        applicant_action = strip_agent_name_prefix(
            applicant_action_raw, agents.applicant.name
        )
        builder.record_paraphrase_from(agents.applicant)
        builder.add_turn(
            speaker=Role.APPLICANT_CH,
            recipients=[Role.UTILITY_INTAKE, Role.UTILITY_PLANNING, Role.REGULATOR],
            content=applicant_action,
            channel=ChannelEnum.C1_FINAL_OUTPUT,
            day_advance=0.0,  # Oracle is no-delay
        )

        # ── T002 — utility tier-routing decision ──
        observe(agents.utility, f"Applicant filing (Oracle visibility):\n{applicant_action}")
        utility_action_raw = agents.utility.act(free_action_spec(_ORACLE_UTILITY_PROMPT))
        utility_action = strip_agent_name_prefix(utility_action_raw, agents.utility.name)
        builder.add_turn(
            speaker=Role.UTILITY_PLANNING,
            recipients=[Role.APPLICANT_CH, Role.REGULATOR],
            content=utility_action,
            channel=ChannelEnum.C1_FINAL_OUTPUT,
            day_advance=0.0,
        )

        # ── T003 — regulator audit ──
        observe(
            agents.regulator,
            (
                f"Applicant filing (Oracle, full disclosure):\n{applicant_action}\n\n"
                f"Utility decision:\n{utility_action}"
            ),
        )
        regulator_action_raw = agents.regulator.act(
            free_action_spec(_ORACLE_REGULATOR_PROMPT)
        )
        regulator_action = strip_agent_name_prefix(
            regulator_action_raw, agents.regulator.name
        )
        builder.add_turn(
            speaker=Role.REGULATOR,
            recipients=[],
            content=regulator_action,
            channel=ChannelEnum.C1_FINAL_OUTPUT,
            day_advance=0.0,
        )

        builder.artifacts["oracle_decision"] = {
            "applicant_disclosure": applicant_action,
            "utility_decision": utility_action,
            "regulator_verdict": regulator_action,
        }
        return builder.to_ledger()
