# Grid Passport — Research Roadmap

> **What to work on, in what order, and why.** This is the strategy layer. The claims themselves live in `docs/design/research-thesis.md`; this doc is about *which claims to prioritize given what's shipped and what the adjacent literature has staked out*.
>
> Living document. Re-evaluate quarterly; update whenever a new paper lands in an adjacent space or new empirical evidence changes the picture.

Companion docs:
- `docs/design/research-thesis.md` — the four claims (§3.1–§3.4) + three spin-out questions (§5.1–§5.3) + honest gap inventory (§7)
- `docs/evals/sim-bench-design.md` — pre-registration for the behavioral evidence
- `docs/evals/sim-bench-results.md` — what the bench has actually measured so far
- `docs/plans/roadmap.md` — the build queue (feeds from this doc's priorities)

---

## TL;DR

**Unifying research claim.** Grid Passport implements an **asymmetric-verifiability disclosure mechanism**: verifiable fields get cross-checked (partial revelation-principle, for the subset with public counterparts); unverifiable fields get proper-scoring-rule distribution-elicitation (Winkler 1969 / Gneiting-Raftery 2007; honest calibration is dominant); and the substrate prevents the agent from amplifying strategic shading in either regime. Three composed mechanisms — cross-check + proper-scoring-rule + non-amplification — each tied to a theorem that actually applies.

**Paired research program:**
- **§3.2 (agent as non-amplification intermediary under asymmetric verifiability).** Honest claim about what the Skill architecture does. Classical mechanism-design setup (Myerson) applies only to the verifiable subset — requires the cross-check Referee Skill (unshipped; P1 below). For the unverifiable subset, proper scoring rules replace revelation-principle as the formal grounding. The composition is where the novelty lives.
- **§3.4 (object-capability pattern for LLM Skills).** Translation of Miller's *Object Capabilities for Security* (2006) to the authoring + validator layer, as an alternative to runtime-monitor approaches (VeriGuard, AgentSpec, Pro2Guard). Softer enforcement than kernel-mediated seL4; same architectural invariants.

**Supporting claims:** §3.1 (schema-as-safety-case) and §3.3 (projection-as-purity) are load-bearing but not the headlines.

**Scoping discipline.** Previous framings that invoked "revelation-principle" as the formal core of §3.2, or "capability-based security" in the KeyKOS / seL4 sense for §3.4, were overreaches — the mechanism design community requires detection-and-punishment for revelation-principle, and cap-security formalism requires kernel-mediated unforgeable tokens. Neither is what we ship. The calibrated claims above are what the evidence actually supports. This discipline matters: a positive result on the bench that is framed as revelation-principle compliance will read as oversold; the same result framed as non-amplification will read as defensible.

**Don't lead with §3.3.** The contextual-integrity / LLM-privacy-mitigation community has produced 3+ papers in the last 6 months (PrivacyChecker, 1-2-3 Check, CDI, Microsoft contextual-privacy). Leading here reads as a better-engineered mitigation; use §3.3 as a mechanism *inside* §3.4, not the claim.

---

## 1. What each claim means in plain language

A companion to `research-thesis.md` §3 — same claims, written for someone who hasn't read Myerson or Miller.

### §3.1 — Schema as the safety case

A typed schema with a field-admission filter (the 5-test filter in `vision.md` §4b) is itself the safety case. The agent can only write into a statically-bounded set of typed fields; the schema is the contract. No runtime monitor is needed because the contract is structural, not observational.

**What's known.** Runtime contracts (Agent Contracts 2602.22302, VeriGuard 2510.05156, AgentSpec ICSE 2026) frame contracts as monitors on execution. Data-contracts literature (IJIRMPS 2025) frames them as data-engineering artifacts.

**What's new.** Treating the typed schema itself as the contract, tied to a mechanism-design filter for what fields deserve to be in the schema in the first place.

### §3.2 — Non-amplification intermediary under asymmetric verifiability

**The observation that drives the claim.** Applicants in a disclosure pipeline have private information, but the information comes in two flavors:

- **Verifiable fields** have public counterparts: flood zone (FEMA NFHL), permit status (DEQ/EPA), parcel ownership (county records), financing-of-record (SEC filings, bank LOIs). For these, classical mechanism-design applies: cross-check against the public record makes misreport costly, approaching Myerson's revelation-principle ideal.
- **Unverifiable fields** have no public counterpart, often because the applicant is genuinely uncertain about them: `workloadMix` (shifts quarterly with product roadmap), `internalScheduleConfidence` (subjective probability), `flexPercent` (contract-dependent future curtailability), `redundancyShiftPercent` (load-dependent). Demanding a point estimate forces false precision — and gives the applicant a strategic lever.

**Three mechanisms composed:**

1. **Cross-check (verifiable subset) — Cartographer + Referee (planned).** Cartographer fetches public records and writes `publicEvidence` with `sourceRefs[]`. A planned Referee Skill flags inconsistencies between `privateProfile` claims and `publicEvidence` findings (e.g., applicant says "no flood issue"; FEMA shows AE-zone). This is the *partial revelation-principle* piece — detection of misreport makes shading costly on the verifiable subset. **Referee is unshipped; P1 below.**

2. **Proper-scoring-rule elicitation (unverifiable subset) — Interviewer + distribution fields + calibration Referee (planned).** For fields the applicant is genuinely uncertain about, the Interviewer elicits a *distribution* (range, band, P10/P50/P90, or equivalent class) rather than a point. A later Referee scores reported distributions against realized outcomes using a proper scoring rule (Brier, log-score, CRPS). Under a proper scoring rule, **honest calibration is the dominant strategy** (Winkler 1969, Good 1952, Gneiting-Raftery 2007) — no need for truth-telling about unknowable-future values; honesty about your subjective uncertainty *is* the equilibrium strategy. The Interviewer already supports band-level elicitation in prose; tightening to structured P10/P50/P90 and shipping the calibration-scoring Referee is P1 below.

3. **Non-amplification (both subsets) — Interviewer write-scope contract.** The Skill can only write `CaseInput` fields the applicant has explicitly confirmed in the transcript. It cannot amplify an applicant's vague phrasing into confident values — every value comes from a confirmation question, which surfaces in the audit trail. This is weaker than "truth-telling dominant" but more honest: the substrate doesn't turn shading into confidence. The existing Interviewer Skill is the partial evidence.

**Why it's a research claim.** Mechanism-design literature has 30+ years of theory on (1) revelation-principle and (2) proper scoring rules, treated separately. LLM-agent literature is dominated by runtime-enforcement (monitor the action) and sycophancy-reduction (train the model). **Nobody has composed (1) + (2) + (3) as a single substrate for single-applicant workflow disclosure.** The composition and the asymmetric-verifiability classification are the research contribution.

**What's staked out in 2025–2026.** Strategic-learning and truthful-calibration from Haghtalab's group (UC Berkeley, COLT 2025 co-chair). Mechanism-design-for-LLM-fine-tuning (Ren et al., ICASSP 2025). LLM-Economist (large-population mechanism-design simulacra; multi-agent, not single-applicant). Proper-scoring-rule elicitation from LLMs has been explored for RLHF (truthful labelers) but not for single-applicant regulated-disclosure workflows. The composition is unclaimed.

**What's new.** The asymmetric-verifiability framing (some fields cross-checkable, some distribution-elicited), the three-mechanism composition on a single substrate, and the empirical benchmark showing Interviewer produces the same `CaseInput` under truthful vs strategically-shaded input (the strategic-misreport benchmark; P1 below).

**Honest-caveat language for the paper.** We do NOT claim truth-telling is the dominant strategy across the whole `CaseInput` schema. We DO claim (a) cross-check makes misreport on verifiable fields detectable, (b) proper-scoring-rule elicitation makes honest calibration dominant on unverifiable fields with intrinsic type-uncertainty, and (c) the Skill substrate does not amplify shading in either regime. Each sub-claim has its own theorem and its own empirical test.

### §3.3 — Projection as purity

**What this means.** Cleanly separate what agents write (stochastic LLM output into a typed record) from what stakeholders see (deterministic projection from the typed record, via a pure function). The projection has no LLM in it. "What the model decides" becomes irrelevant to "what the regulator sees."

**What's staked out.** Contextual-integrity / LLM-privacy mitigation has gotten crowded fast: PrivacyChecker (EMNLP 2025), 1-2-3 Check (EMNLP 2025), Contextualized Defense Instructing (Mar 2026), Microsoft contextual-privacy work. All are mitigation-layer approaches: "insert a privacy check before output." Ours is architecturally different (strict stochastic-deterministic separation) but increasingly adjacent to this community's framing.

**Positioning.** Supporting claim, not headline. Cite as the invariant-preservation mechanism *inside* the §3.4 architecture paper.

### §3.4 — Object-capability pattern for LLM Skills

**The classical result.** Capability-based operating systems (KeyKOS 1985, Miller's E language 2006, seL4 2009): instead of checking permissions on every action ("can this process read that file?"), each component holds unforgeable *capability tokens* that grant specific access. You can only do what your capabilities let you do, by construction; there's no permission check to fail open on. The architectural invariants are: static write-scope, fail-closed denial, no amplification.

**What this means here.** Each Skill holds a write-scope capability, encoded structurally:

| Skill | Can write | Cannot write (structurally) |
|---|---|---|
| Interviewer | `CaseInput` fields (explicitly confirmed via question) | `publicEvidence`, `derivedProof` |
| Cartographer | `publicEvidence` (every entry carries `sourceRefs[]`) | `privateProfile`, `derivedProof` |
| Notary | Hashes + `AuditEvent[]`; deterministic | Mutations to upstream records |
| Forecaster / Referee | None (pure Python functions; no LLM) | Anything stochastic |
| Explainer | Prose conditioned on `ProjectedView` | Reading raw `CaseInput` |

The architectural invariants hold at the paired-validator layer: the set of reachable writes is a static property of the Skill × schema pair; the paired CI validator fails-closed on any write outside scope — the canonical object-capability fail-closed invariant.

**Where our mechanism is softer than KeyKOS / seL4.** We enforce at the **authoring-time SKILL.md contract + post-hoc validator refusal**, not at a runtime kernel. A Skill that violated its declared scope would be caught by the validator, not prevented from attempting the write. We do not have unforgeable runtime capability tokens, and we do not have seL4-grade formal verification. The object-capability *pattern* is replicated; the enforcement layer is softer.

**Why it's still a research claim.** Surveys (ACM CSUR 2025 *Emerged Security and Privacy of LLM Agents*) explicitly flag this as an emerging area. Nobody has written the canonical paper that translates Miller's *Object Capabilities for Security* (2006) or Shapiro's KeyKOS architecture into LLM-agent design. The OS-security community has the vocabulary but hasn't looked at LLMs; the LLM-security community thinks in ACL-style monitors.

**What's staked out.** LLM-agent security surveys (ScienceDirect 2025, OWASP Top-10-for-Agents 2026) enumerate attacks + defenses. VeriGuard + AgentSpec + Pro2Guard are runtime-monitor approaches. None use the object-capability lineage.

**What's new.** Applying Miller's object-capability pattern to LLM-agent Skill design at the authoring + validator layer, with the 3-Skill × 2-domain substrate-metrics panel as quantitative evidence that the frame produces real architectural properties (fail-closed refusal counts; no-amplification invariant; static-write-scope surface). Not seL4; the pattern, applied at a softer layer — which is itself a research contribution (the translation).

---

## 2. Competitive-positioning snapshot (2026-04-20)

| Claim | Head-on competition | Adjacent crowding | Our position |
|---|---|---|---|
| §3.1 schema-as-safety-case | Data-contracts literature (IJIRMPS 2025) | Structured-output / constrained decoding (table stakes by 2026) | **Defensible but getting company** |
| §3.2 non-amplification + asymmetric verifiability | **None direct for the composed 3-mechanism framing.** | Haghtalab strategic-learning (cross-check piece); mechanism-design-for-LLM-fine-tuning (proper-scoring piece); LLM-Economist (population mechanism, not single-applicant). Each piece has precedent; the composition and the asymmetric-verifiability taxonomy are ours. | **Whitespace for the composition** |
| §3.3 projection-as-purity | PrivacyChecker (2509.17488), 1-2-3 Check (2508.07667), CDI (2603.02983), Microsoft contextual-privacy | Mitigation-layer approaches are proliferating | **Crowding fast — support role** |
| §3.4 object-capability pattern for LLMs | **None direct.** | Runtime-enforcement (VeriGuard, AgentSpec, Pro2Guard) — different enforcement-layer framing entirely | **Unclaimed; explicitly emerging area per ACM CSUR 2025** |

---

## 3. What evidence we have (as of 2026-04-20)

Map of claims → shipped evidence.

### Direct evidence

- **§3.1 + §3.4 substrate metrics** — `packages/agents/metrics.md` (auto-generated, drift-gated). Three Skills × two domains. Context-cost delta −93.8% to −96.4% upfront; 5–6 "never" clauses per Skill; 5–9 "halt" clauses; 2–12 "refuse" clauses; 3–4 validator-refused contract violations per paired CI validator; 11-URL source whitelist on Cartographer. **The countable write-scope enforcement cloud is the §3.4 quantitative evidence.**
- **§3.3 + §3.4 H-null canary** — 12-subset pilot (S1/S2/S3 × A/B/C/D × seed=0): D = 0 verbatim-leaks across all 3 scenarios; B = 4 leaks; C = 0–1; A = 1 (discloses by design). **D = 0 is the invariant-check passing — the bundle protocol + write-scope refuses verbatim raw-value carrying, and the canary confirms it under live simulation.** (Not a formal guarantee; an empirical invariant check.)
- **§3.1 5-test filter** — codified in `vision.md` §4b, enforced at the authoring layer (`packages/core/src/ask-reasons.ts` entry required for every `FieldPath` variant).
- **Cross-domain replication** — `priorauth-interviewer` Skill (HIPAA domain); same recipe, same substrate-metric shape. **Substrate claim becomes methodological, not grid-specific.**

### Gaps (from `research-thesis.md` §7)

- No strategic-misreport benchmark for §3.2 non-amplification (honest gap #1a).
- No shipped cross-check Referee for the verifiable-field subset of §3.2 (partial revelation-principle piece).
- No proper-scoring-rule calibration harness for the unverifiable-field subset of §3.2 (Winkler 1969 applied to Interviewer's band elicitations).
- No formal non-amplification or proper-scoring-rule sketch (honest gap #2).
- No schema-ablation study for §3.1 (honest gap #1b).
- No write-scope adversarial canary for §3.4 (honest gap #1c).
- No systematic counterfactual-sensitivity analysis (honest gap #4).

---

## 4. Priority queue

Each item has: goal, size, owner suggestion (Ming / student follow-on / collaborator), which claim it unlocks.

### P0 — Complete what's in flight

**P0.1.** Complete the #14 main-sweep (140 condition + 35 oracle + 280 judge runs). Aggregate → `docs/evals/sim-bench-results.md`. *Owner:* engine student (per `owner-briefs.md`). *Unlocks:* behavioral evidence for §3.2 + §3.4.

**P0.2.** Finish deferred scorer axes: robustness/OPR, inferential lift, full mechanical, judge swap augmentation. Tracked in `sim-bench-results.md` "Deferred axes." *Owner:* engine student. *Unlocks:* publishable numbers for §3.2.

### P1 — Own the two research claims

**P1.1. §3.4 object-capability pattern paper (HotOS-style position paper).**
- Size: 6-page position paper, ~1–2 weeks of focused writing.
- Content: Miller's *Object Capabilities* (2006) → Shapiro's KeyKOS → seL4 architectural lineage → our Skill × validator pair at the authoring + validator layer. Substrate-metrics panel as quantitative evidence (3 Skills × 2 domains; validator-refused contract-violation counts). Cross-domain replication (HIPAA priorauth) as evidence the frame generalizes. **Explicit scope note: the pattern applied at a softer enforcement layer than kernel-mediated seL4 — contribution is the translation, not the system.**
- Venue: HotOS 2027 (submission deadline typically Oct/Nov 2026). Also possible: USENIX Security short paper, or SOSP 2027 workshop.
- *Owner:* Ming (lead). Potential collaborator: a KeyKOS / E-language alumnus to sanity-check the translation (Mark Miller if reachable via Agoric network).
- Dependencies: substrate metrics are shipped. Paper is write-up, not new implementation.

**P1.2. §3.2 strategic-misreport benchmark + paper (non-amplification evidence).**
- Size: ~2 weeks of scenario authoring + ~1 week of runs + ~2 weeks of write-up.
- Content: paired prose inputs per scenario (truthful variant + strategically-shaded variant, semantically equivalent in intent but differently worded); run Interviewer on both; measure CaseInput-equivalence rate. **Hypothesis:** Interviewer's confirmation-gated write-scope produces the same CaseInput under both variants, above a pre-registered threshold (e.g., 90% invariant across 20 paired inputs × 6 scenarios = 120 pair-tests). The *prompt-only baseline* (flat-prompt Interviewer) is the fair comparison — does the Skill structure contribute to the invariance? Expected direction: Skill invariance > prompt invariance.
- Venue: NeurIPS AI-for-Mechanism-Design workshop (2026 or 2027), AIES, FAccT.
- *Owner:* **Student follow-on.** Well-scoped, rubric-driven, uses the existing `packages/eval-sim/` infrastructure. The scenario-card authoring (paired prose variants) is a bounded, teachable task; running the benchmark + analyzing the invariance rate is a bounded Python + scorer task. Ming reviews rubric + analysis; student drives the rest.
- Dependencies: existing Interviewer Skill, existing `pnpm agents:baseline` baseline-derivation pipeline, existing scorer batch.

**P1.3. §3.2 cross-check Referee Skill (verifiable-field subset).**
- Size: ~2 weeks Skill-authoring + ~1 week validator + ~1 week runs.
- Content: ship a new Referee Skill that consumes `privateProfile` + `publicEvidence` and emits flags for inconsistencies (e.g., `privateProfile.siteControlStatus="signed"` but no deed in Cartographer's `publicEvidence.parcelRecords`; `privateProfile.floodRisk="low"` but FEMA shows AE-zone; `privateProfile.financingStatus="LOI"` but no bank letter in public records). Validator refuses writes outside the `derivedProof.consistencyFlag` write-scope. This is the **partial revelation-principle piece** — detection of misreport on the verifiable subset makes shading costly.
- Venue: substantial chunk of the P1.2 paper (adds the cross-check axis to the non-amplification evidence); could also be a standalone artifact.
- *Owner:* Student follow-on (Skill authoring follows the Interviewer / Cartographer pattern).
- Dependencies: existing Cartographer `publicEvidence` + the 7 scenarios' public-record coverage.

**P1.4. §3.2 proper-scoring-rule calibration harness (unverifiable-field subset).**
- Size: ~1 week harness + ~1 week documentation.
- Content: for unverifiable fields the Interviewer already band-elicits (confidence, workload-mix bands, flex-range), add a structured P10/P50/P90 elicitation mode + a calibration scorer that compares reported distributions against realized outcomes from the `F_S` ensemble. Brier or log-score; pre-register before running. Hypothesis: if Skill substrate improves calibration (reported P50 is closer to realized value, and claimed 80% CI contains realized value 80% of time), honest calibration is dominant — empirical support for Winkler 1969 applied here.
- Venue: §3.2 paper (extends P1.2 with the proper-scoring-rule axis).
- *Owner:* Student follow-on, with Ming consulting on scoring-rule choice.
- Dependencies: F_S ensemble (already in scenario cards); Interviewer structured-elicitation extension (small Skill edit).

**P1.5. §3.2 formal sketches (non-amplification + proper-scoring-rule).**
- Size: 1–2 pages each (non-amplification sketch; proper-scoring-rule compatibility sketch).
- Content (non-amplification): under substrate S with write-scope contract C, the Skill's output distribution on input `x` is invariant to semantic-preserving rewrites `x' ∼ shade(x)`. A weaker theorem than revelation-principle, but provable without requiring a utility function. Content (proper-scoring-rule): Winkler 1969 / Gneiting-Raftery 2007 directly applies to the unverifiable-field elicitation once P1.4's harness is in place; write down why.
- Venue: P1.2 / P1.4 paper appendices; or a standalone AAMAS short paper.
- *Owner:* **Ming (lead), natural co-authors: a Haghtalab student (non-amplification) and a Parkes student (proper-scoring-rule).**
- Dependencies: none — purely formal.

### P2 — Supporting work

**P2.1. Schema-ablation study (§3.1 evidence).**
- Size: ~1 week of engine work + 1 week of runs.
- Content: run the pipeline with the 5-test filter enabled vs disabled (more/fewer fields in `CaseInput`); measure utility-side decision quality. Does a disciplined schema produce better decisions than a maximal one?
- *Owner:* Student follow-on.

**P2.2. Write-scope adversarial canary (§3.4 evidence).**
- Size: ~1 week.
- Content: adversarial prompts that try to get Notary / Cartographer to write into `privateProfile`. The paired CI validator should refuse 100%. Red-team document becomes §3.4 appendix.
- *Owner:* Student follow-on.

**P2.3. Systematic counterfactual-sensitivity analysis (honest gap #4).**
- Size: ~1–2 weeks.
- Content: for a held-out CaseInput set, what fraction have a single-field perturbation that flips the projection's decision band? Converts the counterfactual from demo-only to research-property.
- *Owner:* Student follow-on.

### P3 — Generalization push

**P3.1. Financial-rails Skill (KYC/AML intake).**
- Size: ~2 weeks per Skill (Interviewer-style).
- Content: second cross-domain replication (grid → HIPAA → KYC). Makes §6 generalization claim *three* domains. Substrate-metrics panel then spans 4+ Skills × 3 domains.
- *Owner:* Student follow-on, with domain consult.

**P3.2. ESG / Scope-3 emissions Skill (supplier intake).**
- Same shape as P3.1.

### P4 — Deferred / speculative

**P4.1. Versioned policy calculus (§5.3).**
- Size: unclear; likely 3–4 weeks for a formal model, longer for a systems paper.
- Content: when Rego policy changes, how does a downstream verifier audit a v0.3 disclosure under v0.4 rules? Consistency guarantees, backward-compatibility calculus.
- *Owner:* Ming or systems collaborator. Gated on P1.1 (capability-based reframe) landing first — otherwise the framing is fragmented.

---

## 5. What to cite + who to engage

**Citation must-haves in P1.1 (§3.4 paper):**
- Miller, *Robust Composition: Towards a Unified Approach to Access Control and Concurrency Control* (PhD thesis, JHU 2006) — the object-capability treatise.
- Shapiro et al., *EROS: a fast capability system* (SOSP 1999), *KeyKOS*.
- Klein et al., *seL4: formal verification of an OS kernel* (SOSP 2009).
- Contrast against: VeriGuard (Miculicich et al., 2510.05156, Google Research 2025), AgentSpec (ICSE 2026), Pro2Guard, Agent Behavioral Contracts (2602.22302).
- LLM-agent security surveys: *Emerged Security and Privacy of LLM Agents* (ACM CSUR 2025, `dl.acm.org/doi/10.1145/3773080`); OWASP Top-10-for-Agents 2026.

**Citation must-haves in P1.2 (§3.2 paper):**
- Myerson, *Incentive Compatibility and the Bargaining Problem* (Econometrica 1979) — revelation principle.
- Haghtalab strategic-learning papers (2024–2025). Truthful calibration measures. Natural co-author.
- Parkes + students on peer prediction for LLMs.
- Staab et al. 2024 *Beyond Memorization* (arXiv:2310.07298) — we use their probe prompt for §8c.ii; inferential-leakage framing cites.
- AgentLeak (arXiv:2602.11510) — we use its calibrated threshold; leak-detection vocabulary.
- LLM-Economist (OpenReview KYAmr60KSn) — mechanism-design-for-population-LLMs precedent; explicitly differentiate single-applicant vs population.

**Communities to engage (actively):**
- NeurIPS AI-for-Mechanism-Design workshops (2026 fall, 2027 spring); FAccT; AIES.
- HotOS (2027, submission typically Oct/Nov 2026); also USENIX Security for adjacent §3.4 work.
- NIST AI RMF Critical Infrastructure Profile — public comment window is open (concept note 2026-04-07).
- EPRI + LBNL Grid Integration Group — grid-side credibility channel, useful if §3.4 paper cites Grid Passport as anchor example.

**Potential collaborators (unblock a direction if we reach out):**
- **Nika Haghtalab** (UC Berkeley) — §3.2 co-author material.
- **David Parkes** (Harvard) + students — §3.2 mechanism-design advisor.
- **Mark Miller** (if reachable via Agoric Systems or past network) — §3.4 reality check. Could make the capability-security translation land with credibility.
- **Daniel Kang** (UIUC) — LLM-agent security bridging §3.3–§3.4.

---

## 6. What NOT to do

- **Don't lead with §3.3.** Too crowded as of Q4-2025 / Q1-2026 with PrivacyChecker / 1-2-3 Check / CDI / Microsoft contextual-privacy. Leading here reads as incremental mitigation work, even though our architecture is different. Use §3.3 as a mechanism *inside* the §3.4 architecture paper.
- **Don't lead with §3.1 alone.** The data-contracts + structured-output communities will colonize this framing unless it's paired with a mechanism-design or capability-security claim. §3.1 + §3.4 together is ambitious; §3.1 alone is crowded-and-shrinking.
- **Don't expand the schema without running new fields through the 5-test filter** (`vision.md` §4b) AND checking whether they change §3.1–§3.4. New fields that don't survive the filter undermine §3.1. This is the `research-thesis.md` §9 alive-keeping contract.
- **Don't ship a new Skill without adding a row to `research-thesis.md` §4.** Every Skill is a *different* write-scope contract; the table is the running catalog of what the substrate is doing.
- **Don't run the main sweep (#14 step 7) before the LLM-gated scorer pass on the 12-subset finishes.** The main sweep amortizes fixed costs over 455 runs; launching with a broken scorer is expensive.

---

## 7. How to keep this doc alive

Three triggers that mean this document needs attention:

1. **A paper lands in one of the four claim spaces.** Add a row in §2 (competitive-positioning snapshot). If the paper head-on-competes with §3.2 or §3.4, re-evaluate the lead-claim choice.
2. **A P1 or P2 item completes.** Move it from the priority queue to `docs/evals/sim-bench-results.md` (for empirical items) or to `research-thesis.md` §6 (for substrate metrics). Keep this doc focused on what's *next*.
3. **Quarterly review.** Re-run the WebSearch queries at the top of §2. If the competitive-positioning table has changed substantially, surface the change in the §Status / §Now of `docs/plans/handoff.md`.

This doc is not a status report. It is the link between the thesis (claims) and the build queue (roadmap). If a change you're making doesn't fit anywhere here — either the change is out of scope, or this doc needs to expand.
