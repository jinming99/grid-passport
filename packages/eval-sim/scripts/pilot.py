"""Pilot run — sim-bench-design.md §10.5.

1 seed × 7 scenarios × 4 conditions = 28 runs, plus a 3-seed Cartographer-
fairness check on S1 / S3 / S7 (§6e) = 9 additional runs. Validates scorer
+ role-prompt + judge output-schema + disagreement protocol before the
main run. Pilot results are NOT part of the main data (§10.5).

`--live` dispatches real SDK runs through `eval_sim.runner.run()` and
persists per-run ledgers as JSON under `results/pilot/transcripts/`
(gitignored). A `results/pilot/manifest.json` (committed) records run
metadata + SHA-256 of each ledger for §15.5 reproducibility.

S7 (priorauth) is skipped by default — `build_applicant` currently
requires a `PrivateProfile` (grid schema) and the priorauth-agent
parallel path is a follow-up. Pass `--include-s7` to attempt (and
expect failures on A/C/D) if you need to exercise the S7 path after
wiring.

Subset mode — single-scenario iteration + explicit condition/seed caps —
lets you run the 12-subset verification (3 scenarios × 4 conditions ×
1 seed) without starting the full 28-run matrix:

    PYTHONPATH=. uv run python scripts/pilot.py --live \\
        --scenarios S1,S2,S3 --max-seeds 1
"""

from __future__ import annotations

import dataclasses
import hashlib
import json
import time
from pathlib import Path
from typing import Any

import typer
from rich.console import Console

from eval_sim import scenarios
from eval_sim.config import (
    CARTOGRAPHER_FAIRNESS_PILOT_SCENARIOS,
    CARTOGRAPHER_FAIRNESS_PILOT_SEEDS,
    PILOT_SEEDS,
)
from eval_sim.runner import RunLedger, run
from eval_sim.schemas.condition import Condition

app = typer.Typer(add_completion=False, help=__doc__)
console = Console()


# S7 uses a priorauth profile, not a grid private profile; `build_applicant`
# currently requires the latter. Skip S7 from default pilot execution
# until the priorauth agent path is wired.
_DEFAULT_SKIP_SCENARIOS = {"S7"}


# ────────────────────────────────────────────────────────────────────────
# Ledger serialization
# ────────────────────────────────────────────────────────────────────────


def _ledger_to_jsonable(ledger: RunLedger) -> dict[str, Any]:
    """Serialize a RunLedger for per-run JSON persistence."""
    return {
        "key": {
            "scenario_id": ledger.key.scenario_id,
            "condition": ledger.key.condition.value,
            "seed": ledger.key.seed,
        },
        "cache_hash": ledger.cache_hash,
        "transcript": [t.model_dump(mode="json") for t in ledger.transcript],
        "artifacts": _jsonable(ledger.artifacts),
        "scorer_inputs": _jsonable(ledger.scorer_inputs),
        "failure_modes": (
            dataclasses.asdict(ledger.failure_modes)
            if ledger.failure_modes is not None
            else None
        ),
    }


