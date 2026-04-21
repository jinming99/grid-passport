# Sprint 2026-04-20 — close brief & student handoff

> Sprint closed 2026-04-20. Read this doc cold to pick up one of four follow-on paths — main sim-bench sweep, Explainer refinements, utility-binary extension, or derivation-correctness test expansion.

## TL;DR

- **All four sprint tracks landed** in one working window (Tracks 1 + 2 + 3 + 4 + all polish items).
- **Research-thesis §6a substrate-metrics panel** now spans **4 Skills × 2 domains × 2 contract axes** (write-scope: Interviewer, Cartographer, priorauth-Interviewer; read-scope: Explainer). All four show uniform **−93.8% to −96.4% upfront context saving** vs mechanically-derived prompt-only baseline.
- **15 canary gates green**: `canary:desktop` grew from 3 to 12 guards; `canary:utility` is gate 15 (new this sprint); `core:test` jumped 9 → 57 tests.
- **Sim-bench main run still deferred**; pilot + P0.3 cross-family spot-check defend the talk.

---

## What landed, by track

### Track 1 — empirical evidence into `/about` §6

- **P0.1 CandidatePlan extraction** at `packages/eval-sim/eval_sim/scorers/plan_extraction.py` — 19-test suite; per-condition extractors (A regex over oracle_decision, C/D structured parse over signed bundle, B Opus-based locked prompt); feeds `score_ledgers.py`'s new `robustness` scorer.
- **P0.3 different-family judge spot-check** at `packages/eval-sim/scripts/spot_check_cross_family_judge.py` — 3 cells (S1_D, S2_B, S3_D) re-judged with `claude-sonnet-4-6`. No disagreement > 1 Likert; Sonnet never scores above Opus; mean Δ ≈ −0.5; rank ordering D > B preserved.
- **Live 12-cell re-score** under Amendments A-4/A-5/A-6 — each cell now has `robustness` alongside `direct`, `trace`, `judge`, `mechanical`. `~$0.50` SDK spend for the 12 Opus extractions.
- **`docs/evals/sim-bench-results.md` §8b** + **`docs/story.md` §6b** (renders to `/about` §6) — OPR per condition vs Oracle + Savage regret + §9.1 threshold check + cross-family caveat.

**Headline:** OPR Δ = D − B: S1 +0.328 ✓ clears §9.1; S2 +0.047 flat; S3 +0.194 borderline. D holds H-null = 0 across S1/S2/S3. C (mechanically-derived prompt-only) is competitive.

---

### Track 2 — Skill runtime on desktop

- **2.1a — Interviewer transport seam.** Pure validator moved to `packages/agents/interviewer/src/validator.ts` (browser-safe; exported as `@grid-passport/agents/interviewer/validator`). Transport interface + `FakeInterviewerTransport` + `ClaudeAgentSDKInterviewerTransport` at `apps/desktop/src/lib/interviewer-transport.ts`. `IntakePanel` component wired into App work-mode case-bar.
- **2.1b — real Claude Agent SDK via Rust IPC.** `apps/desktop/src-tauri/src/interviewer.rs` spawns `claude -p --output-format json --system-prompt <skill>`; subprocess inherits parent Claude Code session's OAuth (no API-key UX). Frontend dynamic-imports `@tauri-apps/api/core::invoke`; tolerant JSON extraction + clarify-shape detection (two shapes) + validator gating. Live-smoke-tested on real Sonnet (~$0.18, ~74s first call).
- **2.2 — Explainer Skill v0.** `.claude/skills/explainer/` — SKILL.md (read-scope + non-embellishment rule + 6-check trust-constraint checklist) + ROLE_VOICES.md (applicant/utility/regulator voice specs with good/bad examples) + 3 canonical narration transcripts. Paired validator at `packages/agents/explainer/src/validator.ts` (7 self-tests: 3 positives + 4 negatives). Mechanically-derived baseline + `-96.2% upfront` substrate-metrics row.
- **2.2-polish — ExplainerPanel + explainer_query.** `apps/desktop/src-tauri/src/explainer.rs` + `apps/desktop/src/lib/explainer-transport.ts` + `apps/desktop/src/components/ExplainerPanel.tsx`. Placed beneath each `ReviewColumn` in both work and review modes. Validator gates every narration emission against fixture-derived forbidden literals.

