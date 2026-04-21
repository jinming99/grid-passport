# Hackathon presentation plan — Grid Passport

> A 10-minute talk plan with a live two-binary demo, 15 anticipated-Q&A answers, and a no-overclaim checklist. Pair this doc with the `/technical` page on the site for any judge who wants to dig deeper than the talk goes.

> **Companion doc**: [`docs/demo-casebook.md`](./demo-casebook.md) — the operator's bench reference. Every demo beat called out below (slides 6, 7, 8, 9) has a matching case study (A / G / D / F / H) in the casebook with exact pre-flight commands, click-by-click scripts, expected observations, and recovery moves. Open the casebook in a second monitor during rehearsal; this doc is the talk plan; the casebook is the *how*.

---

## 1. Time budget (10 minutes)

| Minute | Mode | What the audience sees |
|---|---|---|
| 0:00–1:30 | Talk | Cold open — the problem in one slide, the shape of the answer in the next |
| 1:30–4:30 | **Live demo 1** | Applicant Tauri app: intake prose → Interviewer Skill → projection → signed bundle |
| 4:30–6:30 | **Live demo 2** | Utility Tauri app: drop the bundle, verify, render utility-role projection |
| 6:30–8:00 | Talk | Why this shape (research claim) + substrate-metrics slide |
| 8:00–9:00 | Talk | Evaluation headline + honest limits |
| 9:00–10:00 | Talk | Call to action + questions |

Keep the talk-to-demo ratio at roughly 55:45. Judges have seen slide decks; they have not seen a two-binary verifier-in-motion.

---

## 2. Slide-by-slide outline (13 slides)

### Slide 1 — Title
*Grid Passport · Truth without disclosure · Confidential coordination for grid interconnection · Ming Jin · Bhawuk Luthra (Dominion) · Vikrant Bhati*

Visual: the landing page hero. Nothing else.

### Slide 2 — The problem in one frame
Three bullets, no chrome:
- Large-load interconnection is the bottleneck behind every AI compute buildout.
- Dominion's Virginia queue is years long because information cannot flow between applicant, utility, and regulator.
- Existing tools (NDAs, redacted PDFs, data rooms) trade one failure mode for another.

Spoken: *"AI compute is doubling every year. The grid plans on five-year timescales. The gap is not wires — it is information. Applicants cannot share what utilities need to commit capacity; utilities cannot share what regulators need to audit the commitment."*

