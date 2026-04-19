"""Tests for `SkillBundleChannel` — sim-bench-design.md §4.4 + §6b + §6e.

Canned-response driven (FakeTransport). Exercises:
- bundle-send turn structure + recipients + C1 channel
- bounded-query loop termination via the `NO CLARIFICATION NEEDED` sentinel
- bounded-query loop termination via `max_query_rounds` cap
- tier-routing decision produced by utility-planning role
- regulator audit as terminal turn
- paraphrase audit capture on every applicant act
- simulated-day accounting per §6b turnaround parameters
- cache-hash propagation
"""

from __future__ import annotations

import re

from eval_sim.agents.builders import (
    build_applicant,
    build_regulator,
    build_utility,
)
from eval_sim.channels import AgentBundle, SkillBundleChannel
from eval_sim.llm import FakeTransport
from eval_sim.scenarios import S1
from eval_sim.schemas.channel import Channel as ChannelEnum
from eval_sim.schemas.condition import Condition
from eval_sim.schemas.role import Role

_COVER_NOTE = (
    "Owl Compute bundle submitted under policy v1.0.0. 180 MW, Q4 2028 COD. "
    "Queries welcome through the bounded channel."
)
_UTILITY_NO_QUERY = "NO CLARIFICATION NEEDED"
_UTILITY_ONE_QUERY = (
    "Clarifying question: what is the intended flex-window during the inference "
    "phase of operation?"
)
_APPLICANT_RESPONSE = (
    "Flex-window falls within class B commitment already disclosed in the bundle; "
    "bounded-query channel does not carry raw per-window figures."
)
_UTILITY_DECISION = (
    "Tier: fast first-ready cluster study. Energization band Q3 2028 – Q1 2029. "
    "Flex class B accepted. Firmness: OK. Rationale: disclosed flex-commitment "
    "projection + site-control evidence both clear cluster-study criteria."
)
_REGULATOR_VERDICT = (
    "APPROVE — bundle + audit chain reconstruct the tier-routing decision "
    "against policy v1.0.0; no CI transmission-principle violations detected."
)


def _build_agents(transport: FakeTransport) -> AgentBundle:
    return AgentBundle(
        applicant=build_applicant(
            scenario=S1, transport=transport, seed_index=0, dry_run=True
        ),
        utility=build_utility(scenario=S1, transport=transport),
        regulator=build_regulator(scenario=S1, transport=transport),
    )


def _responder_from_sequence(sequence: list[str]):
    """FakeTransport responder that yields each response in order. Raises
    an IndexError if the channel asks for more acts than expected.
    """
    it = iter(sequence)

    def responder(_kwargs: dict[str, object]) -> str:
        return next(it)

    return responder


# ────────────────────────────────────────────────────────────────────────
# Path 1 — utility asks NO CLARIFICATION, loop terminates early
# ────────────────────────────────────────────────────────────────────────


def test_skill_bundle_terminates_early_on_no_clarification_sentinel() -> None:
    """When the utility writes the sentinel on T002, the bounded-query
    loop is skipped; we go straight to tier-routing + audit (4 turns).
    """
    sequence = [
        _COVER_NOTE,         # T001 applicant bundle send
        _UTILITY_NO_QUERY,   # T002 utility verify-and-query: sentinel
        _UTILITY_DECISION,   # T003 utility tier-routing
        _REGULATOR_VERDICT,  # T004 regulator audit
    ]
    transport = FakeTransport(responder=_responder_from_sequence(sequence))
    agents = _build_agents(transport)
    ledger = SkillBundleChannel(cache_hash="sha256:test").run(
        scenario=S1, seed=0, agents=agents
    )

    assert len(ledger.transcript) == 4
    assert ledger.transcript[0].speaker is Role.APPLICANT_CH
    assert ledger.transcript[1].speaker is Role.UTILITY_INTAKE
    assert ledger.transcript[2].speaker is Role.UTILITY_PLANNING
    assert ledger.transcript[3].speaker is Role.REGULATOR
    assert ledger.artifacts["d_summary"]["bounded_query_rounds"] == 0


# ────────────────────────────────────────────────────────────────────────
# Path 2 — one bounded-query round then sentinel
# ────────────────────────────────────────────────────────────────────────


