# Grid Passport — Agents and Claude Agent Skills

> Small, named, single-responsibility agents — built as Claude Agent Skills — that make confidential disclosure tractable for a human user without ever taking authority away from them.

This doc is the design record for the AI-agent layer of Grid Passport.
It exists because the agent layer is *not* a polish item; it is the
mechanism by which the local-first product becomes usable, and it is
the research vehicle for calibrating agent skills against real
workflow, human preferences, and domain specifications.

Three things, in order:

1. **Why agents matter** — the role they play in the local-first product.
2. **The principles** — trust, collaboration, coordination — encoded as constraints, not slogans.
3. **The implementation** — Claude Agent Skills, the agent roster, and the research connection to skill calibration.

For the broader product vision see `docs/vision.md`. For the privacy
mechanism see `docs/privacy-claim.md`. For what's shipping next see
`docs/plans/roadmap.md`.

---

## 1. Why agents matter for Grid Passport

The local-first architecture (`docs/vision.md` §5) puts the applicant
in charge of their own data. That is the trust story. But it has a
cost: the applicant now has to do all the work that a hosted service
would have done for them — fill in structured fields, gather public
evidence, review what each role will see, audit their own bundle
before exporting.

Without an agent layer, the local app is a glorified form. With it,
the applicant can:

- Speak normally ("we're building 180 MW in Prince William, target COD October 2028") and have the structured `CaseInput` populated.
- Have public evidence (DEQ permits, FEMA flood overlays, county zoning) gathered in seconds rather than hours.
- Get a plain-English explanation of what each role will see and why each derived proof landed where it did.
- Review every projection side-by-side before clicking export.

Agents are the **friction-reducing wedge** that makes the local-first
trust model commercially viable. Without them, the local-first pitch
loses to "just upload a PDF" every time.

This is why agents are not a Phase 5+ flourish; the Interviewer and
Cartographer agents are in the near-term roadmap alongside the Tauri
shell.

---

## 2. Trust principles, encoded as constraints

The CLAUDE.md harness rule says: *named agents should remain small and
legible*. The principles below are how that rule cashes out for an
agent layer that has to handle confidential data.

These principles map onto the **reliability triad** introduced in
`docs/vision.md` §5b — *auditable*, *constrained*, *calibratable*:

- **Constrained** is enforced by §2a (agents cannot autonomously release) and §2b (agents cannot bypass policy). The architecture makes the failure mode unrepresentable.
- **Auditable** is enforced by §2d (typed-artifact handoffs leave a content-addressed trail) and the existing audit chain.
- **Calibratable** is enforced by §2c (small, named, single-responsibility agents are easy to evaluate independently) and the Skills-as-substrate choice in §5.

The fourth property — **agents propose, humans dispose** — is not in
§2 because it's an interface property, not a constraint property. It
lives in §3.

### 2a. Agents never autonomously release data

Every agent that touches a private field is **structurally incapable**
of releasing it to a non-applicant projection:

- Agents read raw inputs from the applicant's local file. They write *only* to fields the applicant explicitly approves.
- Agents that produce derived outputs (Forecaster) write to the `derivedProof` section, which the policy classifies as releasable. The release decision is made by the policy, not the agent.
- The export step (signed disclosure bundle) is **always** a human-confirmed action. No agent presses the export button.

This is enforced in two places:

- The local app UI: every write originating from an agent is shown to the user with a diff, and approved before being committed to the in-memory `CaseInput`.
- The privacy canary: the same mechanical check that catches direct leaks (`pnpm privacy:canary`) runs on agent-written outputs too. An agent that accidentally puts a private value in a non-applicant projection trips the same alarm.

### 2b. Agents never bypass policy

Every projection is computed by the canonical projection function
(`packages/core/src/projection.ts`), regardless of who or what produced the
inputs. Agents do not have a "fast path" that skips the projection
layer. If the Cartographer agent fetches a piece of public evidence
that turns out to need to be classified `private`, it goes through the
same Rego field-class table as everything else.

### 2c. Agents are small, named, and single-responsibility

This is a literal rule from CLAUDE.md. Each named agent has one job:

- **Interviewer** — turn natural language into structured input.
- **Cartographer** — fetch public evidence.
- **Notary** — seal private inputs and compute audit anchors.
- **Forecaster** — run the derivation.
- **Referee** — apply the policy and produce projections.
- **Explainer** — narrate projections in role-appropriate prose.
- **Switchboard** — orchestrate the others. Stretch only; we do not ship this in the first cut.

There is no "let an agent decide what to do next" agent. The
orchestration is workflow-driven. Agents wait their turn.

