# Grid Passport — The Story

> The narrative used both for Ming Jin's job talk and for the public website's `/about` page. One source, two renderings.

This is *prose*. It is not a slide deck. The talk renders sections 1–9
as 12–14 slides; the website renders them as a long-scroll page with
the demo embedded at section 5. The team ships them from the same
content so they cannot drift.

If the eval harness lands and produces numbers, the empirical
results section (§6) becomes the load-bearing slide. Until then, §6
is a placeholder; **the talk should not happen with §6 empty**.

---

## 1. The hook

Open with the role toggle. Live, not a screenshot.

A real interconnection request from a hyperscaler — 180 MW in Prince William County, Virginia, target commercial operation 2028. The applicant's view shows everything: 22% deferrable workload, 0.68 internal schedule confidence, 11 MW of BESS, 140 MW of backup generation, the training/inference mix. Click the toggle to *utility*: those eight fields become *sealed*. Same case. Same data. The utility is making a real decision — Q3 2028 energization band, firmness score 59, flexibility passport 32–44 MW class B — but they never see the raw numbers. Click again to *regulator*: same projection plus the audit trail and the policy file with its sha-256.

> "Same case. Same applicant. Three projections. Watch what each role sees. The policy is the contract; the projection is the enforcement; the audit chain is the proof."

This is *not* a vibes demo. The build fails if a private value reaches a non-applicant projection. We have a mechanical canary that proved its value by catching a real leak the morning we wrote it. Six findings on the first run. All real. All fixed in commit `38e0be6`.

---

## 2. The problem

There are two clocks ticking at incompatible rates.

