# Cartographer — Source Registry

Whitelist of public-record endpoints Cartographer is authorized to cite. URLs not listed here cannot appear in `publicEvidence.sourceRefs[]` (exception: applicant-uploaded documents, cited as `{label: "applicant upload: <name>", url: "file://<local>"}`).

Treat this file the way the Interviewer treats `REFERENCE.md`: load on demand; don't invent entries; if you need a source not listed, halt and ask the user to add it first. New source additions go through a human review — not the skill's runtime decision.

## Registry

### FEMA — National Flood Hazard Layer (NFHL)

- **URL:** https://www.fema.gov/flood-maps/national-flood-hazard-layer
- **Provides:** Flood-hazard tier for a parcel (Zones A / AE / X / 500-yr shaded).
- **Staleness expectation:** Map panels update on FEMA's LOMR cadence (typically 2–5 years per county).
- **Classification rule** → `public.floodRisk`:
  - Parcel entirely outside 500-yr overlay → `"low"`
  - Parcel partially inside 500-yr (Zone X shaded) OR within special flood hazard area (AE/A) but below base flood elevation → `"medium"`
  - Parcel entirely inside Zone A/AE OR coastal V zone → `"high"`
- **Notes:** If parcel crosses multiple zones, pick the most conservative (highest) tier and note the split.

### VA DEQ — Air Permits for Data Centers

- **URL:** https://www.deq.virginia.gov/news-info/shortcuts/permits/air/issued-air-permits-for-data-centers
- **Provides:** Air-permit state (issued / pending / denied) for listed facilities; generator fleet size; permit tier (1, 2, 3).
- **Staleness expectation:** Updated quarterly; DEQ's listing lags the actual docket by 1–3 months.
- **Classification rule** → `public.permitRisk`:
  - Tier 1 issued OR no permit required → `"low"`
  - Tier 2 pending OR Tier 1 under review OR complex-site flag → `"medium"`
  - Tier 2 denied / withdrawn / tier-3 required → `"high"`
- **Notes:** Tier-2 processing runway is typically 14–22 months per published DEQ timelines. Cite that runway in `public.notes` when writing `medium` or `high`.

### VA DEQ — Water Permits

- **URL:** https://www.deq.virginia.gov/permits/water
- **Provides:** VPDES / VWP permit state for a parcel.
- **Staleness expectation:** Updated continuously; typical 30–60 day lag for new actions.
- **Classification contribution:** Not its own field; surfaces in `public.notes` when a water permit is in play (e.g., impact to non-tidal wetland).

### Loudoun County GIS — Zoning Overlay

- **URL:** https://logis.loudoun.gov/
- **Provides:** Zoning district code for a parcel, special-exception docket state.
- **Staleness expectation:** Live with county GIS updates; typical ~1-week lag on SpEx actions.
- **Classification rule** → `public.zoningRisk`:
  - By-right zoning (PD-IP, I-3) OR already-granted SpEx → `"low"`
  - SpEx pending OR in transitional overlay → `"medium"`
  - Not permitted by-right AND no SpEx pending, OR in residential transitional zone OR in the Dec-2024 no-by-right overlay → `"high"`
- **Notes:** Loudoun's March 2025 rule change removed by-right data-center development outside designated overlays. Cite `"post-March-2025 Loudoun no-by-right overlay"` when that overlay applies.

### Prince William County GIS — Parcel Viewer

- **URL:** https://gisweb.pwcgov.org/
- **Provides:** Parcel boundaries, zoning district, recorded deed state, by-right vs SpEx status.
- **Staleness expectation:** Live; typical ~3-day lag on deed recordation.
- **Classification rule** → `public.zoningRisk`:
  - By-right M-1 / M-2 → `"low"`
  - Special-exception (SUP) pending → `"medium"`
  - Residential or agricultural zoning with no SUP in flight → `"high"`

### Fauquier County GIS — Parcel Viewer

- **URL:** https://www.fauquiercounty.gov/government/departments-h-z/gis
- **Provides:** Parcel boundaries, zoning, recorded instruments.
- **Staleness expectation:** ~weekly GIS refresh; deed recordation lag ~5 days.
- **Classification rule** → `public.zoningRisk`: same three-tier pattern as Prince William.

### VA Land Records (county-by-county clerks)