def test_skill_bundle_executes_one_bounded_query_round() -> None:
    sequence = [
        _COVER_NOTE,            # T001 applicant bundle send
        _UTILITY_ONE_QUERY,     # T002 utility asks a query
        _APPLICANT_RESPONSE,    # T003 applicant response
        _UTILITY_NO_QUERY,      # T004 utility verify-and-query: sentinel
        _UTILITY_DECISION,      # T005 utility tier-routing
        _REGULATOR_VERDICT,     # T006 regulator audit
    ]
    transport = FakeTransport(responder=_responder_from_sequence(sequence))
    agents = _build_agents(transport)
    ledger = SkillBundleChannel().run(scenario=S1, seed=0, agents=agents)

    assert len(ledger.transcript) == 6
    assert ledger.artifacts["d_summary"]["bounded_query_rounds"] == 1
    assert ledger.transcript[2].content == _APPLICANT_RESPONSE
    assert ledger.transcript[2].speaker is Role.APPLICANT_CH
    assert "bounded-query:exchange.json" in ledger.transcript[2].artifact_refs


# ────────────────────────────────────────────────────────────────────────
# Path 3 — utility never writes sentinel; loop caps at max_query_rounds
# ────────────────────────────────────────────────────────────────────────


def test_skill_bundle_caps_bounded_queries_at_max() -> None:
    """Utility keeps asking; loop caps at `max_query_rounds=2`."""
    sequence = [
        _COVER_NOTE,             # T001 applicant bundle
        _UTILITY_ONE_QUERY,      # T002 utility asks
        _APPLICANT_RESPONSE,     # T003 applicant responds (round 1)
        _UTILITY_ONE_QUERY,      # T004 utility asks again
        _APPLICANT_RESPONSE,     # T005 applicant responds (round 2 — cap hit)
        _UTILITY_DECISION,       # T006 tier-routing (loop exited before asking a 3rd)
        _REGULATOR_VERDICT,      # T007 regulator audit
    ]
    transport = FakeTransport(responder=_responder_from_sequence(sequence))
    agents = _build_agents(transport)
    ledger = SkillBundleChannel(max_query_rounds=2).run(
        scenario=S1, seed=0, agents=agents
    )

    assert ledger.artifacts["d_summary"]["bounded_query_rounds"] == 2
    assert ledger.transcript[-1].speaker is Role.REGULATOR


# ────────────────────────────────────────────────────────────────────────
# Structural invariants — every turn, every path
# ────────────────────────────────────────────────────────────────────────


def test_skill_bundle_uses_c1_channel_on_every_turn() -> None:
    """D has no internal paraphrase-messaging visible in the transcript —
    all observable turns flow through C1 (final output). (C2 internal
    traffic is inside the applicant EntityAgent's ParaphraseBarrier
    and is captured in `scorer_inputs.paraphrase_audit`, not as turns.)
    """
    sequence = [
        _COVER_NOTE, _UTILITY_NO_QUERY, _UTILITY_DECISION, _REGULATOR_VERDICT,
    ]
    transport = FakeTransport(responder=_responder_from_sequence(sequence))
    agents = _build_agents(transport)
    ledger = SkillBundleChannel().run(scenario=S1, seed=0, agents=agents)

    for turn in ledger.transcript:
        assert turn.channel is ChannelEnum.C1_FINAL_OUTPUT


def test_skill_bundle_condition_scored_as_d() -> None:
    sequence = [
        _COVER_NOTE, _UTILITY_NO_QUERY, _UTILITY_DECISION, _REGULATOR_VERDICT,
    ]
    transport = FakeTransport(responder=_responder_from_sequence(sequence))
    agents = _build_agents(transport)
    ledger = SkillBundleChannel(cache_hash="sha256:xyz").run(
        scenario=S1, seed=0, agents=agents
    )
    assert ledger.key.condition is Condition.D_GRID_PASSPORT
    assert ledger.cache_hash == "sha256:xyz"
    assert ledger.scorer_inputs["condition"] == "D"


def test_skill_bundle_records_paraphrase_audit_on_each_applicant_turn() -> None:
    """Per §8c.iii the channel should snapshot the applicant's paraphrase
    state after every applicant act — three acts in the 1-round path
    (T001, T003 bounded-query response) → we expect at least 2 audit
    entries. (T005+ are utility/regulator; no applicant acts.)
    """
    sequence = [
        _COVER_NOTE,
        _UTILITY_ONE_QUERY,
        _APPLICANT_RESPONSE,
        _UTILITY_NO_QUERY,
        _UTILITY_DECISION,
        _REGULATOR_VERDICT,
    ]
    transport = FakeTransport(responder=_responder_from_sequence(sequence))
    agents = _build_agents(transport)
    ledger = SkillBundleChannel().run(scenario=S1, seed=0, agents=agents)

    audit = ledger.scorer_inputs["paraphrase_audit"]
    assert len(audit) == 2
    assert {entry["turn_id"] for entry in audit} == {"T001", "T003"}


