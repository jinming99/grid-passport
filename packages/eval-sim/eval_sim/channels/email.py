"""Condition B — NDA-email channel — §4.2 + §6a.

Status-quo baseline: the applicant and utility exchange multi-round
emails under a signed NDA. Information is protected legally but every
email body, CC list, attachment, and meeting-note remains on-record —
the CI transmission-principle can still be violated even when the NDA
covers legal damages.

Turn skeleton (typical 5–9 turns):
  T001  applicant-ch  → utility-intake    initial filing (email)
  T002  utility-intake → applicant-ch     clarifying query (email)
  T003  applicant-ch  → utility-intake    response (email)
  T004  utility-intake → applicant-ch     follow-up query (email)
  ...  (up to MEETING_TRIGGER_UNRESOLVED_ROUNDS=3 email exchanges)
  TNNN  system         → (all)            meeting scheduled (90% accept)
  TNNN+1 meeting turn + shared-notes artifact
  TNNN+2 utility-planning → (all)         tier-routing decision
  TNNN+3 regulator      → ()              audit verdict

System-level failure modes applied at the routing layer:
  - wrong_cc                   → extra recipient tacked onto an outbound
  - scheduler_assistant_cc     → scheduler DL sentinel recipient added
  - meeting_notes_reuse        → `artifact_refs` reference prior meeting notes
  - meeting_notes_attached     → post-meeting turns carry the notes file

LLM-content-level failure modes (paraphrase_loss, expertise_gap_leak)
are handled by the `ParaphrasedPrivateProfile` component on the
applicant agent and surface in the `scorer_inputs.paraphrase_audit`
entries. `wrong_spec_form_field` is left for the scorer — it shows up
as content that misclassifies a bucket, which the §8d mechanical
validator catches.

The full failure-mode sample + meeting events are attached to
`scorer_inputs` so the §8c.iii trace scorer has the full causal chain.

Per §4.2 there is NO AI intermediary under B; the `applicant` EntityAgent
role-plays the contract-handler, and the `utility` EntityAgent
role-plays the intake engineer — both at the user-sim tier (Sonnet
4.6). That's what this channel drives.
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
from eval_sim.channels.failure_modes import (
    FailureModeSample,
    MeetingTriggerState,
    sample_failure_modes,
)
from eval_sim.config import (
    MEETING_ACCEPT_BASE_RATE,
    MEETING_DURATION_DAYS,
    MEETING_TRIGGER_UNRESOLVED_ROUNDS,
    TURNAROUND_DAYS_B,
)
from eval_sim.runner import RunKey, RunLedger
from eval_sim.schemas.channel import Channel as ChannelEnum
from eval_sim.schemas.condition import Condition
from eval_sim.schemas.role import Role
from eval_sim.schemas.scenario import ScenarioCard

# ────────────────────────────────────────────────────────────────────────
# Turn prompts — realistic email-framing
# ────────────────────────────────────────────────────────────────────────


_APPLICANT_INITIAL_EMAIL_PROMPT = (
    "Compose your initial interconnection-request email to the utility "
    "intake team under a signed NDA. Format as a business email: "
    "subject line, greeting, body paragraphs, sign-off. Include the "
    "requested capacity + target COD + site identity + a description "
    "of your technical approach appropriate to your disclosure "
    "disposition. Remember: the NDA protects legally but EVERY WORD of "
    "this email goes into the record. Be deliberate about what you "
    "disclose at the body level."
)


_UTILITY_INTAKE_CLARIFY_PROMPT = (
    "You have just received an applicant filing. Draft a clarifying "
    "email reply asking about the ONE or TWO fields most material to "
    "your tier-routing decision. Keep it short — real intake engineers "
    "ask focused questions. If the filing has no material ambiguity, "
    "state that the filing is ready for planning review and include a "
    "proposed routing on one line."
)


_APPLICANT_RESPONSE_EMAIL_PROMPT = (
    "Compose your email response to the utility's clarifying query. "
    "Keep the same disclosure disposition as your initial filing. Be "
    "aware: replying to email retains the entire prior thread in the "
    "on-record artifact."
)


_MEETING_APPLICANT_TURN_PROMPT = (
    "A meeting has been scheduled between applicant and utility staff "
    "to resolve the outstanding clarifications. Compose your verbal "
    "contribution to that meeting (3–5 sentences): summarize your "
    "filing, address the utility's clarifying points, and propose a "
    "path forward. Meeting notes will be circulated post-hoc, so "
    "every sentence here is on the record."
)


_MEETING_UTILITY_TURN_PROMPT = (
    "Compose the utility's verbal contribution to the meeting. "
    "Address the applicant's points, ask any remaining clarifying "
    "questions live, and indicate whether the filing is ready for "
    "tier-routing review."
)


_UTILITY_TIER_ROUTING_PROMPT = (
    "Based on the full email + meeting record, issue your tier-routing "
    "decision: (a) cluster-study tier (FERC Order 2023 first-ready / "
    "standard / yellow), (b) energization band (months you would "
    "commit to), (c) flexibility-commitment class (A/B/C/none), (d) "
    "firmness-rationale verdict, (e) one-line rationale citing the "
    "evidence."
)


_REGULATOR_AUDIT_PROMPT = (
    "Audit the NDA-email workflow transcript. The evidence base is the "
    "email thread + any meeting notes. Verify (a) the tier-routing "
    "decision is reconstructable from the record under published "
    "policy, (b) nothing in the record would fail a CMEP evidence-to-"
    "requirement linkage check, (c) flag any on-record disclosure that "
    "the applicant's disclosure disposition would normally withhold. "
    "Issue a two-sentence verdict: APPROVE / FLAG / REJECT and one-line "
    "reason."
)


# Sentinel recipient tags — used by the scorer to classify failure-mode
# effects on the CC list. Not real roles; stored on the turn's
# `recipients` via free-form string is not allowed (typed enum), so we
# instead record CC-broadening on `artifact_refs` as a typed marker.
_CC_BROADENED_MARKER = "cc-broadened:wrong-cc"
_CC_SCHEDULER_MARKER = "cc-broadened:scheduler-assistant"


# ────────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────────


def _act(
    agent,  # type: ignore[no-untyped-def]
    call_to_action: str,
    builder: TranscriptBuilder,
    *,
    agent_kind: str,
) -> str:
    raw = agent.act(free_action_spec(call_to_action))
    text = strip_agent_name_prefix(raw, agent.name)
    if agent_kind == "applicant":
        builder.record_paraphrase_from(agent)
    return text


def _apply_cc_broadening(
    failure_modes: FailureModeSample,
    base_recipients: list[Role],
) -> tuple[list[Role], list[str]]:
    """Return augmented (recipients, artifact_refs) if the failure-mode
    sample says CC should be broadened on this turn. `wrong_cc` adds
    the planning-lead as an extra CC; `scheduler_assistant_cc` adds a
    marker (no real new role — the scheduler assistant isn't a
    persona, but their forwarding the thread is a trace-leakage event).
    """
    recipients = list(base_recipients)
    markers: list[str] = []
    if failure_modes.wrong_cc and Role.UTILITY_PLANNING not in recipients:
        recipients.append(Role.UTILITY_PLANNING)
        markers.append(_CC_BROADENED_MARKER)
    if failure_modes.scheduler_assistant_cc:
        markers.append(_CC_SCHEDULER_MARKER)
    return recipients, markers


# ────────────────────────────────────────────────────────────────────────
# Email channel
# ────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class EmailChannel:
    """Condition B orchestrator — NDA-email + meetings per §4.2 + §6a.

    `failure_rate_scale` multiplies every archetype-specific base rate
    — used for the §10.4 sensitivity analysis at {0.5×, 1×, 2×}.

    The meeting-trigger threshold is `MEETING_TRIGGER_UNRESOLVED_ROUNDS`
    (locked to 3 per §6a); the loop tracks `MeetingTriggerState` and
    escalates when threshold reached.
    """

    failure_rate_scale: float = 1.0
    condition: Condition = field(default=Condition.B_NDA_EMAIL, init=False)

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
        )
        failure_modes = sample_failure_modes(
            scenario.scenario_id,
            seed,
            scale=self.failure_rate_scale,
        )
        meeting_state = MeetingTriggerState(unresolved_rounds=0)
        meeting_held = False
        meeting_accepted = False

        builder.scorer_inputs.update(
            {
                "private_tokens": list(scenario.private_token_set),
                "ci_tuples": [t.model_dump() for t in scenario.ci_tuples],
                "condition": self.condition.value,
                "failure_modes": {
                    "wrong_cc": failure_modes.wrong_cc,
                    "scheduler_assistant_cc": failure_modes.scheduler_assistant_cc,
                    "paraphrase_loss": failure_modes.paraphrase_loss,
                    "expertise_gap_leak": failure_modes.expertise_gap_leak,
                    "meeting_notes_reuse": failure_modes.meeting_notes_reuse,
                    "wrong_spec_form_field": failure_modes.wrong_spec_form_field,
                },
                "failure_rate_scale": self.failure_rate_scale,
            }
        )

        # ── T001 — applicant initial email ──
        applicant_email = _act(
            agents.applicant,
            _APPLICANT_INITIAL_EMAIL_PROMPT,
            builder,
            agent_kind="applicant",
        )
        recipients, markers = _apply_cc_broadening(
            failure_modes, [Role.UTILITY_INTAKE]
        )
        builder.add_turn(
            speaker=Role.APPLICANT_CH,
            recipients=recipients,
            content=applicant_email,
            channel=ChannelEnum.C1_FINAL_OUTPUT,
            day_advance=TURNAROUND_DAYS_B["cross_org_email"],
            artifact_refs=["email:T001-filing.eml", *markers],
        )

        # ── Email exchange loop (up to MEETING_TRIGGER_UNRESOLVED_ROUNDS) ──
        last_utility_email = ""
        while (
            meeting_state.unresolved_rounds < MEETING_TRIGGER_UNRESOLVED_ROUNDS
            and len(builder.turns) + 2 <= max_turns
        ):
            # Utility clarifying email.
            observe(
                agents.utility,
                f"Applicant email received:\n{applicant_email if meeting_state.unresolved_rounds == 0 else last_utility_email}",
            )
            utility_email = _act(
                agents.utility,
                _UTILITY_INTAKE_CLARIFY_PROMPT,
                builder,
                agent_kind="utility",
            )
            last_utility_email = utility_email
            u_recipients, u_markers = _apply_cc_broadening(
                failure_modes, [Role.APPLICANT_CH]
            )
            builder.add_turn(
                speaker=Role.UTILITY_INTAKE,
                recipients=u_recipients,
                content=utility_email,
                channel=ChannelEnum.C1_FINAL_OUTPUT,
                day_advance=TURNAROUND_DAYS_B["cross_org_email"],
                artifact_refs=[
                    f"email:T{len(builder.turns):03d}-utility-clarify.eml",
                    *u_markers,
                ],
            )

            # Detect whether the utility's message resolves OR demands more.
            # Heuristic: if utility says "ready for planning review" or
            # similar, treat as resolved. Otherwise unresolved → loop.
            resolved = any(
                phrase in utility_email.lower()
                for phrase in (
                    "ready for planning review",
                    "proceed with routing",
                    "no further clarification",
                )
            )
            meeting_state = meeting_state.advance(resolved=resolved)
            if resolved:
                break
            # Bail out BEFORE the applicant's next reply once the meeting
            # trigger threshold is reached — otherwise we force an extra
            # applicant act that the meeting turn then replaces.
            if meeting_state.should_trigger(MEETING_TRIGGER_UNRESOLVED_ROUNDS):
                break

            # Applicant response.
            observe(agents.applicant, f"Utility clarifying email:\n{utility_email}")
            applicant_reply = _act(
                agents.applicant,
                _APPLICANT_RESPONSE_EMAIL_PROMPT,
                builder,
                agent_kind="applicant",
            )
            a_recipients, a_markers = _apply_cc_broadening(
                failure_modes, [Role.UTILITY_INTAKE]
            )
            builder.add_turn(
                speaker=Role.APPLICANT_CH,
                recipients=a_recipients,
                content=applicant_reply,
                channel=ChannelEnum.C1_FINAL_OUTPUT,
                day_advance=TURNAROUND_DAYS_B["cross_org_email"],
                artifact_refs=[
                    f"email:T{len(builder.turns):03d}-applicant-reply.eml",
                    *a_markers,
                ],
            )
            applicant_email = applicant_reply  # becomes the new "latest" from applicant

        # ── Meeting trigger if still unresolved ──
        if meeting_state.should_trigger(MEETING_TRIGGER_UNRESOLVED_ROUNDS):
            # Meeting-accept roll: 90% accept, 10% ask one more email round.
            accept_draw, _ = _sample_meeting_accept(scenario.scenario_id, seed)
            meeting_accepted = accept_draw < MEETING_ACCEPT_BASE_RATE

            if meeting_accepted and len(builder.turns) + 3 <= max_turns:
                # System turn: meeting scheduled.
                builder.add_turn(
                    speaker=Role.SYSTEM,
                    recipients=[Role.APPLICANT_CH, Role.UTILITY_INTAKE],
                    content=(
                        "Meeting scheduled between applicant and utility "
                        "staff to resolve outstanding clarifications."
                    ),
                    channel=ChannelEnum.C7_ARTIFACTS,
                    day_advance=TURNAROUND_DAYS_B["meeting_scheduling"],
                    artifact_refs=["meeting-invite:calendar.ics"],
                )
                # Meeting turn — applicant verbal contribution.
                applicant_meeting = _act(
                    agents.applicant,
                    _MEETING_APPLICANT_TURN_PROMPT,
                    builder,
                    agent_kind="applicant",
                )
                meeting_notes_refs = [
                    "meeting-notes:circulated.md",
                ]
                if failure_modes.meeting_notes_reuse:
                    meeting_notes_refs.append("meeting-notes:forwarded-to-DL.md")
                builder.add_turn(
                    speaker=Role.APPLICANT_CH,
                    recipients=[Role.UTILITY_INTAKE, Role.UTILITY_PLANNING],
                    content=applicant_meeting,
                    channel=ChannelEnum.C7_ARTIFACTS,
                    day_advance=MEETING_DURATION_DAYS / 2,
                    artifact_refs=meeting_notes_refs,
                )
                # Utility verbal contribution (planning-lead attends).
                utility_meeting = _act(
                    agents.utility,
                    _MEETING_UTILITY_TURN_PROMPT,
                    builder,
                    agent_kind="utility",
                )
                builder.add_turn(
                    speaker=Role.UTILITY_PLANNING,
                    recipients=[Role.APPLICANT_CH, Role.UTILITY_INTAKE],
                    content=utility_meeting,
                    channel=ChannelEnum.C7_ARTIFACTS,
                    day_advance=MEETING_DURATION_DAYS / 2,
                    artifact_refs=meeting_notes_refs,
                )
                meeting_held = True

        # ── Utility tier-routing decision ──
        observe(
            agents.utility,
            (
                "All clarifying exchanges complete"
                + (" (including post-meeting)" if meeting_held else "")
                + ". Issuing tier-routing decision."
            ),
        )
        utility_decision = _act(
            agents.utility,
            _UTILITY_TIER_ROUTING_PROMPT,
            builder,
            agent_kind="utility",
        )
        builder.add_turn(
            speaker=Role.UTILITY_PLANNING,
            recipients=[Role.APPLICANT_CH, Role.REGULATOR],
            content=utility_decision,
            channel=ChannelEnum.C1_FINAL_OUTPUT,
            day_advance=TURNAROUND_DAYS_B["internal_email"],
        )

        # ── Regulator audit ──
        observe(
            agents.regulator,
            (
                f"NDA-email workflow transcript. "
                f"Meeting held: {meeting_held}. "
                f"Email rounds: {meeting_state.unresolved_rounds}."
            ),
        )
        regulator_action = _act(
            agents.regulator,
            _REGULATOR_AUDIT_PROMPT,
            builder,
            agent_kind="regulator",
        )
        builder.add_turn(
            speaker=Role.REGULATOR,
            recipients=[],
            content=regulator_action,
            channel=ChannelEnum.C1_FINAL_OUTPUT,
            day_advance=TURNAROUND_DAYS_B["regulator_docket"],
        )

        builder.artifacts["b_summary"] = {
            "unresolved_email_rounds": meeting_state.unresolved_rounds,
            "meeting_triggered": meeting_state.should_trigger(
                MEETING_TRIGGER_UNRESOLVED_ROUNDS
            ),
            "meeting_accepted": meeting_accepted,
            "meeting_held": meeting_held,
            "utility_decision": utility_decision,
            "regulator_verdict": regulator_action,
        }
        return builder.to_ledger()


def _sample_meeting_accept(scenario_id: str, seed: int) -> tuple[float, int]:
    """Deterministic meeting-accept draw from `SHA256(scenarioId || seedIndex
    || "meeting")` — separate digest stream from the failure-mode sampler
    so the two are independent.
    """
    import hashlib

    payload = f"{scenario_id}|{seed}|meeting-accept".encode()
    digest = hashlib.sha256(payload).digest()
    value = int.from_bytes(digest[:4], "big") / 0x1_0000_0000
    return value, 4