---

### Track 3 — utility surface + trust UX

- **3.1 scaffold.** New `apps/utility/` pnpm workspace (Vite + React 19 + TS + Tauri 2.10.3; crate `grid-passport-utility`, port 1430, identifier `app.gridpassport.utility`). Verifier-only Rust core — no signer deps, no write capability. **Gate 15 `canary:utility`** — write-scope import guard (forbids `@grid-passport/core/{fixtures,forecast,audit}` in `apps/utility/src`) + verifier-wiring positive + sign/verify/tamper/reject e2e.
- **3.1-polish — full UX.** `apps/utility/src/lib/bundle-loader.ts` (pub-key decode + `dialog.open` + `readTextFile` + `verifyBundle` in one tagged-result chain). `apps/utility/src/components/UtilityProjection.tsx` (local renderer for the utility `ProjectedView` — header + derived proofs + publicEvidence + sealed-fields block). App.tsx renders verified-bundle card (keyId + policyHash + audit-event count + source path), utility projection card, and lime-accented trust-claim card stamping the four structural guarantees.
- **3.2 — TrustPanel.** `apps/desktop/src/components/TrustPanel.tsx` — persistent chrome between banner and case-bar in both work and review modes. Four live-state cells: `network calls · 0` · `inputs at · <path/fixture/interviewer-provenance>` · `private fields sealed · 8` · `raw private released · 0`.

---

### Track 4 — derivation-correctness tests

- **`packages/core/src/forecast.test.ts`** (30 tests) — determinism + tier-band invariants across all 3 fixtures; `firmnessScore` quantize-to-5 across a 7×5×5 perturbation grid; `expectedPeakMW` / `flexibilityBand` / `durationBand` boundary guards; many-to-one tier invariants; override semantics; clamp.
- **`packages/core/src/audit.test.ts`** (18 tests) — `seq` monotonic 1-indexed; `prevHash[0]==null`; `prevHash[i] === sha256(JCS(event[i-1]))` chain integrity; tamper-detection; per-actor policy-version binding; override-row placement + `(baseline sealed)` vs `(baseline N%)` redaction; 5-actor canonical order; sealed-field-count tripwire (=8).
- `packages/core/package.json` test script: `tsx --test src/*.test.ts` glob so new tests auto-pick up.

---

## Four student paths

### Path A — Main sim-bench run (~1 week, $400–1200 SDK)

**Goal:** Replace the n=1 directional pilot with 140-condition + 35-oracle + 280-judge runs producing statistically-defensible §6 claims (BCa CIs, weighted κ, length-residual).

**Pre-requisites.**
- Re-confirm Amendment A-6 (all-Opus judges + swap-augmentation mandatory) still in force — pre-lock sign-off is at `docs/evals/sim-bench-design.md` §17.
- Budget approval.
- **Optional:** land P0.2 (ledger-metadata extension persisting `validator_pass_per_turn` + `source_refs[]`) to unblock §8d H-workflow / H-spec / H-trigger axes — H-null already works today.

**Entry point.** `packages/eval-sim/scripts/pilot.py --live` (drove the 12-cell subset); port its pattern to `scripts/main.py` (currently dry-run only).

**Read first.** `docs/evals/sim-bench-design.md` §7 (scenarios) + §8 (scorers) + §9 (success criteria) + §10.4 (aggregation + BCa bootstrap) + §15.5 (reproducibility artifacts). `docs/evals/sim-bench-results.md` for the current-state numbers.

---

### Path B — Explainer refinements (~3–5 days)

**Goal:** Measure the read-scope Skill's behavioral deltas vs its prompt-only baseline, tightening the paired validator beyond today's conservative set.

