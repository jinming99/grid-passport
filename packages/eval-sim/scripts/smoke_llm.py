"""Live LLM transport smoke test — sim-bench-design.md §12.1.

Validates that `eval_sim.llm.ClaudeAgentSDKTransport` actually completes
one round-trip against the live `claude` subprocess. The SDK rides on
the parent Claude Code session auth — no `ANTHROPIC_API_KEY` needed
when invoked from inside an active session. Run manually before relying
on the transport for the pilot:

    cd packages/eval-sim
    PYTHONPATH=. uv run python scripts/smoke_llm.py

Reports model used, wall-clock time, and the assistant's text. Exits
non-zero on transport failure.
"""

from __future__ import annotations

import argparse
import sys
import time

from eval_sim.llm import ClaudeAgentSDKTransport, TransportError

SMOKE_USER_PROMPT = (
    "Reply with exactly the JSON object: "
    '{"ok": true, "model_family": "claude"} '
    "and nothing else — no preamble, no markdown."
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--model",
        default="claude-sonnet-4-6",
        help="Model name to test against (default: claude-sonnet-4-6)",
    )
    parser.add_argument(
        "--max-retries",
        type=int,
        default=1,
        help="Retry budget for transport errors (default: 1)",
    )
    args = parser.parse_args()

    transport = ClaudeAgentSDKTransport(max_retries=args.max_retries)
    print(f"smoke: model={args.model}  permission_mode={transport.permission_mode}")
    t0 = time.monotonic()
    try:
        text = transport.complete(
            model=args.model,
            user=SMOKE_USER_PROMPT,
            system="You are a terse JSON emitter.",
            max_tokens=128,
        )
    except TransportError as err:
        print(f"FAIL  ({time.monotonic() - t0:.2f}s): {err}", file=sys.stderr)
        return 1
    dt = time.monotonic() - t0
    print(f"OK    ({dt:.2f}s)")
    print("---response---")
    print(text)
    print("--------------")
    return 0


if __name__ == "__main__":
    sys.exit(main())
