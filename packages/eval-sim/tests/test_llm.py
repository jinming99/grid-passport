"""Tests for eval_sim.llm transport adapter — sim-bench-design.md §12.1.

Live-SDK tests are out of scope here; we exercise the `Transport`
protocol surface via `FakeTransport` and verify the default-transport
singleton constructs cleanly (no API key required — the SDK rides on
the parent Claude Code session auth).

The smoke against a real claude-agent-sdk subprocess lives at
`scripts/smoke_llm.py` and runs manually inside an active Claude Code
session.
"""

from __future__ import annotations

import os
from collections.abc import Iterator
from typing import Any

import pytest

from eval_sim.llm import (
    ClaudeAgentSDKTransport,
    FakeTransport,
    Transport,
    TransportError,
    get_default_transport,
    set_default_transport,
)

# ────────────────────────────────────────────────────────────────────────
# FakeTransport behavior
# ────────────────────────────────────────────────────────────────────────


def test_fake_transport_records_calls() -> None:
    fake = FakeTransport(responses={"hello": "world"})
    out = fake.complete(model="claude-opus-4-7", user="hello world", system="be brief")
    assert out == "world"
    assert len(fake.calls) == 1
    call = fake.calls[0]
    assert call["model"] == "claude-opus-4-7"
    assert call["system"] == "be brief"
    assert call["user"] == "hello world"


def test_fake_transport_responder_takes_full_kwargs() -> None:
    seen: dict[str, Any] = {}

    def responder(kwargs: dict[str, Any]) -> str:
        seen.update(kwargs)
        return "ok"

    fake = FakeTransport(responder=responder)
    fake.complete(model="claude-sonnet-4-6", user="ping", max_tokens=64)
    assert seen["model"] == "claude-sonnet-4-6"
    assert seen["max_tokens"] == 64


def test_fake_transport_raises_when_no_match() -> None:
    fake = FakeTransport(responses={"alpha": "ok"})
    with pytest.raises(TransportError):
        fake.complete(model="claude-opus-4-7", user="beta")


# ────────────────────────────────────────────────────────────────────────
# Default-transport singleton
# ────────────────────────────────────────────────────────────────────────


def test_default_transport_can_be_swapped_for_tests() -> None:
    fake = FakeTransport(responses={"x": "y"})
    set_default_transport(fake)
    try:
        got = get_default_transport()
        assert got is fake
        assert got.complete(model="m", user="x") == "y"
    finally:
        set_default_transport(None)


def test_default_transport_constructs_without_api_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The default transport rides on the parent Claude Code session
    auth — no `ANTHROPIC_API_KEY` env var required.
    """
    set_default_transport(None)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    try:
        got = get_default_transport()
        assert isinstance(got, ClaudeAgentSDKTransport)
    finally:
        set_default_transport(None)


# ────────────────────────────────────────────────────────────────────────
# Protocol conformance — both backends satisfy the Transport surface
# ────────────────────────────────────────────────────────────────────────


def test_protocol_conformance() -> None:
    fake: Transport = FakeTransport(responses={})
    sdk: Transport = ClaudeAgentSDKTransport()
    # Just verifying the assignments type-check at runtime via Protocol.
    assert hasattr(fake, "complete")
    assert hasattr(sdk, "complete")


# ────────────────────────────────────────────────────────────────────────
# Cleanup — never leak a real-API singleton out of this test module.
# ────────────────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def _reset_singleton() -> Iterator[None]:
    set_default_transport(None)
    yield
    set_default_transport(None)
    # Clear any test-installed env var.
    os.environ.pop("ANTHROPIC_API_KEY_TEST_LEAK", None)