### 2d. Agents hand off via structured artifacts, not free-form messages

Coordination between agents happens through the typed objects already
defined in `packages/core/src/types.ts`:

- Interviewer outputs a `CaseInput`.
- Cartographer outputs a `PublicEvidence`.
- Notary outputs an `AuditEvent[]`.
- Forecaster outputs a `DerivedProof`.
- Referee outputs a `ProjectedView`.
- Explainer outputs natural-language prose conditioned on a `ProjectedView` only.

This means: no agent can manipulate another by injecting prompt-like
instructions into a free-form message. The interface between agents is
a typed schema. Prompt injection from upstream sources (e.g., a
Cartographer-fetched DEQ document containing adversarial text) cannot
reach a downstream agent's reasoning, because the downstream agent
consumes a typed `PublicEvidence` not a string.

This is the operational form of CLAUDE.md's rule "do not create large
autonomous swarms."

---

## 3. The human-collaboration model — agents propose, humans dispose

> *Agents are not given authority. They are given a job: propose well-formed structured outputs that the human can accept quickly when they are right and reject cheaply when they are wrong.*

This is the design principle, named. The reliability of the agent
layer is judged on how well it accelerates the human's confirmation,
not on whether it can take actions independently. The closest analog
from another domain: tax-preparation software. The local app fills
out your return; you review every line; you press the file button.
Grid Passport applies the same shape to a higher-stakes
multi-stakeholder workflow.

The applicant is **always in the loop**. Concretely:

| Step                                  | Agent action                                                      | Human action                                                        |
| ------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| Form intake                           | Interviewer parses NL → proposed `CaseInput`                      | Applicant reviews diffs field-by-field, accepts or edits            |
| Public evidence                       | Cartographer fetches → proposed `PublicEvidence` with source URLs | Applicant verifies sources are appropriate, accepts                 |
| Sealing private profile               | Notary computes hashes                                            | Applicant sees sealed-field count and hash before commit            |
| Derivation                            | Forecaster runs `forecast()`                                      | Applicant sees the derived proof; can run counterfactuals           |
| Projection                            | Referee applies policy                                            | Applicant reviews **all three role views side-by-side**             |
| Explanation                           | Explainer narrates                                                | Applicant reads, can ask follow-ups                                 |
| Export                                | (no agent)                                                        | Applicant explicitly clicks export, picks destination               |

The applicant never receives a "trust me, I sent it" answer. Every
agent action is visible, diff-able, and reversible until the export
moment.

This is the answer to "how do we trust your tool?" — the same way you
trust your tax software: you see what it filled in, you correct it,
and you press the file button.

---

## 4. The agent roster (per harness)

| Agent         | Input                                                | Output                       | Phase   | Trust constraint                                                      |
| ------------- | ---------------------------------------------------- | ---------------------------- | ------- | --------------------------------------------------------------------- |
| Interviewer   | NL utterances + partial `CaseInput`                  | proposed `CaseInput`         | near    | Must not invent values. Must flag ambiguity for human resolution.     |
| Cartographer  | site location (county, parcel)                       | proposed `PublicEvidence`    | near    | Writes only to public-evidence section. All entries carry source URL.  |
| Notary        | finalized `CaseInput`                                | `AuditEvent[]` for sealing   | later   | Deterministic. Output identical for identical input + policy version. |
| Forecaster    | `CaseInput` + (optional) `ScenarioOverride`          | `DerivedProof`               | done    | Pure function. No side effects. Already shipping in `forecast.ts`.    |
| Referee       | `RequestRecord` + `Role`                             | `ProjectedView`              | done    | Pure function over the policy table. Already shipping in `projection.ts`. |
| Explainer     | `ProjectedView` + `Role`                             | natural-language prose       | later   | Reads only the projection. Cannot see raw inputs by construction.     |
| Switchboard   | user intent                                          | which agent to call next     | stretch | Out of scope until other agents are stable.                           |

The Forecaster and Referee already exist as pure functions. The next
two to ship as Claude-API-backed agents (per `docs/plans/roadmap.md`)
are the Interviewer (highest UX wedge) and the Cartographer (highest
data-quality wedge).

---

## 5. Implementation: Claude Agent Skills

We build each named agent as a [Claude Agent Skill](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview).
This is a deliberate framework choice, not a bandwagon — Skills give
us four properties we need:

