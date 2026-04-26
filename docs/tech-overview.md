# Grid Passport — Technical Overview

> A single-doc tour through what Grid Passport is, why it has this shape, and how the privacy mechanism actually works. Written for developers, utility reviewers, research readers, and anyone who wants the technical depth in one place without reading fifteen design docs.

## 1. The problem

Large-load electric interconnection — the process by which a hyperscaler, AI training campus, or manufacturing facility gets connected to a regional grid — has become a coordination failure. Demand is growing faster than the planning processes were designed for. Dominion Energy's Virginia queue alone is the canonical example: hundreds of megawatts of requested load, stacked behind a review process measured in years rather than months.

The bottleneck is not transformers or transmission lines. It is **information**. A utility planner needs to know, with enough confidence to commit capacity, what a site will actually draw, when, and with what flexibility. A regulator needs to know that the planner's decision was defensible under public policy. An applicant needs to know, before they commit to a site, whether their project will get built on time.

Each of these stakeholders has information the others need. And each has information they cannot share — sometimes for competitive reasons, sometimes for business reasons, sometimes because of genuinely binding legal regimes like HIPAA in adjacent domains.

This is the information-asymmetry problem. It is not an AI problem; it is a structural problem that AI might help solve if the architecture is right and make worse if the architecture is wrong.

## 2. Why existing practice is not enough

The status quo uses some combination of:

- **Bilateral NDAs** between an applicant and a utility, which let the applicant disclose more but leave the regulator in the dark and create an audit trail that looks like secret-keeping rather than policy compliance.
- **Redacted PDFs** which preserve metadata, ordering cues, and font-level artifacts that leak the thing the applicant thought they were protecting.
- **In-person negotiations** and **email threads** which lose state, leave unaudited side-channels, and scale as O(stakeholders²).
- **Third-party data rooms** which solve some of the audit problem but introduce a new trusted party that all sides have to agree on — a coordination problem one layer up.

None of these actually solves the problem. They trade one form of risk for another. NDAs convert strategic disclosure into a bilateral secret. Redacted PDFs convert over-disclosure into detectable-but-deniable leakage. Data rooms convert coordination between N stakeholders into coordination between N+1 stakeholders.

The shape we want, framed as a design requirement, is: **an applicant should be able to share a proof that a fact is true without sharing the underlying value, and a utility should be able to verify that proof without seeing the premise, and a regulator should be able to audit the policy path from inputs to release without seeing what was sealed.**

This is not a new idea in other domains. Patient-level health disclosures work this way (HIPAA Safe Harbor computes a safe view from raw records). Financial KYC checks work this way (a bank attests to a counterparty that a customer is verified without sharing the underlying documents). Our contribution is adapting the pattern to electric-grid interconnection, pinning it to an AI-agent workflow where the adversary is not just a curious utility but a hallucinating model that might over-disclose, and making the resulting artifact locally verifiable without a trusted third party.

## 3. Four architectural decisions

The system's shape is the product of four decisions. Each decision has a reject-alternative and a reason.

**3.1. Local-first application, not hosted service.** The applicant's desktop is the computational boundary; the utility's desktop is the verification boundary. There is no shared server, no third-party data room, no Grid Passport backend. The signed bundle is a file that moves between two Tauri binaries (and optionally an existing NDA conduit) at a rate set by the humans involved.

*Rejected alternative:* hosted SaaS. Even with good encryption and audit logging, the moment raw private fields pass through a server we own, we become the new trusted party. That collapses the trust story into "trust us, we promise." Instead we prefer "verify this yourself; we never see your data." The cost is that we cannot drive adoption through a hosted free tier; the benefit is that utilities' legal teams have one fewer counterparty to vet.

**3.2. Policy governs disclosure, not prompt text.** A Rego file (`packages/policy/grid-passport.rego`) is the canonical source of truth for which fields are released to which roles. A pure-TypeScript mirror in `packages/core/src/policy.ts` is the runtime used by the applicant's desktop binary. A Python mirror in `apps/verifier-py/` is the portability proof. All three are verified to agree by a structural canary on every commit.

*Rejected alternative:* prompt text alone ("never show utility the raw workload mix"). Prompts are suggestions to a language model, not enforcement. A model can be talked out of a prompt; a pure function over a policy table cannot. The policy layer is what we actually trust; the agent layer operates strictly above it.

**3.3. Pure functions for the safety-critical math.** Projection (which fields a role sees), forecast (derived proofs like the firmness score and flexibility band), and audit (the hash-chained event log) are deterministic TypeScript functions with unit tests. No LLM call touches them. Given the same inputs and the same policy version, they produce the same outputs.

