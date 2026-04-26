"""LLM transport adapter — sim-bench-design.md §12.1.

Single entry point for all live LLM calls in the bench. Wraps the Claude
Agent SDK (`pip install claude-agent-sdk`) behind a sync `Transport`
protocol. Each scorer + agent module accepts a `Transport | None`; when
`None` (or `dry_run=True`), the dry-run path is taken. Production
callers obtain the default transport via `get_default_transport()`.

The Agent SDK spawns a `claude` subprocess per call, so the latency
floor is in the hundreds of ms. Concurrency is handled at the runner
level via `asyncio.gather` over the async transport; this sync surface
is the path the existing scorers already use.

Authentication: the spawned `claude` subprocess reads its credentials
from the same place the interactive Claude Code CLI does (`~/.claude/`
config), so when this transport runs *from inside* a Claude Code
session it inherits the parent session's auth — no `ANTHROPIC_API_KEY`
needed. The one trick: pop `CLAUDECODE=1` from the env before each
call so the subprocess does not detect itself as a nested session and
refuse to spawn. Pattern adopted from `agentic_ai_reviewer/scripts/
run_claude_batch.py`.
"""

from __future__ import annotations

import asyncio
import logging
import os
import threading
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, Protocol

logger = logging.getLogger(__name__)


class TransportError(RuntimeError):
    """Raised when the LLM transport fails after retries."""


class Transport(Protocol):
    """Sync transport for one LLM completion.

    Returns the assistant's text. Raises `TransportError` on failure.
    Implementations: `ClaudeAgentSDKTransport` (default), `FakeTransport`
    (tests).
    """

    def complete(
        self,
        *,
        model: str,
        user: str,
        system: str | None = None,
        max_tokens: int = 1024,
    ) -> str: ...


# ────────────────────────────────────────────────────────────────────────
# Claude Agent SDK transport (default for live runs)
# ────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class ClaudeAgentSDKTransport:
    """Wraps `claude_agent_sdk.query` for one-shot stateless completions.

    `allowed_tools=[]` disables every tool so each call is a pure prompt
    → text round-trip. `permission_mode='bypassPermissions'` skips every
    interactive permission prompt — required for unattended bench runs.

    Each call awaits the SDK's async iterator, accumulates `TextBlock`
    content from `AssistantMessage`s, and returns the joined text. We
    bridge to sync via `asyncio.run` per call; the runner batches at a
    higher layer when concurrency matters.
    """

    permission_mode: str = "bypassPermissions"
    max_retries: int = 2
    retry_base_delay_s: float = 0.5

    def complete(
        self,
        *,
        model: str,
        user: str,
        system: str | None = None,
        max_tokens: int = 1024,
    ) -> str:
        return asyncio.run(
            _async_complete(
                model=model,
                user=user,
                system=system,
                permission_mode=self.permission_mode,
                max_retries=self.max_retries,
                retry_base_delay_s=self.retry_base_delay_s,
            )
        )

    async def complete_async(
        self,
        *,
        model: str,
        user: str,
        system: str | None = None,
        max_tokens: int = 1024,
    ) -> str:
        """Async variant for callers already inside an event loop (the
        runner batches via `asyncio.gather`).
        """
        return await _async_complete(
            model=model,
            user=user,
            system=system,
            permission_mode=self.permission_mode,
            max_retries=self.max_retries,
            retry_base_delay_s=self.retry_base_delay_s,
        )


_RATE_LIMIT_PATCH_APPLIED = False


def _apply_rate_limit_patch() -> None:
    """Defensive monkeypatch for SDK v0.1.x: `parse_message` raises
    `MessageParseError` on `rate_limit_event` payloads it doesn't
    understand. We swallow that one specific error and keep going.

    Pattern + rationale lifted from `agentic_ai_reviewer/scripts/
    run_claude_batch.py`.
    """
    global _RATE_LIMIT_PATCH_APPLIED
    if _RATE_LIMIT_PATCH_APPLIED:
        return
    # Reaching into SDK internals is intentional — the rate_limit_event
    # crash is in v0.1.x and there is no public API hook for it.
    from claude_agent_sdk._internal import (
        client as _client,  # pyright: ignore[reportPrivateImportUsage]
    )
    from claude_agent_sdk._internal import (
        message_parser as _mp,  # pyright: ignore[reportPrivateImportUsage]
    )

    _orig_parse = _client.parse_message  # pyright: ignore[reportPrivateImportUsage]

    def _patched_parse(data: object) -> object:
        try:
            return _orig_parse(data)  # type: ignore[arg-type]
        except _mp.MessageParseError as err:  # pyright: ignore[reportPrivateImportUsage]
            if "rate_limit_event" in str(err):
                logger.info("SDK rate_limit_event received (ignored)")
                return None
            raise

    _client.parse_message = _patched_parse  # pyright: ignore[reportPrivateImportUsage]
    _RATE_LIMIT_PATCH_APPLIED = True


