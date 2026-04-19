"""Tests for `eval_sim.channels.base` + `OracleChannel` — §4.1 + §6d.

`FakeTransport` returns canned responses so every test is fast +
deterministic. The channel orchestration logic is what's under test;
the agents are real Concordia EntityAgents from
`eval_sim.agents.builders`.
"""

from __future__ import annotations

from eval_sim.agents.builders import (
    build_applicant,
    build_regulator,
    build_utility,
)
from eval_sim.channels import (
    AgentBundle,
    OracleChannel,
    free_action_spec,
    make_turn_id,
)
from eval_sim.llm import FakeTransport
from eval_sim.scenarios import S1
from eval_sim.schemas.channel import Channel as ChannelEnum
from eval_sim.schemas.condition import Condition
from eval_sim.schemas.role import Role

# ────────────────────────────────────────────────────────────────────────
# base.py helpers
# ────────────────────────────────────────────────────────────────────────


def test_make_turn_id_zero_pads_to_three_digits() -> None:
    assert make_turn_id(1) == "T001"
    assert make_turn_id(42) == "T042"
    assert make_turn_id(999) == "T999"
    # 4-digit also works (regex allows 3+).
    assert make_turn_id(1000) == "T1000"


def test_make_turn_id_rejects_zero_and_negative() -> None:
    import pytest

    with pytest.raises(ValueError, match="must be >= 1"):
        make_turn_id(0)


def test_free_action_spec_uses_free_output_type() -> None:
    from concordia.typing import entity

    spec = free_action_spec("act now")
    assert spec.call_to_action == "act now"
    assert spec.output_type is entity.OutputType.FREE


# ────────────────────────────────────────────────────────────────────────
# OracleChannel — 3-turn deterministic loop
# ────────────────────────────────────────────────────────────────────────


_CANNED_APPLICANT = (
    "Owl Compute filing — 180 MW, target Q4 2028. Full disclosure: "
    "flex 22%, redundancy shift 18%, backup 120 MW × 48h, BESS 60 MW × 4h, "
    "schedule confidence 0.68, mix 55/45 training/inference."
)
_CANNED_UTILITY = (
    "Tier-routing: fast (FERC Order 2023 first-ready). Energization "
    "Q3 2028 – Q1 2029. Flex class B accepted. Firmness OK."
)
_CANNED_REGULATOR = "APPROVE — disclosed fields support every decision step."


def _build_agents(transport: FakeTransport) -> AgentBundle:
    """Build a bundle with the SAME FakeTransport across all three roles
    so a single canned-response sequence drives the whole 3-turn loop.
    """
    return AgentBundle(
        applicant=build_applicant(
            scenario=S1, transport=transport, seed_index=0, dry_run=True
        ),
        utility=build_utility(scenario=S1, transport=transport),
        regulator=build_regulator(scenario=S1, transport=transport),
    )


def test_oracle_channel_emits_three_turns_in_order() -> None:
    responses = iter([_CANNED_APPLICANT, _CANNED_UTILITY, _CANNED_REGULATOR])
    transport = FakeTransport(responder=lambda _kw: next(responses))
    agents = _build_agents(transport)
    channel = OracleChannel(cache_hash="sha256:test")
    ledger = channel.run(scenario=S1, seed=0, agents=agents)

    assert ledger.key.scenario_id == "S1"
    assert ledger.key.condition is Condition.A_ORACLE
    assert ledger.key.seed == 0
    assert len(ledger.transcript) == 3
    assert ledger.transcript[0].turn_id == "T001"
    assert ledger.transcript[0].speaker is Role.APPLICANT_CH
    assert ledger.transcript[1].speaker is Role.UTILITY_PLANNING
    assert ledger.transcript[2].speaker is Role.REGULATOR


