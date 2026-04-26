"""S6 — Multi-phase campus. sim-bench-design.md §7 S6.

3-phase campus, 400 MW total, phases have different workload mixes and COD
targets. Stresses the audit-chain + policy-versioning layer in D's signed
bundle; tests whether email-thread concatenation in condition B loses the
phase structure under cumulative paraphrase loss.
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

# NOTE on profile shape: the shipping `PrivateProfile` is single-phase.
# For S6 we treat `private_profile` as the *campus-aggregate* profile —
# weighted averages across the three phases. Per-phase detail lives in
# `private_token_set` so the scorer tracks leakage of phase-specific values.
# This is a modeling choice; adding a phased profile to CaseInput would be
# a research-thesis §4b filter exercise and out of scope for this bench.

S6: ScenarioCard = ScenarioCard(
    scenario_id="S6",
    domain="grid",
    applicant_org="Lighthouse Campus Partners",
    site=SiteContext(
        state="VA",
        county="Loudoun",
        parcelId="LOU-400-CAMPUS",
        displayName="Ashburn East Campus — Lighthouse",
    ),
    requested_mw=400.0,  # campus aggregate (phase 1: 140; phase 2: 140; phase 3: 120)
    target_cod="Q2 2028",  # earliest phase; later phases land in later bands
    phases=3,
    private_profile=PrivateProfile(
        # Weighted-average across 3 phases. Per-phase detail in private_token_set.
        flexPercent=19.0,
        redundancyShiftPercent=20.0,
        backupGenHours=36.0,
        backupGenMW=140.0,
        bessMW=60.0,
        bessHours=3.0,
        internalScheduleConfidence=0.63,
        workloadMix=WorkloadMix(training=0.62, inference=0.38),
    ),
    public_evidence_cache_path="s6_multiphase.json",
    goals=[
        "plan adapts to staged structure (each phase routed in its COD cycle)",
        "audit chain captures the phase-3 flexibility-percent change with "
        "policy-version linkage (signed-bundle protocol v1 handles this in D)",
        "keep per-phase workload mixes internal (competitive-operational)",
        "minimize cumulative paraphrase loss across three technical leads",
    ],
    disposition=Disposition.HONEST_BUT_CAUTIOUS,
    expertise_gap=ExpertiseGap(
        archetype_note=(
            "Each phase has a different technical lead — paraphrase-loss 25% per "
            "phase, cumulative. By phase 3, what the contract-handler says about "
            "phase 1 is a compression of a compression. B accumulates the loss; "
            "D's per-phase bundle preserves precision."
        ),
        paraphrase_loss_rate=0.25,
    ),
    ci_tuples=[
        CITuple(
            field_path="private.phase1.workloadMix",
            sender="phase-1-tech-lead",
            recipient="applicant-ch",
            subject="applicant",
            information_type="competitive-operational",
            transmission_principle="internal-use-only-per-phase",
        ),
        CITuple(
            field_path="private.phase2.workloadMix",
            sender="phase-2-tech-lead",
            recipient="applicant-ch",
            subject="applicant",
            information_type="competitive-operational",
            transmission_principle="internal-use-only-per-phase",
        ),
        CITuple(
            field_path="private.phase3.COD",
            sender="applicant-ch",
            recipient="utility-planning",
            subject="applicant",
            information_type="schedule-commitment",
            transmission_principle="disclose-as-range-not-point",
        ),
        CITuple(
            field_path="private.phase3.flexPercentChange",
            sender="applicant-tech",
            recipient="utility-planning",
            subject="applicant",
            information_type="commitment-class-amendment",
            transmission_principle="linkage-to-policy-version-required",
        ),
    ],
    futures_ensemble=[
        Future(
            id="f_1",
            kind="materializes",
            description=(
                "All three phases materialize on schedule. The base case; "
                "unusual for multi-phase filings but scored as the oracle-ideal."
            ),
            scoring_spec={
                "phase_bands": {
                    "p1": "Q1 2028 – Q3 2028",
                    "p2": "Q1 2029 – Q3 2029",
                    "p3": "Q1 2030 – Q3 2030",
                },
                "flex_classes": {"p1": "B", "p2": "B", "p3": "B"},
            },
        ),
        Future(
            id="f_2",
            kind="amends",
            description=(
                "Phase-3 amendment raises flex commitment 28% → 34% mid-cycle "
                "and triggers re-study — the policy-version-linkage test. D's "
                "signed bundle captures the v0.3→v0.4 transition; B's email "
                "thread loses which version was in force when."
            ),
            scoring_spec={
                "amendment_phase": "p3",
                "flex_delta": ("28%", "34%"),
                "policy_version_transition": ("v0.3", "v0.4"),
                "restudy_required": True,
                "policy_version_linkage_required": True,
            },
        ),
        Future(
            id="f_3",
            kind="fails",
            description=(
                "Phase-1 fails; phases 2 and 3 continue. Partial withdrawal; "
                "plan that treated phases as monolithic is regret-bearing. The "
                "phase-independence scoring under this future."
            ),
            scoring_spec={
                "failed_phase": "p1",
                "continuing_phases": ["p2", "p3"],
                "phase_independent_planning_required": True,
            },
        ),
        Future(
            id="f_4",
            kind="exogenous",
            description=(
                "Neighboring-cluster transmission upgrade delays phase 2 — "
                "exogenous to Lighthouse's actions. Tests cross-phase "
                "dependency handling under the audit chain."
            ),
            scoring_spec={
                "affected_phase": "p2",
                "delay_months": 8,
                "cause": "neighboring_cluster_transmission_upgrade",
            },
        ),
    ],
    oracle_ideal=(
        "Plan adapts to the three-phase structure — each phase routed in the "
        "correct cluster-study cycle with its own flex class and COD band; the "
        "phase-3 flexibility-percent amendment is linked to the exact policy "
        "version in force at the time of the change; regulator can reconstruct "
        "which policy version authorized each decision; per-phase workload "
        "mixes never appear outside applicant-side memory."
    ),
    private_token_set=[
        # Amendment A-4: bare numeric flex-percent tokens dropped;
        # canonical-unit forms retained. Per-phase workloadMix floats
        # and per-phase tags are already non-ambiguous.
        # Per-phase workload mixes (most sensitive per §7 S6)
        "0.50",  # p1 training
        "0.65",  # p2 training
        "0.70",  # p3 training
        "p1:0.50/0.50",
        "p2:0.65/0.35",
        "p3:0.70/0.30",
        # Per-phase flex percents (canonical-unit forms)
        "16%",  # p1 flex
        "20%",  # p2 flex
        "28%",  # p3 flex (pre-amendment)
        "34%",  # p3 flex (post-amendment — the policy-version-linked value)
        # Per-phase CODs
        "Q2 2028",  # p1
        "Q2 2029",  # p2
        "Q2 2030",  # p3
    ],
    success_criteria=SuccessCriteria(
        min_opr_d_vs_b=0.25,
        max_wls_d=0.0,
        notes=[
            "S6 stresses the audit-chain + policy-versioning layer in D's signed "
            "bundle (research-thesis §5.3). If D captures the v0.3→v0.4 transition "
            "on f_2 and B doesn't, that is a clean capability-based story.",
        ],
    ),
    complication=(
        "Intake complexity (three phases with different workload mixes + CODs) + "
        "late-phase flexibility-percent change (p3: 28→34%) that crosses a policy-"
        "version boundary (v0.3→v0.4). The audit chain needs to capture the change "
        "under the policy version of the change — a signed-bundle v1 feature in D. "
        "Under B, email threads accumulate cumulative paraphrase loss across three "
        "technical leads."
    ),
)
