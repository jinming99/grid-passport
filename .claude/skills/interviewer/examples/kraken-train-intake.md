# Example — Kraken Train intake

Worked example where the applicant is making an **aggressive flexibility commitment** (pre-enrolled in EPRI DCFlex). This transcript demonstrates the skill's **non-coaching rule under flattering prose** — when the applicant describes their posture in favorable terms, the skill does not convert that posture into numbers. Every number is asked for directly.

Reference fixture: `packages/core/src/fixtures/kraken-train.ts`.

---

**Interviewer:** Tell me about your interconnection request in your own words.

**Applicant:** Kraken Train AI Campus, Fauquier County, VA. 240 MW, three phases, COD January 2029. We're a lean-and-mean flexibility shop — pre-enrolled in the EPRI DCFlex demonstration, willing to commit aggressive shift percentages. Very high internal schedule confidence; we've already surveyed the parcel and recorded full site control.

**Interviewer:** Identity block:

- `applicantOrg`: Kraken Train
- `site.state`: VA
- `site.county`: Fauquier
- `requestedMW`: 240
- `targetCOD`: 2029-01-01
- `phases`: 3

Parcel ID?

**Applicant:** demo-parcel-003. Display name: "Kraken Train AI Campus — Fauquier, VA".

**Interviewer:** `site.parcelId: demo-parcel-003`, `site.displayName: Kraken Train AI Campus — Fauquier, VA`.

Noting that you mentioned EPRI DCFlex enrollment and recorded site control — both public-evidence territory. I won't write those fields from this conversation; Cartographer will surface them from `dcflex.epri.com` and the county land records.

Operational fields. Backup generation nameplate?

**Applicant:** 180 MW.

**Interviewer:** `backupGenMW: 180`. Hours?

**Applicant:** 8.

**Interviewer:** `backupGenHours: 8`. Battery nameplate?

**Applicant:** 36 MW.

**Interviewer:** `bessMW: 36`. Battery duration?

**Applicant:** 4 hours.

**Interviewer:** `bessHours: 4`. That places you in the 2–4h band.

Sensitive self-reports. Raw values stay on your machine; the utility only sees derived proofs. Your honest numbers produce the most accurate passport.

`flexPercent`?

**Applicant:** You heard me say "aggressive" — just write a high number.

**Interviewer:** I need the number from you. I won't pick one based on adjectives. What's your honest commit, 0–100?

**Applicant:** 34.

**Interviewer:** `flexPercent: 34`.

`redundancyShiftPercent`?

**Applicant:** 28.

**Interviewer:** `redundancyShiftPercent: 28`.

`internalScheduleConfidence` on 0.0–1.0? You said "very high" — I need a number.

**Applicant:** 0.81.

**Interviewer:** `internalScheduleConfidence: 0.81`.

`workloadMix` — training and inference shares?

**Applicant:** 0.78 training, 0.22 inference.

**Interviewer:** `workloadMix: { training: 0.78, inference: 0.22 }`. Sum checks.

---

**Proposed `CaseInput` (diff view):**

```json
{
  "applicantOrg": "Kraken Train",
  "site": {
    "state": "VA",
    "county": "Fauquier",
    "parcelId": "demo-parcel-003",
    "displayName": "Kraken Train AI Campus — Fauquier, VA"
  },
  "requestedMW": 240,
  "targetCOD": "2029-01-01",
  "phases": 3,
  "status": "draft",
  "privateProfile": {
    "flexPercent": 34,
    "redundancyShiftPercent": 28,
    "backupGenHours": 8,
    "backupGenMW": 180,
    "bessMW": 36,
    "bessHours": 4,
    "internalScheduleConfidence": 0.81,
    "workloadMix": { "training": 0.78, "inference": 0.22 }
  }
}
```

---

## What this example demonstrates

- **Prose-to-number refusal** — "just write a high number" is not a valid answer. The skill refuses to translate adjectives into numbers.
- **No softening of self-flattering prose** — "very high internal schedule confidence" does not become `0.90`; the applicant provides `0.81` themselves.
- **Public-evidence volunteer correctly deferred** — EPRI DCFlex enrollment and site control are mentioned and explicitly deferred to Cartographer.
- **Identity-block parsing works cleanly for well-structured prose** — the skill lifts all five identity fields in a single confirmation turn when prose is unambiguous.
