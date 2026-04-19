"""Generate Cartographer cache fixtures — sim-bench-design.md §6e.

One live Cartographer run per scenario. Output lands at
`eval_sim/fixtures/cartographer-cache/{scenario_id}.json` with the
file's SHA-256 recorded in `cache-hashes.json` alongside.

§6e protocol: D + A read these fixtures verbatim; C runs Cartographer
live every turn. **Cache is refreshed once** before the main run.
Mid-experiment refresh requires an amendment per §3.2.

Pre-§17-lock default is `--dry-run`: writes a stub JSON fixture per
scenario so the runner's `cache_hash` has a stable byte string to
hash, but no live SDK call happens. Post-lock, the main-run operator
invokes with `--live` once per scenario.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import typer
from rich.console import Console

from eval_sim import scenarios
from eval_sim.schemas.caseinput import PublicEvidence, SourceRef

app = typer.Typer(add_completion=False, help=__doc__)
console = Console()

FIXTURE_ROOT = (
    Path(__file__).resolve().parent.parent / "eval_sim" / "fixtures" / "cartographer-cache"
)
CACHE_HASHES_PATH = FIXTURE_ROOT / "cache-hashes.json"


def _stub_public_evidence(scenario_id: str, domain: str) -> PublicEvidence:
    """Domain-appropriate dry-run stub. Grid scenarios get the `PublicEvidence`
    shape with placeholder risk classes + a clearly-marked stub sourceRef.
    S7 (priorauth) uses the same shape as a scaffolding placeholder; a
    post-lock amendment decides whether priorauth gets a parallel fixture
    schema or reuses `PublicEvidence` with domain-specific notes.
    """
    return PublicEvidence(
        floodRisk="low",
        permitRisk="low",
        zoningRisk="low",
        siteControlEvidence=False,
        sourceRefs=[
            SourceRef(
                label=f"DRY-RUN STUB ({scenario_id}, {domain})",
                url=f"https://example.invalid/dry-run/{scenario_id.lower()}",
            )
        ],
        notes=[
            f"DRY-RUN STUB. Regenerate with `--live` after §17 sign-off. "
            f"scenario={scenario_id} domain={domain}.",
        ],
    )


def _write_fixture(scenario_id: str, evidence: PublicEvidence) -> tuple[Path, str]:
    """Write `{scenario_id}.json` (SHA-256-stable pretty JSON) + update
    the cache-hashes.json manifest. Returns (path, sha256).
    """
    FIXTURE_ROOT.mkdir(parents=True, exist_ok=True)
    path = FIXTURE_ROOT / f"{scenario_id.lower()}.json"
    payload = evidence.model_dump()
    text = json.dumps(payload, indent=2, sort_keys=True) + "\n"
    path.write_text(text, encoding="utf-8")
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()

    hashes: dict[str, str] = {}
    if CACHE_HASHES_PATH.is_file():
        try:
            hashes = json.loads(CACHE_HASHES_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            hashes = {}
    hashes[scenario_id] = digest
    CACHE_HASHES_PATH.write_text(
        json.dumps(hashes, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return path, digest


def _invoke_live_cartographer(scenario_id: str) -> PublicEvidence:
    """Live Cartographer fetch per §6e.

    **Not wired pre-§17-lock.** Implementing this requires:
      1. Routing through the Claude Agent SDK with `.claude/skills/
         cartographer/` loaded as the Skill
      2. Executing Cartographer's paired CI validator at
         `packages/agents/cartographer/scripts/validate_publicevidence.ts`
         before committing the fixture (so the committed evidence is
         already-validated ground truth)
      3. Budget approval for ~7 live fetches (~$10-20 total)

    The runner side + scorer infrastructure for reading these fixtures is
    ready; only this generator step needs Week-2 wiring.
    """
    raise NotImplementedError(
        f"live Cartographer fetch for {scenario_id} is not wired pre-§17-lock. "
        "Post-lock, this invokes the .claude/skills/cartographer/ Skill via "
        "the Claude Agent SDK + runs the paired CI validator before committing."
    )


def _generate_one(scenario_id: str, *, live: bool) -> tuple[Path, str]:
    card = scenarios.get(scenario_id)
    if live:
        evidence = _invoke_live_cartographer(scenario_id)
    else:
        evidence = _stub_public_evidence(scenario_id, card.domain)
    return _write_fixture(scenario_id, evidence)


@app.command()
def generate(
    scenario: str | None = typer.Option(
        None,
        "--scenario",
        help="Specific scenario ID (e.g. 'S1'). Omit to generate all 7.",
    ),
    live: bool = typer.Option(
        False,
        "--live",
        help=(
            "Invoke the Cartographer Skill against live SDK endpoints. "
            "Default is a dry-run stub for pre-§17-lock. Post-lock, pass "
            "`--live` to refresh a fixture from the real Cartographer."
        ),
    ),
) -> None:
    """Generate or refresh a Cartographer cache fixture (§6e)."""
    targets = [scenario] if scenario else scenarios.all_ids()
    if scenario and scenario not in scenarios.all_ids():
        console.print(f"[red]unknown scenario '{scenario}'[/red]")
        raise typer.Exit(code=1)

    mode = "[red]LIVE[/red]" if live else "[yellow]dry-run stub[/yellow]"
    console.print(
        f"[bold]generate_cartographer_cache[/bold] · {mode} · "
        f"{len(targets)} scenario(s)"
    )
    for sid in targets:
        path, digest = _generate_one(sid, live=live)
        console.print(f"  {sid} → {path.relative_to(FIXTURE_ROOT.parent.parent.parent)}")
        console.print(f"    sha256: {digest[:16]}…")


if __name__ == "__main__":
    app()
