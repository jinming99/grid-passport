"""Tests for scripts.generate_cartographer_cache (§6e fixture generator).

Pre-§17-lock: only dry-run is exercised. Live path raises NotImplementedError
by design; that is the gate preventing accidental live fetches pre-lock.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from eval_sim import scenarios
from scripts.generate_cartographer_cache import (
    CACHE_HASHES_PATH,
    FIXTURE_ROOT,
    _generate_one,
    _invoke_live_cartographer,
    _stub_public_evidence,
)


def test_stub_has_clear_dry_run_marker() -> None:
    """Stubs must be unambiguously marked — a reviewer must be able to see
    at a glance that a cache fixture is not real."""
    evidence = _stub_public_evidence("S1", "grid")
    assert any("DRY-RUN STUB" in note for note in evidence.notes)
    assert any("DRY-RUN STUB" in ref.label for ref in evidence.sourceRefs)


def test_live_generator_raises_before_lock() -> None:
    """The guard that prevents accidental live fetches pre-§17-lock."""
    with pytest.raises(NotImplementedError, match="§17"):
        _invoke_live_cartographer("S1")


def test_generate_one_dry_run_writes_fixture(tmp_path: Path, monkeypatch) -> None:
    """_generate_one(dry-run) writes a fixture JSON and updates
    cache-hashes.json with the SHA-256.
    """
    monkeypatch.setattr(
        "scripts.generate_cartographer_cache.FIXTURE_ROOT", tmp_path
    )
    monkeypatch.setattr(
        "scripts.generate_cartographer_cache.CACHE_HASHES_PATH",
        tmp_path / "cache-hashes.json",
    )
    path, digest = _generate_one("S1", live=False)
    assert path.is_file()
    assert path.name == "s1.json"
    assert len(digest) == 64  # sha256 hex

    manifest = json.loads((tmp_path / "cache-hashes.json").read_text())
    assert manifest["S1"] == digest


def test_generate_one_overwrites_existing_fixture(tmp_path: Path, monkeypatch) -> None:
    """Regeneration should overwrite the file + update the manifest."""
    monkeypatch.setattr(
        "scripts.generate_cartographer_cache.FIXTURE_ROOT", tmp_path
    )
    monkeypatch.setattr(
        "scripts.generate_cartographer_cache.CACHE_HASHES_PATH",
        tmp_path / "cache-hashes.json",
    )
    _generate_one("S1", live=False)
    path, second_digest = _generate_one("S1", live=False)
    # Deterministic stub → same content → same hash across invocations.
    assert path.is_file()
    manifest = json.loads((tmp_path / "cache-hashes.json").read_text())
    assert manifest["S1"] == second_digest


def test_every_scenario_has_valid_stub() -> None:
    """Sanity: _stub_public_evidence handles both 'grid' and 'priorauth'
    domains without raising.
    """
    for sid in scenarios.all_ids():
        card = scenarios.get(sid)
        evidence = _stub_public_evidence(sid, card.domain)
        assert evidence.sourceRefs
        assert evidence.notes


def test_fixture_root_is_under_package_fixtures_dir() -> None:
    """Regression fence against accidental path churn: FIXTURE_ROOT must
    resolve to `packages/eval-sim/eval_sim/fixtures/cartographer-cache`.
    """
    assert FIXTURE_ROOT.name == "cartographer-cache"
    assert FIXTURE_ROOT.parent.name == "fixtures"
    assert FIXTURE_ROOT.parent.parent.name == "eval_sim"
    assert CACHE_HASHES_PATH.parent == FIXTURE_ROOT
