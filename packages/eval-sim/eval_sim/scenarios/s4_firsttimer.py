"""S4 — First-timer (new entrant, small team). sim-bench-design.md §7 S4.

55 MW new entrant, no in-house legal, first interconnection filing ever.
Founder is both contract-handler and technical expert; paraphrase-loss 50%.
The welfare-distribution scenario — does structure (C or D) help the people
who need help most, or just sophisticated actors?

**Concretized from the placeholder private-token set** (sim-bench-design.md §7
S4 TBD): values picked so overreporting confidence and underreporting
flexibility produce a measurable structured-intake delta vs. email rounds.
Concretization happens pre-§17 lock per the handoff Now block.
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

S4: ScenarioCard = ScenarioCard(
    scenario_id="S4",
    domain="grid",
    applicant_org="Harbor Light AI",
    site=SiteContext(
        state="VA",
        county="Prince William",
        parcelId="PW-007-4421",
        displayName="Quantico Ridge — Harbor Light AI",
    ),
    requested_mw=55.0,
    target_cod="Q3 2028",
    phases=1,
    private_profile=PrivateProfile(
        flexPercent=12.0,
        redundancyShiftPercent=8.0,
        backupGenHours=12.0,
        backupGenMW=20.0,
        bessMW=10.0,
        bessHours=2.0,
        internalScheduleConfidence=0.72,
        workloadMix=WorkloadMix(training=0.60, inference=0.40),
    ),
    public_evidence_cache_path="s4_firsttimer.json",
    goals=[
        "accurate filing despite not knowing how to ask for help",
        "right-sized utility scrutiny (not over-scrutinized as phantom, not under-scrutinized)",
        "clean audit trail for future filings this org will do",
        "surface overreported confidence before it locks into a commitment",
    ],
    disposition=Disposition.OVERWHELMED_NEW_FILER,
    expertise_gap=ExpertiseGap(
        archetype_note=(
            "Single founder/engineer wears both hats. No prior filings to reference. "
            "Memory is inconsistent across turns — may report 12% flex at T005, 18% "
            "at T019, and conflate operational / sensitive buckets in prose. "
            "Maximum paraphrase loss (50%) because there's no internal technical "
            "team to cross-check the contract-handler paraphrase."
        ),
        paraphrase_loss_rate=0.50,
    ),
    ci_tuples=[
        CITuple(
            field_path="private.internalScheduleConfidence",
            sender="applicant-tech",
            recipient="utility-planning",
            subject="applicant",
            information_type="forecast-self-report",
            transmission_principle="disclose-in-derived-proof-only-not-raw",
        ),
        CITuple(
            field_path="private.workloadMix",
            sender="applicant-tech",
            recipient="applicant-ch",
            subject="applicant",
            information_type="competitive-operational",
            transmission_principle="internal-use-only",
        ),
        CITuple(
            field_path="private.flexPercent",
            sender="applicant-tech",
            recipient="utility-planning",
            subject="applicant",
            information_type="commitment-class",
            transmission_principle="disclose-as-class-not-value",
        ),
    ],
    futures_ensemble=[
        Future(
            id="f_1",
            kind="materializes",
            description=(
                "Materializes as filed. Low base rate for first-timers — LBNL "
                "withdrawal rate correlates with sponsor experience."
            ),
            scoring_spec={
                "target_band": "Q2 2028 – Q4 2028",
                "flex_commitment_class": "C",
                "firmness_threshold": 0.55,
            },
        ),
        Future(
            id="f_2",
            kind="fails",
            description=(
                "Financing falls through mid-construction → withdraws. Elevated "
                "probability for first-timers without a track record; LBNL 2025 "
                "withdrawal rates are sponsor-experience-conditional."
            ),
            scoring_spec={
                "failure_month": 11,
                "failure_cause": "financing_lapse",
                "salvageable_capacity_mw": 0,
            },
        ),
        Future(
            id="f_3",
            kind="amends",
            description=(
                "Mid-filing amendment as founder discovers an overlooked detail "
                "(e.g., BESS sizing inadequate). Adds administrative burden + "
                "rework rounds; plan that built in an amendment path for first-"
                "timers incurs less regret."
            ),
            scoring_spec={
                "amendment_month": 5,
                "amendment_kind": "bess_resize",
                "rework_rounds": 2,
            },
        ),
    ],
    oracle_ideal=(
        "Accurate filing despite the applicant not knowing how to ask for help; "
        "right-sized utility scrutiny (yellow-leaning-green triage); audit trail "
        "sufficient for a future filing by the same org to reuse the filing "
        "shape; the overreported internalScheduleConfidence gets calibrated by "
        "the projection into a modest firmness band, not carried through as-is."
    ),
    private_token_set=[
        "12",  # flexPercent
        "12%",
        "0.72",  # internalScheduleConfidence (overconfident)
        "0.60",  # workloadMix.training
        "0.40",  # workloadMix.inference
        "PW-007-4421",  # unique parcelId — founder paste-risk
        "55",  # requestedMW — often appears on-record correctly, but the
        # underlying peak assumption is private
    ],
    success_criteria=SuccessCriteria(
        min_opr_d_vs_b=0.30,
        max_wls_d=0.0,
        notes=[
            "S4 tests R2 (welfare-distribution). Expectation: D's OPR/efficiency "
            "advantage over B is larger here than on S1 (hyperscaler). If this "
            "doesn't hold, R2 evidence trigger is not met and the welfare-"
            "distribution reframing doesn't land.",
        ],
    ),
    complication=(
        "Applicant inadvertently underreports flexibility (12% when the architecture "
        "could support 18%), overreports internal schedule confidence (0.72 when a "
        "calibrated read is 0.55 given their experience), and blurs operational / "
        "sensitive buckets in prose — calls the BESS sizing 'competitive' when it's "
        "actually operational. The test is whether structure surfaces these before "
        "they harden into commitments the filing cannot adjust away from."
    ),
)
