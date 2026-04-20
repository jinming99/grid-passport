# Grid Passport — Research Thesis

> A living document. The thesis will sharpen as #7 (Interviewer), #8 (Cartographer), #13 (Explainer), and #14 (eval harness) land. Revisit quarterly; update when the empirical picture changes. This is the doc that makes Grid Passport legible as a *research program*, not a hackathon app.

Companion docs:
- `docs/vision.md` — why this product, trust pivot, schema 5-test filter (§4b)
- `docs/agents.md` — agent architecture + calibration axes + eval framework
- `docs/design/signed-bundle.md` / `-spec.md` — disclosure protocol
- `docs/design/research-roadmap.md` — **which claims to prioritize, in what order, with competitive-positioning snapshot.** Read after this doc.
- `docs/plans/roadmap.md` — what's shipping next (build queue; this doc feeds priorities in)

---

## 1. Thesis

> **The schema is the safety case.**
>
> In regulated disclosure workflows where one party has private information and strategic incentives to misreport, the safety of an LLM-agent pipeline is determined by the discipline of the schema it writes into — not by the prompts, the weights, or the runtime sandbox. Schema discipline is a typed, write-scoped contract between agent, applicant, and downstream verifier, with **asymmetric verifiability** between field classes: publicly-verifiable fields admit cross-check against canonical sources; non-publicly-verifiable fields admit distribution-elicitation under proper scoring rules; the substrate prevents the agent from amplifying strategic misreport in either regime.

One-liner for a slide: *Agents are safe when the schema they can write into is safe. Everything else is downstream.*

**Scoping note (2026-04-20).** An earlier draft of this thesis invoked Myerson's revelation principle as the formal core of the claim. Under scrutiny that framing was an overreach: Grid Passport does not implement truth-telling as a dominant strategy across the full `CaseInput` schema, because much of `CaseInput` consists of fields the applicant is genuinely uncertain about (`workloadMix`, `internalScheduleConfidence`, `flexPercent`). The honest framing recognizes three distinct mechanisms composed in the substrate: (a) non-amplification of strategic misreport by the agent itself (§3.2), (b) cross-check against public evidence for verifiable fields (§3.2-verifiable subset), and (c) proper-scoring-rule distribution-elicitation for unverifiable fields under type uncertainty (§3.2-unverifiable subset). Revelation-principle applies rigorously to (b) only; (c) is grounded instead in Winkler (1969) / Gneiting-Raftery (2007) proper scoring rules. See `docs/design/research-roadmap.md` §1 for the sharper claim decomposition.

## 2. Why this thesis (and not the industry framing)

The industry framing of "AI agents for enterprise workflows" advocates for Skills, policy layers, and audit tooling — all true, all table stakes. None of it is a research contribution. The three most-credited adjacent positions and why each is insufficient on its own:

| Position | What it owns | Why it's not enough for Grid Passport's claim |
|---|---|---|
| **Agents as contracts** (Agent Contracts arXiv:2601.08815, VeriGuard, ECM Contracts arXiv:2604.13097, DSPy, LMQL) | Runtime-enforced resource/permission boundaries on agent execution | Treats the contract as a sandbox around *code execution*; Grid Passport's contract is a *static write-scope* on a typed schema. Different object, different verification surface. |
| **Peer-prediction / incentive-robust LLMs** (Market Making arXiv:2511.17621, Peer Elicitation Games, Game Theory Meets LLMs arXiv:2502.09053) | Truthfulness as a training-time or population-level reward-design problem | Assumes many reporters or a population prior. Grid Passport has one applicant per disclosure, no peers, no prior. Need a different mechanism. |
| **Sycophancy / anti-helpfulness** (Anthropic 2023, npj Digital Medicine 2025) | Sycophancy as a model bug | Frames the problem as user-safety, not as *mechanism design in a principal-agent disclosure pipeline*. The agent's incentive to over-help isn't the failure mode; the *applicant's* incentive to misreport and the *agent's* vulnerability to becoming an accidental coach is. |

