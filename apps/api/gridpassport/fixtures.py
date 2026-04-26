"""Python fixture registry — mirrors packages/core/src/fixtures/*.ts."""

from __future__ import annotations

from .schemas import CaseInput

_OWL_COMPUTE = {
    "id": "req_owl_compute_001",
    "caseId": "owl-compute",
    "applicantOrg": "Owl Compute",
    "site": {
        "state": "VA",
        "county": "Prince William",
        "parcelId": "demo-parcel-001",
        "displayName": "Owl Compute Campus — Prince William, VA",
    },
    "requestedMW": 180,
    "targetCOD": "2028-10-01",
    "phases": 2,
    "status": "submitted",
    "privateProfile": {
        "flexPercent": 22,
        "redundancyShiftPercent": 12,
        "backupGenHours": 6,
        "backupGenMW": 140,
        "bessMW": 11,
        "bessHours": 4,
        "internalScheduleConfidence": 0.68,
        "workloadMix": {"training": 0.55, "inference": 0.45},
    },
    "publicEvidence": {
        "floodRisk": "low",
        "permitRisk": "medium",
        "zoningRisk": "low",
        "siteControlEvidence": True,
        "sourceRefs": [],
        "notes": [],
    },
    "policyVersion": "grid-passport-policy@0.1.0",
}

_LANTERN_CLOUD = {
    **_OWL_COMPUTE,
    "id": "req_lantern_cloud_001",
    "caseId": "lantern-cloud",
    "applicantOrg": "Lantern Cloud",
    "site": {
        "state": "VA",
        "county": "Loudoun",
        "parcelId": "demo-parcel-002",
        "displayName": "Lantern Cloud Phase II — Loudoun, VA",
    },
    "requestedMW": 95,
    "targetCOD": "2028-04-01",
    "phases": 1,
    "privateProfile": {
        "flexPercent": 9,
        "redundancyShiftPercent": 4,
        "backupGenHours": 4,
        "backupGenMW": 72,
        "bessMW": 4,
        "bessHours": 2,
        "internalScheduleConfidence": 0.55,
        "workloadMix": {"training": 0.25, "inference": 0.75},
    },
    "publicEvidence": {
        "floodRisk": "medium",
        "permitRisk": "high",
        "zoningRisk": "medium",
        "siteControlEvidence": False,
        "sourceRefs": [],
        "notes": [],
    },
}

_KRAKEN_TRAIN = {
    **_OWL_COMPUTE,
    "id": "req_kraken_train_001",
    "caseId": "kraken-train",
    "applicantOrg": "Kraken Train",
    "site": {
        "state": "VA",
        "county": "Fauquier",
        "parcelId": "demo-parcel-003",
        "displayName": "Kraken Train AI Campus — Fauquier, VA",
    },
    "requestedMW": 240,
    "targetCOD": "2029-01-01",
    "phases": 3,
    "privateProfile": {
        "flexPercent": 34,
        "redundancyShiftPercent": 28,
        "backupGenHours": 8,
        "backupGenMW": 180,
        "bessMW": 36,
        "bessHours": 4,
        "internalScheduleConfidence": 0.81,
        "workloadMix": {"training": 0.78, "inference": 0.22},
    },
    "publicEvidence": {
        "floodRisk": "low",
        "permitRisk": "low",
        "zoningRisk": "low",
        "siteControlEvidence": True,
        "sourceRefs": [],
        "notes": [],
    },
}

_RAW = {
    "owl-compute": _OWL_COMPUTE,
    "lantern-cloud": _LANTERN_CLOUD,
    "kraken-train": _KRAKEN_TRAIN,
}


def get_case(case_id: str) -> CaseInput | None:
    raw = _RAW.get(case_id)
    return CaseInput(**raw) if raw else None


def list_cases() -> list[CaseInput]:
    return [CaseInput(**raw) for raw in _RAW.values()]
