"""S2 — Lantern-like (applicant in genuine trouble). sim-bench-design.md §7 S2.

Based on `packages/core/src/fixtures/lantern-cloud.ts`. Mid-size tenant in
Loudoun with real permit + site-control issues — the scenario where an
honest yellow-tier triage is load-bearing vs. a false-green that breaks
later.
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

S2: ScenarioCard = ScenarioCard(
    scenario_id="S2",
    domain="grid",
    applicant_org="Lantern Cloud",
    site=SiteContext(
        state="VA",
        county="Loudoun",
        parcelId="LANTERN-95MW-P1",
        displayName="Leesburg South — Lantern Cloud",
    ),
    requested_mw=95.0,
    target_cod="Q2 2028",
    phases=1,
    private_profile=PrivateProfile(
        flexPercent=9.0,
        redundancyShiftPercent=14.0,
        backupGenHours=24.0,
        backupGenMW=60.0,
        bessMW=20.0,
        bessHours=4.0,
        internalScheduleConfidence=0.55,
        workloadMix=WorkloadMix(training=0.25, inference=0.75),
    ),
    public_evidence_cache_path="s2_lantern.json",
    goals=[
        "honest yellow-tier routing with documented remediation path",
        "surface 500-year flood overlay before the planning lead discovers it",
        "avoid false-green that would break under later audit",
        "keep redundancy + BESS architecture as competitive-operational (not disclosed raw)",
    ],
    disposition=Disposition.HONEST_BUT_CAUTIOUS,
    expertise_gap=ExpertiseGap(
        archetype_note=(
            "Mid-size tenant; legal + technical teams exist but don't always sync. "
            "Contract-handler unaware of the 500-year flood overlay; technical team "
            "aware but hasn't flagged it in the filing packet yet. First filing at "
            "this MW class for the org."
        ),
        paraphrase_loss_rate=0.40,
    ),
    ci_tuples=[
        CITuple(
            field_path="public.floodRisk.500yr",
            sender="applicant-tech",
            recipient="applicant-ch",
            subject="site",
            information_type="environmental-risk-known-internally",
            transmission_principle=(
                "must-disclose-in-derived-proof-but-not-as-competitive-intelligence"
            ),
        ),
        CITuple(
            field_path="public.siteControlEvidence",
            sender="applicant-tech",
            recipient="utility-intake",
            subject="applicant",
            information_type="commercial-readiness",
            transmission_principle="FERC-Order-2023-mandates-disclosure-at-cluster-study-entry",
        ),
        CITuple(
            field_path="private.internalScheduleConfidence",
            sender="applicant-tech",
            recipient="utility-planning",
            subject="applicant",
            information_type="forecast-self-report",
            transmission_principle="disclose-in-derived-proof-only-not-raw",
        ),
    ],
    futures_ensemble=[
        Future(
            id="f_1",
            kind="materializes",
            description=(
                "Materializes as filed. Requires honest yellow-tier routing with "
                "documented remediation path; ~9% conditional probability given a "
                "yellow routing, much lower without."
            ),
            scoring_spec={
                "target_band": "Q1 2028 – Q3 2028",
                "flex_commitment_class": "C",
                "remediation_path_required": True,
            },
        ),
        Future(
            id="f_2",
            kind="fails",
            description=(
                "Flood-grading remediation fails Tier-2 permit review → project "
                "withdraws. LBNL Queued Up 2025 77% withdrawal base rate; for "
                "this scenario the rate is at or above the base given the flood overlay."
            ),
            scoring_spec={
                "failure_month": 9,
                "failure_cause": "tier2_permit_flood_grading",
                "salvageable_capacity_mw": 0,
            },
        ),
        Future(
            id="f_3",
            kind="amends",
            description=(
                "Site-control recordation delayed 9 months → amendment with revised "
                "COD. Plan that didn't budget for amendment path incurs regret."
            ),
            scoring_spec={
                "amendment_month": 9,
                "new_cod": "Q4 2028",
                "policy_version_linkage_required": True,
            },
        ),
        Future(
            id="f_4",
            kind="exogenous",
            description=(
                "Adjacent Loudoun queue cluster's transmission upgrade delayed → "
                "exogenous regret event — the filing's energization band shifts "
                "regardless of Lantern's actions."
            ),
            scoring_spec={
                "delay_months": 6,
                "cause": "neighboring_cluster_transmission_upgrade",
            },
        ),
    ],
    oracle_ideal=(
        "Honest yellow-tier classification under FERC Order 2023 commercial-readiness "
        "screen; specific remediation list including flood-grading strategy, Tier-2 "
        "permit timeline, site-control recordation; energization band Q1 2028–Q3 2028 "
        "with amendment-path allowance; regulator can reconstruct why yellow (not green) "
        "was the defensible call."
    ),
    private_token_set=[
        "9",  # flex %
        "9%",
        "0.55",  # internalScheduleConfidence
        "0.25",  # workloadMix.training
        "0.75",  # workloadMix.inference
        "4",  # bessHours
        "20",  # bessMW
    ],
    success_criteria=SuccessCriteria(
        min_opr_d_vs_b=0.25,
        max_wls_d=0.0,
        notes=[
            "S2 is the scenario where honest-but-cautious applicant is saved by "
            "structured intake. If D doesn't beat B here, the first-time-filer "
            "welfare-distribution argument (R2 in §9.4) is weaker.",
        ],
    ),
    complication=(
        "Real upstream blockers: 500-year flood overlay discovered late, site-control "
        "still via option not recorded. Applicant needs honest yellow triage + a "
        "remediation path, not a false-green that collapses under Tier-2 permit "
        "scrutiny. Structured intake should surface the flood finding before the "
        "utility asks."
    ),
)