1. **Filesystem-based packaging**. A skill is a directory with `SKILL.md` + optional resources. We can ship it inside the local Tauri app, version it with the rest of the code, audit it like any other source file.
2. **Progressive disclosure**. Only metadata loads at startup; the skill body loads when triggered; bundled resources load on demand. Critical for a local app where context budget matters.
3. **Composability**. Multiple skills can be combined in a single workflow without bloating the system prompt.
4. **Trust-auditable**. Per Anthropic's guidance, "we strongly recommend using Skills only from trusted sources." For Grid Passport, every shipped skill is part of the open-source repo. Auditable by anyone, including a regulator who wants to verify nothing in the skill quietly bypasses the projection layer.

### 5a. Directory layout

Each agent ships as a Skill directory:

```
packages/agents/
├── interviewer/
│   ├── SKILL.md                           # frontmatter + workflow instructions
│   ├── REFERENCE.md                       # field schema, units, common mistakes
│   ├── examples/
│   │   ├── owl-compute-intake.md          # NL → CaseInput examples
│   │   ├── lantern-cloud-intake.md
│   │   └── kraken-train-intake.md
│   └── scripts/
│       └── validate_caseinput.ts          # type-check the agent's output
├── cartographer/
│   ├── SKILL.md
│   ├── SOURCES.md                         # endpoint registry: VA DEQ, FEMA, county GIS
│   └── scripts/
│       ├── fetch_deq_permits.ts
│       ├── fetch_fema_overlay.ts
│       └── fetch_county_zoning.ts
├── notary/
│   ├── SKILL.md
│   └── scripts/
│       └── seal_audit.ts
├── explainer/
│   ├── SKILL.md
│   ├── ROLE_VOICES.md                     # how to explain to applicant vs utility vs regulator
│   └── examples/
│       └── ...
└── README.md                              # which agents ship, when each loads
```

### 5b. SKILL.md frontmatter convention

Each `SKILL.md` follows the spec — name, description, then markdown
body:

```yaml
---
name: gridpassport-interviewer
description: Turns natural-language descriptions of an interconnection
  request into a structured Grid Passport CaseInput. Use when the user
  describes a load request in prose ("we want 180 MW in Prince William
  by late 2028"). Asks the user to fill ambiguous fields rather than
  inventing values. Output is a CaseInput object; the user reviews it
  field-by-field before commit.
---

# Interviewer

## Workflow

1. Parse the user's prose for: requested MW, target COD, applicant
   org, site (county + state), phases.
2. For each field that is missing or ambiguous, ask the user
   directly. Never invent a value.
3. Emit a proposed `CaseInput` with `status: "draft"`. Do not
   populate `privateProfile` from prose alone — those values must come
   from a structured prompt or a file.
4. Hand off the proposed `CaseInput` to the user for review.

## Domain knowledge

- Common Virginia counties for data centers: Loudoun, Prince William,
  Fauquier, Spotsylvania, Stafford. Default state to "VA" if county is
  one of these.
- Phase counts of 1–4 are typical; flag anything outside.
- See `REFERENCE.md` for the full field schema.

## Trust constraint

This skill writes only to `CaseInput` fields. It does not write to
`privateProfile.flexPercent` or any field requiring numerical
estimation from prose. Such fields require explicit user input or a
loaded file.
```

The trust constraint is part of the skill body — the model reads it
on every invocation. This is one of the calibration levers.

### 5c. Where the skills run

| Surface              | What runs there                                                                 | Network     |
| -------------------- | ------------------------------------------------------------------------------- | ----------- |
| Tauri local app      | All agents (Interviewer, Cartographer, Notary, Explainer)                        | Cartographer needs network for DEQ/FEMA/GIS; others local-only |
| Web demo (landing)   | Demo-mode versions of Interviewer + Explainer for stage interactions             | Anthropic API call only |
| Eval harness         | All agents, in test fixtures                                                    | Mocked      |
| FastAPI (later)      | Forecaster + Referee mirrors                                                    | None        |

Note that the Tauri app is the production surface; Claude Code is the
authoring surface; Claude.ai is not in the deployment path.

The decision on packaging route — skill via Claude API vs ship as a
Claude Code plugin — is in `docs/plans/roadmap.md` decision log.

---

## 6. The research connection

Ming Jin's research agenda is on **calibrating agent skills to align
with workflow, human preferences, and domain specifications**. Grid
Passport is a real testbed for that agenda.

Each of the three calibration dimensions has a concrete grounding in
this product:

### 6a. Workflow alignment

The Grid Passport disclosure workflow is fixed and small:

```
intake → evidence → seal → derive → project → explain → review → export
```

A well-calibrated agent respects this workflow:

- The Interviewer does not run the Forecaster.
- The Cartographer does not write to the audit chain.
- No agent jumps the export step.

