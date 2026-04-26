# Grid Passport — Demo Casebook

> Six carefully designed case studies, each mapped to a specific "killer moment" we want a hackathon judge to walk away remembering. Every case doubles as a **reproducible walkthrough** — student starts from a fresh clone, runs the listed commands, pastes the listed Claude Code prompts, and arrives at the same screen.

> Pair this doc with `docs/hackathon-presentation.md` (10-min talk plan) and `docs/plans/student-handoff.md` (30-min onboarding). This is the bench reference a demo operator keeps open in a second monitor during rehearsal.

---

## 0. The eight killer moments (strategic summary)

Ordered by "minimum time to 'oh'" — i.e., how fast a judge locks onto the point. Cases split into two classes: **mechanism-showing** (A–F, "see privacy and crypto in action") and **outcome-showing** (G–H, "see that the mechanism actually produces better planning outcomes").

| # | Moment | Case | Demo time | Class | What the judge actually sees |
|---|---|---|---|---|---|
| 1 | **Sealed / released toggle** | A (Owl) | 20 s | mechanism | Role toggle: 8 private fields disappear from utility view; 7 derived proofs remain. |
| 2 | **Two-binary handshake** | D (Owl + utility drop-in) | 45 s | mechanism | Applicant exports bundle to Desktop; utility app drops it in; verify + render. No server was involved. |
| 3 | **Tamper reject** | F (canary roundtrip) | 30 s | mechanism | `pnpm demo:bundle` — six steps, four verifications, two rejections, all green. |
| 4 | **Skill refuses contract violation** | Appendix 1 | 40 s | mechanism | `pnpm agents:validate` — seven self-tests run; three are *expected failures*; validator produces specific refusal reasons. |
| 5 | **Cross-domain transfer (HIPAA)** | E (priorauth) | 60 s | mechanism | Same pattern, different schema. Substrate-metrics panel shows four Skills across two domains. |
| 6 | **Efficiency delta — 3.7× fewer rounds** | G (ledger diff) | 75 s | **outcome** | Two pilot ledgers side by side: same Owl scenario, B condition takes 11 turns across 37 simulated days; D condition finishes in 7 turns across 10 days. Zero raw private fields leaked by D; B leaks on multiple turns. |
| 7 | **Outcome-preservation evidence** | H (/about §6b) | 90 s | **outcome** | `/about` §6b: OPR table showing D beats B on every scenario (Δ ∈ {+0.328, +0.047, +0.194}); S1 clears the pre-registered +0.20 threshold; D=0 privacy leakage across all three; cross-family judge spot-check preserves rank ordering. |
| 8 | **Honest limits reveal** | all | spoken | honesty | "Forecaster is a toy, TEE is simulated, n=1, Dominion hasn't signed off." |

Cases **A, D, F, G** form the 5-to-7-minute demo spine for the hackathon talk. **G is the one judges most want to see** because it answers "does this actually work?" — it just takes a little setup to land. Cases B, C, E, H are backup scenarios for longer audiences, skeptical judges, or if a primary demo misfires.

### What's a mechanism case and what's an outcome case

A mechanism case proves the system **does what it says** — policy seals fields, verifier rejects tampering, Skill refuses contract violations. These are existence proofs and they live or die on a single click. An outcome case proves the system **produces a better result** than the status quo — fewer email rounds, shorter turnaround, lower privacy leakage, outcome parity with an ideal baseline. Outcome cases live or die on numbers, and the numbers rest on the pre-registered eval harness.

Both classes are needed. A demo with only mechanism cases looks like a privacy gadget. A demo with only outcome cases looks like an unverifiable claim. Running them together makes the shape of the argument complete: *"here is the mechanism, here is what it achieves, and here is the gap between pilot evidence and replicable evidence — all visible, all honest."*

---

## Pre-flight — one Claude Code prompt (2 minutes)

Every case below assumes this state. Open a terminal in the repo root, start Claude Code (`claude`), and paste the single prompt below. Claude Code handles all the launching and reporting; you do not run commands yourself.

```
I am about to rehearse or run the Grid Passport demo. Please get the
environment ready:

1. Confirm node@22 is available at /usr/local/opt/node@22/bin and report
   the version. If missing, tell me exactly what to install.
2. Run all 15 canary gates with node@22 on PATH. Report green/red per gate.
   Do not continue if any gate fails — tell me which one and stop.
3. Launch the web dev server in the background (pnpm dev, port 3000).
4. Launch the applicant Tauri app in the background (pnpm desktop:dev,
   port 1420 Vite + 1421 IPC + native window).
5. Launch the utility Tauri app in the background (pnpm utility:dev,
   port 1430 + native window).
6. Confirm the claude CLI is on PATH (which claude && claude --version).
   This is needed for the Interviewer Skill runtime inside the applicant.
7. When all five surfaces are up, report the status as a single 5-row
   table: web / applicant Tauri / utility Tauri / claude CLI / gates.
8. Give me three URLs to check in a browser (/, /about, /technical) and
   confirm they load with HTTP 200.

Do not continue past any failed step without reporting it clearly.
```

**What you should see**: Claude Code will run commands, wait for ports to bind, and produce a clean 5-row status table. If anything is red, it will tell you specifically what to fix (e.g., "Node is 20.11, Vite 7 requires ≥20.19, run `brew install node@22`").

**Rehearsal check**: three browser tabs open (`localhost:3000`, `/about`, `/technical`) + two native Tauri windows visible on your desktop. If the status table has any reds, fix that first and do not start the demo.

---

## Case A — Owl Compute · "the sealed/released toggle"

**Killer moment**: #1 (sealed / released toggle).
**Demo time**: 3 minutes.
**When to use it**: this is the primary demo. Every talk opens with Owl.
**Why it's first**: the pain is the easiest to explain in one sentence ("this utility serves your competitors too"), and the visual payoff — private fields disappearing on role toggle — lands in ten seconds.