def _jsonable(value: Any) -> Any:
    """Recursively normalize arbitrary values into JSON-serializable shapes."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if hasattr(value, "model_dump"):  # pydantic BaseModel
        return value.model_dump(mode="json")
    if dataclasses.is_dataclass(value) and not isinstance(value, type):
        return dataclasses.asdict(value)
    if isinstance(value, dict):
        return {str(k): _jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_jsonable(v) for v in value]
    return str(value)


def _ledger_filename(scenario_id: str, condition: Condition, seed: int) -> str:
    return f"{scenario_id}_{condition.value}_seed{seed:02d}.json"


# ────────────────────────────────────────────────────────────────────────
# CLI
# ────────────────────────────────────────────────────────────────────────


def _parse_csv(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [s.strip() for s in raw.split(",") if s.strip()]


@app.command()
def pilot(
    out_dir: Path = typer.Option(  # noqa: B008 — Typer idiom
        Path("results/pilot"),
        "--out",
        help="Output directory for per-run ledger JSONs + manifest.",
    ),
    live: bool = typer.Option(
        False,
        "--live",
        help="Dispatch real SDK runs. Without --live, prints the matrix only.",
    ),
    scenarios_csv: str = typer.Option(
        "",
        "--scenarios",
        help="Comma-separated scenario IDs (e.g. 'S1,S2,S3'). Empty = all non-skipped.",
    ),
    conditions_csv: str = typer.Option(
        "",
        "--conditions",
        help="Comma-separated condition values (A/B/C/D). Empty = all.",
    ),
    max_seeds: int = typer.Option(
        0,
        "--max-seeds",
        help="Cap seeds per scenario-condition (0 = use PILOT_SEEDS from config).",
    ),
    include_s7: bool = typer.Option(
        False,
        "--include-s7",
        help="Include S7 (priorauth). Default skip — priorauth agent path not yet wired.",
    ),
    fairness: bool = typer.Option(
        False,
        "--fairness",
        help=(
            "Append the §6e Cartographer fairness-pilot runs "
            "(C+D both-live; requires runner.run to accept a cartographer-"
            "mode override — currently NOT wired, so this flag errors out)."
        ),
    ),
) -> None:
    """Execute the pilot run (live or matrix-only)."""
    scenario_filter = _parse_csv(scenarios_csv)
    condition_filter = _parse_csv(conditions_csv)

    all_sids = scenarios.all_ids()
    if scenario_filter:
        unknown = [s for s in scenario_filter if s not in all_sids]
        if unknown:
            console.print(f"[red]unknown scenarios: {unknown}[/red]")
            raise typer.Exit(code=1)
        sids = scenario_filter
    else:
        sids = [
            s for s in all_sids
            if include_s7 or s not in _DEFAULT_SKIP_SCENARIOS
        ]

    if condition_filter:
        try:
            conds = [Condition(c) for c in condition_filter]
        except ValueError as err:
            console.print(f"[red]bad condition value: {err}[/red]")
            raise typer.Exit(code=1) from err
    else:
        conds = list(Condition)

    seed_count = max_seeds if max_seeds > 0 else PILOT_SEEDS
    seeds = list(range(seed_count))

    total = len(sids) * len(conds) * len(seeds)
    fairness_runs = (
        len(CARTOGRAPHER_FAIRNESS_PILOT_SCENARIOS)
        * CARTOGRAPHER_FAIRNESS_PILOT_SEEDS
        if fairness
        else 0
    )
    console.print(
        f"[bold]pilot[/bold] · {total} main-pilot runs"
        + (
            f" + {fairness_runs} fairness-check runs"
            if fairness
            else ""
        )
    )
    console.print(f"  scenarios: {', '.join(sids)}")
    console.print(f"  conditions: {', '.join(c.value for c in conds)}")
    console.print(f"  seeds: {seeds}")
    console.print(f"  out: {out_dir}")

    if fairness:
        console.print(
            "[red]--fairness not wired yet[/red] — requires `runner.run()` "
            "to accept a Cartographer-mode override so D can be forced to "
            "'live'. Raise an issue and wire before enabling this flag."
        )
        raise typer.Exit(code=1)

    if not live:
        console.print(
            "[yellow]matrix-only mode; pass --live to dispatch SDK runs[/yellow]"
        )
        return

    transcripts_dir = out_dir / "transcripts"
    transcripts_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = out_dir / "manifest.json"

    manifest: dict[str, Any] = {
        "started_at_unix": time.time(),
        "scenarios": sids,
        "conditions": [c.value for c in conds],
        "seeds": seeds,
        "default_skip_scenarios": sorted(_DEFAULT_SKIP_SCENARIOS),
        "include_s7": include_s7,
        "runs": [],
    }

    had_failure = False
    for sid in sids:
        scenario_card = scenarios.get(sid)
        for cond in conds:
            for seed in seeds:
                run_idx = len(manifest["runs"]) + 1
                console.print(
                    f"\n[bold]── [{run_idx}/{total}] "
                    f"{sid} × {cond.value} × seed={seed} ──[/bold]"
                )
                t0 = time.time()
                try:
                    ledger = run(scenario_card, cond, seed=seed, dry_run=False)
                except Exception as err:
                    had_failure = True
                    wall = time.time() - t0
                    console.print(
                        f"  [red]FAILED after {wall:.1f}s:[/red] {err}"
                    )
                    manifest["runs"].append({
                        "scenario": sid,
                        "condition": cond.value,
                        "seed": seed,
                        "status": "failed",
                        "wall_s": round(wall, 1),
                        "error": str(err),
                    })
                    _write_manifest(manifest_path, manifest)
                    continue

                wall = time.time() - t0
                fname = _ledger_filename(sid, cond, seed)
                fpath = transcripts_dir / fname
                payload = _ledger_to_jsonable(ledger)
                text = json.dumps(payload, indent=2, sort_keys=True) + "\n"
                fpath.write_text(text, encoding="utf-8")
                digest = hashlib.sha256(text.encode("utf-8")).hexdigest()

                final_day = (
                    ledger.transcript[-1].simulated_day
                    if ledger.transcript
                    else 0.0
                )
                manifest["runs"].append({
                    "scenario": sid,
                    "condition": cond.value,
                    "seed": seed,
                    "status": "ok",
                    "wall_s": round(wall, 1),
                    "turns": len(ledger.transcript),
                    "final_simulated_day": final_day,
                    "file": f"transcripts/{fname}",
                    "sha256": digest,
                    "cache_hash": ledger.cache_hash,
                })
                console.print(
                    f"  [green]ok[/green] · {len(ledger.transcript)} turns · "
                    f"day {final_day:.1f} · {wall:.1f}s · sha {digest[:16]}…"
                )
                _write_manifest(manifest_path, manifest)

    manifest["finished_at_unix"] = time.time()
    _write_manifest(manifest_path, manifest)

    if had_failure:
        console.print(
            "\n[red]one or more runs failed — pilot is incomplete[/red]"
        )
        raise typer.Exit(code=1)

    console.print(
        f"\n[bold green]pilot complete · {total} runs · "
        f"manifest: {manifest_path}[/bold green]"
    )


def _write_manifest(path: Path, manifest: dict[str, Any]) -> None:
    """Write manifest incrementally so a mid-pilot failure still preserves
    the per-run record written so far.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(manifest, indent=2, sort_keys=False) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    app()
