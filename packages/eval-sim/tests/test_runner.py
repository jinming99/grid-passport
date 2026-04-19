"""Tests for eval_sim.runner (§12.1 single-run orchestrator, dry-run only)."""

from __future__ import annotations

import pytest

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


def test_live_run_not_implemented_pre_lock() -> None:
    s1 = scenarios.get("S1")
    with pytest.raises(NotImplementedError, match="§17"):
        run(s1, Condition.D_GRID_PASSPORT, seed=0, dry_run=False)


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