The gap we actually occupy: **schema design for LLM-mediated disclosure under asymmetric verifiability in regulated workflows**. I could not find a paper that composes Howard's value-of-information (1966), Myerson's revelation principle (1979, for the verifiable-field subset), Winkler's proper scoring rules (1969, for the unverifiable-field subset), and askability (survey methodology / HCI form design) as a single schema-design discipline for LLM-mediated elicitation. The 5-test filter in `docs/vision.md §4b` is the artifact that fills this gap — currently under-sold as UX hygiene.

## 3. Four claims, each tied to a literature gap

### 3.1. Schema-as-safety-case

**Claim.** A typed schema with a field-admission filter (the 5-test filter) is the write-scope contract for the agent. The contract is *static* (bound to the schema at authoring time), not runtime-enforced. Safety is a property of the schema × validator pair, not of the agent's execution trace. The substrate bounds what writes are reachable; the deterministic projection layer ensures what stakeholders see is a function of what was written, not of what the model decided.

**Gap.** Agent Contracts, VeriGuard, ECM Contracts treat contracts as runtime resource/permission boundaries enforced during agent execution. None treats a typed schema as the contract itself.

**Scope note.** "Safety case" here means the testable property: the set of possible writes is statically bounded. We do NOT claim the schema guarantees truthful disclosure — that requires additional mechanisms covered in §3.2.

**Venue fit.** FAccT, AIES, NeurIPS AI-for-Mechanism-Design workshop.

### 3.2. Agent as non-amplification intermediary under asymmetric verifiability

**Claim.** An LLM workflow agent operating inside a strategic-reporting pipeline is best designed as a **non-amplification device** — the agent's write-scope prevents it from amplifying the applicant's strategic shading beyond what the applicant explicitly confirmed. This composes with two orthogonal mechanisms to produce the full disclosure behavior:

- **(a) Verifiable-field subset — cross-check.** For fields with public-record counterparts (flood zone, permit status, zoning, parcel, financing-of-record), Cartographer fetches the canonical record and a downstream Referee Skill (planned; not yet shipped) flags inconsistencies between `privateProfile` claims and `publicEvidence`. This is the revelation-principle-aligned half: the detection surface makes misreport costly.

- **(b) Unverifiable-field subset — proper-scoring-rule elicitation.** For fields the applicant themselves is uncertain about (`workloadMix`, `internalScheduleConfidence`, `flexPercent`, `redundancyShiftPercent`), the substrate elicits a distribution (P10/P50/P90 or equivalent band) and scores reported ranges against realized outcomes using a proper scoring rule (Brier, log-score, CRPS). Honest calibration is the dominant strategy under a proper scoring rule (Winkler 1969, Good 1952, Gneiting-Raftery 2007) — no point estimate needed, so no forced false precision.

This composition is distinct from sycophancy-reduction (training-time reward design), peer-prediction (requires multiple reporters), and runtime-enforcement (VeriGuard et al.). The existing Interviewer Skill is the partial evidence for non-amplification; the Referee Skill and proper-scoring-rule calibration are planned (P1, P2 in `research-roadmap.md`).

**Gap.** Sycophancy work treats the symptom as a model-training problem. Peer-prediction requires multiple reporters. Runtime-enforcement monitors per-action but doesn't address elicitation. Nobody has composed non-amplification + cross-check (verifiable) + proper-scoring-rule-elicitation (unverifiable) as a single substrate for single-applicant workflow disclosure.

**Scope note.** Earlier drafts framed this as "revelation-principle as architecture" and claimed truth-telling is the dominant strategy in Grid Passport. That was an overreach: classical revelation-principle requires detection-and-punishment of lies, which our mechanism provides only for the verifiable subset. The honest claim is the three-mechanism composition above.

**Venue fit.** NeurIPS AI-for-Mechanism-Design workshop, FAccT, AIES.

### 3.3. Projection-as-purity

