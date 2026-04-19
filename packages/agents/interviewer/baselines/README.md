# Interviewer — Skill-vs-prompt baseline (research case study)

This directory holds the **prompt-only baseline** for the `gridpassport-interviewer` Agent Skill. It is the load-bearing empirical artifact for the research thesis's core claim (`docs/design/research-thesis.md` §3.1 — *schema-as-safety-case*):

> *Holding content fixed, a Skill substrate outperforms a prompt-only substrate on workflow alignment, write-scope compliance, and domain-spec accuracy.*

Without a fair-comparison baseline this is a vibes claim. With one it becomes a measurable, falsifiable hypothesis. That is what this directory exists for.

## What's in here

- **`prompt-only.md`** — the Skill content, flattened into a single system prompt. **Auto-generated** from the Skill source. Do not hand-edit.
- **`README.md`** — this file. The case-study framing + methodology + what the comparison does and does not prove.

## How it's generated

Mechanically. `packages/agents/interviewer/scripts/export_prompt_only.ts` concatenates, in deterministic order:

1. SKILL.md frontmatter (`description` → role preamble; `when_to_use` → trigger context)
2. SKILL.md body (workflow + write-scope contract + non-coaching rule + trust constraints)
3. REFERENCE.md (inlined)
4. `examples/*.md` in lexicographic order (inlined)

No paraphrasing, no editorial decisions, no hand-tuning. Any edit to the Skill source must be followed by `pnpm agents:baseline` to regenerate this file. A drift gate (`pnpm agents:baseline:check`, wired into the 12-gate sweep) fails CI if the committed baseline no longer matches the Skill source. This is how the comparison stays fair.

**Why mechanical derivation is the methodological move.** If the baseline were hand-maintained, any quality delta would be attributable to "the skill author spent more time polishing one side." With mechanical derivation, the delta is attributable to *packaging alone*: filesystem-based progressive disclosure + frontmatter metadata + file-boundary semantics vs. a single flat instruction block. That's the substrate question.

## What gets compared

Same inputs, same model, same output format, two substrates:

| Substrate | How it loads | Content access | Frontmatter metadata |
|---|---|---|---|
| **Skill** (`.claude/skills/interviewer/`) | Description (~100 tokens) pre-loaded; SKILL.md body loads when triggered (~5k tokens); REFERENCE.md and examples/ load via bash on demand | Filesystem-navigable; model can `cat` a specific example mid-task | `name`, `description`, `when_to_use` injected as discovery signal |
| **Prompt-only** (`baselines/prompt-only.md`) | Entire ~32KB flat document loaded as the system prompt at call start | Homogenized; model must hold full instruction set throughout | None; content is all "body" |

The hypotheses this comparison lets us test (per `docs/agents.md` §7a):

- **H-workflow.** Skill version stays in lane more reliably (Interviewer doesn't write `publicEvidence` or `derivedProof`). *Mechanism:* file boundaries reinforce the write-scope contract; progressive disclosure means the `examples/` whose contract edge matches the current turn is the one the model re-reads.
- **H-spec.** Skill version cites `FieldPath` buckets + ask-reasons correctly because REFERENCE.md stays a loadable-on-demand file rather than being buried in a 32KB prompt where attention dilutes.
- **H-trigger.** Skill version invokes at the right times and *not at the wrong times* more reliably because the `description` + `when_to_use` frontmatter is the discovery signal; the prompt-only version has no such signal and relies on the host's routing.
- **H-null (leak).** Both versions hold the zero-leakage floor (0 writes to `privateProfile`'s sensitive bucket without explicit confirmation). Neither should leak; if either does, the claim is in trouble.

The #14 eval harness implements these four tests on the 20-case fixture grid from `docs/agents.md` §7c.

## What this comparison does NOT prove

Enumerated because they are the honest limits of the claim:

- **Not a general claim about all Skills.** One Skill (Interviewer) on one domain (grid interconnection). Healthcare + financial-rails replications are future work (`docs/design/research-thesis.md` §6).
- **Not a claim about model capability.** Same model on both sides; the delta isolates substrate, not intelligence.
- **Not a claim about runtime efficiency.** The Skill version is more *context-efficient* (progressive disclosure saves tokens per turn), but this comparison scores output quality, not token cost. That's a separate (simpler) benchmark.
- **Not a claim that prompts are inferior for all tasks.** For short, unambiguous workflows a flat prompt may match or beat the Skill. The claim is specifically about **structured-elicitation under strategic-reporting incentives** — the setting where write-scope contracts, non-coaching rules, and bucket discipline have teeth.
- **Not a mechanism-design theorem.** This is empirical. The formal revelation-principle argument is still §7 gap #2 of the research thesis.

## Demo-ready framing (for the talk + `/about` page)

The 60-second version, for when the audience is not reading 600 lines of prompt:

> *We took an Interviewer Claude Agent Skill — about 120 lines of SKILL.md, a REFERENCE.md field catalog, and 3 worked examples of competitively-sensitive intake — and mechanically flattened it into a single 32KB system prompt with the same content. Same model, same inputs, two substrates. If the Skill substrate wins on workflow alignment, write-scope compliance, and domain-spec accuracy, that's evidence the safety properties come from the **packaging**, not just the content. This is what we mean by "the schema is the safety case."*

For the talk specifically: the slide is the 4-score matrix (Skill vs prompt-only, four metrics) with error bars from the 20-case bench. See `docs/story.md` §6 (currently placeholder; fills in when #14 lands).

## How to use this in an eval or ad-hoc experiment

```bash
# Regenerate the baseline (run after any Skill source edit)
pnpm agents:baseline

# Gate: fail CI if the committed baseline has drifted from Skill source
pnpm agents:baseline:check
```

For a single-case A/B test outside the #14 harness:

1. Pick one of the 3 example intakes (Owl / Lantern / Kraken). Extract the applicant utterances into a transcript file.
2. Run the Skill version via `/gridpassport-interviewer` in Claude Code (or the Claude Agent SDK with `.claude/skills/interviewer/` mounted).
3. Run the prompt-only version by setting `prompt-only.md` as the system prompt on the same model + feeding the same transcript.
4. Diff the outputs. Score both against the REFERENCE.md bucket rules + the 5-check trust-constraint checklist.

The #14 harness automates this at scale with an LLM-judge for the human-preference-alignment axis. Until #14 lands, the qualitative A/B is already useful for spot-checking whether a given Skill edit helped or hurt.

## Version

Generated from SKILL.md + REFERENCE.md + `examples/*.md`. To see the exact source the current `prompt-only.md` was derived from, check the `content-hash` in the file's HTML comment header and `git log -p .claude/skills/interviewer/` for matching revisions.
