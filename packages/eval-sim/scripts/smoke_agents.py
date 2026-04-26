"""Live agent smoke test — sim-bench-design.md §5.

End-to-end validation that:

1. The Concordia EntityAgent assembles cleanly from the §5 builders.
2. `TransportLanguageModel` routes Concordia's `sample_text` through
   the claude-agent-sdk transport.
3. The §1.5.2 #6 `ParaphrasedPrivateProfile` component executes the
   live paraphrase barrier on the technical-expert profile and
   contributes the lossy paraphrase to the act prompt.
4. The Applicant produces a coherent opening message to the utility.

Run inside an active Claude Code session:

    cd packages/eval-sim
    PYTHONPATH=. uv run python scripts/smoke_agents.py

Reports wall-clock + a transcript snippet. Two live LLM calls expected:
one paraphrase barrier (Sonnet) + one applicant act (Sonnet).
"""

from __future__ import annotations

import sys
import time

from concordia.typing import entity

from eval_sim.agents.builders import build_applicant
from eval_sim.llm import ClaudeAgentSDKTransport
from eval_sim.scenarios import S1


def main() -> int:
    transport = ClaudeAgentSDKTransport()
    print(f"smoke: scenario={S1.scenario_id} model=claude-sonnet-4-6")
    t0 = time.monotonic()

    agent = build_applicant(
        scenario=S1,
        transport=transport,
        seed_index=0,
        dry_run=False,  # live paraphrase + live act
    )
    spec = entity.ActionSpec(
        call_to_action=(
            "Compose a brief opening message to Dominion Energy's intake "
            "engineer announcing the interconnection request. Reference "
            "the requested capacity, target COD, and that a signed "
            "disclosure bundle is attached. Do NOT include raw private-"
            "profile values; defer technical detail to the bundle."
        ),
        output_type=entity.OutputType.FREE,
    )

    try:
        action = agent.act(spec)
    except Exception as err:
        dt = time.monotonic() - t0
        print(f"FAIL  ({dt:.2f}s): {err}", file=sys.stderr)
        return 1
    dt = time.monotonic() - t0
    print(f"OK    ({dt:.2f}s)")
    print("---applicant action---")
    print(action)

    # Also report what the paraphrase barrier did, for §8c.iii audit.
    paraphrase_component = agent.get_component("private_profile_paraphrased")
    last = getattr(paraphrase_component, "last_paraphrase", None)
    if last is not None:
        print("---paraphrase barrier---")
        print(f"  loss_rate:       {last.loss_rate}")
        print(f"  added_sim_days:  {last.added_simulated_days}")
        print(f"  raw (truncated): {last.original[:120]!r}")
        print(f"  paraphrased:     {last.paraphrased[:240]!r}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