**Claim.** The stochastic layer (what agents write) should be cleanly separated from the deterministic layer (what the regulator sees). Agents produce a typed record; a pure, policy-bound projection function produces the role-specific view. The projection has no LLM in it. This is the architectural move that makes "what the model decides" irrelevant to "what the regulator sees."

**Gap.** Most LLM-in-regulated-industries work (John Snow Labs, BluePrism, RAG-for-compliance) layers RBAC + audit + retrieval around an LLM that still writes decisions. The stochastic and deterministic layers are fused. Grid Passport separates them.

**Relationship to §3.4.** Projection-as-purity is the architectural complement of capability-based write-scope: stochastic writes are bounded by the Skill's capability; deterministic projection is bounded by pure-function semantics. Together they give the architectural invariant.

**Venue fit.** HotOS (as supporting mechanism inside §3.4), OSDI, ACM FAccT.

### 3.4. Object-capability patterns for LLM Skills

**Claim.** The right mental model for LLM-agent write-scope enforcement is the **object-capability pattern** (Dennis-Van Horn 1966, KeyKOS 1985, Miller 2006 *Robust Composition*, seL4 2009), applied at a softer enforcement layer than kernel-mediated runtime. Each Skill has a declared write-scope (the capability); the paired CI validator (`pnpm agents:validate`) refuses writes outside scope (the fail-closed enforcement); the set of reachable writes is a static property of the Skill × schema pair (the no-amplification invariant).

**Where the pattern is enforced.** Not in a kernel, not at runtime. The enforcement layer is the authoring-time Skill contract + post-hoc CI-validator refusal. The shipped Skills replicate the object-capability invariants — static write-scope, fail-closed denial, no amplification — at this softer layer.

**Where the pattern is NOT fully seL4.** We do not have unforgeable runtime capability tokens, nor formal verification down to the bit. The write-scope is declared in `SKILL.md` prose + enforced by a TypeScript validator; a Skill that violated its declared scope would be caught by the validator, not prevented from attempting the write. This is genuinely softer than KeyKOS / seL4 / E-language enforcement. Closing the gap (typed capability tokens; runtime-mediated enforcement) is future work.

**Gap.** The object-capability pattern has not been applied to LLM-agent design. Surveys (ACM CSUR 2025 *Emerged Security and Privacy of LLM Agents*) explicitly flag this as an emerging area; existing LLM-agent-security work uses ACL-style runtime monitors (VeriGuard, AgentSpec, Pro2Guard). Our contribution is the translation: Miller's architectural invariants applied at the validator layer, as an alternative to the monitor-at-runtime approach.

**Scope note.** Earlier drafts framed this as "capability-based security for LLMs" and used language that suggested KeyKOS-grade formal guarantees. The honest framing is *the architectural pattern, not the full system* — the invariants are replicated; the enforcement mechanism is softer than kernel-mediated.

**Venue fit.** HotOS (position paper; translation from OS-security lineage), USENIX Security (short paper), ACM FAccT.

## 4. How each agent in the roster illustrates the thesis

Every named agent is a *different* write-scope contract. The system is the research claim; the agents are evidence.

