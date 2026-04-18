# Grid Passport

**Truth without disclosure.**

Grid Passport is a confidential coordination workflow for large-load electric interconnection. Applicants submit private load/site/flexibility details; the system computes derived proofs; utilities and regulators see only what policy allows.

This repo is a hackathon prototype. The demo surface is a dual-view workflow where the same request object renders differently for applicant, utility, and regulator — driven by a single policy, not by prompt text.

## Layout

```
grid-passport/
├── apps/
│   ├── web/                        # Next.js 16 · TypeScript · Tailwind 4
│   └── api/                        # FastAPI scaffold (parity mirror, Phase 2+)
├── packages/
│   └── policy/grid-passport.rego   # canonical release policy (source of truth)
├── grid-passport-harness/          # spec documents and subagent prompts
├── CLAUDE.md                       # project-level rules for Claude Code
├── pnpm-workspace.yaml
└── package.json
```

## Local development

Prerequisites: Node 20+, pnpm 10+ (via `corepack enable pnpm`).

```sh
pnpm install
pnpm dev           # → http://localhost:3000
pnpm typecheck
```

Python service (optional, Phase 2 scaffold):

```sh
pnpm api:sync      # installs uv env
pnpm api:dev       # → http://localhost:8000
```

## Demo routes

- `/` — landing, hero, release-diff preview
- `/demo/owl-compute` — 180 MW, Prince William, medium permit risk
- `/demo/lantern-cloud` — 95 MW, Loudoun, permit risk blocks readiness
- `/demo/kraken-train` — 240 MW, Fauquier, flexibility-dominant

Each case supports:
- role toggle (applicant / utility / regulator) with async projection
- counterfactual slider (applicant only) — POSTs to `/api/scenario`
- evidence panel with MapLibre map and synthetic overlays
- regulator mode — policy source with sha-256 + signed audit trail

## Privacy architecture

- `packages/core/src/policy.ts` — runtime mirror of the Rego
- `packages/policy/grid-passport.rego` — canonical source
- `packages/core/src/projection.ts` — pure function consumes policy + request
- `apps/web/app/api/scenario/route.ts` — server-side scenario endpoint; applicant baseline is the only role-dependent field returned

Raw private values do not ship to the browser unless the requesting role is `applicant`. See `lib/audit.ts` for the signed event trail.

## Deploy

Repo is private. A Vercel deploy targeting `apps/web` as the root directory will pick up the Next.js app automatically. When building, Vercel should run `pnpm install` from the repo root so workspace resolution works.

Quick path:

1. Push to GitHub (private).
2. Vercel → New Project → Import this repo.
3. Framework: Next.js (auto-detected).
4. Root Directory: `apps/web`
5. Install Command (override): `cd ../.. && pnpm install`
6. Build Command: `pnpm build` (default).
7. Output Directory: `.next` (default).

## Status

- Phase 0 — landing + dual-view role toggle · done
- Phase 0.5 — three cases + selector · done
- Phase 0.6 — counterfactual slider · done
- Phase 1 — server-side projection, Rego canon, FastAPI scaffold · done
- Phase 2 — MapLibre evidence, audit trail · done
- Phase 3+ — OPA runtime, LLM Explainer, real cloud Confidential Space · planned

All numeric data in the demo is synthetic. The confidential-compute boundary is simulated; the policy-governed release layer is real.
