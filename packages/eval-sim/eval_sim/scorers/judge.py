"""Opus-as-judge orchestration — sim-bench-design.md §5d + §8e.

Prometheus-style ABSOLUTE_PROMPT_WO_REF template lifted verbatim per §2;
turn-tagged multi-agent transcript extension per §1.5.1 #2 novel
contribution; JudgeLM-style swap augmentation (two independent runs with
shuffled batch position) per Zheng et al. MT-Bench.

**Locked prompt bytes.** The Prometheus template + our turn-tagged
extension are module-level constants. Edits post-§17-lock require an
amendment per §3.2; `test_judge.py` regression-fences the exact bytes.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import TYPE_CHECKING

from eval_sim.config import JUDGE_DISAGREEMENT_THRESHOLD
from eval_sim.schemas.judge import Dimension, JudgeOutput, PerDimensionScore
from eval_sim.schemas.turn import TurnMessage

if TYPE_CHECKING:
    from anthropic import Anthropic


# ────────────────────────────────────────────────────────────────────────
# Locked judge prompt — Prometheus ABSOLUTE_PROMPT_WO_REF verbatim per §2,
# with turn-tagged transcript + multi-agent role extension per §5d + §1.5.1 #2.
# DO NOT MODIFY POST-§17-LOCK.
# ────────────────────────────────────────────────────────────────────────


JUDGE_PROMPT_TEMPLATE: str = """###Task Description:
You are evaluating a multi-agent simulation transcript of an electric-grid \
interconnection filing workflow. An applicant organization, a utility planning \
team, and (for parts of the record) a regulator staff reviewer interact over \
multiple turns. A score rubric with five dimensions is provided. You will NOT \
see which experimental condition produced this transcript — labels have been \
stripped and batch order randomized.

1. Write a detailed feedback per dimension that assesses the transcript \
strictly against the rubric anchors, not against general vibes.
2. Every rationale must cite at least one specific turn by ID (e.g., \
"per [T014] the applicant disclosed the workload-mix decomposition") — \
rationales without turn citations are malformed and will be re-requested.
3. After the feedback, write an integer score 1–5 per dimension, referring \
to the rubric anchors.
4. Output format is a single JSON object matching the schema below. Do not \
include any other opening, closing, or explanation.

###Transcript (multi-agent, turn-tagged):
{transcript_with_turn_ids}

###Score Rubric:
{five_dimension_rubric}

