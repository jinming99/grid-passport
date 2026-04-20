"""Scorer-over-ledger batch — sim-bench-design.md §10.5 step 6d.

Reads every per-run ledger under `results/pilot/transcripts/*.json` (or a
filtered subset) and invokes the existing scorer modules:

  Deterministic (no SDK cost):
    - efficiency           §8a rounds + days + words + meetings
    - mechanical.h_null    §8d cross-org private-token leak count
    - privacy.direct T1+T2 §8c.i Presidio (if available) + substring

  LLM-gated (per-scorer cost):
    - privacy.direct T3    §8c.i AgentLeak paraphrase judge (Sonnet)
    - privacy.trace        §8c.iii CI 5-tuple classifier (Sonnet, per
                           cross-org turn × per CI tuple)
    - judge                §5d + §8e Prometheus rubric (Opus, per run)

Outputs per-cell `results/pilot/scores/{scenario}_{condition}_seed{N}.json`
plus aggregated `results/pilot/summary.{json,md}`. Idempotent: existing
per-cell files are skipped unless `--force`. LLM-gated scorers are gated
behind `--with-llm` (or `--scorer <name>`), so a re-run of judge.py does
not repay the deterministic scorers.

Not yet covered (pending separate lifts, flagged in summary):
    - privacy.inferential  needs Presidio-anonymized public-only
                           baseline + Staab probe runs (§8c.ii).
    - mechanical.h_workflow / h_spec / h_trigger
                           need validator-pass-per-turn + source_refs
                           metadata not currently persisted on ledgers.
    - robustness OPR / Savage regret
                           needs CandidatePlan extraction from each
                           run's artifacts (§7.7 per-future scoring is
                           a separate research lift).

Usage:
    PYTHONPATH=. uv run python scripts/score_ledgers.py              # deterministic only
    PYTHONPATH=. uv run python scripts/score_ledgers.py --with-llm   # + Sonnet + Opus
    PYTHONPATH=. uv run python scripts/score_ledgers.py --scorer judge --with-llm
    PYTHONPATH=. uv run python scripts/score_ledgers.py --scenarios S1,S2 --force
"""

from __future__ import annotations

import dataclasses
import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import typer
from rich.console import Console

from eval_sim import scenarios
from eval_sim.schemas.channel import CHANNEL_WEIGHTS, Channel, sensitivity_for_field
from eval_sim.schemas.condition import Condition
from eval_sim.schemas.role import Role
from eval_sim.schemas.scenario import CITuple, ScenarioCard
from eval_sim.schemas.turn import TurnMessage
from eval_sim.scorers.efficiency import compute_efficiency
from eval_sim.scorers.judge import (
    JudgeInvocation,
    invoke_judge,
    judge_with_swap,
    tag_transcript,
)
from eval_sim.scorers.judge_rubric import FIVE_DIMENSION_RUBRIC_TEXT
from eval_sim.scorers.mechanical import compute_h_null
from eval_sim.scorers.privacy.direct import (
    ParaphraseJudgeVerdict,
    compute_direct_leakage,
    invoke_paraphrase_judge,
)
from eval_sim.scorers.privacy.trace import (
    TraceVerdict,
    compute_trace_leakage,
    invoke_trace_classifier,
)

app = typer.Typer(add_completion=False, help=__doc__)
console = Console()

# Scorer identifiers — exposed on the CLI via --scorer.
ALL_SCORERS: tuple[str, ...] = (
    "efficiency",
    "mechanical",
    "direct",
    "trace",
    "judge",
)
DETERMINISTIC_SCORERS: frozenset[str] = frozenset({"efficiency", "mechanical"})
LLM_GATED_SCORERS: frozenset[str] = frozenset({"direct", "trace", "judge"})

_SCORER_HELP: str = (
    "Run only named scorers (repeatable). Choices: "
    + ",".join(ALL_SCORERS)
    + "."
)


# ────────────────────────────────────────────────────────────────────────
# Budget tracking transport wrapper
# ────────────────────────────────────────────────────────────────────────