### Slide 3 — Today's approaches and why they fail
Four-row table. Bilateral NDA (regulator is blind). Redacted PDF (metadata leaks). In-person negotiation (doesn't scale, unauditable). Third-party data room (new trusted party).

Spoken: *"Every existing approach trades one form of risk for another. We want the shape where none of the three stakeholders has to trust a fourth party."*

### Slide 4 — Our claim
One sentence, big type:

> The schema is the safety case.

Three bullets under it:
- Structural constraints on what AI can read and write, not prompt-level guardrails.
- Deterministic pure functions for the safety-critical math, not LLM inference.
- Local application with cryptographic bundle, not hosted service.

This slide is load-bearing. Rehearse it.

### Slide 5 — System in one picture
ASCII-grade diagram (keep it simple):

```
applicant prose ──▶ Interviewer Skill ──▶ CaseInput (private + public)
                        │ (validator-gated, write-scope bound)
                        ▼
                   Cartographer Skill ──▶ publicEvidence with sourceRefs
                        │
                        ▼
                   forecast() pure fn ──▶ derivedProof (firmness / flex band)
                        │
                        ▼
                   projectForRole()  ──▶ ProjectedView{applicant, utility, regulator}
                        │
                        ▼
                   [applicant reviews all three side-by-side]
                        │
                        ▼
                   sign() ──▶ signed disclosure bundle ──▶ (file)
                                                              │
                                          utility binary ◀────┘
                                                │
                                          verify() + render()
```

Point out: everything left of the bundle runs on the applicant's machine. Everything right of the bundle runs on the utility's machine. No shared server.

### Slide 6 — Live demo handoff
*"Let me show you the applicant app."* Switch to the applicant Tauri window.

### Slide 7 — (After demos) What just happened
Visual: the signed bundle JSON, opened in a text viewer.
- Canonicalized with RFC 8785 (JCS).
- Signed with Ed25519, key in OS keychain.
- Hash-chained audit trail.
- Policy version + policy hash bound into the signed payload.
- Zero-dep Python verifier in `apps/verifier-py/` as the portability proof.

Spoken: *"The utility never needed to trust us. They ran a local verifier against a public protocol."*

### Slide 8 — The substrate-metrics panel
Visual: screenshot of `packages/agents/metrics.md` (or `/about` §6a).

Four Skills across two domains (grid + HIPAA) across two contract axes (write-scope + read-scope). Uniform **−93.8% to −96.4% upfront context savings** versus mechanically-derived prompt-only baselines. Dense refusal clouds (4–6 "never" clauses, 5–9 "halt" clauses, 2–12 "refuse" rules per Skill).

Spoken: *"We measured what the Skill packaging adds over a long system prompt. The contract is small, the refusal surface is dense, and the pattern transferred to a second domain we did not design for."*

### Slide 9 — Evaluation headline
Three-column table from pilot (n=1 per cell):

| Scenario | OPR Δ (D − B) | Savage regret (D, max) | H-null leakage (D) |
|---|---|---|---|
| S1 Owl (hyperscaler) | **+0.328** ✓ clears threshold | 0.00 (best) | 0 |
| S2 Lantern (cautious) | +0.047 (flat) | 0.40 (ties B) | 0 |
| S3 Kraken (flex-forward) | +0.194 (borderline) | 0.20 (ties C lowest) | 0 |

Spoken: *"Pilot numbers. S1 clears the pre-registered effect-size threshold. S2 and S3 are directionally positive but underpowered at this sample size. The main sweep is budgeted but deferred. We are not claiming replicable effect sizes yet."*

### Slide 10 — Honest limits
Four bullets, deliberately:
- n=1 per cell on the behavioral bench. Main sweep ($400–1200) deferred.
- Forecaster is a deterministic toy; production would replace it with a utility-calibrated model.
- TEE is simulated; Confidential Space / TDX is a pivot path.
- Dominion has not yet reviewed the utility-side spec. Bhawuk-gated.

Spoken: *"We want you to know these up front. The architecture is what we are defending; the numbers are pilot-grade."*

### Slide 11 — What this is really about
Big type again:

> Agents where elicitation lives. Pure functions where the math lives.

Bullets:
- Interviewer / Cartographer / Explainer = AI. They propose structured updates.
- Projection / forecast / audit / signing / verification = deterministic functions. They dispose.
- The write-scope contract is what keeps the two layers from leaking into each other.

This is the research framing. If you only get one thing across, make it this one.

### Slide 12 — Call to action
Three, one per audience:
- **Utility security reviewers**: tell us what is missing before you would accept a bundle.
- **Researchers** in adjacent communities (differential privacy, mechanism design, agent simulation, verifiable compute): tell us where we are overclaiming or under-citing.
- **Developers** with an adjacent domain (HIPAA is already shipping; what else looks like this?): the pattern transfers; the schema changes.

Repo, protocol, everything is public: `grid-passport.vercel.app`, `github.com/jinming99/grid-passport` (flip-to-public pending).

### Slide 13 — Q&A
No content. Point at the `/technical` page as the leave-behind.

---

## 3. Demo script — Demo 1 (applicant, 3 minutes)

**Setup:** applicant Tauri window open, no case loaded, TrustPanel visible at top (`network · 0`, `raw private released · 0`). Prepared prose on clipboard in case Interviewer cold-start is slow.

**Script.**

> *"I am a data-center applicant. I want to file an interconnection request for a 180 MW AI training campus in Prince William County, Virginia. The private fields I care about protecting: my exact workload mix, my internal schedule confidence, my backup-generation plan. Let me type that into the intake."*

**[Paste prose into IntakePanel textarea.]**

> *"We are planning 180 megawatts in Prince William. About 60 percent training, 40 percent inference. Our scheduler confidence is roughly 0.62 for p50, 0.48 for p90. Class B response. Backup gens: two 10 MW units, diesel."*

**[Click "ask interviewer".]**

> *"The Interviewer Skill is now running as a subprocess — `claude -p`, no API key, it rides my Claude Code session. The Skill's SKILL.md declares it can write to `privateProfile` and `requestMeta` and nothing else. A CI validator will refuse any output that tries to write `derivedProof` or `publicEvidence`. The validator runs before the state write."*

**[Wait for the CaseInput card to appear — green, validator passed.]**

> *"The Interviewer proposes structured fields. The validator passes. Now I review all three projections side-by-side, before anything leaves my machine."*

**[Switch to work-mode or scroll to the side-by-side ReviewColumn trio.]**

> *"Here is what I see as the applicant — raw private fields visible. Here is what the utility will see — firmness score, flexibility band, public evidence, but the private fields are sealed. Here is what the regulator will see — the projection plus the audit trail. The policy is the release surface. The agent did not decide which fields to show; a deterministic function did."*

**[Point at TrustPanel.]**

> *"TrustPanel at the top: zero network calls during this whole flow. Inputs at the path I chose. Raw private fields released: zero. These are not hardcoded — they are live runtime state."*

**[Click "export bundle", save to Desktop.]**

> *"Bundle is signed with Ed25519, the key lives in my macOS keychain, the payload is canonicalized with RFC 8785. This file is what leaves my machine. Nothing else."*

---

## 4. Demo script — Demo 2 (utility, 2 minutes)

**Setup:** utility Tauri window open. Pubkey paste field prefilled with the applicant's key (captured from demo 1 preview, or from an envelope fixture).

**Script.**

> *"I am the utility. I received this signed bundle through whatever channel I already use with this applicant — existing NDA conduit, email, USB stick. The utility binary never needs to see the applicant's raw inputs."*

**[Drop the bundle file onto the drop-zone — or click "open", pick the file.]**

**[Green "verified" card appears with keyId + policyVersion + policyHash prefixes.]**

> *"The verifier just checked four things: the Ed25519 signature against the applicant's pinned public key; the JCS canonical form of the payload; the hash chain across the audit events; and the policy version against what this utility binary expects. All four passed."*

**[Point at UtilityProjection card.]**

> *"This is the utility-role projection: firmness score 59, flexibility passport 32 to 44 MW for 3 to 4 hours at response class B. Derived proofs. Public evidence citations with source URLs — FEMA flood, VA DEQ air permit, county zoning. Sealed private fields: 8 of them, redacted under policy clause 2.1. I, the utility, can tell you exactly how many are sealed and why; I cannot tell you what they are."*

**[Point at trust-claim card.]**

> *"Four structural guarantees stamped on the view: no network calls during verification, narrow import set (this binary literally cannot import the applicant's private bucket types), private-bucket boundary enforced at the import graph, keyId pinning. The last one is verified at build time by `pnpm canary:utility`."*

**[Optional — if time permits, show tamper-rejection.]**

> *"Let me show you what happens if someone tampered with the bundle in transit."*

**[Switch to terminal, run `pnpm demo:bundle` → the tamper test runs and both TS + Python verifiers reject. 30 seconds.]**

> *"Tampered bundle rejected by the TypeScript verifier and by the independent Python reference verifier. Three-way parity — TypeScript, Rust, Python — is a gate in CI."*

---

## 5. Anticipated Q&A (15 questions)

**Q1. "Why not just use zero-knowledge proofs?"**

> ZKPs are the asymptote. They require circuit-specification for each predicate ("is firmness score in range X to Y"), proving-time overhead of seconds to minutes per predicate, and verifier libraries that utility IT departments have not yet deployed. For the hackathon's one-year horizon, a signed bundle over a JCS-canonicalized projection is the pragmatic middle ground: you trust the applicant's signing key (verifiable by pinning), you trust the policy that produced the projection (versioned and hashed), and you verify with 30 lines of Python. A future version can replace specific predicates with ZK proofs where the adversary model demands it. The protocol version field exists precisely for that pivot.

**Q2. "How do you know a utility actually accepts this instead of demanding raw data?"**

> We don't, yet. That is the Dominion handshake — Bhawuk Luthra is at Dominion Energy and has read the shipping design. The formal review agenda is in `docs/design/signed-bundle.md` §9. Until that review happens, this is a credible prototype; after, it is either a validated design or a revised design. We are not claiming utility acceptance today.

**Q3. "What stops an applicant from lying in their private inputs?"**

> Three mechanisms compose (research-thesis §3.2). For fields the utility can cross-check against public records (parcel acreage, permit status), a planned Referee Skill would reject inconsistencies. For fields that can be measured against SCADA later (peak demand, diurnal profile), proper-scoring-rule elicitation creates a dominant-strategy calibrated report. For fields that remain unverifiable, we explicitly do not claim honesty — we claim non-amplification: the Interviewer refuses to coach the applicant toward strategic disclosure. Today the non-amplification mechanism is shipped; the cross-check and proper-scoring-rule pieces are named student specs.

**Q4. "What is new here? Data rooms exist. NDAs exist. Canonical JSON signing exists."**

> The composition is what is new, not any single piece. The specific contribution: a schema-level write-scope contract for LLM Skills, paired with a CI validator that refuses contract violations, with a mechanically-derived prompt-only baseline so we can measure what the packaging adds. Nobody in the adjacent literature has operationalized write-scope contracts as capability-at-the-validator-layer for LLM agents with the structural safety argument that implies.

**Q5. "What is the AI actually doing, if all the math is pure functions?"**

> The AI does three things a pure function cannot: it parses freeform applicant prose into structured fields (Interviewer), it fetches and cites public records from natural language (Cartographer), and it narrates the same projection in three different voices for applicant / utility / regulator (Explainer). The AI does not decide what to redact, what a firmness score should be, or whether a bundle verifies. Those are deterministic. The split matters because the projection function has proof-level guarantees (a canary verifies no private field ever reaches a utility projection); the agent has workflow-level guarantees (a validator rejects contract violations). Two different safety arguments for two different problems.

**Q6. "Your forecaster is deterministic and stylized. How does this generalize?"**

> The forecaster is replaceable. `forecast.ts` exports a pure function with a typed signature; a utility-calibrated ML model with the same signature drops in without touching projection, policy, or signing. What does not generalize without care is the specific thresholds and field classifications — those are policy decisions and each utility would bring their own. The protocol is designed for that: policy is versioned, hashed, and bound into the signed payload, so a bundle always carries the policy under which it was produced.

**Q7. "Why Tauri instead of Electron or a web app?"**

> Three reasons documented in `docs/plans/roadmap.md` §4. Binary size (~10 MB vs Electron's ~100 MB). Code-signing story across macOS, Windows, Linux for utility IT-department deployment. Rust core gives memory safety on the trust-critical signer path. The web app at `grid-passport.vercel.app` is a teaching artifact; the production form is the local binary.

**Q8. "How do you evaluate an agent that doesn't leak private fields?"**

> Three axes compose in `docs/evals/sim-bench-design.md` §8c. Direct matching (Presidio plus substring plus an AgentLeak-threshold LLM judge). Inferential lift (Staab et al. 2024 — a probe model tries to reconstruct sealed fields from public-plus-derived; we measure the lift over a Presidio-anonymized public-only baseline). Trace classification (a channel-weighted CI-violation classifier over every LLM call site). A single composite privacy score aggregates the three. The Prometheus-style judge (Kim et al. 2024) scores five qualitative dimensions against external-standard anchors (FERC Order 2023, SOC 2 TSC, NERC CMEP).

**Q9. "Your n=1 sample size — is any of this meaningful?"**

> Statistically, no. Pre-registered, yes. The pilot is the engine-validation step for a 455-run main sweep: it confirms the transports work, the scorers produce sensible ranges, the condition-to-condition differences are visible, and the budget estimates are realistic. The main sweep is a $400–1200 spend that we chose to defer before the demo surface was visible-to-users. It is scoped, not aspirational; once the demo loop is solid, the main sweep is the next budgeted spend.

**Q10. "Who owns the signing key? What happens if it is compromised?"**

> The applicant owns it. The key is stored in the OS keychain (macOS Keychain / Windows Credential Manager / Linux Secret Service) via the Rust `keyring` crate. The key never crosses the Tauri IPC boundary. In a compromise, the applicant re-generates the key and re-signs any in-flight bundles; utilities maintain a trusted-key pin list (SSH known-hosts model), so revocation is per-bundle via pinning, not global. A production deployment would layer HSM-backed signing — the architecture does not change.

**Q11. "Can an applicant just... not use your tool?"**

> Absolutely yes, and this is the correct incentive question. Grid Passport is not a mandate. Our pitch to an applicant: you get a local tool that tells you, before you file, what the utility will see and whether your site will be approved. That is a planning-productivity win independent of what the utility does with the bundle. Our pitch to a utility: you get structured, signature-backed filings instead of 40-page PDFs whose metadata you have to strip. Both sides should want to use this. If only one side wants to, the bundle is still readable by the other side through the canonical JSON; no lock-in.

**Q12. "What is the cross-domain HIPAA thing?"**

> Proof that the pattern transfers. The priorauth-Interviewer Skill is a shipping Skill for a HIPAA prior-authorization intake — same write-scope contract structure, same validator pattern, same substrate-metrics profile (−93.8% to −96.4% upfront savings, dense refusal clauses). The schema and the sources changed; the architecture did not. This is the research version of "our method generalizes" — we actually shipped the generalization as a second domain, not just argued for it.

**Q13. "How much of this works offline?"**

> The applicant app, end-to-end, if the applicant already has their case as a local file. `pnpm canary:desktop` includes an offline-capability guard. The utility app, end-to-end, always. The Interviewer Skill needs a local `claude` CLI to function; if the machine has no network, it fails closed (transportError to the UI). The Cartographer Skill is cache-only at demo time — fixture cache under `packages/eval-sim/fixtures/cartographer-cache/`.

**Q14. "What is the biggest risk to this project succeeding?"**

> Not acceptance, not technical debt, not compute cost. The biggest risk is that we identify a genuinely novel architectural pattern and then cannot show its relevance to a discipline (utility planning) that moves on decades-long timescales. Academic research on capability-based security, revelation-principle mechanism design, and agent-based simulation cites work from 1970 through last week; the utility sector cites FERC Order 2023. Translating between them is the bet. We think the HIPAA transfer is our best translation artifact.

**Q15. "How do we test the claim 'the schema is the safety case'?"**

> The schema-ablation study. Currently we have C (mechanically-derived prompt-only) competitive with D (Skill-based) on two of three scenarios, which is evidence that the schema is doing more work than the Skill packaging at n=1. Whether that holds at seed expansion, or whether D's advantage on S1 is replicable, is the central empirical question for the main sweep. An honest answer today is "pilot suggests the schema is load-bearing even without Skill packaging; we will know at main-run sample sizes whether the Skill layer adds material discipline."

---

## 6. What NOT to say

- **Do not say "structurally incapable" or "impossible to leak."** The validator-gated write-scope is defense-in-depth, not formal verification. The specific bound is "no contract-violating output reaches downstream state under the current validator"; we have not proved "no possible model output can bypass the validator under any input." Overclaiming this is the one thing that would sink the research framing.
- **Do not quote the OPR deltas without the n=1 caveat.** Every number comes with its sample size.
- **Do not claim utility acceptance.** Dominion has not reviewed. Bhawuk has read. Those are not the same thing.
- **Do not promise a cloud TEE.** The architecture supports one; we do not ship one today.
- **Do not say "Claude Agent SDK" when you mean "Claude Code subprocess."** The desktop apps shell out to the local `claude` CLI; they do not embed the Agent SDK as a library.

## 7. Backup slides (if someone gives you 15 minutes instead of 10)

- **B1. The privacy-canary structural invariant.** How `privacy:canary` works at build time, what it catches, why it is not a unit test.
- **B2. The substrate-metrics panel, live.** Open `packages/agents/metrics.md` and walk the Interviewer row: 4×never, 6×halt, 3×refuse, 11 validator-rejected violation classes.
- **B3. The pre-registration discipline.** Amendments A-1 through A-6 in `docs/evals/sim-bench-design.md` — how we lock prompts before running, how a post-hoc scorer change requires an amendment block.
- **B4. The three mechanisms for honest elicitation.** Non-amplification (shipped) + asymmetric cross-check (planned) + proper-scoring-rule elicitation (planned). Why each one targets a different subset of fields.

## 8. Leave-behind

One URL: `grid-passport.vercel.app/technical`. That page renders `docs/tech-overview.md` — 11 sections, ~15 min read, single source of truth for anyone who wants to go deeper than the talk went. If someone asks "where can I learn more" answer only with that URL.

Secondary link: the GitHub repo, when the private-to-public flip happens.

## 9. Rehearsal checklist

**48 hours before.** Open Claude Code in the repo root and paste the single "pre-flight" prompt from `docs/demo-casebook.md` — it runs all 15 gates, launches web + applicant + utility, and confirms the claude CLI is reachable. Then paste these follow-up prompts:

```
Confirm the full 10-minute talk arc is demo-able: walk me through
Case A (Owl sealed/released), Case G (efficiency delta), Case D
(two-binary handshake), and Case F (tamper reject). For each, tell
me what URL or window I need open and what I should click. Flag
anything that does not work end-to-end today.
```

```
Pre-load the owl-compute applicant prose onto my clipboard and
make sure a fresh signed bundle is available at ~/Desktop/
owl-compute.bundle.json as a fallback in case the live Interviewer
call is slow during the talk.
```

**24 hours before.** Rehearse demo 1 cold in under 3 minutes. Rehearse demo 2 cold in under 2 minutes. Keep a screenshot of the TrustPanel + signed bundle JSON on your clipboard as backup. Paste to Claude Code:

```
Run Case F (pnpm demo:bundle) one more time as my contingency
demo. This always works in 30 seconds and is my bail-out if a
live demo misfires. Confirm green.
```

**Day of.** During the live demo, if you want to narrate by driving the commands yourself for visual effect that is fine — but if anything gets wedged, paste to Claude Code: `"Something is wrong with the demo — [describe what you see]. Fix it or get me to a safe fallback."` Claude Code has full context from this doc and the casebook.

Two physical-checklist items that Claude Code cannot help with:

- Disconnect from wifi during demo 1 for 10 seconds to prove offline capability. Reconnect before demo 2.
- Keep the talk slide visible when the demo is running so the audience knows where you are.

If Q&A goes past 60 seconds on any single question, defer to the `/technical` page and move on.

---

## 10. The one thing judges should remember

If they remember one sentence from your talk, make it this one:

> We put the AI where elicitation belongs and the math where it always belonged — and we made the schema do the work of the safety case.

Everything else is in the repo.
