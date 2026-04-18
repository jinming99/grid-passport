"""Deterministic forecaster — mirrors apps/web/lib/forecast.ts."""

from __future__ import annotations

from datetime import datetime

from .policy import POLICY_VERSION
from .schemas import (
    CaseInput,
    DerivedProof,
    FlexibilityPassport,
    FlexResponseClass,
    PrivateProfile,
    PublicEvidence,
    ReadinessClass,
    RequestRecord,
    RiskClass,
    ScenarioOverride,
)

_RISK_PENALTY: dict[RiskClass, int] = {"low": 0, "medium": 8, "high": 18}
_FLOOD_PENALTY: dict[RiskClass, int] = {"low": 0, "medium": 3, "high": 12}


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _firmness_score(p: PrivateProfile, e: PublicEvidence, requested_mw: float) -> int:
    site_bonus = 10 if e.siteControlEvidence else 0
    bess_share = _clamp((p.bessMW / requested_mw) * 50, 0, 10)
    redundancy = _clamp(p.redundancyShiftPercent * 0.4, 0, 10)
    confidence = p.internalScheduleConfidence * 35
    permit_penalty = _RISK_PENALTY[e.permitRisk]
    flood_penalty = _FLOOD_PENALTY[e.floodRisk]
    raw = 25 + confidence + redundancy + bess_share + site_bonus - permit_penalty - flood_penalty
    return int(round(_clamp(raw, 0, 100)))


def _expected_peak(p: PrivateProfile, requested_mw: float) -> tuple[int, int]:
    low = 0.55 + p.internalScheduleConfidence * 0.12
    high = 0.72 + p.internalScheduleConfidence * 0.10
    return (int(round(requested_mw * low)), int(round(requested_mw * high)))


def _response_class(flex_percent: float) -> FlexResponseClass:
    if flex_percent >= 20:
        return "B"
    return "C"


def _flex_passport(p: PrivateProfile, requested_mw: float) -> FlexibilityPassport:
    flex_mw = requested_mw * (p.flexPercent / 100)
    return FlexibilityPassport(
        mwMin=round(flex_mw * 0.82),
        mwMax=round(flex_mw * 1.12),
        durationHoursMin=max(2, p.bessHours - 1),
        durationHoursMax=max(2, p.bessHours),
        responseClass=_response_class(p.flexPercent),
    )


def _site_readiness(e: PublicEvidence) -> ReadinessClass:
    if not e.siteControlEvidence or e.permitRisk == "high" or e.zoningRisk == "high":
        return "red"
    if e.permitRisk == "medium" or e.floodRisk == "medium" or e.zoningRisk == "medium":
        return "yellow"
    return "green"


def _energization_band(req: CaseInput, readiness: ReadinessClass, flex_percent: float) -> str:
    cod = datetime.fromisoformat(req.targetCOD)
    base_year = cod.year
    base_quarter = (cod.month - 1) // 3 + 1
    flex_shift = -1 if flex_percent >= 20 else (0 if flex_percent >= 10 else 1)
    spread = {"green": 1, "yellow": 2, "red": 4}[readiness]
    start_abs = base_quarter + flex_shift
    end_abs = start_abs + spread

    def fmt(abs_q: int) -> str:
        y = base_year + (abs_q - 1) // 4
        q = ((abs_q - 1) % 4 + 4) % 4 + 1
        return f"Q{q} {y}"

    return f"{fmt(start_abs)} – {fmt(end_abs)}"


def _cost_exposure(firmness: int, permit_risk: RiskClass) -> RiskClass:
    adjusted = firmness - (15 if permit_risk == "high" else 6 if permit_risk == "medium" else 0)
    if adjusted >= 70:
        return "low"
    if adjusted >= 45:
        return "medium"
    return "high"


def _top_blockers(req: CaseInput, readiness: ReadinessClass, firmness: int) -> list[str]:
    blockers: list[str] = []
    p, e = req.privateProfile, req.publicEvidence
    if e.permitRisk == "high":
        blockers.append("Air-permit review tier likely requires full modeling pass")
    elif e.permitRisk == "medium":
        blockers.append("Generator fleet permitting complexity")
    if not e.siteControlEvidence:
        blockers.append("Site control evidence not yet on file")
    if p.internalScheduleConfidence < 0.6:
        blockers.append("Applicant schedule confidence below planning threshold")
    if e.floodRisk != "low":
        label = "High" if e.floodRisk == "high" else "Moderate"
        blockers.append(f"{label} flood overlay on parcel envelope")
    if readiness == "yellow":
        blockers.append(
            "Site plan maturity below threshold for fast-track interconnection study"
        )
    if firmness < 50:
        blockers.append("Secondary transformer lead-time uncertainty")
    return blockers[:3]


def forecast(input_: CaseInput, override: ScenarioOverride | None = None) -> DerivedProof:
    effective = input_.model_copy(deep=True)
    if override and override.flexPercent is not None:
        effective.privateProfile.flexPercent = override.flexPercent
    p, e = effective.privateProfile, effective.publicEvidence
    firmness = _firmness_score(p, e, effective.requestedMW)
    readiness = _site_readiness(e)
    return DerivedProof(
        firmnessScore=firmness,
        expectedPeakMW=_expected_peak(p, effective.requestedMW),
        flexibilityPassport=_flex_passport(p, effective.requestedMW),
        siteReadinessClass=readiness,
        energizationBand=_energization_band(effective, readiness, p.flexPercent),
        costExposureClass=_cost_exposure(firmness, e.permitRisk),
        topBlockers=_top_blockers(effective, readiness, firmness),
        generatedFromPolicyVersion=POLICY_VERSION,
    )


def build_record(input_: CaseInput, override: ScenarioOverride | None = None) -> RequestRecord:
    effective = input_.model_copy(deep=True)
    if override and override.flexPercent is not None:
        effective.privateProfile.flexPercent = override.flexPercent
    proof = forecast(input_, override)
    return RequestRecord(**effective.model_dump(), derivedProof=proof)