We can mechanically test this. Given a corpus of NL intents, did each
agent stay inside its lane? An eval can score this — and that score is
a workflow-alignment metric for the underlying agent skill.

### 6b. Human-preference alignment

Each role has a different preference for how disclosure should feel:

- **Applicant** wants visibility into what is sealed and what is not. The Explainer should narrate "what stays, what releases, what the utility will see, and why."
- **Utility** wants confidence in firmness without competitive intelligence. The Explainer should narrate decisions in operational terms ("this customer will fit Q3 2028 if the BESS commitment holds").
- **Regulator** wants accountability. The Explainer should narrate the policy version, audit chain, and what was sealed by reason code.

A well-calibrated Explainer skill produces *different prose for the
same projection* depending on role, and the differences should match
a graded human-preference rubric. We can test this with role-specific
preference judgments.

### 6c. Domain-specification alignment

The Rego policy file is a literal specification. An agent that
respects it does not leak — and the privacy canary already detects
leaks. But there are deeper domain specs:

- VA DEQ tier-2 permit timelines (14–22 months; cited correctly when present in evidence notes).
- EPRI Flex MOSAIC's response classes (when MOSAIC v1 stabilizes, agents must use those classes correctly).
- Dominion's 4-stage queue gates (Interviewer should know what stage a typical applicant is at and ask the right questions for that stage).

Domain-spec drift is one of the most common failure modes for
LLM-backed agents. Skill calibration here means: does the agent stay
correct as the domain evolves? That is testable with versioned domain
fixtures.

### 6d. Why Skills, specifically, fit the research

The Skills framework is a particularly clean substrate for calibration
research because:

1. **The instructions are inspectable.** A SKILL.md file is a small markdown document. Calibration interventions look like edits to a known location, not opaque fine-tuning.
2. **Bundled resources are versionable.** When the domain spec changes (e.g., MOSAIC ladder publishes), updating the skill is a file edit, not a model retrain. We can publish skill versions and measure regression.
3. **Progressive disclosure means lighter context.** Calibration experiments are cheaper to run; you can iterate on a skill without paying token cost on every conversation.
4. **The same skill runs in multiple surfaces.** A calibration intervention validated in the eval harness can ship to the Tauri app and the web demo with no code change.

This is the research thesis Grid Passport tests: **agent skills,
defined as small filesystem artifacts with explicit workflow / human-
preference / domain-spec constraints, are easier to calibrate to a
real-world workflow than either prompt engineering or fine-tuning
because the calibration surface is local, inspectable, and
versionable.**

The deliverable from a research angle is not just "Grid Passport
ships." It is also: a corpus of skill-calibration interventions, an
eval harness that measures workflow / human-preference / domain-spec
alignment, and a published comparison against ad-hoc prompt-only
agents on the same task.

---

## 7. Eval framework — concrete pre-talk targets

Promoted from "forward look" to **the empirical results slide for the
job talk** (see `docs/story.md` §6). The eval harness is now a
near-term roadmap item with concrete N-targets, baselines, and a
student-handoff-friendly task breakdown. Tracked in
`docs/plans/roadmap.md`.

The talk needs a 4×3 score matrix (4 eval categories × 3 Skills) plus
a baseline delta. To get there, the eval surface looks like this:

### 7a. Eval categories with concrete targets

| Category                 | What it measures                                                                                  | Target N | Tool                  | Score type                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------- | -------- | --------------------- | ------------------------------------------------------------- |
| Role-leakage             | Does any Skill output place a private value where the policy forbids it?                          | 60       | extended privacy canary | Binary pass/fail per case; aggregate to leak rate (target: 0%) |
| Workflow alignment       | Does each Skill stay in its lane? Interviewer not writing privateProfile; Cartographer not writing audit; etc. | 20 per Skill | promptfoo scenarios   | Binary stays-in-lane per case; aggregate to alignment rate    |
| Human-preference alignment | Does the Explainer produce role-appropriate prose? Scored on a 1–5 Likert rubric per (case, role). | 20 cases × 3 roles | deepeval + LLM judge + spot-check by 2 humans | Mean Likert + inter-judge agreement       |
| Domain-spec compliance   | Does the Cartographer cite correct DEQ tier classifications, FEMA flood zones, EPRI MOSAIC classes? | 20       | versioned domain fixtures | % correct citations; flag stale facts when spec bumps          |

Total bench: 60 cases for role-leakage and Cartographer domain-spec; 20
per-Skill for workflow alignment; 60 (20×3) for human-preference. About
160 evaluations on the eval grid.

### 7b. Baseline comparison

