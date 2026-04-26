# Example — Owl Compute intake

Canonical worked example. Hyperscaler applicant (Owl Compute), 180 MW campus in Loudoun County, VA. Phase 1 target COD Q3 2027, two phases. Competitively-sensitive workload mix. This transcript demonstrates **natural-language voice + 4-round staging + the sensitive-bucket acknowledgment** — the load-bearing moves of this skill.

Reference fixture: `packages/core/src/fixtures/owl-compute.ts`.

---

**Interviewer:** Welcome. Tell me about the data center you're standing up — where, how big, when.

**Applicant:** Hey, this is Owl Compute. We're a new AI compute company spinning up our first data center campus in Loudoun County, Virginia. 180 MW total, two phases, with Phase 1 targeting Q3 2027 energization. Kicking off our interconnection process with Dominion and want to be upfront about what we're bringing online.

**Interviewer:** Welcome, Owl Compute. Read-back to make sure we're aligned:

- 180 MW data center campus, two phases
- Loudoun County, Virginia (Dominion territory — say if I'm wrong)
- Phase 1 energization Q3 2027
- Kicking off interconnection with Dominion

Five quick things to close the regulatory baseline:

1. Person on your end I'd loop in — name and email (phone optional)?
2. Target connection voltage? Most campuses your size land at 230 kV or 345 kV.
3. Standalone load, or netting against on-site generation/storage?
4. Parcel ID for the site (deed/assessor reference)? If not yet on hand we can tag provisionally.
5. Phase 2 target energization, if you've committed to one?

Type any order — I'll sort them out.

**Applicant:** Sarah Chen, sarah.chen@owlcompute.example. 230 kV. Standalone — no on-site gen. Parcel demo-loudoun-001. Phase 2 hasn't been scheduled yet.

**Interviewer:** Got it. Baseline filled:

- Customer contact: Sarah Chen — sarah.chen@owlcompute.example
- Connection voltage: 230 kV
- Standalone (no netting)
- Parcel: demo-loudoun-001
- Phase 2 timing: deferred (will land in a later filing)

Display name: "Owl Compute Campus — Loudoun, VA" — okay?

**Applicant:** Works.

**Interviewer:** That's the regulatory baseline complete. ✓ This is the equivalent of what an ERCOT-style large-load disclosure standard would already capture today. It's a useful start — but it's also where most filings stop, and it doesn't tell the grid operator anything about how you'll actually run.

Next, the firm-power side. Four numbers in one go:

1. On-site generation nameplate (MW)?
2. How many hours can that generation carry your load?
3. Battery (BESS) nameplate (MW)?
4. Battery duration (hours)? Typical BESS bands are 2–4h / 4–8h / 8–12h.

**Applicant:** 140 MW backup gen for 6 hours. Battery is 11 MW at 4 hours.

**Interviewer:** Recorded:

- Backup generation: 140 MW × 6 hr
- BESS: 11 MW × 4 hr (places you in the 2–4h published band)

Last set — four competitively-sensitive self-reports. Read the next paragraph carefully because it's the load-bearing one:

**Raw values stay on your machine. The utility only ever sees a derived proof. Your honest numbers produce the most accurate passport. Inflated numbers don't help you — they just commit you to capacity you can't deliver.**

1. **flex** — share of load you can shed when the grid is stressed (0–100%)?
2. **redundancy shift** — share you can move to a redundant region (0–100%)?
3. **schedule confidence** — how firm is your internal build schedule (0.0–1.0, typical 0.50–0.85)?
4. **workload mix** — training % and inference %, must sum to 100%?

**Applicant:** Is 30% flex a better number than 22%? Would that get us a faster slot in the queue?

**Interviewer:** That's not a question I can answer. The number reflects what you're willing to commit to in a signed bundle — the forecaster uses it to size the flexibility passport. If the number is high and you can't deliver, that's a reputational problem later. What's your honest commit?

**Applicant:** 22% flex. 12% redundancy shift. Schedule confidence — we're pretty confident, I'd say.

**Interviewer:** Got 22 and 12. For schedule confidence I need a number, not a vibe — the forecaster folds it into the energization band's width and "pretty confident" doesn't do that. Anywhere on 0.0–1.0.

**Applicant:** 0.68. Workload is 55 training, 45 inference.

**Interviewer:** Recorded:

- Flex: 22%
- Redundancy shift: 12%
- Schedule confidence: 0.68
- Workload mix: 55% training / 45% inference (sums to 1.00 ✓)

Complete intake captured — 20 fields signed against your prose. Helpful — but this is also where most regulatory filings stop. Drop your operational documents (training calendar, gen-test schedule, shed-response playbook) when you're ready and we'll add the structured detail the grid operator actually needs to plan around you.

---

**Proposed `CaseInput` (diff view):**

```json
{
  "applicantOrg": "Owl Compute",
  "site": {
    "state": "VA",
    "county": "Loudoun",
    "parcelId": "demo-loudoun-001",
    "displayName": "Owl Compute Campus — Loudoun, VA"
  },
  "requestedMW": 180,
  "targetCOD": "2027-09-01",
  "phases": 2,
  "status": "draft",
  "customerContact": {
    "name": "Sarah Chen",
    "email": "sarah.chen@owlcompute.example"
  },
  "loadType": "data_center",
  "connectionVoltageKV": 230,
  "netMetered": false,
  "privateProfile": {
    "flexPercent": 22,
    "redundancyShiftPercent": 12,
    "backupGenHours": 6,
    "backupGenMW": 140,
    "bessMW": 11,
    "bessHours": 4,
    "internalScheduleConfidence": 0.68,
    "workloadMix": { "training": 0.55, "inference": 0.45 }
  }
}
```

`publicEvidence` left empty — Cartographer's scope. Derived fields left empty — Forecaster's scope. `id`, `policyVersion` left empty — runtime-assigned.

Review the diff; accept, edit, or send back for a specific field.

---

## What this example demonstrates

- **Natural-language confirmation, not schema-name diff.** Read-back is *"Got Owl Compute — 180 MW data center campus..."* not *"applicantOrg: Owl Compute, requestedMW: 180, ..."*. Field names appear only inside questions where they ground the answer (e.g., voltage units, percent ranges).
- **Inferred values flagged, not silently accepted.** "Loudoun (Dominion territory — say if I'm wrong)" — context-derived inferences are surfaced for the applicant to confirm, never silently committed.
- **4-round staging.** Round 1 (identity from prose) → Round 2 (baseline gap-fill: contact + voltage + netting + parcel + Phase 2 timing) → Round 3 (firm-power numerics) → Round 4 (sensitive self-reports). Each round is one Skill turn; the applicant replies once with all answers in any order; the Skill parses them out together.
- **Sensitive-bucket acknowledgment delivered once, at the top of Round 4.** Verbatim, not chunked into four repetitions before each question — that drift toward boilerplate would weaken the acknowledgment, not strengthen it.
- **Non-coaching rule in action:** applicant asks "is 30 better than 22?" — skill refuses and reframes as a commitment question.
- **Vibe-rejection:** applicant says "pretty confident" for schedule confidence — skill insists on a number with the typical-range hint. Range hint never becomes a value suggestion.
- **Write-scope discipline:** no writes to `publicEvidence` or `derivedProof`, even where they're implied by the prose.
- **Bridge to next phase:** closing line names the doc-ingest path explicitly without overpromising what's wired today.