### The setup, in one sentence

> A hyperscaler is filing for 180 megawatts in Prince William County, Virginia. They need the utility to commit capacity, but the utility also serves their direct competitors. They cannot share their exact workload mix or schedule confidence without leaking competitive intelligence.

### The live demo, step by step

**Step 1. Open the public demo.**

Browser → `http://localhost:3000/demo/owl-compute`. Role toggle at top of the card.

> *"The applicant sees everything — their raw workload mix, their internal schedule confidence, their backup-generator plan. Eight private fields visible."*

**Step 2. Click the role toggle: Applicant → Utility.**

(It's a single click. Wait 200ms for the async projection.)

> *"Now watch. Same case, same data. We're toggling the role from applicant to utility. Eight private fields are sealed — but the derived proofs are still here. The utility sees the firmness score. They see the flexibility band. They see the public-evidence citations, each with a source URL. They do not see the premise."*

Point at the sealed-field count in the BenefitPanel. Point at `firmnessScore: 59` and `flexibilityPassport: 32–44 MW · 3–4h · class B` in the derived-proof section.

**Step 3. Click to Regulator.**

> *"The regulator sees exactly what the utility sees, plus the policy audit trail — five named actors, hash-chained. Same private fields sealed. The regulator does not have to trust the utility; they can verify the policy path."*

Scroll down to AuditTrail. Point at the `policyVersion` + `policyHash` prefix.

**Step 4. Counterfactual slider.**

Only visible in applicant role — toggle back to applicant. Slider is at the bottom of the page.

> *"The applicant can ask: what if my flexibility is 20 percent higher? The slider hits a live API that re-projects under the new number. The utility view recomputes but never sees the original. The applicant learns what they could commit; the utility never learns what the applicant was considering but didn't commit."*

Drag the slider from its default to the right. Watch the derived-proof numbers update in real-time.

**Step 5. The structural tell — `/about` §6 or `/technical` §5.**

> *"This isn't a demo trick. The privacy canary runs on every commit. It verifies no raw private field ever reaches non-applicant HTML, logs, traces, or analytics. The numbers you just saw are guaranteed by a structural invariant, not by us asking the model to be careful."*

### What to say about numbers (with the n=1 caveat baked in)

"In our pilot evaluation — an n-of-1 per cell across 12 cells — this scenario's outcome-preservation ratio beat the NDA-email baseline by +0.328, clearing our pre-registered +0.20 threshold. Pilot. Directional. Main sweep deferred. Details on `/about` section six."

### Expected observations (what the screen should actually show)

- Role toggle reacts in < 300 ms.
- BenefitPanel: `8 private sealed · 7 derived released · 0 raw leaks` across the entire session.
- Firmness score: `59` (quantized to nearest 5).
- Flexibility passport: `32–44 MW · 3–4 h · class B`.
- Site readiness: `green` (Owl is the clean case; Lantern is where yellow shows up).
- Counterfactual slider default: flex 20%. Drag to 40%: firmness should rise modestly, readiness stays green.
- Policy version in footer: `policy@0.1.0`.

### Student walkthrough — reproduce Case A via Claude Code

Open a terminal in the repo root and run `claude`. Paste this single prompt — Claude Code will install deps if needed, launch the web dev server, open the page in your browser, and produce the analysis:

```
Install dependencies if needed, then launch the web dev server at
http://localhost:3000 (pnpm dev) and open /demo/owl-compute in my
browser. Once it's up, read packages/core/src/fixtures.ts to find
the owl-compute case, then read packages/core/src/projection.ts
and packages/policy/grid-passport.rego. For each of the 8
privateProfile fields, tell me:
  (a) what the field is and its units,
  (b) why a utility would want it,
  (c) what derived proof in derivedProof takes its place in the
      utility view,
  (d) the policy clause that seals it.
Be concrete; cite file:line.
```

Expected return: 8-row table with concrete answers — this is the field-by-field mental model that grounds everything else.

---

## Case B — Lantern Cloud · "the problem the applicant didn't know how to disclose"

**Killer moment**: the tool surfaces a problem the applicant was too cautious to reveal. Different emotional register from Owl's "protect competitive intel" — Lantern is about helping the applicant.
**Demo time**: 2 minutes.
**When to use it**: if the talk runs long, or if a judge specifically asks about applicants who aren't hyperscalers. Also good for utility-side audiences — they recognize the archetype immediately.

### The setup, in one sentence

> A tier-2 cloud provider is filing for 95 MW in Loudoun County. They have unrecorded site control and a Tier-2 air permit still pending. They know these are problems; they don't know how to disclose them without either looking bad or getting rejected later.

### The live demo

**Step 1.** Browser → `http://localhost:3000/demo/lantern-cloud`. Applicant role.

**Step 2.** Point at `siteReadinessClass: yellow` at the top of the derived-proof panel.

> *"This isn't the applicant's over-the-top self-assessment. This is what a policy-bound projection says about their filing — yellow readiness. Below it: explicit blockers, named. 'Generator fleet permitting complexity.' 'Site plan maturity below threshold.' These aren't leaks — they are derived from the applicant's private profile through a pure function. The applicant learns what the utility will think before they file."*

**Step 3.** Toggle to utility role.

> *"The utility sees the same yellow-class readiness and the same blockers — because those are derived proofs, not raw fields. What they don't see: the underlying private values. They know there is a site-control issue. They don't know the specific lease terms. They know there is a permit delay. They don't know the DEQ case number."*

**Step 4.** Scroll to EvidencePanel / MapPanel.

> *"Every public-evidence citation has a source URL on a whitelist. The Cartographer Skill that populated this section refuses to write fields without a `sourceRef`. Refuses to cite URLs off the `SOURCES.md` whitelist. If a source doesn't have the answer, the field stays null rather than being invented."*

### What to say about numbers

"Lantern is the scenario where our pilot's outcome-preservation ratio was flat — +0.047 — not clearing threshold. Honest read: the problem-surfacing mechanism clearly works, but our substrate doesn't show statistically-separable advantage over a mechanically-derived prompt-only baseline on this scenario at n=1. Seed expansion is pending."

### Expected observations

- `siteReadinessClass: yellow` prominently in the derived-proof panel.
- Blockers list shows 2 items (generator permitting + site plan maturity).
- Utility projection still has `firmnessScore` but it's lower than Owl's.
- AuditTrail has a `redaction_reason: policy§2.1` stamped on the private-bucket rows.

### Student walkthrough

Open a terminal in the repo root and run `claude`. Paste this prompt:

```
Read packages/core/src/fixtures.ts for the lantern-cloud case. Find the
private-profile field that drives siteReadinessClass to "yellow" rather
than "green". Then read packages/core/src/forecast.ts to find the pure
function that maps that field to the class. Explain in 150 words: (a)
which field and its value, (b) the threshold in the pure function, (c)
why the utility cannot reverse-engineer the underlying field from the
"yellow" class alone. Cite file:line.
```

Expected return: the student gets the information-theoretic argument — why a discrete band preserves privacy even when the mapping is public.

---

## Case C — Kraken Train · "the structured commitment the applicant couldn't otherwise offer"

**Killer moment**: the applicant makes a credible commitment the utility can evaluate, without revealing the proprietary scheduling logic behind it.
**Demo time**: 2 minutes.
**When to use it**: if a judge asks about flexibility / demand response / the operational side of interconnection. Also the strongest case for a utility audience — this is the scenario Dominion's flex programs care about.

### The setup, in one sentence

> A 240 MW AI training campus in Fauquier County can defer 34% of its workload across regions. Their scheduler implements region-shifting proprietary to them. They want to commit aggressive demand response without revealing the scheduler architecture.

### The live demo

**Step 1.** Browser → `http://localhost:3000/demo/kraken-train`. Applicant role.

**Step 2.** Point at the flexibility-passport block.

> *"Applicant commits: 67 to 91 MW of flex, 3 to 4 hours duration, response class B. MOSAIC-aligned structure. This is a schema-bound commitment — the utility can read it, the regulator can verify it under policy, but neither sees how Kraken achieves it."*

**Step 3.** Toggle to utility.

> *"Utility sees the same flexibility passport. They can make capacity-commitment decisions against it. They don't see the `workloadMix: {training: 0.58, inference: 0.42}`. They don't see the scheduler-architecture fields. They see the commitment, not the premise."*

**Step 4.** Scroll to the TrustPanel (in the desktop app; open the applicant Tauri window if it isn't open).

> *"When the applicant runs this locally, the TrustPanel pins four structural guarantees: zero network calls during the session, inputs at their chosen path, eight private fields sealed, zero raw private fields released. These are live runtime state, not hardcoded."*

### What to say about numbers

"Kraken: OPR +0.194 — borderline at threshold, lowest Savage regret tied with the mechanically-derived prompt-only variant. What that tells us: on a scenario with a tight cohesive team and a small private-field footprint, our substrate's advantage shrinks. That's honest; that's expected; and it's a research signal, not a failure."

### Student walkthrough

Open a terminal in the repo root and run `claude`. Paste this prompt:

```
Read .claude/skills/interviewer/SKILL.md then find its write-scope
contract declaration. List every CaseInput subtree the Interviewer is
allowed to write to. List every subtree it must NOT write to. Find the
CI validator at packages/agents/interviewer/src/validator.ts and point
me at the code that enforces each of those constraints. Give me one
concrete example of an Interviewer output that would be rejected and
explain exactly which check rejects it.
```

Expected return: a student trace of the write-scope contract from the SKILL.md prose through the CI validator code paths. This is the research-thesis §3.4 object-capability-at-validator claim, made concrete.

---

## Case D — the two-binary handshake (combines with A, B, or C)

**Killer moment**: #2 (two-binary handshake).
**Demo time**: 2 minutes on top of any applicant-side demo.
**When to use it**: this is the demo payload that makes the local-first trust story *visceral*. Use right after Case A.

### Pre-flight

- Applicant Tauri window open at `localhost:1420`.
- Utility Tauri window open at `localhost:1430`.
- Desktop folder visible (you'll drop a file into it).

### The live demo

**Step 1.** In the applicant Tauri window, load the Owl case from a bundled fixture (click the Owl chip in the case-bar) OR intake prose via Interviewer (see Appendix 2 if you want to rehearse the live Interviewer flow).

**Step 2.** Click "export bundle" → save to Desktop as `owl-compute.bundle.json`.

> *"This file is what leaves the applicant's machine. Canonicalized with RFC 8785, signed with Ed25519, audit-chain included, policy hash bound into the payload. Anyone can verify it with 30 lines of Python."*

**Step 3.** Switch to the utility Tauri window. Drop the bundle file onto the drop-zone (or click "open" and pick it).

**Step 4.** Green verified card appears with keyId + bundleId + policyVersion + policyHash prefixes.

> *"The utility verifier just checked four things: signature, canonical form, audit chain, policy version. All four passed. Note: this utility app was never connected to the applicant app. No server. No network. The bundle crossed via filesystem; the trust is in the file."*

**Step 5.** Point at the utility projection card below. Point at the trust-claim card (lime-accented).

> *"Here's the utility-role projection — derived proofs, public evidence, sealed private count. Below it: four structural guarantees. No network calls. Narrow import set. Private-bucket boundary enforced by the import graph at compile time. KeyId pinning. The last one is verified by `pnpm canary:utility` on every commit."*

### The honesty beat

> *"To be honest: this flow works end-to-end in dev mode. For a production `.app` bundle launched via double-click, there is one small known fix — macOS strips the PATH for the `claude` subprocess the Interviewer needs, so a packaged applicant app currently can't run the Interviewer intake step until we extend the PATH. The utility app has no such dependency; it ships as a clean DMG today. Full details in `docs/plans/sprint-2026-04-20-brief.md` under Path C."*

### Student walkthrough

Open a terminal in the repo root and run `claude`. Paste this prompt:

```
Walk me through the end-to-end signing pipeline.

Start: apps/desktop/src/lib/bundle.ts — what gets serialized?
Then: apps/desktop/src-tauri/src/signer.rs — how is the canonical form
computed, and how is the signing key retrieved from the keychain?
Then: packages/verifier/src/verify.ts — what are the four checks the
utility runs on the incoming bundle?
Then: apps/utility/src/lib/bundle-loader.ts — how does the utility
window route the verified bundle into its UI state?

For each step, tell me the class of attack that step defends against,
and one concrete test in packages/core/src/audit.test.ts that exercises
the invariant.
```

Expected return: the student gets a top-to-bottom trace of the cryptographic surface, grounded in actual test coverage. This is the "you don't have to trust us, verify yourself" story told from the code.

---

## Case E — the HIPAA transfer (cross-domain bonus)

**Killer moment**: #5 (cross-domain transfer).
**Demo time**: 2 minutes.
**When to use it**: if the talk has five extra minutes, or if a research judge asks "does this generalize?" This is the shipping artifact that answers the question.

### The setup, in one sentence

> The same write-scope contract pattern, applied to a HIPAA prior-authorization workflow. Schema changed. Architecture didn't.

### The live demo

**Step 1.** Open the substrate-metrics panel: `packages/agents/metrics.md` in a text viewer. Or show the `/about` page §6a, or `/technical` §7.

> *"Four Skills. Two domains — electric-grid interconnection and HIPAA prior-authorization. Two contract axes — write-scope (Interviewer + Cartographer + priorauth-Interviewer) and read-scope (Explainer). Uniform −93.8% to −96.4% upfront context savings across all four versus mechanically-derived prompt-only baselines."*

**Step 2.** Open `.claude/skills/priorauth-interviewer/SKILL.md` alongside `.claude/skills/interviewer/SKILL.md` in a diff view.

> *"Same frontmatter shape. Same write-scope declaration structure. Same refusal clause density. Different schema, different field names, different source-URL whitelist — but the architectural pattern is identical."*

**Step 3.** Run the validator self-test for priorauth. Paste to Claude Code:

```
Run pnpm --filter @grid-passport/agents validate and show me the
output. For priorauth-interviewer specifically, report the pass /
refuse count and name any contract-violation self-test that was
refused along with its reason.
```

> *"Seven self-tests per Skill. Three are expected positives. Four are expected failures — contract violations that the validator must refuse. If any of the expected failures succeed, CI fails and the Skill doesn't ship."*

### What to say about the research claim

"The HIPAA Skill ships as proof that the pattern transfers. Not a thought experiment. An actual running Skill with its own validator, its own baseline, its own substrate-metrics row. If the grid story falls apart under scrutiny, the HIPAA story is independent evidence the approach generalizes."

### Student walkthrough

Open a terminal in the repo root and run `claude`. Paste this prompt:

```
Compare .claude/skills/interviewer/SKILL.md with
.claude/skills/priorauth-interviewer/SKILL.md. For each of these
architectural elements, tell me which is identical across the two
Skills, and which was adapted to the new domain:

  - frontmatter shape (name / description / when_to_use)
  - write-scope declaration
  - anti-adversary rule
  - workflow structure
  - trust-constraint checklist
  - bundled references
  - canonical examples

Then read packages/agents/priorauth-interviewer/src/validator.ts and
compare with packages/agents/interviewer/src/validator.ts. Is the CI
validator a copy, a generalization, or a rewrite? Cite concretely.
```

Expected return: a point-by-point comparison showing which parts of the pattern are truly domain-neutral (the architecture) and which parts are schema-specific (the field names, the source whitelist). This is the research generalization claim, operationalized.

---

## Case F — tamper reject (30-second contingency demo)

**Killer moment**: #3 (tamper reject).
**Demo time**: 30 seconds.
**When to use it**: always have it in your back pocket. If any other demo misfires, pivot to this — it is fully scripted, always works, and carries weight independent of the rest of the demo. Great closer.

### The live demo

Paste this to Claude Code:

```
Run pnpm demo:bundle from the repo root. Show me the full output.
Confirm all six steps reported the expected outcomes (3 passes,
2 rejections, 1 tamper step). If any step deviated, flag it — this
is the canary for three-way cryptographic parity across TS, Rust,
and Python.
```

Claude Code runs the script and reports the six-step output.

### What to say while it runs

> *"Sixty seconds. Six steps. TypeScript signer emits a fresh bundle. TypeScript verifier confirms: pass. Python reference verifier — an independent 30-line implementation of the same protocol — confirms: pass. Now we flip one byte of the payload. TypeScript verifier: reject, with a specific reason. Python verifier: reject, with the same specific reason. Three-way parity — TypeScript, Rust, Python — on every commit."*

### Expected screen output (verbatim pattern)

```
=== Grid Passport signed-bundle roundtrip demo ===
    out dir: /tmp/gp-demo-bundle
    case:    owl-compute

--- 1. TS signer emits fixture ---
[green check mark, bundle written]

--- 2. TS verifier checks bundle (expect PASS) ---
[green PASS]

--- 3. Python verifier checks bundle (expect PASS) ---
[green PASS]

--- 4. Flip one byte in payload ---
  flipped caseId -> TAMPERED

--- 5. TS verifier rejects (expect FAIL) ---
[red FAIL with specific rejection reason]

--- 6. Python verifier rejects (expect FAIL) ---
[red FAIL with specific rejection reason]

✓ all six checks reported expected outcomes
```

### Student walkthrough

Open a terminal in the repo root and run `claude`. Paste this prompt:

```
Read scripts/demo-bundle-roundtrip.sh. For each of the six steps,
tell me:
  (1) what specific invariant is being tested
  (2) what class of attack that invariant defends against
  (3) which line of packages/verifier/src/verify.ts implements the
      check that would catch that attack
  (4) which test in packages/verifier/tests/ exercises that check
Don't skip any step.
```

Expected return: the student gets a six-row mapping from demo step → invariant → attack → implementation → test. The tamper-reject demo stops being magic.

---

## Case G — Efficiency Delta · "37 days to 10, 11 turns to 7, and zero leakage"

**Killer moment**: #6 (efficiency delta).
**Demo time**: 75 seconds.
**When to use it**: right after Case A. This is the **"does it actually work"** case — the one judges ask about most. Two committed pilot ledgers, same scenario, different substrate, visible delta in turns / simulated days / privacy-leakage count.

### The setup, in one sentence

> Same Owl Compute scenario, same random seed. NDA-email baseline (condition B) versus Grid Passport Skill-based substrate (condition D). We ran both, committed both transcripts, and you can re-verify the numbers yourself.

### Pre-flight — one Claude Code prompt

```
Confirm packages/eval-sim/results/pilot/transcripts/S1_B_seed00.json
and S1_D_seed00.json both exist and read the aggregate manifest at
packages/eval-sim/results/pilot/manifest.json. Report the turns and
final_simulated_day for the S1, S2, S3 × B, D cells as a 6-row table.
Expected: S1_B = 11 turns / 37 days, S1_D = 7 turns / 10 days; similar
shape on S2; S3_B is shorter (6 turns) because Kraken's low-friction
archetype skips the meeting protocol. Do not run any live eval — all
numbers come from committed ledgers.
```

### The live demo

**Step 1 — show the delta one line.**

Open `docs/evals/sim-bench-results.md` in a text viewer and point at the §8b rounds/days table.

> *"Same Owl scenario. NDA-email baseline took 11 turns across 37 simulated days. Our substrate finished in 7 turns across 10 days. That is roughly three-point-seven times fewer rounds and three-point-five times fewer days. Pre-registered §9.1 threshold `Rounds(D) ≤ 0.5 × Rounds(B)`: hit on all three scenarios."*

**Step 2 — show the privacy delta.**

For rehearsal, paste this to Claude Code:

```
Read packages/eval-sim/results/pilot/summary.md and the three
per-scenario D-condition score files under
packages/eval-sim/results/pilot/scores/S[1-3]_D_seed00.json. Report
the H-null privacy-leakage count per scenario for D, and the same
for B from scores/S[1-3]_B_seed00.json. Expected: D=0 across all
three scenarios; B is nonzero on multiple turns, consistent with
pre-registered email-baseline design.
```

Then narrate:

> *"Same ledger pair. H-null privacy leakage — raw private-profile value appearing in a cross-org turn. Condition B: leakage on multiple turns, consistent with the pre-registered design of the email baseline. Condition D: zero. Across all three scenarios, D holds H-null equal to zero. Cross-family judge spot-check preserves the rank ordering."*

**Step 3 — the honest limits beat (30 seconds).**

> *"These are n-of-1 per cell. We ran this pilot once to confirm the engine works, and we deferred the 455-run main sweep for budget reasons. What this means: the effect on S1 — where the OPR delta is plus-zero-point-three-two-eight and clears our pre-registered threshold — is directionally clean but not replicable yet. S2 is flat. S3 is borderline. We are publishing what we measured, not what we hoped. Seed expansion is path A in the student handoff."*

### Expected observations

From the manifest (exact numbers):

| scenario | B turns | B days | D turns | D days | Δ turns | Δ days |
|---|---|---|---|---|---|---|
| S1 Owl | 11 | 37.0 | 7 | 10.0 | −4 | −27 |
| S2 Lantern | 11 | 37.0 | 7 | 10.0 | −4 | −27 |
| S3 Kraken | 6 | 27.0 | 7 | 10.0 | +1 | −17 |

S3 is the honest anomaly: B is shorter (6 turns) because Kraken's low-friction archetype resolves in-thread without §6a's meeting protocol firing. D is one turn longer than B there — but still 17 simulated days faster. This is documented in `sim-bench-results.md` §6a and is §6a-consistent behavior, not a defect.

### Student walkthrough — reproduce Case G from committed data

Open a terminal in the repo root and run `claude`. Paste this prompt — it does not spend any SDK budget because everything reads from committed ledgers:

```
Read packages/eval-sim/results/pilot/manifest.json. For scenarios S1,
S2, S3, extract a comparison table showing: (turns_B, day_B, turns_D,
day_D, delta_turns, delta_days). Then read
packages/eval-sim/results/pilot/transcripts/S1_B_seed00.json and
packages/eval-sim/results/pilot/transcripts/S1_D_seed00.json. For each
ledger, count cross-org turns (APPLICANT_CH → UTILITY_* or REGULATOR_*)
and identify which turns contain any raw-value disclosure of S1's
private-token-set (the set is defined in
packages/eval-sim/eval_sim/scenarios/s1_owl.py — its `private_token_set`
field). Report: per-ledger turn count, per-ledger raw-disclosure turn
count, and which specific tokens leaked in which turn in the B ledger.
```

Expected return: the student reconstructs the §8b H-null measurement by hand from the committed ledgers, confirming no numbers were fudged. This is the single-most-compelling skeptic-response prompt in the repo.

### If asked "does this pattern hold in production?"

Honest answer: "Pilot. n=1 per cell. The main sweep replaces every number on this slide with a bootstrap confidence interval. We did not run it because the budget is $400–1200 SDK and we chose to close the demo loop first. The scripts and the matrix are ready; anyone with the budget can re-run it."

---

## Case H — Pilot Evidence Panel · "the /about §6b beat"

**Killer moment**: #7 (outcome-preservation evidence).
**Demo time**: 90 seconds.
**When to use it**: when a judge asks for the research story. This is the evidence walkthrough — same material as Talk Slide 9, but as a guided scroll through `/about` §6b that lets the judge read the tables themselves rather than trust your summary.

### Pre-flight

- Web dev server running (`pnpm dev` → port 3000).
- A browser tab on `http://localhost:3000/about` already scrolled to §6.

### The live demo

**Step 1 — §6b opener.**

> *"This is the research evidence. Pre-registered. Scored. Committed. The section title says n-of-1 pilot; the paragraph underneath lists what is deferred and what this cell of twelve is for."*

**Step 2 — OPR table walkthrough.**

Point at the §8b OPR table.

> *"Outcome-Preservation Ratio — how close a condition gets to the Oracle upper bound across five outcome dimensions. S1 Owl: our substrate clears the pre-registered +0.20 threshold against the email baseline by +0.328. S2 Lantern: +0.047, flat. S3 Kraken: +0.194, borderline. D holds H-null equal zero across all three scenarios."*

**Step 3 — the honest C-vs-D caveat.**

> *"The honest finding: C — the mechanically-derived prompt-only baseline — is competitive with D on S2 and S3. This is the intended structure of the `fair comparison` methodology. We engineered C to not be a strawman. At n-of-1, we cannot reliably separate the Skill packaging from the schema packaging on those two scenarios. That separation is what the main sweep would produce."*

**Step 4 — cross-family judge caveat.**

Point at the P0.3 spot-check summary below the OPR tables.

> *"Opus-as-judge might overstate the absolute Likert scores by about half a point — we spot-checked this by re-judging three cells with a different-family model, Claude Sonnet. Sonnet never scores above Opus; no disagreement above one Likert point across fifteen dimension-judgments. Rank ordering preserved. Our bias estimate is: direction preserved, magnitude soft by about 0.5."*

**Step 5 — where to dig deeper.**

> *"Section-eight-b on this page has the full numerical details. `docs/evals/sim-bench-design.md` is the pre-registration document with RFC-2119 locked prompts. Every scoring function has an amendment discipline: post-hoc changes fail CI unless they come with an amendment block. The design is more locked down than the engine is."*

### Expected observations

The on-page numbers should match (they're rendered from `docs/story.md` §6b at build time, which itself is the single-source-of-truth for what goes on the talk slide):

| assertion | where to verify | expected |
|---|---|---|
| S1 OPR Δ = +0.328 | `/about` §6b table; also `sim-bench-results.md` §8b | clears +0.20 threshold |
| S2 OPR Δ = +0.047 | same | flat |
| S3 OPR Δ = +0.194 | same | borderline |
| H-null D = 0, all scenarios | `/about` §6b H-null line | ✓ |
| Sonnet cross-family spot-check | `/about` §6b footer; `pilot/spot_check_sonnet/summary.json` | no disagreement > 1 Likert |
| Rank ordering D > B preserved | same | ✓ |

### Student walkthrough — reproduce the numbers on /about §6b from raw data

Open a terminal in the repo root and run `claude`. Paste this prompt:

```
Read docs/story.md section 6b (where the /about page pulls its OPR
numbers from). For each number cited in the text, find the source
in packages/eval-sim/results/pilot/scores/ or
packages/eval-sim/results/pilot/summary.json, and verify the citation.
Report a table with columns: (claimed number in story.md, source file,
raw value found, match?). Flag any discrepancy.

Then read docs/evals/sim-bench-design.md §9.1 for the pre-registered
thresholds. For each scenario, note whether the OPR delta in the
current results clears, is flat against, or falls below the threshold.
Report consistent with how sim-bench-results.md §8b already describes
it; flag if not.
```

Expected return: the student independently verifies the numbers on the public-facing page trace back to pre-registered thresholds and committed scorer output. The "we're not fudging numbers" claim becomes checkable.

### If asked "how do these numbers hold up against the eval bench state-of-the-art?"

Honest answer: "Our privacy scoring composes established work — Presidio for direct matching, Staab-et-al-2024 for inferential probing, a channel-weighted contextual-integrity classifier for trace scoring. The Prometheus-style judge is Kim-et-al-2024's rubric design grounded against external standards — FERC Order 2023, SOC 2 Trust Services Criteria, NERC Compliance Monitoring. The Concordia multi-agent substrate is Google DeepMind's framework. Most of what's novel is the composition and the `fair baseline` methodology — we engineered C to compete."

---

## Appendix 1 — the Skill validator self-test (40-second demo moment)

**Killer moment**: #4 (Skill refuses contract violation).

Paste to Claude Code at any point in the talk, especially right before transitioning into the research framing:

```
Run pnpm agents:validate from the repo root. Report the pass/fail
counts per Skill (interviewer, cartographer, explainer,
priorauth-interviewer) and surface any contract-violation self-test
that was refused — include the specific refusal reason. This is the
research-thesis §3.4 object-capability-at-validator-layer mechanism
demonstrated live.
```

### What to say

> *"Every shipping Skill has a paired CI validator. The validator is the write-scope contract enforcement point. Seven self-tests per Skill — three expected positives, four expected contract violations. Expected positives must pass; expected violations must be refused for specific, listed reasons. If any expected violation is silently accepted, CI fails and the Skill doesn't ship. This is the `capability at the validator layer` mechanism we claim in the research thesis."*

### What a judge asks and what you answer

**Q**: "Couldn't a sufficiently clever prompt bypass the validator?"

**A**: "The validator is a pure TypeScript function over the Skill's output. It cannot be prompted. The only way 'around' it is for a model to produce an output that is structurally valid but semantically misleading — and we measure that separately, on the sim-bench's privacy axes. The validator gates structure; the evaluation measures semantics. Two different safety arguments for two different layers."

---

## Appendix 2 — live Interviewer intake (optional extension to Case A)

**When to use**: if the talk has two extra minutes and you want to show the AI Skill actually running in real-time. Higher risk — depends on the local `claude` CLI being on PATH and authenticated. Have the fallback (a pre-loaded fixture) ready.

### The live demo

In the applicant Tauri window, click into the IntakePanel textarea.

Paste this exact prose:

```
We're planning an AI training site in Prince William County,
Virginia. Target load is about 180 megawatts. The workload mix is
roughly 60 percent training and 40 percent inference, though that
shifts week to week. Our internal scheduler confidence is around
0.62 for the p50 case, 0.48 for p90. Class B response for flex
purposes. Two 10-MW diesel backup generators on-site. Target COD
is late Q4 2028.
```

Click "ask interviewer".

### What to say while it runs

> *"The applicant typed prose. The Interviewer Skill — running as a subprocess of my local Claude Code session, inheriting the auth, no API key visible in the app — parses the prose into a structured `CaseInput`. Before any state write, the CaseInput passes through the CI validator. If the Skill tried to populate `derivedProof` or `publicEvidence` — sections it is not allowed to write — the validator would refuse. You'll see in a moment the IntakePanel either shows a green `CaseInput accepted` card or an amber `clarify` card where the Skill asked a follow-up question."*

### Expected outcomes (several are valid)

- **Green card**: structured CaseInput populated. `privateProfile.loadMW: 180`, `internalScheduleConfidence.p50: 0.62`, etc. Click "accept" to load into the main review view.
- **Amber card**: Skill asked a clarifying question. Common: "target COD — please provide ISO 8601 date instead of `late Q4 2028`." Answer in the textarea and resubmit.
- **Rose card (validator rejection)**: the Skill produced output that violates contract. Rare but possible; this is the validator doing its job. Point it out and move on.
- **Gray card (transport error)**: `claude` CLI not on PATH or not authenticated. In that case, abort and fall back to loading the Owl fixture from the case-bar.

### The honesty beat

> *"First call is slow — ~70 seconds — because the Skill source is about 28 KB and Sonnet hasn't cached it yet. Subsequent calls ride the prompt cache and take about 10 seconds. If the live call fails, I have a pre-loaded Owl fixture ready; nothing about the demo rests on the intake step working in real-time."*

### Student walkthrough

Open a terminal in the repo root and run `claude`. Paste this prompt:

```
Walk me through the Interviewer runtime path. Starting from
apps/desktop/src/components/IntakePanel.tsx's onSubmit handler:

  1. Which transport class does it call?
  2. Where is that transport implemented?
  3. What Rust-side Tauri command does it eventually invoke?
  4. What shell command does that Rust command spawn, with what flags?
  5. Which CI validator runs on the output before state write?
  6. What happens if the output violates contract? Cite the specific
     error class.

Show me the code path end to end; cite file:line for each step.
```

Expected return: a six-step trace across the TS / Rust / shell boundary, with the validator-refusal class named. This is the Skill runtime, demystified.

---

## Appendix 3 — emergency recovery card

If anything goes wrong on demo day, paste one of these to Claude Code — it will diagnose and fix.

**Tauri app window won't open / ports stuck.**

```
Ports 1420, 1430, or 3000 seem stuck. Free them and relaunch the
web, applicant, and utility dev servers with node@22 on PATH. Report
when all three surfaces are listening again.
```

**"skills not loaded" in the IntakePanel.**

```
The applicant IntakePanel shows "skills not loaded." Verify
apps/desktop/src-tauri/capabilities/default.json includes both
fs:allow-read-dir and fs:allow-exists. If missing, add them and
relaunch the applicant Tauri app.
```

**"transport error" when clicking "ask interviewer".**

```
The IntakePanel returned a transport error. Confirm the claude CLI
is on PATH and authenticated. If not, fall back to loading the Owl
fixture from the case-bar — Case A works fully with the fixture
and does not need the live Interviewer.
```

**Web demo shows stale content / won't hot-reload.** Hard refresh (⌘⇧R). If that fails, paste:

```
The web demo at localhost:3000 is serving stale content. Kill port
3000 and restart pnpm dev. Report when it's live again.
```

**`pnpm demo:bundle` fails on step 3 (Python).**

```
The Python reference verifier step of pnpm demo:bundle failed.
Check python3 --version; Python 3.12+ is required. If the right
version is missing, skip step 3's narration — steps 1, 2, 4, 5
still make the tamper-reject point.
```

**A judge asks about eval numbers you don't have handy.** Do not improvise. Redirect to `/technical` section eight or `docs/evals/sim-bench-results.md` §8b. If you want, paste the specific question to Claude Code and it will pull the number from committed files.

**A judge asks "is this production-ready?"** Honest answer: "No. It is a credible prototype with a defensible architectural claim. Production readiness requires Dominion (or an equivalent utility) to review the utility-side spec; that review is scheduled but has not happened. We are on the record about what is and is not proven."

---

## Appendix 4 — the student "first 30 minutes" tour (pure Claude Code)

If you are a student using this doc to onboard, here is the linear exercise. Open a terminal in the repo root and run `claude`. Paste each prompt below, in order. Claude Code handles every command, every launch, every file read; you do not run anything yourself. Budget 30 minutes.

### Prompt 1 — get the environment up

```
I'm going to walk through the eight killer moments in
docs/demo-casebook.md. First: use node@22 on PATH, run all 15
canary gates, launch the web dev server (port 3000), launch the
applicant Tauri app (port 1420), launch the utility Tauri app
(port 1430), and confirm the claude CLI is reachable. Report
status as a 5-row table. Stop if anything is red.
```

### Prompt 2 — moment #3 (tamper reject)

```
Run pnpm demo:bundle and show me the output. For each of the six
steps, tell me in one sentence what invariant it tests and what
class of attack it catches. Reference scripts/demo-bundle-roundtrip.sh
for the exact step list.
```

### Prompt 3 — moment #4 (Skill refuses contract violation)

```
Run pnpm agents:validate. For each Skill (interviewer, cartographer,
explainer, priorauth-interviewer), report: how many positive
self-tests passed, how many contract-violation self-tests were
refused, and what was the reason each refusal. Point me at the
validator source for one of them so I can see the refusal code.
```

### Prompt 4 — moment #1 (sealed/released toggle)

```
Open my browser to http://localhost:3000/demo/owl-compute. Then
read packages/core/src/fixtures.ts for the owl-compute case and
packages/core/src/projection.ts for projectForRole. Tell me exactly
which 8 private fields disappear when I toggle role from applicant
to utility, and which 7 derived proofs remain visible to both.
Cite policy clauses from packages/policy/grid-passport.rego where
relevant.
```

Then open the browser tab and actually toggle the role — confirm Claude Code's list matches what you see on screen.

### Prompt 5 — moment #2 (two-binary handshake)

```
Walk me through the signed-bundle handshake end-to-end. Starting
from apps/desktop/src/lib/bundle.ts (what gets serialized), through
apps/desktop/src-tauri/src/signer.rs (canonicalization + Ed25519),
to packages/verifier/src/verify.ts (the four checks), to
apps/utility/src/lib/bundle-loader.ts (how the verified bundle
routes into the utility UI). For each step, tell me the class of
attack it defends against. I want to understand this well enough
to narrate a judge through it.
```

Open the applicant Tauri window, load the Owl case, click "export bundle" to Desktop, then drag it onto the utility Tauri window. Watch it verify and render.

### Prompt 6 — moment #5 (cross-domain transfer)

```
Compare .claude/skills/interviewer/SKILL.md with
.claude/skills/priorauth-interviewer/SKILL.md. Which architectural
elements are identical across the two Skills, and which were adapted
to the new domain? Then show me packages/agents/metrics.md — the
substrate-metrics panel — and explain what "4 Skills × 2 domains ×
2 contract axes" means in concrete terms.
```

### Prompt 7 — moment #6 (efficiency delta)

```
From packages/eval-sim/results/pilot/manifest.json, produce a 6-row
comparison table for scenarios S1/S2/S3 × conditions B/D with
columns (turns_B, day_B, turns_D, day_D, Δ_turns, Δ_days). Then
quote the exact paragraph in docs/evals/sim-bench-results.md §8b
that describes the rounds/days multiplier. Flag the S3 anomaly
where B is shorter than on S1/S2 and explain why — it is not a
defect, it is §6a-consistent behavior.
```

### Prompt 8 — moment #7 (outcome-preservation evidence)

```
Open http://localhost:3000/about in my browser and find §6 (the
empirical-results section that renders from docs/story.md §6b).
Verify each number in the on-page OPR table by tracing it back to
the corresponding file under packages/eval-sim/results/pilot/scores/
or packages/eval-sim/results/pilot/summary.json. Report any number
that does not trace cleanly. Also locate the cross-family judge
spot-check caveat and tell me what it says about Opus-as-judge
bias.
```

### Prompt 9 — moment #8 (honest limits)

```
Read docs/tech-overview.md section 9 and summarize in 200 words the
five honest limits of this project, in Ming's voice. For each limit,
tell me (a) what specifically is not proven, (b) what specific
experiment or review would prove it, (c) which student path or
sprint-brief item would unblock it. I want to rehearse saying these
out loud without sounding like I'm hedging.
```

### When you finish

You have watched all eight killer moments, traced each one back to the source, and heard the honest-limits story. You now know the project at "can-support-a-judge-question" depth. If you want to go deeper on any one layer, the per-case student walkthroughs in Cases A–H above are the next stop — but you do not need them to be useful at the hackathon.

---

## Cross-references

- 10-minute talk plan: `docs/hackathon-presentation.md`
- 30-minute onboarding: `docs/plans/student-handoff.md`
- Architecture + privacy mechanism: `docs/tech-overview.md`
- Research thesis: `docs/design/research-thesis.md`
- Signed-bundle protocol rationale: `docs/design/signed-bundle.md`
- Signed-bundle protocol normative spec: `docs/design/signed-bundle-spec.md`
- Eval harness design: `docs/evals/sim-bench-design.md`
- Eval results: `docs/evals/sim-bench-results.md`
- Sprint-close master brief: `docs/plans/sprint-2026-04-20-brief.md`

## Update contract

When any scenario's numbers or expected observations change:
- Update the "Expected observations" subsection of that case.
- Check `docs/hackathon-presentation.md` §5 Q&A if the number is cited there.
- Re-run `pnpm privacy:canary` and confirm the numbers you cite match what the canary reports.

When a new Skill ships:
- Add a case for it if it carries a distinct killer moment; otherwise add it to Appendix 1's validator-demo.
- Update the substrate-metrics reference in Case E.
