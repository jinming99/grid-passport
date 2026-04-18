# apps/api — Grid Passport FastAPI service

Mirror of the Next.js route handlers in Python. Not on the hot path today:
the Next.js app at `apps/web/` is the canonical runtime. This service
exists so that Phase 2 Python-dependent work (LangGraph agent graphs,
document parsing, LLM calls) can live alongside the frontend without a
later rewrite.

## Prereqs

- Python 3.11+
- [uv](https://docs.astral.sh/uv/) (one-time: `curl -LsSf https://astral.sh/uv/install.sh | sh`)

## Run

```sh
cd apps/api
uv sync
uv run uvicorn main:app --reload --port 8000
```

Then:

```sh
curl http://localhost:8000/health
curl http://localhost:8000/v1/cases
curl -X POST http://localhost:8000/v1/cases/owl-compute/scenario \
  -H 'content-type: application/json' \
  -d '{"flexPercent": 30}'
```

## Wiring from Next.js

The Next.js route handler at `apps/web/app/api/scenario/route.ts` runs
projection in-process today. When `GP_API_URL` is set in the web app's
env, it will proxy to this service instead. (Proxy path lands with the
first Python-only agent.)

## Parity notes

- `gridpassport/schemas.py` ↔ `apps/web/lib/types.ts`
- `gridpassport/policy.py` ↔ `apps/web/lib/policy.ts` ↔ `packages/policy/grid-passport.rego`
- `gridpassport/forecast.py` ↔ `apps/web/lib/forecast.ts`
- `gridpassport/fixtures.py` ↔ `apps/web/lib/fixtures/*.ts`

Keep these aligned. Drift between the two runtimes is a bug.
