"""Mirror of packages/core/src/types.ts CaseInput hierarchy.

Kept deliberately in lockstep with the TypeScript source and
apps/api/gridpassport/schemas.py. Drift between these three is a bug — the
privacy-canary (`pnpm privacy:canary`) enforces it at repo level for the TS
↔ Rego ↔ Python trio; this module is the fourth mirror used specifically
by the eval-sim to type scenario cards against the same shape the shipping
code produces.

If CaseInput fields change in TS, update this file in the same commit. The
test `tests/test_caseinput_mirror.py` checks the public field list matches
apps/api at load time so drift is caught fast.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

RiskClass = Literal["low", "medium", "high"]
ReadinessClass = Literal["red", "yellow", "green"]
FlexResponseClass = Literal["A", "B", "C"]
FieldClass = Literal["public", "private", "derived"]
RequestStatus = Literal["draft", "submitted", "reviewed", "approved"]


class SiteContext(BaseModel):
    state: str
    county: str
    parcelId: str
    displayName: str


class WorkloadMix(BaseModel):
    training: float = Field(ge=0.0, le=1.0)
    inference: float = Field(ge=0.0, le=1.0)


class PrivateProfile(BaseModel):
    flexPercent: float
    redundancyShiftPercent: float
    backupGenHours: float
    backupGenMW: float
    bessMW: float
    bessHours: float
    internalScheduleConfidence: float = Field(ge=0.0, le=1.0)
    workloadMix: WorkloadMix


class SourceRef(BaseModel):
    label: str
    url: str | None = None


class PublicEvidence(BaseModel):
    floodRisk: RiskClass
    permitRisk: RiskClass
    zoningRisk: RiskClass
    siteControlEvidence: bool
    sourceRefs: list[SourceRef] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class FlexibilityPassport(BaseModel):
    mwMin: float
    mwMax: float
    durationHoursMin: float
    durationHoursMax: float
    responseClass: FlexResponseClass


class DerivedProof(BaseModel):
    firmnessScore: float
    expectedPeakMW: tuple[float, float]
    flexibilityPassport: FlexibilityPassport
    siteReadinessClass: ReadinessClass
    energizationBand: str
    costExposureClass: RiskClass
    topBlockers: list[str]
    generatedFromPolicyVersion: str


class CaseInput(BaseModel):
    id: str
    caseId: str
    applicantOrg: str
    site: SiteContext
    requestedMW: float
    targetCOD: str
    phases: int
    status: RequestStatus
    privateProfile: PrivateProfile
    publicEvidence: PublicEvidence
    policyVersion: str


class RequestRecord(CaseInput):
    derivedProof: DerivedProof
