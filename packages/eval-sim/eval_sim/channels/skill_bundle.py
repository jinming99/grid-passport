"""Condition D — Grid Passport / SkillBundle channel — §4.4 + §6b + §6e.

The proposed system. Applicant runs the local Skill stack
(Interviewer + Cartographer + Forecaster + Referee) → produces a signed
disclosure bundle → utility verifies + plans from the bundle →
optional bounded-query rounds → regulator audits bundle + audit chain.

Cartographer reads the §6e cache fixture; no live SDK calls under D
(C is the live-Cartographer condition for measuring hallucination).

Turn skeleton (5–7 turns typical):
  T001  applicant   → utility    bundle send + cover note (C7 artifact + C1 cover)
  T002  utility     → applicant  intake verification + first clarifying query (C1)
  T003  applicant   → utility    bounded-query response (C1)
  T004  utility     → applicant  tier-routing decision (C1)
  T005  regulator   → ()         audit verdict (C1)
  (optionally one more bounded-query round T003a/T003b before T004)

Termination: utility issues a tier-routing decision (T004) and the
regulator issues a verdict (T005). Loop bounded by `max_turns` (default
12) for safety.

Per §4.4 the D agents run at Opus 4.7 (Skill stack) — see §5e. The
runner builds the right tier; this channel just drives the loop.
"""

from __future__ import annotations

import re
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
# Locked turn prompts
# ────────────────────────────────────────────────────────────────────────


_BUNDLE_SEND_PROMPT = (
    "Compose your initial submission to the utility intake team. You are "
    "operating under the Grid Passport workflow: a signed disclosure "
    "bundle is the on-wire artifact. The bundle carries projected "
    "views + audit chain + policy hash + Ed25519 signature. Raw "
    "private-profile values are NEVER carried in the bundle by "
    "construction (write-scope contract). Your message should be a "
    "short cover note — one paragraph max — referencing the bundle's "
    "policy version, the requested capacity, target COD, and inviting "
    "any clarifying queries through the bounded-query channel. Do NOT "
    "restate raw private values in the cover note."
)


_UTILITY_VERIFY_AND_QUERY_PROMPT = (
    "You have just received a Grid Passport signed disclosure bundle "
    "from the applicant. Step 1 — bundle verification: assume the "
    "signature is valid and the policy hash matches v1.0.0. Step 2 — "
    "plan from disclosed projections only; no raw private values are "
    "available to you (write-scope contract). Step 3 — issue ONE "
    "clarifying query through the bounded-query channel ONLY if a "
    "decision-relevant disclosed field is ambiguous. Otherwise, write "
    "'NO CLARIFICATION NEEDED' on its own line. Be concise: real intake "
    "engineers ask only the question that materially changes routing."
)


_BOUNDED_QUERY_RESPONSE_PROMPT = (
    "The utility intake team has issued a clarifying query through the "
    "bounded-query channel. Compose your response. Constraint: bounded "
    "queries do NOT carry raw private-profile values without an "
    "explicit re-consent step you have not granted. Respond at the "
    "class-level, range-level, or by referencing the existing disclosed "
    "projection. If the query is unanswerable without raw disclosure, "
    "say so and propose what additional projected derivative could "
    "satisfy the planning need."
)


_UTILITY_TIER_ROUTING_PROMPT = (
    "Make your tier-routing decision based on the disclosed bundle and "
    "any bounded-query exchanges. Provide: (a) cluster-study tier (FERC "
    "Order 2023 first-ready / standard / yellow), (b) energization "
    "band (months you would commit to), (c) flexibility-commitment "
    "class (A/B/C/none), (d) firmness-rationale verdict, (e) one-line "
    "rationale citing the disclosed evidence. Be concise."
)


_REGULATOR_AUDIT_PROMPT = (
    "Audit the Grid Passport workflow you have observed. The bundle + "
    "audit chain + policy hash are the evidence base — you do NOT need "
    "raw competitive data to verify process integrity. Confirm: (a) "
    "the tier-routing decision is reconstructable from disclosed "
    "evidence under the cited policy version, (b) bounded-query "
    "exchanges (if any) preserved the no-raw-private-value invariant, "
    "(c) NERC CMEP evidence-to-requirement linkage holds end-to-end. "
    "Issue a two-sentence verdict: APPROVE / FLAG / REJECT and one-line "
    "reason."
)


# Sentinel that signals "no further clarification" in the utility's
# verify-and-query turn. Pre-registered + simple — easier to detect
# robustly than parsing an LLM's prose 'no'.
_NO_CLARIFICATION_SENTINEL = "NO CLARIFICATION NEEDED"


