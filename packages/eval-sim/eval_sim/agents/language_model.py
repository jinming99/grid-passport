"""Concordia LanguageModel adapter wrapping our `eval_sim.llm.Transport`.

Concordia's `EntityAgent` + components consume an
`concordia.language_model.language_model.LanguageModel` ABC. We wrap our
Transport (claude-agent-sdk backed in production, FakeTransport in
tests) so every Concordia call routes through the same SDK path the
scorers use — single point of LLM control, single retry policy, single
authentication path.

Implements both abstract methods:
- `sample_text(prompt, …)`  — direct prompt → text round-trip.
- `sample_choice(prompt, responses, …)` — multiple-choice via inline
  enumeration ("Reply with just the number.") and digit-parse fallback.

The temperature / top_p / seed kwargs Concordia passes are accepted for
ABC conformance but not forwarded — the claude-agent-sdk transport does
not expose those knobs through `ClaudeAgentOptions`. The bench design
locks model + permission_mode + max_tokens; per-call sampling-knob
control is out of scope.
"""

from __future__ import annotations

import re
from collections.abc import Collection, Mapping, Sequence
from dataclasses import dataclass
from typing import Any

from concordia.language_model import language_model

from eval_sim.llm import Transport


@dataclass
class TransportLanguageModel(language_model.LanguageModel):
    """Concordia LanguageModel that delegates to our Transport.

    `model` is the per-instance model name (e.g. `claude-sonnet-4-6` for
    user-sim agents per §5e). `system` is an optional system prompt
    appended to every call from this instance — typically the persona
    locked-prompt header.
    """

    transport: Transport
    model: str
    system: str | None = None

    def sample_text(
        self,
        prompt: str,
        *,
        max_tokens: int = 5000,
        terminators: Collection[str] = (),
        temperature: float = 1.0,
        top_p: float = 0.95,
        top_k: int = 64,
        timeout: float = 60,
        seed: int | None = None,
    ) -> str:
        return self.transport.complete(
            model=self.model,
            user=prompt,
            system=self.system,
            max_tokens=max_tokens,
        )

    def sample_choice(
        self,
        prompt: str,
        responses: Sequence[str],
        *,
        seed: int | None = None,
    ) -> tuple[int, str, Mapping[str, Any]]:
        """Multiple-choice via inline enumeration + digit-parse.

        Build a prompt of the form `<prompt>\\n\\nChoose one:\\n  1) X\\n
        2) Y\\n  ...\\nReply with just the number.`, then parse the
        first integer in the response. Falls back to index 0 on parse
        failure (logged via `info["fallback"] = True`).
        """
        if not responses:
            raise ValueError("sample_choice requires at least one response")
        enumerated = "\n".join(f"  {i + 1}) {r}" for i, r in enumerate(responses))
        full_prompt = (
            f"{prompt}\n\nChoose one of the following:\n{enumerated}\n\n"
            "Reply with just the number of your choice and nothing else."
        )
        raw = self.transport.complete(
            model=self.model,
            user=full_prompt,
            system=self.system,
            max_tokens=16,
        )
        match = re.search(r"\d+", raw)
        info: dict[str, Any] = {"raw": raw, "fallback": False}
        if not match:
            info["fallback"] = True
            return 0, responses[0], info
        idx = int(match.group(0)) - 1  # 1-indexed in prompt
        if idx < 0 or idx >= len(responses):
            info["fallback"] = True
            info["out_of_range_idx"] = idx
            return 0, responses[0], info
        return idx, responses[idx], info
