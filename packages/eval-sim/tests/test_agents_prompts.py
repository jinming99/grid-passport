"""Tests for eval_sim.agents.prompts + paraphrase (§5a-§5c locked prompts)."""

from __future__ import annotations

from eval_sim.agents.paraphrase import (
    PARAPHRASE_BARRIER_PROMPT,
    paraphrase_barrier,
)
from eval_sim.agents.prompts import (
    APPLICANT_CONTRACT_HANDLER_PROMPT,
    APPLICANT_TECHNICAL_EXPERT_PROMPT,
    LOCKED_PROMPTS,
    REGULATOR_PROMPT,
    UTILITY_INTAKE_ENGINEER_PROMPT,
    UTILITY_PLANNING_LEAD_PROMPT,
)


def test_locked_prompts_registry_has_five_entries() -> None:
    """§5 has five personas: applicant×2 + utility×2 + regulator."""
    assert set(LOCKED_PROMPTS) == {
        "applicant.contract_handler",
        "applicant.technical_expert",
        "utility.intake_engineer",
        "utility.planning_lead",
        "regulator",
    }


def test_applicant_contract_handler_prompt_is_locked() -> None:
    """Byte-level sentinels from §5a verbatim."""
    p = APPLICANT_CONTRACT_HANDLER_PROMPT
    assert "You are the contract-handler for {applicant_org}" in p
    assert "partial" in p
    assert "disclosure disposition is {disposition}" in p
    assert "Never fabricate information" in p
    assert "internal-escalation move" in p


def test_applicant_technical_expert_prompt_is_locked() -> None:
    """Byte-level sentinels from §5a verbatim."""
    p = APPLICANT_TECHNICAL_EXPERT_PROMPT
    assert "internal technical expert" in p
    assert "full" in p
    assert "private profile: {private_profile}" in p
    assert "do not self-censor on their behalf" in p


def test_utility_intake_engineer_prompt_is_locked() -> None:
    p = UTILITY_INTAKE_ENGINEER_PROMPT
    assert "intake engineer at {utility_name}" in p
    assert "not easily talked out of asking a question" in p


def test_utility_planning_lead_prompt_is_locked() -> None:
    p = UTILITY_PLANNING_LEAD_PROMPT
    assert "planning lead at {utility_name}" in p
    assert "FERC Order 2023 first-ready cluster-study" in p
    assert "do not take self-reports at face value when they \\\nare both unverifiable and outcome-relevant".replace("\\\n", "") in p


def test_regulator_prompt_is_locked() -> None:
    p = REGULATOR_PROMPT
    assert "staff reviewer at {regulatory_body}" in p
    assert "process integrity" in p
    assert "Flag anything you cannot verify" in p


def test_paraphrase_barrier_prompt_is_locked() -> None:
    p = PARAPHRASE_BARRIER_PROMPT
    assert "<SCRATCHPAD>" in p
    assert "<ANSWER>" in p
    assert "{loss_rate_pct}" in p
    assert "{technical_text}" in p
    assert "controlled lossiness" in p


# ────────────────────────────────────────────────────────────────────────
# ParaphraseBarrier pure-function behavior (dry-run stub)
# ────────────────────────────────────────────────────────────────────────


def test_paraphrase_barrier_dry_run_adds_one_simulated_day() -> None:
    """§5a barrier spec: adds 1 simulated day regardless of implementation."""
    result = paraphrase_barrier(
        "Our flex is 22%. Our BESS is 60 MW, 4h. Confidence 0.68.",
        loss_rate=0.15,
        seed_key="S1|0|T005",
        dry_run=True,
    )
    assert result.added_simulated_days == 1.0
    assert result.loss_rate == 0.15


def test_paraphrase_barrier_zero_loss_returns_input() -> None:
    """Loss rate 0 means verbatim forward."""
    text = "Exact detail: 22% flex, 60 MW BESS, 0.68 confidence."
    result = paraphrase_barrier(
        text,
        loss_rate=0.0,
        seed_key="test|0|T001",
        dry_run=True,
    )
    # The deterministic-compress stub keeps all sentences at loss=0 and
    # preserves percent values because the threshold for compression
    # (loss >= 0.25) is not met.
    assert "22%" in result.paraphrased


def test_paraphrase_barrier_high_loss_compresses_percentages() -> None:
    """Loss rate >= 0.25 triggers the percent-to-class compression in the
    dry-run stub — the 50% first-timer S4 rate should replace '22%' with a
    class-level phrase.
    """
    text = "Our flexibility number is 22%. Our confidence interval is small."
    result = paraphrase_barrier(
        text,
        loss_rate=0.50,
        seed_key="S4|0|T007",
        dry_run=True,
    )
    assert "22%" not in result.paraphrased
    assert "roughly a quarter" in result.paraphrased or "class-level" in result.paraphrased or (
        "a small single-digit percent" in result.paraphrased
    ) or (
        "roughly a third" in result.paraphrased
    ) or (
        "roughly half" in result.paraphrased
    )


def test_paraphrase_barrier_deterministic_by_seed_key() -> None:
    """Same input + seed_key should produce the same output."""
    text = "Test text with 22% value."
    r1 = paraphrase_barrier(text, loss_rate=0.5, seed_key="S1|0|T001", dry_run=True)
    r2 = paraphrase_barrier(text, loss_rate=0.5, seed_key="S1|0|T001", dry_run=True)
    assert r1.paraphrased == r2.paraphrased
