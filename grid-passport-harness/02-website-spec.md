# 02 — Website Spec

## Goal of the site

The site is not a brochure.  
It is the **first half of the demo**.

Its job is to make the audience feel the problem before they see the product.

By the time someone clicks **Run demo**, they should already believe:
- there is a real bottleneck,
- current solutions are inadequate,
- privacy-preserving coordination is the missing layer.

## Website architecture

### `/`
Problem-first landing page

### `/demo`
Interactive product walkthrough  
This is the actual app in demo-theater mode.

### `/how-it-works`
Trust + workflow explanation

### `/case-files`
Three to four case studies  
Synthetic, grounded, memorable.

### `/trust`
Privacy, policy, attestation, audit  
The serious page.

### `/appendix`
Tech / market / source appendix

---

## Landing page structure

### Section 1 — Hero
**Headline options**
1. **A 500 MW request is not a forecast.**
2. **The grid has a secrecy problem.**
3. **Truth without disclosure.**

**Recommended hero**
> **A 500 MW request is not a forecast.**  
> Grid Passport turns private load, site, and flexibility data into utility-usable proofs.

**Subtext**
Utilities need forecast-quality information. Applicants have reasons not to disclose it raw.  
Grid Passport creates a trusted coordination layer between both sides.

**Primary CTA**
- `Run the request`

**Secondary CTA**
- `See utility mode`

**Hero visual**
A split animation:
- left: raw inputs / sealed fields / private roadmap
- center: vault / policy engine
- right: released proofs / planning outcomes

### Section 2 — The bottleneck
**Title**
> The queue is clogged with uncertainty, not just megawatts.

**Three cards**
- Utilities cannot plan from wishful load requests
- Applicants cannot dump their secrets into a form
- Regulators cannot bless black-box decisions

**Visual**
A line of giant power plugs backed up at a substation gate with uncertainty tags:
- speculative
- private
- incomplete
- permit risk
- unknown flexibility

### Section 3 — Why ordinary fixes fail
**Title**
> Everyone’s first idea is wrong in a different way.

**Comparison strip**
- bigger forms
- NDAs + consultants
- bigger deposits
- manual spreadsheets
- optimization engine on top of bad inputs

**Ending beat**
> You do not solve a trust bottleneck by asking for even more trust.

### Section 4 — The product thesis
**Title**
> Show the proof, not the secret.

**Three-step explainer**
1. Applicant submits raw information into a confidential workflow
2. Public evidence is assembled automatically
3. Utility receives only policy-approved proofs and next actions

**Visual**
A release diff card:
- hidden: training roadmap
- visible: firmness score 74 / flexibility 22 MW for 4 hours

### Section 5 — Interactive dual-view teaser
**Title**
> Same request. Two truths. One workflow.

**Interaction**
A role toggle:
- Applicant
- Utility
- Regulator

Same request object stays on screen. Visible fields change by role.

### Section 6 — Proof that AI matters
**Title**
> This is where agents do real work.

**Agent cards**
- Cartographer → gathers public site evidence
- Interviewer → converts messy answers into structured request data
- Notary → computes derived proofs in a confidential boundary
- Forecaster → translates proofs into planning outputs
- Referee → enforces visibility policy
- Explainer → produces human-readable rationale

### Section 7 — Case files
**Title**
> Four ways this changes outcomes

Tease:
- faster queue qualification
- earlier permit-risk discovery
- better flexibility planning
- cleaner regulator evidence

### Section 8 — Trust / privacy statement
**Title**
> Privacy is a product feature, not a legal footnote.

**Must include**
- release policy
- attestation
- audit logs
- role-based visibility
- “frontier model never sees raw secret fields” if true
- local/confidential processing explanation

### Section 9 — Why now
**Title**
> Data-center growth is no longer hypothetical.

Use concise market proof:
- data-center demand growth
- Virginia / Dominion queue pressure
- utility rate and collateral responses
- flexibility initiatives emerging now
- VC / startup activity showing category validation

### Section 10 — Final CTA
> Build a queue that sees enough to act — and no more.

CTA buttons:
- `Run the demo`
- `Open the case files`

---

## Demo site (`/demo`) structure

Treat `/demo` like a story-engine, not a generic app.

### Frame layout
- top bar with role switch + case selector
- left main canvas
- right side panel with:
  - evidence
  - audit trail
  - agent trace
- bottom sticky bar with:
  - current scenario
  - privacy status
  - release policy version

### Primary demo modes
1. Intake
2. Proof generation
3. Utility workspace
4. Regulator audit
5. Event response (stretch)

---

## Copy style

### Good
- “This stays sealed.”
- “Utility receives a confidence band, not the raw roadmap.”
- “A 17 MW flexibility envelope changes the energization outcome.”
- “Permit risk found before queue capacity gets wasted.”

### Bad
- “Our cutting-edge AI uses advanced cryptographic paradigms.”
- “We leverage synergies across stakeholders.”
- “Seamless user-centric solution.”

---

## Weird / fun / serious design language

### What “weird” should mean
- slightly cinematic
- tactile seals, diffs, stamps, maps
- dossier-like UI
- role switches that feel like putting on different glasses

### What “serious” should mean
- sparse, high-confidence writing
- no cartoonish mascots on planning screens
- obvious auditability
- strong information hierarchy

### What “fun” should mean
- satisfying transitions
- hidden/visible diff reveals
- sharp microcopy
- memorable case names
- one or two moments of “that’s clever”

---

## Visual system

### Typography
- title font: condensed industrial / technical
- body font: plain sans, highly readable
- monospace only for hashes, policy IDs, agent traces

### Components
- sealed field chip
- proof card
- evidence card
- redaction diff
- role-toggle tabs
- scenario slider
- audit event row
- agent trace chip

### Background treatments
- dark blueprint
- faint contour lines
- single-line power diagrams
- paper white evidence cards on dark canvas

---

## Motion guidelines

### Must-have microanimations
- seal close
- proof release
- map overlay fade
- role switch visibility update
- blocker card reordering when scenario changes

### Avoid
- long spinners
- playful bounce effects
- excessive parallax
- neon cyberpunk tropes

---

## Suggested asset plan

### Needed
- stylized substation / single-line background
- contour/topo texture
- permit stamp motif
- sealed envelope icon set
- attestation badge/icon
- maybe one animated parcel map intro

### Optional
- a short 5-second loop for the hero showing `raw → vault → proof`

---

## Instrumentation for the site

Even for the demo, log:
- time to first aha moment
- clicks to reach utility mode
- completion time for applicant intake
- number of times role switch is used
- whether judges open trust/audit mode

These are story metrics, not vanity metrics.

---

## One-page heuristic

If someone sees only the landing page, they should still understand:

> This product exists because the parties who need to plan together cannot safely reveal everything to each other.

If the page just says “AI + grid optimization,” it failed.
