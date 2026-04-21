# Student handoff — hackathon-ready, nothing more

> What this doc is for: help the Grid Passport team understand what Ming built and make sure the hackathon presentation lands. This is **not** a research to-do list and **not** a development backlog. The scope is three things: absorb, rehearse, polish.
>
> You will not run commands. You will not edit code. You will paste prompts into Claude Code; Claude Code reads the repo on your behalf and explains in context. By the time you reach the end of this doc, you will know the project cold and be able to answer a judge's question without flinching.

---

## The simplest possible workflow

1. Open a terminal in the repo root:
   ```bash
   cd /Users/jinming/Dropbox/CodingProjects/grid-passport
   claude
   ```
2. Paste the seven learning prompts below, **one at a time, in order**. Read Claude's answer. Ask follow-ups if anything is unclear.
3. When you have gone through all seven, read the two shorter sections at the end of this doc — the story in one paragraph, and the eight killer moments.
4. You are now ready to support the hackathon presentation.

That's it.

---

## Seven learning prompts

Paste each prompt as a single message. Each one is self-contained; Claude Code does not need prior context to answer.

### Prompt 1 — orient in 60 seconds

```
Read docs/tech-overview.md sections 1 and 2. Summarize in 150 words:
(a) what problem Grid Passport solves,
(b) why existing practice (NDAs, redacted PDFs, data rooms) is not enough,
(c) what Grid Passport actually is as a product (local app? web? protocol?).
Use plain English — no jargon. Pretend you are explaining it to a
smart friend who has never heard of interconnection queues.
```

What you should walk away with: a 30-second pitch of the project you can deliver to a judge before the demo even starts.

### Prompt 2 — the four design decisions

```
Read docs/tech-overview.md section 3. For each of the four
architectural decisions (local-first, policy-governed disclosure,
pure functions for the math, AI Skills at the schema boundary),
explain in 2–3 sentences: what the decision is, what would have
been easier or more conventional, and why Ming chose otherwise.
Cite the specific reject-alternative reasoning from the doc.
```

What you should walk away with: the ability to explain any design choice as an intentional trade-off — the exact framing a judge wants to hear.

### Prompt 3 — how privacy actually works

```
Read docs/tech-overview.md section 5 (the end-to-end walkthrough of
a private field — "internal schedule confidence" — from applicant
intake to utility screen). Re-tell the same 10-step story but
shorter (200 words), in first person from the applicant's point of
view: "I type... I click... the app shows me... I export..."
At each step, point out where a raw private value could have leaked
and what stopped it.
```

What you should walk away with: the privacy story you can narrate during the live demo, with the right beats at the right moments.

### Prompt 4 — the signed-bundle handshake

```
Read docs/tech-overview.md section 6, then open
scripts/demo-bundle-roundtrip.sh and explain each of its six steps.
For each step, tell me:
(a) what the step does,
(b) what class of attack it defends against (tamper? substitution?
policy-hash forgery?),
(c) why "you don't have to trust us" is true after this step runs.
Keep each step under 3 sentences.
```

What you should walk away with: a 60-second explanation of the cryptographic handshake that a judge from outside security can follow.

### Prompt 5 — where AI lives and where it does not

```
Read docs/tech-overview.md section 7. List the four shipping Skills
and for each, answer: what does this Skill do, what can it write,
what can it read, and what would the CI validator refuse? Then
contrast: which parts of the system are deliberately NOT AI
(projection, forecast, audit, signing) and why is that split the
research contribution?
```

What you should walk away with: a clean mental model for "the agents propose, the pure functions dispose" — the research framing of the project.

### Prompt 6 — does it actually work?

```
Read docs/tech-overview.md section 8 (evaluation) and
docs/evals/sim-bench-results.md section 8b (the OPR tables).
Summarize in 200 words: what did the pilot measure, what are the
three headline numbers (S1, S2, S3 OPR deltas), which of them
clears the pre-registered threshold, and what is still deferred.
Be honest about n=1. At the end, give me one sentence I can say
to a judge who asks "is this replicable?"
```

What you should walk away with: the exact words to use when a judge asks about evidence — words that are honest, specific, and do not overclaim.

### Prompt 7 — the demo plan

```
Read docs/demo-casebook.md sections 0 (the eight killer moments)
and docs/hackathon-presentation.md section 1 (the 10-minute time
budget). Walk me through what the audience sees minute-by-minute
during the talk. At each beat, name the specific case (A, B, C,
D, E, F, G, or H) that produces it and the specific doc page
section that justifies the number being spoken.
```

What you should walk away with: a mental movie of the 10-minute talk you can replay in your head on the drive to the venue.

---

## The story in one paragraph

Once you have absorbed the seven prompts above, everything collapses to one paragraph you should be able to recite from memory:

> Large-load electric interconnection is stalled because information cannot flow between applicants, utilities, and regulators without leaking what each side is contractually obligated to protect. Grid Passport is a local-first desktop application that keeps private fields on the applicant's machine, runs a policy-bound projection in pure functions that no model can overwrite, and emits a cryptographically signed disclosure bundle that a utility verifies locally with thirty lines of code. AI Skills handle elicitation, evidence fetching, and role-conditioned narration — never the safety-critical math. The schema is the safety case: a field's classification is a typed constraint that the projection layer, the privacy canary, and the Skill validators all check independently. Pilot evidence at n=1 per cell across three scenarios shows the substrate produces 3.7× fewer negotiation rounds and zero raw private-field leakage versus an NDA-email baseline, with an outcome-preservation ratio that clears the pre-registered +0.20 threshold on one scenario and is directional on two more. The main sweep is budgeted but deferred. A HIPAA prior-authorization Skill ships as independent evidence that the pattern transfers.