# ────────────────────────────────────────────────────────────────────────
# Turnaround days — §6b table for D
# ────────────────────────────────────────────────────────────────────────


_BUNDLE_PREPARATION_DAYS = 1.0       # local intake + review + export
_BUNDLE_VERIFICATION_DAYS = 0.5      # automated, < 1 day
_BOUNDED_QUERY_ROUND_DAYS = 2.0      # query + response
_REGULATOR_VERIFICATION_DAYS = 3.0   # bundle + audit chain review


# ────────────────────────────────────────────────────────────────────────
# Channel
# ────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class SkillBundleChannel:
    """Condition D orchestrator — Grid Passport workflow.

    `cache_hash` identifies the §6e Cartographer cache fixture in use.
    `max_query_rounds` caps the bounded-query loop (default 2 — most
    well-formed bundles need ≤1 round). The loop terminates earlier
    when the utility writes the no-clarification sentinel.

    `cartographer_mode_override` is the §6e fairness-pilot escape hatch:
    when set to `'live'`, D calls Cartographer live just like C so the
    cache-vs-no-cache effect is isolated from the substrate effect.
    Native-condition default is `None` → `'cached'` is recorded on the
    ledger. Any caller setting this owns the cost implications.
    """

    cache_hash: str = ""
    max_query_rounds: int = 2
    cartographer_mode_override: str | None = None
    condition: Condition = field(default=Condition.D_GRID_PASSPORT, init=False)

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
            cartographer_mode=self.cartographer_mode_override or "cached",
        )