The talk's headline claim — "Skill-as-substrate beats prompt-only" —
requires a baseline. For each of the three near-term Skills
(Interviewer, Cartographer, Explainer):

- **Skill version**: ships with `SKILL.md` + bundled `REFERENCE.md` + scripts + examples.
- **Prompt-only baseline**: same model, same task, single system prompt that flattens the SKILL.md content into one block; no progressive disclosure, no scripts, no bundled references.

Run both versions on the same 160-case grid. Report deltas per category.

The hypothesis: Skill version scores measurably higher on workflow
alignment and domain-spec compliance, comparable on human-preference
alignment, and identical on role-leakage (both must be 0%).

### 7c. Student-handoff task breakdown

The eval harness is the highest-leverage student-handoff item. It
parallelizes well; each piece is small. Suggested allocation:

**Owner A — eval scaffolding (week 1)**
- Wire promptfoo + deepeval into `apps/web/scripts/eval/`.
- Add `pnpm eval:agents` script. Output: per-Skill JSON results + a markdown summary.
- Skeleton the four-category structure.

**Owner B — Interviewer skill + workflow-alignment cases (week 1–2)**
- Build `packages/agents/interviewer/SKILL.md` per the spec in §5.
- Author 20 NL→CaseInput pairs (use the three case studies as anchors; add 17 more).
- Author the prompt-only baseline.
- Run, gather scores.

**Owner C — Cartographer skill + domain-spec cases (week 2)**
- Build `packages/agents/cartographer/SKILL.md`.
- Author 20 site-location → expected-evidence pairs covering VA DEQ tiers, FEMA flood zones, county zoning.
- Run, gather scores.

**Owner A or B — Explainer skill + human-preference cases (week 2–3)**
- Build `packages/agents/explainer/SKILL.md` with `ROLE_VOICES.md`.
- Author 20 ProjectedView × 3 role rubric pairs.
- Score with LLM-judge prompts; spot-check 20% by hand.

**Owner A — analysis + writeup (week 3)**
- Aggregate scores into the 4×3 matrix.
- Plot the Skill-vs-prompt-only delta.
- Hand to Ming for the talk slide.

Total elapsed: 3 weeks with 2–3 owners working in parallel. Single
blocker: the LLM-judge rubric authoring needs Ming's review before
running at scale (it determines what "good" means). A starter draft
lives at `docs/plans/eval-rubric.md` (2026-04-18) with three open
questions at the bottom for Ming to resolve.

### 7d. What we don't have to evaluate to pass the talk

Useful to be explicit:

- **Counterfactual responsiveness** — already covered by the privacy canary's with-override scan.
- **Forecaster correctness** — out of scope; deterministic linear formula for now. Probabilistic forecaster is a multi-week post-talk item.
- **Switchboard orchestration** — not shipping for the talk; not an eval target.
- **End-to-end performance / latency** — measure if asked, not load-bearing for the methodology claim.

Each of these is in `docs/plans/roadmap.md` backlog.

---

## 8. Honest limits

For the demo and the early product, what we are *not* claiming about
the agent layer:

- **Skills do not yet exist as files.** The agent design is documented here; the SKILL.md files ship in roadmap items #5–6. Until then, the harness's `.claude/agents/*.md` files are subagent definitions for development workflows, not the production agents.
- **Cartographer's data sources are partial.** Real integration with VA DEQ + FEMA + county GIS requires endpoint research; first version may be limited to a subset.
- **Explainer is not in the first cut.** It's near-term but not in the current sprint. Until then, projections speak for themselves.
- **Switchboard is not coming soon.** Per the harness rule (no autonomous swarms), Switchboard would have to demonstrate clear value over the workflow-driven default before it ships. Not a current priority.
- **The research deliverable is forward-looking.** Grid Passport's value to the research agenda is that it provides a real workflow with real domain specs and real (if simulated) human preferences. The empirical comparisons are work to be done, not work that has been done.

These are tracked in `docs/plans/roadmap.md`; updates here when an
item lands.

---

## 9. Why this matters beyond Grid Passport

If skill-calibration-on-real-workflows turns out to be a meaningfully
better calibration regime than prompt-only agents, the implications
extend past confidential disclosure for grid interconnection:

- Any multi-stakeholder workflow with privacy constraints (healthcare data sharing, M&A diligence, securities filings) has the same shape: a small workflow, conflicting human preferences, and a domain spec that evolves quarterly.
- The Skills substrate gives those domains a calibration surface that does not require model retraining.
- The trust principles in §2 (no autonomous release, no policy bypass, structured handoffs) generalize.

Grid Passport is the wedge. The research is the durable asset.