def test_oracle_channel_records_full_disclosure_in_first_turn() -> None:
    responses = iter([_CANNED_APPLICANT, _CANNED_UTILITY, _CANNED_REGULATOR])
    transport = FakeTransport(responder=lambda _kw: next(responses))
    agents = _build_agents(transport)
    ledger = OracleChannel().run(scenario=S1, seed=0, agents=agents)

    # Applicant turn carries the full-disclosure content.
    assert "22%" in ledger.transcript[0].content or "180 MW" in ledger.transcript[0].content
    # Recipients are the broadest set — Oracle visibility.
    assert Role.UTILITY_INTAKE in ledger.transcript[0].recipients
    assert Role.REGULATOR in ledger.transcript[0].recipients


def test_oracle_channel_uses_c1_channel_for_all_turns() -> None:
    responses = iter([_CANNED_APPLICANT, _CANNED_UTILITY, _CANNED_REGULATOR])
    transport = FakeTransport(responder=lambda _kw: next(responses))
    agents = _build_agents(transport)
    ledger = OracleChannel().run(scenario=S1, seed=0, agents=agents)

    for turn in ledger.transcript:
        assert turn.channel is ChannelEnum.C1_FINAL_OUTPUT


def test_oracle_channel_applies_no_simulated_day_advance() -> None:
    """§4.1 / §6d — Oracle has no turnaround delays."""
    responses = iter([_CANNED_APPLICANT, _CANNED_UTILITY, _CANNED_REGULATOR])
    transport = FakeTransport(responder=lambda _kw: next(responses))
    agents = _build_agents(transport)
    ledger = OracleChannel().run(scenario=S1, seed=0, agents=agents)

    for turn in ledger.transcript:
        assert turn.simulated_day == 0.0


def test_oracle_channel_records_paraphrase_audit() -> None:
    """The applicant agent has a `ParaphrasedPrivateProfile` component;
    the channel should snapshot its `last_paraphrase` after the
    applicant acts so §8c.iii has the raw vs. paraphrased pair.
    """
    responses = iter([_CANNED_APPLICANT, _CANNED_UTILITY, _CANNED_REGULATOR])
    transport = FakeTransport(responder=lambda _kw: next(responses))
    agents = _build_agents(transport)
    ledger = OracleChannel().run(scenario=S1, seed=0, agents=agents)

    audit = ledger.scorer_inputs.get("paraphrase_audit", [])
    assert len(audit) == 1
    entry = audit[0]
    assert entry["turn_id"] == "T001"
    assert "raw" in entry
    assert "paraphrased" in entry


def test_oracle_channel_carries_cache_hash_through_to_ledger() -> None:
    responses = iter([_CANNED_APPLICANT, _CANNED_UTILITY, _CANNED_REGULATOR])
    transport = FakeTransport(responder=lambda _kw: next(responses))
    agents = _build_agents(transport)
    ledger = OracleChannel(cache_hash="sha256:abc123").run(
        scenario=S1, seed=0, agents=agents
    )
    assert ledger.cache_hash == "sha256:abc123"


def test_oracle_channel_attaches_scorer_inputs() -> None:
    responses = iter([_CANNED_APPLICANT, _CANNED_UTILITY, _CANNED_REGULATOR])
    transport = FakeTransport(responder=lambda _kw: next(responses))
    agents = _build_agents(transport)
    ledger = OracleChannel().run(scenario=S1, seed=0, agents=agents)

    assert ledger.scorer_inputs["condition"] == "A"
    assert isinstance(ledger.scorer_inputs["private_tokens"], list)
    assert len(ledger.scorer_inputs["private_tokens"]) > 0
    assert isinstance(ledger.scorer_inputs["ci_tuples"], list)


def test_oracle_channel_tags_cartographer_mode_cached() -> None:
    """§6e: Oracle reads the same Cartographer cache as D; §8d H-spec
    decomposition needs a consistent 'cartographer_mode' key across
    A/C/D to separate the cache-vs-live effect. Oracle tags as 'cached'.
    """
    responses = iter([_CANNED_APPLICANT, _CANNED_UTILITY, _CANNED_REGULATOR])
    transport = FakeTransport(responder=lambda _kw: next(responses))
    agents = _build_agents(transport)
    ledger = OracleChannel().run(scenario=S1, seed=0, agents=agents)

    assert ledger.scorer_inputs["cartographer_mode"] == "cached"
