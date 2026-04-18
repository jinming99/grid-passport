"""Policy mirror — matches apps/web/lib/policy.ts and packages/policy/grid-passport.rego."""

from __future__ import annotations

from dataclasses import dataclass

from .schemas import FieldClass, Role

POLICY_VERSION = "grid-passport-policy@0.1.0"

_ALL: list[Role] = ["applicant", "utility", "regulator"]
_APPLICANT_ONLY: list[Role] = ["applicant"]


@dataclass(frozen=True)
class PolicyEntry:
    field_class: FieldClass
    visible_to: list[Role]
    label: str
    redaction_reason: str


POLICY: dict[str, PolicyEntry] = {
    "request.applicantOrg": PolicyEntry("public", _ALL, "Applicant", ""),
    "request.requestedMW": PolicyEntry("public", _ALL, "Requested capacity (MW)", ""),
    "request.targetCOD": PolicyEntry("public", _ALL, "Target COD", ""),
    "request.phases": PolicyEntry("public", _ALL, "Build phases", ""),
    "request.site": PolicyEntry("public", _ALL, "Site", ""),
    "private.flexPercent": PolicyEntry(
        "private",
        _APPLICANT_ONLY,
        "% deferrable workload",
        "Raw flex % is sealed. Utility sees the derived flexibility passport.",
    ),
    "private.redundancyShiftPercent": PolicyEntry(
        "private",
        _APPLICANT_ONLY,
        "% shiftable to redundant sites",
        "Raw redundancy ratio is sealed; feeds derived proofs only.",
    ),
    "private.backupGenHours": PolicyEntry(
        "private",
        _APPLICANT_ONLY,
        "Backup generation (hours)",
        "Backup detail feeds derived proofs only.",
    ),
    "private.backupGenMW": PolicyEntry(
        "private",
        _APPLICANT_ONLY,
        "Backup generation (MW)",
        "Backup detail feeds derived proofs only.",
    ),
    "private.bessMW": PolicyEntry(
        "private",
        _APPLICANT_ONLY,
        "BESS capacity (MW)",
        "BESS detail feeds derived proofs only.",
    ),
    "private.bessHours": PolicyEntry(
        "private",
        _APPLICANT_ONLY,
        "BESS duration (hours)",
        "BESS detail feeds derived proofs only.",
    ),
    "private.internalScheduleConfidence": PolicyEntry(
        "private",
        _APPLICANT_ONLY,
        "Internal schedule confidence",
        "Roadmap confidence stays sealed; utility receives a firmness score instead.",
    ),
    "private.workloadMix": PolicyEntry(
        "private",
        _APPLICANT_ONLY,
        "Workload mix",
        "Training/inference mix is sealed.",
    ),
    "public.floodRisk": PolicyEntry("public", _ALL, "Flood risk", ""),
    "public.permitRisk": PolicyEntry("public", _ALL, "Permit risk", ""),
    "public.zoningRisk": PolicyEntry("public", _ALL, "Zoning risk", ""),
    "public.siteControlEvidence": PolicyEntry("public", _ALL, "Site control evidence", ""),
    "public.sourceRefs": PolicyEntry("public", _ALL, "Sources", ""),
    "public.notes": PolicyEntry("public", _ALL, "Evidence notes", ""),
    "derived.firmnessScore": PolicyEntry("derived", _ALL, "Firmness score", ""),
    "derived.expectedPeakMW": PolicyEntry("derived", _ALL, "Expected peak band (MW)", ""),
    "derived.flexibilityPassport": PolicyEntry("derived", _ALL, "Flexibility passport", ""),
    "derived.siteReadinessClass": PolicyEntry("derived", _ALL, "Site readiness", ""),
    "derived.energizationBand": PolicyEntry(
        "derived", _ALL, "Earliest energization band", ""
    ),
    "derived.costExposureClass": PolicyEntry("derived", _ALL, "Cost exposure class", ""),
    "derived.topBlockers": PolicyEntry("derived", _ALL, "Top blockers", ""),
}


def is_visible(path: str, role: Role) -> bool:
    entry = POLICY.get(path)
    if entry is None:
        return False
    return role in entry.visible_to
