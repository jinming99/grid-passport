"""Tests for `EmailChannel` — sim-bench-design.md §4.2 + §6a.

FakeTransport-driven. Exercises:
- turn sequence (applicant → utility → applicant → utility → ...)
- meeting trigger after MEETING_TRIGGER_UNRESOLVED_ROUNDS=3
- meeting NOT triggered when utility resolves inside the loop
- CC-broadening failure modes surface as `artifact_refs` markers
- failure-mode sample propagates to `scorer_inputs`
- simulated-day accounting using §6a TURNAROUND_DAYS_B
- paraphrase-audit capture on every applicant act
- final utility-planning decision + regulator audit
"""

from __future__ import annotations

from eval_sim.agents.builders import (
    build_applicant,
    build_regulator,
    build_utility,
)
from eval_sim.channels import AgentBundle, EmailChannel
from eval_sim.channels.email import _CC_BROADENED_MARKER, _CC_SCHEDULER_MARKER
from eval_sim.config import MEETING_TRIGGER_UNRESOLVED_ROUNDS
from eval_sim.llm import FakeTransport
from eval_sim.scenarios import S1
from eval_sim.schemas.channel import Channel as ChannelEnum
from eval_sim.schemas.condition import Condition
from eval_sim.schemas.role import Role


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
# Path A — utility resolves inside the loop, no meeting
# ────────────────────────────────────────────────────────────────────────


def test_email_channel_terminates_without_meeting_when_utility_resolves() -> None:
    """Utility writes 'ready for planning review' on T002 — loop exits
    early; no meeting is triggered.
    """
    sequence = [
        "Subject: 180 MW filing\n\nHello — attached is our request.",  # T001
        "Ready for planning review. Routing: fast-tier likely.",        # T002 resolved
        "Tier: fast. Band Q3 2028 – Q1 2029. Flex B. Firmness OK.",     # T003 decision
        "APPROVE — record complete.",                                   # T004 regulator
    ]
    transport = FakeTransport(responder=_responder_from_sequence(sequence))
    agents = _build_agents(transport)
    ledger = EmailChannel().run(scenario=S1, seed=0, agents=agents)

    assert ledger.artifacts["b_summary"]["meeting_held"] is False
    assert ledger.artifacts["b_summary"]["meeting_triggered"] is False
    assert ledger.transcript[-1].speaker is Role.REGULATOR
    assert ledger.transcript[-2].speaker is Role.UTILITY_PLANNING


# ────────────────────────────────────────────────────────────────────────
# Path B — utility never resolves, meeting triggers after 3 rounds
# ────────────────────────────────────────────────────────────────────────


def test_email_channel_triggers_meeting_after_three_unresolved_rounds() -> None:
    """Utility keeps asking open-ended questions; after 3 unresolved
    rounds the meeting trigger fires. With seed=0 the meeting-accept
    draw is deterministic; we assert meeting_triggered=True and
    meeting_held is recorded in the summary.
    """
    # Sequence needs to support: T001 applicant, T002 utility ask, T003
    # applicant reply, T004 utility ask, T005 applicant reply, T006 utility
    # ask (3rd unresolved round reached), then meeting sequence if
    # accepted, then decision + audit.
    sequence = [
        "Subject: Filing\n\nAttached.",                  # T001 applicant
        "What is the flex window? Please clarify.",      # T002 utility ask (unresolved #1)
        "Flex window is business-hours.",                # T003 applicant
        "What about weekend ops?",                       # T004 utility ask (unresolved #2)
        "Weekend ops follow standard schedule.",         # T005 applicant
        "And training vs inference split?",              # T006 utility ask (unresolved #3 — trigger)
        "Meeting opening — we would like to discuss the split in detail.",  # T007 applicant meeting
        "Utility perspective — the split matters for firmness.",            # T008 utility meeting
        "Tier: fast. Band Q3 2028 – Q1 2029. Flex B.",                     # T009 decision
        "APPROVE with conditions — note the meeting record.",               # T010 regulator
    ]
    transport = FakeTransport(responder=_responder_from_sequence(sequence))
    agents = _build_agents(transport)
    ledger = EmailChannel().run(scenario=S1, seed=0, agents=agents, max_turns=20)

    summary = ledger.artifacts["b_summary"]
    assert summary["meeting_triggered"] is True
    # With seed=0 and the fixed SHA256 path, the accept-draw for S1|seed-0
    # is deterministic; whether it lands below 0.90 base rate is a seed
    # property. We assert the three possible outcomes are mutually
    # consistent — accept → held, decline → not held but still flagged.
    if summary["meeting_accepted"]:
        assert summary["meeting_held"] is True
        # Meeting contributes at least 3 C7 turns (scheduled system-turn
        # + applicant + utility).
        c7_turns = [t for t in ledger.transcript if t.channel is ChannelEnum.C7_ARTIFACTS]
        assert len(c7_turns) >= 3
    else:
        assert summary["meeting_held"] is False


# ────────────────────────────────────────────────────────────────────────
# Failure-mode application at the routing layer
# ────────────────────────────────────────────────────────────────────────


