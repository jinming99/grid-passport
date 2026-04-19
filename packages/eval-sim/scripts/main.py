"""Main run — sim-bench-design.md §7.replication.

7 scenarios × 4 conditions × 5 seeds = 140 main condition runs + 35 oracle
runs (shared EVPI reference) + 280 judge runs (2 independent Opus runs per
transcript) + ~560 deterministic post-hoc regret computations across F_S.

Estimated Claude API cost: $600–$1800 depending on transcript verbosity.
Pre-register final N after pilot. Runs only after §17 sign-off.
"""

from __future__ import annotations

from pathlib import Path

import typer
from rich.console import Console

from eval_sim import scenarios
from eval_sim.config import SEEDS_PER_SCENARIO_PER_CONDITION
from eval_sim.schemas.condition import Condition

app = typer.Typer(add_completion=False, help=__doc__)
console = Console()


@app.command()
def main(
    out_dir: Path = typer.Option(  # noqa: B008 — Typer idiom requires Option() default
        Path("results/main"),
        "--out",
        help="Output directory for main-run transcripts + aggregate JSON.",
    ),
    dry_run: bool = typer.Option(
        False,
        "--dry-run",
        help="Skip LLM calls; print the run matrix. Default true pre-§17-lock.",
    ),
) -> None:
    """Execute the main run."""
    scenario_ids = scenarios.all_ids()
    conditions = list(Condition)
    condition_runs = SEEDS_PER_SCENARIO_PER_CONDITION * len(scenario_ids) * len(conditions)
    oracle_runs = SEEDS_PER_SCENARIO_PER_CONDITION * len(scenario_ids)
    judge_runs = 2 * condition_runs
    console.print(
        f"[bold]main[/bold] · {condition_runs} condition + {oracle_runs} oracle + "
        f"{judge_runs} judge = {condition_runs + oracle_runs + judge_runs} total runs"
    )
    console.print(f"  scenarios: {', '.join(scenario_ids) or '(none yet)'}")
    console.print(f"  conditions: {', '.join(c.value for c in conditions)}")
    console.print(f"  out: {out_dir}")
    if dry_run:
        console.print("[yellow]dry-run: no LLM calls, no writes[/yellow]")
        return
    raise typer.Exit(code=1)  # live main not wired pre-lock


if __name__ == "__main__":
    app()