###Output schema (JSON):
{{
  "stakeholder_alignment":    {{"rationale": "...", "turn_citations": ["T003", "T017"], "score": 1}},
  "planning_defensibility":   {{"rationale": "...", "turn_citations": ["..."], "score": 1}},
  "privacy_integrity":        {{"rationale": "...", "turn_citations": ["..."], "score": 1}},
  "regulatory_auditability":  {{"rationale": "...", "turn_citations": ["..."], "score": 1}},
  "applicant_experience":     {{"rationale": "...", "turn_citations": ["..."], "score": 1}},
  "counterfactual": "What single change would most have altered the outcome? (one sentence, referencing a specific turn)"
}}
"""


# ────────────────────────────────────────────────────────────────────────
# Turn tagging — §5d "T{n:03d}" format with per-role prefix.
# ────────────────────────────────────────────────────────────────────────


def tag_transcript(turns: list[TurnMessage]) -> str:
    """Format a transcript for the judge per §5d turn-ID format:
    `[T{n:03d}][{role}] {content}` one line per turn. Turn IDs are
    monotonic within the run and zero-padded to 3 digits; the judge's
    rationales cite these IDs.
    """
    lines = []
    for turn in turns:
        role_label = turn.speaker.value
        lines.append(f"[{turn.turn_id}][{role_label}] {turn.content}")
    return "\n".join(lines)


# ────────────────────────────────────────────────────────────────────────
# Judge invocation with dry_run + parse logic
# ────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class JudgeInvocation:
    """One call to the Opus judge, pre-swap-augmentation."""

    transcript_formatted: str
    rubric_text: str
    batch_position: int  # 0-indexed position within the judge's batch (for swap aug)
    batch_id: str  # anonymized batch-run ID


def _dry_run_output() -> JudgeOutput:
    """Minimal valid JudgeOutput for pre-§17-lock tests; score-3 across
    the board with stub rationales. Each rationale cites T001 so the
    schema validator accepts it.
    """
    return JudgeOutput(
        stakeholder_alignment=PerDimensionScore(
            rationale="dry_run — no live judgment; returning neutral score for test path.",
            turn_citations=["T001"],
            score=3,
        ),
        planning_defensibility=PerDimensionScore(
            rationale="dry_run — no live judgment; returning neutral score for test path.",
            turn_citations=["T001"],
            score=3,
        ),
        privacy_integrity=PerDimensionScore(
            rationale="dry_run — no live judgment; returning neutral score for test path.",
            turn_citations=["T001"],
            score=3,
        ),
        regulatory_auditability=PerDimensionScore(
            rationale="dry_run — no live judgment; returning neutral score for test path.",
            turn_citations=["T001"],
            score=3,
        ),
        applicant_experience=PerDimensionScore(
            rationale="dry_run — no live judgment; returning neutral score for test path.",
            turn_citations=["T001"],
            score=3,
        ),
        counterfactual="dry_run — no live counterfactual.",
    )


def invoke_judge(
    *,
    invocation: JudgeInvocation,
    client: Anthropic | None = None,
    model: str = "claude-opus-4-7",
    dry_run: bool = True,
    max_retries: int = 2,
) -> JudgeOutput:
    """Call the Opus judge on one transcript.

    Pre-§17-lock default is dry_run=True; returns a stub score-3 JudgeOutput
    with T001 citations so the schema validator accepts it. Post-lock, the
    runner flips the flag and passes a live `Anthropic` client.

    Malformed-JSON retry per §5d: re-request the same transcript + prompt
    up to `max_retries` times; then flag for human review.
    """
    if dry_run or client is None:
        return _dry_run_output()

    prompt = JUDGE_PROMPT_TEMPLATE.format(
        transcript_with_turn_ids=invocation.transcript_formatted,
        five_dimension_rubric=invocation.rubric_text,
    )
    last_error: Exception | None = None
    for _ in range(max_retries + 1):
        try:
            response = client.messages.create(
                model=model,
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = "".join(getattr(block, "text", "") for block in response.content)
            return parse_judge_output(raw)
        except (ValueError, KeyError, json.JSONDecodeError) as err:
            last_error = err
            continue
    raise RuntimeError(
        f"judge failed to produce parseable JSON after {max_retries + 1} attempts: {last_error}"
    )


def parse_judge_output(raw: str) -> JudgeOutput:
    """Tolerant JSON extraction + Pydantic validation per §5d.

    Uses `r"\\{[\\s\\S]*\\}"` to extract the outermost JSON object even when
    the model emits markdown fences or preamble. Validates against the
    locked JudgeOutput schema; rationales without turn citations fail
    Pydantic validation (field `min_length=1` on `turn_citations`).
    """
    match = re.search(r"\{[\s\S]*\}", raw)
    if not match:
        raise ValueError(f"judge output has no JSON object: {raw[:120]!r}")
    payload = json.loads(match.group(0))
    return JudgeOutput.model_validate(payload)


# ────────────────────────────────────────────────────────────────────────
# Swap augmentation per Zheng et al. MT-Bench (§5d)
# ────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class SwapAugmentedResult:
    """Two judge runs on the same transcript with shuffled batch positions
    per §5d. Disagreement-flagging logic is per-dimension: any dimension
    where |run_1.score − run_2.score| > JUDGE_DISAGREEMENT_THRESHOLD gets
    flagged for human spot-check.
    """

    run_1: JudgeOutput
    run_2: JudgeOutput
    disagreed_dimensions: frozenset[Dimension]

    @property
    def requires_spot_check(self) -> bool:
        return len(self.disagreed_dimensions) > 0


def find_disagreements(
    run_1: JudgeOutput,
    run_2: JudgeOutput,
    threshold: int = JUDGE_DISAGREEMENT_THRESHOLD,
) -> frozenset[Dimension]:
    """Return the set of dimensions where the two judge runs differ by more
    than `threshold` Likert points per §5d disagreement protocol.
    """
    pairs: dict[Dimension, tuple[int, int]] = {
        Dimension.STAKEHOLDER_ALIGNMENT: (
            run_1.stakeholder_alignment.score,
            run_2.stakeholder_alignment.score,
        ),
        Dimension.PLANNING_DEFENSIBILITY: (
            run_1.planning_defensibility.score,
            run_2.planning_defensibility.score,
        ),
        Dimension.PRIVACY_INTEGRITY: (
            run_1.privacy_integrity.score,
            run_2.privacy_integrity.score,
        ),
        Dimension.REGULATORY_AUDITABILITY: (
            run_1.regulatory_auditability.score,
            run_2.regulatory_auditability.score,
        ),
        Dimension.APPLICANT_EXPERIENCE: (
            run_1.applicant_experience.score,
            run_2.applicant_experience.score,
        ),
    }
    return frozenset(dim for dim, (a, b) in pairs.items() if abs(a - b) > threshold)


def judge_with_swap(
    *,
    transcript_formatted: str,
    rubric_text: str,
    batch_id_1: str,
    batch_id_2: str,
    batch_position_1: int,
    batch_position_2: int,
    client: Anthropic | None = None,
    model: str = "claude-opus-4-7",
    dry_run: bool = True,
) -> SwapAugmentedResult:
    """Run the judge twice on the same transcript with different batch
    positions + anonymized IDs (Zheng et al. MT-Bench swap augmentation).
    Returns both outputs + the disagreement set.
    """
    inv_1 = JudgeInvocation(
        transcript_formatted=transcript_formatted,
        rubric_text=rubric_text,
        batch_position=batch_position_1,
        batch_id=batch_id_1,
    )
    inv_2 = JudgeInvocation(
        transcript_formatted=transcript_formatted,
        rubric_text=rubric_text,
        batch_position=batch_position_2,
        batch_id=batch_id_2,
    )
    out_1 = invoke_judge(invocation=inv_1, client=client, model=model, dry_run=dry_run)
    out_2 = invoke_judge(invocation=inv_2, client=client, model=model, dry_run=dry_run)
    return SwapAugmentedResult(
        run_1=out_1,
        run_2=out_2,
        disagreed_dimensions=find_disagreements(out_1, out_2),
    )
