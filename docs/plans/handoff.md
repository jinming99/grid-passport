# Grid Passport — Handoff

Durable record of project state, decisions, and what future work needs to know. Read this first when resuming — it's versioned with the code, so it won't drift the way out-of-repo notes do.

## Identity

- **Product + brand:** Grid Passport
- **Tagline:** Truth without disclosure
- **One-liner:** Confidential coordination workflow for large-load grid interconnection. Applicants submit private load/site/flexibility inputs; utilities and regulators see only policy-approved projections and derived proofs.
- **Repo:** https://github.com/jinming99/grid-passport (private)
- **Canonical harness:** `grid-passport-harness/` (8 spec docs + CLAUDE.md + subagent prompts)

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
| 3b  | Vercel deploy | done — https://grid-passport-qt7zprvm8-ming-jins-projects.vercel.app |
| 4+  | Planned: OPA runtime (WASM), LLM Explainer, eval harness (promptfoo + deepeval), PDF export, real Confidential Space | planned |

## Architecture

```
grid-passport/
├── apps/
│   ├── web/                            Next.js 16 · TS · Tailwind 4 · App Router
│   │   ├── app/
│   │   │   ├── page.tsx                hero + release-diff teaser
│   │   │   ├── demo/
│   │   │   │   ├── page.tsx            redirects to /demo/owl-compute
│   │   │   │   └── [caseId]/page.tsx   server component · projects for initial role only
│   │   │   └── api/scenario/route.ts   POST · returns {view, auditEvents, baselineFlexPercent}
│   │   ├── components/                 DemoClient, RoleToggle, RequestView, FieldRow,
│   │   │                               FieldChip, SectionCard, LeakCounter, CaseSelector,
│   │   │                               CounterfactualSlider, MapPanel, EvidencePanel,
│   │   │                               AuditTrail, PolicyPanel
│   │   └── lib/
│   │       ├── types.ts                CaseInput · RequestRecord · FieldPath · Role · ...
│   │       ├── policy.ts               POLICY table (runtime mirror of the Rego)
│   │       ├── policy-source.ts        reads the Rego file + sha-256 at request time
│   │       ├── projection.ts           projectForRole(req, role) → ProjectedView
│   │       ├── forecast.ts             forecast(case, override?) → DerivedProof
│   │       ├── audit.ts                buildAuditTrail(case, record, role, override)
│   │       ├── fixtures/               owl-compute.ts · lantern-cloud.ts · kraken-train.ts · index.ts
│   │       └── geo/                    synthetic GeoJSON per case
│   └── api/                            FastAPI parity (uv · Python 3.11+) — Phase 2 target
├── packages/
│   └── policy/grid-passport.rego       canonical release policy (source of truth)
├── grid-passport-harness/              specs + subagent prompts (don't delete)
├── docs/plans/handoff.md               this file
├── CLAUDE.md                           project rules
├── vercel.json                         monorepo build config
└── pnpm-workspace.yaml
```

## The privacy claim, precisely

