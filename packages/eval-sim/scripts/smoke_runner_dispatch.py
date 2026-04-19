"""Live smoke — 4-condition × S1 × seed=0 runner-dispatch validation.

Recommended in `docs/plans/handoff.md` §Now as the pre-step-5 validation.
Rides the parent Claude Code session auth (no ANTHROPIC_API_KEY needed)
via `eval_sim.llm.ClaudeAgentSDKTransport` default transport.

Prints per-condition: turn count, final simulated-day, cartographer_mode
tag, paraphrase-audit count. Use this to cross-check:
- R1 fix: B (email + meeting) final day should be modest (<~50d)
- R2 fix: A (Oracle) should report cartographer_mode='cached'
- Substrate parity: C and D produce the same wire protocol shape
"""

from __future__ import annotations

import time

from eval_sim.runner import run
from eval_sim.scenarios import S1
from eval_sim.schemas.condition import Condition


def main() -> None:
    for cond in Condition:
        t0 = time.time()
        print(f"\n── {cond.value} ── running S1 seed=0 …", flush=True)
        ledger = run(S1, cond, seed=0, dry_run=False)
        wall = time.time() - t0

        transcript = ledger.transcript
        carto_mode = ledger.scorer_inputs.get("cartographer_mode", "(missing)")
        audit = ledger.scorer_inputs.get("paraphrase_audit", [])
        bundle_summary = ledger.artifacts.get("bundle_summary") or {}
        b_summary = ledger.artifacts.get("b_summary") or {}

        print(f"  wall-clock:           {wall:.1f}s")
        print(f"  turns:                {len(transcript)}")
        print(f"  final simulated-day:  {transcript[-1].simulated_day:.1f}")
        print(f"  cartographer_mode:    {carto_mode}")
        print(f"  paraphrase-audit:     {len(audit)} entry/entries")
        if bundle_summary:
            print(
                f"  bundle_summary:       "
                f"query_rounds={bundle_summary.get('bounded_query_rounds')}, "
                f"mode={bundle_summary.get('cartographer_mode')}"
            )
        if b_summary:
            print(
                f"  b_summary:            "
                f"unresolved_rounds={b_summary.get('unresolved_email_rounds')}, "
                f"meeting_triggered={b_summary.get('meeting_triggered')}, "
                f"meeting_held={b_summary.get('meeting_held')}"
            )

        # Turn sequence preview (turn-id + speaker + channel + day)
        print("  turn sequence:")
        for t in transcript:
            print(
                f"    {t.turn_id} [{t.speaker.value:<18}] "
                f"ch={t.channel.value}  day={t.simulated_day:.1f}  "
                f"→ {[r.value for r in t.recipients]}"
            )


if __name__ == "__main__":
    main()
