"""CandidatePlan extraction — sim-bench-design.md §8b unblocker.

Reads a ledger's post-run artifacts (and, for B, the email transcript)
and returns a typed `CandidatePlan` capturing the condition's filed plan
in the five §8b dimensions. The returned plan is what
`eval_sim.scorers.futures.score_plan_against_ensemble` consumes; the
ensemble scores are in turn what `eval_sim.scorers.robustness.compute_opr`
and `compute_savage_regret` consume.

**Deviation from `docs/evals/specs/candidate-plan-extraction.md`:** the
spec assumed bundle artifacts carried structured
`derivedProof.energizationBand` / `derivedProof.firmnessScore` objects.
The shipped ledgers instead persist bundles as free-form cover_note
strings (plus a `bundle_summary` dict with utility_decision /
regulator_verdict string fields). Deterministic regex over those strings
is brittle — e.g. "Class A/B/C" appears multiple times across narrative
text with conflicting meanings; firmness numbers appear as "ride-through
capable ≥ 0.75" or "firmness indicator: CREDIBLE" across scenarios.

Rather than chase regex fragility per condition, this module uses one
**locked Opus extraction prompt** for all conditions; only the *input
assembly* varies. Cost: one Opus call per ledger × ~$0.03 = ~$4 for the
full 140-cell main run, trivial vs the judge's per-run cost. Determinism
is preserved via Prometheus-style tolerant-JSON parse + Pydantic validation;
extraction failure flags `plan = None` for honest exclusion-rate reporting
(spec §Risk).

**Locked prompt bytes.** The extraction prompt below is a module-level
constant. Post-§17-lock edits require a §3.2 amendment.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from eval_sim.scorers.futures import CandidatePlan

if TYPE_CHECKING:
    from eval_sim.llm import Transport


# ────────────────────────────────────────────────────────────────────────
# Locked extraction prompt. DO NOT MODIFY POST-§17-LOCK.
# ────────────────────────────────────────────────────────────────────────


PLAN_EXTRACTION_PROMPT: str = """###Task Description:
You are extracting a typed "CandidatePlan" from post-run artifacts of a \
large-load interconnection filing simulation. You will see one or more \
text artifacts (decision letters, regulator verdicts, signed-bundle cover \
notes, or email threads). Your job is to emit a single JSON object \
describing the plan that was actually filed / accepted, in the seven \
fields specified below. Do not speculate about dimensions the artifacts \
do not evidence — use null / empty-list / false for fields with no \
evidence.

1. `energization_band` — the committed or negotiated quarter-range for \
commercial operation (COD) or energization. Format: "Q? YYYY – Q? YYYY" \
using the en-dash "–" between endpoints. If only a single quarter is \
committed (e.g. "COD Q4 2028"), render as "Q4 2028 – Q4 2028". Null if \
no band appears.
2. `firmness_score` — a 0.0–1.0 normalized indicator of how credible / \
firm the filing is judged to be. Prefer numeric sources ("firmness score \
0.72", "ride-through ≥ 0.75", "credibility index 0.80"). When the \
record gives only ordinal language, map: "not credible" → 0.2, \
"conditionally credible" → 0.5, "credible" → 0.75, "highly credible" \
→ 0.9. Null if no evidence.
3. `flexibility_class` — the committed flexibility tier: exactly one of \
"A", "B", "C", or null. Prefer explicit "committed flexibility class X" \
language; ignore passing mentions of "Class A/B/C" in policy-anchor \
narration. Null if the filing did not commit to a class.
4. `blockers_surfaced` — a list of short slugs naming upstream blockers \
the plan explicitly surfaced. Use the domain vocabulary: "flood", \
"site-control", "permit", "financing", "operating-experience", \
"committed-workload", "clinical-indication", "cpt-coding", \
"phi-redaction". Empty list if none surfaced.
5. `regulator_completeness` — integer 1–5 Likert reflecting how complete \
the filing looks from the regulator's audit perspective. Base this on \
regulator_verdict text where available; otherwise infer from the \
filing's documentation discipline. Null if no regulator material at all.
6. `policy_version_linked` — boolean. True if the filing cites a policy \
bundle version / hash (e.g. "gp-policy-v1", "policy bundle version hash", \
"OPA/Rego v0.1.0"). False otherwise.
7. `has_amendment_path` — boolean. True if the filing explicitly documents \
an amendment path, a bounded-query mechanism, or a re-study workflow \
(e.g. "amendment path documented", "bounded-query rounds permitted", \
"re-study budget reserved"). False otherwise.

