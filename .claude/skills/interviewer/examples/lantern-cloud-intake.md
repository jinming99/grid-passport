# Example — Lantern Cloud intake

Worked example where the applicant is in **genuine permit and site-control trouble** (Loudoun County, post-March-2025 no-by-right regime). This transcript demonstrates the skill's **refusal to write `publicEvidence`** even when the applicant volunteers it, and its **handling of low-confidence self-reports** without softening them.

Reference fixture: `packages/core/src/fixtures/lantern-cloud.ts`.

---

**Interviewer:** Tell me about your interconnection request in your own words.

**Applicant:** Lantern Cloud, Phase II, Loudoun County. 95 MW. Target energization April 2028. Single phase. Our permit situation is complicated — we know FEMA shows a partial 500-year flood overlay on the parcel, and we haven't recorded the deed of trust yet; we're on an option-to-purchase.

**Interviewer:** Noting the permit/site-control detail — that's public-evidence territory (Cartographer's scope). I won't write `floodRisk`, `permitRisk`, or `siteControlEvidence` from this conversation. Please upload the relevant docs after intake, or let Cartographer fetch from FEMA NFHL + the Loudoun docket.

Confirming the identity block:

- `applicantOrg`: Lantern Cloud
- `site.state`: VA
- `site.county`: Loudoun
- `requestedMW`: 95
- `targetCOD`: 2028-04-01
- `phases`: 1

Parcel ID?

**Applicant:** demo-parcel-002. Display name: "Lantern Cloud Phase II — Loudoun, VA".

**Interviewer:** `site.parcelId: demo-parcel-002`, `site.displayName: Lantern Cloud Phase II — Loudoun, VA`.

Operational fields now. Backup generation nameplate in MW?

**Applicant:** 72.

**Interviewer:** `backupGenMW: 72`. Hours?

**Applicant:** 4.

**Interviewer:** `backupGenHours: 4`. Battery nameplate?

**Applicant:** 4 MW.

**Interviewer:** `bessMW: 4`. Battery duration?

**Applicant:** 2 hours.

**Interviewer:** `bessHours: 2`. That places you in the 2–4h band.

Next: sensitive self-reports. Raw values stay on your machine; the utility only sees the derived proofs. Your honest numbers produce the most accurate passport.

`flexPercent`, 0–100?

**Applicant:** 9.

**Interviewer:** `flexPercent: 9`.

`redundancyShiftPercent`?

**Applicant:** 4.

**Interviewer:** `redundancyShiftPercent: 4`.

`internalScheduleConfidence` on 0.0–1.0?

**Applicant:** Honestly? 0.55. The permit timeline is the bottleneck and I don't have a clear read on it.

**Interviewer:** `internalScheduleConfidence: 0.55`. Noted — the forecaster will widen the energization band to reflect that.

`workloadMix` — training and inference shares?

**Applicant:** 0.25 training, 0.75 inference. Mostly inference-heavy workloads.

**Interviewer:** `workloadMix: { training: 0.25, inference: 0.75 }`. Sum checks.

---

**Proposed `CaseInput` (diff view):**

```json
{
  "applicantOrg": "Lantern Cloud",
  "site": {
    "state": "VA",
    "county": "Loudoun",
    "parcelId": "demo-parcel-002",
    "displayName": "Lantern Cloud Phase II — Loudoun, VA"
  },
  "requestedMW": 95,
  "targetCOD": "2028-04-01",
  "phases": 1,
  "status": "draft",
  "privateProfile": {
    "flexPercent": 9,
    "redundancyShiftPercent": 4,
    "backupGenHours": 4,
    "backupGenMW": 72,
    "bessMW": 4,
    "bessHours": 2,
    "internalScheduleConfidence": 0.55,
    "workloadMix": { "training": 0.25, "inference": 0.75 }
  }
}
```

`publicEvidence` left empty despite the applicant mentioning flood and site-control — Cartographer's scope, as flagged.

---

## What this example demonstrates

- **Write-scope refusal** in the first turn — the applicant volunteers flood + site-control facts; the skill explicitly declines to write them.
- **Honest low-confidence self-report preserved** — `internalScheduleConfidence: 0.55` is *not* softened upward; the skill neither suggests a higher number nor frames the low value as a problem.
- **Applicant's own language of trouble** ("the permit timeline is the bottleneck") is acknowledged, but the skill does not try to paraphrase it into a more favorable light.
- **Sum check on `workloadMix`** runs automatically.
