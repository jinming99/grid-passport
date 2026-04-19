"""HIPAA prior-authorization profile for S7 (sim-bench-design.md §7 S7).

Mirrors the shape of `packages/agents/priorauth-interviewer/` intake. Field
names preserve the camelCase drift-guard style used for the grid CaseInput
mirror. Safe Harbor 18 identifiers are carried as `str | None` so scenario
authors can populate only the load-bearing subset (per §7 S7 private-token
set: patient name, MRN, DOB, SSN-last-4, dates-of-service, referring-
provider NPI).
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class SafeHarborIdentifiers(BaseModel):
    """HHS Safe Harbor 18-identifier subset used in this bench.

    Not the full Safe Harbor list — only the identifiers S7 actually
    exercises. Adding a new identifier requires an amendment per §3.2.
    """

    patientName: str | None = None
    patientMRN: str | None = None
    patientDOB: str | None = None
    patientSSNLast4: str | None = None
    dateOfService: str | None = None
    referringProviderNPI: str | None = None


class PriorAuthClinical(BaseModel):
    """Clinical narrative + structured indication codes."""

    cptCodes: list[str] = Field(
        default_factory=list,
        description="Proposed CPT codes (e.g. 93458 + guide-catheter codes).",
    )
    icd10Codes: list[str] = Field(
        default_factory=list,
        description="Indication codes (e.g. I25.10 chronic ischemic heart disease).",
    )
    clinicalHistoryText: str = Field(
        description=(
            "Free-text clinical justification. Per §7 S7 this is the field "
            "whose CI transmission principle is 'disclose-as-structured-"
            "indication-codes-not-prose' — raw prose leaking into the payer "
            "artifact is a trace-leakage C7 violation."
        ),
    )


class PriorAuthProfile(BaseModel):
    """Domain-specific private profile for S7. Parallel to `PrivateProfile`
    for the grid scenarios; a scenario sets exactly one of the two based
    on `ScenarioCard.domain`.
    """

    payerName: str = Field(description="e.g. 'Aetna Medicare Advantage'")
    providerOrg: str = Field(description="e.g. 'Shenandoah Cardiology Associates'")
    procedureName: str = Field(
        description="Requested procedure — e.g. 'left-heart catheterization'",
    )
    safeHarbor: SafeHarborIdentifiers
    clinical: PriorAuthClinical
