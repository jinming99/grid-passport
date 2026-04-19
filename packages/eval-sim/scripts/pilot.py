"""Pilot run — sim-bench-design.md §10.5.

1 seed × 7 scenarios × 4 conditions = 28 runs, plus a 3-seed Cartographer-
fairness check on S1 / S3 / S7 (§6e) = 9 additional runs. Validates scorer +
role-prompt + judge output-schema + disagreement protocol before the main run.

Pilot results are NOT part of the main data (§10.5).
"""

from __future__ import annotations

from pathlib import Path

import typer
from rich.console import Console

from eval_sim import scenarios
from eval_sim.config import (
    CARTOGRAPHER_FAIRNESS_PILOT_SCENARIOS,
    CARTOGRAPHER_FAIRNESS_PILOT_SEEDS,
    PILOT_SEEDS,
)
from eval_sim.schemas.condition import Condition

app = typer.Typer(add_completion=False, help=__doc__)
console = Console()


@app.command()
def pilot(
    out_dir: Path = typer.Option(  # noqa: B008 — Typer idiom requires Option() default
        Path("results/pilot"),
        "--out",
        help="Output directory for pilot transcripts + aggregate JSON.",
    ),
    dry_run: bool = typer.Option(
        False,
        "--dry-run",
        help=(
            "Skip LLM calls; print the run matrix. Default true pre-§17-lock; flip "
            "to false after lock."
        ),
    ),
) -> None:
    """Execute the pilot run."""
    scenario_ids = scenarios.all_ids()
    conditions = list(Condition)
    total_runs = PILOT_SEEDS * len(scenario_ids) * len(conditions)
    fairness_runs = CARTOGRAPHER_FAIRNESS_PILOT_SEEDS * len(CARTOGRAPHER_FAIRNESS_PILOT_SCENARIOS)
    console.print(
        f"[bold]pilot[/bold] · {total_runs} main-pilot runs + {fairness_runs} "
        f"Cartographer fairness-check runs = {total_runs + fairness_runs} total"
    )
    console.print(f"  scenarios: {', '.join(scenario_ids) or '(none yet)'}")
    console.print(f"  conditions: {', '.join(c.value for c in conditions)}")
    console.print(f"  out: {out_dir}")
    if dry_run:
        console.print("[yellow]dry-run: no LLM calls, no writes[/yellow]")
        return
    raise typer.Exit(code=1)  # live pilot not wired pre-lock


if __name__ == "__main__":
    app()