*Rejected alternative:* LLM-driven projection. This is what most "agentic" applications do and is exactly the wrong call for safety-critical derivations. An LLM-generated projection might redact the right fields 99% of the time; that 1% is the story on the front page of the paper that kills the project. Pure functions eliminate that failure mode by construction.

**3.4. AI Skills operate at the schema boundary, not inside the safety-critical path.** Four Skills live in `.claude/skills/<name>/` and are auto-discovered by Claude Code. Each one declares a **write-scope contract** in its `SKILL.md` (what sections of `CaseInput` it is allowed to write to and, for the read-scope Skill, what sections it is allowed to read from) and is paired with a CI validator that rejects any output violating the contract. Skills can only create state that a subsequent pure function will consume; they never bypass the policy layer.

*Rejected alternative:* one big agent that does everything. Large monolithic agents are harder to test, harder to reason about, and concentrate blast-radius. Four small agents with explicit write-scope contracts are each a specification that can be independently evaluated and audited.

## 4. The schema as safety case

This is the central research claim, described in detail in `docs/design/research-thesis.md` §3. The short version:

A traditional safety argument for an AI system looks like "we train the model to be safe, we red-team it, we add guardrails at inference." That argument scales linearly with the number of failure modes you can enumerate and never closes the gap between "no known failure" and "no possible failure."

Our argument is structural: **the `CaseInput` schema is the safety case.** A field's classification — `public`, `private`, or `derived` — is not a guideline. It is a typed constraint that the projection layer, the privacy canary, and the Skill validators all check against independently. A `private` field cannot reach a non-applicant projection because the pure projection function does not emit it. The agent cannot leak it, not because we asked it nicely, but because the agent is not connected to the output channel where it would be seen.

The 5-test filter in `docs/vision.md` §4b is how a new field earns a place in the schema. A field must answer:

1. What specific projection does this field change?
2. What policy clause governs its release?
3. What is its field class and why?
4. What derived proof consumes it?
5. What leaks if it is misrouted?

If any of those five are unanswered, the field does not ship. The schema stays narrow. The safety case stays tractable.

## 5. Privacy mechanism, end to end

Let us trace a private field — internal schedule confidence — from intake to the utility's screen.

1. **Intake.** The applicant types prose into the desktop app's IntakePanel: "We're planning an AI training site with about 180 MW, maybe 60% training and 40% inference, though the mix shifts." The Interviewer Skill, running in a Claude Code subprocess inherited from the host session, parses this and proposes a structured `CaseInput` update: `privateProfile.internalScheduleConfidence = { p50: 0.62, p90: 0.48, class: "B" }`. The Skill's CI validator (`packages/agents/interviewer/src/validator.ts`) checks that the proposed update stays within the Interviewer's write-scope — it is allowed to write `privateProfile` and `requestMeta`, nothing else. If the Skill tried to populate `derivedProof` or `publicEvidence`, the validator would refuse.

2. **Merge.** The validated proposal merges into the local in-memory `CaseInput`. Nothing leaves the process. There is no network request at this stage; the Interviewer Skill runs as a local subprocess whose prompts were delivered via inherited OAuth from the host Claude Code session. The desktop app's TrustPanel shows `network calls · 0` — verifiable by disconnecting from wifi mid-intake.

3. **Public evidence.** The Cartographer Skill runs next, populating `publicEvidence` with cited facts (FEMA flood overlay, VA DEQ air-permit docket, county zoning, EPRI DCFlex enrollment). Each field carries a `sourceRef` to a URL on a whitelist (`.claude/skills/cartographer/SOURCES.md`). A URL not on the whitelist is a contract violation; the validator refuses.

4. **Forecast.** The `forecast` pure function (`packages/core/src/forecast.ts`) derives proofs from the private profile: a `firmnessScore` quantized to the nearest 5, a `flexibilityPassport` with MW-min/MW-max/duration/response-class, a `siteReadinessClass` stamped green / yellow / red. These derived fields live in `derivedProof` and are deliberately lossy — the utility sees them but cannot reconstruct the underlying `internalScheduleConfidence` from them.

5. **Projection.** The `projectForRole` pure function (`packages/core/src/projection.ts`) consults the policy (Rego-mirrored) and emits three `ProjectedView`s — applicant, utility, regulator. The utility's view contains `derivedProof` and `publicEvidence`. It does not contain `privateProfile`. The projection function does not call an LLM; it reads a field classification table and emits fields accordingly.

