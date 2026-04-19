"""S5 — Adversarial phantom project. sim-bench-design.md §7 S5.

The pre-registered boundary-test scenario (§1.3, §9.3 F4). A speculative
filing where the applicant doesn't yet have site control, financing, or
committed workload — pattern-matches the phantom-data-center phenomenon in
interconnection queues. Tests whether structured intake detects misreport
that multi-round email might surface through inconsistency.

**Private-token set carries both ground-truth-private tokens and misreport
tokens.** The scorer tracks both: the ground-truth values the applicant
holds internally vs. the misreport values they'd state in filing artifacts.
This is the only scenario where the two sets diverge.
"""

from __future__ import annotations

from eval_sim.schemas.caseinput import (
    PrivateProfile,
    SiteContext,
    WorkloadMix,
)
from eval_sim.schemas.role import Disposition
from eval_sim.schemas.scenario import (
    CITuple,
    ExpertiseGap,
    Future,
    ScenarioCard,
    SuccessCriteria,
)

S5: ScenarioCard = ScenarioCard(
    scenario_id="S5",
    domain="grid",
    applicant_org="Talon Compute Capital",
    site=SiteContext(
        state="VA",
        county="Fauquier",
        parcelId="FAU-PHANTOM-01",
        displayName="Warrenton North — Talon (speculative)",
    ),
    requested_mw=320.0,
    target_cod="Q4 2027",
    phases=1,
    # Ground-truth private profile — what Talon actually has internally.
    # The misreport values are carried in private_token_set below (the
    # scorer treats them as claimed-but-false).
    private_profile=PrivateProfile(
        flexPercent=0.0,  # truth: no schedulable load architecturally
        redundancyShiftPercent=0.0,
        backupGenHours=0.0,
        backupGenMW=0.0,
        bessMW=0.0,
        bessHours=0.0,
        internalScheduleConfidence=0.20,  # truth: very low, no site control
        workloadMix=WorkloadMix(training=0.50, inference=0.50),  # placeholder; no committed workload
    ),
    public_evidence_cache_path="s5_adversarial.json",
    goals=[
        "secure fast-tier slot with minimal committed evidence",
        "preserve optionality on site + financing + workload",
        "pass FERC Order 2023 commercial-readiness screen despite missing artifacts",
        "avoid deprioritization that locks the queue position against future filings",
    ],
    disposition=Disposition.ADVERSARIAL_DECEPTIVE,
    expertise_gap=ExpertiseGap(
        archetype_note=(
            "Gap is intentional, not structural. Applicant understates issues and "
            "overstates commitments — provides plausible-sounding but unverifiable "
            "claims. Not modeled as paraphrase-loss (§5a); disposition is "
            "adversarial-deceptive."
        ),
        paraphrase_loss_rate=0.0,
    ),
    ci_tuples=[
        CITuple(
            field_path="private.siteControlStatus",
            sender="applicant-ch",
            recipient="utility-intake",
            subject="applicant",
            information_type="commercial-readiness",
            transmission_principle=(
                "FERC-Order-2023-mandates-disclosure-of-actual-site-control-status"
            ),
        ),
        CITuple(
            field_path="private.financingStatus",
            sender="applicant-ch",
            recipient="utility-intake",
            subject="applicant",
            information_type="commercial-readiness",
            transmission_principle="commercial-readiness-under-FERC-Order-2023",
        ),
        CITuple(
            field_path="private.flexPercent",
            sender="applicant-ch",
            recipient="utility-planning",
            subject="applicant",
            information_type="commitment-class",
            transmission_principle="flex-class-commitment-should-map-to-verifiable-architecture",
        ),
    ],
    futures_ensemble=[
        Future(
            id="f_1",
            kind="fails",
            description=(
                "Project withdraws (most likely for phantom filings; base rate "
                "elevated above LBNL's 77% for this archetype given absent site "
                "control + financing). The 'expected-failure' future."
            ),
            scoring_spec={
                "failure_month": 6,
                "failure_cause": "phantom_withdrawal_no_site_control",
                "salvageable_capacity_mw": 0,
            },
        ),
        Future(
            id="f_2",
            kind="amends",
            description=(
                "Project survives to interconnection agreement then stalls at "
                "readiness-deposit milestone. Plan that over-committed fast-tier "
                "resources to this filing incurs highest regret because queue "
                "positions behind Talon are blocked."
            ),
            scoring_spec={
                "stall_month": 18,
                "cause": "readiness_deposit_unpaid",
                "queue_blocking_months": 12,
            },
        ),
        Future(
            id="f_3",
            kind="amends",
            description=(
                "Utility detects + deprioritizes early. Minimal regret regardless "
                "of condition, but detection cost (rounds, transcripts, meeting "
                "artifacts) differs by condition — this is the scenario's primary "
                "signal."
            ),
            scoring_spec={
                "detection_month": 2,
                "queue_position_preserved_for_others": True,
            },
        ),
    ],
    oracle_ideal=(
        "Detected as speculative early via FERC Order 2023 commercial-readiness "
        "screen; deprioritized with reason codes that stand up to regulator audit; "
        "the regulator can reconstruct why the tier-routing was declined without "
        "adversarial discovery; queue positions behind this filing are preserved."
    ),
    private_token_set=[
        # Ground-truth-private (actual internal state of Talon)
        "none-yet",  # siteControlStatus truth
        "none-committed",  # financingStatus truth
        "0",  # flexPercent truth (no schedulable load)
        "0.20",  # internalScheduleConfidence truth
        # Misreport tokens (what Talon claims on-record — these are the
        # strings we want to see the utility detect as unverifiable)
        "option-signed",  # siteControlStatus misreport
        "LOI-from-tier-1-bank",  # financingStatus misreport
        "35",  # flexPercent misreport
        "35%",
        "0.78",  # internalScheduleConfidence misreport
    ],
    success_criteria=SuccessCriteria(
        min_opr_d_vs_b=None,  # this is the boundary-test scenario — D may tie or lose
        max_wls_d=0.0,
        notes=[
            "S5 is the pre-registered boundary test (§1.3, §9.3 F4). Two readings: "
            "(a) expected-within-scope (D ≤ B here) confirms thesis scoping; "
            "(b) stronger-than-expected (D > B here via H-spec.hallucination "
            "catching fabricated sourceRefs) promotes §5.2 falsification hooks.",
        ],
    ),
    complication=(
        "Utility must detect + de-prioritize the filing early; regulator must be "
        "able to see why the filing was de-prioritized (process integrity per FERC "
        "Order 2023 commercial-readiness screen). The tension: structured intake's "
        "bounded-query channel may surface misreport less than a multi-round email "
        "thread where inconsistencies accumulate. This is the pre-registered "
        "boundary of the schema-as-safety-case thesis."
    ),
)
