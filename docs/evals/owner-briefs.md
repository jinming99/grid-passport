# Simulation-bench owner briefs

> **Re-scoped 2026-04-20.** Replaces the earlier 3-owner canned-fixture allocation (archived below as a historical appendix). Current design: hybrid ownership for the #14 simulation bench per `docs/evals/sim-bench-design.md` §13.

This doc is the onboarding pack for anyone joining the bench work. Read it first; `sim-bench-design.md` is the normative spec.

---

## Ownership at a glance

| Role | Who | What they own |
|---|---|---|
| **Bench architect** | Ming | Scenario cards, role prompts, judge rubric, analysis, results write-up. |
| **Engine owner** | One student (previously "Owner A" in the archived brief below) | `packages/eval-sim/` substrate + pilot + main run + aggregation. |
| **Utility-prompt review** | Bhawuk (Dominion Energy) | ~1-hour critique of the §5b utility role prompt before main run starts. |

Work on this project happens against the pre-registered design. Edits to scenario cards, prompts, locked scorer bytes, or success criteria after §17 sign-off require a §3.2 amendment block in `sim-bench-design.md`. This is not paperwork — it is the discipline the research thesis is built on (see `docs/design/research-thesis.md` §3.1).

---

## Where to start — engine owner

### Day 1 — orient

1. **Read** `docs/evals/sim-bench-design.md` end to end. Especially §3 (pre-registration discipline), §4 (four conditions), §7 (scenario cards), §8 (scorers), §10 (protocol).
2. **Read** `docs/design/research-thesis.md` — the four claims this bench feeds evidence to.
3. **Read** `docs/plans/handoff.md` §Phases and §Now — current repo state.
4. **Run the gates**: `cd packages/eval-sim && uv sync --dev && uv run pytest && uv run ruff check && uv run pyright` — ~90s first run, under 3s warm.
5. **Read** `docs/evals/sim-bench-results.md` — what has been measured so far and what's deferred.

### Day 2–5 — first useful contribution

Pick one of the deferred axes in `sim-bench-results.md` and land it. In priority order:

| Axis | Spec | Lift | Why it matters |
|---|---|---|---|
| `CandidatePlan` extraction from ledger artifacts | [`specs/candidate-plan-extraction.md`](specs/candidate-plan-extraction.md) | ~2–3 days | Unlocks §8b Robustness (OPR + Savage regret). Without plan extraction, the central outcome-preservation metric is stubbed. **Highest lift.** |
| Cross-check Referee Skill (§3.2 verifiable subset) | [`specs/P1_3-cross-check-referee-skill.md`](specs/P1_3-cross-check-referee-skill.md) | ~3–4 weeks | Ships the partial revelation-principle piece. New Skill + CI validator + baseline. |
| Strategic-misreport benchmark (§3.2 non-amplification) | [`specs/P1_2-strategic-misreport-benchmark.md`](specs/P1_2-strategic-misreport-benchmark.md) | ~3–5 weeks | Direct measurement of substrate-vs-prompt equivalence rate under shaded inputs. |
| Proper-scoring-rule calibration harness (§3.2 unverifiable subset) | [`specs/P1_4-proper-scoring-rule-calibration.md`](specs/P1_4-proper-scoring-rule-calibration.md) | ~2–3 weeks | Interviewer distribution-elicitation + CRPS scoring. Depends on P1.2 authoring for intake variants. |
| Ledger-shape extension for `validator_pass_per_turn` + `source_refs` metadata | no spec yet | ~2 days | Unlocks the full §8d mechanical compliance axes (H-workflow, H-spec, H-trigger). Currently only H-null runs. |
| Presidio + Staab probe pipeline for §8c.ii inferential lift | no spec yet | ~2–3 days | Adds the third privacy-leakage type (currently only direct + trace are live). |

Whichever you pick: the score-batch is idempotent per-axis (`scripts/score_ledgers.py --scorer <name>`) so you can iterate without re-running the whole thing. Each spec file is self-contained — read it end-to-end before starting.

### What "ready to run the main sweep" looks like