- **URL pattern:** `https://<county>.va.gov/clerk` or `https://vacra.land`
- **Provides:** Recorded deeds, options-to-purchase, leases, easements.
- **Staleness expectation:** ~3–7 days between recordation and online availability.
- **Classification rule** → `public.siteControlEvidence`:
  - Recorded deed of trust, option, or lease in applicant's name → `true`
  - Unrecorded option OR contract under negotiation → `false`
  - Applicant does not appear in recorded instruments for the parcel → `false`

### EPRI DCFlex — Flex MOSAIC registry

- **URL:** https://dcflex.epri.com/flex-mosaic
- **Provides:** Whether the site/operator is enrolled in the DCFlex demonstration; published MOSAIC response-class expectations.
- **Staleness expectation:** Quarterly.
- **Classification contribution:** Not a required field; surfaces in `public.notes` when relevant (e.g., "operator pre-enrolled for EPRI DCFlex demonstration"). Cartographer does not set the `derived.flexibilityPassport.responseClass` — that's Forecaster's scope — but DCFlex enrollment is a fact worth citing.

### Dominion — Facility Interconnection Requirements

- **URL:** https://www.dominionenergy.com/-/media/content/large-business-services/pdfs/virginia/facility-interconnection-requirements.pdf
- **Provides:** Utility-published requirements for interconnection studies; referenced in multiple fixtures as a sourceRef when the applicant is in Dominion territory.
- **Staleness expectation:** Annual.
- **Classification contribution:** Informational; cite in `public.notes` when a request touches Dominion-specific requirements (e.g., redundancy percentage conventions).

### Google — Data-Center Demand-Response Milestone (Mar 2026)

- **URL:** https://blog.google/innovation-and-ai/infrastructure-and-cloud/global-network/demand-response-data-center-milestone/
- **Provides:** Primary disclosure from Google on their 1 GW demand-response capability across AI data centers.
- **Staleness expectation:** One-off announcement post.
- **Classification contribution:** Informational; cite in `public.notes` when an applicant is enrolled in or benchmarking against operator-scale demand-response programs (the Kraken Train fixture uses this alongside EPRI DCFlex). Not a classification input for any risk tier.
- **Why whitelisted despite being a blog post:** This is a *primary* announcement from the operator themselves, not secondary coverage. The general SOURCES.md exclusion of "social media / news articles about a docket" means *articles about* third-party dockets; it does not exclude a principal's own public technical disclosure. If this distinction gets abused (applicants pointing Cartographer at favorable secondary coverage instead of primary records), tighten the policy.

### VA SCC — Data Center Initiatives Fact Sheet

- **URL:** https://www.scc.virginia.gov/media/sccvirginiagov-home/about-the-scc/fact-sheets/scc-data-center-initiatives-02-2026.pdf
- **Provides:** State-level regulatory context for large-load data-center interconnection (GS-5 rate class, queue-plan docket state).
- **Staleness expectation:** Refreshed quarterly.
- **Classification contribution:** Informational; cite in `public.notes` when the applicant's filing interacts with a specific SCC docket.

## Adding a new source

Pull request gate, not a runtime decision:

1. Verify the source is public (freely fetchable without authentication or payment).
2. Verify the source is authoritative (issued by the governing body for the field it supports, not a derivative aggregator).
3. Add an entry above with: URL, what-it-provides, staleness expectation, classification rule (raw record → risk tier where applicable).
4. If the source produces a new kind of field not already in `CaseInput.publicEvidence`, STOP — adding a new field requires running it through the `docs/vision.md` §4b 5-test filter first. That's a schema change, not a source change.
5. Update the Cartographer examples if the new source materially changes an example's expected output.
6. Run `pnpm --filter @grid-passport/agents validate:cartographer` to confirm the examples still pass with the new source URL whitelisted.

## Not in the registry (and why)

Enumerated for the research thesis honesty review:

- **Private aggregators (CoreLogic, ATTOM, etc.)** — not public; excluded. Applicants may have access but the regulator can't independently replay the fetch.
- **Google Maps / satellite imagery** — useful for siting intuition but not a permit-of-record or flood-of-record source; excluded to avoid substituting imagery judgment for docketed records.
- **LLM-generated summaries of the above** — explicitly excluded. Sources must be the primary record, not a model's rendering of it.
- **Paywalled legal research (Westlaw, Lexis)** — even if a law firm has access, the regulator cannot independently replay. Excluded.
- **Social media / news articles about a docket** — excluded. Use the docket itself.

This exclusion list is the operational expression of the provenance contract: a regulator with access only to this registry must be able to reproduce any Cartographer-written evidence.
