"""Tests for the Concordia agent layer — sim-bench-design.md §5.

Three layers under test:
1. `TransportLanguageModel` — wraps our Transport with Concordia's
   `LanguageModel` ABC.
2. `ParaphrasedPrivateProfile` — the §1.5.2 #6 realism component.
3. `build_applicant` / `build_utility` / `build_regulator` — full
   `EntityAgent` assembly with a single round-trip via FakeTransport.

No live LLM calls — every test uses `FakeTransport` so the suite stays
fast and CI-runnable.
"""

from __future__ import annotations

from concordia.typing import entity

from eval_sim.agents.builders import (
    DEFAULT_REGULATORY_BODY,
    DEFAULT_UTILITY_NAME,
    build_applicant,
    build_regulator,
    build_utility,
)
from eval_sim.agents.components import ParaphrasedPrivateProfile
from eval_sim.agents.embedder import deterministic_embedder
from eval_sim.agents.language_model import TransportLanguageModel
from eval_sim.llm import FakeTransport
from eval_sim.scenarios import S1

# ────────────────────────────────────────────────────────────────────────
# Embedder determinism
# ────────────────────────────────────────────────────────────────────────


def test_embedder_is_deterministic_and_unit_norm() -> None:
    a = deterministic_embedder("the quick brown fox")
    b = deterministic_embedder("the quick brown fox")
    c = deterministic_embedder("a different sentence")
    assert (a == b).all()
    assert (a != c).any()
    assert abs(float((a * a).sum()) - 1.0) < 1e-5  # unit norm


# ────────────────────────────────────────────────────────────────────────
# TransportLanguageModel
# ────────────────────────────────────────────────────────────────────────


def test_transport_language_model_sample_text_routes_to_transport() -> None:
    fake = FakeTransport(responder=lambda kw: f"echo:{kw['user'][:20]}")
    lm = TransportLanguageModel(transport=fake, model="claude-sonnet-4-6")
    out = lm.sample_text("Hello world.")
    assert out == "echo:Hello world."
    assert len(fake.calls) == 1
    assert fake.calls[0]["model"] == "claude-sonnet-4-6"


def test_transport_language_model_sample_text_passes_system_prompt() -> None:
    fake = FakeTransport(responder=lambda kw: f"sys:{kw['system']}")
    lm = TransportLanguageModel(
        transport=fake, model="claude-sonnet-4-6", system="be terse"
    )
    out = lm.sample_text("ping")
    assert out == "sys:be terse"


def test_transport_language_model_sample_choice_picks_by_digit() -> None:
    fake = FakeTransport(responder=lambda _kw: "I choose 2.")
    lm = TransportLanguageModel(transport=fake, model="claude-sonnet-4-6")
    idx, choice, info = lm.sample_choice("Pick:", ["A", "B", "C"])
    assert idx == 1
    assert choice == "B"
    assert info["fallback"] is False


def test_transport_language_model_sample_choice_falls_back_on_no_digit() -> None:
    fake = FakeTransport(responder=lambda _kw: "no number here")
    lm = TransportLanguageModel(transport=fake, model="claude-sonnet-4-6")
    idx, choice, info = lm.sample_choice("Pick:", ["A", "B"])
    assert idx == 0
    assert choice == "A"
    assert info["fallback"] is True


def test_transport_language_model_sample_choice_falls_back_on_out_of_range() -> None:
    fake = FakeTransport(responder=lambda _kw: "99")
    lm = TransportLanguageModel(transport=fake, model="claude-sonnet-4-6")
    idx, _choice, info = lm.sample_choice("Pick:", ["A", "B"])
    assert idx == 0
    assert info["fallback"] is True
    assert info["out_of_range_idx"] == 98


# ────────────────────────────────────────────────────────────────────────
# ParaphrasedPrivateProfile component
# ────────────────────────────────────────────────────────────────────────


