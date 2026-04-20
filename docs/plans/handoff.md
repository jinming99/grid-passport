# Grid Passport — Handoff

Durable record of project state, decisions, and what future work needs to know. Read this first when resuming — it's versioned with the code, so it won't drift the way out-of-repo notes do.

## Starting a new session? Start here.

1. Read this file (you're already here).
2. Read the "Now" block at the end of §Phases — it points to the single next item and flags any gating concerns.
3. Read `docs/plans/roadmap.md` near-term section for the expanded breakdown of the next item.
4. Before touching the bundle/signer/verifier/audit code, read `docs/design/signed-bundle.md` + `docs/design/signed-bundle-spec.md`.
5. Before scoping a new agent or adding a `CaseInput` field, read `docs/design/research-thesis.md` — the "schema is the safety case" framing is load-bearing and should shape write-scope, SKILL.md constraints, and eval targets. `docs/vision.md` §4b (5-test filter) is the upstream check for any new field; also add an entry to `packages/core/src/ask-reasons.ts`.
6. **If working on the eval harness (#14, simulation bench):** `docs/evals/sim-bench-design.md` is the single source of truth — it is the pre-registration document, currently pending Ming's §17 sign-off (Amendments A-1 and A-2 both applied 2026-04-19; A-2 is a pre-lock thesis-framing sharpening that scopes the claim, restructures §1.5 into methodology + realism-engineering, decomposes H-spec.hallucination, and adds §9.4 thesis-refinement paths). All implementation lives under `packages/eval-sim/` (to be created). The earlier `docs/evals/rubric.md` + `docs/evals/owner-briefs.md` are superseded and retained as historical artifacts; do not build against them.
7. Run all gates to confirm the tree is clean: `pnpm typecheck && pnpm privacy:canary && pnpm desktop:typecheck && pnpm canary:desktop && pnpm utility:typecheck && pnpm canary:utility && pnpm core:test && pnpm verifier:test && pnpm canary:bundle && pnpm canary:roundtrip && pnpm desktop:test && pnpm agents:typecheck && pnpm agents:validate && pnpm agents:baseline:check && pnpm agents:metrics:check` — ~16s wall-clock (15 gates including gate 15 `canary:utility`).

## Identity

- **Product + brand:** Grid Passport
- **Tagline:** Truth without disclosure
- **One-liner:** Confidential coordination workflow for large-load grid interconnection. Applicants submit private load/site/flexibility inputs; utilities and regulators see only policy-approved projections and derived proofs.
- **Repo:** https://github.com/jinming99/grid-passport (private)
- **Canonical harness:** `grid-passport-harness/` (8 specs + CLAUDE.md + 6 subagent prompts in `.claude/agents/`)
- **Vision + design choices:** `docs/vision.md` — read this to understand *why this shape*. Includes team & origins (§0), the schema-justification 5-test filter (§4b) — read before adding any new `CaseInput` field, the local-first trust pivot (§5), the reliability triad and "agents propose, humans dispose" framing (§5b–§5c), and why the web demo + Tauri app coexist (§10).
- **Privacy mechanism case:** `docs/privacy-claim.md` — read this for the mechanical-evidence story.
- **Signed disclosure bundle protocol (rationale):** `docs/design/signed-bundle.md` — threat model, 8 design decisions with IETF/W3C citations + rejected alternatives, 10-Q demo defense, post-quantum migration path. Read for *why*.
- **Signed disclosure bundle protocol (normative spec):** `docs/design/signed-bundle-spec.md` — RFC 2119 wire format, sign/verify algorithms, canonical test vectors, conformance checklist for new implementations, versioning policy, reproducibility commands. Read for *what*.
- **Research thesis (living):** `docs/design/research-thesis.md` — "the schema is the safety case"; four claims tied to literature gaps (schema-as-safety-case · agent-as-non-strategic-intermediary · projection-as-purity · write-scope contracts as capability-based security); per-agent write-scope table; three spin-out research questions; honest gap inventory of what #14 needs to measure; adjacent communities to cite + engage. Load-bearing for public research framing — re-read before scoping a new agent or eval.
- **Research roadmap (living, strategy layer):** `docs/design/research-roadmap.md` — **which claims to prioritize** given shipped evidence + 2026 adjacent-literature scan. Paired-lead recommendation: §3.2 (revelation-principle as architecture) + §3.4 (capability-based security reframe for LLMs) as the twin research program. §3.1 + §3.3 become supporting. Priority queue for what to build next, tagged with Ming / student / collaborator ownership. Competitive-positioning snapshot (2026-04-20 scan) identifies where the whitespace is. Re-evaluate quarterly.
- **Public-facing protocol page:** `/protocol` route (`apps/web/app/protocol/page.tsx`) — surfaces threat model + primitives + verify-it-yourself commands. Not swept under the carpet: linked from landing nav, footer, and `/about` header.
- **Agent architecture + Claude Skills + research connection:** `docs/agents.md` — trust principles mapped to the reliability triad (§2), human-AI collaboration framing (§3), agent roster, Claude Agent Skills implementation pattern, eval framework with concrete N-targets and student-handoff task breakdown (§7), Ming Jin's research agenda on calibrating skills for workflow / human-preference / domain-spec alignment (§6).
- **Story / research narrative:** `docs/story.md` — single source of truth for public presentations and for the project website's `/about` page. §6 (empirical results) gates on the eval harness landing; holds a placeholder until then.
- **Simulation bench pre-registration (the #14 eval harness):** `docs/evals/sim-bench-design.md` — pre-registered multi-agent simulation of applicant ↔ utility ↔ regulator interconnection workflow under 4 conditions (Oracle / NDA-email / prompt-only AI / Grid Passport) × 7 scenarios (S1–S6 grid + S7 HIPAA priorauth) × 5 seeds. OPR + Savage-regret hybrid outcome metric; three-type composite privacy scorer (direct / inferential / trace); Prometheus-style 5-grade rubric across 5 dimensions grounded against external standards (FERC Order 2023, SOC 2 TSC, NERC CMEP). Supersedes `docs/evals/rubric.md` (kept as historical). Amendments A-1, A-2, A-3, A-4 all applied (A-4 post-6d scorer-batch finding on 2026-04-20 — pending Ming sign-off).
- **Simulation bench results (living, #14 output):** `docs/evals/sim-bench-results.md` — what has been measured so far (currently 12-subset directional signal, n=1 per cell), what's deferred (robustness/OPR, inferential lift, judge swap augmentation), how to regenerate, and the "keep this doc alive" update contract that mirrors `research-thesis.md` §9. Referenced from `docs/story.md` §6b and from `docs/evals/owner-briefs.md`.
- **Simulation bench owner briefs (post-rescope):** `docs/evals/owner-briefs.md` — onboarding pack for new bench contributors (engine owner role). Day-1 reading list, priority queue of deferred axes to unblock, §3.2 amendment discipline, escalation path. Historical appendix preserves the earlier 3-owner canned-fixture design.
- **Master plan / roadmap:** `docs/plans/roadmap.md` — *what's shipping next, in what order, with mechanical "done" criteria*. Single source of truth for the build queue and the open decision log.
- **Team:** Ming Jin (faculty mentor, project lead — vision/design/foundation); Bhawuk Luthra (student + Dominion Energy employee — co-conceptualizer + co-developer + hackathon participant); Vikrant Bhati (co-developer + hackathon participant). Bhawuk's Dominion affiliation is the load-bearing credibility anchor for the case studies.

## Phases

| Phase | Scope | Status |
|---|---|---|
| 0   | Next.js scaffold · dual-view role toggle · sealed placeholders | done |
| 0.5 | Three cases (Owl Compute / Lantern Cloud / Kraken Train) + selector + dynamic route | done |
| 0.6 | Counterfactual slider (applicant-only) · deterministic forecaster · `/api/scenario` | done |
| 1a  | Server-side projection · raw private values never in utility/regulator HTML | done |
| 1b  | Rego as canonical policy · regulator panel with source + sha-256 | done |
| 1c  | FastAPI parity scaffold at `apps/api/` (not on hot path) | done |
| 2   | MapLibre evidence panel + synthetic GeoJSON · signed audit trail with 5 named actors | done |
| 3a  | Git init + first commit + private GitHub push | done |
| 3b  | Vercel deploy | done — https://grid-passport.vercel.app |
| 3c  | Privacy canary (TS↔Rego↔Python drift, structural, audit-action scan) + `docs/privacy-claim.md` · audit baseline-flex leak fixed | done |
| 3d  | Vision + trust-model pivot: `docs/vision.md` — local-first applicant tool is the production form; web demo is a teaching artifact; TEE no longer critical-path | done |
| 3e  | Privacy Benefit Panel (replaces LeakCounter) · `/about` story page v1 — classified-briefing × SCADA design pass via `/frontend-design` plugin skill | done |
| 3f  | Landing page v1 (`/` problem-first hero + BenefitPanel teaser + pain cards + crew + desktop CTA) + `/downloads` placeholder · decision sweep (AGPL v3 license · Interviewer LLM = Claude Code session/SDK host · Dominion as first utility partner) · eval rubric approved & promoted to `docs/evals/rubric.md` · owner briefs for §14 harness | done |
| 4   | Tauri shell v0 — scaffold (`apps/desktop/`), Tauri dialog + fs plugins, local-file case loader with structural validate, three-column side-by-side review (applicant / utility / regulator), export bundle JSON (v0 unsigned — signing in #6), desktop canary, macOS build artifact | done |
| 5   | Signed disclosure bundle protocol v1 — JCS (RFC 8785) canonicalization, Ed25519 signatures, hash-chained audit, dual policy hash; OS-keychain-backed signer via Tauri IPC (`keyring` + `ed25519-dalek`, OnceLock-cached Entry, unit-tested with `keyring::mock`); `packages/verifier/` zero-dep standalone verifier + Python reference at `apps/verifier-py/`; `gp-sign` standalone Rust signer binary; 10 targeted tamper cases + 2000-iteration fuzz; 3-way TS⇌Rust⇌Python parity canary; public `/protocol` page + landing tile + `/about` telltale extension; design justified in `docs/design/signed-bundle.md` + normative spec in `docs/design/signed-bundle-spec.md`. | done |
| 6+  | Planned — see `docs/plans/roadmap.md`. | planned |

### Now

**Sprint 2026-04-20 ("demo-ready everything") — all in-scope tracks landed 2026-04-20; main run still deferred.** Sprint plan at `docs/plans/sprint-2026-04-20.md`: four tracks completed across ~1 effective day of work (parallelized). **Tracks 1 + 4** — eval evidence into `/about` §6 + 48-unit `forecast/audit.test.ts` suite (core:test: 9 → 57 tests). **Track 2 (Interviewer + Explainer)** — 2.1a transport seam + `IntakePanel` + validator gating; 2.1b real `claude -p` subprocess via Rust IPC (OAuth session-inherited); 2.2 Explainer Skill v0 (SKILL.md + ROLE_VOICES.md + 3 role examples + validator + baseline + substrate-metrics row); 2.2-polish `ExplainerPanel` + `explainer_query` Rust command. canary:desktop now runs **12 guards** (was 3 at sprint start). **Track 3 (utility binary)** — 3.1 scaffold with write-scope import guard (gate 15); 3.1-polish real drop-zone via `plugin-dialog` + `plugin-fs`, verified-bundle state carrying keyId + policyHash, `UtilityProjection` renderer, trust-claim stamp. 3.2 `TrustPanel` live-state chrome in desktop. **Research-thesis §6a substrate-metrics panel now spans 4 Skills across 2 domains × 2 contract axes** (write-scope × read-scope). All 15 gates green. Sprint deliverable `docs/plans/sprint-2026-04-20-brief.md` is the one remaining item (consolidation doc at sprint close per the plan).

**Track 1 headline numbers, n=1 per cell (from `docs/evals/sim-bench-results.md`):**
- **OPR Δ = D − B**: S1 **+0.328 ✓** (clears §9.1 threshold); S3 +0.194 borderline; S2 +0.047 flat.
- **Savage regret (max)**: D=0.00 (S1), 0.40 (S2 ties B), 0.20 (S3 ties C lowest).
- **Cross-family judge bias (P0.3 spot-check)**: Sonnet never scores above Opus; mean Δ ≈ −0.5 Likert; no disagreement > 1 Likert across 15 dimension-judgments; rank ordering D > B preserved. Opus-as-judge overstates D's absolute Likert by ~0.5 but not direction.
- **Honest counterpoint**: C (mechanically-derived prompt-only) is competitive — matches or beats D on OPR in S2/S3. The D-vs-C substrate claim needs seed expansion; the D-vs-B status-quo claim holds directionally.

**Prior — sim-bench engine + pilot shipped 2026-04-20.** §17 signed off 2026-04-19; post-lock implementation landed in 12 commits (`b15a395` → `6cd07ce`). Four amendments applied: A-3 pre-pilot reconciliation (`ab9ba87`), A-4 token hygiene + H-null word-boundary (`ce38241`), A-5 trace classifier prompt tightening (`8ea8725`), A-6 all-Opus judges + mandatory swap-augmentation (`8ea8725` + `6cd07ce`). 12-subset scored twice (pre- and post-A-5/A-6) — D wins every cell on Prometheus median Likert; D stable under swap-aug (max |Δ|=1, zero disagreed dimensions) while B/C show privacy_integrity variance; D=0 H-null; trace classifier clean on all B/C/D post-A-5. The 7-step plan to live-bench:

1. ✅ **LLM transport adapter** (`b15a395`) — `eval_sim/llm.py`: `Transport` Protocol + `ClaudeAgentSDKTransport` + `FakeTransport` + lazy singleton. Rides parent Claude Code session auth — no `ANTHROPIC_API_KEY` (trick: `os.environ.pop("CLAUDECODE", None)` before each `query()`; pattern from `agentic_ai_reviewer`). Defensive monkeypatch for SDK v0.1.x `MessageParseError` on `rate_limit_event`. Live smoke: Sonnet round-trip 13.7s.
2. ✅ **Scorer flip** (`b15a395`) — 6 LLM call sites refactored from `client: Anthropic | None` to `transport: Transport | None` (judge, judge swap, paraphrase judge, Staab probe, semantic-equivalence, trace classifier, paraphrase barrier). Dropped `anthropic` SDK dep. Latent bug fixed: `PARAPHRASE_JUDGE_PROMPT`'s JSON braces would have crashed `str.format()` in the pilot — switched to `.replace()`-based substitution; locked prompt bytes unchanged. Live judge smoke: 33.3s, fully-parsed `JudgeOutput`.
3. ✅ **Concordia agents** (`b15a395`) — `eval_sim/agents/{language_model,embedder,components,builders}.py`. `TransportLanguageModel(LanguageModel)` adapter; `deterministic_embedder` (SHA256-seeded unit-norm 64-dim) for `AssociativeMemoryBank`; three custom `ContextComponent`s including `ParaphrasedPrivateProfile` (the §1.5.2 #6 realism contribution: paraphrase barrier as a Concordia component intercepting technical→contract handoff with raw + paraphrased exposed for §8c.iii); `build_applicant`/`build_utility`/`build_regulator` factories. Live smoke (S1, Sonnet): realistic Dominion intake letter, paraphrase barrier executed at 0.15 loss-rate, no raw private values escaped.
4. ✅ **Four condition Game Masters + runner dispatch** (5 commits: `7541a8d` 4a + `f6c87c1` 4b + `0fd7b58` 4c + `8fe1f4e` 4d/4e):
   - **4a** `eval_sim/channels/base.py` (`Channel` Protocol + `AgentBundle` + `TranscriptBuilder`) and `oracle.py` (Oracle A; 3-turn deterministic; live smoke produced full Owl filing → Dominion tier-routing → SCC/FERC/JLARC audit).
   - **4b** `skill_bundle.py` (D; bundle send → utility verify+query → bounded-query loop with `NO CLARIFICATION NEEDED` sentinel exit + `max_query_rounds` cap → tier-routing → audit; cached Cartographer per §6e). Live smoke: 7 turns, day 10.0, applicant held the disclosure line.
   - **4c** `prompt_bundle.py` (C). Refactor extracted D's loop into `run_bundle_workflow()` shared with C — wire-protocol parity per §1.5.1 #1 substrate-isolation. C and D differ on metadata only (`condition` + `cartographer_mode='live'` vs `'cached'`); the substrate difference (flat-prompt vs Skill) is set by the runner at agent-build time.
   - **4d** `email.py` (B; multi-round email + meeting protocol per §6a — 3+ unresolved → 90% accept via separate SHA256 stream). Three meeting leak vectors: attendee broadening, notes-doc forwarding (when `meeting_notes_reuse` fires), verbal-to-text paraphrase. System-level failure modes from `failure_modes.py` applied at routing layer (`wrong_cc` adds planning-lead; `scheduler_assistant_cc` adds DL marker on `artifact_refs`). Loop-bug fix: exit BEFORE applicant's reply once trigger threshold reached.
   - **4e** `runner.py` — `run(scenario, condition, seed, *, dry_run, transport, max_turns)` dispatches to the right channel by Condition. Per-condition agent tier per §5e + §4.1: applicant uses Opus for A/C/D, Sonnet for B; utility + regulator universally Sonnet. Circular-import guard: `failure_modes` import moved to function body.
   - **Architectural call** (recorded in `eval_sim/channels/base.py` docstring): we use Concordia's `EntityAgent`/`ContextComponent`/`AssociativeMemoryBank` substrate but **not** `concordia.environment.engines.Sequential` — the latter is itself LLM-driven (~3,360 wasted Sonnet calls in main run with no decision-theoretic content). Substrate claim per §1.4 is preserved; loop is ours.
5. ✅ **Live Cartographer cache generation** (`552d898`) — `scripts/generate_cartographer_cache.py` now wires `_invoke_live_cartographer()` through `ClaudeAgentSDKTransport` (Opus 4.7, product-agent tier). System prompt = SKILL.md + SOURCES.md; user prompt carries scenario identity + a canonical-URL whitelist extracted from SOURCES.md's `**URL:**` rows. 3-attempt retry loop with in-loop TS-CI-validator subprocess — schema AND URL-whitelist failures both feed back as corrective nudges. 7 fixtures committed at `eval_sim/fixtures/cartographer-cache/`: 6 grid scenarios (all passed validator on attempt 1/3) + S7 priorauth sentinel (`{domain:'priorauth',cache_applicable:false}`). `cache-hashes.json` manifest carries all 7 SHA-256 digests per §15.5. Live smoke of dispatch (`scripts/smoke_runner_dispatch.py`, `ab9ba87`) separately validated R1 meeting-day fix + R2 Oracle cartographer_mode tag on the real SDK path.
6. **Pilot** — 28 main + 9 fairness-check = 37 runs. Decomposed into:
   - **6a** ✅ (`2d09b3d`) — `scripts/pilot.py --live` wired: CSV filter flags (`--scenarios`, `--conditions`, `--max-seeds`, `--include-s7`), per-run ledger JSON → `results/pilot/transcripts/` (gitignored), incremental committed manifest at `results/pilot/manifest.json` (§15.5 reproducibility artifact). Ledger serializer handles Pydantic + dataclasses + nested containers. **12-subset validation (S1+S2+S3 × A/B/C/D × seed=0, ~85 min, ~$20–30 SDK): all 12 `ok`.** Step-6a directional findings (n=1 seed, NOT statistically significant — pilot gates confirming engine behavior, not publishable claims):
     - A always 3 turns / day 0 per §4.1 ✓ (no variance: deterministic)
     - B meeting trigger fires in S1 + S2 (11 turns / day 37) but NOT in S3 (6 turns / day 27) — §6a-consistent: Kraken's low-friction archetype resolves in-thread without escalation
     - C/D wire-protocol parity holds (same 7-turn/day-10 shape when both hit the 2-round cap) — substrate-isolation §1.5.1 #1 design goal visible in the transcripts
     - **Substrate signal candidate:** S2 × C early-terminated at 1 bounded-query round (6 turns / day 8) while S2 × D went 2 rounds (7 turns / day 10). §8d H-spec would pick this up at full-pilot seed counts as a flat-prompt-vs-Skill discipline delta
     - `cache_hash` on every ledger matches `552d898` §6e manifest — cross-check passes
   - **6b** — 16+ more main-pilot runs to reach §9 seed coverage (seeds 1–4 for S1–S3 + full 5-seed sweep for S4/S5/S6). **Deferred** pending P0 measurement-integrity blockers — see roadmap.md §14 P0 table.
   - **6c** — ✅ code shipped (`ce38241`): `runner.run(cartographer_mode_override='live'|'cached'|None)` threads through SkillBundle + PromptOnlyBundle channels; `pilot.py --fairness` real dispatch + `--fairness-only` flag. 5 runner override tests. 12 fairness-pilot runs not yet executed; queued after P0 blockers.
   - **6d** — ✅ code shipped + 12-subset scored twice (`ce38241` + `6cd07ce`): `scripts/score_ledgers.py` with per-cell idempotency, `--token-source scenario|ledger` for amendment-retroactivity, swap-augmentation wired after A-6. Pre-A-5/A-6 scoring produced initial signal; post-A-5/A-6 re-score landed the clean numbers. See `docs/evals/sim-bench-results.md` for full tables including the Early-signal appendix.
7. **Main** — 140 condition + 35 oracle + 280 judge = 455 runs. Aggregate via `aggregator.py` (BCa CIs, weighted κ, length-residual). Generate `docs/evals/sim-bench-results.md`.

**Amendment A-3 (pre-pilot, `ab9ba87`):** reconciled four items surfaced by the step-4 code review — §6a meeting turnaround to 4d (table wins over bullet; `MEETING_DURATION_DAYS` removed; `email.py` verbal turns now 0.5d each); §5e row 1 clarified (applicant follows per-condition product-agent tier: B Sonnet; A/C/D Opus — the code already did this, doc now matches); §6a vector-3 verbal-to-text documented as parallel-draws simplification in v1; §6a `scheduler_assistant_cc` documented as unconditional-firing in v1. Pricing check (Opus ~1.67× Sonnet) noted but unifying to all-Opus would collapse the §5d/§14 #9 self-preference mitigation so tiered design retained. No runs initiated; no data invalidated. Same commit: `channels/oracle.py` gained `cartographer_mode='cached'` scorer_input; stale "pending step 4X" markers removed.

Bhawuk's utility-prompt review is deferred to post-lock amendment per user directive — not a blocker.

**Amendment A-4 (post-6d, 2026-04-20 — pending Ming sign-off).** Three orthogonal fixes surfaced by the step-6d scorer batch on the 12-subset: (1) Pydantic validator on `ScenarioCard.private_token_set` rejecting tokens <2 chars or pure bare 1-2-digit numbers; (2) `compute_h_null` word-boundary match (`(?<!\w){tok}(?!\w)` case-insensitive) rather than raw substring; (3) scenario-card edits on S1/S2/S3/S4/S5/S6 removing bare-digit tokens (S7 was already clean). Full rationale in `docs/evals/sim-bench-design.md` Amendment A-4 block. No data invalidated — the 12-subset ledgers stand; re-scoring under the amended scorer + cleaned cards is a zero-cost re-run (H-null was confirmed clean on re-score: D=0 across all three scenarios, S2 false positives eliminated).

**Living results doc.** `docs/evals/sim-bench-results.md` tracks what has been measured so far, what's deferred, how to regenerate, and what to update when new data lands. Referenced from `docs/story.md` §6b; referenced from `docs/evals/owner-briefs.md`.

**Pre-lock scaffold complete (2026-04-19):** `packages/eval-sim/` is a uv-managed Python 3.12+ workspace package. Pre-lock scaffold in 6 commits (235c29f → 7aacbdd); post-§17 wiring layered on top. Every `§N` reference below points at sim-bench-design.md.

| Module | What's live | Status |
|---|---|---|
| `schemas/` | CaseInput mirror · Condition · Role/Disposition/ModelTier · Channel+weights+sensitivity helper · Dimension+JudgeOutput · TurnMessage · ScenarioCard+CITuple+Future · PriorAuthProfile+SafeHarborIdentifiers (S7) | locked |
| `config.py` | MODEL_TIERS · TURNAROUND_DAYS_{B,D} · FAILURE_RATES_B per archetype · meeting protocol · seeds · paraphrase-judge 0.72 threshold · bootstrap protocol · success criteria | locked |
| `scenarios/s{1-7}_*.py` | All 7 cards authored, S4 private-token set concretized | locked |
| `scorers/efficiency.py` | §8a deterministic counts — pure function | ready to run |
| `scorers/robustness.py` | §8b OPR + Savage regret hybrid with Hurwicz α spectrum — pure function | ready to run |
| `scorers/mechanical.py` | §8d H-workflow + H-spec decomposition (pre-validator rate vs in-artifact rate) + H-trigger + H-null — pure function | ready to run |
| `scorers/privacy/direct.py` | §8c.i Presidio recognizer descriptors + substring tier + AgentLeak-threshold LLM judge with locked prompt | **live wired** (dry-run default) |
| `scorers/privacy/inferential.py` | §8c.ii Staab probe verbatim + Presidio-anonymized public-only baseline Δ | **live wired** (dry-run default) |
| `scorers/privacy/trace.py` | §8c.iii channel-weighted CI-violation classifier with locked prompt | **live wired** (dry-run default) |
| `scorers/judge.py` | §5d + §8e Prometheus ABSOLUTE_PROMPT_WO_REF verbatim + turn-tagged transcript + swap augmentation + disagreement detection | **live wired** + smoke-tested (33s, Opus 4.7) |
| `aggregator.py` | §10.4 + §15 BCa bootstrap + quadratic-weighted κ + length-residual OLS regression — pure statistics | ready to run |
| `agents/prompts.py` | §5a-§5c five locked role-persona system prompts with regression fences | locked |
| `agents/paraphrase.py` | §5a+§1.5.2 #6 ParaphraseBarrier pure-function + locked LLM prompt | **live wired** (dry-run default) |
| `agents/language_model.py` | §5 Concordia `LanguageModel` adapter routing `sample_text`/`sample_choice` through our Transport | **live wired** + smoke-tested |
| `agents/embedder.py` | SHA256-seeded unit-norm 64-dim embedder for `AssociativeMemoryBank` (deterministic per scenario+seed) | live |
| `agents/components.py` | Three Concordia `ContextComponent`s — `LockedPersonaInstructions`, `ScenarioContext`, `ParaphrasedPrivateProfile` (the §1.5.2 #6 realism contribution: paraphrase barrier as Concordia component intercepting technical→contract handoff with both raw + paraphrased exposed for §8c.iii trace scoring) | **live wired** |
| `agents/builders.py` | `build_applicant`/`build_utility`/`build_regulator` factories returning real `EntityAgentWithLogging`s with locked persona prompts, scenario context, memory bank, paraphrase component (applicant only) | **live wired** + smoke-tested (S1, Sonnet, realistic Dominion intake letter) |
| `llm.py` | `Transport` Protocol + `ClaudeAgentSDKTransport` (sync + async) + `FakeTransport` + lazy singleton; pops `CLAUDECODE` to ride parent session auth; rate-limit-event monkeypatch; no `ANTHROPIC_API_KEY` required | **live wired** + smoke-tested (13.7s Sonnet round-trip) |
| `channels/failure_modes.py` | §6a deterministic sampler (SHA-256 seeded) + §6a meeting-trigger state machine | ready to run |
| `channels/base.py` | `Channel` Protocol + `AgentBundle` + `TranscriptBuilder` + helpers (`make_turn_id`, `free_action_spec`, `observe`, paraphrase-audit capture) | **live wired** |
| `channels/oracle.py` | Condition A — 3-turn full-info loop · §4.1 + §6d | **live wired** + smoke-tested (3 turns, day 0) |
| `channels/skill_bundle.py` | Condition D + shared `run_bundle_workflow` — bundle send + bounded-query loop (sentinel + cap) + tier-routing + audit · §4.4 + §6b + §6e | **live wired** + smoke-tested (7 turns, day 10) |
| `channels/prompt_bundle.py` | Condition C — same loop as D via shared workflow; `cartographer_mode='live'`; substrate difference set by runner at agent build · §4.3 + §6c | **live wired** |
| `channels/email.py` | Condition B — multi-round NDA-email + 3-vector meeting protocol + system-level failure-mode application + meeting-accept on a separate SHA256 stream · §4.2 + §6a | **live wired** |
| `runner.py` | Single-run orchestrator; dry-run returns synthetic 3-turn ledger; **live path dispatches to the right channel by Condition** (A→Oracle / B→Email / C→PromptOnly / D→SkillBundle), builds AgentBundle at the right tier per §5e + §4.1 (applicant Opus for A/C/D, Sonnet for B; utility + regulator universally Sonnet) | **live wired** |
| `scripts/pilot.py` | typer CLI · live dispatch via `runner.run()` · CSV filter flags · per-run ledger JSON + incremental manifest · §15.5 SHA-256 tracking | **live wired** · 12-subset validated (`2d09b3d`) |
| `scripts/main.py` | typer CLI · prints locked run matrix · dry-run only (pilot.py pattern ready to port when main run starts) | ready to port |
| `results/pilot/manifest.json` | §15.5 reproducibility artifact — scenario/condition/seed × wall-clock + turn-count + final-day + cache_hash + SHA-256 per run. Committed; transcripts/ gitignored | live |
| `scripts/smoke_llm.py` | manual one-shot transport round-trip via `claude-agent-sdk`; no API key needed | live |
| `scripts/smoke_judge.py` | manual end-to-end: locked Prometheus prompt + 3-turn synthetic transcript → Opus 4.7 → parsed `JudgeOutput` | live |
| `scripts/smoke_agents.py` | manual end-to-end: build applicant → live paraphrase barrier → live act; reports paraphrase audit | live |
| `scripts/generate_cartographer_cache.py` | §6e fixture generator · SKILL.md+SOURCES.md system prompt · canonical-URL whitelist in user prompt · 3-attempt retry with in-loop TS-CI validator · S7 priorauth sentinel path · writes to `card.public_evidence_cache_path` + SHA-256 manifest | **live wired** + 7 fixtures committed on attempt 1/3 each |
| `scripts/smoke_channel_oracle.py` | manual end-to-end Oracle channel run (3 LLM calls) | live |
| `scripts/smoke_channel_skill_bundle.py` | manual end-to-end SkillBundle channel run (5–7 LLM calls; up to 2 bounded-query rounds) | live |
| `tests/` | **258 pytest tests** covering schema round-trips · S1-S7 cards · scorer behavior (incl. `plan_extraction` 19-test suite landed with Track 1) · locked-prompt byte fences · disagreement detection · runner dry-run + live dispatch (4 conditions) · cache-hash manifest (committed + fallback-marker) · `Transport` protocol · `FakeTransport`-backed live-path wiring for every LLM call site · Concordia agent assembly + paraphrase-barrier component · all four channels (Oracle/SkillBundle/PromptOnly/Email) under FakeTransport · failure-mode routing application · meeting-trigger threshold · loop bounds + sentinel detection + max-rounds cap · Oracle cartographer-mode tag · canonical-URL whitelist parse · S7 sentinel shape · priorauth-domain guard | all green (~3s warm) |

Gates: `cd packages/eval-sim && uv sync --dev && uv run pytest && uv run ruff check && uv run pyright` — all green. ~90s first run (BCa bootstrap tests do 10k resamples); warm cached runs under 3s.

**What is still pending (Sprint 2026-04-20 remaining tracks — see `docs/plans/sprint-2026-04-20.md`):**

*Eval-side (deferred until after demo-ready tracks):*
- **Ledger-metadata extension** (P0.2) — persist `validator_pass_per_turn` + `source_refs[]` on ledgers. Unblocks §8d H-workflow + H-spec + H-trigger (currently only H-null runs). Student follow-on, ~2 days. Deferred with main run.
- **Step 6b seed expansion** — 16+ more runs to reach §9 seed coverage. Deferred until main-run decision.
- **Step 7 main run** — 140 condition + 35 oracle + 280 judge = 455 runs, ~$400–1200 SDK. Deferred per 2026-04-20 sprint decision; pilot numbers now defend the talk (see Track 1 headline above).

*Sprint-side (in flight):*
- ~~**Track 2.1a Interviewer transport seam**~~ — ✅ landed 2026-04-20.
- ~~**Track 2.1b Real Claude Agent SDK transport**~~ — ✅ landed 2026-04-20. Path (b) chosen: new Rust command `interviewer_query` in `apps/desktop/src-tauri/src/interviewer.rs` shells out to `claude -p --output-format json --system-prompt <skill>` carrying parent Claude Code session's OAuth env. Frontend `ClaudeAgentSDKInterviewerTransport.query()` calls it via dynamic `@tauri-apps/api/core::invoke` import (keeps Node canary safe), parses the envelope, tolerant-extracts first JSON object (strips markdown fences, brace-depth matching), branches on clarify-shape (tolerates both `{clarify:"..."}` and `{type:"clarify", question:"..."}`) vs CaseInput, runs validator, assembles CaseInput with default empty publicEvidence. Live-smoke-tested end-to-end (~$0.18, ~74s first call, ~28KB skill source cached for subsequent calls). `defaultInterviewerTransport()` now auto-detects Tauri runtime vs Node.
- ~~**Track 2.2 Explainer Skill v0**~~ — ✅ landed 2026-04-20. Authoring source at `.claude/skills/explainer/`; pure validator at `@grid-passport/agents/explainer/validator`; baseline at `packages/agents/explainer/baselines/prompt-only.md` (drift-gated); substrate-metrics row auto-added to the 4-Skill / 2-domain panel. Desktop `ExplainerPanel` + `explainer_query` Rust command deferred to **Track 2.2-polish** (1–2 d, straight copy of the Interviewer transport pattern — different system prompt, same envelope parsing).
- **Track 2.2 Explainer Skill v0** — `.claude/skills/explainer/` + `ROLE_VOICES.md` + paired validator (no raw-private-field regex in narration). Runs on Track 2.1's SDK transport. Adds row 3 to research-thesis §4 write-scope table. 3–5 d, serial after 2.1.
- ~~**Track 3.1 Utility Tauri binary (`apps/utility/`) scaffold**~~ — ✅ landed 2026-04-20 (scaffold + gate 15). Workspace scaffolded as separate `apps/utility/` package mirroring `apps/desktop/` recipe. Imports only `@grid-passport/verifier` + `@grid-passport/core/{types, projection, bundle}` (the core imports are type-only in practice); the write-scope guard in `pnpm canary:utility` forbids `@grid-passport/core/{fixtures, forecast, audit}` in `apps/utility/src` by grep. Gate 15 exercises: (i) write-scope guard, (ii) positive `@grid-passport/verifier` wiring check, (iii) sign + verify + tamper + reject on a fresh owl-compute bundle. Full UX (real drop-zone, projection render with role-pinned `BenefitPanel`, trust-claim stamping) lands as Track 3.1-polish in a follow-up chunk — the scaffold compiles, typechecks, and proves the import chain.
- **Track 3.2 Self-review trust panel** — persistent chrome in `apps/desktop/` showing `0 network calls · inputs at <path> · bundle hash <truncated> · 0 raw private fields released`. Live runtime state, not hardcoded. 1–2 d.
- ~~**Track 4 TS unit tests for `forecast.ts` + `audit.ts`**~~ — ✅ landed 2026-04-20. 48 new `node:test` units (30 forecast + 18 audit) layered under the existing `tsx --test` runner; no new vitest dep. `pnpm core:test` glob-expanded from hardcoded crypto-only to `src/*.test.ts`. Coverage themes: tier-band invariants, `firmnessScore` quantize-to-5 under perturbation, hash-chain `prevHash[i] === sha256(JCS(event[i-1]))`, per-actor policy-version binding, override-row redaction discipline (applicant vs non-applicant baseline visibility).

**Sprint-close deliverable (target ~2026-05-18): master student brief.** At sprint close we consolidate Track 1 + Track 2 + Track 3 + Track 4 findings into a single onboarding doc (candidate path: `docs/plans/sprint-2026-04-20-brief.md`) that a student can read cold and walk into either the main run (eval side) or the next sprint's feature work. Each track's sub-sections should be write-once here and linked from the brief at close — don't duplicate content into the brief while the sprint is live.

**Suggested first action in next session:**

1. **Track 2.2-polish** (~1–2 d) — desktop `ExplainerPanel` React component + `explainer_query` Rust Tauri command. The Skill source + validator + baseline + metrics are all shipped. The polish is purely runtime wiring: straight copy of `apps/desktop/src-tauri/src/interviewer.rs` with a different system prompt (Explainer's SKILL.md + ROLE_VOICES.md + examples) and a different user prompt (a `ProjectedView` JSON + role). The transport seam and tolerant JSON extraction in `apps/desktop/src/lib/interviewer-transport.ts` can be generalized into a shared helper, or a parallel `explainer-transport.ts` can copy the pattern. Research-thesis-wise: the substrate-metrics panel already shows the 4-Skill / 2-domain / 2-axis table with Explainer's −96.2% upfront delta; the polish doesn't change that claim, just makes it demo-visible.
2. **Track 3.1-polish `apps/utility/` full UX** (~3–4 d remainder) — scaffold already green; follow-up layers on: (a) real drop-zone via `@tauri-apps/plugin-dialog` + `plugin-fs`, (b) verified-bundle state carrying keyId + policy-hash display, (c) rendering `payload.projections.utility` with a utility-pinned `BenefitPanel` (hoist from web or reimplement locally), (d) trust-claim stamping (`no network · verify-only · pinned to keyId`). `canary:utility` already covers the write-scope contract and the verify/tamper e2e; UX work doesn't need new canaries.
3. **Replay Track 1 invocations if needed** (for reproducibility):
   ```bash
   cd packages/eval-sim
   PYTHONPATH=. uv run python scripts/score_ledgers.py --scorer robustness   # ~2 min, ~$0.50
   PYTHONPATH=. uv run python scripts/spot_check_cross_family_judge.py        # ~2 min, ~$0.30
   ```

**Useful invocations for any next session:**

```bash
cd packages/eval-sim
# Matrix-only preview (no SDK):
PYTHONPATH=. uv run python scripts/pilot.py --scenarios S1,S2,S3 --max-seeds 1
# Re-run a single cell (cheap sanity check):
PYTHONPATH=. uv run python scripts/pilot.py --live --scenarios S1 --conditions D --max-seeds 1
# Replay the 4-condition × S1 × seed=0 dispatch smoke (~27 min):
PYTHONPATH=. uv run python scripts/smoke_runner_dispatch.py
# Regenerate a single Cartographer fixture (~1 min, ~$0.50):
PYTHONPATH=. uv run python scripts/generate_cartographer_cache.py --scenario S1 --live
```

Every locked prompt + locked parameter has a byte-level regression-fence test. Post-lock edits will fail CI unless a matching amendment block lands in sim-bench-design.md §3.2.

**Recently shipped (substrate side, 2026-04-18): #7 Interviewer v0 + #8 Cartographer v0 + HIPAA substrate-transfer demo + research-grade substrate metrics panel.** The substrate side is in good shape; the remaining effort before results can land is the behavioral side (sim bench) + one more Skill (Explainer #13) if the bench wants a prose-output test condition.

**Research-support headline:** four Skills across two domains **and two contract axes** (write-scope + read-scope), all mechanically compared against prompt-only baselines, all independently showing **−93.8% to −96.4% upfront context saving** + dense refusal clouds (4–6 "never" clauses; 5–9 "halt" clauses; 2–12 "refuse" clauses; 3–5 contract-violations refused by paired CI validator; 11-URL source whitelist on Cartographer). The read-scope axis (Explainer, shipped 2026-04-20 as Track 2.2) extends the substrate claim from "write-scope contracts" to "read-and-write-scope contracts" — the Skill that can't see raw private data can't leak it by construction. Full table in `packages/agents/metrics.md` (auto-generated; drift-gated at gate 14); slide-ready version in `docs/story.md` §6; research-thesis framing in `docs/design/research-thesis.md` §6a + §6.

**In-flight details, updated 2026-04-18:**

Two shipping Skills now live at `.claude/skills/<name>/` (auto-discovered by Claude Code per [agentskills.io](https://agentskills.io); invoked as `/gridpassport-interviewer` and `/gridpassport-cartographer` with live reload). Each SKILL.md carries frontmatter (`name` · `description` · `when_to_use` with trigger phrases + explicit NOT-use-for list pointing at sibling Skills) + explicit write-scope contract + anti-adversary rule (non-coaching for Interviewer, non-fabrication + source-whitelist for Cartographer) + workflow + trust-constraint checklist. Bundled references: Interviewer's `REFERENCE.md` mirrors `@grid-passport/core/ask-reasons`; Cartographer's `SOURCES.md` is the authoritative source-URL whitelist enforced by the validator (URLs not in SOURCES.md → contract violation). 3 canonical examples per Skill (Owl Compute · Lantern Cloud · Kraken Train), each demonstrating a different contract edge. CI validators at `packages/agents/<name>/scripts/` — Interviewer has 3+3 self-tests (publicEvidence-leak · derivedProof-bleed · workloadMix sum-check); Cartographer has 3+4 (privateProfile-leak · derivedProof-bleed · empty-sourceRefs · unknown-source-url). All green.

**Research case-study artifact: the prompt-only baseline.** `packages/agents/interviewer/baselines/prompt-only.md` (32KB, ~600 lines) is mechanically derived from `.claude/skills/interviewer/{SKILL.md, REFERENCE.md, examples/*.md}` via `pnpm agents:baseline`. Drift gate at `pnpm agents:baseline:check` (gate 13) fails if the committed baseline doesn't match Skill source. This is the **fair-comparison artifact** for the #14 Skill-vs-prompt empirical test of research-thesis §3.1 (schema-as-safety-case). The case-study framing, methodology, and honest-limits list live at `packages/agents/interviewer/baselines/README.md` — read before citing it. Research thesis §6b elaborates. Cartographer + Explainer baselines follow the same pattern when those Skills ship.

**Tauri bundling wired:** `tauri.conf.json` includes `.claude/skills/**/*.md` under `bundle.resources → skills/`, so the packaged binary ships with the Skill source. `pnpm canary:desktop` now has a skills-bundle guard that fails if a shipping Skill's SKILL.md is missing. Runtime SDK integration (Claude Code session or Agent SDK as LLM transport, path-resolution via `@tauri-apps/api/path`) is the last remaining chunk under #7 — non-trivial since it requires the LLM-routing decision from the roadmap Decision Log (resolved: no direct API key UX; run inside Claude Code session or SDK).

**Gating concern:** the Bhawuk→Dominion intro status. If imminent (≤2 weeks), pause #7 runtime wiring and instead use the scaffold to drive the §9 signed-bundle handshake conversation with Dominion — the Skills' write-scope contracts are exactly the kind of artifact a utility counterparty can review + critique before we lock the intake shape.

**Gating concern to check:** has the Bhawuk→Dominion intro happened? If it has or is imminent (≤2 weeks), #6's key-identity handshake (§9 of the signed-bundle design doc) benefits from Dominion co-design — bundle #7's desktop wiring pass and the Dominion handshake into a single sprint if the timing aligns.

**Parallel tracks that don't need sprint attention:**
- **#14 Eval harness (re-scoped)** — the simulation bench at `docs/evals/sim-bench-design.md` supersedes `docs/evals/rubric.md` + `docs/evals/owner-briefs.md`. Student owners from the original brief should be re-scoped to the Week-2 engine work in §12.2 of the bench doc; see §13.1 for the scope-shift addendum. The earlier 4-axis rubric is folded into §8d (mechanical compliance axis). No prior work is discarded; scope expands from per-Skill canned fixtures to multi-agent simulation with realized-future ensembles and composite privacy scoring.
- **#2 Open-source the repo** — parked. Revisit when green-lit; note that `/protocol` page has public-facing GitHub links that 404 until the repo is public, so landing credibility improves once this lands.
- **Dominion onboarding handshake** — non-code, gated on Bhawuk intro. See §9 of `docs/design/signed-bundle.md` for the agenda items. The sim-bench utility-prompt review (§10.1 of the bench doc) is a natural companion to this handshake — both happen post-lock.

## Architecture

```
grid-passport/
├── apps/
│   ├── web/                            Next.js 16 · TS · Tailwind 4 · App Router
│   │   ├── app/
│   │   │   ├── page.tsx                landing · hero + BenefitPanel teaser (Owl × utility) + pain cards + crew + desktop CTA
│   │   │   ├── about/page.tsx          long-scroll · renders docs/story.md at build time
│   │   │   ├── demo/
│   │   │   │   ├── page.tsx            redirects to /demo/owl-compute
│   │   │   │   └── [caseId]/page.tsx   server component · projects for initial role only
│   │   │   ├── downloads/page.tsx      desktop-app placeholder · "coming soon" status + build plan
│   │   │   └── api/scenario/route.ts   POST · returns {view, auditEvents, baselineFlexPercent}
│   │   ├── components/                 DemoClient, RoleToggle, RequestView, FieldRow,
│   │   │                               FieldChip, SectionCard, BenefitPanel, CaseSelector,
│   │   │                               CounterfactualSlider, MapPanel, EvidencePanel,
│   │   │                               AuditTrail, PolicyPanel
│   │   ├── lib/
│   │   │   ├── policy-source.ts        reads the Rego file + sha-256 at request time (web-only: cwd-dep)
│   │   │   ├── pain-framings.ts        pain-point cards · shared by landing + (future) demo header
│   │   │   └── team.ts                 crew strip data (Ming · Bhawuk/Dominion · Vikrant)
│   │   └── scripts/
│   │       └── privacy-canary.ts       structural + audit-action scan + TS↔Rego↔Python drift
│   ├── api/                            FastAPI parity (uv · Python 3.11+) — Phase 2 target
│   ├── verifier-py/                    Python reference verifier · single file · PyCA cryptography + stdlib only · demonstrates protocol portability
│   ├── desktop/                        Tauri 2.x shell · Vite + React + TS frontend · Rust core · applicant-side signing
│   │   ├── src/
│   │   │   ├── App.tsx                 top-level: two-mode (work/review) · case picker · file loader · interviewer intake · review gate + export terminus
│   │   │   ├── components/             ReviewColumn (work|review variant), MiniBenefit, ProjectionSections (bucket-tiered with ⓘ tooltips), IntakePanel (Track 2.1a — prose → validator → CaseInput)
│   │   │   ├── lib/
│   │   │   │   ├── case-loader.ts      dialog.open + fs.readTextFile + structural validate against CaseInput; `LoadedCase.source` discriminates file | bundled | interviewer
│   │   │   │   ├── signer.ts           tauriSigner() → BundleSigner via applicant_public_key + applicant_sign IPC
│   │   │   │   ├── bundle.ts           buildAndSignBundle() · signs v1 bundle with OS-keychain-backed Ed25519 · dialog.save + fs.writeTextFile
│   │   │   │   ├── skills-loader.ts    resolveResource + plugin-fs → LoadedSkill[] from packaged `.claude/skills/` (Tauri-only)
│   │   │   │   └── interviewer-transport.ts  Tracks 2.1a + 2.1b · `InterviewerTransport` iface · `FakeInterviewerTransport` (Node/canary default) · `ClaudeAgentSDKInterviewerTransport` (Tauri-runtime default; dynamic-import-invoke to interviewer_query Rust command + tolerant JSON extraction + clarify-shape detection) · `extractFirstJsonObject` helper · `defaultInterviewerTransport()` factory auto-detects Tauri via `__TAURI_INTERNALS__`
│   │   │   ├── styles.css              terminal-flavored vanilla CSS (no Tailwind on desktop yet)
│   │   │   └── main.tsx
│   │   ├── scripts/canary-desktop.ts   asserts @grid-passport/core imports + 3-case × 3-role projection invariant
│   │   ├── vite.config.ts              port 1420 · strictPort · TAURI_ENV_* env · esnext target
│   │   └── src-tauri/                  Rust crate `grid-passport-desktop` (lib `grid_passport_desktop_lib`)
│   │       ├── tauri.conf.json         identifier app.gridpassport.desktop · window 1180×760
│   │       ├── Cargo.toml              tauri 2.10 · tauri-plugin-{log,dialog,fs} 2 · keyring 3 · ed25519-dalek 2 · serde_json_canonicalizer · [[bin]] gp-sign · AGPL-3.0-or-later
│   │       ├── capabilities/default.json  dialog + fs read/write scoped to `**` (narrow for prod in #12)
│   │       ├── icons/                  generated via `cargo tauri icon` from a placeholder source
│   │       └── src/
│   │           ├── {main.rs,lib.rs}    Tauri builder · dialog/fs/log plugins · invoke_handler registers applicant_public_key + applicant_sign + interviewer_query
│   │           ├── signer.rs            Ed25519 keypair in OS keychain via `keyring` crate + `ed25519-dalek`; OnceLock-cached Entry; mock-keychain unit test exercises the full round-trip
│   │           ├── interviewer.rs       Track 2.1b · shells out to `claude -p --output-format json --system-prompt <skill>` carrying parent Claude Code session OAuth env; returns model's raw text to webview (which then validates + assembles CaseInput)
│   │           └── bin/gp-sign.rs       Standalone Rust signer CLI · JCS via serde_json_canonicalizer · proves Rust primitives produce verifier-compatible output
│   └── utility/                        Tauri 2.x shell · utility-side verifier binary · scaffolded 2026-04-20 (Track 3.1) · structurally cannot reconstruct raw CaseInput
│       ├── src/
│       │   ├── App.tsx                 placeholder paste+verify UI (real drop-zone is Track 3.1-polish); imports @grid-passport/verifier only
│       │   ├── styles.css              minimal terminal-flavored CSS (card layout, mono telltale)
│       │   └── main.tsx
│       ├── scripts/canary-utility.ts   gate 15 · write-scope guard (no fixtures/forecast/audit imports in src/) + verifier-wiring positive + sign/verify/tamper/reject e2e
│       ├── vite.config.ts              port 1430 · strictPort · TAURI_ENV_* env · esnext target
│       └── src-tauri/                  Rust crate `grid-passport-utility` (lib `grid_passport_utility_lib`)
│           ├── tauri.conf.json         identifier app.gridpassport.utility · window 1180×760 · productName "Grid Passport Utility"
│           ├── Cargo.toml              tauri 2.10 · tauri-plugin-{log,dialog,fs} 2 · NO signer deps (keyring/ed25519-dalek omitted — utility verifies, never signs)
│           ├── capabilities/default.json  dialog + fs read-only (no write capability — utility cannot emit bundles)
│           ├── icons/                  copied from desktop placeholder
│           └── src/
│               └── {main.rs,lib.rs}    Tauri builder · dialog/fs/log plugins · NO invoke_handler (no signer commands)
├── packages/
│   ├── core/                           @grid-passport/core · subpath exports · shared across web + desktop
│   │   └── src/
│   │       ├── types.ts                CaseInput · RequestRecord · FieldPath · Role · ...
│   │       ├── policy.ts               POLICY table (runtime mirror of the Rego) · enforcement
│   │       ├── projection.ts           projectForRole(req, role) → ProjectedView
│   │       ├── forecast.ts             forecast(case, override?) → DerivedProof
│   │       ├── forecast.test.ts        30 tier-band + quantize-to-5 + boundary + override tests (Track 4)
│   │       ├── audit.ts                async buildAuditTrail(case, record, role, override) · hash-chained via prevHash
│   │       ├── audit.test.ts           18 hash-chain + policy-binding + override-redaction tests (Track 4)
│   │       ├── bundle.ts               DisclosureBundle v1.0.0 · signBundle() · localSigner() · newBundleId()
│   │       ├── crypto.ts               inline RFC 8785 JCS · WebCrypto SHA-256 · base64/hex helpers
│   │       ├── crypto.test.ts          RFC 8785 official test vectors (Erdtman's cyberphone/json-canonicalization testdata)
│   │       ├── ask-reasons.ts          FieldPath → {bucket, why} · UX layer (tooltips, tier labels)
│   │       ├── fixtures/               owl-compute · lantern-cloud · kraken-train · index
│   │       └── geo/                    synthetic GeoJSON per case
│   ├── verifier/                       @grid-passport/verifier · standalone zero-framework-dep bundle verifier
│   │   ├── src/
│   │   │   ├── index.ts                verifyBundle(bytes, pubkey) → {ok, reasons, payload, policyHash}
│   │   │   ├── index.test.ts           10 tamper-detection tests (T1–T4, schema drift, malformed, keyId)
│   │   │   └── fuzz.test.ts            2000-iteration random-mutation fuzz; zero false positives
│   │   ├── bin/verify.js               CLI: grid-passport-verify <bundle.json> <pubkey.b64|hex>
│   │   └── scripts/
│   │       ├── bundle-canary.ts        end-to-end sign → verify → tamper → reject across all 3 cases
│   │       └── emit-fixture.ts         emit signed bundle + pubkey + secret to disk for cross-impl testing
│   ├── policy/grid-passport.rego       canonical release policy (source of truth)
│   └── agents/                         @grid-passport/agents · CI validators + baseline-derivation + substrate-metrics infra (not Skill authoring source)
│       ├── README.md                   split rationale · validator roster · how to add one
│       ├── metrics.md                  AUTO-GENERATED; substrate-property metrics across all shipping Skills (context-cost delta · discovery-signal density · write-scope enforcement density · navigable-structure count); drift-gated; the slide source for docs/story.md §6
│       ├── metrics.json                same metrics as machine-readable JSON (for #14 harness + future cross-domain comparisons)
│       ├── scripts/
│       │   ├── export_prompt_only.ts   generic Skill → prompt-only baseline derivation; takes skill name (or --all); drift gate at `pnpm agents:baseline:check`
│       │   └── compute_metrics.ts      measures each Skill's substrate properties + produces metrics.md + metrics.json; drift gate at `pnpm agents:metrics:check`
│       ├── interviewer/
│       │   ├── src/validator.ts                  pure browser-safe `validateInterviewerOutput` + `InterviewerContractViolation` — importable from desktop webview via subpath export `@grid-passport/agents/interviewer/validator` (Track 2.1a)
│       │   ├── scripts/validate_caseinput.ts     CLI wrapper: re-exports pure validator + fixture-backed 3+3 self-test for `agents:validate` gate
│       │   └── baselines/
│       ├── explainer/                            Track 2.2 · read-scope Skill (contra the write-scope Interviewer/Cartographer); thesis §3.4 / §4 row 3
│       │   ├── src/validator.ts                  pure browser-safe `validateNarration` + `validateNarrationOrThrow` + `ExplainerContractViolation` — subpath export `@grid-passport/agents/explainer/validator`
│       │   ├── scripts/validate_narration.ts     CLI wrapper: 3 positive narrations × 4 negative tests (leak into utility, leak into regulator, unknown role, empty narration)
│       │   └── baselines/
│       │       ├── prompt-only.md                AUTO-GENERATED; same drift-gate + methodology as Interviewer baseline
│       │       └── README.md                     case-study framing specialized for the read-scope axis
│       │       ├── prompt-only.md              AUTO-GENERATED; research case-study artifact; content-hashed drift gate
│       │       └── README.md                   case-study framing · methodology · what the comparison does and does not prove (applies to all Skill baselines)
│       ├── cartographer/
│       │   ├── scripts/validate_publicevidence.ts   structural + write-scope + provenance-whitelist validator; 3 positive + 4 negative self-tests
│       │   └── baselines/prompt-only.md         AUTO-GENERATED; same derivation pipeline as Interviewer
│       └── priorauth-interviewer/
│           └── baselines/prompt-only.md         AUTO-GENERATED; HIPAA-domain Skill's prompt-only baseline (for the cross-domain substrate comparison)
├── packages/eval-sim/                  @grid-passport/eval-sim · uv-managed Python 3.12+ · implementation of docs/evals/sim-bench-design.md
│   ├── pyproject.toml                  deps: gdm-concordia + presidio-analyzer + claude-agent-sdk + anyio + scipy/sklearn/statsmodels + pydantic + typer + rich (no anthropic SDK — Transport rides Claude Code session)
│   ├── eval_sim/
│   │   ├── schemas/                    Pydantic models — CaseInput mirror (drift-guard), Condition, Role/Disposition/ModelTier/RoleConfig, Channel + weights, Dimension, JudgeOutput, TurnMessage, ScenarioCard + CITuple + Future
│   │   ├── config.py                   locked parameters from bench doc (MODEL_TIERS, TURNAROUND_DAYS_{B,D}, FAILURE_RATES_B per archetype, meeting protocol, seeds, statistical protocol, success criteria)
│   │   ├── llm.py                      Transport Protocol + ClaudeAgentSDKTransport (sync + async, pops CLAUDECODE to ride parent session auth, rate-limit-event monkeypatch) + FakeTransport (tests) + lazy singleton
│   │   ├── scenarios/                  scenario-card registry · all 7 cards (S1 Owl, S2 Lantern, S3 Kraken, S4 First-Timer, S5 Adversarial, S6 Multi-Phase, S7 Priorauth/HIPAA)
│   │   ├── agents/                     §5 Concordia EntityAgent assembly:
│   │   │   ├── language_model.py       TransportLanguageModel (Concordia LanguageModel ABC over our Transport)
│   │   │   ├── embedder.py             SHA256-seeded unit-norm 64-dim embedder for AssociativeMemoryBank
│   │   │   ├── prompts.py              5 locked role-persona system prompts (§5a-§5c) with regression fences
│   │   │   ├── paraphrase.py           §1.5.2 #6 paraphrase-barrier pure function + locked LLM prompt
│   │   │   ├── components.py           Concordia ContextComponents — LockedPersonaInstructions, ScenarioContext, ParaphrasedPrivateProfile (the §1.5.2 #6 realism contribution)
│   │   │   └── builders.py             build_applicant / build_utility / build_regulator factories returning EntityAgentWithLogging
│   │   ├── channels/                   §6 condition-specific orchestration · base.py (`Channel` Protocol + `AgentBundle` + `TranscriptBuilder`) · oracle.py (A · 3-turn) · skill_bundle.py (D · bundle + bounded-query, exposes shared `run_bundle_workflow`) · prompt_bundle.py (C · same workflow, cartographer_mode='live') · email.py (B · multi-round + meeting protocol + failure-mode routing) · failure_modes.py (deterministic seeded sampler + meeting-trigger state machine). Thin orchestrator, NOT Concordia's `Engine` (which would be itself LLM-driven for turn-routing — saves ~3,360 wasted Sonnet calls in main run).
│   │   ├── scorers/                    §8 — efficiency.py (deterministic counts) · robustness.py (OPR + Savage regret + Hurwicz α) · mechanical.py (H-workflow/H-spec/H-trigger/H-null + pre-validator vs in-artifact decomposition) · privacy/{direct,inferential,trace}.py (3-type composite, ~400 LOC, all live-wired through Transport) · judge.py (§5d Prometheus + swap augmentation + disagreement detection, live + smoke-tested 33s Opus) · futures.py · judge_rubric.py
│   │   ├── fixtures/cartographer-cache/  §6e JSON fixtures per scenario · live SDK populating pending step 5
│   │   ├── runner.py                   single-run orchestrator (scenario × condition × seed); dry-run returns synthetic 3-turn ledger; live multi-turn loop pending step 4
│   │   └── aggregator.py               §10.4 + §15 BCa bootstrap (scipy) + quadratic-weighted κ (sklearn) + length-residual OLS regression (statsmodels)
│   ├── scripts/
│   │   ├── pilot.py                    typer CLI · 28 main-pilot + 9 fairness-pilot runs · dry-run only until step 4
│   │   ├── main.py                     typer CLI · 140 condition + 35 oracle + 280 judge runs · dry-run only until step 4
│   │   ├── smoke_llm.py                manual one-shot transport round-trip via claude-agent-sdk; no API key needed
│   │   ├── smoke_judge.py              manual end-to-end: locked Prometheus prompt + 3-turn synthetic transcript → Opus 4.7 → parsed JudgeOutput
│   │   ├── smoke_agents.py             manual end-to-end: build applicant → live paraphrase barrier → live act; reports paraphrase audit
│   │   └── generate_cartographer_cache.py  §6e fixture generator · dry-run only (live SDK pending step 5)
│   └── tests/                          258 pytest tests · schema round-trips + all 7 cards + scorer behavior (incl. plan_extraction 19 tests from Track 1) + locked-prompt byte fences + disagreement detection + runner dry-run + live dispatch (4 conditions) + cache-hash manifest + Transport protocol + FakeTransport-backed live-path wiring for every LLM call site + Concordia agent assembly + paraphrase-barrier component + all four channels (Oracle/SkillBundle/PromptOnly/Email) + failure-mode routing + meeting-trigger threshold + bounded-query sentinel + max-rounds cap + Oracle cartographer-mode tag
├── .claude/
│   └── skills/                         Claude Agent Skills · authoring + runtime source (spec-compliant path); Tauri bundles these at build time
│       ├── README.md                   roster + write-scope table + thesis-property map + spec compliance checklist
│       ├── interviewer/                NL → CaseInput elicitation · #7 v0
│       │   ├── SKILL.md                frontmatter (name · description · when_to_use) + write-scope contract + non-coaching rule + workflow + trust-constraint checklist
│       │   ├── REFERENCE.md            field catalog mirrored from @grid-passport/core/ask-reasons
│       │   └── examples/               3 canonical intakes (Owl Compute · Lantern Cloud · Kraken Train), each demoing a different contract edge
│       ├── cartographer/               public-evidence fetch → CaseInput.publicEvidence · #8 v0
│       │   ├── SKILL.md                write-scope contract + non-fabrication rule + workflow + source-whitelist enforcement + 6-check trust-constraint checklist
│       │   ├── SOURCES.md              endpoint registry (whitelist): FEMA NFHL · VA DEQ air/water · county GIS · VA Land Records · EPRI DCFlex · Dominion FIR · SCC fact sheet · Google DCFlex primary disclosure
│       │   └── examples/               3 canonical public-evidence transcripts (Owl · Lantern · Kraken), each demoing a different retrieval pattern (baseline + no-adjacent-context; multi-source-disagreement + stale-record; multi-topic + applicant-upload)
│       └── priorauth-interviewer/      HIPAA prior-auth intake · substrate-transfer demo (2026-04-18)
│           ├── SKILL.md                same recipe as gridpassport-interviewer (write-scope + non-coaching + 5-check checklist) applied to PA intake; PHI-paste refusal built in
│           ├── REFERENCE.md            minimal PriorAuthCase field catalog (identity + clinical-justification buckets; PHI/payer-decision/billing-code non-writable)
│           └── examples/cardiac-cath-intake.md   one worked transcript demonstrating pseudonymization-at-intake + non-coaching refusal on medical-necessity phrasing + out-of-scope refusal (appeal drafting)
├── scripts/
│   └── demo-bundle-roundtrip.sh        stage-ready: TS sign → TS verify → Python verify → tamper → both reject (pnpm canary:roundtrip)
├── grid-passport-harness/              specs + .claude/agents/ subagent prompts (don't delete)
├── docs/
│   ├── vision.md                       team, big-picture framing, trust pivot, reliability triad, web/desktop coexistence
│   ├── privacy-claim.md                the case for the privacy claim — read this for stage
│   ├── agents.md                       agent architecture, Claude Skills, eval targets, research connection
│   ├── story.md                        research narrative — renders to website /about, single source for public presentations
│   ├── design/
│   │   ├── signed-bundle.md            design rationale — threat model, 8 decisions w/ alternatives + citations, 10-Q demo defense
│   │   └── signed-bundle-spec.md       normative spec — RFC 2119 wire format, sign/verify algs, conformance checklist, reproducibility
│   ├── evals/
│   │   ├── sim-bench-design.md         PRE-REGISTRATION · simulation bench for #14 · 7 scenarios × 4 conditions × 5 seeds · OPR + Savage regret · 3-type privacy scorer · Prometheus-style rubric · Amendment A-1 applied 2026-04-19 · pending §17 sign-off before implementation
│   │   ├── rubric.md                   SUPERSEDED 2026-04-19 (folded into sim-bench-design.md §8d) · human-preference axis rubric (Explainer Skill) · historical
│   │   └── owner-briefs.md             SUPERSEDED 2026-04-19 · original per-owner briefs for #14 · historical; see sim-bench-design.md §13.1 for the scope-shift addendum
│   └── plans/
│       ├── handoff.md                  this file — state, decisions, what-already-exists
│       └── roadmap.md                  master plan — what's shipping next, decisions awaited
├── CLAUDE.md                           project rules
└── pnpm-workspace.yaml
```

## The privacy claim, precisely

- `packages/policy/grid-passport.rego` is the canonical source of field visibility rules.
- `packages/core/src/policy.ts` mirrors it as the runtime (TS). Python mirror lives at `apps/api/gridpassport/policy.py`. **Drift between these three is a bug.**
- Initial page render at `/demo/[caseId]` projects for one role only (default `utility`). Role switches and counterfactuals go through `/api/scenario`, which returns only the selected role's view.
- `/api/scenario` returns `baselineFlexPercent` only when `role === "applicant"`. Every other role gets `null`. This was a real fix after a Phase 0 leak where pre-projecting all three roles shipped raw `0.68` to the browser.
- `/api/scenario` also drops the `flexPercent` override server-side when `role !== "applicant"` (Phase 3c). Defense in depth for `audit.ts` which now redacts the baseline in the override action string for non-applicants.
- Raw private values exist in browser memory only when the user is actively in the applicant role (they're authorized to see their own data).
- In the demo we simulate the confidential boundary. The release/policy layer is real; the TEE is not. Stage this honestly.
- **The full case for the claim lives in `docs/privacy-claim.md`** — mechanism, evidence layers, with/without delta, why NDAs/redacted PDFs/ZK/MPC/TEEs/DP/FL each cover only part of the surface, and what we are *not* claiming.

## Decisions already made (don't re-litigate)

- **Name:** "Grid Passport" — product and brand. WhisperGrid codename dropped after "whisper = secrecy" conflict with the policy-governed-transparency pitch.
- **Stack:** Next.js + TS + Tailwind for frontend. FastAPI for Phase 2+ Python-only work. OPA/Rego as policy canon, runtime-mirrored in TS. pnpm 10 monorepo. Vercel for hosting.
- **Phase 0 deliberately used Next.js only** (no FastAPI). FastAPI added in Phase 1c as a scaffold; swap path documented but not wired.
- **OPA runtime not wired yet.** Rego is the source, TS is the enforcement. The UI renders the Rego text + sha-256 in regulator mode so the claim is inspectable.
- **Synthetic fixtures, not real utility data.** Every number is labeled synthetic. Do not imply otherwise in any external presentation.
- **Production architecture is local-first (Phase 3d).** Per `docs/vision.md` §5: the applicant runs the projection locally; nothing leaves their machine until they explicitly export a signed disclosure bundle. The web demo at https://grid-passport.vercel.app is a teaching artifact only. Don't confuse "the demo is hosted" with "the product is hosted."
- **TEE is not load-bearing under local-first.** It was originally Phase 4+ (real Confidential Space). Under the pivot it's optional, only relevant for utility-side delegated verification. NDAs compose *on top of* the tool — they cover residual liability; the tool reduces the surface where disclosure can fail.
- **No time pressure on the build.** Quality > speed for this project. The talk waits for real eval results; the eval harness gets built properly rather than rushed. Don't propose Plan-B-quick-ship-stubs unless explicitly asked.
- **Schema discipline: `ask-reasons.ts` is the gate.** Every `FieldPath` in `packages/core/src/ask-reasons.ts` has a `{bucket, why}` entry; adding a new field without one silently skips the `docs/vision.md` §4b 5-test filter. Do not introduce a new `FieldPath` variant until you've run it through the filter and added the entry. This is how the schema stays small.

## Harness bugs reconciled in code (don't re-introduce)

The original `grid-passport-harness/` docs contained three schema inconsistencies that would break a clean fixture→DB path. Fixed during Phase 0:

- Field name: `internalScheduleConfidence` (not `internal_confidence` from `04-implementation-plan.md`)
- BESS/backup units: MW (not kW from `04`)
- Workload mix: object `{training, inference}` (not scalar from `04`)

When adding new fields, consult this list first — don't copy from the harness docs blindly.

## Extending

Add a new field:
0. Run it through the `docs/vision.md` §4b 5-test filter (utility-need traceable · asymmetric knowledge · business-answerable · discriminating · demo-legible). Cut if it fails any test — do not skip this step.
1. Add to `FieldPath` union in `packages/core/src/types.ts`.
2. Add an entry to `POLICY` in `packages/core/src/policy.ts`.
3. Mirror in `packages/policy/grid-passport.rego` field_class map.
4. Mirror in `apps/api/gridpassport/policy.py`.
5. Add an entry to `packages/core/src/ask-reasons.ts` with `{bucket, why}` — the desktop UI renders `why` as the ⓘ tooltip; pick the bucket from the vision §4b tier table (identity / operational / sensitive / evidence / computed).
6. Update fixtures (TS + Python).
7. Run `pnpm typecheck && pnpm privacy:canary && pnpm canary:desktop`. Privacy canary also covers TS↔Rego↔Python drift — add the new field's value strings to `privateValueStrings`/`publicValueStrings` in `apps/web/scripts/privacy-canary.ts` if it's a new shape.

Add a new case:
1. New fixture file in `packages/core/src/fixtures/`.
2. Register in `packages/core/src/fixtures/index.ts` + `apps/api/gridpassport/fixtures.py`.
3. Synthetic SiteGeo in `packages/core/src/geo/synthetic.ts`.
4. Audit anchor timestamp in `CASE_ANCHOR` inside `packages/core/src/audit.ts`.

## Versions

- Node 20 · pnpm 10.33.0 · Next.js 16.2.4 · React 19.2.4 · Tailwind 4 · TypeScript 5 · maplibre-gl 5.23.0
- Story-page render path: react-markdown 10 · remark-gfm 4 · @tailwindcss/typography 0.5
- Python 3.11+ · FastAPI 0.115+ · pydantic 2.9+ · uv

## Operational notes

### Gate list (run these to confirm a clean tree)

| # | Command | What it proves |
|---|---|---|
| 1 | `pnpm typecheck` | Web package types consistent |
| 2 | `pnpm privacy:canary` | Structural + audit-scan + TS↔Rego↔Python drift — `docs/privacy-claim.md` §2c |
| 3 | `pnpm desktop:typecheck` | Desktop package types consistent |
| 4 | `pnpm canary:desktop` | 8 guards: `@grid-passport/core` imports · projection invariant on 3 cases × 3 roles · shipping Skills bundle source + frontmatter · **interviewer transport**: FakeTransport happy path (prose → validator → CaseInput with `status=draft` + empty publicEvidence) · clarify path for empty prose · SDK transport outside Tauri surfaces clean transportError (no throw) · `defaultInterviewerTransport()` auto-detects Fake in Node / SDK in Tauri via `__TAURI_INTERNALS__` · `extractFirstJsonObject` strips markdown fences + depth-balanced brace matching + null on no-JSON — Tracks 2.1a + 2.1b |
| 5 | `pnpm utility:typecheck` | Utility package types consistent |
| 6 | `pnpm canary:utility` | Utility write-scope guard (no `@grid-passport/core/{fixtures,forecast,audit}` imports in `apps/utility/src`) + positive `@grid-passport/verifier` wiring + sign/verify/tamper/reject e2e on a fresh owl-compute bundle |
| 7 | `pnpm core:test` | 57 tests across `crypto.test.ts` (9 — 6 official RFC 8785 JCS vectors incl. `weird.json` surrogate-pair + NaN/Infinity rejection + determinism) · `forecast.test.ts` (30 — tier-band invariants, quantize-to-5 under perturbation, confidence/flex/duration tier boundaries, override semantics, clamp) · `audit.test.ts` (18 — hash-chain integrity, policy-version binding per actor class, override-row redaction, sealed-field-count tripwire) |
| 8 | `pnpm verifier:test` | 10 targeted tamper cases + 2000-iteration fuzz (zero false positives) |
| 9 | `pnpm canary:bundle` | In-process sign → verify → tamper → reject × 3 cases |
| 10 | `pnpm canary:roundtrip` | TS + Rust signers × TS + Python verifiers — 3-way parity on valid + tampered |
| 11 | `pnpm desktop:test` | Rust keyring round-trip (generate → persist → reload → sign → verify), mock backend |
| 12 | `(cd apps/desktop/src-tauri && cargo check)` | Rust signer + gp-sign binary compile clean |
| 13 | `pnpm agents:typecheck` | All Skill-validator + baseline-derivation scripts compile under strict TS |
| 14 | `pnpm agents:validate` | Write-scope contracts for all shipping Skills: Interviewer (3+3) + Cartographer (3+4 — privateProfile-leak · derivedProof-bleed · empty-sourceRefs · unknown-source-url) |
| 15 | `pnpm agents:baseline:check` | Prompt-only baselines (all 3 shipping Skills) match current Skill source byte-for-byte; catches uncommitted Skill edits that would contaminate the Skill-vs-prompt comparison for #14 |
| 16 | `pnpm agents:metrics:check` | Substrate-metrics report (`packages/agents/metrics.md` + `metrics.json`) matches current Skill source; the table is the slide — if a Skill edit changes the clause counts, the committed metrics should reflect it |
| —  | Optional: `(cd apps/utility/src-tauri && cargo check)` | Utility Rust crate compiles clean; slow on first run (~1m 40s) so not in the one-liner. Run once after scaffold edits |

One-liner for a full sweep (~16s on M1 — 15 gates):
```bash
pnpm typecheck && pnpm privacy:canary && pnpm desktop:typecheck && pnpm canary:desktop && pnpm utility:typecheck && pnpm canary:utility && pnpm core:test && pnpm verifier:test && pnpm canary:bundle && pnpm canary:roundtrip && pnpm desktop:test && pnpm agents:typecheck && pnpm agents:validate && pnpm agents:baseline:check && pnpm agents:metrics:check
```

### Dev + build

- Dev server: `pnpm dev` → http://localhost:3000
- Lint: `pnpm lint` (eslint, web workspace)
- FastAPI (optional): install uv, then `pnpm api:sync && pnpm api:dev` → http://localhost:8000
- Desktop (Tauri) dev: `pnpm desktop:dev` (launches the Tauri window; requires `~/.cargo/bin` on PATH — `source ~/.cargo/env` if `cargo` is not found)
- Desktop build: `pnpm desktop:build` (produces unsigned DMG + .app on macOS; MSI/AppImage on other platforms — untested for v0)
- Utility (Tauri) dev: `pnpm utility:dev` (port 1430; same cargo requirement; scaffold ships with placeholder paste+verify UI, full drop-zone lands in Track 3.1-polish)
- Utility build: `pnpm utility:build` (first-time Rust compile is ~1m 40s; subsequent builds fast; unsigned DMG under `apps/utility/src-tauri/target/release/bundle/`)

### Standalone CLIs (shipped, for utility-side consumption)

- TS verifier: `pnpm --filter @grid-passport/verifier exec tsx bin/verify.js <bundle.json> <pubkey>`
- Python verifier: `python3 apps/verifier-py/grid_passport_verifier.py <bundle.json> <pubkey.b64|hex>` (requires `cryptography`; single-file reference — see `apps/verifier-py/README.md`)
- Rust signer: `apps/desktop/src-tauri/target/debug/gp-sign <payload.json> <secret.b64>` (build via `cargo build --bin gp-sign`)
- Narrated demo: `pnpm demo:bundle` — same as `canary:roundtrip`, ~6s

### Repo hygiene

- Repo was initialized with `git init --initial-branch=main`. First commit: `03d8b57 initial hackathon build (phases 0–2)`.
- Memory files in `~/.claude/projects/...` have been retired in favor of this doc. Don't resume persisting state there for this project.
- `docs/human_inputs/` is intentionally untracked (see commit `4041631`). Do not stage it.

## Vercel deploy

- **Live:** https://grid-passport.vercel.app (canonical) and https://grid-passport-web.vercel.app (default).
- **Project:** `ming-jins-projects/grid-passport-web`, linked to GitHub. Pushes to `main` auto-deploy to production.
- **Settings live server-side (no `vercel.json` in repo).** Root Directory = `apps/web`, framework = nextjs, install = `cd ../.. && pnpm install --frozen-lockfile`, build = `pnpm run build`, output = `.next`. SSO/password protection disabled (public hackathon demo).
- **Why no `vercel.json`:** an earlier root `vercel.json` doubled the output path (`apps/web/apps/web/.next`) when combined with the Root Directory setting. We tried multiple in-repo configs; project-level settings turned out to be the only stable place. Don't re-add `vercel.json` without re-deriving why it was removed.
- **`apps/web/next.config.ts` pins `turbopack.root` to the workspace root** so `vercel build` from `apps/web` cwd can resolve the Next package. Don't remove unless you stop using `vercel build` locally and Vercel's remote builder gets smarter about pnpm workspaces.
- **CLI ops** (Vercel CLI installed via Homebrew, auth in `~/Library/Application Support/com.vercel.cli/`):
  - Re-link: `vercel link --yes --project grid-passport-web`
  - Pull settings: `vercel pull --yes --environment=production`
  - Manual deploy: `vercel deploy --prod --yes`
  - Logs: `vercel logs <deployment-url> --follow`
  - Aliases: `vercel alias ls`

## Open items

**The build queue lives in `docs/plans/roadmap.md`.** Don't duplicate it here — it will drift.

Items in this section are state-of-the-codebase observations that matter to a future session but aren't roadmap-tracked work:

- **Test coverage is uneven — but forecast + audit now covered.** The signed-bundle protocol (`packages/core/src/{crypto,bundle}.ts`, `packages/verifier/`, Rust signer) has comprehensive coverage (gates 5, 6, 7, 8, 9 above). As of 2026-04-20 (Track 4 land), `forecast.ts` + `audit.ts` also carry dedicated unit tests (`{forecast,audit}.test.ts`, 48 units — tier-band invariants, quantize-to-5, hash-chain integrity, policy-version binding, override redaction). The *API route handlers* (`apps/web/app/api/scenario/route.ts`) still have only mechanical (privacy-canary) evidence; a route-handler suite would complete the picture but isn't on the sprint. Pytest is already in `apps/api/pyproject.toml` dev deps.
- **Derivation transparency — partial.** `flexibilityPassport.durationHoursMin/Max` was re-derived as coarse BESS tier bands (2026-04-18), so `bessHours` no longer leaks through that pair. Remaining surfaces with the same "monotone-invertible from a private input" risk: `flexibilityPassport.mwMin/Max`, `firmnessScore`, `expectedPeakMW`. A shared band-design pattern for the remaining derived fields is tracked in the roadmap backlog (`derivation transparency review, part 2`).
- **Desktop bundles are now signed v1.** Shipped 2026-04-18 with #6. `@grid-passport/core/audit` swapped to async WebCrypto (no more `node:crypto` dep); audit chain has `prevHash` links; Tauri app signs the JCS-canonicalized payload via OS-keychain-backed Ed25519 (`keyring` crate + `ed25519-dalek`); `packages/verifier/` validates any produced bundle. One small remaining surface: `policyHash.rego` is a placeholder on desktop because Vite doesn't currently ship `packages/policy/grid-passport.rego` as a loadable asset — the runtime TS hash *is* computed correctly. Add Rego-asset loading to desktop Vite config in the packaging-polish pass so both halves of the dual hash (§3.6 of the design doc) are real.
- **Desktop icon is a placeholder** upscaled from the generated 256×256 PNG; bake a real branded icon before distribution (see roadmap backlog: `desktop packaging polish`).
- **Desktop fs capabilities are scoped to `**`.** OK for local dev where the dialog gates file selection, not OK for a shipped binary. Narrow to user-selected dir + app data dir before distribution (see roadmap backlog: `desktop packaging polish`).

## What this doc is *not*

It is not a status page. It is a handoff — the set of facts the next person (or next session) needs to not-screw-up. Keep it short. When something lands, update it. When something's wrong, fix the code and then the doc.
