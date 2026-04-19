# Example — Owl Compute intake

Canonical worked example. Hyperscaler applicant (Owl Compute), 180 MW campus in Prince William County, VA. Target COD Q4 2028, two phases. Competitively-sensitive workload mix. This transcript demonstrates **the sensitive-bucket acknowledgment + confirmation rule** — the load-bearing move of this skill.

Reference fixture: `packages/core/src/fixtures/owl-compute.ts`.

---

**Interviewer:** Tell me about your interconnection request in your own words — where, how big, and when.

**Applicant:** We're Owl Compute. Planning a 180 MW data-center campus in Prince William County, Virginia. Target COD is October 2028. Two phases.

**Interviewer:** Confirming the identity block:

- `applicantOrg`: Owl Compute
- `site.state`: VA
- `site.county`: Prince William
- `requestedMW`: 180
- `targetCOD`: 2028-10-01
- `phases`: 2

Do you have a parcel identifier for the site? If not, we can tag it provisionally and you can fill it in from the deed later.

**Applicant:** Yes — demo-parcel-001.

**Interviewer:** Got it. `site.parcelId: demo-parcel-001`. Display name "Owl Compute Campus — Prince William, VA" — okay?

**Applicant:** Works.

**Interviewer:** Now the operational questions — backup generation and battery storage. Four numeric answers. What's your on-site generation nameplate, in MW?

**Applicant:** 140 MW.

**Interviewer:** `backupGenMW: 140`. How many hours can that carry the load?

**Applicant:** 6 hours.

**Interviewer:** `backupGenHours: 6`. Battery nameplate in MW?

**Applicant:** 11 MW.

**Interviewer:** `bessMW: 11`. Battery duration — released as a coarse band (2–4h / 4–8h / 8–12h), but I need the raw number to place you.

**Applicant:** 4 hours.

**Interviewer:** `bessHours: 4`. That places you in the 2–4h published band.

Next: four competitively-sensitive self-reports. For each of these, the raw value stays on your machine; the utility only sees a derived proof. Your honest number produces the most accurate passport.

First: `flexPercent` — share of load you can shed when the grid is stressed, 0–100. What's your committed number?

**Applicant:** Is 30 a better number than 22? Would that get us a faster slot?

**Interviewer:** That's not a question I can answer. The number should reflect what you're willing to commit to in a signed bundle — the forecaster uses it to size the flexibility passport. If the number is high and you can't deliver, that's a reputational problem later. What's your honest commit?

**Applicant:** 22.

**Interviewer:** `flexPercent: 22`.

Next: `redundancyShiftPercent` — share you can shift to another region's site, 0–100.

**Applicant:** 12.

**Interviewer:** `redundancyShiftPercent: 12`.

`internalScheduleConfidence` on 0.0–1.0 — how firm is the build schedule internally? Typical answers are 0.50–0.85.

**Applicant:** We're pretty confident, I'd say.

**Interviewer:** I need a number. The forecaster folds this into the energization-band width; a vibe doesn't do that. Anywhere on 0.0–1.0.

**Applicant:** 0.68.

**Interviewer:** `internalScheduleConfidence: 0.68`.

Last: `workloadMix`. Training share and inference share, 0.0–1.0. Sums to 1.0.

**Applicant:** 0.55 training, 0.45 inference.

**Interviewer:** `workloadMix: { training: 0.55, inference: 0.45 }`. Sum checks.

---

**Proposed `CaseInput` (diff view):**

```json
{
  "applicantOrg": "Owl Compute",
  "site": {
    "state": "VA",
    "county": "Prince William",
    "parcelId": "demo-parcel-001",
    "displayName": "Owl Compute Campus — Prince William, VA"
  },
  "requestedMW": 180,
  "targetCOD": "2028-10-01",
  "phases": 2,
  "status": "draft",
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

- **Identity parsing from prose** (prose → 5 identity fields in one confirmation turn).
- **Numbered operational confirmation** (4 explicit numeric questions; no inference).
- **Sensitive-bucket acknowledgment** delivered verbatim before each of the 4 sensitive asks.
- **Non-coaching rule in action:** applicant asks "is 30 better than 22?" — skill refuses and reframes as a commitment question.
- **Range-hint-after-answer:** skill mentions the 0.50–0.85 typical range only when the applicant offers a non-numeric answer, and even then does not propose a specific number.
- **Write-scope discipline:** no writes to `publicEvidence` or `derivedProof`, even where they're implied by the prose.
