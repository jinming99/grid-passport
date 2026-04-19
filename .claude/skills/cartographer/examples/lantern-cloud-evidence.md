# Example — Lantern Cloud public evidence

Worked example where the public record is **genuinely unfavorable**: partial 500-yr flood overlay, Tier-2 air permit pending, unrecorded site control. Demonstrates **multi-source disagreement handling**, **stale-record marking**, and **honest tiering without softening**.

Reference fixture: `packages/core/src/fixtures/lantern-cloud.ts`.

---

**Cartographer:** Confirming site. state=VA · county=Loudoun · parcelId=demo-parcel-002. Identity block present — proceeding.

**Fetches:**
- FEMA NFHL — Loudoun parcel viewer
- VA DEQ air-permits for data centers
- Loudoun County GIS — zoning overlay + SpEx docket
- VA Land Records (Loudoun clerk) — recorded instruments

**Classification:**

- `floodRisk: "medium"` — FEMA NFHL shows the parcel partially inside a 500-yr (Zone X shaded) overlay. Loudoun GIS shows the parcel outside the 100-yr boundary but the flood-area layer appears to disagree on the eastern edge. Per SOURCES.md rule for multi-source disagreement, pick the more conservative tier. Sources: FEMA NFHL + Loudoun GIS.
- `permitRisk: "high"` — DEQ docket shows a Tier-2 air-permit application would be required; generator fleet size exceeds Tier-1 threshold. Typical 14–22 month runway. Docket last updated 2026-02 (3 months stale as of this fetch). Source: VA DEQ air-permits.
- `zoningRisk: "medium"` — Loudoun's March 2025 rule eliminated by-right data-center development outside designated overlays. Parcel sits in a transitional zone requiring special exception; SpEx docket open but not yet adjudicated. Source: Loudoun GIS.
- `siteControlEvidence: false` — no recorded deed or option in applicant's name on file with Loudoun clerk. Applicant has an option-to-purchase, but it's not recorded. Source: VA Land Records.

**Notes (honest, not softened):**

1. "Site partially inside a 500-yr flood overlay; grading strategy unresolved." (cites FEMA NFHL)
2. "FEMA vs Loudoun GIS show a minor boundary disagreement at the eastern edge; conservative tier used." (cites both)
3. "Air permit application would require Tier-2 modeling; 14–22 month typical runway." (cites VA DEQ)
4. "DEQ docket last updated 2026-02; may not reflect current state." (cites VA DEQ)
5. "Site control via option-to-purchase; deed-of-trust not recorded." (cites VA Land Records)
6. "Loudoun post-March-2025 overlay: data-center use not by-right; SpEx pending." (cites Loudoun GIS)

---

**Proposed `publicEvidence` (diff view):**

```json
{
  "floodRisk": "medium",
  "permitRisk": "high",
  "zoningRisk": "medium",
  "siteControlEvidence": false,
  "sourceRefs": [
    {
      "label": "VA DEQ — Issued air permits for data centers",
      "url": "https://www.deq.virginia.gov/news-info/shortcuts/permits/air/issued-air-permits-for-data-centers"
    },
    {
      "label": "Loudoun County — Data-center zoning overlay"
    },
    {
      "label": "FEMA — National Flood Hazard Layer",
      "url": "https://www.fema.gov/flood-maps/national-flood-hazard-layer"
    }
  ],
  "notes": [
    "Site partially inside a 500-yr flood overlay; grading strategy unresolved.",
    "Air permit application would require Tier-2 modeling; 14–22 month typical runway.",
    "Site control via option-to-purchase; deed-of-trust not recorded."
  ]
}
```

(Compact view matches `lantern-cloud.ts`; the expanded transcript above shows the reasoning chain that produced it.)

---

## What this example demonstrates

- **Multi-source disagreement handling** — FEMA and Loudoun GIS conflict at the parcel edge; Cartographer picks the conservative tier and *names the disagreement in a note* so the disagreement is visible to the regulator rather than silently resolved.
- **Stale-record marking** — the DEQ docket is 3 months stale at fetch time; that fact is surfaced as its own note rather than masked.
- **Honest tiering** — `permitRisk: "high"` and `siteControlEvidence: false` are the true record states. Cartographer does not soften to `medium` / `true` to spare the applicant. An unfavorable record is the applicant's problem to address (via Explainer's narration + the applicant's own remediation), not Cartographer's to hide.
- **Post-rule-change cite** — the Loudoun post-March-2025 overlay is cited explicitly; Cartographer does not pretend the old by-right regime still applies.
- **No inference from one field to another** — the Tier-2 permit state does not cause Cartographer to flag zoning `high`; zoning is `medium` based on Loudoun's own record (SpEx pending is not the same as SpEx denied).