6. **Review.** The applicant reviews all three projections side-by-side before anything leaves their machine. This is the gate. The policy computed it; the human approves it. Grid Passport's architectural opinion is that agents propose and humans dispose — the signing action is always the applicant's deliberate click.

7. **Sign.** The desktop app's Rust-side signer (`apps/desktop/src-tauri/src/signer.rs`) canonicalizes the payload using RFC 8785 JSON Canonicalization Scheme, signs it with an Ed25519 key stored in the OS keychain (macOS Keychain / Windows Credential Manager / Linux Secret Service), appends a hash-chained audit trail of who-did-what-when at what policy version, and emits a JSON bundle.

8. **Transport.** The bundle file moves from applicant to utility through whatever channel they already use — email, existing NDA conduit, secure file transfer, a USB stick. Grid Passport has no opinion on transport; the bundle is self-authenticating.

9. **Verify.** The utility's desktop app (`apps/utility/`) drops the bundle into a verifier. The verifier recomputes the JCS canonical form, checks the Ed25519 signature against the applicant's pinned public key, recomputes the hash chain, and confirms the bundled `policyVersion` matches the binary's compiled policy-hash. If any check fails, the bundle is rejected with a specific reason. No public network call; no shared server.

10. **Render.** On success, the utility app renders the utility-role projection — firmness score, flexibility band, public-evidence citations, sealed-field count — in its own UI. A lime-accented trust-claim card stamps four structural guarantees: `network · 0`, narrow import set, private-bucket import boundary, keyId pinning. Gate 15 (`pnpm canary:utility`) asserts at build time that the utility binary's import graph does not link any file that imports the private-bucket types. This is the "schema is the safety case" claim operationalized at the build level.

The regulator's path is the same, with policy-allowed access to the signed audit trail so the release decision can be reconstructed after the fact. The regulator never sees raw private fields.

## 6. Cryptographic artifact: the signed disclosure bundle

The normative specification lives in `docs/design/signed-bundle-spec.md` (RFC 2119 language, wire format, canonical test vectors, conformance checklist). The design rationale and threat model live in `docs/design/signed-bundle.md` (eight design decisions with IETF/W3C citations and rejected alternatives). The short summary:

- **Canonicalization.** JCS (RFC 8785) is the canonical form. It sidesteps the classic JSON-signing pitfall where two semantically identical payloads hash differently due to key ordering or number formatting.
- **Signature.** Ed25519 — small keys, small signatures, fast verification, and a post-quantum migration path documented in the design doc.
- **Audit chain.** A per-bundle hash chain: each audit event includes `prevHash[i] === sha256Hex(JCS(event[i-1]))`. Tampering with any earlier event invalidates every later one.
- **Policy binding.** The bundle embeds the policy version (`policy@0.1.0`) and a hash of the policy bundle. A utility running a different policy version cannot accept a bundle with a mismatched hash.
- **Three-way parity.** TypeScript, Rust, and Python implementations produce byte-identical canonical output for the same input. The `canary:roundtrip` gate runs the three against each other on every commit.

A skeptical reviewer can verify any of this themselves with `pnpm demo:bundle`: the script signs a fresh owl-compute bundle, verifies it with the TypeScript verifier, verifies it again with the Python reference implementation, flips one byte of the payload, and confirms both verifiers reject the tampered copy. Sixty seconds, no external services, no API keys.

## 7. Where the AI actually lives

Four Skills are shipping today. Each one has a `SKILL.md` auto-discovered by Claude Code, a paired CI validator, a mechanically-derived prompt-only baseline (for measuring what the Skill packaging adds over a long system prompt), and an entry in the substrate-metrics panel.

| Skill | Domain | Contract axis | Write scope | Read scope | What it does |
|---|---|---|---|---|---|
| Interviewer | grid | write | `privateProfile`, `requestMeta` | applicant prose | Parses freeform applicant prose into structured `CaseInput` updates. Refuses to coach the applicant toward answers that would look better to the utility. |
| Cartographer | grid | write | `publicEvidence` | `requestMeta.parcel` only | Fetches facts from a whitelist of public sources, each with a `sourceRef` URL. Refuses to fabricate; refuses to cite URLs off the whitelist. |
| Explainer | grid | read | none (read-only) | `ProjectedView` only | Narrates a role-specific projection in three voices (applicant / utility / regulator). Refuses to include raw private-field literals; refuses to invent numbers that are not in the projection. |
| priorauth-Interviewer | HIPAA | write | structured prior-authorization request | patient-provided prose | Cross-domain demonstration that the same pattern transfers — the schema and write-scope contract change; the architectural shape does not. |

