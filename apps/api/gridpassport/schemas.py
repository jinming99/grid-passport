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


class CustomerContact(BaseModel):
    name: str
    email: str
    phone: str | None = None


LoadType = Literal["data_center", "industrial", "manufacturing", "other"]


class WorkloadMix(BaseModel):
    training: float
    inference: float


RedundancyClass = Literal["TierI", "TierII", "TierIII", "TierIV"]
RepeatPattern = Literal["none", "daily", "weekly"]


class ForwardOperationalWindow(BaseModel):
    startUtc: str
    endUtc: str
    deltaMW: float
    ciPlusMinus: float
    confidence: float
    dailyDutyCycleHours: float
    repeats: RepeatPattern
    workloadType: str | None = None
    sourceDocHash: str | None = None


class FlexibilityEnvelope(BaseModel):
    maxShedMW: float
    maxShedDurationMin: float
    rampRateMW_per_min: float
    noticeRequiredMin: float
    callsPerWeek: float


class PlannedTestWindow(BaseModel):
    startUtc: str
    endUtc: str


class BackupGenProfile(BaseModel):
    transitionTimeSec: float
    capacityMW: float
    autoTriggerThresholdMW: float
    plannedTestWindows: list[PlannedTestWindow] = Field(default_factory=list)


class FailureModeProfile(BaseModel):
    redundancyClass: RedundancyClass
    P_dropGT100MW_24h: float
    P_dropGT500MW_24h: float


class PrivateProfile(BaseModel):
    flexPercent: float
    redundancyShiftPercent: float
    backupGenHours: float
    backupGenMW: float
    bessMW: float
    bessHours: float
    internalScheduleConfidence: float
    workloadMix: WorkloadMix
    # Layer-2 operational additions (optional for backward-compat).
    forwardOperationalWindows: list[ForwardOperationalWindow] = Field(default_factory=list)
    flexibilityEnvelope: FlexibilityEnvelope | None = None
    backupGenProfile: BackupGenProfile | None = None
    failureModeProfile: FailureModeProfile | None = None


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
    # Baseline-filing fields (ERCOT-precedent additions). All public class.
    customerContact: CustomerContact
    loadType: LoadType
    connectionVoltageKV: float
    netMetered: bool
    nettedGenerationStation: str | None = None


class RequestRecord(CaseInput):
    derivedProof: DerivedProof


class ScenarioOverride(BaseModel):
    flexPercent: float | None = None
