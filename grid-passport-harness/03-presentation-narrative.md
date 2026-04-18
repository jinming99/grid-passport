# 03 — Presentation Narrative

## Goal of the deck

The deck should make the audience independently reach the conclusion that:

> “A privacy-preserving coordination layer is the obvious missing piece.”

Do **not** start with architecture.  
Do **not** start with “we built an AI agent platform.”  
Start with the bottleneck.

---

## Slide 1 — The line that arrests the room
**Title:** A 500 MW request is not a forecast.

**Key claim:**  
The grid’s fastest-growing loads are also some of its least shareable planning inputs.

**Visual:**  
A giant “500 MW” request card on the left, and a much narrower “expected peak band” bar on the right.

**Talk track:**  
“Utilities and regulators are being asked to plan around hyperscale and AI-driven loads years ahead of delivery. But the thing a customer requests is not the same thing that will actually arrive, and the information needed to tell the difference is often private.”

## Slide 2 — The real bottleneck
**Title:** The queue is clogged with uncertainty.

**Key claim:**  
The planning problem is caused by incomplete, speculative, and non-shareable information.

**Visual:**  
Five clogged pipeline icons:
- speculative demand
- hidden roadmap
- site risk
- unknown flexibility
- cost responsibility ambiguity

## Slide 3 — Why ordinary fixes all fail
**Title:** Every obvious approach breaks somewhere.

**Visual:**  
A comparison table:
- bigger forms
- NDAs + consultants
- bigger deposits
- spreadsheets
- optimization engine on top

**Talk track:**  
“If you ask for raw disclosure, you lose the customer. If you ask for less, you lose planning quality. If you add manual intermediaries, you lose speed and consistency.”

## Slide 4 — Product reveal
**Title:** Grid Passport: truth without disclosure.

**Key claim:**  
Grid Passport turns private load and site data into utility-usable proofs.

**Visual:**  
Three-step flow:
raw inputs → confidential vault → derived proofs

## Slide 5 — Why AI agents are the right primitive
**Title:** Agents matter because the work is multi-step and multi-source.

**Key claim:**  
The problem requires structured interviewing, public evidence gathering, policy enforcement, and explanation.

**Visual:**  
Six agents in a tight ring:
Cartographer, Interviewer, Notary, Referee, Forecaster, Explainer

## Slide 6 — Demo
**Title:** Same request. Two truths. One workflow.

**Live demo flow**
1. Applicant enters a private large-load request
2. Cartographer pulls public parcel / permitting context
3. Notary seals private fields and creates proofs
4. Utility view shows only derived planning outputs
5. Counterfactual slider changes flexibility and improves energization band
6. Regulator mode shows audit trace

**What to say during demo**
- “This answer is private”
- “This output is derived”
- “This is what the utility sees”
- “This is why the release is allowed”
- “This small flexibility change materially changes the planning outcome”

## Slide 7 — Why it beats alternatives
**Title:** The winning property is not optimization. It’s credible coordination.

**Visual:**  
2x2 matrix:
- raw disclosure
- blind queue
- manual intermediary
- Grid Passport

Axes:
- planning value
- privacy safety

## Slide 8 — Moat
**Title:** The moat is the release layer.

**Key claim:**  
Competitors can copy the form. Harder to copy:
- confidential compute boundary
- policy-governed visibility model
- large-load proof schema
- audit artifacts
- domain-specific evals
- workflow integrations

## Slide 9 — Why now
**Title:** The market is forcing this layer into existence.

**Visual:**  
Four stacked signals:
- demand growth
- queue / cost-shift safeguards
- flexibility pilots
- startup funding

## Slide 10 — End state
**Title:** Build the queue that sees enough to act — and no more.

**Key claim:**  
Start with interconnection and qualification. Expand into real-time flexibility.

**Visual:**  
Roadmap:
- today: intake + qualification
- next: forecast + cost/risk
- later: bounded operational flexibility

---

## 3-minute demo script

### 0:00–0:20
“Utilities do not have a pure power problem. They have a planning problem caused by information they need but cannot safely get.”

### 0:20–0:40
“This is Grid Passport. On the left is the applicant. On the right is the utility. The same request exists in both places, but the visibility is different.”

### 0:40–1:15
“Here the applicant enters private information: phased load timing, flexible workload percentage, backup power, and global failover capability. Every field is explicitly marked as public, private, or derived.”

### 1:15–1:35
“Now our public-evidence agent pulls site context — parcel, flood / hazard, and permitting signals — so we do not rely only on self-reporting.”

### 1:35–1:55
“When the request is submitted, the private fields are sealed inside a confidential workflow. The system creates derived proofs: firmness score, flexibility passport, readiness band, and earliest energization band.”

### 1:55–2:25
“Switching to utility mode: the raw roadmap is gone. The planner sees only the proofs, the public evidence, and the next recommended action.”

### 2:25–2:45
“Watch what happens when flexibility increases from 8% to 22%. The energization band improves and the blocker profile changes. That is planning value without raw disclosure.”

### 2:45–3:00
“And in regulator mode, we show exactly what was hidden, what was released, and which policy allowed it. That is why this is more than a better form. It is a trusted coordination layer.”

---

## Backup appendix slides

### Appendix A — Market proof
Use current demand and funding signals.

### Appendix B — Technical trust model
Use simple architecture and release policy graphic.

### Appendix C — What we did not build
This makes you sound honest:
- no live control of equipment
- no claim of perfect forecasts
- no claim of universal interoperability on day one

### Appendix D — Expansion path
Qualification → planning → flexibility operations

---

## Stagecraft / style

### Visual pacing
- one strong line per slide
- one visual metaphor per slide
- no dense bullet soup

### How to be weird without losing credibility
- case studies named “Owl Compute” or “Lantern Cloud”
- permit stamps / sealed-field motifs
- role-switch diffs
- verbal style sharp, not goofy

### What not to do on stage
- do not unload “LLMs, RAG, agents, MCP, enclaves…” all at once
- do not spend 45 seconds explaining cryptography
- do not let the audience wonder what business decision improved

---

## Judge bait

Judges are likely to reward:
- clearly bounded pain
- crisp workflow fit
- visible privacy guardrails
- believable wedge into a large market
- a demo where AI obviously earns its keep

So make sure they leave with these lines in mind:
- “same request, different visibility”
- “proof, not premise”
- “planning value without raw disclosure”
- “policy, not prompt, governs what is visible”
