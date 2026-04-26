# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

Monorepo uses **pnpm 10** workspaces (Node ≥20) + **Tauri 2 / Rust** + **Python (uv)** for the FastAPI scaffold and Python eval-sim. Root `package.json` proxies the common commands:

```sh
# Web (Next.js 16) — apps/web
pnpm dev                     # http://localhost:3000
pnpm build
pnpm lint                    # eslint via eslint-config-next
pnpm typecheck               # tsc --noEmit
pnpm privacy:canary          # structural no-raw-leakage check

# Desktop + Utility Tauri binaries
pnpm desktop:dev             # applicant app — port 1420
pnpm utility:dev             # utility app — port 1430
pnpm desktop:build / utility:build
pnpm desktop:typecheck / utility:typecheck
pnpm canary:desktop          # applicant-side invariants
pnpm canary:utility          # structural write-scope proof (gate 15)
pnpm desktop:test            # cargo test --lib in src-tauri

# Core pure-function library + TS verifier
pnpm core:test               # tsx --test packages/core/src/*.test.ts
pnpm verifier:test           # tsx --test packages/verifier/src/*.test.ts + fuzz
pnpm verifier:typecheck
pnpm canary:bundle           # sign / verify / tamper / reject roundtrip (TS)
pnpm canary:roundtrip        # full TS + Rust + Python roundtrip
pnpm demo:bundle             # alias — 60-sec end-to-end demo

# Agent Skills (packages/agents)
pnpm agents:validate                  # all three grid-domain validators
pnpm agents:validate:interviewer      # CaseInput validator
pnpm agents:validate:cartographer     # publicEvidence validator
pnpm agents:validate:explainer        # narration validator
pnpm agents:typecheck
pnpm agents:baseline[:check]          # regenerate / drift-check prompt-only baselines
pnpm agents:metrics[:check]           # recompute / drift-check metrics.json

# FastAPI scaffold (apps/api) — uses uv, not pnpm
pnpm api:sync                # uv sync
pnpm api:dev                 # uvicorn main:app --reload --port 8000

# Python eval-sim (packages/eval-sim) — pyproject.toml; see its README for pytest + pilot scripts.
```

**Running a single TS test file** (any `packages/*`): `pnpm --filter <pkg> exec tsx --test path/to/file.test.ts`. **Running a single Rust test**: `cd apps/desktop/src-tauri && cargo test <name>`.

**Canary gates are the safety net, not the test suite.** `pnpm canary:roundtrip` is the one command that exercises the full cross-language invariant (TS policy ↔ Rego ↔ Python reference verifier byte-for-byte). If you touch anything in the projection / policy / bundle / crypto path, run it. Individual canaries (`privacy:canary`, `canary:desktop`, `canary:utility`, `canary:bundle`) are faster and scope-local.

---

## Architecture at a glance

The repo is a **two-binary, zero-server** design with a shared pure-function core and a three-way policy mirror. Read this alongside `docs/tech-overview.md`.

### Monorepo layout (why, not what)

- `apps/web` — Next.js 16 marketing/demo site; read-only UI over fixtures. Never touches keychain or private inputs.
- `apps/desktop` — applicant Tauri binary. Intake → projection → signing. **May** import all of `@grid-passport/core` including `fixtures`, `forecast`, `audit`. Ed25519 private key lives in OS keychain; never crosses the Tauri IPC boundary.
- `apps/utility` — utility Tauri binary. **Gate 15 (`canary:utility`) fails CI if `apps/utility/src/` imports `@grid-passport/core/fixtures`, `forecast`, or `audit`.** This is a compile-time write-scope proof — the utility binary structurally cannot reconstruct raw private fields.
- `apps/api` — FastAPI parity scaffold (Phase 2+). Not in the critical path today.
- `apps/verifier-py` — ~30-line Python reference verifier. Portability artifact that proves the bundle spec is implementable without TS.
- `packages/core` — pure TS. `types.ts` (schemas), `policy.ts` (TS mirror of Rego), `projection.ts` (role → view), `forecast.ts` (deterministic toy tier bands, **not** a real model), `audit.ts` (hash-chained log), `bundle.ts` (JCS + Ed25519), `crypto.ts`, `ask-reasons.ts`, `geo/`, `fixtures/`. **No I/O, no network, no randomness beyond seeded.** Agents propose, these pure functions dispose.
- `packages/verifier` — standalone `@noble/ed25519`-only verifier library + `grid-passport-verify` CLI. Depends on `core` only for types.
- `packages/agents` — Claude Agent Skills infra. Each Skill (`interviewer/`, `cartographer/`, `explainer/`, `priorauth-interviewer/`) has a `SKILL.md` + a paired CI validator + a mechanically-derived prompt-only baseline gated by content-hash drift. `metrics.json`/`metrics.md` quantify the upfront-context savings vs. baseline.
- `packages/eval-sim` — Python (Concordia-based) multi-agent sim bench. Pre-registered under `docs/evals/sim-bench-design.md`; results under `results/pilot/`.
- `packages/policy` — canonical Rego (`grid-passport.rego`). **Source of truth** for disclosure policy; TS and Python mirrors must agree byte-for-byte.
- `scripts/demo-bundle-roundtrip.sh` — the one shell script that runs the full cross-language canary.
- `.claude/skills/` — per-project Skill definitions auto-discovered by Claude Code (Interviewer, Cartographer, Explainer, priorauth-Interviewer).
- `grid-passport-harness/` — separate harness sandbox; not part of the product build.