**Deliverables.**
- Expand the forbidden-literal derivation in `packages/agents/explainer/src/validator.ts` from the current 4-literal conservative set (internalScheduleConfidence float + training/inference float + backupGenMW) to a tunable configuration that admits more-aggressive detection when the domain allows (distinctive-integer heuristics, bessMW, etc.).
- Run `ExplainerPanel` on real ProjectedViews in `pnpm desktop:dev` with the real SDK transport (`VITE_EXPLAINER_TRANSPORT=sdk`) across the 3 × 3 case × role matrix. Collect leak-cases (validator rejections) vs human-preference rubric ratings.
- Add Explainer to the sim-bench as a scorer axis (axis C human-preference — was folded into §8d but the narration surface is separable).

**Read first.** `.claude/skills/explainer/{SKILL.md, ROLE_VOICES.md, examples/*.md}`. `packages/agents/explainer/baselines/{prompt-only.md, README.md}`. `docs/evals/rubric.md` (historical, folded into §8d) for the axis C voice specs.

---

### Path C — Utility binary extension (~1–2 weeks)

**Goal:** Ship the utility surface for a real counterparty handshake (Dominion via Bhawuk; see `docs/design/signed-bundle.md` §9).

**Deliverables.**
- **Public-key trust store.** Replace the single-session pub-key paste field with a persistent trusted-key list (name + keyId + added-at). `keyring` crate on the Rust side for storage.
- **Prod-launch PATH.** The current build launches `claude` via `std::process::Command::new("claude")`, which resolves via PATH. In a signed `.app` bundle on macOS, PATH is minimal (`/usr/bin:/bin:/usr/sbin:/sbin`). Either extend PATH in the Rust spawn call, or try common locations (`~/.local/bin`, `/usr/local/bin`) explicitly with a clear error when the binary isn't found.
- **Windows MSI + Linux AppImage** builds. Currently macOS DMG only; `pnpm utility:build` on other platforms is untested.
- **Optional:** regulator-role projection alongside the current utility-role projection, with explicit UX for role switching.

**Read first.** `apps/utility/src/App.tsx`, `apps/utility/src/lib/bundle-loader.ts`, `apps/utility/scripts/canary-utility.ts`. `docs/design/signed-bundle.md` §9 for the Dominion handshake agenda. `apps/desktop/src-tauri/src/signer.rs` for the keyring-crate pattern.

---

### Path D — Derivation-correctness test expansion (~3–5 days)

**Goal:** Bring the privacy-canary level of invariant-checking to the derivation layer (Python mirror + API route handlers + property-based tests).

**Deliverables.**
- **Python mirror.** `apps/api/gridpassport/forecast.py` and `audit.py` currently have no test coverage — mirror the TS test suite in pytest. Pytest is already a dev dep.
- **Route-handler tests.** `apps/web/app/api/scenario/route.ts` — integration-level tests that hit the route and assert the `baselineFlexPercent` redaction + flex-override redaction are present. Vitest + a small test HTTP client would do it.
- **Property-based tests via fast-check.** Beyond the hand-written perturbation grid in `forecast.test.ts`, property tests can assert tier-band invariance under arbitrary in-range inputs. `fast-check` integrates with `node:test`.
- **Coverage reporting.** Add `c8` or node's built-in coverage to `pnpm core:test`; aim for ≥80% branch coverage on `forecast.ts` + `audit.ts` (sprint exit criterion target).

**Read first.** `packages/core/src/{forecast,audit}.test.ts` for the existing patterns. `apps/api/pyproject.toml` for pytest setup. `CLAUDE.md` §Testing rules for what must carry tests.

---

## Useful invocations