def test_email_channel_exposes_failure_modes_in_scorer_inputs() -> None:
    sequence = [
        "Filing.", "Ready for planning review.",
        "Tier: fast. Band. Flex B.", "APPROVE.",
    ]
    transport = FakeTransport(responder=_responder_from_sequence(sequence))
    agents = _build_agents(transport)
    ledger = EmailChannel().run(scenario=S1, seed=0, agents=agents)

    fm = ledger.scorer_inputs["failure_modes"]
    assert set(fm.keys()) == {
        "wrong_cc",
        "scheduler_assistant_cc",
        "paraphrase_loss",
        "expertise_gap_leak",
        "meeting_notes_reuse",
        "wrong_spec_form_field",
    }
    assert all(isinstance(v, bool) for v in fm.values())


def test_email_channel_records_wrong_cc_marker_on_turns_when_sample_fires() -> None:
    """If `wrong_cc` fires for (S1, seed=0, scale=2.0) we expect the
    marker to appear on at least one outbound turn. Scale=2.0 maximizes
    the chance; if it still doesn't fire, the test still passes as long
    as the channel's behavior is coherent (marker only when sample says).
    """
    sequence = [
        "Filing.", "Ready for planning review.",
        "Tier: fast. Band. Flex B.", "APPROVE.",
    ]
    transport = FakeTransport(responder=_responder_from_sequence(sequence))
    agents = _build_agents(transport)
    ledger = EmailChannel(failure_rate_scale=2.0).run(
        scenario=S1, seed=0, agents=agents
    )

    fm = ledger.scorer_inputs["failure_modes"]
    wrong_cc_markers_seen = any(
        _CC_BROADENED_MARKER in t.artifact_refs for t in ledger.transcript
    )
    scheduler_markers_seen = any(
        _CC_SCHEDULER_MARKER in t.artifact_refs for t in ledger.transcript
    )
    # Marker appears IFF the sample said it should.
    assert wrong_cc_markers_seen == fm["wrong_cc"]
    assert scheduler_markers_seen == fm["scheduler_assistant_cc"]


def test_email_channel_wrong_cc_adds_planning_as_recipient() -> None:
    """When `wrong_cc` fires, the planning-lead is added to outbound
    recipients (the scorer can then detect cross-role C2 leakage via
    the recipient set).
    """
    sequence = [
        "Filing.", "Ready for planning review.",
        "Tier: fast. Band. Flex B.", "APPROVE.",
    ]
    transport = FakeTransport(responder=_responder_from_sequence(sequence))
    agents = _build_agents(transport)
    ledger = EmailChannel(failure_rate_scale=2.0).run(
        scenario=S1, seed=0, agents=agents
    )
    if ledger.scorer_inputs["failure_modes"]["wrong_cc"]:
        # At least one email turn has UTILITY_PLANNING in recipients
        # beyond the expected base. (T001 base = [UTILITY_INTAKE].)
        assert any(
            Role.UTILITY_PLANNING in t.recipients
            and t.speaker in (Role.APPLICANT_CH, Role.UTILITY_INTAKE)
            for t in ledger.transcript
        )


# ────────────────────────────────────────────────────────────────────────
# Structural invariants
# ────────────────────────────────────────────────────────────────────────


def test_email_channel_tags_condition_b_and_records_scale() -> None:
    sequence = [
        "Filing.", "Ready for planning review.",
        "Tier.", "APPROVE.",
    ]
    transport = FakeTransport(responder=_responder_from_sequence(sequence))
    agents = _build_agents(transport)
    ledger = EmailChannel(failure_rate_scale=1.0).run(
        scenario=S1, seed=0, agents=agents
    )
    assert ledger.key.condition is Condition.B_NDA_EMAIL
    assert ledger.scorer_inputs["condition"] == "B"
    assert ledger.scorer_inputs["failure_rate_scale"] == 1.0


def test_email_channel_simulated_days_accumulate_across_turns() -> None:
    sequence = [
        "Filing.", "Ready for planning review.",
        "Tier.", "APPROVE.",
    ]
    transport = FakeTransport(responder=_responder_from_sequence(sequence))
    agents = _build_agents(transport)
    ledger = EmailChannel().run(scenario=S1, seed=0, agents=agents)

    days = [t.simulated_day for t in ledger.transcript]
    assert days == sorted(days)
    # At minimum: cross-org email T001 (3d) + utility T002 (3d) + decision (1d)
    # + regulator docket (14d) = 21 days, even on the fastest path.
    assert ledger.transcript[-1].simulated_day >= 21.0


def test_email_channel_records_paraphrase_audit_on_each_applicant_turn() -> None:
    """Minimum 1 applicant act in the short path (T001). Longer paths
    (meeting + responses) produce more audit entries.
    """
    sequence = [
        "Filing.", "Ready for planning review.",
        "Tier.", "APPROVE.",
    ]
    transport = FakeTransport(responder=_responder_from_sequence(sequence))
    agents = _build_agents(transport)
    ledger = EmailChannel().run(scenario=S1, seed=0, agents=agents)

    audit = ledger.scorer_inputs["paraphrase_audit"]
    assert len(audit) >= 1


def test_email_channel_meeting_trigger_threshold_matches_config() -> None:
    """Regression: changing `MEETING_TRIGGER_UNRESOLVED_ROUNDS` should
    change the trigger behavior. Locked at 3 per §6a.
    """
    assert MEETING_TRIGGER_UNRESOLVED_ROUNDS == 3


def test_email_channel_importable_via_package_root() -> None:
    from eval_sim.channels import EmailChannel as C

    assert C is EmailChannel
