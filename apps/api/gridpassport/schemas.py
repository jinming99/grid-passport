"""Pydantic schemas mirroring packages/core/src/types.ts.

Kept deliberately in lockstep with the TypeScript types so that the
Next.js route handler and the FastAPI handler return the same shape.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

RiskClass = Literal["low", "medium", "high"]
ReadinessClass = Literal["red", "yellow", "green"]
FlexResponseClass = Literal["A", "B", "C"]
Role = Literal["applicant", "utility", "regulator"]
FieldClass = Literal["public", "private", "derived"]
RequestStatus = Literal["draft", "submitted", "reviewed", "approved"]


class SiteContext(BaseModel):
    state: str
    county: str
    parcelId: str
    displayName: str


class WorkloadMix(BaseModel):
    training: float
    inference: float


class PrivateProfile(BaseModel):
    flexPercent: float
    redundancyShiftPercent: float
    backupGenHours: float
    backupGenMW: float
    bessMW: float
    bessHours: float
    internalScheduleConfidence: float
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
    firmnessScore: int
    expectedPeakMW: tuple[int, int]
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


class ScenarioOverride(BaseModel):
    flexPercent: float | None = None
