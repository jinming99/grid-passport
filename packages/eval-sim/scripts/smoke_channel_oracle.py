"""Live Oracle channel smoke test — sim-bench-design.md §4.1 + §6d.

End-to-end validation that:

1. `build_applicant`/`build_utility`/`build_regulator` build real
   Concordia EntityAgents.
2. `OracleChannel.run()` drives the 3-turn deterministic loop.
3. Each role observes the prior turn's content and responds in role.
4. Paraphrase audit (with loss_rate=0 — Oracle has no expertise gap)
   is captured for the trace scorer.

Run inside an active Claude Code session:

    cd packages/eval-sim
    PYTHONPATH=. uv run python scripts/smoke_channel_oracle.py

Reports wall-clock + each turn's content. Three live LLM calls expected
(Sonnet for the smoke; the runner will use Opus 4.7 for Oracle agents
in the main run per §4.1).
"""

from __future__ import annotations

import sys
import time

from eval_sim.agents.builders import (
    build_applicant,
    build_regulator,
    build_utility,
)
from eval_sim.channels import AgentBundle, OracleChannel
from eval_sim.llm import ClaudeAgentSDKTransport
from eval_sim.scenarios import S1


def main() -> int:
    transport = ClaudeAgentSDKTransport()
    print(f"smoke: scenario={S1.scenario_id} channel=Oracle model=claude-sonnet-4-6")
    t0 = time.monotonic()

    agents = AgentBundle(
        applicant=build_applicant(
            scenario=S1, transport=transport, seed_index=0, dry_run=False
        ),
        utility=build_utility(scenario=S1, transport=transport),
        regulator=build_regulator(scenario=S1, transport=transport),
    )
    channel = OracleChannel(cache_hash="sha256:smoke")

    try:
        ledger = channel.run(scenario=S1, seed=0, agents=agents)
    except Exception as err:  # noqa: BLE001
        dt = time.monotonic() - t0
        print(f"FAIL  ({dt:.2f}s): {err}", file=sys.stderr)
        return 1
    dt = time.monotonic() - t0
    print(f"OK    ({dt:.2f}s)")
    print(f"transcript_len: {len(ledger.transcript)}")
    print(f"cache_hash:     {ledger.cache_hash}")
    print()

    for turn in ledger.transcript:
        print(
            f"--- {turn.turn_id} [{turn.speaker.value}] "
            f"→ {[r.value for r in turn.recipients]} (day {turn.simulated_day}) ---"
        )
        # Truncate long content for legibility.
        body = turn.content if len(turn.content) < 600 else turn.content[:600] + "…"
        print(body)
        print()

    audit = ledger.scorer_inputs.get("paraphrase_audit", [])
    if audit:
        print(f"--- paraphrase audit ({len(audit)} entries) ---")
        for entry in audit:
            print(f"  {entry['turn_id']}  loss={entry['loss_rate']}  "
                  f"raw[:80]={entry['raw'][:80]!r}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