def test_paraphrased_private_profile_dry_run_keeps_raw_and_paraphrase() -> None:
    """Dry-run path uses the deterministic compress stub from
    `eval_sim.agents.paraphrase`. Component should expose both the raw
    serialization (for trace-leakage scoring) and the most-recent
    paraphrase result.
    """
    assert S1.private_profile is not None
    component = ParaphrasedPrivateProfile(
        private_profile=S1.private_profile,
        loss_rate=0.4,
        seed_key_prefix="S1|seed-0",
        transport=None,
        dry_run=True,
    )
    raw = component.raw_text
    assert "Workload mix" in raw
    assert str(S1.private_profile.flexPercent) in raw
    # Trigger a pre_act value by calling the protected method directly
    # (Concordia normally handles this via the entity's PRE_ACT phase;
    # here we exercise the component in isolation).
    paraphrase_text = component._make_pre_act_value()
    assert isinstance(paraphrase_text, str)
    assert paraphrase_text  # non-empty
    assert component.last_paraphrase is not None
    assert component.last_paraphrase.original == raw
    assert component.last_paraphrase.added_simulated_days == 1.0


# ────────────────────────────────────────────────────────────────────────
# Builders — instantiation + one round-trip via FakeTransport
# ────────────────────────────────────────────────────────────────────────


_CANNED_APPLICANT_REPLY = (
    "Hello — submitting Owl Compute interconnection request, 180 MW. "
    "Disclosure bundle attached; flex commitment is class B."
)


def test_build_applicant_assembles_and_acts() -> None:
    """End-to-end: build the applicant agent, hand it an action spec,
    receive an action. FakeTransport returns a canned reply for every
    LLM call (including the paraphrase-barrier and the act-component).
    """
    fake = FakeTransport(responder=lambda _kw: _CANNED_APPLICANT_REPLY)
    agent = build_applicant(
        scenario=S1,
        transport=fake,
        seed_index=0,
        dry_run=True,  # stub paraphrase barrier; Concordia LM still uses transport
    )
    spec = entity.ActionSpec(
        call_to_action="Draft your opening message to the utility intake team.",
        output_type=entity.OutputType.FREE,
    )
    out = agent.act(spec)
    assert _CANNED_APPLICANT_REPLY in out
    # Concordia prefixes by the agent name.
    assert "applicant" in out.lower()


def test_build_applicant_paraphrase_uses_transport_when_live() -> None:
    """With dry_run=False, the paraphrase barrier should call the
    transport — verifies the inter-component LLM hop is wired through
    the same Transport seam as the act-component.
    """
    paraphrase_responses = iter([
        "<SCRATCHPAD>compress</SCRATCHPAD>\n<ANSWER>roughly half/half mix</ANSWER>",
        _CANNED_APPLICANT_REPLY,
    ])
    fake = FakeTransport(responder=lambda _kw: next(paraphrase_responses))
    agent = build_applicant(
        scenario=S1,
        transport=fake,
        seed_index=0,
        dry_run=False,
    )
    spec = entity.ActionSpec(
        call_to_action="Reply.",
        output_type=entity.OutputType.FREE,
    )
    agent.act(spec)
    # Two transport calls expected: one paraphrase, one act-component.
    assert len(fake.calls) >= 2


def test_build_utility_assembles_and_acts() -> None:
    fake = FakeTransport(responder=lambda _kw: "Received bundle. Routing to planning lead.")
    agent = build_utility(scenario=S1, transport=fake)
    spec = entity.ActionSpec(
        call_to_action="Draft your acknowledgment of the filing.",
        output_type=entity.OutputType.FREE,
    )
    out = agent.act(spec)
    assert "Received bundle" in out
    assert DEFAULT_UTILITY_NAME.lower() in out.lower() or "utility" in out.lower()


def test_build_regulator_assembles_and_acts() -> None:
    fake = FakeTransport(
        responder=lambda _kw: (
            "Audit complete: bundle + audit chain reconstruct against policy v1.0.0."
        )
    )
    agent = build_regulator(scenario=S1, transport=fake)
    spec = entity.ActionSpec(
        call_to_action="State your audit verdict.",
        output_type=entity.OutputType.FREE,
    )
    out = agent.act(spec)
    assert "Audit complete" in out
    assert "regulator" in out.lower() or DEFAULT_REGULATORY_BODY.split()[0].lower() in out.lower()
