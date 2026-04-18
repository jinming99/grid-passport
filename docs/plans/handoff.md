# Grid Passport — Handoff

Durable record of project state, decisions, and what future work needs to know. Read this first when resuming — it's versioned with the code, so it won't drift the way out-of-repo notes do.

## Identity

- **Product + brand:** Grid Passport
- **Tagline:** Truth without disclosure
- **One-liner:** Confidential coordination workflow for large-load grid interconnection. Applicants submit private load/site/flexibility inputs; utilities and regulators see only policy-approved projections and derived proofs.
- **Repo:** https://github.com/jinming99/grid-passport (private)
- **Canonical harness:** `grid-passport-harness/` (8 specs + CLAUDE.md + 6 subagent prompts in `.claude/agents/`)
- **Vision + design choices:** `docs/vision.md` — read this to understand *why this shape*. Includes team & origins (§0), the schema-justification 5-test filter (§4b) — read before adding any new `CaseInput` field, the local-first trust pivot (§5), the reliability triad and "agents propose, humans dispose" framing (§5b–§5c), and why the web demo + Tauri app coexist (§10).
- **Privacy mechanism case:** `docs/privacy-claim.md` — read this for the mechanical-evidence story.
- **Agent architecture + Claude Skills + research connection:** `docs/agents.md` — trust principles mapped to the reliability triad (§2), human-AI collaboration framing (§3), agent roster, Claude Agent Skills implementation pattern, eval framework with concrete N-targets and student-handoff task breakdown (§7), Ming Jin's research agenda on calibrating skills for workflow / human-preference / domain-spec alignment (§6).
- **Story / talk-arc narrative:** `docs/story.md` — single source of truth for both Ming's job talk and the website's `/about` page. Pre-talk it gates on the eval harness landing (§6 placeholder).
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
| 5+  | Planned — see `docs/plans/roadmap.md`. Next: **#6 Signed disclosure bundle protocol** (Ed25519 + audit-chain inclusion; Dominion intake as the counterparty), or **#14 Eval harness** for Ming's job talk (parallel track, 3 student owners already briefed) | planned |

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
│   └── desktop/                        Tauri 2.x shell · Vite + React + TS frontend · Rust core
│       ├── src/
│       │   ├── App.tsx                 top-level: two-mode (work/review) · case picker · file loader · review gate + export terminus
│       │   ├── components/             ReviewColumn (work|review variant), MiniBenefit, ProjectionSections (bucket-tiered with ⓘ tooltips)
│       │   ├── lib/
│       │   │   ├── case-loader.ts      dialog.open + fs.readTextFile + structural validate against CaseInput
│       │   │   └── bundle.ts           DisclosureBundle shape (v0) + dialog.save + fs.writeTextFile
│       │   ├── styles.css              terminal-flavored vanilla CSS (no Tailwind on desktop yet)
│       │   └── main.tsx
│       ├── scripts/canary-desktop.ts   asserts @grid-passport/core imports + 3-case × 3-role projection invariant
│       ├── vite.config.ts              port 1420 · strictPort · TAURI_ENV_* env · esnext target
│       └── src-tauri/                  Rust crate `grid-passport-desktop` (lib `grid_passport_desktop_lib`)
│           ├── tauri.conf.json         identifier app.gridpassport.desktop · window 1180×760
│           ├── Cargo.toml              tauri 2.10 · tauri-plugin-{log,dialog,fs} 2 · AGPL-3.0-or-later
│           ├── capabilities/default.json  dialog + fs read/write scoped to `**` (narrow for prod in #12)
│           ├── icons/                  generated via `cargo tauri icon` from a placeholder source
│           └── src/{main.rs,lib.rs}    Tauri builder · dialog + fs + log plugins registered
├── packages/
│   ├── core/                           @grid-passport/core · subpath exports · shared across web + desktop
│   │   └── src/
│   │       ├── types.ts                CaseInput · RequestRecord · FieldPath · Role · ...
│   │       ├── policy.ts               POLICY table (runtime mirror of the Rego) · enforcement
│   │       ├── projection.ts           projectForRole(req, role) → ProjectedView
│   │       ├── forecast.ts             forecast(case, override?) → DerivedProof
│   │       ├── audit.ts                buildAuditTrail(case, record, role, override)
│   │       ├── ask-reasons.ts          FieldPath → {bucket, why} · UX layer (tooltips, tier labels)
│   │       ├── fixtures/               owl-compute · lantern-cloud · kraken-train · index
│   │       └── geo/                    synthetic GeoJSON per case
│   └── policy/grid-passport.rego       canonical release policy (source of truth)
├── grid-passport-harness/              specs + .claude/agents/ subagent prompts (don't delete)
├── docs/
│   ├── vision.md                       team, big-picture framing, trust pivot, reliability triad, web/desktop coexistence
│   ├── privacy-claim.md                the case for the privacy claim — read this for stage
│   ├── agents.md                       agent architecture, Claude Skills, eval targets, research connection
│   ├── story.md                        talk-arc narrative — renders to website /about, drives the job-talk slides
│   ├── evals/
│   │   ├── rubric.md                   APPROVED 2026-04-18 · human-preference axis rubric (Explainer Skill)
│   │   └── owner-briefs.md             per-owner briefs for the §14 eval harness (students A/B/C)
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
- **Synthetic fixtures, not real utility data.** Every number is labeled synthetic. Do not imply otherwise on stage.
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

- Dev server: `pnpm dev` → http://localhost:3000
- Typecheck: `pnpm typecheck` (runs on the web workspace)
- Lint: `pnpm lint` (eslint, web workspace)
- Privacy canary: `pnpm privacy:canary` (mechanical privacy check; see `docs/privacy-claim.md` §2c)
- FastAPI (optional): install uv, then `pnpm api:sync && pnpm api:dev` → http://localhost:8000
- Desktop (Tauri) dev: `pnpm desktop:dev` (launches the Tauri window; requires `~/.cargo/bin` on PATH — `source ~/.cargo/env` if `cargo` is not found)
- Desktop build: `pnpm desktop:build` (produces unsigned DMG + .app on macOS; MSI/AppImage on other platforms — untested for v0)
- Desktop typecheck: `pnpm desktop:typecheck`
- Desktop canary: `pnpm canary:desktop` (asserts apps/desktop imports `@grid-passport/core` and projection invariant holds on bundled fixtures)
- Repo was initialized with `git init --initial-branch=main`. First commit: `03d8b57 initial hackathon build (phases 0–2)`.
- Memory files in `~/.claude/projects/...` have been retired in favor of this doc. Don't resume persisting state there for this project.

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

- **No unit/integration tests yet.** The privacy canary is mechanical evidence for the projection layer, but `forecast.ts`, `audit.ts` proper, and the route handlers have no test suite. CLAUDE.md mandates tests for any change touching projections/policy/proofs/traces — wire this before the next round of changes there. Pytest is already in `apps/api/pyproject.toml` dev deps; the TS side needs vitest or a similar pick. (Tracked in roadmap backlog.)
- **Derivation transparency — partial.** `flexibilityPassport.durationHoursMin/Max` was re-derived as coarse BESS tier bands (2026-04-18), so `bessHours` no longer leaks through that pair. Remaining surfaces with the same "monotone-invertible from a private input" risk: `flexibilityPassport.mwMin/Max`, `firmnessScore`, `expectedPeakMW`. A shared band-design pattern for the remaining derived fields is tracked in the roadmap backlog (`derivation transparency review, part 2`).
- **Desktop v0 has audit trail stubbed out of the export bundle.** `@grid-passport/core/audit` uses `node:crypto` (sync SHA-256) which doesn't bundle cleanly into the Vite webview. v0 `DisclosureBundle` contains projections + policy version + timestamp only. Audit-chain inclusion + Ed25519 signing land together in #6 (signed bundle protocol) — the right place to design the on-wire format once rather than twice.
- **Desktop icon is a placeholder** upscaled from the generated 256×256 PNG; bake a real branded icon before distribution (see roadmap backlog: `desktop packaging polish`).
- **Desktop fs capabilities are scoped to `**`.** OK for local dev where the dialog gates file selection, not OK for a shipped binary. Narrow to user-selected dir + app data dir before distribution (see roadmap backlog: `desktop packaging polish`).

## What this doc is *not*

It is not a status page. It is a handoff — the set of facts the next person (or next session) needs to not-screw-up. Keep it short. When something lands, update it. When something's wrong, fix the code and then the doc.