- [ ] At least three of the four deferred axes above wired.
- [ ] Bhawuk's utility-prompt review completed and any amendments (§3.2) landed.
- [ ] `pnpm agents:metrics:check` green (substrate side).
- [ ] Fairness pilot (§6e; 12 runs) run and scored — `pilot.py --fairness` dispatch is already wired (step 6c landed 2026-04-20).
- [ ] Seed expansion (§14 step 6b) either completed or justified as unnecessary by 12-subset CI analysis.
- [ ] `sim-bench-results.md` — all n=1 tables replaced with BCa-CI tables.

---

## What changes and what doesn't

Changes on an amendment block in `sim-bench-design.md` §3.2:

- Locked prompt bytes (judge, paraphrase judge, trace classifier, Staab probe).
- Scorer algorithms for any locked axis.
- Success criteria (§9) or thresholds.
- Scenario-card private fields or CI 5-tuples.
- Model-tier assignments (§5e).

Non-violating changes (scenario-additive per §3.3, pre-run data-edit per §3.2):

- New scenarios added after §7 lock.
- Scenario-card `private_token_set` edits before first main run (documented in the amendment).
- Ledger-shape extensions (adding new scorer-inputs fields on ledgers — scorers that don't read them keep working).
- New scorer axes that don't modify existing locked scorers.

When in doubt, write the amendment first; implementing is ~10 minutes, but explaining post-hoc why the scorer changed mid-run is a credibility tax you don't want to pay.

---

## Escalation

- **Rubric interpretation disputes** → Ming.
- **Changes to `packages/core/` projection / policy / audit code** → Ming (these are trust-critical; see `CLAUDE.md`).
- **Upstream domain-source changes** (EPRI MOSAIC spec, VA DEQ tier structure, FEMA flood-zone codes, FERC Order 2023 revisions, HHS Safe Harbor updates) → Ming + the `docs/plans/roadmap.md` backlog entry for that domain.
- **Cost overrun** (budget is §14 cost estimate ~$400–$1200) → pause main run, ping Ming.
- **Scorer output that contradicts a pre-registered §9 claim** → **report it as a finding**. Do not quietly discard. Per §11 the bench is intended to produce honest null results; those are as valuable as positive results.

---

## Cross-cutting notes

- **Package root.** `packages/eval-sim/` is uv-managed Python 3.12+. One Cargo-equivalent for the Python ecosystem. Don't pip-install anything; edit `pyproject.toml` + `uv sync`.
- **Seeds.** Fixed seeds on every deterministic step (failure-mode sampler uses SHA256 + scenario + seed; paraphrase component uses per-turn-counter + seed). LLM calls do NOT have deterministic output — each replay is a new draw. This is pre-registered per §6a.
- **Don't hand-edit locked prompt bytes.** Every locked string in `scorers/` + `agents/prompts.py` has a regression-fence test. If CI fails for a prompt reason, it means you changed locked bytes — either revert or add a §3.2 amendment block before merging.
- **Commit cadence.** One logical unit per commit (new axis wired, amendment block landed, etc.). Make commits land a consistent state: tests green, scorer batch re-runnable.
- **Scorer batch is the workflow.** Don't write ad-hoc analysis scripts. If you need a new view, add a flag to `score_ledgers.py` or a column to `summary.md`.

---

## Historical appendix — archived 3-owner brief (pre-2026-04-19)

The earlier design for #14 was a 3-owner split (Owner A: eval scaffolding; Owner B: Interviewer Skill; Owner C: Cartographer Skill) scoring canned fixture grids against a 4-axis rubric. That design was superseded when #14 was re-scoped to a multi-agent simulation bench with hybrid ownership.

What's preserved from the archived design:

- The Interviewer + Cartographer Skills themselves shipped (2026-04-18). The paired CI validators + mechanically-derived baselines + substrate-metrics panel are all in `packages/agents/`.
- The 4-axis rubric is folded into §8d of the new bench design as the "mechanical compliance" axis, scored on live simulation turns rather than canned fixtures.
- The Explainer Skill assignment is deferred; see `docs/plans/roadmap.md` #13.

The archived file (with the per-owner task breakdown) is preserved in git history — look up the file at commit `0d9c0ab` or earlier.
