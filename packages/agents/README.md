# @grid-passport/agents — CI validators for Grid Passport's Claude Agent Skills

This package holds **CI-side validators and workspace-scoped TypeScript infra** for Grid Passport's Agent Skills. Authoring source for each Skill (`SKILL.md`, `REFERENCE.md`, bundled examples) lives at **`.claude/skills/<name>/`** at the repo root, where Claude Code auto-discovers them per the [Agent Skills spec](https://agentskills.io). This split is deliberate:

- **`.claude/skills/<name>/`** is the authoring + runtime source. Claude Code loads it; the Tauri app will bundle it; the web demo uploads it to the Claude API. Markdown-only.
- **`packages/agents/<name>/scripts/`** holds CI validators written in TS. They need `@grid-passport/core` type imports and participate in the pnpm workspace, so they can't live inside the Skill directory. The Skill's SKILL.md references them as shell invocations (`pnpm agents:validate`), and Claude Code executes them via bash — validator source never enters the Skill's context window.

Start with **`.claude/skills/README.md`** for the Skill roster + write-scope + thesis-property table + spec compliance checklist. Start with **`docs/design/research-thesis.md`** for the research framing that makes these Skills evidence for a research program rather than enterprise-agent hygiene.

## Validators in this package

| Skill | Validator | Script |
|---|---|---|
| Interviewer | `packages/agents/interviewer/scripts/validate_caseinput.ts` (CLI) · `packages/agents/interviewer/src/validator.ts` (pure, browser-safe; `@grid-passport/agents/interviewer/validator`) | `pnpm agents:validate:interviewer` |
| Cartographer | `packages/agents/cartographer/scripts/validate_publicevidence.ts` | `pnpm agents:validate:cartographer` |
| Explainer | `packages/agents/explainer/scripts/validate_narration.ts` (CLI) · `packages/agents/explainer/src/validator.ts` (pure, browser-safe; `@grid-passport/agents/explainer/validator`) | `pnpm agents:validate:explainer` |
| Notary (later) | planned at `packages/agents/notary/scripts/validate_auditevents.ts` | — |

Each validator enforces the Skill's **write-scope contract** from the research thesis: the specific `FieldPath` groups the Skill may and may not write. A failure is a contract violation, not a warning.

Positive test pattern: derive a Skill-shaped output from the three canonical fixtures (Owl Compute · Lantern Cloud · Kraken Train) by stripping fields outside the Skill's scope, then validate. Negative test pattern: inject a write-scope violation and assert the validator rejects it. Every validator should include both.

## Adding a new Skill validator

1. New subdir `packages/agents/<name>/scripts/validate_<output>.ts`. Strict TS, zero-dep beyond `@grid-passport/core`.
2. Export a pure `validate<Name>Output(raw: unknown): OutputType` that throws a named `<Name>ContractViolation` on the first violation.
3. Add a `runSelfTest()` function with 3 positives (derived from fixtures) + 3 negatives (write-scope violations, shape errors, sum-check failures).
4. Wire into the package `scripts`: `"validate:<name>": "tsx <name>/scripts/validate_<output>.ts"`.
5. Wire into the root `package.json`: `"agents:validate": "pnpm -r --parallel validate"` once there's more than one; until then keep the per-Skill script explicit (`agents:validate:interviewer`).
6. The paired SKILL.md at `.claude/skills/<name>/SKILL.md` must reference the validator under "Bundled resources" (as a shell invocation, not a file include).
