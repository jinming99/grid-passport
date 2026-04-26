# packages/eval-sim — Grid Passport simulation bench

**Single source of truth:** `../../docs/evals/sim-bench-design.md`. Read that
first. This package is the implementation of that pre-registration, nothing
more. Edits to the simulation semantics are amendments to that doc; silent
behavior changes post-lock are a methodological failure.

## What this package is

Multi-agent simulation of the applicant ↔ utility ↔ regulator interconnection
workflow under four conditions (Oracle / NDA-email / prompt-only AI / Grid
Passport) × seven scenarios × five seeds. Outputs:

- Outcome Preservation Ratio + Savage regret (hybrid, per §8b)
- Three-type composite privacy scorer — direct / inferential / trace (per §8c)
- Mechanical compliance (H-workflow / H-spec / H-trigger / H-null, per §8d)
- Five-dimension Opus-judge scoring (per §8e)

Results are aggregated with BCa bootstrap 95% CIs, quadratic-weighted Cohen's
κ per dimension, length-residual regression for length-bias control. Raw
transcripts are gitignored; aggregated results + per-scenario summaries +
cache hashes are committed.

## What this package is NOT

- Not the policy / projection / bundle code. That lives in `packages/core/`,
  `packages/policy/`, `packages/verifier/`, and their Python/Rust mirrors.
- Not the shipping Skills. Those live in `.claude/skills/` and are bundled
  into the desktop app.
- Not an interactive tool. Every run is deterministic by seed; every
  interactive choice is locked at pre-registration.

## Status

**§17 sign-off:** pending Ming. Once signed, edits to sim-bench-design.md
require amendments per §3.2 of that doc. This package may evolve freely
until lock; after lock, semantic edits require a parallel amendment.

## Layout

```
packages/eval-sim/
├── pyproject.toml        uv-managed · Python ≥3.12 (Concordia requirement)
├── README.md             this file
├── eval_sim/
│   ├── schemas/          Pydantic models — ScenarioCard, Future, CI 5-tuple,
│   │                     JudgeOutput, TurnMessage, CaseInput mirror
│   ├── config.py         constants — turnaround days, failure-mode rates,
│   │                     channel weights, sensitivity weights, model tiers
│   ├── scenarios/        7 scenario cards as typed instances (S1–S7)
│   ├── agents/           per-role Concordia EntityAgent classes (stubs for now)
│   ├── channels/         4 condition-specific Game Masters (stubs for now)
│   ├── scorers/          composite privacy / robustness / efficiency /
│   │                     mechanical / judge orchestration (stubs for now)
│   ├── fixtures/
│   │   └── cartographer-cache/   one JSON fixture per scenario · SHA-256 hashed
│   ├── runner.py         single-run orchestrator (scenario × condition × seed)
│   └── aggregator.py     BCa CIs + κ + length-residual regression
├── scripts/
│   ├── pilot.py          1 seed × 7 scenarios × 4 conditions = 28 runs +
│   │                     3-seed S1/S3/S7 fairness check (§10.5)
│   └── main.py           5 seeds × 7 scenarios × 4 conditions = 140 runs
│                         + 35 oracle + 280 judge (§7.replication)
├── tests/                pytest — verifies scenario cards load + schemas round-trip
└── results/              aggregated (committed) · raw transcripts (gitignored)
```

## Prereqs

- Python 3.12+ (Concordia requirement)
- [uv](https://docs.astral.sh/uv/) — one-time:
  `curl -LsSf https://astral.sh/uv/install.sh | sh`

## Run

```sh
cd packages/eval-sim
uv sync
uv run pytest                      # schema round-trip tests
# uv run python -m scripts.pilot   # not live until §17 signed + agents impl'd
# uv run python -m scripts.main    # not live until §17 signed + agents impl'd
```

## Deps surface — narrow on purpose

Per sim-bench-design.md §12.1, hard deps are deliberately narrow:

| Dep | Role | License |
|---|---|---|
| `gdm-concordia` | GM pattern + `EntityAgent` + `ContextComponent` | Apache 2.0 |
| `presidio-analyzer` | PII recognizers for direct-leakage Tier-1 | MIT |
| `anthropic` | Claude API for agent / judge / probe / scorer | MIT |
| `scipy` + `scikit-learn` + `statsmodels` | BCa bootstrap + κ + length regression | BSD |
| `pydantic` | typed scenario cards + judge output schema | MIT |
| `typer` + `rich` | CLI + readable progress | MIT / MIT |

Everything else is citation, not dependency — see sim-bench-design.md §2 for
the lift / reference distinction.

## Not yet wired

- Runtime LLM calls — §17 sign-off required before any run
- S4 private-token set — placeholder in sim-bench-design.md §7 S4; concretize
  in Week 1 scenario authoring
- Bhawuk's utility-prompt review — deferred to post-lock amendment per user
  directive 2026-04-19 (see handoff Now block)
