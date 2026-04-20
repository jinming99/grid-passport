<!--
  AUTO-GENERATED — do not edit by hand.

  Substrate metrics for every shipping Claude Agent Skill in this repo,
  comparing the Skill substrate against its mechanically-derived
  prompt-only baseline. Regenerate with 'pnpm agents:metrics'. Drift
  gate 'pnpm agents:metrics:check' is part of the standard gate sweep.

  These numbers are comparative deltas and research-claim support,
  not API-billing estimates. Token counts are ~chars/4 heuristic.

  See packages/agents/interviewer/baselines/README.md for the case-
  study framing; docs/design/research-thesis.md §6b for the claims
  these metrics support; docs/story.md §6 for the talk slot.
-->

# Grid Passport — Agent Skill substrate metrics

Two shipping Skills (Interviewer, Cartographer), both following the same recipe, both measured against their prompt-only baselines. The pattern replicating across two independent Skills is what lets these numbers support a *substrate* claim rather than a single-skill fluke.

## 1. Context-cost deltas

Skill substrate loads content progressively (metadata always; body when triggered; references on demand). Prompt-only loads everything upfront on every call. Token estimates use ~4 chars/token.

| Skill | L1 metadata | L2 body (triggered) | L3 resources (on-demand) | Prompt-only (always) | Upfront saving | Triggered saving |
|---|---:|---:|---:|---:|---:|---:|
| interviewer | 341 tok | 2,356 tok | 4,977 tok | 8,141 tok | -95.8% | -66.9% |
| cartographer | 316 tok | 2,741 tok | 5,344 tok | 8,871 tok | -96.4% | -65.5% |
| priorauth-interviewer | 352 tok | 1,868 tok | 3,012 tok | 5,662 tok | -93.8% | -60.8% |
| explainer | 330 tok | 2,905 tok | 5,022 tok | 8,729 tok | -96.2% | -62.9% |

**Read this as:** Skill substrate occupies a *fraction* of the prompt-only's context budget at the moment the model is deciding whether to engage (upfront) and still a *fraction* once engaged (triggered), because REFERENCE.md / examples/ load only when the current turn needs them. The prompt-only substrate pays the full cost on every call whether the current turn needs the evidence or not.

## 2. Discovery-signal density

| Skill | Frontmatter fields | `when_to_use` present | Explicit NOT-use-for present | Prompt-only discovery signals |
|---|---:|:-:|:-:|---:|
| interviewer | 3 | yes | yes | 0 |
| cartographer | 3 | yes | yes | 0 |
| priorauth-interviewer | 3 | yes | yes | 0 |
| explainer | 3 | yes | yes | 0 |

**Read this as:** every Skill ships with structured discovery metadata (`name` + `description` + `when_to_use` with explicit NOT-use-for clauses pointing at sibling Skills). The flat-prompt baseline has zero separate discovery signal — the host has to guess from the content whether to route to this prompt at all. For #14's H-trigger test, this is the substrate-side prediction.

## 3. Write-scope enforcement density

These are the schema-discipline signals from research-thesis §3.1 (*schema-as-safety-case*). More enforcement clauses = more things structurally ruled out. Counted across the full Skill surface (SKILL.md body + REFERENCE/SOURCES + examples) — the exact content that also lives in the prompt-only baseline, so this is not a content-volume confound but a structural-density one.

| Skill | "Never" clauses | "halt" clauses | "refuse" clauses | Write-scope section headings | Validator contract-violations refused |
|---|---:|---:|---:|---:|---:|
| interviewer | 6 | 6 | 7 | 1 | 3 |
| cartographer | 6 | 9 | 2 | 1 | 4 |
| priorauth-interviewer | 5 | 5 | 12 | 1 | 0 |
| explainer | 4 | 8 | 3 | 1 | 5 |

**Cartographer extra:** source-URL whitelist size = **11** (every URL in sourceRefs[] must match one of these or be an applicant upload; the CI validator enforces this at every commit).

**Read this as:** every Skill carries a dense cloud of *structural refusals* — clauses that terminate the workflow if the model would otherwise write outside scope, and paired CI validators that refuse to ship an output that violates the contract. The prompt-only baseline has the same textual content but no paired validator; any schema violation the model makes would only be caught downstream, not at the Skill boundary.

## 4. Navigable-structure count

| Skill | Files in Skill dir | Worked examples | Reference depth (spec: 1) |
|---|---:|---:|---:|
| interviewer | 5 | 3 | 1 |
| cartographer | 5 | 3 | 1 |
| priorauth-interviewer | 3 | 1 | 1 |
| explainer | 5 | 3 | 1 |

**Read this as:** the Skill substrate is a *navigable filesystem*. The model can re-read `examples/lantern-cloud-evidence.md` mid-task when the current applicant looks like Lantern Cloud, rather than carrying all three examples' worth of tokens through every turn. The prompt-only substrate is one file; the model can only re-read *all* of it.

## 5. Mechanical-derivation discipline (research methodology)

| Skill | Baseline content-hash | Regeneration command |
|---|---|---|
| interviewer | `1fab1b125127be51` | `pnpm agents:baseline` |
| cartographer | `118f6fe979461988` | `pnpm agents:baseline` |
| priorauth-interviewer | `485fae34bc895913` | `pnpm agents:baseline` |
| explainer | `b61e11b35cf9de2c` | `pnpm agents:baseline` |

**Read this as:** the prompt-only baseline is not hand-maintained. Every Skill edit produces a new deterministic hash. The drift gate (`pnpm agents:baseline:check`) refuses merges that edit the Skill without regenerating the baseline — which is how the Skill-vs-prompt comparison stays fair across time.

## What these metrics directly support on a slide

Map from metric → research claim (from `docs/design/research-thesis.md`):

- §3.1 *schema-as-safety-case* → the write-scope enforcement density table (§3 above). More clauses = more structurally-ruled-out failure modes. Cartographer's source-whitelist + paired validator is the sharpest instance.
- §3.2 *agent-as-non-strategic-intermediary* → Interviewer's "never" + "halt" + "refuse" counts specifically, in the context of the non-coaching rule. The substrate literally refuses to coach.
- §3.3 *projection-as-purity* → the navigable-structure count. The deterministic layer (Forecaster / Referee, pure functions, no LLM) is not even in this table — zero stochastic surface.
- §3.4 *write-scope contracts as capability-based-OS for LLMs* → the validator-negative count. These are the write-scope violations the contract *refuses by construction*, mirroring capability-security kernel invariants.
- §5.1 *fair baseline comparison* → the mechanical-derivation discipline table. The drift gate is the research methodology.

For the behavioral metrics (#14 axis-scores vs baseline deltas on the 20-case bench), this table is the *leading-indicator* side: the substrate properties that predict and explain the behavioral deltas. When #14 runs, `docs/story.md` §6 gets both tables side-by-side.

