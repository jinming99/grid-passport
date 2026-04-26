"""Scenario-card types (sim-bench-design.md §7).

Each scenario locks 12 pre-registered fields (§7, enumerated). These
types give those fields a Pydantic home so that scenario authoring is
type-checked and scenario drift against the bench doc is visible at
load time.
"""

from __future__ import annotations

import re
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from eval_sim.schemas.caseinput import PrivateProfile, PublicEvidence, SiteContext
from eval_sim.schemas.priorauth import PriorAuthProfile
from eval_sim.schemas.role import Disposition

Domain = Literal["grid", "priorauth"]


class CITuple(BaseModel):
    """Nissenbaum 2004 Contextual-Integrity 5-tuple per private field (§7,
    §8c.iii). Pre-empts Bagdasaryan 2025 critique by never dropping
    parameters. `field_path` matches FieldPath from packages/core/src/types.ts.
    """

    field_path: str = Field(
        description=(
            "FieldPath string identifying the private field this tuple "
            "describes — e.g. 'private.workloadMix.trainingShare'. Kept as "
            "free-form string so scenarios can reference domain-specific "
            "paths (priorauth.patient.MRN) without re-declaring FieldPath."
        ),
    )
    sender: str
    recipient: str
    subject: str
    information_type: str
    transmission_principle: str = Field(
        description=(
            "The CI transmission principle governing this field — e.g. "
            "'internal-use-only', 'disclose-as-class-not-value', "
            "'Safe-Harbor-requires-removal-of-day-and-month-only-year-may-remain'. "
            "Trace-leakage classifier scores artifacts against this principle."
        ),
    )


FutureKind = Literal[
    "materializes",  # f_1 — filed plan realized as-is
    "fails",  # f_2 — project fails mid-construction (LBNL 77% base rate)
    "amends",  # f_3 — amendment request triggers re-study / policy-version linkage
    "exogenous",  # f_4 — neighboring cluster / audit event independent of filing
]


class FutureOutcomeScore(BaseModel):
    """Vector-valued outcome per dimension, per future. Each dimension is
    normalized to [0, 1] during scoring. See §8b sub-metrics table.
    """

    model_config = ConfigDict(extra="forbid")

    band_accuracy: float = Field(ge=0.0, le=1.0)
    firmness_preservation: float = Field(ge=0.0, le=1.0)
    flexibility_acceptance: float = Field(ge=0.0, le=1.0)
    blocker_recall: float = Field(ge=0.0, le=1.0)
    regulator_completeness: float = Field(ge=0.0, le=1.0)


class Future(BaseModel):
    """One realized-future variant in the pre-registered ensemble F_S (§7.7).
    The scoring function per future is specified as a named spec here; the
    concrete implementation lives in `eval_sim.scorers.robustness`.
    """

    id: str = Field(description="f_1 / f_2 / f_3 / f_4 etc.")
    kind: FutureKind
    description: str
    scoring_spec: dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Pre-registered inputs for the per-future scoring function. Keys "
            "are scoring-spec-specific — e.g. for f_2 (fails-mid-construction) "
            "we lock {'month_of_failure': 18, 'salvageable_capacity_mw': 0}. "
            "The scorer reads this dict; edits post-lock require amendment."
        ),
    )


class ExpertiseGap(BaseModel):
    """Contract-handler ↔ technical-expert paraphrase-loss parameter (§5a,
    realism-engineering contribution §1.5.2 #6). Loss rate is a parameter,
    not a measurement; sensitivity-tested at {0.5×, 2×} per §10.4.
    """

    archetype_note: str
    paraphrase_loss_rate: float = Field(
        ge=0.0,
        le=1.0,
        description="Per-archetype rate at which technical detail is lost in paraphrase.",
    )


class SuccessCriteria(BaseModel):
    """Per-scenario condition-specific success criteria — pre-registered (§7
    card point 11). Not the research-claim success criteria (those are in
    §9); these are scenario-local sanity criteria the runner asserts.
    """

    min_opr_d_vs_b: float | None = Field(
        default=None,
        description="Minimum expected OPR(D) − OPR(B) for this scenario (informative).",
    )
    max_wls_d: float | None = Field(
        default=None,
        description="Maximum expected WLS(D) — invariant: should be near zero for most scenarios.",
    )
    notes: list[str] = Field(default_factory=list)


