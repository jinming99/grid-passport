# Example — Kraken Train public evidence

Worked example with **full recorded site control + EPRI DCFlex enrollment**. Demonstrates **multi-topic source reuse**, **applicant-uploaded document handling**, and the **hard boundary between evidence and derivation** (DCFlex enrollment is a *fact* cited in notes; it is **not** Cartographer's job to set the `derived.flexibilityPassport.responseClass`).

Reference fixture: `packages/core/src/fixtures/kraken-train.ts`.

---

**Cartographer:** Confirming site. state=VA · county=Fauquier · parcelId=demo-parcel-003. Identity block present — proceeding.

**Applicant:** One note — we have the recorded deed PDF locally; can you use it for site control?

**Cartographer:** Yes. Applicant-uploaded documents are cited as `{label: "applicant upload: <name>", url: "file://..."}`. Please attach the file.

**Applicant:** [attaches `deed-fauquier-2025.pdf`]

**Cartographer:** Accepted. The document shows a recorded deed of trust dated 2025-09, applicant named as grantee. Will cite as an applicant upload and cross-verify with VA Land Records (Fauquier clerk).

**Fetches:**
- FEMA NFHL — Fauquier parcel viewer
- VA DEQ air-permits
- Fauquier County GIS
- VA Land Records (Fauquier clerk) — cross-verify the deed
- EPRI DCFlex registry — operator enrollment state

**Classification:**

- `floodRisk: "low"` — parcel outside both 100-yr and 500-yr boundaries; rural sloped terrain. Source: FEMA NFHL.
- `permitRisk: "low"` — DEQ docket shows Tier-1 air permit sufficient; typical 8–12 month runway. Source: VA DEQ.
- `zoningRisk: "low"` — parcel zoned M-2, data-center use by-right. Source: Fauquier GIS.
- `siteControlEvidence: true` — applicant-uploaded deed PDF shows recorded grant; VA Land Records confirms the recording. Sources: applicant upload + VA Land Records.

**Notes:**

1. "Parcel surveyed; full site control recorded." (cites applicant upload + VA Land Records)
2. "Air permit tier expected at Tier-1; 8–12 month runway." (cites VA DEQ)
3. "Operator pre-enrolled for EPRI DCFlex demonstration." (cites EPRI DCFlex registry)

---

**Proposed `publicEvidence` (diff view):**

```json
{
  "floodRisk": "low",
  "permitRisk": "low",
  "zoningRisk": "low",
  "siteControlEvidence": true,
  "sourceRefs": [
    {
      "label": "EPRI DCFlex — Flex MOSAIC framework",
      "url": "https://dcflex.epri.com/flex-mosaic"
    },
    {
      "label": "Dominion — Facility Interconnection Requirements",
      "url": "https://www.dominionenergy.com/-/media/content/large-business-services/pdfs/virginia/facility-interconnection-requirements.pdf"
    },
    {
      "label": "Google — 1 GW data-center demand response (Mar 2026)",
      "url": "https://blog.google/innovation-and-ai/infrastructure-and-cloud/global-network/demand-response-data-center-milestone/"
    }
  ],
  "notes": [
    "Parcel surveyed; full site control recorded.",
    "Air permit tier expected at Tier-1; 8–12 month runway.",
    "Operator pre-enrolled for EPRI DCFlex demonstration."
  ]
}
```

---

## What this example demonstrates

- **Applicant-uploaded document handling** — the recorded deed PDF is accepted as a source and cited as `applicant upload: <name>` with a `file://` URL. Cartographer cross-verifies against VA Land Records rather than trusting the upload in isolation.
- **Multi-topic source reuse** — EPRI DCFlex URL supports both a `notes` entry (operator enrollment) and informational context for the downstream Forecaster, without Cartographer trying to *set* any derived field.
- **Hard boundary between fact and derivation** — DCFlex enrollment is a fact Cartographer cites; the actual `responseClass: "A" | "B" | "C"` classification remains Forecaster's (pure function) call. Cartographer does not tier up `responseClass` because DCFlex would be flattering.
- **All-low tiering is written cleanly when the record supports it** — Cartographer does not invent complications to look thorough. If the record is clean, the evidence is clean.