AI compute demand is doubling fast. Dominion Energy alone has [70 gigawatts of new demand](https://www.datacenterdynamics.com/en/news/dominion-files-large-load-connection-queue-plan-with-state-regulators/) sitting in its interconnection queue. Virginia's Joint Legislative Audit and Review Commission [projects the state's electricity demand will double within ten years](https://jlarc.virginia.gov/landing-2024-data-centers-in-virginia.asp), with data centers as the dominant driver.

Power infrastructure scales slowly. New transmission takes seven to fifteen years. New generation, four to ten. Permitting overlays — Virginia DEQ Tier-2 air-permit reviews, Loudoun County special-exception hearings — add quarters per gate.

The mismatch creates an urgent need for coordination across three stakeholders whose interests are real, legitimate, and partially in tension. A hyperscaler wants a fast interconnection slot and is willing to commit to demand response; they will not share their workload mix or their schedule confidence. A utility needs to plan generation and triage queues; they cannot take legal custody of competitive data they do not need to make the decision. A regulator needs accountability; they want to verify the *workflow* without taking custody of the inputs.

The bottleneck is not compute. It is not generation. It is **information flow under privacy and competitive constraints**. Today this flow is patched together with NDAs in [25 of 31 Virginia localities](https://www.nbcnews.com/tech/tech-news/data-center-ai-google-amazon-nda-non-disclosure-agreement-colossus-rcna236423), redacted PDFs that leak via Acrobat revision history, and verbal updates that leave no audit trail. Microsoft has [publicly committed to step away from NDA-only practice](https://www.datacenterdynamics.com/en/news/microsoft-swears-off-ndas-for-data-center-projects/). The status quo is unraveling. There is room — and demand — for a workflow primitive.

---

## 3. Why this is hard for AI agents specifically

The natural way to make multi-stakeholder disclosure tractable is to put an AI agent in the loop — fill out forms via natural language, fetch public evidence automatically, narrate projections in role-appropriate prose. Every team that has tried building one of these has hit the same wall: **who do you trust to run the LLM call on the raw competitive data?**

The cryptographic answers are real but partial. Zero-knowledge proofs work for narrow predicates and require pre-fixed circuits; multi-party computation needs multiple input parties; homomorphic encryption is too slow for messy structured inputs; trusted execution environments answer "the cloud admin can't read enclave memory" but not "the startup operating the service won't change its terms in five years." Differential privacy is the wrong dimension entirely — calibrated noise is for population statistics, not for a single billion-dollar interconnection request.

Each of these is a tool. None is a workflow primitive. And once you put an LLM in the loop, "trust" becomes a question about model behavior — hallucination, prompt injection, capability drift — that the cryptographic substrates do not address.

The reliability problem for AI agents in high-stakes workflows is not "make the model better." It is "make the system *structurally incapable* of the failure modes that matter, regardless of how the model behaves on a given turn."

---

## 4. The insight — three structural properties + one human

Grid Passport's reliability claim rests on three structural properties, each of which is testable independently of model behavior.

### 4a. Auditable

Every action in the system is content-addressed. The request bytes hash to a fingerprint; the public evidence bundle hashes to another; the derived proof to a third. Every projection is tagged with a policy version. Every audit event records the actor (named: interviewer, cartographer, notary, forecaster, referee), the reason code (`policy_evaluated`, `sealed_raw_input`), and a deterministic timestamp anchor. A regulator presented with a signed disclosure bundle and the open-source policy file can verify, without any third-party service, that the projection released matches what the policy mandates.

Auditability is not a logging strategy. It is a *property of the wire format*. The bundle either verifies or it does not.

### 4b. Constrained

The projection layer is a pure function from `(policy, request, role)` to `ProjectedView`. It is implemented in `packages/core/src/projection.ts`, mirrored canonically in Rego at `packages/policy/grid-passport.rego`, and verified for drift on every commit by `pnpm privacy:canary`. There is no path through the system where a private field reaches a non-applicant projection — this is enforced structurally, not by code review or prompting discipline.

Agents that produce outputs (Interviewer, Cartographer, Forecaster, Explainer) feed *into* this layer. They cannot bypass it. They cannot release a value the policy classifies as private. The Interviewer Skill's body contains an explicit constraint that says "do not write to `privateProfile` from natural-language prose"; the canary catches it if it ever does. The Explainer Skill consumes only `ProjectedView`, which by construction does not contain raw private inputs.

The constraint is not "we hope the model behaves." It is "the architecture makes the failure mode unrepresentable."

### 4c. Calibratable

Each AI agent in the system ships as a [Claude Agent Skill](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) — a filesystem directory with a `SKILL.md` file declaring its name, description, workflow, and explicit constraints. Skills are *inspectable* (a markdown file, not opaque weights), *versionable* (you compare two skill versions on the same eval), and *progressively-disclosed* (only metadata loads at startup; instructions load when triggered; resources load on demand).

This makes agent calibration empirically tractable along three named dimensions: **workflow alignment** (does the agent stay in its lane?), **human-preference alignment** (does the Explainer produce role-appropriate prose?), **domain-specification compliance** (does the Cartographer cite the correct DEQ tier classification?). Each has a concrete eval; each emits a numeric score per skill version.

This is the research substrate. The thesis: **agent skills, defined as small filesystem artifacts with explicit workflow / human-preference / domain-spec constraints, are easier to calibrate to a real-world workflow than either prompt engineering or fine-tuning, because the calibration surface is local, inspectable, and versionable.**

### 4d. The fourth property: agents propose, humans dispose

The three structural properties answer the model-reliability question. They do not answer the *workflow* question of who decides. The fourth principle does:

**No agent in Grid Passport autonomously releases data.** Every agent action — Interviewer parsing prose into `CaseInput`, Cartographer fetching public evidence, Notary computing audit anchors, Explainer narrating projections — surfaces a *proposal* to the applicant. The applicant reviews, accepts, edits, or rejects. The export step is always a human-confirmed click; no agent presses it.

This is the operational form of the human-AI collaboration model. Agents are not given authority. They are given a job — propose well-formed structured outputs that the human can accept quickly when they are right and reject cheaply when they are wrong. The reliability of the agent layer is then judged on how well it accelerates the human's confirmation, not on whether it can take actions independently.

The closest analog from a different domain: tax-preparation software. The IRS-approved local app fills out your return; you review every line; you press the file button. The software is reliable because it is auditable, constrained, and (informally) calibrated by years of user feedback. Grid Passport applies the same shape to a higher-stakes multi-stakeholder workflow.

---

## 5. The system

The mechanism is in the codebase today. The product is mid-build. The architecture is two surfaces with one mechanism.

The **mechanism**: a policy-governed projection function (~150 lines of TypeScript) backed by a canonical Rego file (~100 lines). Every field in the request is classified once: `public`, `private`, or `derived`. The projection respects the classification by construction. A privacy canary (~280 lines, single TypeScript script) verifies on every commit that no private value reaches a non-applicant projection, that the TS runtime mirror matches the Rego canon, and that the audit-action strings do not embed sealed inputs.

The **public surface**: a web demo at `grid-passport.vercel.app`. Three case studies based on real Virginia data center scenarios. The role toggle. The counterfactual slider for applicants. The audit trail and policy panel for regulators. This is the public-facing landing page; it funnels visitors who want to use the tool with their own data to the desktop app download.

The **production surface**: a Tauri desktop application (Rust core + the same Next.js UI). The applicant installs it; raw inputs live on their machine; the projection runs in-process; nothing leaves the laptop until the applicant explicitly exports a signed disclosure bundle. The bundle contains the projection, the audit chain, and the policy hash — never the raw inputs. The utility receives the bundle through their existing intake; they verify the signature and ingest the projection.

The **agent layer**: Six named Claude Agent Skills. Interviewer turns prose into structured input. Cartographer fetches public evidence (DEQ permits, FEMA flood overlays, county zoning). Notary seals and computes audit anchors. Forecaster runs the derivation. Referee applies the policy. Explainer narrates projections in role-appropriate prose. Every agent action is shown to the applicant as a diff before commit; agents never bypass the projection layer; every Skill file is open-source and auditable.

The **trust pivot**: by moving the projection to the applicant's machine, the entire "trust the third-party platform" question dissolves. We do not have the applicant's data. We cannot leak it. We cannot be subpoenaed for it. We cannot change our terms about it. NDAs sit on top of this as the residual liability backstop; the tool reduces the surface where disclosure can fail, NDAs cover what happens if it does anyway. They compose; they are not in conflict.

---

## 6. Empirical results — *placeholder until eval harness ships*

> When the eval harness lands (target: 2-3 weeks pre-talk per `docs/plans/roadmap.md`), this section becomes a load-bearing slide showing concrete numbers.

The plan: evaluate three Skills (Interviewer, Cartographer, Explainer) on N=20 cases each across four dimensions (workflow alignment, human-preference alignment, domain-spec compliance, role-leakage). Compare against a baseline of the same agents implemented as ad-hoc prompts without the Skill scaffolding. Report a 4×3 score matrix plus the baseline delta.

The hypothesis to test: *the Skill packaging (explicit `SKILL.md` constraints + bundled domain references + scripted validators) produces measurably higher workflow / preference / spec alignment than prompt-only baselines, with the gap widening as the domain spec evolves.*

The forward result, if the hypothesis lands: skill-as-substrate is a generalizable methodology for agent reliability in workflows where the policy is real, the stakes are high, and the spec changes faster than model retraining cycles can keep up.

---

## 7. Generalization

The framework is not specific to grid interconnection. It is the shape of a class of problems:

A *multi-stakeholder workflow* with *privacy and competitive constraints*, an *evolving domain specification*, and a *human gatekeeper* who must approve disclosure decisions on per-case basis. Examples in adjacent domains:

- **Healthcare data sharing** between providers, payers, and researchers. The policy layer is HIPAA-derived; the derivation layer is risk scoring or treatment recommendations; the human gatekeeper is the patient or their care team.
- **M&A diligence** between acquirer and target. The policy layer is the deal NDA; the derivation layer is financial summaries and diligence findings; the human gatekeeper is the seller's counsel.
- **Securities filings** between issuer, underwriter, and regulator. The policy layer is SEC disclosure rules; the derivation layer is risk factors and pro-forma statements; the human gatekeeper is the issuer.

Each of these domains has the same shape. Each is a candidate for the next testbed in the research program. The methodology — projection layer + Skills with explicit constraints + mechanical evals + human-confirmed handoffs — is the durable contribution. Grid Passport is the first instance.

---

## 8. Future work

In rough sequence after Grid Passport's first product launch:

1. **Eval harness** running over the three shipped Skills, with N=20 per category. Baseline comparison against prompt-only agents. Public dataset and rubric so other groups can replicate.
2. **Skill calibration interventions** — published comparisons of Skill versions on the same eval, demonstrating the inspectable / versionable / cheap-to-iterate property.
3. **Cross-domain replication** in healthcare data sharing or M&A diligence. Tests whether the framework generalizes beyond the original case.
4. **Real utility partnership.** Bhawuk Luthra's Dominion Energy connection is the natural starting point. Co-designed signed-bundle protocol with a real intake team.
5. **Reliability evaluation under adversarial pressure.** Does the system hold when the agent receives prompt-injection bait in fetched public evidence? Does the canary catch a malicious skill update? These are testable propositions, not promises.

---

## 9. Team

**Ming Jin** — faculty mentor and project lead. Built the foundation, the design principles, and the vision. Research agenda focuses on calibrating agent skills for alignment with workflow, human preferences, and domain specifications.

**Bhawuk Luthra** — student and Dominion Energy employee. Proposed and co-conceptualized the problem and the solution shape. Brings the utility-side perspective that grounds the case studies in real interconnection workflow. Co-developing the platform.

**Vikrant Bhati** — co-developer and hackathon participant.

The combination matters: an academic foundation, an industry context that is not borrowed but native, and a team small enough to ship.

---

## 10. Closing

> *Agent reliability isn't a vibes check or a bigger model. It's a workflow with a typed contract, a mechanical canary, and a human at the export button.*

That is the case Grid Passport makes. The mechanism is shipped. The product is mid-build. The research program runs through it.
