"""Live SkillBundleChannel smoke — sim-bench-design.md §4.4 + §6b.

End-to-end run of Condition D on S1 with a live `claude-agent-sdk`
transport. Expected wall-clock ≈ 1–3 minutes (5–7 LLM calls × ~15–30s
each at Sonnet).

Run inside an active Claude Code session:

    cd packages/eval-sim
    PYTHONPATH=. uv run python scripts/smoke_channel_skill_bundle.py
"""

from __future__ import annotations

import sys
import time

from eval_sim.agents.builders import (
    build_applicant,
    build_regulator,
    build_utility,
)
from eval_sim.channels import AgentBundle, SkillBundleChannel
from eval_sim.llm import ClaudeAgentSDKTransport
from eval_sim.scenarios import S1


def main() -> int:
    transport = ClaudeAgentSDKTransport()
    print(
        f"smoke: scenario={S1.scenario_id} channel=SkillBundle (D) "
        f"model=claude-sonnet-4-6"
    )
    t0 = time.monotonic()
    agents = AgentBundle(
        applicant=build_applicant(
            scenario=S1, transport=transport, seed_index=0, dry_run=False
        ),
        utility=build_utility(scenario=S1, transport=transport),
        regulator=build_regulator(scenario=S1, transport=transport),
    )
    channel = SkillBundleChannel(cache_hash="sha256:smoke", max_query_rounds=2)

    try:
        ledger = channel.run(scenario=S1, seed=0, agents=agents)
    except Exception as err:
        dt = time.monotonic() - t0
        print(f"FAIL  ({dt:.2f}s): {err}", file=sys.stderr)
        return 1
    dt = time.monotonic() - t0
    print(f"OK    ({dt:.2f}s)")
    print(f"transcript_len:        {len(ledger.transcript)}")
    print(
        f"bounded_query_rounds:  "
        f"{ledger.artifacts['d_summary']['bounded_query_rounds']}"
    )
    print(f"final_simulated_day:   {ledger.transcript[-1].simulated_day}")
    print()

    for turn in ledger.transcript:
        body = turn.content if len(turn.content) < 500 else turn.content[:500] + "…"
        print(
            f"--- {turn.turn_id} [{turn.speaker.value}] "
            f"→ {[r.value for r in turn.recipients]} (day {turn.simulated_day}) ---"
        )
        print(body)
        print()

    audit = ledger.scorer_inputs.get("paraphrase_audit", [])
    if audit:
        print(f"--- paraphrase audit ({len(audit)} entries) ---")
        for entry in audit:
            print(
                f"  {entry['turn_id']}  loss={entry['loss_rate']}  "
                f"raw[:80]={entry['raw'][:80]!r}"
            )
    return 0


if __name__ == "__main__":
    sys.exit(main())