The write-scope contract is the research contribution. A Skill's `SKILL.md` declares it, the CI validator enforces it, and the substrate-metrics panel quantifies what that structure buys over an equivalent amount of prompt text: a uniform **−93.8% to −96.4% upfront-context savings** across all four Skills, plus dense refusal clauses (four to six "never" clauses, five to nine "halt" clauses, and two to twelve explicit "refuse" rules per Skill).

The Skills run inside the user's local Claude Code session. The desktop app spawns `claude -p --output-format json --system-prompt <skill-source>` as a subprocess; the subprocess inherits the host session's OAuth token. No API key prompt, no data sent to our infrastructure. Live-tested: roughly $0.18 and 74 seconds for a first-cold Interviewer call with a ~28 KB system prompt; subsequent calls ride the prompt cache.

Deliberately not-AI: projection, forecast, audit, signing, verification. Those are deterministic pure functions. We want the agent helping with elicitation, not with derivation.

## 8. Evaluation

The research claim that "schema discipline beats prompt discipline" is testable and is being tested. The pre-registered eval harness lives in `packages/eval-sim/` and is described in `docs/evals/sim-bench-design.md`. In one line:

> Simulate an applicant ↔ utility ↔ regulator interconnection workflow under four conditions (Oracle full-information control / NDA-email baseline / prompt-only AI / Grid Passport Skill-based) across seven scenarios (six grid archetypes plus a cross-domain HIPAA prior-authorization scenario) with five seeds each, and measure outcome-preservation, privacy leakage, specification adherence, and human-rated judge quality.

