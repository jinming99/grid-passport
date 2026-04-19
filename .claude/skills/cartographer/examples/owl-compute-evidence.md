# Example — Owl Compute public evidence

Canonical worked example. Site: Prince William County, VA, parcel `demo-parcel-001`. Hyperscaler campus; mostly clean public record. Demonstrates the **baseline retrieval + provenance-attachment** path and the **no-adjacent-context inference** rule.

Reference fixture: `packages/core/src/fixtures/owl-compute.ts`.

---

**Cartographer:** Confirming site before fetch. state=VA · county=Prince William · parcelId=demo-parcel-001. Identity block present — proceeding.

**Fetches (mode: web-demo cache; desktop would hit live):**
- FEMA NFHL — parcel viewer at Prince William coordinates
- VA DEQ air-permits for data centers — search by applicant org + parcel
- Prince William County GIS — zoning district for parcel
- VA Land Records (Prince William clerk) — recorded instruments for parcel

**Classification:**

- `floodRisk: "low"` — parcel sits outside FEMA 100-yr AND 500-yr flood boundaries. Source: FEMA NFHL.
- `permitRisk: "medium"` — DEQ docket shows the generator fleet size places the filing in Tier-2 review territory; permit application expected but not yet adjudicated. Typical runway 14–22 months. Source: VA DEQ air-permits.
- `zoningRisk: "low"` — parcel zoned M-1, data-center use by-right. Source: Prince William GIS.
- `siteControlEvidence: true` — recorded deed in applicant's name on file with Prince William clerk. Source: VA Land Records.

**Notes (paraphrase of source content; every note cites its source):**

1. "Parcel sits outside FEMA 100-yr flood boundary." (cites FEMA NFHL)
2. "Air permit review expected; generator fleet size places application in moderate-complexity tier." (cites VA DEQ)
3. "Zoning compatible with by-right industrial use." (cites Prince William GIS)

---

**Proposed `publicEvidence` (diff view):**

```json
{
  "floodRisk": "low",
  "permitRisk": "medium",
  "zoningRisk": "low",
  "siteControlEvidence": true,
  "sourceRefs": [
    {
      "label": "VA DEQ — Issued air permits for data centers",
      "url": "https://www.deq.virginia.gov/news-info/shortcuts/permits/air/issued-air-permits-for-data-centers"
    },
    {
      "label": "Dominion — Facility Interconnection Requirements",
      "url": "https://www.dominionenergy.com/-/media/content/large-business-services/pdfs/virginia/facility-interconnection-requirements.pdf"
    },
    {
      "label": "VA SCC — Data center initiatives fact sheet (Feb 2026)",
      "url": "https://www.scc.virginia.gov/media/sccvirginiagov-home/about-the-scc/fact-sheets/scc-data-center-initiatives-02-2026.pdf"
    }
  ],
  "notes": [
    "Parcel sits outside FEMA 100-yr flood boundary.",
    "Air permit review expected; generator fleet size places application in moderate-complexity tier.",
    "Zoning compatible with by-right industrial use."
  ]
}
```

`privateProfile` untouched (Interviewer's scope). `derivedProof` untouched (Forecaster's scope). Identity untouched.

---

## What this example demonstrates

- **Baseline retrieval + classification** — the happy path: four fields fetched, four fields classified, every one cited.
- **No-adjacent-context inference** — the DEQ permit being `medium` does not cause Cartographer to flag zoning; those are separate sources with separate classifications. Each field traces to its own record.
- **Multi-field source reuse is OK** — a single DEQ URL can support both the `permitRisk` tier and a `notes` entry paraphrasing the permit state, as long as both read off the same record.
- **Dominion + SCC citations** — these are *informational* (not classified), but they ground the projection in the right regulatory frame. Both go in `sourceRefs[]` without being tied to a single classified field.