- `packages/policy/grid-passport.rego` is the canonical source of field visibility rules.
- `apps/web/lib/policy.ts` mirrors it as the runtime (TS). Python mirror lives at `apps/api/gridpassport/policy.py`. **Drift between these three is a bug.**
- Initial page render at `/demo/[caseId]` projects for one role only (default `utility`). Role switches and counterfactuals go through `/api/scenario`, which returns only the selected role's view.
- `/api/scenario` returns `baselineFlexPercent` only when `role === "applicant"`. Every other role gets `null`. This was a real fix after a Phase 0 leak where pre-projecting all three roles shipped raw `0.68` to the browser.
- Raw private values exist in browser memory only when the user is actively in the applicant role (they're authorized to see their own data).
- In the demo we simulate the confidential boundary. The release/policy layer is real; the TEE is not. Stage this honestly.

## Decisions already made (don't re-litigate)

- **Name:** "Grid Passport" — product and brand. WhisperGrid codename dropped after "whisper = secrecy" conflict with the policy-governed-transparency pitch.
- **Stack:** Next.js + TS + Tailwind for frontend. FastAPI for Phase 2+ Python-only work. OPA/Rego as policy canon, runtime-mirrored in TS. pnpm 10 monorepo. Vercel for hosting.
- **Phase 0 deliberately used Next.js only** (no FastAPI). FastAPI added in Phase 1c as a scaffold; swap path documented but not wired.
- **OPA runtime not wired yet.** Rego is the source, TS is the enforcement. The UI renders the Rego text + sha-256 in regulator mode so the claim is inspectable.
- **Synthetic fixtures, not real utility data.** Every number is labeled synthetic. Do not imply otherwise on stage.

## Harness bugs reconciled in code (don't re-introduce)

The original `grid-passport-harness/` docs contained three schema inconsistencies that would break a clean fixture→DB path. Fixed during Phase 0:

- Field name: `internalScheduleConfidence` (not `internal_confidence` from `04-implementation-plan.md`)
- BESS/backup units: MW (not kW from `04`)
- Workload mix: object `{training, inference}` (not scalar from `04`)

When adding new fields, consult this list first — don't copy from the harness docs blindly.

## Extending

Add a new field:
1. Add to `FieldPath` union in `apps/web/lib/types.ts`.
2. Add an entry to `POLICY` in `apps/web/lib/policy.ts`.
3. Mirror in `packages/policy/grid-passport.rego` field_class map.
4. Mirror in `apps/api/gridpassport/policy.py`.
5. Update fixtures (TS + Python).
6. Run `pnpm typecheck` — catches most TS-side drift.
7. Add a canary to the privacy smoke check.

Add a new case:
1. New fixture file in `apps/web/lib/fixtures/`.
2. Register in `apps/web/lib/fixtures/index.ts` + `apps/api/gridpassport/fixtures.py`.
3. Synthetic SiteGeo in `apps/web/lib/geo/synthetic.ts`.
4. Audit anchor timestamp in `CASE_ANCHOR` inside `apps/web/lib/audit.ts`.

## Versions

- Node 20 · pnpm 10.33.0 · Next.js 16.2.4 · React 19.2.4 · Tailwind 4 · TypeScript 5 · maplibre-gl 5.23.0
- Python 3.11+ · FastAPI 0.115+ · pydantic 2.9+ · uv

## Operational notes

- Dev server: `pnpm dev` → http://localhost:3000
- Typecheck: `pnpm typecheck` (runs on the web workspace)
- FastAPI (optional): install uv, then `pnpm api:sync && pnpm api:dev` → http://localhost:8000
- Repo was initialized with `git init --initial-branch=main`. First commit: `03d8b57 initial hackathon build (phases 0–2)`.
- Memory files in `~/.claude/projects/...` have been retired in favor of this doc. Don't resume persisting state there for this project.

## Open items

- **Vercel deploy** — done. Project `ming-jins-projects/grid-passport-web`, linked to GitHub for auto-deploy on `main`. Settings live server-side (no `vercel.json` in repo): Root Directory = `apps/web`, framework = nextjs, install = `cd ../.. && pnpm install --frozen-lockfile`, build = `pnpm run build`, output = `.next`. SSO/password protection disabled (public hackathon demo). To re-link locally: `vercel link --yes --project grid-passport-web`. Local sanity: `vercel pull --yes --environment=production` from `apps/web/`.
- **OPA WASM runtime** — Rego is canonical, but still evaluated by a TS mirror. Plan: precompile `grid-passport.rego` → WASM, load in-process in the Next.js route handler. Remove the TS mirror once cross-checked.
- **LLM Explainer agent** — a Claude API call that turns released proofs into role-specific prose ("why this customer is in this treatment band"). Must only consume the ProjectedView, never the raw request. First Python-only agent; motivates the Next.js → FastAPI proxy.
- **Eval harness** — promptfoo + deepeval per the spec. At minimum: role-leakage tests, counterfactual-responsiveness, evidence recall.
- **Regulator PDF export** — snapshot of policy + audit + manifest for offline review.

## What this doc is *not*

It is not a status page. It is a handoff — the set of facts the next person (or next session) needs to not-screw-up. Keep it short. When something lands, update it. When something's wrong, fix the code and then the doc.
