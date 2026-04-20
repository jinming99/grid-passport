# Grid Passport — Agent Skills

This directory is the canonical authoring home for Grid Passport's [Claude Agent Skills](https://agentskills.io). Claude Code auto-discovers any `SKILL.md` inside `.claude/skills/<name>/` in this project; personal Skills at `~/.claude/skills/` and plugin Skills take precedence in that order (enterprise > personal > project, per the spec).

The research framing for *why these Skills look the way they do* — write-scope contracts, revelation-principle-as-architecture, projection-as-purity, capability-security reframe — lives in **`docs/design/research-thesis.md`**. Read that first. Every SKILL.md should be readable as evidence for one of the four claims in §3 of the thesis.

## Roster

| Skill | Status | Write scope | Read scope | Thesis property |
|---|---|---|---|---|
| `interviewer/` | v0 scaffold (shipped 2026-04-18, grid) | `CaseInput` identity + operational + sensitive buckets via confirmed turns only; never `publicEvidence`, never `derivedProof` | applicant transcript + `REFERENCE.md` | §3.2 non-strategic intermediary |
| `cartographer/` | v0 scaffold (shipped 2026-04-18, grid, #8) | `CaseInput.publicEvidence` with mandatory `sourceRefs[]` matched against `SOURCES.md` whitelist; never `privateProfile`, never `derivedProof`, never identity | site location, external public records, `SOURCES.md`, applicant uploads | §3.1 schema-as-safety-case (provenance-bound retrieval) |
| `priorauth-interviewer/` | v0 substrate-transfer demo (shipped 2026-04-18, **healthcare**) | `PriorAuthCase` identity + clinical-justification buckets via confirmed turns; never `payerDecision`, never `claimCode`, never raw PHI | provider prose + `REFERENCE.md`; declines to accept PHI paste | §3.2 + §6 *recipe transfers* (second domain independently showing the substrate advantage in `packages/agents/metrics.md`) |
| `notary/` | planned (later) | `AuditEvent[]`; deterministic hashes only | finalized `CaseInput` | §3.3 projection-as-purity (ceremony-only) |
| `explainer/` | v0 scaffold (shipped 2026-04-20, grid, #13) | natural-language prose only; never writes structured fields | `ProjectedView` + `Role` (never raw `CaseInput`); `ROLE_VOICES.md` for voice specs | §3.4 write-scope dual: read-scope contract (paired validator `packages/agents/explainer/scripts/validate_narration.ts` — string-contains leak check against fixture-derived forbidden literals for non-applicant roles) |
| `switchboard/` | stretch (only ships if write-scope is defensible) | TBD | TBD | §3.4 architectural restraint |

**Forecaster** and **Referee** ship as pure functions in `@grid-passport/core`. They become Skills only when calibration evals (#14) demand LLM-backed variants.

## File layout per Skill

```
.claude/skills/<name>/
├── SKILL.md              REQUIRED · YAML frontmatter + markdown body. Body ≤ 500 lines.
├── REFERENCE.md          optional · field catalog or API reference (load on demand)
├── SOURCES.md            optional · endpoint registry (Cartographer only)
├── ROLE_VOICES.md        optional · role-conditioned prose patterns (Explainer only)
├── examples/             optional · worked examples; at least 3 per Skill, one per canonical case
│   ├── owl-compute-*.md
│   ├── lantern-cloud-*.md
│   └── kraken-train-*.md
└── (no scripts/ here)    ← CI validators + TS infra live in packages/agents/<name>/ instead
```

**Per-Skill validators live at `packages/agents/<name>/scripts/`**, not inside the Skill directory. They need `@grid-passport/core` type imports and participate in the pnpm workspace. The Skill's SKILL.md references them as shell invocations (`pnpm agents:validate`), which Claude Code executes via bash — the validator's source never enters the context window.

## Spec compliance checklist

Every SKILL.md in this directory must satisfy:

- [ ] `name` is lowercase + hyphens, ≤ 64 chars, no "anthropic"/"claude" reserved words, namespaced with `gridpassport-` to avoid collision with user-level skills
- [ ] `description` is third-person (not "I..." or "you..."), ≤ 1024 chars, includes *what* and *when*
- [ ] `when_to_use` lists concrete trigger phrases + explicit NOT-use-for list pointing at the right sibling Skill
- [ ] Body ≤ 500 lines
- [ ] References to bundled files are one level deep (SKILL.md → REFERENCE.md, SKILL.md → examples/*.md; **never** SKILL.md → A.md → B.md)
- [ ] No Windows-style paths (forward slashes only)
- [ ] No time-sensitive information in the main body (if needed, put in a collapsed "Old patterns" section)
- [ ] Consistent terminology (one term per concept across SKILL.md + REFERENCE.md + examples/)
- [ ] Explicit **write-scope contract** section naming every `FieldPath` group the Skill may and may not write (the load-bearing section; this is what makes the Skill research-legible)
- [ ] **Trust constraint checklist** at the bottom with the "I halt if" rules (see interviewer/SKILL.md §"Trust constraints (operational summary)" for the canonical shape)
- [ ] At least 3 examples in `examples/`, each anchored on one of the canonical fixtures (Owl Compute · Lantern Cloud · Kraken Train) and each demonstrating a *different* contract edge
- [ ] Paired CI validator at `packages/agents/<name>/scripts/` that runs clean on the fixture-derived positive cases and rejects the write-scope negatives

## Where these run

- **Claude Code (authoring)** — this directory is the source. `/gridpassport-interviewer` works in any Claude Code session in this repo.
- **Tauri desktop app (production)** — at packaging time we copy `.claude/skills/` into `apps/desktop/src-tauri/resources/skills/` so the binary ships with them. The Claude Agent SDK loads from that path at runtime. **Not wired yet**; tracked under #7 as a desktop-integration follow-up.
- **Web demo** — SKILL.md uploaded to the Claude API for hosted execution. Stage-only; no real disclosure. SKILL.md remains the single source; cross-surface is copy-from-source, not shared runtime.
- **Eval harness (#14)** — runs each Skill against fixture grids and compares against a prompt-only baseline (same SKILL.md content flattened into one system prompt). Per `docs/agents.md` §7.

## Adding a new Skill

1. Read `docs/design/research-thesis.md` §4 and add a row to the roster table above articulating the new Skill's write-scope + thesis property. If you can't, the Skill probably shouldn't ship.
2. Create `.claude/skills/<name>/SKILL.md` following the spec checklist above. Front-load the key use case in `description` (the listing truncates at 1,536 chars combined with `when_to_use`).
3. Add bundled references (`REFERENCE.md`, `SOURCES.md`, `ROLE_VOICES.md`) one level deep. Each ≤ 500 lines if possible; if longer, open with a table of contents.
4. Author ≥ 3 examples in `examples/`, one per canonical fixture.
5. Add the paired validator at `packages/agents/<name>/scripts/validate_*.ts` and a `pnpm agents:validate:<name>` script (wire into the root `package.json`). Include positive tests (from fixtures) + negative tests (write-scope violations).
6. Run the 12-gate sweep to confirm nothing regressed.
7. Update `packages/agents/README.md` and `docs/agents.md` §5a to reflect the new Skill.