### The data-flow pipeline (where the non-negotiable rules are enforced)

```
applicant prose
    │
    ▼
Interviewer Skill  ──writes──▶  CaseInput.privateProfile + requestMeta
(validator-gated)               ▲ never touches derivedProof — write-scope contract
    │
    ▼
Cartographer Skill ──writes──▶  CaseInput.publicEvidence (source-cited; null if no source)
    │
    ▼
forecast.ts + projection.ts  (pure functions, deterministic under seed)
    │
    ▼ ProjectedView(role)
    ├──▶ Explainer Skill  (reads ProjectedView only; never privateProfile)  ──▶ prose
    ├──▶ desktop UI       (applicant role)
    └──▶ bundle.ts  ──JCS──▶ Ed25519 sign  ──▶ signed bundle
                                                    │
                                                    ▼
                                        utility Tauri binary
                                        (verifier runs; renders utility-role projection)
```

**Three-way mirror:** `packages/policy/grid-passport.rego` (canonical) ↔ `packages/core/src/policy.ts` (TS) ↔ `apps/verifier-py/` (Python). `privacy:canary` structurally verifies all three agree. A change to disclosure rules **must** land in all three or CI fails.

**Skill contract axis:** Interviewer/Cartographer/priorauth-Interviewer are *write-scope* Skills (they populate named buckets and nothing else). Explainer is a *read-scope* Skill (it consumes `ProjectedView` only — never `privateProfile`). This axis is the research contribution — see `docs/design/research-thesis.md` §4.

### The 15 canary gates

Every commit runs 15 structural gates (not unit tests — invariants). Named ones worth knowing:

- `privacy:canary` — TS ↔ Rego ↔ Python drift check.
- `canary:desktop` — applicant-side invariants.
- `canary:utility` — **gate 15** — walks `apps/utility/src/` import graph and fails if private-bucket types leak in.
- `canary:bundle` — TS sign/verify/tamper/reject.
- `canary:roundtrip` — full TS + Rust + Python cross-language roundtrip.
- `agents:baseline:check` + `agents:metrics:check` — content-hash drift gates on the prompt-only baselines and the claimed context savings.

When a gate fails, do **not** disable it. Gates are load-bearing for the "the schema is the safety case" thesis (`docs/design/research-thesis.md`).

### Where to look first

- Schema / type definitions: `packages/core/src/types.ts`
- Projection logic (role → view): `packages/core/src/projection.ts`
- Policy in TS: `packages/core/src/policy.ts`; Rego: `packages/policy/grid-passport.rego`
- Bundle format + signing: `packages/core/src/bundle.ts` + `packages/core/src/crypto.ts`
- Verifier library: `packages/verifier/src/`
- Skills (Claude Code auto-discovers): `.claude/skills/<name>/SKILL.md`
- Fixtures used by the demo: `packages/core/src/fixtures/`

---

## Project identity

This repository implements **Grid Passport**, a confidential coordination workflow for large electric-load requests.

The core product idea is:
- applicants submit sensitive load/site/flexibility information,
- the system keeps protected fields inside a confidential path,
- the system computes derived proofs,
- utilities and regulators see only role-appropriate projections.

This is not a generic chatbot and not a generic dashboard.

---

## Research framing (keep engaging with this; don't let it atrophy)

This project is a research program, not just a product. The thesis — **"the schema is the safety case"** — lives in `docs/design/research-thesis.md`. It is load-bearing context for the public research narrative and for how we decide what's worth shipping.

Keep it alive:

