# @grid-passport/policy

Canonical release policy for Grid Passport, expressed as Rego.

## Files

- `grid-passport.rego` — field classifications (public / private / derived) and per-role visibility rules. This file is the source of truth.

## Runtime

For the current hackathon build, `packages/core/src/policy.ts` mirrors this Rego in TypeScript and runs the enforcement in-process. The Rego file exists so:

1. Policy decisions are expressible in a standard, auditable language.
2. Regulator mode can display the exact rules used, together with a content hash.
3. A future release can swap the TS mirror for a real OPA call (sidecar or WASM bundle) without changing the API surface.

## Running OPA directly

```sh
brew install opa

# Is a utility allowed to see private.flexPercent?
opa eval -d packages/policy/grid-passport.rego \
  --input <(echo '{"role":"utility","field":"private.flexPercent"}') \
  'data.grid_passport.allow'
# → false

# What reason code does the release-manifest get for this decision?
opa eval -d packages/policy/grid-passport.rego \
  --input <(echo '{"role":"utility","field":"derived.firmnessScore"}') \
  'data.grid_passport.reason'
# → "derived_proof_release"
```

## Drift

When the TS policy table and the Rego drift, the Rego wins (per intent). A CI job compiling the Rego → WASM and cross-checking each `{role, field}` decision against the TS table is on the roadmap.
