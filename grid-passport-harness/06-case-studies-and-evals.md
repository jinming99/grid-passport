# 06 — Case Studies and Evals

All case studies below are **synthetic composites grounded in real public utility, regulatory, and permitting patterns**.

Use fictional company names.  
That makes the stories memorable while keeping you honest.

Use codenames. It helps the deck feel crisp and weird without feeling unserious.

---

## Case study template

For every case study, show:

1. Pain point
2. Why the ordinary alternatives fail
3. What Grid Passport does
4. What the user sees
5. What the AI agents do
6. Why the outcome is uniquely better
7. How you measure success

---

# Case 1 — Owl Compute
## “The utility sees 180 MW. The applicant sees a roadmap they cannot share.”

### Scenario
A hyperscaler-like applicant wants service for a phased 180 MW campus in Virginia.

The utility needs to know:
- how much of the request is likely to materialize on time,
- whether the site is actually ready,
- what flexibility exists,
- what costs or obligations are appropriate.

The applicant knows:
- internal build confidence,
- phased AI workload ramp,
- percentage of flexible training jobs,
- backup generation / BESS details,
- global redundancy strategy.

They do **not** want to reveal the raw roadmap.

### Pain point
Without the private details, the utility overestimates uncertainty.  
With raw disclosure, the applicant gives away too much.

### Common alternatives
- fill out a big PDF and hope
- assign a consultant and email attachments around
- require a massive deposit
- manually negotiate a special process

### Why those fail
- too slow
- too inconsistent
- too much leakage
- still poor forecast quality

### What Grid Passport does
- Interviewer structures the request
- Cartographer pulls site / permit / hazard context
- Notary seals raw fields
- Forecaster computes:
  - firmness score
  - expected coincident peak band
  - site readiness band
  - earliest energization band
- Referee ensures utility sees only proofs, not raw roadmap
- Explainer tells the applicant what to improve next

### Demo moment
The applicant enters:
- 180 MW requested
- 22% deferrable compute
- 11 MW / 4 hr BESS
- 6 hr backup generation coverage
- 2 build phases
- 68% internal schedule confidence

Then you switch to utility mode and show:
- **requested:** 180 MW
- **expected peak band:** 110–135 MW
- **firmness score:** 74
- **flexibility passport:** 18–24 MW / 3–4 hr / advisory class B
- **energization band:** Q4 2028 to Q2 2029

Raw schedule confidence and workload mix are gone.

### “I didn’t know AI could do that” angle
The system is not just summarizing documents.  
It is:
- converting mixed private/public inputs into a planning-grade projection
- proving what it did not disclose
- returning a utility-usable decision packet

### Why this beats alternatives
Because it improves both:
- applicant willingness to participate
- utility ability to plan

That combination is the wedge.

### Metrics
- **Intake completion time:** target < 8 minutes for demo flow
- **Manual analyst touchpoints avoided:** target 3+
- **Private field leakage count:** target 0
- **Derived output utility rate:** > 80%
- **Scenario explainability:** every proof has source + rationale
- **Trust comprehension:** observer can explain what stayed private and what was released

---

# Case 2 — Lantern Cloud
## “The site looked promising until permitting became the blocker.”

### Scenario
A cloud provider submits a 95 MW request for a parcel that appears viable electrically, but public permitting and environmental signals create hidden schedule risk.

### Pain point
Queue capacity gets consumed by requests that are electrically plausible but site-impossible.

### Common alternatives
- discover permit risk later
- have lawyers or site consultants do separate diligence
- let utility planners ignore the issue because it is not their lane

### Why those fail
- late discovery wastes queue capacity
- duplicated effort
- no shared decision object
- nobody has a unified view

### What Grid Passport does
- Cartographer pulls:
  - parcel context
  - hazard overlays
  - data-center permitting references
  - air permit signal references
- Interviewer asks site-readiness questions
- Forecaster downgrades readiness despite decent electrical profile
- Explainer generates a crisp blocker list

### Demo moment
The request starts in yellow. Then the evidence panel lights up:
- generator permitting complexity
- hazard/flood considerations
- missing site-control evidence
- site plan maturity below threshold

The overall outcome shifts from:
- **study now**
to
- **hold until site readiness evidence improves**

### “I didn’t know AI could do that” angle
It feels like an AI site-acquisition analyst embedded directly in the interconnection workflow.

### Metrics
- **Early blocker discovery time**
- **Evidence recall**
- **False confidence reduction**
- **Actionability score**
- **Queue waste avoided**

---

# Case 3 — Kraken Train
## “The data center can flex, but the AI company cannot show its job queue.”

### Scenario
A data-center operator and AI tenant face a heat-driven grid stress event or transformer delay.

The operator wants load flexibility.  
The AI tenant has some flexibility but cannot reveal raw workload plans or customer priorities.

### Pain point
Today the operator sees a giant opaque load.  
The tenant sees internal workload detail.  
Neither side can coordinate optimally.

### Common alternatives
- blunt curtailment
- overbuild local capacity
- manual phone calls during stress events
- rigid demand response with poor fit for AI workloads

### Why those fail
- too much performance loss
- too expensive
- too slow
- too coarse