Output format is a single JSON object matching the schema below. Do not \
include any other opening, closing, or explanation.

###Artifacts (condition={condition}, scenario={scenario_id}):
{artifacts_text}

###Output schema (JSON):
{{
  "energization_band": "Q4 2028 – Q2 2029" | null,
  "firmness_score": 0.0-1.0 | null,
  "flexibility_class": "A" | "B" | "C" | null,
  "blockers_surfaced": ["flood", "site-control"],
  "regulator_completeness": 1-5 | null,
  "policy_version_linked": true | false,
  "has_amendment_path": true | false
}}
"""


# ────────────────────────────────────────────────────────────────────────
# Extraction response schema (Pydantic) + conversion to CandidatePlan
# ────────────────────────────────────────────────────────────────────────


class PlanExtractionOutput(BaseModel):
    """Locked extraction response schema. Validates the JSON the Opus
    extractor emits before conversion to the frozen `CandidatePlan` dataclass.
    """

    model_config = ConfigDict(extra="forbid")

    energization_band: str | None = Field(default=None)
    firmness_score: float | None = Field(default=None, ge=0.0, le=1.0)
    flexibility_class: str | None = Field(default=None)
    blockers_surfaced: list[str] = Field(default_factory=list)
    regulator_completeness: float | None = Field(default=None, ge=1.0, le=5.0)
    policy_version_linked: bool = Field(default=False)
    has_amendment_path: bool = Field(default=False)

    @field_validator("flexibility_class")
    @classmethod
    def _normalize_flex_class(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip().upper()
        if s not in {"A", "B", "C"}:
            return None
        return s

    def to_candidate_plan(self) -> CandidatePlan:
        return CandidatePlan(
            energization_band=self.energization_band,
            firmness_score=self.firmness_score,
            flexibility_class=self.flexibility_class,
            blockers_surfaced=list(self.blockers_surfaced),
            regulator_completeness=self.regulator_completeness,
            policy_version_linked=self.policy_version_linked,
            has_amendment_path=self.has_amendment_path,
        )


# ────────────────────────────────────────────────────────────────────────
# Condition-specific input assembly
# ────────────────────────────────────────────────────────────────────────


def _artifact_strings_for(artifacts: dict[str, Any], condition: str) -> list[str]:
    """Pick the artifact text fields relevant to plan extraction for this
    condition. Different conditions persist the filed plan in different
    shapes; the extractor sees one concatenated text blob either way.

    Condition A (Oracle): `oracle_decision.{utility_decision,
    regulator_verdict, applicant_disclosure}` — the reference no-gap record.
    Conditions C, D (bundle-based): `bundle:disclosure-v1.0.0.json.cover_note`
    + `bundle_summary.{utility_decision, regulator_verdict}`.
    Condition B (NDA-email): `b_summary.{utility_decision, regulator_verdict}`
    plus the transcript itself (passed in separately to keep this helper pure).
    """
    out: list[str] = []
    od = artifacts.get("oracle_decision")
    if isinstance(od, dict):
        for k in ("applicant_disclosure", "utility_decision", "regulator_verdict"):
            v = od.get(k)
            if isinstance(v, str) and v.strip():
                out.append(f"### {k}\n{v}")

    bundle = artifacts.get("bundle:disclosure-v1.0.0.json")
    if isinstance(bundle, dict):
        cn = bundle.get("cover_note")
        if isinstance(cn, str) and cn.strip():
            out.append(f"### bundle.cover_note\n{cn}")
        for meta_key in ("policy_hash", "signed_by"):
            val = bundle.get(meta_key)
            if val:
                out.append(f"### bundle.{meta_key}\n{val}")

    for summary_key in ("bundle_summary", "d_summary", "b_summary"):
        sm = artifacts.get(summary_key)
        if not isinstance(sm, dict):
            continue
        for k in (
            "utility_decision",
            "regulator_verdict",
            "bounded_query_rounds",
            "cartographer_mode",
            "meeting_accepted",
            "meeting_held",
            "meeting_triggered",
            "unresolved_email_rounds",
        ):
            v = sm.get(k)
            if v is None:
                continue
            if isinstance(v, str) and v.strip():
                out.append(f"### {summary_key}.{k}\n{v}")
            elif isinstance(v, (int, bool, float)):
                out.append(f"### {summary_key}.{k}\n{v}")
    _ = condition  # reserved for future condition-specific weighting
    return out


def _assemble_extraction_input(
    *,
    artifacts: dict[str, Any],
    condition: str,
    transcript_text: str | None,
    max_chars: int = 60_000,
) -> str:
    """Build the artifact blob the Opus extractor sees.

    For condition B the email transcript is the primary evidence source
    (`b_summary` is thin); we prepend the transcript so the extractor
    can read the meeting / email record before the summary. For A/C/D
    the artifacts alone carry the filed plan.

    Truncates to `max_chars` from the tail of each source if needed —
    plan-relevant signal concentrates in the later turns / later
    artifacts (decision letters come after applicant disclosure).
    """
    parts: list[str] = []
    if condition == "B" and transcript_text:
        parts.append(f"### transcript\n{transcript_text}")
    parts.extend(_artifact_strings_for(artifacts, condition))
    blob = "\n\n".join(parts)
    if len(blob) <= max_chars:
        return blob
    # Tail-truncate per-part rather than the whole blob to preserve
    # structural markers. Keep last ~max_chars//n of each.
    per_part = max(500, max_chars // max(1, len(parts)))
    trimmed = []
    for p in parts:
        if len(p) <= per_part:
            trimmed.append(p)
        else:
            trimmed.append(p[:200] + "\n… [truncated] …\n" + p[-(per_part - 200):])
    return "\n\n".join(trimmed)


# ────────────────────────────────────────────────────────────────────────
# Main extract() call with dry_run + retry
# ────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class ExtractionResult:
    """Result of one extraction attempt. `plan=None` + `error` set when
    extraction failed — the robustness aggregator excludes these cells
    and reports the exclusion rate per §Risk in the spec.
    """

    plan: CandidatePlan | None
    raw_response: str
    error: str | None = None


def _dry_run_result() -> ExtractionResult:
    """Extraction in dry-run / no-transport mode. Returns an empty plan —
    all fields at their dataclass defaults (None / empty list / False).
    Downstream `score_plan_against_future` handles these gracefully.
    """
    return ExtractionResult(
        plan=CandidatePlan(),
        raw_response="dry_run — no live extraction; returning empty CandidatePlan.",
        error=None,
    )


def extract_plan(
    *,
    artifacts: dict[str, Any],
    condition: str,
    scenario_id: str,
    transcript_text: str | None = None,
    transport: Transport | None = None,
    model: str = "claude-opus-4-7",
    dry_run: bool = True,
    max_retries: int = 2,
) -> ExtractionResult:
    """Extract a CandidatePlan from one ledger's artifacts.

    Dry-run default returns an empty `CandidatePlan` so callers can exercise
    the scorer plumbing without LLM spend. Live path: one Opus call per
    ledger; malformed JSON retried up to `max_retries` times; then flagged.
    """
    if dry_run or transport is None:
        return _dry_run_result()

    artifacts_text = _assemble_extraction_input(
        artifacts=artifacts,
        condition=condition,
        transcript_text=transcript_text,
    )
    prompt = PLAN_EXTRACTION_PROMPT.format(
        condition=condition,
        scenario_id=scenario_id,
        artifacts_text=artifacts_text,
    )

    last_error: Exception | None = None
    raw = ""
    for _ in range(max_retries + 1):
        try:
            raw = transport.complete(model=model, user=prompt, max_tokens=1024)
            parsed = _parse_extraction(raw)
            return ExtractionResult(
                plan=parsed.to_candidate_plan(),
                raw_response=raw,
                error=None,
            )
        except (ValueError, KeyError, json.JSONDecodeError) as err:
            last_error = err
            continue
    return ExtractionResult(
        plan=None,
        raw_response=raw,
        error=f"extraction failed after {max_retries + 1} attempts: {last_error}",
    )


def _parse_extraction(raw: str) -> PlanExtractionOutput:
    """Tolerant JSON extraction + Pydantic validation, same pattern as the
    judge's `parse_judge_output`. The regex grabs the outermost `{...}`
    object even when the model emits markdown fences or preamble.
    """
    match = re.search(r"\{[\s\S]*\}", raw)
    if not match:
        raise ValueError(f"extraction output has no JSON object: {raw[:120]!r}")
    payload = json.loads(match.group(0))
    return PlanExtractionOutput.model_validate(payload)
