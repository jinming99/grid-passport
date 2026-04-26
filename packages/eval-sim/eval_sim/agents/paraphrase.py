"""ParaphraseBarrierComponent — sim-bench-design.md §5a + §1.5.2 #6.

The realism-engineering contribution: a component that intercepts
`from=technical-expert, to=contract-handler` messages and applies a
scenario-keyed lossy rewrite, adding 1 simulated day of delay. Modeled
on LLM-Deliberation's `<SCRATCHPAD>/<ANSWER>` tag protocol applied at
the inter-component boundary rather than the inter-agent boundary.

The lossy-rewrite LLM call is gated behind `dry_run=True`; pre-lock the
barrier returns a deterministic truncation stub so tests can exercise
the pipeline without API calls.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from typing import TYPE_CHECKING, Final

if TYPE_CHECKING:
    from eval_sim.llm import Transport


# DO NOT MODIFY POST-§17-LOCK.
PARAPHRASE_BARRIER_PROMPT: Final[str] = """You are a corporate contract-handler paraphrasing a technical-expert's \
internal response for external business-legible communication. The \
technical-expert provided the text below. Your job is to rewrite it with \
controlled lossiness: preserve the claims + intent, but compress the \
precise values / percentages / architectural details toward class-level \
paraphrase. The rewrite should feel like a hurried contract-handler's \
paraphrase, not a verbatim forward.

Target loss rate for this archetype: {loss_rate_pct}% (0.0 = no loss / \
verbatim; 1.0 = maximum loss / highest-level paraphrase only). Higher loss \
rate means the paraphrase drops more precision + more architectural detail.

Do not add information that was not in the input. Do not self-censor values \
the contract-handler would need to carry; just compress them toward class- \
or range-level wording.

Emit exactly:

<SCRATCHPAD>
 (your reasoning about what to compress vs. preserve; not shown to downstream)
</SCRATCHPAD>
<ANSWER>
 (the paraphrased text — this is what the contract-handler will send out)
</ANSWER>

Technical-expert response to paraphrase:
<<<
{technical_text}
>>>
"""


@dataclass(frozen=True)
class ParaphraseResult:
    """Output of one barrier pass: paraphrased text + simulated-day delay."""

    original: str
    paraphrased: str
    loss_rate: float
    added_simulated_days: float


_TAG_PATTERN = re.compile(r"<ANSWER>\s*(.*?)\s*</ANSWER>", re.DOTALL)


def paraphrase_barrier(
    technical_text: str,
    *,
    loss_rate: float,
    seed_key: str,
    transport: Transport | None = None,
    model: str = "claude-sonnet-4-6",
    dry_run: bool = True,
) -> ParaphraseResult:
    """Pass a technical-expert message through the paraphrase barrier.

    Pre-§17-lock default is `dry_run=True`: returns a deterministic
    truncation-style stub that compresses the message proportional to
    `loss_rate` using a stable hash-seeded line drop. Post-lock, the
    runner passes a live `Transport` (claude-agent-sdk backend per
    `eval_sim.llm`) that emits the `<SCRATCHPAD>/<ANSWER>` tag
    structure; we strip the scratchpad.

    `seed_key` is usually `"{scenario_id}|{seed_index}|{turn_id}"` so
    the same run + turn always produces the same paraphrase. Adds
    1 simulated day per §5a.
    """
    loss = max(0.0, min(1.0, loss_rate))
    if dry_run or transport is None:
        paraphrased = _deterministic_compress(technical_text, loss, seed_key)
        return ParaphraseResult(
            original=technical_text,
            paraphrased=paraphrased,
            loss_rate=loss,
            added_simulated_days=1.0,
        )

    prompt = PARAPHRASE_BARRIER_PROMPT.format(
        loss_rate_pct=f"{loss * 100:.0f}",
        technical_text=technical_text,
    )
    raw = transport.complete(model=model, user=prompt, max_tokens=1024)
    match = _TAG_PATTERN.search(raw)
    if not match:
        raise ValueError(
            f"paraphrase-barrier output has no <ANSWER> tag: {raw[:120]!r}"
        )
    return ParaphraseResult(
        original=technical_text,
        paraphrased=match.group(1).strip(),
        loss_rate=loss,
        added_simulated_days=1.0,
    )


def _deterministic_compress(text: str, loss_rate: float, seed_key: str) -> str:
    """Deterministic dry-run stub: drop a `loss_rate` fraction of the
    sentence-equivalent chunks + compress percent values toward class
    labels. Purely illustrative — the real rewrite is an LLM call.
    """
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    if not sentences or not text.strip():
        return ""
    digest = hashlib.sha256(seed_key.encode()).digest()
    keep_count = max(1, round(len(sentences) * (1.0 - loss_rate)))
    # Keep the first `keep_count` sentences in original order, then
    # apply a light percent → "roughly a fifth"-style compression via a
    # regex substitution governed by the loss rate.
    kept = sentences[:keep_count]
    joined = " ".join(kept)

    def _compress_pct(match: re.Match[str]) -> str:
        if loss_rate < 0.25:
            return match.group(0)  # preserve precise value
        pct = match.group(0)
        try:
            v = float(pct.rstrip("%"))
        except ValueError:
            return pct
        if v < 10:
            return "a small single-digit percent"
        if v < 25:
            return "roughly a quarter"
        if v < 50:
            return "roughly a third"
        if v < 75:
            return "roughly half"
        return "a supermajority"

    # No trailing `\b` because `%` is non-word and `%.` has no word-boundary;
    # a pre-boundary on `\d` is sufficient.
    compressed = re.sub(r"\b\d{1,2}(?:\.\d+)?%", _compress_pct, joined)
    # Drift a couple of byte-stable words to reinforce determinism vs. the
    # seed without changing semantics much.
    suffix_marker = "" if digest[0] < 128 else " (summary paraphrase)"
    return compressed + suffix_marker