- Before scoping a new agent, add a row to §4 of the thesis articulating its **write-scope contract** and the research property it demonstrates. If you can't, the agent probably shouldn't ship.
- Before adding a `CaseInput` field, run it through the 5-test filter (`docs/vision.md` §4b) *and* check whether it changes any of the four claims in §3 of the thesis.
- When an eval result lands (#14), update §7 (honest gap inventory). If a result contradicts a claim in §3, update §3 — don't paper over.
- When a design decision could be framed *either* as industry-standard ("we did this because Skills are good") *or* as a distinctive research claim ("this is a write-scope contract that bounds agent amplification of strategic misreport"), prefer the research framing in docs and PR descriptions. Industry framing is table stakes; the research framing is what we actually own. Caveat: do NOT overclaim — see `docs/design/research-roadmap.md` §1 for the calibrated three-mechanism framing (non-amplification / cross-check / proper-scoring-rule), and avoid "revelation-principle" / "structurally incapable" / "capability-based security" without the scoping those terms require.

Skip this reflex and the project drifts back into "nice hackathon app." Engage it and the project stays a defensible research contribution.

---

## Non-negotiable product rules

1. Every request must support at least three projections:
   - applicant
   - utility
   - regulator

2. Every sensitive input field must be explicitly classified as one of:
   - public
   - private
   - derived

3. Raw private fields may not appear in:
   - utility view
   - unapproved regulator text
   - logs
   - traces
   - analytics events
   - browser storage

4. Policy, not prompt text, governs disclosure.

5. Explanations shown to any role may use only data allowed for that role.

6. The UI must remain workflow-first.

---

## Design taste

The interface should feel like:
- dossier
- grid-control room
- sealed evidence packet

Avoid:
- generic SaaS card soup
- playful mascots on core decision screens
- rainbow gradient “AI startup” visuals
- crowded dashboards

Use playful energy only in:
- framing lines
- transitions
- microcopy
- case-study codenames

---

## Technical architecture preferences

Prefer:
- Next.js + React + TypeScript for frontend
- FastAPI + Python for backend
- LangGraph for workflow orchestration
- Postgres + PostGIS for app and geospatial serving
- DuckDB for fixture generation and local analytics
- OPA/Rego for policy
- MapLibre for maps
- OpenTelemetry + Phoenix for traces
- Promptfoo + DeepEval for evals

Confidential worker:
- use a simulated enclave for local demo mode
- keep a clean interface that can later swap to GCP Confidential Space

---

## Available Claude Code plugin skills

When a plugin skill matches the task, invoke it rather than hand-rolling.

Installed (user scope, official marketplace):
- `/frontend-design:frontend-design` — distinctive frontend design passes. Used for `/about` v1 (classified-briefing × SCADA aesthetic).
- `/vercel:*` — Vercel deploy tooling.
- `rust-analyzer-lsp` — Rust LSP intelligence. Activate once with `rustup component add rust-analyzer`.
- `typescript-lsp` — TS intelligence for `apps/web`.
- `security-guidance` — worth consulting before touching signed-bundle / audit / policy-enforcement code.
- `feature-dev`, `pr-review-toolkit`, `commit-commands`, `skill-creator`, `claude-md-management` — workflow tooling.

Installed for the Tauri track (#4 in the roadmap) as of 2026-04-18:
- `dchuk/claude-code-tauri-skills` / skill `developing-tauri-plugins` — Tauri plugin dev (Rust core + JS bindings + platform-specific + permissions + lifecycle). The actual skill slug is `developing-tauri-plugins`, not `tauri-plugins` as the `playbooks add` prompt suggests.
- `actionbook/rust-skills` — idiomatic Rust patterns for the trust-critical projection path. Installs the full `rust-skills:*` family (m01-ownership … m15-anti-pattern, domain-web, domain-cli, domain-embedded, unsafe-checker, rust-code-navigator, etc.). Relevant once the Tauri Rust core starts expanding beyond the scaffold.
- `rust-analyzer` component — activated via `rustup component add rust-analyzer`. LSP ready.

Not yet installed (optional, post-scaffold):
- `P3GLEG/tauri-plugin-mcp` — embeds an MCP server in the running Tauri app so Claude can drive it for debug/test (screenshots, DOM, input sim). Useful when iterating on the side-by-side review screen without manual clicking.

---

## Privacy rules

Protected fields include, at minimum:
- internal schedule confidence
- detailed workload mix
- raw backlog / roadmap fields
- exact redundancy or shift percentages if marked private
- raw job-priority data
- any uploaded document sections explicitly marked private

Never serialize protected field values into:
- console logs
- exception messages
- trace attributes
- telemetry payloads
- browser caches

When debugging, log only:
- field classes
- hashes
- counts
- IDs
- policy reason codes

---

## Agent rules

Named agents should remain small and legible:
- Cartographer
- Interviewer
- Notary
- Referee
- Forecaster
- Explainer
- Switchboard (stretch only)

Do not create large autonomous swarms.

---

## Demo rules

The happy-path demo must always support:
1. applicant enters private inputs
2. public evidence is pulled
3. derived proofs are generated
4. utility sees proof-only projection
5. regulator sees visibility and audit trail
6. one counterfactual changes outcome

If something is simulated, label it clearly.

Do not imply:
- perfect forecast accuracy
- autonomous grid control
- impossible-to-break cryptographic guarantees unless actually implemented

---

## Testing rules

Any change touching:
- role projections
- proof generation
- policy
- traces/logging
must include at least one:
- unit test
- policy test
- eval
- regression fixture

Required test themes:
- no leakage
- projection consistency
- evidence presence
- counterfactual response
- rationale quality

---

## Coding rules

- Prefer explicit schemas over loose dicts
- Keep UI state small and typed
- Preserve determinism for demo fixtures where possible
- Avoid magical implicit role logic
- Prefer pure functions for projection and proof transforms
- Version prompts and policy bundles

---

## Copy rules

Good copy:
- “This stays sealed.”
- “Utility sees the proof, not the premise.”
- “What changed your energization band?”

Bad copy:
- “cutting-edge AI platform”
- “synergy”
- “seamless user-centric”
- “blockchain-like trust”

---

## What to optimize for

At all times optimize for:
1. problem clarity
2. privacy credibility
3. decision relevance
4. narrative sharpness
5. demo reliability

If a proposed change improves technical novelty but weakens legibility, reject it.
