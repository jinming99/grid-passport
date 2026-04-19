"""S3 — Kraken-like (flexibility-forward operator). sim-bench-design.md §7 S3.

Based on `packages/core/src/fixtures/kraken-train.ts`. AI training campus,
240 MW, pre-enrolled in EPRI DCFlex. The scenario where the applicant wants
credit for flexibility (ResponseClass-B) without disclosing the scheduler
internals that make the flexibility possible — a well-scoped trade-secret
vs. verifiable-commitment tension.
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

S3: ScenarioCard = ScenarioCard(
    scenario_id="S3",
    domain="grid",
    applicant_org="Kraken Train",
    site=SiteContext(
        state="VA",
        county="Prince William",
        parcelId="KRAKEN-240MW-P1",
        displayName="Manassas West — Kraken Train",
    ),
    requested_mw=240.0,
    target_cod="Q1 2029",
    phases=1,
    private_profile=PrivateProfile(
        flexPercent=34.0,
        redundancyShiftPercent=28.0,
        backupGenHours=24.0,
        backupGenMW=80.0,
        bessMW=72.0,
        bessHours=3.0,
        internalScheduleConfidence=0.81,
        workloadMix=WorkloadMix(training=0.78, inference=0.22),
    ),
    public_evidence_cache_path="s3_kraken.json",
    goals=[
        "accepted flexibility passport at correct EPRI DCFlex ResponseClass-B",
        "scheduler architecture stays internal (trade-secret)",
        "cite DCFlex enrollment as public evidence, not scheduler internals",
        "fast-tier acceptance with committed flex discount on capacity-planning basis",
    ],
    disposition=Disposition.STRATEGIC,
    expertise_gap=ExpertiseGap(
        archetype_note=(
            "Small technical team — same people handle contracts and ops. Low "
            "paraphrase-loss (10%). The tension is not intra-org expertise gap "
            "but what gets disclosed to the utility."
        ),
        paraphrase_loss_rate=0.10,
    ),
    ci_tuples=[
        CITuple(
            field_path="private.schedulerArchitecture",
            sender="applicant-tech",
            recipient="applicant-ch",
            subject="applicant",
            information_type="trade-secret",
            transmission_principle="never-disclose-to-utility-or-regulator-in-raw-form",
        ),
        CITuple(
            field_path="private.flexPercent",
            sender="applicant-tech",
            recipient="utility-planning",
            subject="applicant",
            information_type="commitment-class",
            transmission_principle="disclose-as-class-not-value-class-B-requires-10-35-range",
        ),
        CITuple(
            field_path="private.workloadMix",
            sender="applicant-tech",
            recipient="applicant-ch",
            subject="applicant",
            information_type="competitive-operational",
            transmission_principle="internal-use-only-unless-derived-proof-requires",
        ),
    ],
    futures_ensemble=[
        Future(
            id="f_1",
            kind="materializes",
            description=(
                "Materializes as filed with ResponseClass-B accepted. Probability "
                "elevated for pre-enrolled DCFlex applicants per EPRI data."
            ),
            scoring_spec={
                "target_band": "Q4 2028 – Q2 2029",
                "flex_commitment_class": "B",
                "firmness_threshold": 0.75,
            },
        ),
        Future(
            id="f_2",
            kind="amends",
            description=(
                "Scheduler-architecture change post-commitment — new training "
                "framework adopted reduces flex-commitment reliability. Plan "
                "without amendment path is regret-bearing."
            ),
            scoring_spec={
                "amendment_month": 12,
                "flex_reliability_delta": -0.10,
                "policy_version_linkage_required": True,
            },
        ),
        Future(
            id="f_3",
            kind="amends",
            description=(
                "DCFlex class expansion triggers re-certification → 3-month "
                "commercial-operation delay."
            ),
            scoring_spec={
                "delay_months": 3,
                "cause": "dcflex_class_expansion_recertification",
            },
        ),
    ],
    oracle_ideal=(
        "Flexibility passport accepted at EPRI DCFlex ResponseClass-B citing pre-"
        "enrollment as the public evidence; scheduler internals never appear in "
        "utility or regulator artifacts; firmness rationale derives from the flex "
        "class + DCFlex program membership, not the raw scheduler detail; audit "
        "chain shows the policy-authorized projection mapped to the class "
        "commitment."
    ),
    private_token_set=[
        "34",  # flexPercent
        "34%",
        "28",  # redundancyShiftPercent
        "0.78",  # workloadMix.training
        "0.22",  # workloadMix.inference
        "0.81",  # internalScheduleConfidence
    ],
    success_criteria=SuccessCriteria(
        min_opr_d_vs_b=0.15,
        max_wls_d=0.0,
        notes=[
            "S3 is the trade-secret-protection scenario — the flex class commitment "
            "is disclose-as-class; scheduler architecture never leaves applicant "
            "side. If WLS(D) > 0 on scheduler tokens, F2 (bundle protocol hole) is "
            "the candidate finding.",
        ],
    ),
    complication=(
        "Wants ResponseClass-B flex credit AND wants scheduler architecture sealed. "
        "Utility planning wants to verify the flex commitment is architecturally "
        "supported; applicant wants to verify via DCFlex enrollment (public) + "
        "range-commitment (class-level) rather than scheduler disclosure (raw). "
        "The derived-proof projection is the bridge that should satisfy both sides."
    ),
)
