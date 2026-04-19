"""Tests for `PromptOnlyBundleChannel` — sim-bench-design.md §4.3 + §6c.

C and D share the bundle workflow per §1.5.1 #1 (substrate isolation
requires wire-protocol parity); the channel-level differences are
metadata only:
- `condition` is `C_PROMPT_ONLY` (not `D_GRID_PASSPORT`)
- `cartographer_mode` is `"live"` (not `"cached"`)

The agent-build difference (flat-prompt baseline vs Skill substrate)
is set by the runner, not the channel.
"""

from __future__ import annotations

from eval_sim.agents.builders import (
    build_applicant,
    build_regulator,
    build_utility,
)
from eval_sim.channels import (
    AgentBundle,
    PromptOnlyBundleChannel,
    SkillBundleChannel,
)
from eval_sim.llm import FakeTransport
from eval_sim.scenarios import S1
from eval_sim.schemas.condition import Condition

_COVER_NOTE = "Owl Compute filing — bundle attached, queries welcome."
_NO_QUERY = "NO CLARIFICATION NEEDED"
_DECISION = "Tier: fast. Energization Q3 2028 – Q1 2029. Flex B. Firmness OK."
_VERDICT = "APPROVE — process integrity holds."


def _build_agents(transport: FakeTransport) -> AgentBundle:
    return AgentBundle(
        applicant=build_applicant(
            scenario=S1, transport=transport, seed_index=0, dry_run=True
        ),
        utility=build_utility(scenario=S1, transport=transport),
        regulator=build_regulator(scenario=S1, transport=transport),
    )


def _responder_from_sequence(sequence: list[str]):
    it = iter(sequence)

    def responder(_kwargs: dict[str, object]) -> str:
        return next(it)

    return responder


# ────────────────────────────────────────────────────────────────────────
# Condition + metadata
# ────────────────────────────────────────────────────────────────────────


def test_prompt_only_bundle_tags_condition_c() -> None:
    sequence = [_COVER_NOTE, _NO_QUERY, _DECISION, _VERDICT]
    transport = FakeTransport(responder=_responder_from_sequence(sequence))
    agents = _build_agents(transport)
    ledger = PromptOnlyBundleChannel(cache_hash="sha256:c-test").run(
        scenario=S1, seed=0, agents=agents
    )
    assert ledger.key.condition is Condition.C_PROMPT_ONLY
    assert ledger.scorer_inputs["condition"] == "C"
    assert ledger.scorer_inputs["cartographer_mode"] == "live"


def test_skill_bundle_tags_cartographer_mode_cached() -> None:
    """Sister test — verifies the §6e fairness-pilot decomposition has
    a clean mode label on every run.
    """
    sequence = [_COVER_NOTE, _NO_QUERY, _DECISION, _VERDICT]
    transport = FakeTransport(responder=_responder_from_sequence(sequence))
    agents = _build_agents(transport)
    ledger = SkillBundleChannel(cache_hash="sha256:d-test").run(
        scenario=S1, seed=0, agents=agents
    )
    assert ledger.scorer_inputs["cartographer_mode"] == "cached"


# ────────────────────────────────────────────────────────────────────────
# Wire-protocol parity with D — the §1.5.1 #1 substrate-isolation invariant
# ────────────────────────────────────────────────────────────────────────


def test_c_and_d_share_loop_structure_under_identical_responses() -> None:
    """Given identical canned responses, C and D should produce ledgers
    with the same number of turns + the same speaker/recipient sequence
    + the same turn IDs. The only structural difference is the
    condition tag and the cartographer_mode label.
    """
    sequence = [_COVER_NOTE, _NO_QUERY, _DECISION, _VERDICT]

    transport_c = FakeTransport(responder=_responder_from_sequence(list(sequence)))
    agents_c = _build_agents(transport_c)
    ledger_c = PromptOnlyBundleChannel().run(scenario=S1, seed=0, agents=agents_c)

    transport_d = FakeTransport(responder=_responder_from_sequence(list(sequence)))
    agents_d = _build_agents(transport_d)
    ledger_d = SkillBundleChannel().run(scenario=S1, seed=0, agents=agents_d)

    assert len(ledger_c.transcript) == len(ledger_d.transcript)
    for c_turn, d_turn in zip(ledger_c.transcript, ledger_d.transcript, strict=True):
        assert c_turn.turn_id == d_turn.turn_id
        assert c_turn.speaker == d_turn.speaker
        assert c_turn.recipients == d_turn.recipients
        assert c_turn.channel == d_turn.channel
        assert c_turn.simulated_day == d_turn.simulated_day


def test_prompt_only_bundle_writes_bundle_summary_artifact() -> None:
    """Both C and D write a `bundle_summary` artifact carrying the
    cartographer_mode + bounded-query-rounds. D additionally writes a
    legacy `d_summary` key for backwards-compat with the SkillBundle
    test suite.
    """
    sequence = [_COVER_NOTE, _NO_QUERY, _DECISION, _VERDICT]

    transport_c = FakeTransport(responder=_responder_from_sequence(list(sequence)))
    ledger_c = PromptOnlyBundleChannel().run(
        scenario=S1, seed=0, agents=_build_agents(transport_c)
    )
    assert ledger_c.artifacts["bundle_summary"]["cartographer_mode"] == "live"
    assert "d_summary" not in ledger_c.artifacts

    transport_d = FakeTransport(responder=_responder_from_sequence(list(sequence)))
    ledger_d = SkillBundleChannel().run(
        scenario=S1, seed=0, agents=_build_agents(transport_d)
    )
    assert ledger_d.artifacts["bundle_summary"]["cartographer_mode"] == "cached"
    assert "d_summary" in ledger_d.artifacts  # legacy alias


def test_prompt_only_bundle_importable_via_package_root() -> None:
    from eval_sim.channels import PromptOnlyBundleChannel as C

    assert C is PromptOnlyBundleChannel
