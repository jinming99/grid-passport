# 05 — Claude Code Plan

This project is unusually well-suited to Claude Code because it benefits from:
- strong repo-wide context
- multi-file coordination
- repeated build/eval loops
- custom agents with narrow responsibilities
- deterministic hooks and project instructions

Use Claude Code as a **team of specialist agents inside a disciplined harness**.

---

## Recommended Claude Code operating model

### Lead agent
One lead Claude session coordinates the repo.

### Specialist subagents
Project-level subagents handle:
- frontend storytelling polish
- policy and privacy review
- public-data ingestion
- evaluation and red-team
- backend/agent orchestration

### Deterministic hooks
Hooks enforce:
- no logging of protected fields
- lint/typecheck after edits
- eval smoke test before demo branch merges

---

## Why Claude Code is a fit here

Claude Code supports:
- **MCP** connections to external tools and data
- **hooks** for deterministic workflow enforcement
- **subagents** for specialized work
- **custom commands**
- **project instructions (`CLAUDE.md`)**

That is exactly what this repo needs.

---

## Use Claude Code for these jobs

### Excellent uses
- building and refactoring UI flows
- turning specs into components and route structure
- maintaining a shared type system
- wiring LangGraph nodes together
- writing policy tests
- generating synthetic case study fixtures
- creating promptfoo / deepeval configs
- polishing copy and microinteractions

### Bad uses
- inventing security claims on its own
- deciding what is private without explicit schema
- logging secrets during debugging
- making uncontrolled changes to policy rules
- vibe-coding the trust boundary

---

## Suggested project-level `CLAUDE.md`

A good `CLAUDE.md` should include:

### Core product rules
- This product is a confidential coordination workflow for large-load interconnection.
- Privacy claims must map to implemented boundaries.
- The app must preserve applicant, utility, and regulator views separately.
- All protected fields must be explicitly labeled with a privacy class.
- No raw protected fields may be written to logs, traces, analytics, or browser storage.
- Any generated explanation shown to the utility must use only released fields.
- The default experience is structured workflow, not free-form chat.

### Design rules
- Prefer dossier-style split-pane layouts.
- Avoid generic dashboard grids.
- Preserve strong information hierarchy.
- Keep the weird/fun energy in framing and motion, not in core decision surfaces.

### Engineering rules
- Every new feature must include at least one regression test or eval.
- Changes touching release policy or field visibility require policy tests.
- Prompt changes must be versioned and summarized in PR notes.
- Never introduce a model call on raw protected fields outside the confidential path.

---

## Recommended subagents

### 1) `demo-director`
**Purpose:** keep the story coherent  
**Use for:** landing page, microcopy, motion notes, role-switch clarity  

### 2) `policy-auditor`
**Purpose:** review privacy boundaries  
**Use for:** OPA policy, redaction paths, role views, trace hygiene  

### 3) `grid-cartographer`
**Purpose:** public evidence and geospatial data tasks  
**Use for:** FEMA/DEQ/SCC/Dominion connectors, fixture generation, map overlays  

### 4) `eval-engineer`
**Purpose:** own evaluation harness  
**Use for:** promptfoo config, deepeval tests, failure taxonomy, synthetic datasets  

### 5) `workflow-builder`
**Purpose:** backend orchestration  
**Use for:** LangGraph nodes, FastAPI endpoints, event flow, audit objects  

### 6) `frontend-craftsman`
**Purpose:** interface polish  
**Use for:** split-pane layouts, role toggles, state transitions, map/evidence panel  

---

## Example subagent prompts

### `demo-director`
- “Review the landing page and make the problem clearer in the first 8 seconds.”
- “Tighten the utility-view microcopy so it sounds like a planner, not a startup.”

### `policy-auditor`
- “Find any path where protected fields could leak into traces, logs, or frontend state.”
- “Review the applicant and utility projections and explain any mismatched visibility.”

### `eval-engineer`
- “Write regression evals for role leakage, evidence completeness, and scenario delta correctness.”
- “Generate 10 adversarial prompts trying to exfiltrate private fields.”

### `grid-cartographer`
- “Build a script that normalizes public evidence for the Owl Compute case study.”
- “Generate mock parcel and hazard layers for Prince William / Loudoun style scenarios.”

---

## Hooks to configure

### Hook 1 — after file edit
Run:
- formatter
- typecheck/lint for touched package

### Hook 2 — before commit
Run:
- unit tests for changed packages
- policy tests
- a minimal eval smoke test

### Hook 3 — block writes to risky areas without acknowledgment
Examples:
- policy bundle files
- trace logging config
- analytics event schema
- environment secrets

### Hook 4 — secret hygiene
Search diffs for:
- protected fixture field names
- accidental `console.log(request.privateProfile)`
- raw serialized intake blobs

If found, block and require explicit fix.

---

## MCP servers to add

### Essential
- filesystem
- postgres

### Nice to have
- github
- a custom `grid-evidence` server
- a custom `policy-sim` server

### `grid-evidence` server should expose tools like
- `lookup_parcel_context`
- `lookup_hazard_layers`
- `lookup_permit_refs`
- `lookup_interconnection_requirement_snippets`
- `build_evidence_packet`

### `policy-sim` server should expose tools like
- `project_request_for_role`
- `explain_release_decision`
- `diff_visibility_between_roles`
- `validate_trace_safety`

---

## Suggested Claude Code workflow

### Morning
1. Ask the lead agent to plan the day against the harness.
2. Spawn `workflow-builder` and `frontend-craftsman` in parallel.
3. Spawn `policy-auditor` on any sensitive PRs.

### Midday
4. Run the app.
5. Use `demo-director` to review the flow as a judge would.
6. Use `eval-engineer` to update failing evals or add missing coverage.

### Afternoon
7. Record a dry-run demo.
8. Use `demo-director` to tighten language and timing.
9. Run red-team evals.
10. Freeze the story.

---

## Custom command ideas

### `/build-happy-path`
implement or verify applicant → proof → utility → regulator flow

### `/run-demo-audit`
open key screens; verify role views; verify proof cards; verify audit trail

### `/red-team-privacy`
run leakage prompts; run policy projection tests; summarize failures

### `/case-study-seed <name>`
generate fixture package and expected outputs for one case study

---

## Minimal prompt discipline

Whenever Claude touches privacy-sensitive code, prompt like this:

> “You are editing a privacy-sensitive workflow.  
> Protected fields may not leave the confidential path.  
> Before writing code, list the protected fields involved, the allowed outputs, and where logs/traces could leak.  
> Then implement the smallest safe change.”

This improves outcome quality a lot.

---

## Recommended branch discipline

- `main` — only demo-safe code
- `feat/happy-path`
- `feat/policy-boundary`
- `feat/evals`
- `feat/case-studies`
- `feat/secure-worker` (stretch)

Have Claude summarize:
- what changed
- what privacy assumptions were introduced
- what tests were added
- what remains simulated

---

## Example “definition of done” prompts for Claude

### For frontend
“Do not stop until the applicant, utility, and regulator views all render from the same request object with different field visibility.”

### For backend
“Do not stop until the proof-generation endpoint creates derived outputs and an audit event using policy-approved projections.”

### For evals
“Do not stop until there is at least one regression test proving a private raw field never appears in utility mode or traces.”

---

## The one habit that matters most

Always ask Claude to reason in terms of:

1. raw protected field
2. derived proof
3. role-specific projection
4. audit artifact

If it drifts into vague “AI workflow” language, pull it back immediately.
