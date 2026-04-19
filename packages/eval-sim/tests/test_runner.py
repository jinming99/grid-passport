"""Tests for eval_sim.runner (§12.1 single-run orchestrator, dry-run only)."""

from __future__ import annotations

from eval_sim import scenarios
from eval_sim.runner import RunLedger, run
from eval_sim.schemas.condition import Condition


def test_dry_run_returns_ledger_with_transcript() -> None:
    s1 = scenarios.get("S1")
    ledger = run(s1, Condition.D_GRID_PASSPORT, seed=0, dry_run=True)
    assert isinstance(ledger, RunLedger)
    assert ledger.key.scenario_id == "S1"
    assert ledger.key.condition == Condition.D_GRID_PASSPORT
    assert ledger.key.seed == 0
    assert len(ledger.transcript) == 3  # three synthetic stub turns
    assert ledger.transcript[0].turn_id == "T001"
    assert ledger.scorer_inputs["private_tokens"]


def test_dry_run_cache_hash_surfaces_not_yet_generated_marker() -> None:
    """Cartographer cache fixtures aren't generated pre-lock; runner reports
    a deterministic placeholder hash so the ledger-write path still has a
    value downstream scorers can log.
    """
    s1 = scenarios.get("S1")
    ledger = run(s1, Condition.A_ORACLE, seed=0, dry_run=True)
    assert ledger.cache_hash.startswith("not-yet-generated:")


def test_dry_run_b_samples_failure_modes_deterministically() -> None:
    """Condition B's failure-mode sampler is invoked only for B, not for
    A/C/D. Same seed → same failure sample.
    """
    s1 = scenarios.get("S1")
    ledger_b_1 = run(s1, Condition.B_NDA_EMAIL, seed=7, dry_run=True)
    ledger_b_2 = run(s1, Condition.B_NDA_EMAIL, seed=7, dry_run=True)
    assert ledger_b_1.failure_modes is not None
    assert ledger_b_1.failure_modes == ledger_b_2.failure_modes

    ledger_d = run(s1, Condition.D_GRID_PASSPORT, seed=7, dry_run=True)
    assert ledger_d.failure_modes is None  # not applicable to D


def _make_dispatch_responder(default: str):
    """FakeTransport responder that recognizes the two structured-output
    prompts the runner triggers (paraphrase barrier expects an
    `<ANSWER>` tag; everything else is free-form)."""
    paraphrase_response = (
        "<SCRATCHPAD>compress</SCRATCHPAD>\n<ANSWER>compressed paraphrase</ANSWER>"
    )

    def responder(kwargs: dict[str, object]) -> str:
        user = str(kwargs.get("user", ""))
        if "paraphrasing a technical-expert" in user:
            return paraphrase_response
        return default

    return responder


def test_live_run_dispatches_to_skill_bundle_channel() -> None:
    """Post-§17 live path: `run(..., dry_run=False, transport=fake)`
    builds the AgentBundle + dispatches to `SkillBundleChannel` for D.
    Uses FakeTransport so no LLM calls happen.
    """
    from eval_sim.llm import FakeTransport

    s1 = scenarios.get("S1")
    fake = FakeTransport(responder=_make_dispatch_responder("NO CLARIFICATION NEEDED"))
    ledger = run(
        s1, Condition.D_GRID_PASSPORT, seed=0, dry_run=False, transport=fake
    )
    assert ledger.key.condition is Condition.D_GRID_PASSPORT
    # SkillBundle's tag — confirms dispatch worked.
    assert ledger.scorer_inputs["cartographer_mode"] == "cached"


def test_live_run_dispatches_to_oracle_channel_for_a() -> None:
    from eval_sim.llm import FakeTransport

    s1 = scenarios.get("S1")
    fake = FakeTransport(responder=_make_dispatch_responder("stub response"))
    ledger = run(
        s1, Condition.A_ORACLE, seed=0, dry_run=False, transport=fake
    )
    assert ledger.key.condition is Condition.A_ORACLE
    # Oracle is fixed 3-turn.
    assert len(ledger.transcript) == 3


def test_live_run_dispatches_to_email_channel_for_b() -> None:
    from eval_sim.llm import FakeTransport

    s1 = scenarios.get("S1")
    fake = FakeTransport(
        responder=_make_dispatch_responder("Ready for planning review. Routing: fast.")
    )
    ledger = run(s1, Condition.B_NDA_EMAIL, seed=0, dry_run=False, transport=fake)
    assert ledger.key.condition is Condition.B_NDA_EMAIL
    # B is the only condition that attaches a top-level failure_modes
    # sample on the ledger.
    assert ledger.failure_modes is not None


def test_live_run_dispatches_to_prompt_only_channel_for_c() -> None:
    from eval_sim.llm import FakeTransport

    s1 = scenarios.get("S1")
    fake = FakeTransport(responder=_make_dispatch_responder("NO CLARIFICATION NEEDED"))
    ledger = run(s1, Condition.C_PROMPT_ONLY, seed=0, dry_run=False, transport=fake)
    assert ledger.key.condition is Condition.C_PROMPT_ONLY
    assert ledger.scorer_inputs["cartographer_mode"] == "live"


def test_all_seven_scenarios_dry_run_under_every_condition() -> None:
    """Smoke test that every (scenario, condition) pair produces a valid
    ledger under dry_run. This is the pre-§17-lock integration fence.
    """
    for sid in scenarios.all_ids():
        card = scenarios.get(sid)
        for cond in Condition:
            ledger = run(card, cond, seed=0, dry_run=True)
            assert ledger.transcript
            assert ledger.cache_hash
