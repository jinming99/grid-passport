"""Grid Passport FastAPI entrypoint.

Mirrors the Next.js route handlers in apps/web/app/api/*. The canonical
runtime today is the Next.js service; this Python service exists so that
Phase-2 Python-dependent agents (LangGraph, document parsing, LLM calls)
have a home without waiting on a rewrite.

Run locally:
    cd apps/api
    uv sync
    uv run uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from gridpassport import __version__
from gridpassport.fixtures import get_case, list_cases
from gridpassport.forecast import build_record
from gridpassport.policy import POLICY, POLICY_VERSION
from gridpassport.schemas import CaseInput, Role, ScenarioOverride

app = FastAPI(
    title="Grid Passport API",
    version=__version__,
    description="Confidential coordination workflow for large-load interconnection.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "policyVersion": POLICY_VERSION, "version": __version__}


@app.get("/v1/cases")
def cases_index() -> list[dict[str, Any]]:
    return [
        {
            "caseId": c.caseId,
            "applicantOrg": c.applicantOrg,
            "requestedMW": c.requestedMW,
            "county": c.site.county,
        }
        for c in list_cases()
    ]


@app.get("/v1/cases/{case_id}")
def case_detail(case_id: str) -> CaseInput:
    case = get_case(case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="unknown case")
    return case


@app.post("/v1/cases/{case_id}/scenario")
def scenario(case_id: str, override: ScenarioOverride) -> dict[str, Any]:
    case = get_case(case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="unknown case")
    if override.flexPercent is not None:
        override.flexPercent = max(0.0, min(60.0, override.flexPercent))
    record = build_record(case, override)
    views = _project_all_roles(record)
    return {
        "caseId": case_id,
        "override": override.model_dump(exclude_none=True),
        "baselineFlexPercent": case.privateProfile.flexPercent,
        "views": views,
    }


def _project_all_roles(record: Any) -> dict[str, Any]:
    """Placeholder projection mirroring apps/web/lib/projection.ts.

    For Phase 1c scaffold, this returns the full record for applicant and
    a filtered dict for utility/regulator. A full port of projection.ts
    lands alongside the first real Python agent in Phase 2.
    """
    roles: list[Role] = ["applicant", "utility", "regulator"]
    payload = record.model_dump()
    views: dict[str, Any] = {}
    for role in roles:
        allowed: dict[str, Any] = {}
        for path, entry in POLICY.items():
            section, _, key = path.partition(".")
            if role not in entry.visible_to:
                continue
            container_map = {
                "request": payload,
                "private": payload.get("privateProfile"),
                "public": payload.get("publicEvidence"),
                "derived": payload.get("derivedProof"),
            }
            container = container_map.get(section)
            if container is None:
                continue
            if key in container:
                allowed.setdefault(section, {})[key] = container[key]
            elif section == "request" and key in payload:
                allowed.setdefault(section, {})[key] = payload[key]
        views[role] = allowed
    return views