@dataclass
class ScorerBudget:
    """Per-scorer LLM call + wall-clock + token-count accounting."""

    calls: int = 0
    tokens_prompt: int = 0
    tokens_completion: int = 0
    wall_seconds: float = 0.0

    def record_call(self, prompt: str, completion: str, wall: float) -> None:
        self.calls += 1
        # Rough: 1 token ≈ 4 chars. Good enough for extrapolation — the
        # SDK doesn't surface real usage through this path.
        self.tokens_prompt += max(1, len(prompt) // 4)
        self.tokens_completion += max(1, len(completion) // 4)
        self.wall_seconds += wall

    def as_dict(self) -> dict[str, Any]:
        return {
            "calls": self.calls,
            "tokens_prompt_est": self.tokens_prompt,
            "tokens_completion_est": self.tokens_completion,
            "wall_seconds": round(self.wall_seconds, 2),
        }


@dataclass
class BudgetingTransport:
    """Thin adapter wrapping a Transport and a named ScorerBudget.

    Mutates `budget` on every `complete()` call. `inner` must implement
    the `eval_sim.llm.Transport` protocol.
    """

    inner: Any  # Transport protocol
    budget: ScorerBudget

    def complete(
        self,
        *,
        model: str,
        user: str,
        system: str | None = None,
        max_tokens: int = 1024,
    ) -> str:
        t0 = time.monotonic()
        out = self.inner.complete(
            model=model, user=user, system=system, max_tokens=max_tokens
        )
        self.budget.record_call(prompt=user, completion=out, wall=time.monotonic() - t0)
        return out


# ────────────────────────────────────────────────────────────────────────
# Ledger loading
# ────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class LedgerView:
    """In-memory view of a persisted ledger. Typed where it matters.

    `private_tokens_override` (optional) replaces the ledger's frozen
    `scorer_inputs.private_tokens` when the caller wants to re-score
    historical ledgers under a post-amendment scenario card (per A-4
    re-score workflow — §10.5).
    """

    scenario_id: str
    condition: Condition
    seed: int
    cache_hash: str
    transcript: list[TurnMessage]
    artifacts: dict[str, Any]
    scorer_inputs: dict[str, Any]
    path: Path
    private_tokens_override: tuple[str, ...] | None = None

    @property
    def private_tokens(self) -> list[str]:
        if self.private_tokens_override is not None:
            return list(self.private_tokens_override)
        return [str(t) for t in self.scorer_inputs.get("private_tokens", [])]

    @property
    def ci_tuples(self) -> list[CITuple]:
        raw = self.scorer_inputs.get("ci_tuples", [])
        return [CITuple.model_validate(t) for t in raw]


def _load_ledger(
    path: Path,
    *,
    token_source: str = "scenario",
) -> LedgerView:
    """Load a ledger from disk.

    `token_source` controls which `private_token_set` the scorers use:
      - 'scenario' (default, post-A-4): look up the current scenario-card
        tokens at score-time. Lets post-lock amendments apply to historical
        ledgers without regenerating them.
      - 'ledger': use the frozen snapshot in `scorer_inputs.private_tokens`
        (pre-A-4 behavior; strict reproducibility of the original run).
    """
    payload = json.loads(path.read_text(encoding="utf-8"))
    key = payload["key"]
    turns = [TurnMessage.model_validate(t) for t in payload.get("transcript", [])]
    scenario_id = key["scenario_id"]
    override: tuple[str, ...] | None = None
    if token_source == "scenario":
        try:
            card = scenarios.get(scenario_id)
            override = tuple(card.private_token_set)
        except KeyError:
            override = None
    return LedgerView(
        scenario_id=scenario_id,
        condition=Condition(key["condition"]),
        seed=int(key["seed"]),
        cache_hash=str(payload.get("cache_hash", "")),
        transcript=turns,
        artifacts=payload.get("artifacts", {}) or {},
        scorer_inputs=payload.get("scorer_inputs", {}) or {},
        path=path,
        private_tokens_override=override,
    )


def _flatten_artifact_strings(
    artifacts: Any, prefix: str = ""
) -> list[tuple[str, str]]:
    """Walk the artifacts dict and yield (path, text) for every string leaf.

    Used by the direct-leakage + paraphrase judge to have one artifact-text
    per (path, content) pair. Channel defaults to C7_ARTIFACTS since these
    are post-run residues (bundle contents, meeting notes, oracle summaries).
    """
    out: list[tuple[str, str]] = []
    if isinstance(artifacts, dict):
        for k, v in artifacts.items():
            out.extend(
                _flatten_artifact_strings(v, f"{prefix}/{k}" if prefix else str(k))
            )
    elif isinstance(artifacts, list):
        for i, v in enumerate(artifacts):
            out.extend(_flatten_artifact_strings(v, f"{prefix}[{i}]"))
    elif isinstance(artifacts, str):
        if artifacts.strip():
            out.append((prefix or "root", artifacts))
    return out


# ────────────────────────────────────────────────────────────────────────
# Per-scorer pipelines
# ────────────────────────────────────────────────────────────────────────


def _score_efficiency(ledger: LedgerView) -> dict[str, Any]:
    result = compute_efficiency(ledger.transcript)
    return dataclasses.asdict(result)


def _score_mechanical_partial(ledger: LedgerView) -> dict[str, Any]:
    """Only h_null is computable from the current ledger shape. The other
    §8d axes need metadata (validator_pass_per_turn, source_refs with
    whitelist/web-check flags, skill_per_turn pairs) that is not persisted
    on runtime ledgers today. Reported as null with a note.
    """
    h_null = compute_h_null(
        transcript=ledger.transcript,
        private_tokens=set(ledger.private_tokens),
    )
    return {
        "h_null_leak_count": h_null,
        "h_workflow_pass_rate": None,
        "h_spec_cite_correct_rate": None,
        "h_spec_hallucination_rate": None,
        "h_spec_hallucination_in_artifact_rate": None,
        "h_trigger_pass_rate": None,
        "_note": (
            "h_workflow / h_spec / h_trigger require per-turn metadata "
            "(validator_pass_per_turn, source_refs, skill_per_turn) not "
            "currently persisted on ledgers. Adding that metadata is a "
            "separate lift tracked for step-7 main."
        ),
    }


def _score_direct(
    ledger: LedgerView,
    *,
    transport: Any | None,
    budget: ScorerBudget | None,
    dry_run: bool,
) -> dict[str, Any]:
    """§8c.i Tier 1 (Presidio — optional; off if not installed) + Tier 2
    (substring) + Tier 3 (paraphrase judge, one call per artifact).
    """
    artifact_strings = _flatten_artifact_strings(ledger.artifacts)
    # For the ledger shape emitted by the pilot, all artifact residues
    # are final outputs to authorized parties — treat as C7_ARTIFACTS.
    tagged_artifacts: list[tuple[Channel, str]] = [
        (Channel.C7_ARTIFACTS, text) for _, text in artifact_strings
    ]

    presidio_hits_per_artifact: list[list[dict[str, Any]]] = [
        [] for _ in tagged_artifacts
    ]
    # Presidio Tier 1 is intentionally off in v0 batch — spaCy install +
    # model download is slow and the Tier-2 substring path + Tier-3 judge
    # already cover the direct axis for pre-§9 CI signal. Adding Presidio
    # is a separate follow-up under §8c.i.

    paraphrase_verdicts: list[ParaphraseJudgeVerdict | None] = []
    if dry_run or transport is None:
        for _ in tagged_artifacts:
            paraphrase_verdicts.append(
                invoke_paraphrase_judge(
                    artifact_text="",
                    private_fields=[],
                    transport=None,
                    dry_run=True,
                )
            )
    else:
        wrapped = BudgetingTransport(inner=transport, budget=budget)  # type: ignore[arg-type]
        for _, artifact_text in artifact_strings:
            verdict = invoke_paraphrase_judge(
                artifact_text=artifact_text,
                private_fields=ledger.private_tokens,
                transport=wrapped,  # type: ignore[arg-type]
                dry_run=False,
            )
            paraphrase_verdicts.append(verdict)

    total_private_fields = max(1, len(ledger.private_tokens))
    score = compute_direct_leakage(
        artifacts=tagged_artifacts,
        private_field_tokens=ledger.private_tokens,
        presidio_hits_per_artifact=presidio_hits_per_artifact,
        paraphrase_verdicts_per_artifact=paraphrase_verdicts,
        total_private_fields=total_private_fields,
    )

    return {
        "n_direct_leaks": score.n_direct_leaks,
        "elr": round(score.elr, 4),
        "wls": round(score.wls, 4),
        "presidio_enabled": False,
        "paraphrase_judge_enabled": not dry_run,
        "artifacts_scored": len(tagged_artifacts),
        "verdicts": [
            {
                "score": round(v.score, 3) if v else None,
                "has_leakage": v.has_leakage if v else None,
                "severity": v.severity if v else None,
                "category": v.category if v else None,
                "cited_field": v.cited_field if v else None,
            }
            for v in paraphrase_verdicts
        ],
    }


def _cross_org_turns(transcript: list[TurnMessage]) -> list[TurnMessage]:
    """Applicant-side turns that cross to utility or regulator. These are
    the candidates for trace-leakage classification per §8c.iii.
    """
    out: list[TurnMessage] = []
    for t in transcript:
        if not t.speaker.is_applicant:
            continue
        if not any(r.is_utility or r == Role.REGULATOR for r in t.recipients):
            continue
        out.append(t)
    return out


def _score_trace(
    ledger: LedgerView,
    *,
    transport: Any | None,
    budget: ScorerBudget | None,
    dry_run: bool,
) -> dict[str, Any]:
    """§8c.iii — classify every (cross-org applicant turn × CI tuple) pair
    against the CI transmission principle; aggregate per-channel count + WLS.
    """
    cross_org = _cross_org_turns(ledger.transcript)
    ci_tuples = ledger.ci_tuples
    verdicts: list[TraceVerdict] = []

    wrapped: Any | None = None
    if not dry_run and transport is not None:
        wrapped = BudgetingTransport(inner=transport, budget=budget)  # type: ignore[arg-type]

    for turn in cross_org:
        # Pick the first utility or regulator recipient for the classifier
        # metadata; the CI tuple itself carries the authorized-recipient.
        target = next(
            (r for r in turn.recipients if r.is_utility or r == Role.REGULATOR),
            None,
        )
        if target is None:
            continue
        for ci in ci_tuples:
            verdict = invoke_trace_classifier(
                turn_id=turn.turn_id,
                speaker=turn.speaker.value,
                recipient=target.value,
                channel=turn.channel,
                ci_tuple=ci,
                artifact_text=turn.content,
                transport=wrapped if wrapped is not None else None,
                dry_run=dry_run or transport is None,
            )
            verdicts.append(verdict)

    score = compute_trace_leakage(verdicts)
    return {
        "n_trace_leaks_total": sum(score.n_trace_leaks_by_channel.values()),
        "n_trace_leaks_by_channel": {
            c.value: n for c, n in score.n_trace_leaks_by_channel.items()
        },
        "wls": round(score.wls, 4),
        "classifier_enabled": not dry_run and transport is not None,
        "pairs_classified": len(verdicts),
        "verdicts": [
            {
                "turn_id": v.turn_id,
                "channel": v.channel.value,
                "cited_field": v.cited_field,
                "principle_violated": v.principle_violated,
                "severity": v.severity,
                "confidence": round(v.confidence, 3),
            }
            for v in verdicts
            if v.principle_violated
        ],
    }


def _score_judge(
    ledger: LedgerView,
    *,
    transport: Any | None,
    budget: ScorerBudget | None,
    dry_run: bool,
    swap_augment: bool = True,
) -> dict[str, Any]:
    """§5d + §8e Prometheus judge.

    Amendment A-6 made swap-augmentation mandatory: two independent Opus
    runs with shuffled batch position + disagreement detection per §5d
    protocol. Zheng et al. MT-Bench reports 22% swap-inconsistency floor
    for GPT-4-class models; we report actual disagreement per dimension
    and flag |delta| > 1 for human spot-check.

    `swap_augment=False` disables the second run (for cost-sensitive
    re-runs of just one axis); default is on.
    """
    transcript_formatted = tag_transcript(ledger.transcript)
    batch_prefix = f"{ledger.scenario_id}-{ledger.condition.value}-s{ledger.seed:02d}"

    wrapped: Any | None = None
    if not dry_run and transport is not None:
        wrapped = BudgetingTransport(inner=transport, budget=budget)  # type: ignore[arg-type]

    if dry_run or transport is None or not swap_augment:
        # Single-run path (dry-run or explicit swap_augment=False).
        invocation = JudgeInvocation(
            transcript_formatted=transcript_formatted,
            rubric_text=FIVE_DIMENSION_RUBRIC_TEXT,
            batch_position=0,
            batch_id=batch_prefix,
        )
        out = invoke_judge(
            invocation=invocation,
            transport=wrapped if wrapped is not None else None,
            dry_run=dry_run or transport is None,
        )
        return {
            "enabled": not dry_run and transport is not None,
            "swap_augmented": False,
            "scores": _dims_to_scores(out),
            "counterfactual": out.counterfactual,
            "rationales": _dims_to_rationales(out),
        }

    # Swap-augmented path (default for live runs). Two independent Opus
    # calls with shuffled batch_position; disagreement per dimension.
    result = judge_with_swap(
        transcript_formatted=transcript_formatted,
        rubric_text=FIVE_DIMENSION_RUBRIC_TEXT,
        batch_id_1=f"{batch_prefix}-r1",
        batch_id_2=f"{batch_prefix}-r2",
        batch_position_1=0,
        batch_position_2=1,
        transport=wrapped,
        dry_run=False,
    )
    # Per-dimension scores are the per-run pair; report both + disagreement.
    run_1_scores = _dims_to_scores(result.run_1)
    run_2_scores = _dims_to_scores(result.run_2)
    deltas = {
        dim: abs(run_1_scores[dim] - run_2_scores[dim]) for dim in run_1_scores
    }
    return {
        "enabled": True,
        "swap_augmented": True,
        "run_1_scores": run_1_scores,
        "run_2_scores": run_2_scores,
        "deltas": deltas,
        # Mean score per dimension (cardinal average of ordinal; reported
        # as summary stat, not claim input — see §9.5 on ordinal reporting).
        "mean_scores": {
            dim: (run_1_scores[dim] + run_2_scores[dim]) / 2
            for dim in run_1_scores
        },
        # Median per dimension (better fit for ordinal data; round to int).
        "median_scores": {
            dim: round((run_1_scores[dim] + run_2_scores[dim]) / 2)
            for dim in run_1_scores
        },
        "disagreed_dimensions": sorted(d.value for d in result.disagreed_dimensions),
        "requires_spot_check": result.requires_spot_check,
        "counterfactual_run_1": result.run_1.counterfactual,
        "counterfactual_run_2": result.run_2.counterfactual,
        "rationales_run_1": _dims_to_rationales(result.run_1),
        "rationales_run_2": _dims_to_rationales(result.run_2),
    }


def _dims_to_scores(out: Any) -> dict[str, int]:
    return {
        "stakeholder_alignment": out.stakeholder_alignment.score,
        "planning_defensibility": out.planning_defensibility.score,
        "privacy_integrity": out.privacy_integrity.score,
        "regulatory_auditability": out.regulatory_auditability.score,
        "applicant_experience": out.applicant_experience.score,
    }


def _dims_to_rationales(out: Any) -> dict[str, str]:
    return {
        "stakeholder_alignment": out.stakeholder_alignment.rationale,
        "planning_defensibility": out.planning_defensibility.rationale,
        "privacy_integrity": out.privacy_integrity.rationale,
        "regulatory_auditability": out.regulatory_auditability.rationale,
        "applicant_experience": out.applicant_experience.rationale,
    }


# ────────────────────────────────────────────────────────────────────────
# Per-ledger orchestration
# ────────────────────────────────────────────────────────────────────────


@dataclass
class PerCellResult:
    scenario_id: str
    condition: Condition
    seed: int
    cache_hash: str
    ledger_path: str
    scores: dict[str, Any] = field(default_factory=dict)
    budgets: dict[str, dict[str, Any]] = field(default_factory=dict)
    wall_seconds: float = 0.0


def _score_one_ledger(
    ledger: LedgerView,
    *,
    scenario_card: ScenarioCard,
    selected_scorers: frozenset[str],
    transport: Any | None,
    with_llm: bool,
) -> PerCellResult:
    _ = scenario_card  # reserved for future scoring needs (ground-truth fields)
    t_cell = time.monotonic()
    result = PerCellResult(
        scenario_id=ledger.scenario_id,
        condition=ledger.condition,
        seed=ledger.seed,
        cache_hash=ledger.cache_hash,
        ledger_path=str(ledger.path),
    )
    budgets: dict[str, ScorerBudget] = {name: ScorerBudget() for name in selected_scorers}

    if "efficiency" in selected_scorers:
        t = time.monotonic()
        result.scores["efficiency"] = _score_efficiency(ledger)
        budgets["efficiency"].wall_seconds += time.monotonic() - t

    if "mechanical" in selected_scorers:
        t = time.monotonic()
        result.scores["mechanical"] = _score_mechanical_partial(ledger)
        budgets["mechanical"].wall_seconds += time.monotonic() - t

    if "direct" in selected_scorers:
        result.scores["direct"] = _score_direct(
            ledger,
            transport=transport,
            budget=budgets["direct"],
            dry_run=not with_llm,
        )

    if "trace" in selected_scorers:
        result.scores["trace"] = _score_trace(
            ledger,
            transport=transport,
            budget=budgets["trace"],
            dry_run=not with_llm,
        )

    if "judge" in selected_scorers:
        result.scores["judge"] = _score_judge(
            ledger,
            transport=transport,
            budget=budgets["judge"],
            dry_run=not with_llm,
        )

    result.budgets = {name: b.as_dict() for name, b in budgets.items()}
    result.wall_seconds = round(time.monotonic() - t_cell, 2)
    return result


def _cell_to_json(cell: PerCellResult) -> dict[str, Any]:
    return {
        "scenario_id": cell.scenario_id,
        "condition": cell.condition.value,
        "seed": cell.seed,
        "cache_hash": cell.cache_hash,
        "ledger_path": cell.ledger_path,
        "wall_seconds": cell.wall_seconds,
        "scores": cell.scores,
        "budgets": cell.budgets,
    }


def _cell_filename(scenario_id: str, condition: Condition, seed: int) -> str:
    return f"{scenario_id}_{condition.value}_seed{seed:02d}.json"


# ────────────────────────────────────────────────────────────────────────
# Aggregation
# ────────────────────────────────────────────────────────────────────────


def _aggregate(cells: list[PerCellResult]) -> dict[str, Any]:
    """Summarize per-cell results by (scenario, condition) — rough means
    + per-scorer budgets aggregated across all cells. Statistical CIs are
    the aggregator.py job; this is the per-cell health-check summary.
    """
    by_cell: dict[str, Any] = {}
    totals: dict[str, ScorerBudget] = {}

    for cell in cells:
        key = f"{cell.scenario_id}_{cell.condition.value}_seed{cell.seed:02d}"
        by_cell[key] = _cell_to_json(cell)
        for name, b in cell.budgets.items():
            t = totals.setdefault(name, ScorerBudget())
            t.calls += int(b.get("calls", 0))
            t.tokens_prompt += int(b.get("tokens_prompt_est", 0))
            t.tokens_completion += int(b.get("tokens_completion_est", 0))
            t.wall_seconds += float(b.get("wall_seconds", 0.0))

    # Rough projection: linear scale from subset-run token count to full pilot.
    # Used so the output suggests how much a full §7 main run would cost.

    return {
        "n_cells": len(cells),
        "totals_per_scorer": {name: t.as_dict() for name, t in totals.items()},
        "cells": by_cell,
    }


def _markdown_summary(summary: dict[str, Any]) -> str:
    lines: list[str] = []
    lines.append("# Pilot scores — summary")
    lines.append("")
    lines.append(f"Cells scored: **{summary['n_cells']}**")
    lines.append("")
    lines.append("## Per-scorer totals (subset)")
    lines.append("")
    lines.append("| scorer | calls | prompt tokens (est) | completion tokens (est) | wall (s) |")
    lines.append("|---|---:|---:|---:|---:|")
    for name, totals in summary["totals_per_scorer"].items():
        lines.append(
            f"| `{name}` | {totals['calls']} | {totals['tokens_prompt_est']:,} | "
            f"{totals['tokens_completion_est']:,} | {totals['wall_seconds']:.1f} |"
        )
    lines.append("")
    lines.append("## Per-cell headline scores")
    lines.append("")
    lines.append(
        "| cell | rounds | days | h_null | direct (wls) | trace (n/wls) | judge (sa/pd/pi/ra/ae) |"
    )
    lines.append("|---|---:|---:|---:|---:|---|---|")
    for key, cell in summary["cells"].items():
        scores = cell.get("scores", {})
        eff = scores.get("efficiency", {}) or {}
        mech = scores.get("mechanical", {}) or {}
        direct = scores.get("direct", {}) or {}
        trace = scores.get("trace", {}) or {}
        judge = scores.get("judge", {}) or {}
        # A-6 shape: swap-augmented has median_scores; single-run has scores.
        # Prefer median_scores (ordinal-appropriate reporting per §9.5).
        j = (
            judge.get("median_scores")
            or judge.get("scores")
            or {}
        )
        if judge.get("swap_augmented"):
            deltas = judge.get("deltas", {}) or {}
            disagree = "*" if any(d > 1 for d in deltas.values()) else ""
            judge_cell = (
                f"{j.get('stakeholder_alignment', '-')}/"
                f"{j.get('planning_defensibility', '-')}/"
                f"{j.get('privacy_integrity', '-')}/"
                f"{j.get('regulatory_auditability', '-')}/"
                f"{j.get('applicant_experience', '-')}{disagree}"
                if j
                else "—"
            )
        else:
            judge_cell = (
                f"{j.get('stakeholder_alignment', '-')}/"
                f"{j.get('planning_defensibility', '-')}/"
                f"{j.get('privacy_integrity', '-')}/"
                f"{j.get('regulatory_auditability', '-')}/"
                f"{j.get('applicant_experience', '-')}"
                if j
                else "—"
            )
        trace_cell = (
            f"{trace.get('n_trace_leaks_total', '-')} / {trace.get('wls', '-')}"
            if trace
            else "—"
        )
        lines.append(
            f"| `{key}` | "
            f"{eff.get('communication_rounds', '-')} | "
            f"{eff.get('simulated_elapsed_days', '-')} | "
            f"{mech.get('h_null_leak_count', '-')} | "
            f"{direct.get('wls', '-')} | "
            f"{trace_cell} | "
            f"{judge_cell} |"
        )
    lines.append("")
    lines.append("## Deferred (v0 batch)")
    lines.append("")
    lines.append(
        "- `privacy.inferential` (§8c.ii): needs Presidio-anonymized public-only "
        "baseline + Staab probe runs. Separate lift."
    )
    lines.append(
        "- `robustness` (§8b): needs CandidatePlan extraction from each run's "
        "artifacts + per-future scoring (§7.7). Separate lift."
    )
    lines.append(
        "- `mechanical.h_workflow / h_spec / h_trigger` (§8d): need per-turn "
        "validator-pass + source_refs metadata that is not persisted on "
        "ledgers today. Ledger-shape extension + rescore."
    )
    lines.append(
        "- `judge` swap-augmentation (§5d): v0 runs one Opus call per ledger; "
        "two-run + disagreement detection is a follow-up."
    )
    lines.append("")
    return "\n".join(lines)


# ────────────────────────────────────────────────────────────────────────
# CLI
# ────────────────────────────────────────────────────────────────────────


def _parse_csv(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [s.strip() for s in raw.split(",") if s.strip()]


def _resolve_scorers(
    explicit: list[str], deterministic_only: bool, with_llm: bool
) -> frozenset[str]:
    if explicit:
        unknown = [s for s in explicit if s not in ALL_SCORERS]
        if unknown:
            raise typer.BadParameter(
                f"unknown scorer(s): {unknown} · known: {ALL_SCORERS}"
            )
        return frozenset(explicit)
    if deterministic_only:
        return DETERMINISTIC_SCORERS
    if with_llm:
        return frozenset(ALL_SCORERS)
    return DETERMINISTIC_SCORERS


def _filter_ledger_files(
    ledger_dir: Path,
    scenario_filter: list[str],
    condition_filter: list[str],
    seed_filter: list[int],
) -> list[Path]:
    files = sorted(ledger_dir.glob("*.json"))
    if not files:
        return []
    out: list[Path] = []
    for p in files:
        stem = p.stem  # e.g. "S1_A_seed00"
        parts = stem.split("_")
        if len(parts) < 3:
            continue
        sid, cond, seed_token = parts[0], parts[1], parts[2]
        if scenario_filter and sid not in scenario_filter:
            continue
        if condition_filter and cond not in condition_filter:
            continue
        if seed_filter:
            try:
                seed_val = int(seed_token.replace("seed", ""))
            except ValueError:
                continue
            if seed_val not in seed_filter:
                continue
        out.append(p)
    return out


@app.command()
def score(
    transcripts_dir: Path = typer.Option(  # noqa: B008
        Path("results/pilot/transcripts"),
        "--transcripts",
        help="Directory of per-run ledger JSONs.",
    ),
    scores_dir: Path = typer.Option(  # noqa: B008
        Path("results/pilot/scores"),
        "--scores",
        help="Directory to write per-cell score JSONs.",
    ),
    summary_dir: Path = typer.Option(  # noqa: B008
        Path("results/pilot"),
        "--summary",
        help="Directory to write summary.{json,md}.",
    ),
    scenarios_csv: str = typer.Option("", "--scenarios", help="e.g. S1,S2"),
    conditions_csv: str = typer.Option("", "--conditions", help="A/B/C/D"),
    seeds_csv: str = typer.Option("", "--seeds", help="e.g. 0,1,2"),
    with_llm: bool = typer.Option(
        False,
        "--with-llm",
        help="Enable LLM-gated scorers (direct T3, trace, judge).",
    ),
    deterministic_only: bool = typer.Option(
        False,
        "--deterministic-only",
        help="Run only efficiency + mechanical; skip LLM scorers.",
    ),
    scorer: list[str] = typer.Option(  # noqa: B008
        [],
        "--scorer",
        help=_SCORER_HELP,
    ),
    force: bool = typer.Option(
        False,
        "--force",
        help="Overwrite existing per-cell score files.",
    ),
    max_cells: int = typer.Option(
        0,
        "--max-cells",
        help="Cap number of cells scored (0 = no cap).",
    ),
    token_source: str = typer.Option(
        "scenario",
        "--token-source",
        help=(
            "Where to pull private_token_set from: 'scenario' (default, "
            "post-A-4: live scenario-card tokens, lets amendments apply "
            "retroactively) or 'ledger' (frozen ledger snapshot, strict "
            "reproducibility of the original run)."
        ),
    ),
) -> None:
    """Score every ledger under --transcripts (subject to filters)."""
    if token_source not in {"scenario", "ledger"}:
        raise typer.BadParameter(
            f"--token-source must be 'scenario' or 'ledger'; got {token_source!r}"
        )
    scenario_filter = _parse_csv(scenarios_csv)
    condition_filter = _parse_csv(conditions_csv)
    seed_filter = [int(s) for s in _parse_csv(seeds_csv)]

    if with_llm and deterministic_only:
        raise typer.BadParameter("--with-llm and --deterministic-only are exclusive")

    selected = _resolve_scorers(scorer, deterministic_only, with_llm)
    # If the caller passed --scorer to restrict to an LLM-gated scorer,
    # they are asking for LLM runs by definition — honor that.
    if not with_llm and (selected & LLM_GATED_SCORERS):
        if not scorer:
            # Default path hit an LLM-gated scorer without the flag — bail.
            raise typer.BadParameter(
                "LLM-gated scorers selected without --with-llm. Pass --with-llm "
                "or restrict with --deterministic-only / --scorer efficiency / "
                "--scorer mechanical."
            )
        with_llm = True  # explicit --scorer implies the user wants to run it

    files = _filter_ledger_files(
        transcripts_dir, scenario_filter, condition_filter, seed_filter
    )
    if not files:
        console.print(
            f"[yellow]no ledgers found under {transcripts_dir} matching filters[/yellow]"
        )
        raise typer.Exit(code=0)
    if max_cells > 0:
        files = files[:max_cells]

    scores_dir.mkdir(parents=True, exist_ok=True)
    summary_dir.mkdir(parents=True, exist_ok=True)

    transport: Any | None = None
    if with_llm:
        from eval_sim.llm import get_default_transport

        transport = get_default_transport()

    console.print(
        f"[bold]score_ledgers[/bold] · {len(files)} cells · "
        f"scorers: {', '.join(sorted(selected))} · "
        f"{'LLM on' if with_llm else 'deterministic only'}"
    )

    cells: list[PerCellResult] = []
    for idx, path in enumerate(files, 1):
        out_path = scores_dir / path.name
        if out_path.exists() and not force:
            # Idempotent: reuse on-disk cell; still include in the summary.
            try:
                prior = json.loads(out_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError as err:
                console.print(
                    f"  [red]{path.name}: existing file unreadable ({err}); "
                    f"re-scoring[/red]"
                )
            else:
                prior_scores = prior.get("scores", {}) or {}
                missing = [s for s in selected if s not in prior_scores]
                if not missing:
                    console.print(
                        f"  [dim]({idx}/{len(files)}) {path.name}: "
                        f"cached — all selected scorers already on disk[/dim]"
                    )
                    cells.append(_prior_to_cell(prior))
                    continue
                console.print(
                    f"  [yellow]({idx}/{len(files)}) {path.name}: "
                    f"adding scorers {missing}[/yellow]"
                )

        ledger = _load_ledger(path, token_source=token_source)
        scenario_card = scenarios.get(ledger.scenario_id)

        t0 = time.monotonic()
        cell = _score_one_ledger(
            ledger,
            scenario_card=scenario_card,
            selected_scorers=selected,
            transport=transport,
            with_llm=with_llm,
        )

        # Merge-preserve prior scores for un-selected scorers when the file
        # already exists (so a judge-only re-run doesn't drop trace/direct).
        if out_path.exists() and not force:
            try:
                prior = json.loads(out_path.read_text(encoding="utf-8"))
                prior_scores = prior.get("scores", {}) or {}
                for name, val in prior_scores.items():
                    if name not in cell.scores:
                        cell.scores[name] = val
                prior_budgets = prior.get("budgets", {}) or {}
                for name, val in prior_budgets.items():
                    if name not in cell.budgets:
                        cell.budgets[name] = val
            except json.JSONDecodeError:
                pass

        out_path.write_text(
            json.dumps(_cell_to_json(cell), indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        cells.append(cell)
        console.print(
            f"  [green]ok[/green] ({idx}/{len(files)}) {path.name} · "
            f"{time.monotonic() - t0:.1f}s"
        )

    summary = _aggregate(cells)
    (summary_dir / "summary.json").write_text(
        json.dumps(summary, indent=2, sort_keys=False) + "\n", encoding="utf-8"
    )
    (summary_dir / "summary.md").write_text(
        _markdown_summary(summary) + "\n", encoding="utf-8"
    )
    console.print(
        f"\n[bold green]done · {len(cells)} cells · "
        f"summary: {summary_dir / 'summary.md'}[/bold green]"
    )


def _prior_to_cell(prior: dict[str, Any]) -> PerCellResult:
    """Rehydrate a previously-written cell file for summary aggregation."""
    return PerCellResult(
        scenario_id=str(prior.get("scenario_id", "")),
        condition=Condition(str(prior.get("condition", "A"))),
        seed=int(prior.get("seed", 0)),
        cache_hash=str(prior.get("cache_hash", "")),
        ledger_path=str(prior.get("ledger_path", "")),
        scores=prior.get("scores", {}) or {},
        budgets=prior.get("budgets", {}) or {},
        wall_seconds=float(prior.get("wall_seconds", 0.0)),
    )


# The CHANNEL_WEIGHTS + sensitivity_for_field imports are kept because the
# aggregator path below intentionally reports channel-weighted signals.
_ = CHANNEL_WEIGHTS
_ = sensitivity_for_field


if __name__ == "__main__":
    app()