def test_skill_bundle_simulated_days_monotonic_and_nonzero() -> None:
    """§6b turnaround parameters — D's loop should accumulate days as it
    goes; no turn should decrease the clock, and the final day should
    be greater than zero.
    """
    sequence = [
        _COVER_NOTE, _UTILITY_NO_QUERY, _UTILITY_DECISION, _REGULATOR_VERDICT,
    ]
    transport = FakeTransport(responder=_responder_from_sequence(sequence))
    agents = _build_agents(transport)
    ledger = SkillBundleChannel().run(scenario=S1, seed=0, agents=agents)

    days = [t.simulated_day for t in ledger.transcript]
    assert days == sorted(days)  # monotonic
    assert ledger.transcript[-1].simulated_day > 0.0


def test_skill_bundle_bundle_artifact_is_recorded() -> None:
    sequence = [
        _COVER_NOTE, _UTILITY_NO_QUERY, _UTILITY_DECISION, _REGULATOR_VERDICT,
    ]
    transport = FakeTransport(responder=_responder_from_sequence(sequence))
    agents = _build_agents(transport)
    ledger = SkillBundleChannel().run(scenario=S1, seed=0, agents=agents)

    assert "bundle:disclosure-v1.0.0.json" in ledger.artifacts
    artifact = ledger.artifacts["bundle:disclosure-v1.0.0.json"]
    assert artifact["policy_hash"] == "v1.0.0"
    assert artifact["cover_note"] == _COVER_NOTE


# ────────────────────────────────────────────────────────────────────────
# Sentinel-matching edge cases
# ────────────────────────────────────────────────────────────────────────


def test_sentinel_matches_case_insensitively_and_with_surrounding_text() -> None:
    """Utility can prefix or suffix the sentinel; we should still match."""
    sequence = [
        _COVER_NOTE,
        "All fields verify.\nNO CLARIFICATION NEEDED\n— Intake",
        _UTILITY_DECISION,
        _REGULATOR_VERDICT,
    ]
    transport = FakeTransport(responder=_responder_from_sequence(sequence))
    agents = _build_agents(transport)
    ledger = SkillBundleChannel().run(scenario=S1, seed=0, agents=agents)

    # Zero bounded-query rounds because the sentinel was detected.
    assert ledger.artifacts["d_summary"]["bounded_query_rounds"] == 0


def test_prose_no_does_not_false_trigger_sentinel() -> None:
    """Prose 'no clarification at this time' should NOT short-circuit
    the loop (only the exact-phrase sentinel does).
    """
    sequence = [
        _COVER_NOTE,
        "We have no clarification at this time but one operational query: "
        "is the BESS duration maintainable across both phases?",
        _APPLICANT_RESPONSE,
        _UTILITY_NO_QUERY,  # real sentinel on round 2
        _UTILITY_DECISION,
        _REGULATOR_VERDICT,
    ]
    transport = FakeTransport(responder=_responder_from_sequence(sequence))
    agents = _build_agents(transport)
    ledger = SkillBundleChannel().run(scenario=S1, seed=0, agents=agents)

    # One bounded-query round executed before the real sentinel landed.
    assert ledger.artifacts["d_summary"]["bounded_query_rounds"] == 1


def test_channel_is_importable_via_package_root() -> None:
    """Sanity check for `from eval_sim.channels import SkillBundleChannel`."""
    from eval_sim.channels import SkillBundleChannel as C

    assert C is SkillBundleChannel


def test_no_clarification_sentinel_is_module_constant_matching_prompt() -> None:
    """The channel's sentinel must match the sentinel string the utility
    prompt actually instructs the LLM to emit — otherwise the loop
    can't terminate early.
    """
    from eval_sim.channels.skill_bundle import (
        _NO_CLARIFICATION_SENTINEL,
        _UTILITY_VERIFY_AND_QUERY_PROMPT,
    )

    assert _NO_CLARIFICATION_SENTINEL in _UTILITY_VERIFY_AND_QUERY_PROMPT
    assert re.search(
        re.escape(_NO_CLARIFICATION_SENTINEL), _UTILITY_VERIFY_AND_QUERY_PROMPT
    )