The substrate is Concordia (Google DeepMind's multi-agent simulation framework). The privacy scoring composes direct-string matching, Staab-style inferential-lift probes, and a channel-weighted trace classifier. The outcome metric is the Outcome-Preservation Ratio (OPR) plus Savage regret across a realized-future ensemble — this pairs a normalized utility score against the Oracle condition with a worst-case measure of how badly a given condition could fail on the realized future.

Amendments A-1 through A-6 are pre-registration-style amendments with byte-level locked prompt fences. Post-lock edits that change a scorer or a condition fail CI unless a matching amendment block lands in the design doc.

**What has been measured.** A 12-cell pilot (S1 Owl Compute × S2 Lantern Cloud × S3 Kraken Train × A/B/C/D × one seed each). Post-amendment scoring:

- **H-null privacy leakage** (the headline axis): D = 0 across all three scenarios. C = 0 on two of three. B (email baseline) shows leakage consistent with the pre-registered design.
- **OPR (D vs B)**: S1 +0.328 (clears the pre-registered +0.20 threshold), S2 +0.047 (flat), S3 +0.194 (borderline).
- **Savage regret (max, lower is better)**: D = 0.00 on S1, ties C at 0.20 on S3; D = 0.40 on S2 (where B also = 0.40).
- **Cross-family judge bias** (a Sonnet re-judge of three cells originally judged by Opus): no disagreement greater than one Likert point across fifteen dimension-judgments; Sonnet never scores above Opus; mean Δ ≈ −0.5 Likert; rank ordering D > B preserved.

**What this means.** S1 clears the replicable-effect threshold; S2 and S3 are directionally positive but statistically underpowered at n=1. The D-versus-B comparison against the status-quo NDA-email baseline is directionally clean across all three scenarios. The D-versus-C comparison against a mechanically-derived prompt-only version needs seed expansion before we can claim the Skill packaging adds something beyond the schema packaging.

**What has not been measured.** The full 455-run main sweep (140 condition + 35 oracle + 280 judge = $400–1200 SDK cost) is deferred. The `H-workflow`, `H-spec`, and `H-trigger` mechanical-compliance axes require ledger-metadata extension (a student task, spec ready). The Inferential Lift axis (Staab et al. 2024) is wired but not yet run live. The numbers you can read on the `/about` page today are directional, not publication-strength; the docs say so explicitly.

## 9. Honest limits

If you are reading this as a utility security reviewer, a research panel, or a collaborator deciding where to invest effort, here is what we would want you to know up front.

**The forecaster is a deterministic toy.** The `firmnessScore` and `flexibilityPassport` are stylized. The response-class ladder (A / B / C) is loosely inspired by the MOSAIC industry categorization but is not the official MOSAIC ladder. A production deployment would replace the `forecast` function with a utility-calibrated model; the rest of the architecture is unchanged by that swap.

**The TEE is simulated.** The confidential-compute boundary is the local process boundary. A production deployment that wanted attestable computation would swap the local binary for a GCP Confidential Space / Intel TDX / AMD SEV VM running the same code. The signing story is real today; the attestation story is a pivot path documented in `docs/vision.md` §5.

**The non-amplification claim is partial.** The Interviewer Skill refuses to coach the applicant toward strategic disclosure. That is the shipped non-amplification mechanism. A companion Referee Skill that performs verifiable-field cross-checks is planned but unshipped (student spec at `docs/evals/specs/P1_3-cross-check-referee-skill.md`). A proper-scoring-rule calibration for unverifiable fields is also planned but unshipped (`docs/evals/specs/P1_4-proper-scoring-rule-calibration.md`). The strategic-misreport benchmark that would measure non-amplification empirically is also a student spec (`P1_2-strategic-misreport-benchmark.md`).

**The schema-ablation study has not run.** The claim in `research-thesis.md` §3.1 is that the schema packaging is load-bearing — that Skill discipline beats prompt discipline because the schema structures the constraint. Condition C (mechanically-derived prompt-only) is competitive with Condition D on two of three scenarios in the pilot. Whether D's advantage on S1 holds at seed expansion, or disappears once C gets more samples, is an open empirical question. We expect the effect to be larger on scenarios with more complex schemas and smaller on simple ones; we have not yet demonstrated this.

**Dominion has not reviewed the utility-side spec.** Bhawuk Luthra is at Dominion Energy and is the co-conceptualizer of the project; the handshake agenda is in `docs/design/signed-bundle.md` §9. Until that review happens, "a utility accepts this bundle" is asserted by us, not corroborated by a utility. This is the single most important thing to address for the project to move from credible prototype to proven solution.

**n=1 on the sim-bench.** Pilot numbers are directional. The main sweep ($400–1200 SDK cost) is deferred; the pilot was designed to validate that the engine runs correctly and to produce a defensible "we checked" rather than a publishable effect size.

## 10. Where the innovation lives, in one paragraph

Grid Passport is not a new AI model and not a new cryptographic primitive. It is an **architectural pattern** — one way to compose well-understood pieces (policy-governed projection, RFC-grade canonicalization, Ed25519 signatures, OS-keychain-backed signers, hash-chained audit, LLM Skills with typed write-scope contracts) so that the resulting system has structural safety properties that are easier to argue for than the properties of any one component. The research contribution is naming the pattern ("the schema is the safety case"), identifying three sufficient mechanisms (non-amplification on unverifiable fields, asymmetric cross-check on verifiable fields, proper-scoring-rule elicitation to break dominant-strategy misreport), and demonstrating the pattern transfers to an adjacent domain (HIPAA prior-authorization) with only the schema and write-scope contract changing. The substrate for that demonstration — four Skills in two domains across two contract axes, each measured against a mechanically-derived prompt-only baseline — is what the substrate-metrics panel reports.

## 11. Where to go next

- **Read the story.** `/about` is the narrative version of this doc, rendered from `docs/story.md`. It is the right thing to send someone who wants the elevator-pitch-plus-evidence version.
- **Verify the protocol yourself.** `/protocol` lists the verify-it-yourself commands. `pnpm demo:bundle` is the canonical sixty-second roundtrip.
- **Run the demo.** `pnpm dev` starts the public web demo at `localhost:3000`. `pnpm desktop:dev` and `pnpm utility:dev` start the two Tauri binaries. The two-binary demo is the cleanest narrative: load a case in the applicant app, export a bundle, drop the bundle into the utility app, watch it verify and render.
- **Dig into the research.** `docs/design/research-thesis.md` has the four claims and the honest gap inventory. `docs/design/research-roadmap.md` has the priority queue for which claim to advance next.
- **Pick up a student path.** `docs/plans/sprint-2026-04-20-brief.md` and `docs/plans/student-handoff.md` describe four concrete follow-on paths: main sim-bench sweep, Explainer refinements, utility-binary extension (including the Dominion handshake), or derivation-correctness test expansion.
- **Cross-check the evaluation.** `docs/evals/sim-bench-design.md` is the pre-registration document. Any numerical claim you see on `/about` should trace back to a run whose ledger is in `packages/eval-sim/results/pilot/`.

We are interested in feedback from three kinds of readers in particular: utility security reviewers who can tell us what the bundle is missing before they would accept it; researchers working in adjacent communities (differential privacy, mechanism design, agent-based simulation, verifiable compute) who can tell us where our framing is over-claiming or under-citing; and developers who want to adapt the pattern to an adjacent domain with the same information-asymmetric coordination shape. The repo is AGPL v3; the research framing is on public record; the bundle format is an open protocol with canonical test vectors.
