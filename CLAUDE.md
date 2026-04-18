# CLAUDE.md

## Project identity

This repository implements **Grid Passport**, a confidential coordination workflow for large electric-load requests.

The core product idea is:
- applicants submit sensitive load/site/flexibility information,
- the system keeps protected fields inside a confidential path,
- the system computes derived proofs,
- utilities and regulators see only role-appropriate projections.

This is not a generic chatbot and not a generic dashboard.

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