class ScenarioCard(BaseModel):
    """A fully-locked scenario card. One instance per scenario S1–S7.

    The 12 required fields from §7 are:
      1. identity block (site + applicantOrg + requestedMW + targetCOD)
      2. privateProfile
      3. public_evidence_cache_path
      4. goals
      5. disposition
      6. expertise_gap
      7. ci_tuples (per private field)
      8. futures_ensemble (F_S, 3–4 per §7.7)
      9. oracle_ideal (narrative)
      10. private_token_set (direct-leakage scoring, §8c.i Tier-2)
      11. success_criteria
      12. complication (narrative)
    """

    model_config = ConfigDict(extra="forbid")

    # (1) identity
    scenario_id: str = Field(pattern=r"^S[0-9]+$")
    domain: Domain = Field(
        default="grid",
        description=(
            "Scenario domain. 'grid' is the interconnection workflow "
            "(applicant↔utility↔regulator); 'priorauth' is the HIPAA "
            "provider↔payer↔HIPAA-auditor replication (S7). Exactly one of "
            "{private_profile, priorauth_profile} must be populated, "
            "matching the domain."
        ),
    )
    applicant_org: str
    site: SiteContext
    requested_mw: float
    target_cod: str
    phases: int = Field(ge=1, default=1)

    # (2) private profile — domain-specific
    private_profile: PrivateProfile | None = Field(
        default=None,
        description="Grid-domain private profile. Required when domain='grid'.",
    )
    priorauth_profile: PriorAuthProfile | None = Field(
        default=None,
        description="HIPAA priorauth profile. Required when domain='priorauth'.",
    )

    @model_validator(mode="after")
    def _validate_domain_profile_consistency(self) -> ScenarioCard:
        if self.domain == "grid":
            if self.private_profile is None or self.priorauth_profile is not None:
                raise ValueError(
                    f"{self.scenario_id}: domain='grid' requires private_profile populated "
                    "and priorauth_profile=None."
                )
        elif self.domain == "priorauth":
            if self.priorauth_profile is None or self.private_profile is not None:
                raise ValueError(
                    f"{self.scenario_id}: domain='priorauth' requires priorauth_profile populated "
                    "and private_profile=None."
                )
        return self

    # (3) public evidence cache fixture path (relative to package root)
    public_evidence_cache_path: str = Field(
        description=(
            "Path to the committed Cartographer cache fixture, relative to "
            "`eval_sim/fixtures/cartographer-cache/`. D and A read this "
            "verbatim; C issues live SDK calls (§6e)."
        ),
    )
    public_evidence_expected: PublicEvidence | None = Field(
        default=None,
        description=(
            "Optional: the expected publicEvidence structure from the cache "
            "fixture for quick assertions. Not the source of truth; the JSON "
            "file at `public_evidence_cache_path` is."
        ),
    )

    # (4) goals
    goals: list[str] = Field(min_length=1)

    # (5) disposition
    disposition: Disposition

    # (6) expertise gap
    expertise_gap: ExpertiseGap

    # (7) CI 5-tuples per private field
    ci_tuples: list[CITuple] = Field(min_length=1)

    # (8) realized-future ensemble F_S
    futures_ensemble: list[Future] = Field(min_length=1)

    # (9) oracle-ideal outcome narrative
    oracle_ideal: str

    # (10) private-token set for direct-leakage scoring (§8c.i Tier-2)
    private_token_set: list[str] = Field(min_length=1)

    @field_validator("private_token_set")
    @classmethod
    def _validate_token_hygiene(cls, tokens: list[str]) -> list[str]:
        """Amendment A-4: reject tokens that would false-positive the
        Tier-2 substring match.

        Rules:
          - each token MUST be ≥ 2 characters after strip (catches
            degenerate single-char tokens)
          - a pure bare-digit token (`^\\d{1,2}$`) is rejected regardless
            of length — these substring-match inside longer numerics
            (e.g. "9" hits "95 MW", "20" hits "2028")

        Unit-bound numerics ("9%", "22%", "120 MW"), decimal floats
        ("0.55"), and spelled-out paraphrases ("twenty-two percent")
        pass: the non-digit suffix / decimal point creates a word
        boundary that prevents the ambiguous-neighbor false positive.
        """
        bad: list[str] = []
        for tok in tokens:
            stripped = tok.strip()
            if len(stripped) < 2:
                bad.append(tok)
                continue
            if re.fullmatch(r"\d{1,2}", stripped):
                bad.append(tok)
        if bad:
            raise ValueError(
                f"private_token_set contains ambiguous tokens that would "
                f"cause Tier-2 substring false positives: {bad!r}. "
                f"Per sim-bench-design.md Amendment A-4: tokens must be "
                f"≥ 2 chars and not pure bare 1-2-digit numbers. Use "
                f"canonical-unit forms ('9%', '22%', '0.55') or "
                f"spelled-out paraphrases ('nine percent') instead."
            )
        return tokens

    # (11) success criteria
    success_criteria: SuccessCriteria

    # (12) complication narrative
    complication: str
