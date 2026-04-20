# Explainer baseline — case-study artifact

The Explainer Skill ships with a **mechanically-derived prompt-only baseline** at `prompt-only.md`, produced by concatenating SKILL.md + ROLE_VOICES.md + all `examples/*.md` into a single flat prose system prompt. This file follows the same case-study pattern as the Interviewer baseline — see `packages/agents/interviewer/baselines/README.md` for the framing, methodology, and honest-limits list that applies to every Grid Passport Skill baseline.

## What's specific to the Explainer baseline

- **Distinguishing axis**: Explainer is the **read-scope Skill** (§3.4 write-scope dual in `docs/design/research-thesis.md`). The baseline measures whether flat-prompt packaging of the same content preserves the read-scope contract (ProjectedView-only, no raw privateProfile) and the non-embellishment rule (no invented numbers, no cross-case comparisons).
- **Validator signal**: the paired validator at `../scripts/validate_narration.ts` is a **string-contains leak check** against fixture-derived forbidden literals. A flat-prompt-substrate narration that drifts into "the applicant's internal confidence is around 0.68" on a utility view fails the same gate the Skill-substrate narration does. This keeps the comparison symmetric: both substrates run against the same behavioral contract, one shipped as structured metadata + filesystem navigation, one shipped as a single system prompt.
- **Role conditioning**: unlike Interviewer (single behavior, one output shape), Explainer's behavior branches on the `role` input. The baseline tests this by running the flat prompt on all three roles × three fixtures = 9 narrations; the Skill runs on the same 9 inputs. Substrate-property deltas (upfront token cost, discovery-signal density, write-scope enforcement density) are measured once per substrate; behavioral deltas are measured per narration.

## Drift gate

Edit to any of SKILL.md / ROLE_VOICES.md / examples/*.md triggers `pnpm agents:baseline:check` to flag `prompt-only.md` as drifted until regenerated. Run `pnpm --filter @grid-passport/agents baseline:explainer` (or `pnpm agents:baseline` for the full shipping-Skill roster) and commit the result.

## What this baseline does NOT claim to be

- **An evaluation.** The baseline is the *fair-comparison artifact*. The evaluation is `docs/evals/sim-bench-design.md` (#14). The baseline's existence is necessary for fair comparison; it does not by itself claim the Skill substrate is better.
- **A recommended way to deploy the Explainer.** Production wiring is the Skill substrate on the desktop (Track 2.2-polish) and the hosted Claude API on the web demo. The flat prompt exists as a research instrument.
- **A replacement for the Skill source.** The SKILL.md + ROLE_VOICES.md + examples/ are the canonical authoring surface. The baseline is a read-only derivative regenerated on every edit.