If you can say that — in your own words, without notes — you are ready.

---

## The eight killer moments you want a judge to remember

These are from `docs/demo-casebook.md` section 0. Read that section once. Make sure you can name all eight in order and say, for each, what specifically the judge sees on the screen.

1. **Sealed / released toggle** — Case A. Role toggle on `/demo/owl-compute`; 8 private fields disappear, 7 derived proofs remain.
2. **Two-binary handshake** — Case D. Export from applicant Tauri app, drop into utility Tauri app, verify, render. No server.
3. **Tamper reject** — Case F. `pnpm demo:bundle` runs six steps; two independent verifiers slam shut on a single flipped byte.
4. **Skill refuses contract violation** — Appendix 1. `pnpm agents:validate` runs seven self-tests per Skill; four are expected refusals.
5. **Cross-domain transfer** — Case E. Same pattern, HIPAA schema. Substrate-metrics panel shows four Skills across two domains.
6. **Efficiency delta** — Case G. Same Owl scenario: 11 turns over 37 days on email baseline; 7 turns over 10 days on our substrate.
7. **Outcome-preservation evidence** — Case H. `/about` §6b table: +0.328 on S1 clears the pre-registered +0.20 threshold.
8. **Honest limits** — spoken. Forecaster is a toy, TEE is simulated, n=1 is underpowered, Dominion has not formally reviewed.

Memorize one line per moment. At the talk, the presenter narrates these; everyone else on the team should be able to fill in if needed.

---

## Honest limits — rehearse saying these out loud

Judges at a hackathon have heard too many pitches that overclaim. The fastest way to build trust is to name what you have not done. Three specific sentences worth rehearsing until they come out naturally:

- *"Pilot-grade, n-of-1 per cell. The full 455-run sweep is budgeted but deferred. Anything above directional should be said with a confidence-interval caveat we don't have yet."*
- *"Our forecaster is a deterministic toy. A production deployment would swap in a utility-calibrated model without changing the rest of the architecture."*
- *"Dominion has not formally reviewed the utility-side spec. Bhawuk Luthra is at Dominion and has read the design; the handshake agenda is public. Until that review happens, 'a utility accepts this bundle' is asserted, not corroborated."*

If a judge asks anything that sounds like a challenge, pick the relevant honest-limits line **first**, then describe what the honest-limits line does not foreclose. This inverts the usual pitch rhythm and tends to earn trust within the same sentence.

---

## Three polish prompts — paste when you spot something to tweak

If during rehearsal or docs-reading you spot something that could be tighter, clearer, or more compelling, these three prompts turn the observation into a concrete proposal without you having to edit anything yourself.

### A. "This section is confusing"

```
I'm reading [DOC PATH], specifically [SECTION OR LINE]. It feels
confusing because [YOUR IMPRESSION IN ONE SENTENCE]. Without
changing the underlying meaning, propose a rewrite that would land
faster for a hackathon judge who has only seen this project for
two minutes. Keep the same length. Keep the same numbers.
```

### B. "This number needs a better caveat"

```
The number [NUMBER] is cited in [DOC PATH] and shown in the talk
as part of [SLIDE OR DEMO MOMENT]. I'm worried a skeptical judge
will ask "where does this come from?" and the current framing does
not answer that question in one sentence. Propose three caveats of
increasing length (one clause, one sentence, one short paragraph)
that could sit next to the number. Cite the source of the number.
```

### C. "The visual could be punchier"

```
On the /about page at section [N], the visual is [DESCRIBE WHAT
YOU SEE]. I think a hackathon audience would get the point faster
if [YOUR SUGGESTION]. Without changing what data is shown, propose
a concrete CSS/layout tweak or alternative visualization. Reference
the existing design language on /about and /technical — do not
introduce new visual primitives.
```

In each case, run the prompt, review what Claude proposes, and bring the proposal to Ming. Do not commit code changes yourself unless Ming asks — the point is proposal quality, not velocity.

---

## Where to look if you want more depth

You do not need to read these for the hackathon. They are here in case a judge asks a question you want to go deeper on afterward.

- `docs/tech-overview.md` — the full eleven-section technical tour.
- `docs/demo-casebook.md` — eight case studies, exact pre-flight commands, expected observations.
- `docs/hackathon-presentation.md` — the presenter's bench doc.
- `docs/design/research-thesis.md` — the four research claims and the honest gap inventory.
- `docs/design/signed-bundle.md` — the cryptographic protocol and its threat model.
- `docs/evals/sim-bench-design.md` — the pre-registered eval harness.
- `docs/evals/sim-bench-results.md` — the pilot numbers.
- `docs/plans/handoff.md` — current project state.

---

## Who to ask

- **Anything factual about the project**: Ming.
- **Anything about Dominion-side realism or utility expectations**: Bhawuk.
- **Anything about the demo mechanics you cannot figure out from the casebook**: Ming.

When in doubt, ask — nothing about this project rewards guessing.

---

## One-line summary

> Understand the project via the seven prompts. Memorize the one-paragraph story. Know the eight killer moments. Rehearse the honest-limits lines. Use the three polish prompts when you see something to improve. That's the job.