def run_bundle_workflow(
    *,
    scenario: ScenarioCard,
    seed: int,
    agents: AgentBundle,
    condition: Condition,
    cache_hash: str,
    max_query_rounds: int,
    max_turns: int,
    cartographer_mode: str,
) -> RunLedger:
    """Shared bundle-workflow loop used by both `SkillBundleChannel`
    (Condition D, cartographer_mode='cached') and
    `PromptOnlyBundleChannel` (Condition C, cartographer_mode='live').

    The two conditions share this loop because they share the wire
    protocol (bundle + bounded-query channel) per §6b/§6c. What differs
    between C and D is the agent-build layer (prompt-only Skill content
    vs structured Skill substrate) — which is set when the runner
    constructs the AgentBundle, not here.

    The Cartographer mode is recorded in `scorer_inputs` so §8d
    H-spec.hallucination can split pre-validator-rate vs in-artifact
    rate per the §6e fairness pilot decomposition.
    """
    builder = TranscriptBuilder(
        key=RunKey(
            scenario_id=scenario.scenario_id,
            condition=condition,
            seed=seed,
        ),
        cache_hash=cache_hash,
    )
    builder.scorer_inputs.update(
        {
            "private_tokens": list(scenario.private_token_set),
            "ci_tuples": [t.model_dump() for t in scenario.ci_tuples],
            "condition": condition.value,
            "max_query_rounds": max_query_rounds,
            "cartographer_mode": cartographer_mode,
        }
    )
    bounded_query_rounds = 0

    # ── T001 — applicant bundle send + cover note ──
    applicant_action = _act(
        agents.applicant, _BUNDLE_SEND_PROMPT, builder, agent_kind="applicant"
    )
    builder.add_turn(
        speaker=Role.APPLICANT_CH,
        recipients=[Role.UTILITY_INTAKE],
        content=applicant_action,
        channel=ChannelEnum.C1_FINAL_OUTPUT,
        day_advance=_BUNDLE_PREPARATION_DAYS,
        artifact_refs=["bundle:disclosure-v1.0.0.json"],
    )
    builder.artifacts["bundle:disclosure-v1.0.0.json"] = {
        "policy_hash": "v1.0.0",
        "signed_by": agents.applicant.name,
        "cover_note": applicant_action,
        # The bundle carries projected views — by construction the
        # scenario's pre-registered private_token_set RAW would NOT
        # appear here. Trace scorer verifies on the live transcript.
    }

    # ── T002 — utility verify + clarifying query ──
    observe(
        agents.utility,
        (
            f"Received signed disclosure bundle (policy v1.0.0) from "
            f"{agents.applicant.name}.\n\nCover note:\n{applicant_action}"
        ),
    )
    utility_query = _act(
        agents.utility, _UTILITY_VERIFY_AND_QUERY_PROMPT, builder, agent_kind="utility"
    )
    builder.add_turn(
        speaker=Role.UTILITY_INTAKE,
        recipients=[Role.APPLICANT_CH],
        content=utility_query,
        channel=ChannelEnum.C1_FINAL_OUTPUT,
        day_advance=_BUNDLE_VERIFICATION_DAYS,
    )

    # ── Bounded-query loop (0..max_query_rounds) ──
    utility_round_text = utility_query
    while (
        bounded_query_rounds < max_query_rounds
        and not _no_clarification(utility_round_text)
        and len(builder.turns) + 2 <= max_turns
    ):
        # Applicant response.
        observe(
            agents.applicant,
            f"Bounded-query from utility intake:\n{utility_round_text}",
        )
        applicant_response = _act(
            agents.applicant,
            _BOUNDED_QUERY_RESPONSE_PROMPT,
            builder,
            agent_kind="applicant",
        )
        builder.add_turn(
            speaker=Role.APPLICANT_CH,
            recipients=[Role.UTILITY_INTAKE],
            content=applicant_response,
            channel=ChannelEnum.C1_FINAL_OUTPUT,
            day_advance=_BOUNDED_QUERY_ROUND_DAYS,
            artifact_refs=["bounded-query:exchange.json"],
        )
        bounded_query_rounds += 1

        if bounded_query_rounds >= max_query_rounds:
            break

        # Utility may ask another query (or write the sentinel).
        observe(
            agents.utility,
            f"Applicant bounded-query response:\n{applicant_response}",
        )
        utility_round_text = _act(
            agents.utility,
            _UTILITY_VERIFY_AND_QUERY_PROMPT,
            builder,
            agent_kind="utility",
        )
        builder.add_turn(
            speaker=Role.UTILITY_INTAKE,
            recipients=[Role.APPLICANT_CH],
            content=utility_round_text,
            channel=ChannelEnum.C1_FINAL_OUTPUT,
            day_advance=_BOUNDED_QUERY_ROUND_DAYS / 2,
        )

    # ── Tier-routing decision (utility-planning) ──
    observe(
        agents.utility,
        "All bounded-query exchanges complete. Issuing the routing decision now.",
    )
    utility_decision = _act(
        agents.utility, _UTILITY_TIER_ROUTING_PROMPT, builder, agent_kind="utility"
    )
    builder.add_turn(
        speaker=Role.UTILITY_PLANNING,
        recipients=[Role.APPLICANT_CH, Role.REGULATOR],
        content=utility_decision,
        channel=ChannelEnum.C1_FINAL_OUTPUT,
        day_advance=_BUNDLE_VERIFICATION_DAYS,
    )

    # ── Regulator audit ──
    observe(
        agents.regulator,
        (
            f"Bundle workflow transcript ({condition.value}):\n"
            f"- Applicant cover note: {applicant_action[:300]}…\n"
            f"- Bounded-query rounds: {bounded_query_rounds}\n"
            f"- Utility decision: {utility_decision}"
        ),
    )
    regulator_action = _act(
        agents.regulator, _REGULATOR_AUDIT_PROMPT, builder, agent_kind="regulator"
    )
    builder.add_turn(
        speaker=Role.REGULATOR,
        recipients=[],
        content=regulator_action,
        channel=ChannelEnum.C1_FINAL_OUTPUT,
        day_advance=_REGULATOR_VERIFICATION_DAYS,
    )

    # Backwards-compat key `d_summary` is preserved for the existing
    # SkillBundle tests; new callers should read `bundle_summary`.
    summary = {
        "bounded_query_rounds": bounded_query_rounds,
        "utility_decision": utility_decision,
        "regulator_verdict": regulator_action,
        "cartographer_mode": cartographer_mode,
    }
    builder.artifacts["bundle_summary"] = summary
    if condition is Condition.D_GRID_PASSPORT:
        builder.artifacts["d_summary"] = summary
    return builder.to_ledger()


# ────────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────────


def _act(
    agent,  # type: ignore[no-untyped-def] — Concordia EntityAgentWithLogging
    call_to_action: str,
    builder: TranscriptBuilder,
    *,
    agent_kind: str,
) -> str:
    """Drive one act, strip the agent-name prefix, snapshot any
    paraphrase audit if the agent is the applicant.
    """
    raw = agent.act(free_action_spec(call_to_action))
    text = strip_agent_name_prefix(raw, agent.name)
    if agent_kind == "applicant":
        builder.record_paraphrase_from(agent)
    return text


def _no_clarification(text: str) -> bool:
    """Loose-match the no-clarification sentinel; tolerates surrounding
    punctuation + case variation but is conservative enough that prose
    'no further clarification needed at this time' won't false-trigger.
    """
    pattern = re.compile(re.escape(_NO_CLARIFICATION_SENTINEL), re.IGNORECASE)
    return bool(pattern.search(text))