async def _async_complete(
    *,
    model: str,
    user: str,
    system: str | None,
    permission_mode: str,
    max_retries: int,
    retry_base_delay_s: float,
) -> str:
    # Prevent nested-session detection when running from inside a Claude Code
    # session. The spawned `claude` subprocess inherits the parent's auth via
    # `~/.claude/`; popping CLAUDECODE keeps it from refusing to spawn.
    os.environ.pop("CLAUDECODE", None)

    # Lazy import so dry-run paths + tests don't pay the import cost.
    from claude_agent_sdk import (
        AssistantMessage,
        ClaudeAgentOptions,
        TextBlock,
        query,
    )

    _apply_rate_limit_patch()

    options = ClaudeAgentOptions(
        system_prompt=system,
        model=model,
        allowed_tools=[],
        permission_mode=permission_mode,  # type: ignore[arg-type]
    )

    last_error: Exception | None = None
    for attempt in range(max_retries + 1):
        try:
            chunks: list[str] = []
            async for message in query(prompt=user, options=options):
                if isinstance(message, AssistantMessage):
                    for block in message.content:
                        if isinstance(block, TextBlock):
                            chunks.append(block.text)
            text = "".join(chunks).strip()
            if not text:
                raise TransportError("transport returned empty assistant text")
            return text
        except Exception as err:
            last_error = err
            if attempt < max_retries:
                delay = retry_base_delay_s * (2**attempt)
                logger.warning(
                    "claude-agent-sdk attempt %d/%d failed: %s; retrying in %.2fs",
                    attempt + 1,
                    max_retries + 1,
                    err,
                    delay,
                )
                await asyncio.sleep(delay)
                continue
    raise TransportError(
        f"claude-agent-sdk transport failed after {max_retries + 1} attempts: {last_error}"
    ) from last_error


# ────────────────────────────────────────────────────────────────────────
# Fake transport for tests
# ────────────────────────────────────────────────────────────────────────


@dataclass
class FakeTransport:
    """Test transport: deterministic canned responses.

    `responder` (preferred) is called with the full call kwargs and
    returns the assistant text. `responses` is a fallback prefix-match
    map for simple cases. `calls` records every invocation for asserts.
    """

    responder: Callable[[dict[str, Any]], str] | None = None
    responses: dict[str, str] = field(default_factory=dict)
    calls: list[dict[str, Any]] = field(default_factory=list)

    def complete(
        self,
        *,
        model: str,
        user: str,
        system: str | None = None,
        max_tokens: int = 1024,
    ) -> str:
        kwargs: dict[str, Any] = {
            "model": model,
            "user": user,
            "system": system,
            "max_tokens": max_tokens,
        }
        self.calls.append(kwargs)
        if self.responder is not None:
            return self.responder(kwargs)
        for prefix, response in self.responses.items():
            if user.startswith(prefix):
                return response
        raise TransportError(
            f"FakeTransport has no canned response for prompt prefix: {user[:80]!r}"
        )


# ────────────────────────────────────────────────────────────────────────
# Default transport singleton (lazy-constructed)
# ────────────────────────────────────────────────────────────────────────


_default_transport: Transport | None = None
_default_lock = threading.Lock()


def get_default_transport() -> Transport:
    """Return the lazy default transport (claude-agent-sdk).

    No env-var prerequisite: the spawned `claude` subprocess uses the
    same `~/.claude/` credentials as the interactive CLI. If the user
    has not logged in via `claude login`, the first call will surface
    the auth error from the subprocess as a `TransportError`.
    """
    global _default_transport
    with _default_lock:
        if _default_transport is None:
            _default_transport = ClaudeAgentSDKTransport()
        return _default_transport


def set_default_transport(transport: Transport | None) -> None:
    """Test hook: install a transport (or clear with `None`)."""
    global _default_transport
    with _default_lock:
        _default_transport = transport