### What Grid Passport does
Before any event:
- the tenant submits a private flexibility profile
- Notary converts it into a **Flexibility Passport**
- Referee pre-approves what can be shared during an event

During the event:
- Switchboard computes a bounded response recommendation
- Utility/operator sees:
  - MW
  - duration
  - confidence
  - response class
- Tenant sees:
  - expected service impact tier
  - protected jobs preserved
  - recovery recommendation

### Demo moment
An event appears:
- “grid stress alert — 20 MW requested for 2 hours”

The system responds:
- **available flex:** 17 MW
- **recommended dispatch:** 14 MW for 110 min
- **expected SLA impact:** low
- **confidence:** 0.84

No raw training schedule is shown.

### “I didn’t know AI could do that” angle
The system brokers a hidden-workload / visible-grid negotiation in seconds.

### Metrics
- **MW served without raw disclosure**
- **QoS preservation rate**
- **operator action latency**
- **false positive curtailment rate**
- **private field leakage count**
- **recoverability**

---

# Case 4 — Blackbird Regulator
## “The regulator wants fairness proof, not startup vibes.”

### Scenario
A regulator or commission reviewer wants to know:
- what information was used,
- what stayed hidden,
- why costs or obligations were assigned,
- whether the process is fair and repeatable.

### Pain point
Most AI demos are impossible to audit.

### Common alternatives
- PDF memo after the fact
- manually curated appendix
- “we have internal logs”
- lawyerly explanation with no technical trace

### Why those fail
- brittle
- expensive
- unconvincing
- not reproducible

### What Grid Passport does
- exposes a regulator mode
- shows disclosure matrix
- shows policy version
- shows audit trail
- shows public evidence references
- shows generated proofs with reason codes

### Demo moment
Click **Regulator mode** and reveal:
- raw fields hidden count
- proofs released count
- policy reason codes
- artifact hashes
- source references
- “why this customer is in this treatment band”

### “I didn’t know AI could do that” angle
Instead of hiding the AI process, the product turns the AI workflow into a regulator-readable evidence packet.

### Metrics
- **audit completeness**
- **reason-code coverage**
- **review time reduction**
- **role-visibility consistency**
- **observer comprehension**

---

## Cross-case evaluation metrics

### 1) Disclosure Leakage Rate (DLR)
`# protected values exposed outside confidential path / # protected values submitted`  
**Target:** `0`

### 2) Derived Output Utility Rate (DOUR)
`# utility decision fields successfully populated from derived outputs / # utility decision fields required`  
**Target:** `>= 0.80`

### 3) Queue Credibility Gain (QCG)
Improvement in planner confidence after structured intake + proof generation.  
**Target:** positive in every case

### 4) Analyst Hours Avoided (AHA)
Estimated manual back-and-forth avoided versus baseline process.  
**Target:** show at least `2–4` avoided touchpoints per case

### 5) Evidence Recall (ER)
`# relevant public evidence items surfaced / # relevant public evidence items in fixture truth set`  
**Target:** `>= 0.75`

### 6) Role Projection Integrity (RPI)
The applicant, utility, and regulator projections are internally consistent and policy-compliant.  
**Target:** pass/fail, must pass

### 7) Counterfactual Responsiveness (CR)
A meaningful change in a planning-relevant variable produces a corresponding visible decision delta.  
**Target:** pass/fail, must pass

### 8) Observer Aha Rate (OAR)
Of 5 observers, how many independently articulate the core novelty after one demo pass?  
**Target:** `>= 4/5`

---

## How to present the case studies

### Good structure on stage
- one sentence problem
- one sentence why the usual approach fails
- one sentence what the product uniquely enables
- one screen or toggle that proves it

### Recommendation
Fully demo **Case 1**.  
Briefly mention **Case 2** and **Case 4** in the deck.  
Use **Case 3** as the roadmap bridge to the operations product.

---

## Suggested seed dataset format

Create fixtures in `data/case-studies/*.json` using this shape:

```json
{
  "case_id": "owl-compute",
  "display_name": "Owl Compute",
  "site": {
    "state": "VA",
    "county": "Prince William",
    "parcel_id": "demo-parcel-001"
  },
  "request": {
    "requested_mw": 180,
    "target_cod": "2028-10-01",
    "phases": 2
  },
  "private_profile": {
    "flex_percent": 22,
    "redundancy_shift_percent": 12,
    "backup_gen_hours": 6,
    "bess_mw": 11,
    "bess_hours": 4,
    "internal_schedule_confidence": 0.68,
    "workload_mix": {
      "training": 0.55,
      "inference": 0.45
    }
  },
  "public_truth": {
    "flood_risk": "low",
    "permit_risk": "medium",
    "site_control_evidence": true
  },
  "expected_proofs": {
    "firmness_score": 74,
    "expected_peak_band_mw": [110, 135],
    "flexibility_passport": {
      "mw": [18, 24],
      "duration_hours": [3, 4],
      "response_class": "B"
    },
    "energization_band": "Q4 2028 - Q2 2029"
  }
}
```

### Important
Keep all case-study numbers clearly labeled as:
- synthetic
- illustrative
- grounded in real workflow requirements

Do not imply they are live utility determinations.