```bash
# Full 15-gate sweep (~16s M1):
pnpm typecheck && pnpm privacy:canary && pnpm desktop:typecheck && pnpm canary:desktop && \
  pnpm utility:typecheck && pnpm canary:utility && pnpm core:test && pnpm verifier:test && \
  pnpm canary:bundle && pnpm canary:roundtrip && pnpm desktop:test && pnpm agents:typecheck && \
  pnpm agents:validate && pnpm agents:baseline:check && pnpm agents:metrics:check

# Dev (two Tauri windows, different ports):
pnpm desktop:dev          # applicant — port 1420
pnpm utility:dev          # utility  — port 1430

# Two-binary demo (applicant → utility):
pnpm desktop:build         # emit apps/desktop/src-tauri/target/release/bundle/*.dmg
pnpm utility:build         # emit apps/utility/src-tauri/target/release/bundle/*.dmg
# Open the applicant app; export a bundle. Open the utility app; drop the bundle in.

# Eval: 12-cell subset (~85 min, ~$30 SDK):
cd packages/eval-sim
PYTHONPATH=. uv run python scripts/pilot.py --live --scenarios S1,S2,S3 --max-seeds 1

# Regen baselines + metrics after a Skill edit (drift-gated):
pnpm agents:baseline && pnpm agents:metrics
```

---

## Known caveats (honest-limits list)

- **Prod-launch PATH for `claude`.** The Interviewer + Explainer SDK transports spawn `claude` via `std::process::Command`. In dev (`pnpm desktop:dev` launched from a shell), PATH inherits correctly. In a packaged `.app` bundle launched via double-click, macOS gives the Rust process a minimal PATH that doesn't include `~/.local/bin` or `/usr/local/bin`. User sees a clear "failed to spawn `claude`" error, but this blocks the prod demo path. Fix is in Path C above.
- **Explainer validator conservatism.** The default `forbiddenLiteralsFor(c)` set is 4 literals: the confidence float, the two workloadMix floats, and the backupGenMW integer. Bare small ints (bessMW, flexPercent percentages) are omitted because they legitimately appear in derived-proof bands. Real-world deployment should tune this; Path B.
- **n=1 on the sim-bench.** Pilot numbers are directional. §9.1's primary threshold `OPR(D) − OPR(B) ≥ 0.20` clears on S1 (+0.328) but not on S2/S3. Seed expansion + full sweep (Path A) is the replicability step.
- **Utility binary trust model.** Today the utility pastes a pub-key per session. A real deployment needs a trust store. Path C.
- **Claude Code host session required.** The SDK-transport path assumes the user has `claude` installed + logged in. No fallback to a bundled SDK + API key — that's deliberate per the sprint decision log.

---

## What NOT to do

- **Don't skip the validator.** Every Interviewer CaseInput emission and every Explainer narration emission passes through `validateInterviewerOutput` / `validateNarration`. The validators are the write-scope contract enforcement point. Bypassing them for "perf" or "simplicity" breaks the research claim.
- **Don't hoist `apps/utility/src/components/UtilityProjection.tsx` into a shared package without re-running `pnpm canary:utility`.** The utility binary's import-graph-level write-scope (gate 15) is the structural version of the §3.4 capability argument; pulling in the desktop's richer presentation layer would potentially bring along `@grid-passport/core/fixtures` or `forecast`. Canary would catch it, but be deliberate.
- **Don't commit generated `baselines/prompt-only.md` manually.** They're content-hash-gated via `pnpm agents:baseline:check`. Regenerate via `pnpm agents:baseline` and commit the output.
- **Don't add a new `CaseInput` field without running the 5-test filter** in `docs/vision.md` §4b. CLAUDE.md makes this a hard rule.

---

## Sprint-close artifacts

- **This brief** — `docs/plans/sprint-2026-04-20-brief.md` (single-doc onboarding).
- **Sprint plan** — `docs/plans/sprint-2026-04-20.md` — track-by-track landing records remain intact; live-progress sections narrate what shipped.
- **Handoff Now block** — `docs/plans/handoff.md` — updated to reflect sprint close.
- **Roadmap current-sprint section** — `docs/plans/roadmap.md` — 2026-04-20 items moved to Done; current-sprint section flips to "between sprints" state pending next-sprint scoping.
- **Research thesis §4 + §6a** — `docs/design/research-thesis.md` — four Skills, two contract axes.
- **Substrate metrics** — `packages/agents/metrics.md` + `.json` — auto-generated; drift-gated (gate 14).

Sprint 2026-04-20 is **closed**.
