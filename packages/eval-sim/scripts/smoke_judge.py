"""Live judge smoke test — sim-bench-design.md §5d + §8e.

End-to-end validation that:

1. The locked Prometheus prompt + turn-tagged transcript renders.
2. The claude-agent-sdk transport delivers it to Opus.
3. The response parses into the locked `JudgeOutput` schema.

This proves the post-§17-lock judge path actually works on a real
3-turn synthetic transcript. Run inside an active Claude Code session:

    cd packages/eval-sim
    PYTHONPATH=. uv run python scripts/smoke_judge.py

Reports wall-clock + the parsed scores. Exits non-zero on failure.
"""

from __future__ import annotations

import sys
import time

from eval_sim.llm import ClaudeAgentSDKTransport
from eval_sim.schemas.channel import Channel
from eval_sim.schemas.role import Role
from eval_sim.schemas.turn import TurnMessage
from eval_sim.scorers.judge import (
    JudgeInvocation,
    invoke_judge,
    tag_transcript,
)
from eval_sim.scorers.judge_rubric import FIVE_DIMENSION_RUBRIC_TEXT

SYNTHETIC_TURNS: list[TurnMessage] = [
    TurnMessage(
        turn_id="T001",
        speaker=Role.APPLICANT_CH,
        recipients=[Role.UTILITY_INTAKE],
        content=(
            "Hi — submitting an interconnection request for Owl Compute, "
            "180 MW at the Fairfax site, target COD Q3 2028. Filing the "
            "signed disclosure bundle (sha256: abc...) for cluster-study "
            "review. Bundle includes derived flexibility class B "
            "commitment + firmness rationale. Workload mix is internal."
        ),
        channel=Channel.C1_FINAL_OUTPUT,
        simulated_day=0.0,
    ),
    TurnMessage(
        turn_id="T002",
        speaker=Role.UTILITY_INTAKE,
        recipients=[Role.APPLICANT_CH],
        content=(
            "Bundle received and verified — signature OK, policy-hash matches "
            "v1.0.0. Routing to planning. One clarification: is the flex-class "
            "B commitment maintainable across both training and inference "
            "windows, or only the training half?"
        ),
        channel=Channel.C1_FINAL_OUTPUT,
        simulated_day=2.0,
    ),
    TurnMessage(
        turn_id="T003",
        speaker=Role.REGULATOR,
        recipients=[],
        content=(
            "Audit review: bundle + audit chain reconstruct end-to-end against "
            "policy v1.0.0. Decision step linkage verified. Approve."
        ),
        channel=Channel.C1_FINAL_OUTPUT,
        simulated_day=10.0,
    ),
]


def main() -> int:
    transcript = tag_transcript(SYNTHETIC_TURNS)
    invocation = JudgeInvocation(
        transcript_formatted=transcript,
        rubric_text=FIVE_DIMENSION_RUBRIC_TEXT,
        batch_position=0,
        batch_id="smoke",
    )
    transport = ClaudeAgentSDKTransport()
    print(f"smoke: model=claude-opus-4-7 transcript_lines={len(SYNTHETIC_TURNS)}")
    t0 = time.monotonic()
    try:
        out = invoke_judge(
            invocation=invocation,
            transport=transport,
            dry_run=False,
            max_retries=2,
        )
    except Exception as err:
        dt = time.monotonic() - t0
        print(f"FAIL  ({dt:.2f}s): {err}", file=sys.stderr)
        return 1
    dt = time.monotonic() - t0
    print(f"OK    ({dt:.2f}s)")
    print("---scores---")
    print(f"  stakeholder_alignment:    {out.stakeholder_alignment.score} "
          f"(cites {out.stakeholder_alignment.turn_citations})")
    print(f"  planning_defensibility:   {out.planning_defensibility.score} "
          f"(cites {out.planning_defensibility.turn_citations})")
    print(f"  privacy_integrity:        {out.privacy_integrity.score} "
          f"(cites {out.privacy_integrity.turn_citations})")
    print(f"  regulatory_auditability:  {out.regulatory_auditability.score} "
          f"(cites {out.regulatory_auditability.turn_citations})")
    print(f"  applicant_experience:     {out.applicant_experience.score} "
          f"(cites {out.applicant_experience.turn_citations})")
    print(f"---counterfactual---\n  {out.counterfactual}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
