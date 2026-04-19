"""Tests for scripts.generate_cartographer_cache (§6e fixture generator).

Live path is covered structurally (priorauth-domain guard + whitelist
loader); the full Skill-invoked path is exercised only by the human-run
`--live` CLI (single Opus call per scenario; committed fixtures live at
`eval_sim/fixtures/cartographer-cache/`). Dry-run is the unit-test
default — no network, no SDK.
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
    _load_canonical_source_urls,
    _stub_public_evidence,
)


def test_stub_has_clear_dry_run_marker() -> None:
    """Stubs must be unambiguously marked — a reviewer must be able to see
    at a glance that a cache fixture is not real."""
    evidence = _stub_public_evidence("S1", "grid")
    assert any("DRY-RUN STUB" in note for note in evidence.notes)
    assert any("DRY-RUN STUB" in ref.label for ref in evidence.sourceRefs)


def test_live_generator_refuses_priorauth_scenarios() -> None:
    """S7 (priorauth) uses the sentinel path, not the grid-specific
    Cartographer Skill. The guard catches accidental live invocation and
    points at the sentinel helper.
    """
    with pytest.raises(ValueError, match="priorauth"):
        _invoke_live_cartographer("S7")


def test_canonical_source_urls_parse_from_sources_md() -> None:
    """The in-prompt URL whitelist reflects SOURCES.md's canonical entries
    (`- **URL:**` lines). Pattern-based entries (`**URL pattern:**`) are
    excluded because their backtick-wrapped URLs trip the TS validator's
    exact-match whitelist check.
    """
    urls = _load_canonical_source_urls()
    assert len(urls) >= 5, (
        f"expected at least 5 canonical URLs from SOURCES.md, got {len(urls)}: {urls}"
    )
    # A couple known-good whitelist entries must be present.
    assert any("fema.gov/flood-maps" in u for u in urls), urls
    assert any("dominionenergy.com" in u for u in urls), urls
    # The backtick-wrapped pattern URL must NOT be present.
    assert not any("vacra.land" in u for u in urls), (
        f"pattern URL leaked into canonical whitelist: {urls}"
    )


def test_generate_one_dry_run_writes_fixture(tmp_path: Path, monkeypatch) -> None:
    """_generate_one(dry-run) writes a fixture JSON at the scenario card's
    declared `public_evidence_cache_path` and updates cache-hashes.json
    with the SHA-256.
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
    # Fixture name matches the scenario card's declared path so the
    # runner's `_cache_hash_for` resolves to the same file.
    assert path.name == scenarios.get("S1").public_evidence_cache_path
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


def test_generate_one_s7_writes_sentinel(tmp_path: Path, monkeypatch) -> None:
    """S7 skips the Skill invocation and writes a typed sentinel. The
    sentinel's shape is intentionally NOT PublicEvidence — the TS CI
    validator is bypassed for S7 per Amendment A-3.
    """
    monkeypatch.setattr(
        "scripts.generate_cartographer_cache.FIXTURE_ROOT", tmp_path
    )
    monkeypatch.setattr(
        "scripts.generate_cartographer_cache.CACHE_HASHES_PATH",
        tmp_path / "cache-hashes.json",
    )
    path, digest = _generate_one("S7", live=False)
    assert path.is_file()
    assert path.name == scenarios.get("S7").public_evidence_cache_path
    payload = json.loads(path.read_text(encoding="utf-8"))
    assert payload["domain"] == "priorauth"
    assert payload["cache_applicable"] is False
    assert isinstance(payload["notes"], list) and payload["notes"]
    # No PublicEvidence keys should be present.
    for forbidden_key in ("floodRisk", "permitRisk", "zoningRisk", "sourceRefs"):
        assert forbidden_key not in payload
    assert len(digest) == 64


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
