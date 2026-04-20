"""P0.3 different-family judge spot-check — sim-bench-design.md §5d.

Runs the locked Prometheus judge prompt with **claude-sonnet-4-6** (not
Opus 4.7) against a handful of existing pilot ledgers. Quantifies the
same-family self-preference risk (Panickssery 2024) on D's Likert numbers
before they ship on `/about` §6 or `docs/evals/sim-bench-results.md`.

This is a one-off ad-hoc script, not a permanent pipeline step: the per-
cell merge semantics of `score_ledgers.py` are pinned to Opus; a
Sonnet-judge cell would trample the Opus-judge cell on merge. We emit
a standalone report at `results/pilot/spot_check_sonnet/<cell>.json`.

Usage:
    PYTHONPATH=. uv run python scripts/spot_check_cross_family_judge.py
    PYTHONPATH=. uv run python scripts/spot_check_cross_family_judge.py \\
        --cells S1_D_seed00,S2_B_seed00,S3_D_seed00
"""

from __future__ import annotations

import json
from pathlib import Path

import typer
from rich.console import Console

from eval_sim.llm import get_default_transport
from eval_sim.schemas.turn import TurnMessage
from eval_sim.scorers.judge import (
    JudgeInvocation,
    invoke_judge,
    tag_transcript,
)
from eval_sim.scorers.judge_rubric import FIVE_DIMENSION_RUBRIC_TEXT

app = typer.Typer(add_completion=False, help=__doc__)
console = Console()

SONNET_MODEL = "claude-sonnet-4-6"
DEFAULT_CELLS = ("S1_D_seed00", "S2_B_seed00", "S3_D_seed00")


def _load_ledger_transcript(path: Path) -> list[TurnMessage]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return [TurnMessage.model_validate(t) for t in payload.get("transcript", [])]


def _opus_judge_for(
    scores_dir: Path,
    cell_name: str,
) -> dict[str, int] | None:
    """Look up the existing Opus median scores for cell_name (swap-augmented
    path). Returns None if the cell isn't present or didn't run judge."""
    cell_path = scores_dir / f"{cell_name}.json"
    if not cell_path.exists():
        return None
    payload = json.loads(cell_path.read_text(encoding="utf-8"))
    judge = payload.get("scores", {}).get("judge", {})
    return judge.get("median_scores") or judge.get("scores")


@app.command()
def run(
    transcripts_dir: Path = typer.Option(  # noqa: B008
        Path("results/pilot/transcripts"),
        "--transcripts",
    ),
    scores_dir: Path = typer.Option(  # noqa: B008
        Path("results/pilot/scores"),
        "--scores",
    ),
    out_dir: Path = typer.Option(  # noqa: B008
        Path("results/pilot/spot_check_sonnet"),
        "--out",
    ),
    cells_csv: str = typer.Option(",".join(DEFAULT_CELLS), "--cells"),
) -> None:
    """Re-judge cells with claude-sonnet-4-6 and compare vs Opus."""
    cells = [c.strip() for c in cells_csv.split(",") if c.strip()]
    if not cells:
        raise typer.BadParameter("--cells is empty")
    out_dir.mkdir(parents=True, exist_ok=True)

    transport = get_default_transport()

    deltas_summary: list[dict[str, object]] = []
    for cell_name in cells:
        led_path = transcripts_dir / f"{cell_name}.json"
        if not led_path.exists():
            console.print(f"[yellow]skip {cell_name}: no transcript[/yellow]")
            continue
        transcript = _load_ledger_transcript(led_path)
        transcript_formatted = tag_transcript(transcript)

        invocation = JudgeInvocation(
            transcript_formatted=transcript_formatted,
            rubric_text=FIVE_DIMENSION_RUBRIC_TEXT,
            batch_position=0,
            batch_id=f"spot-{cell_name}",
        )
        out = invoke_judge(
            invocation=invocation,
            transport=transport,
            model=SONNET_MODEL,
            dry_run=False,
        )
        sonnet_scores = {
            "stakeholder_alignment": out.stakeholder_alignment.score,
            "planning_defensibility": out.planning_defensibility.score,
            "privacy_integrity": out.privacy_integrity.score,
            "regulatory_auditability": out.regulatory_auditability.score,
            "applicant_experience": out.applicant_experience.score,
        }

        opus_scores = _opus_judge_for(scores_dir, cell_name)
        delta: dict[str, int] | None = None
        if opus_scores:
            delta = {
                dim: sonnet_scores[dim] - opus_scores[dim]
                for dim in sonnet_scores
            }

        cell_report = {
            "cell": cell_name,
            "model": SONNET_MODEL,
            "sonnet_scores": sonnet_scores,
            "opus_median_scores": opus_scores,
            "delta_sonnet_minus_opus": delta,
            "counterfactual": out.counterfactual,
            "rationales": {
                "stakeholder_alignment": out.stakeholder_alignment.rationale,
                "planning_defensibility": out.planning_defensibility.rationale,
                "privacy_integrity": out.privacy_integrity.rationale,
                "regulatory_auditability": out.regulatory_auditability.rationale,
                "applicant_experience": out.applicant_experience.rationale,
            },
        }
        (out_dir / f"{cell_name}.json").write_text(
            json.dumps(cell_report, indent=2) + "\n", encoding="utf-8"
        )
        deltas_summary.append(
            {
                "cell": cell_name,
                "sonnet": sonnet_scores,
                "opus": opus_scores,
                "delta": delta,
            }
        )
        console.print(f"[green]ok[/green] {cell_name}: sonnet={sonnet_scores}")

    (out_dir / "summary.json").write_text(
        json.dumps({"cells": deltas_summary, "judge_model": SONNET_MODEL}, indent=2)
        + "\n",
        encoding="utf-8",
    )
    console.print(f"\n[bold green]spot-check wrote {out_dir / 'summary.json'}[/bold green]")


if __name__ == "__main__":
    app()
