# Interviewer — Field Reference

The `CaseInput` field catalog as seen by the Interviewer skill. Mirrored from `@grid-passport/core/ask-reasons` (which is the source of truth); if this drifts, prefer the core file and update this one.

Load this reference on demand — when the applicant asks about a specific field, or when the skill needs to cite a range hint.

## Bucketing

Every field path in `CaseInput` is assigned one of five buckets. The Interviewer writes only into the first three.

| Bucket | Interviewer write scope | Meaning |
|---|---|---|
| `identity` | writable from confirmed prose | What anyone asking about the filing would need. |
| `operational` | writable via numbered-question confirmation | Ops detail; private but not competitively sensitive. |
| `sensitive` | writable via explicit confirmation + competitive-sensitivity acknowledgment | Would not appear in a PDF handover; never released raw. |
| `evidence` | **not writable by Interviewer** (Cartographer's beat) | Public records; the applicant may upload, or Cartographer fetches. |
| `computed` | **not writable by Interviewer** (Forecaster / Referee) | Derived proofs; pure functions, no LLM. |

## Identity bucket

| Field path | Type | Example | Ask-reason |
|---|---|---|---|
| `request.applicantOrg` | string | `"Owl Compute"` | Who is filing. Utilities need the counterparty to open a docket. |
| `request.requestedMW` | number (MW) | `180` | How much capacity you're asking for. Drives tier selection in the queue and informs the expected peak band. |
| `request.targetCOD` | string (ISO date) | `"2028-10-01"` | Target commercial operation date. Sets the energization band and the deadline against which the utility plans upstream work. |
| `request.phases` | integer 1–4 | `2` | How the load comes online in tranches. Affects the time-shape of the utility's staging. Flag any value outside 1–4. |
| `request.site.state` | string (2-letter) | `"VA"` | U.S. state. |
| `request.site.county` | string | `"Prince William"` | County name. Common VA data-center counties: Loudoun, Prince William, Fauquier, Spotsylvania, Stafford. |
| `request.site.parcelId` | string | `"demo-parcel-001"` | Parcel identifier. If not stated, ask; do not invent a placeholder. |
| `request.site.displayName` | string | `"Owl Compute Campus — Prince William, VA"` | Human-readable site label. Compose from applicantOrg + county + state if not stated; confirm with user. |

## Operational bucket (numbered confirmation)

Ask each of these as a direct numeric question. Provide a range hint only after the applicant has given a value or explicitly asked for one. Never suggest a value first.

| Field path | Type | Range hint | Ask-reason |
|---|---|---|---|
| `private.backupGenMW` | number (MW) | Typical: 50–80% of `requestedMW` for data-center backup | Nameplate of on-site generation. Paired with hours for firmness; released only as a derived signal. |
| `private.backupGenHours` | number (hours) | Typical: 4–12 hours | How many hours your on-site generation can carry load. Feeds firmness score. |
| `private.bessMW` | number (MW) | Typical: 5–20% of `requestedMW` if present | Battery nameplate. |
| `private.bessHours` | number (hours) | Coarse bands: 2–4h / 4–8h / 8–12h | Battery duration. **Released only as a coarse tier band so the published band is many-to-one over the raw value.** |

## Sensitive bucket (explicit confirmation + acknowledgment)

For **each** of these fields, the skill must say verbatim (or equivalent): *"This is a competitively-sensitive self-report. The raw value stays on your machine; the utility only ever sees a derived proof. Your honest number produces the most accurate passport."* Then ask.

Range hints are fine after the applicant answers or asks. **Never offer a default. Never infer from prose.**

| Field path | Type | Range hint | Ask-reason |
|---|---|---|---|
| `private.flexPercent` | number (0–100) | Typical: 5–40%, 0 if none committed | Share of load you can shed when the grid is stressed. Produces the flexibility passport the utility plans against. The raw number is competitive — it implies how your scheduler allocates compute — so we seal it and release only the derived passport. |
| `private.redundancyShiftPercent` | number (0–100) | Typical: 0–30% | Share of load you can shift to a redundant site in another region. Tells the utility something about firmness without revealing your multi-site strategy. Feeds firmness score; never released raw. |
| `private.internalScheduleConfidence` | number (0.0–1.0) | Typical range: 0.50–0.85 | How firm your internal build schedule is. The utility uses it to calibrate the energization band. A raw number here would expose how shaky your plan is — so we seal it and let the forecaster fold it into the band width. |
| `private.workloadMix.training` | number (0.0–1.0) | Training share of compute | Training-vs-inference share; probably the most competitively sensitive field. Hyperscalers track this ratio closely. |
| `private.workloadMix.inference` | number (0.0–1.0) | Inference share; must satisfy `training + inference ≈ 1.0` | Inference share. Validate: both values sum to ~1.0; if not, surface the discrepancy and ask the applicant to fix. |

## Evidence bucket (NOT writable by Interviewer)

These are Cartographer's. If the applicant offers a value for one of these during intake (e.g., "I have the FEMA flood tier — it's low"), the Interviewer says: *"Noted — that's public-evidence territory. Cartographer (or a manual upload) will populate that section after intake. I won't write it from this conversation."*

Paths: `public.floodRisk`, `public.permitRisk`, `public.zoningRisk`, `public.siteControlEvidence`, `public.sourceRefs`, `public.notes`.

## Computed bucket (NOT writable by Interviewer)

These are Forecaster's (`firmnessScore`, `expectedPeakMW`, `flexibilityPassport`, `siteReadinessClass`, `energizationBand`, `costExposureClass`, `topBlockers`). Pure functions over `CaseInput`. The Interviewer never touches these; mentioning them to the applicant as "these will be computed downstream once the form is complete" is fine.

## Common mistakes to avoid

These correspond to the five checks in the SKILL.md "Trust constraints (operational summary)":

1. **Writing `floodRisk` or `permitRisk` because the applicant mentioned it.** → Not your scope. Defer to Cartographer.
2. **Inferring `internalScheduleConfidence: 0.75` because the applicant said "pretty confident."** → Ask for the number.
3. **Suggesting "how about 0.7 for schedule confidence?" before the applicant answers.** → Violation of non-coaching rule.
4. **Answering "would it look better if I said 0.8 instead of 0.65?"** → Refuse and explain.
5. **Filling `parcelId` with a placeholder like `"TBD"`.** → Ask. If the applicant doesn't have one, leave unset.

## Version

Source of truth: `packages/core/src/ask-reasons.ts`. Last synced from `@grid-passport/core` at scaffold (2026-04-18). If a field is added to `FieldPath` without updating this reference, the validator will flag an unknown path.