| Agent | Write scope | Research property it demonstrates |
|---|---|---|
| **Interviewer** (#7) | Writes only to `CaseInput` fields the applicant explicitly confirms; cannot write squishy fields (`internalScheduleConfidence`, `workloadMix`) without explicit elicitation | *Non-amplification intermediary* — the write-scope contract prevents the agent from amplifying strategic shading beyond the applicant's explicit confirmation. The agent doesn't extract truth; it refuses to manufacture confidence on behalf of the applicant. |
| **Cartographer** (#8) | Writes only to `publicEvidence`; every entry carries `sourceRefs[]`; cannot touch `privateProfile` | *Provenance-bound retrieval* — cherry-picking is detectable because the write-scope is append-only and source-addressed. RAG becomes auditable by construction. |
| **Notary** (later) | Computes hashes; emits `AuditEvent[]`; deterministic; cannot mutate upstream records | *Agent-as-ceremony* — the agent's role is reduced to cryptographic bookkeeping; non-determinism is moved outside the trust-critical path. |
| **Forecaster** / **Referee** (done, pure functions) | No LLM; pure functions over typed inputs | *Projection-as-purity* — the deterministic layer is deliberately not an LLM. This is the architectural split that makes stochastic-layer failures bounded. |
| **Explainer** (#13) | Reads only `ProjectedView`, never raw inputs; writes natural-language prose conditioned on role | *By-construction leak-proofness* — the write-scope contract has a dual read-scope contract. Cannot leak what it cannot see. |
| **Switchboard** (stretch) | Not shipping unless it can demonstrate value over workflow-driven default | *Architectural restraint* — absence of an agent is itself a safety property. |

Pattern: **every agent has a specific strategic-integrity property, and the substrate enforces it structurally — not through prompting.** This is the research-grade generalization of "agents propose, humans dispose" from `docs/vision.md §5c`.

## 5. Three research questions that spin out into papers

Each could be a standalone paper or grant proposal. Each has a clear methodology and testable claim.

### 5.1. Schema incentive audits

Given a disclosure schema, can we automatically generate adversarial-misreport test cases (red-teaming for strategic vulnerability) that measure which fields leak equilibria and which are robust? This is the natural extension of #14's eval harness. **Output:** a tool that takes a typed schema + a policy and produces a per-field strategic-vulnerability score. **Venue:** FAccT, AIES.

### 5.2. Falsification hooks for self-reported squishy fields

`internalScheduleConfidence` is unverifiable by construction. But pairing it with a *counterfactual disclosure requirement* — "if this number were 0.3 lower, what else changes in your story?" — makes it partially falsifiable. **Output:** a design pattern for pairing unverifiable self-reports with falsifiable counterfactuals, evaluated on the Interviewer. **Venue:** NeurIPS AI-for-Mechanism-Design workshop, AAAI.

### 5.3. Versioned disclosure policies and backward-compatible audit

When the Rego policy changes (quarterly, per regulator), past signed disclosures become hash-stable but policy-stale. What consistency guarantees does a downstream verifier need? How do you audit a disclosure that was correct under policy v0.3 but would be incorrect under v0.4? **Output:** a versioning calculus for policy-bound disclosures. **Venue:** HotOS, OSDI, EuroSys, ACM CCS.

## 6a. Substrate metrics — concrete numbers to put on the slide

The substrate-property evidence is shippable before the behavioral evaluation runs, and it replicates across three Skills in two domains. Full report at `packages/agents/metrics.md` (auto-generated; drift-gated). Headline deltas (Skill substrate vs mechanically-derived prompt-only baseline, token counts at ~chars/4 heuristic):

| Skill (domain) | Upfront context saving | Triggered context saving | "never" clauses | "halt" clauses | "refuse" clauses | Validator-refused contract violations |
|---|---:|---:|---:|---:|---:|---:|
| `interviewer` (grid) | **−95.8%** | −66.9% | 6 | 6 | 7 | 3 |
| `cartographer` (grid) | **−96.4%** | −65.6% | 6 | 9 | 2 | 4 |
| `priorauth-interviewer` (healthcare) | **−93.8%** | — | 5 | 5 | 12 | n/a (scaffold only) |

What these numbers directly support:

- **§3.1 schema-as-safety-case** — the per-Skill write-scope enforcement cloud ("never" + "halt" + "refuse" columns) is a countable surface of structural refusals. Cartographer additionally enforces an **11-URL source whitelist** at the CI-validator boundary (every `sourceRefs[].url` must match SOURCES.md or be an applicant upload).
- **§3.2 agent as non-amplification intermediary** — Interviewer's 6×never + 6×halt + 7×refuse clauses implement the non-coaching rule at the authoring layer, enforced by the paired CI validator. `priorauth-interviewer`'s equivalent rule replicates it in the healthcare domain. This is the non-amplification axis; the cross-check axis (verifiable fields via Cartographer + Referee) and proper-scoring-rule axis (unverifiable fields) are separate mechanisms discussed in §3.2 above.
- **§3.3 projection-as-purity** — the deterministic layer (Forecaster + Referee) is absent from this table by construction. Zero stochastic surface; every LLM write is write-scope-bounded.
- **§3.4 object-capability pattern at the validator layer** — the validator-refused-violations column is the set of writes the contract rules out, replicating the object-capability architectural invariants (static write-scope, fail-closed denial, no amplification) at the authoring + validator layer rather than at a runtime kernel. Cartographer's 4 enforced violations (privateProfile leak, derivedProof bleed, empty sourceRefs, unknown source URL) is the sharpest instance we ship today. Not seL4-grade formal verification; the pattern, applied at a softer enforcement layer.
- **Generalization (§6 below)** — three Skills, two domains, same substrate shape, same magnitude of substrate advantage. The pattern replicating across domains is what lets this be a substrate claim rather than a single-Skill finding.

These are **leading indicators** for the behavioral deltas #14 will measure. If the behavioral deltas land in the direction the substrate metrics predict, that is an unusually clean substrate-vs-behavior alignment — evidence that the measured properties explain the measured outcomes.

## 6. Generalization — where this travels

The unifying structural claim: **wherever the tax-prep trust model is right, the Grid Passport substrate (local agent + schema-bound write-scope + policy-bound projection + signed bundle) is the natural generalization.** Concrete domains:

- **Healthcare:** HIPAA prior-authorization (provider → payer → regulator)
- **Financial rails:** KYC/AML (fintech → correspondent bank → FinCEN)
- **ESG / climate:** Scope-3 emissions (supplier → brand → SEC)
- **Clinical trials:** protocol pre-registration (sponsor → IRB → FDA)
- **Export control:** end-use disclosures (exporter → BIS)

**First cross-domain replication shipped (2026-04-18).** `priorauth-interviewer` — HIPAA prior-authorization intake Skill — lives at `.claude/skills/priorauth-interviewer/` with the same recipe as `gridpassport-interviewer` (write-scope contract, non-coaching rule, sibling-agent refusals, trust-constraint checklist, worked example). The substrate metrics panel (§6a above) now spans two domains; three independent Skills all show the same context-cost delta (−93.8% to −96.4% upfront), discovery-signal density, and refusal-clause density. The recipe is methodological, not grid-specific.

Scope of this first replication is deliberately small (no paired CI validator, no PHI-authorized surface). The point is substrate-transfer evidence, not a working HIPAA product. The progression is: *three Skills in two domains today → 4–5 Skills in 3 domains by the #14 harness run → full eval-grid comparison across domains in the talk's follow-up paper.*

## 6b. The Skill-vs-prompt baseline — case study for §3.1

The load-bearing empirical argument for §3.1 (*schema-as-safety-case*) requires a controlled comparison: same content, different packaging. We solve this with a **mechanically-derived prompt-only baseline** that lives at `packages/agents/interviewer/baselines/prompt-only.md`, regenerated from `.claude/skills/interviewer/{SKILL.md, REFERENCE.md, examples/*.md}` via `pnpm agents:baseline`. A CI gate (`pnpm agents:baseline:check`, wired into the 12-gate sweep) fails if the committed baseline drifts from the Skill source. No hand-tuning advantage accrues to either side.

The hypotheses this baseline lets #14 test empirically:

- **H-workflow.** Skill version stays in its write-scope more reliably. *Why:* file boundaries reinforce the contract; progressive disclosure means the `examples/` relevant to this turn is the one the model re-reads.
- **H-spec.** Skill version cites `FieldPath` buckets + ask-reasons correctly because REFERENCE.md is a loadable-on-demand file, not buried in a 32KB flat prompt where attention dilutes.
- **H-trigger.** Skill version invokes at the right times (and *not at the wrong times*) more reliably because `description` + `when_to_use` frontmatter are the discovery signal; the prompt-only version lacks one and depends on the host's routing.
- **H-null (leak).** Both hold the zero-leakage floor. If either leaks competitive fields without confirmation, the claim is in trouble.

**Why mechanical derivation is the right methodological move.** Hand-maintained baselines let the skill author tune one side preferentially; any measured delta is then attributable to effort, not substrate. Mechanical concatenation (SKILL.md body + REFERENCE.md inlined + examples/*.md inlined in lexicographic order, with the frontmatter description as role preamble and `when_to_use` as trigger context) eliminates that confound. The only thing that differs between the two conditions is **packaging**: filesystem-based progressive disclosure + frontmatter metadata + file-boundary semantics, vs. a single flat instruction block. That is the substrate question, cleanly isolated.

**Demo framing.** For the talk and `/about` §6: *"We took a Skill, mechanically flattened it into an equivalent system prompt with the same content, and ran both through the same 20-case grid. The delta is the value of the substrate."* Full case-study write-up at `packages/agents/interviewer/baselines/README.md`.

**Scope limits** (from that README, for honesty in the talk):
- One Skill, one domain. Healthcare + financial-rails replications are future work (§6).
- Same model on both sides — the delta isolates substrate, not intelligence.
- Output quality only — token-efficiency is a separate benchmark.
- Not a general claim about all Skills; the claim is specifically about *structured elicitation under strategic-reporting incentives*.
- Empirical, not formal — the revelation-principle argument is still §7 gap #2.

When Cartographer (#8) and Explainer (#13) ship, each gets its own mechanically-derived baseline under `packages/agents/<name>/baselines/`. The same drift gate covers them. The 4×3 eval matrix in the talk uses 3 Skills × 4 metrics × {Skill, prompt-only} = 24 comparisons, all fair by construction.

---

## 7. Honest gap inventory — what the project does NOT yet support

These are the delta between the claims in §3 and what Grid Passport currently demonstrates. Each is a concrete unit of work that, if landed, earns a slide.

1. **No empirical evidence schema discipline beats prompt discipline.** The hypothesis is testable; #14 does not yet measure it. Harness needs:
   - **Strategic-misreport benchmark** — paired prose inputs (truthful vs. strategically shaded) testing whether Interviewer produces the same `CaseInput` (§3.2 evidence).
   - **Schema-ablation study** — run the pipeline with the 5-test filter enabled vs. disabled (more/fewer fields); measure utility-side decision quality (§3.1 evidence).
   - **Write-scope canary** — adversarial prompts that try to get Notary/Cartographer to write into `privateProfile` (§3.4 evidence).

2. **No formal non-amplification or proper-scoring-rule argument yet.** The 5-test filter and write-scope contract together *should* produce non-amplification on the unverifiable subset and cross-check-compatibility on the verifiable subset, but neither property has been formalized. Two complementary sketches are worth 1–2 pages each: (a) non-amplification — under substrate S, the Skill output distribution on input `x` is invariant to semantic-equivalent rewrites `x' ∼ shade(x)`; (b) proper-scoring-rule compatibility — for unverifiable fields, a Brier or CRPS scoring rule applied to reported distributions versus realized outcomes makes honest calibration dominant (Winkler 1969, Gneiting-Raftery 2007 directly applicable). Revelation-principle applies only to the verifiable subset and would need a cross-check Referee Skill (not yet shipped) to land rigorously.

3. **"Non-amplification Interviewer" is partial mechanism, partial assertion.** Needs either (a) a typed write-scope guarantee ("Interviewer can only write values substring-present in the transcript or elicited via confirmed question") or (b) an empirical strategic-misreport benchmark. The SKILL.md encodes (a) in prose; formalizing as a typed capability constraint is future work. Empirical test (b) is the student-follow-on P1.2 in `research-roadmap.md`.

4. **Counterfactual ("one change flips outcome") is demo-only.** To claim *decision relevance* as a research property, the project needs a systematic sensitivity analysis: for a held-out set of `CaseInput`s, what fraction have a single-field perturbation that flips the `ProjectedView`'s decision band?

5. **Signed-bundle protocol has no receiver.** v1 exists; a utility-side reference verifier (Go or Python, ~200 LOC) plus a public test-vector set turns "protocol" into "citable standard."

6. **Generalization is narrative.** One non-grid fixture (HIPAA prior-auth) converts §6 from rhetoric into evidence.

Priority for the current research window (see `research-roadmap.md` §4 for the full queue): **(1a) strategic-misreport benchmark for non-amplification evidence, (1b) schema-ablation study for §3.1 evidence, (2) formalize non-amplification + proper-scoring-rule arguments, (3) ship the cross-check Referee Skill to complete the verifiable-field revelation-principle half.** Those four produce the strongest contribution chain.

## 8. Adjacent communities to engage

**Workshops and venues to attend or file to:**
- NeurIPS / ICML / ICLR **AI-for-Mechanism-Design** workshops — hosted *Peer Elicitation Games*, *Market Making for Safe and Aligned LMs*. Natural venue for §5.1 and §5.2.
- **FAccT** + **AIES** — natural for §3.1 and §3.2. Hardt (Tübingen/Berkeley), Barocas (MSR/Cornell), Mulligan (Berkeley), Raji on documentation + audit.
- **HotOS / OSDI / SOSP** — non-obvious but high-signal for §3.4 (capability-security reframe). Shapiro (KeyKOS), Miller (E), Klein (seL4) are the lineage.
- **USENIX Security / CCS / IEEE S&P** — LLM-agent-security subtrack; VeriGuard, AgentBound land here. Relevant for §5.3.

**Direct-engagement targets:**
- **NIST AI RMF Critical Infrastructure Profile** — concept note released 2026-04-07; public comment window is open. Worth engaging.
- **EPRI** + **LBNL Grid Integration Group** + **NREL** — energy research communities; useful if the HIPAA generalization gets deferred and we stay grid-only.

**Potential collaborators to know / cite / invite to program committees:**
- **Nika Haghtalab** (UC Berkeley) — strategic learning, incentive-robust ML. Spans §3.1–§3.2. Natural co-author for §5.1.
- **David Parkes** (Harvard) — mechanism design lineage. Students of his work on peer prediction for LLMs. Natural advisor for §5.2.
- **Daniel Kang** (UIUC) — LLM-agent security, auditability. Spans §3.3–§3.4.
- **Grant Schoenebeck** (Michigan) + **Yuqing Kong** — information-theoretic peer prediction; relevant even though we don't use their mechanism directly, because §5.1 inherits their vocabulary.

## 9. How to keep this doc alive

Three triggers that mean this document needs attention:

1. **A new agent is being scoped.** Before writing the SKILL.md, add a row to §4 articulating its write-scope and the research property it demonstrates. If you can't, the agent probably shouldn't ship.
2. **A new `CaseInput` field is being considered.** Run it through the 5-test filter (§4b in vision) *and* check whether it changes any of the four claims in §3. Schema growth that breaks the claims is a claim-update, not a silent edit.
3. **An eval result lands.** Update §7's gap inventory. If the result contradicts a claim in §3, update §3 — don't paper over.

This doc is not a status report. It is the load-bearing link between code edits and the research program. If a change you're making doesn't fit anywhere here, that's a useful signal — either the change is out of scope, or the thesis needs to expand.

## 10. Open questions (tracked; not claimed yet)

- Does the §3.1 schema-as-safety-case claim actually hold under *coordinated* misreport across multiple applicants? (Single-applicant revelation-principle argument may not generalize; this is where Kong/Schoenebeck peer-prediction ideas might re-enter.)
- What's the minimum policy-versioning calculus that lets a regulator audit a v0.3 disclosure under v0.4 rules without re-running the projection? (§5.3; unclear whether this is a systems paper or a formal-methods paper.)
- Is there a clean way to express "the Interviewer may only write values substring-present in the transcript or explicitly confirmed" as a typed constraint in the SKILL.md, or does it require runtime enforcement in the validator? (#7 implementation question with research implications.)

Update this section as questions resolve or new ones emerge.
