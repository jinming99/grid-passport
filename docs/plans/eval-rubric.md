# Eval rubric — human-preference axis (roadmap §14)

**Status:** DRAFT (2026-04-18). Ming to review/edit; once approved, Owner B or C starts scoring against it.

Applies to the **Explainer** Skill (near-term item #13) — the agent most sensitive to human-preference calibration because it generates prose for each role. The role-leakage and domain-spec axes have independent mechanical checks; this rubric is only for "is the prose any good?"

See `docs/agents.md` §7 for the full eval-harness context (N-targets, owner allocation, why human-preference is one of four axes).

---

## Scoring — per (case, role) pair

Three 1–5 Likert axes, plus a free-text field. Nine pairs per Skill run (3 cases × 3 roles); multiple runs with fresh seeds up to N=60 per Skill.

### Axis A — Answers the role's actual question

What would *this role* want to know from this view?

- **1** — ignores the role's concern entirely; generic boilerplate that could have been written without seeing the view.
- **3** — partially answers; touches the right topic but doesn't engage with the specific numbers.
- **5** — directly answers the role's question for this case, referencing the specific values in the projected view.

### Axis B — Stays within the projected view

Strict containment. The Explainer only receives the `ProjectedView`, never raw `CaseInput` — so violations here are either (a) the Skill fabricating a hidden value, or (b) the Skill implying knowledge it doesn't have.

- **1** — fabricates or implies a raw private value (e.g., claims an exact `flexPercent` when the role shouldn't see it).
- **3** — stays within bounds but leans on borderline derived fields without disclaiming the derivation.
- **5** — uses only fields visible to the role; acknowledges sealed fields by policy language, not by guessing content.

### Axis C — Tone calibrated for the role

Voices (borrow these, don't paraphrase creatively):

- **Applicant** — transparency: "here's what's public, here's what stays sealed, here's what changed."
- **Utility** — operational: "here's what this commits to, here's the margin, here's what we'd need to verify."
- **Regulator** — accountability: "here's what was redacted, here's the policy path, here's the audit chain."

Scoring:
- **1** — wrong voice entirely; regulator gets sales pitch, utility gets apologia, applicant gets jargon.
- **3** — functional but bland; correct register, no personality, no specific hooks.
- **5** — audience-appropriate, substantive, confident. Feels like it was written by someone who's done this role before.

### Free-text — "anything off?"

Catches issues the axes miss: hallucinated numbers that happen to be plausible, invented jargon, condescension, ASCII-art flourishes, unacknowledged uncertainty, tone inconsistency within a single response.

---

## Sample size per Skill

- 9 (case × role) pairs × 7 runs per pair = 63 per Skill. Round to N=60.
- Each pair uses a fresh seed for the Explainer. Fixed seeds for everything else.
- Inter-rater: if we have two judges per response, report mean + spread; target spread ≤ 1 Likert point on each axis.

## Baseline

Same prompt, same view, same model — but without the SKILL.md packaging. Score against the same rubric. The delta between Skill and baseline is the finding for the talk.

## What "pass" looks like

A Skill-packaged Explainer scoring **≥ 4.0 mean on each axis across N=60**, with the baseline at **≤ 3.5 on ≥ 2 axes**, is the headline. Lower deltas are still publishable — just note the effect size honestly.

---

## Open questions for Ming

1. Should axis C's voices be elaborated? The three one-liners above are a compression — a longer description might help the judge calibrate.
2. Is the free-text field bucketed into categories ex-post (for patterns), or left as raw notes?
3. Three-case fixture set is small. Worth adding a fourth case to get more (case × role) pairs before running, or stick with 3?

When these are answered, promote this file to `docs/evals/rubric.md` (the final location — tracks the eval harness scaffold) and remove the DRAFT marker.
