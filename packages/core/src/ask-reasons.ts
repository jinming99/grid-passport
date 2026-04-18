import type { FieldPath } from "./types";

// Five bucketing labels, driven by the 5-test filter documented in
// docs/vision.md §4b ("What we ask applicants, and why").
//
// - identity    — tier 1, what anyone could ask; always visible
// - operational — tier 2, private but not competitively sensitive
// - sensitive   — tier 3, competitive; visibly redacted in review mode
// - evidence    — public evidence (Cartographer's beat; applicant may provide)
// - computed    — derived proof; computed by Forecaster, not asked
//
// The desktop UI groups `private` into `operational` vs `sensitive` sub-sections
// to make the demo narrative legible: "stuff you'd disclose anyway" vs
// "stuff you'd never put in a PDF."
export type FieldBucket =
  | "identity"
  | "operational"
  | "sensitive"
  | "evidence"
  | "computed";

export interface AskInfo {
  bucket: FieldBucket;
  why: string;
}

export const ASK_INFO: Record<FieldPath, AskInfo> = {
  "request.applicantOrg": {
    bucket: "identity",
    why: "Who is filing. Utilities need the counterparty to open a docket.",
  },
  "request.requestedMW": {
    bucket: "identity",
    why: "How much capacity you're asking for. Drives tier selection in the queue and informs the expected peak band.",
  },
  "request.targetCOD": {
    bucket: "identity",
    why: "Target commercial operation date. Sets the energization band and the deadline against which the utility plans upstream work.",
  },
  "request.phases": {
    bucket: "identity",
    why: "How the load comes online in tranches. Affects the time-shape of the utility's staging.",
  },
  "request.site": {
    bucket: "identity",
    why: "Parcel identity. Binds the request to a specific point on the grid; also unlocks public-evidence lookups (flood, permits, zoning).",
  },

  "private.flexPercent": {
    bucket: "sensitive",
    why: "Share of load you can shed when the grid is stressed. Produces the flexibility passport the utility plans against. The raw number is competitive — it implies how your scheduler allocates compute — so we seal it and release only the derived passport.",
  },
  "private.redundancyShiftPercent": {
    bucket: "sensitive",
    why: "Share of load you can shift to a redundant site in another region. Tells the utility something about firmness without revealing your multi-site strategy. Feeds firmness score; never released raw.",
  },
  "private.backupGenHours": {
    bucket: "operational",
    why: "How many hours your on-site generation can carry load. Feeds firmness score. Operational detail; sealed because there's no reason the utility needs the raw number.",
  },
  "private.backupGenMW": {
    bucket: "operational",
    why: "Nameplate of your on-site generation. Paired with hours for firmness; released only as a derived signal.",
  },
  "private.bessMW": {
    bucket: "operational",
    why: "Battery nameplate. Paired with BESS hours to place you in a flexibility-passport duration band.",
  },
  "private.bessHours": {
    bucket: "operational",
    why: "Battery duration. Released only as a coarse tier band (2–4h / 4–8h / 8–12h) so the published band is many-to-one over the raw value.",
  },
  "private.internalScheduleConfidence": {
    bucket: "sensitive",
    why: "How firm your internal build schedule is. The utility uses it to calibrate the energization band. A raw number here would expose how shaky your plan is — so we seal it and let the forecaster fold it into the band width.",
  },
  "private.workloadMix": {
    bucket: "sensitive",
    why: "Training vs inference share. Probably the most competitively sensitive field — the ratio is something hyperscalers track closely. Feeds cost-exposure class; never released.",
  },

  "public.floodRisk": {
    bucket: "evidence",
    why: "FEMA flood-hazard tier for the parcel. Public record; Cartographer fetches it — we show the value with provenance so you can verify.",
  },
  "public.permitRisk": {
    bucket: "evidence",
    why: "Air-permit and zoning-permit risk from VA DEQ and the county docket. Public record; the applicant may upload or Cartographer fetches.",
  },
  "public.zoningRisk": {
    bucket: "evidence",
    why: "Whether the parcel's zoning class permits this use by-right, by special exception, or not at all. Public record.",
  },
  "public.siteControlEvidence": {
    bucket: "evidence",
    why: "Recorded title, option, or lease that binds the applicant to the parcel. Public record in county land records.",
  },
  "public.sourceRefs": {
    bucket: "evidence",
    why: "Citations backing the public-evidence values. Keeps the projection verifiable — each evidence value traces to a source URL.",
  },
  "public.notes": {
    bucket: "evidence",
    why: "Human-readable notes that accompany the evidence. Added by the applicant or surfaced by Cartographer.",
  },

  "derived.firmnessScore": {
    bucket: "computed",
    why: "Computed 0–100 score summarizing how reliably the load will be there. Composed from flex, redundancy, backup, BESS. The score is released; the components are not.",
  },
  "derived.expectedPeakMW": {
    bucket: "computed",
    why: "Forecaster's band of expected peak draw in MW. Computed; released.",
  },
  "derived.flexibilityPassport": {
    bucket: "computed",
    why: "EPRI-MOSAIC-style flexibility descriptor: MW band, duration band, response class. The utility's primary planning input from flexible loads.",
  },
  "derived.siteReadinessClass": {
    bucket: "computed",
    why: "Rolled-up readiness tier (green / yellow / red) from the public evidence. The applicant sees this before they submit — it flags issues worth fixing first.",
  },
  "derived.energizationBand": {
    bucket: "computed",
    why: "Earliest credible energization window, given the request and the readiness signals. Computed; released.",
  },
  "derived.costExposureClass": {
    bucket: "computed",
    why: "Risk tier on how cost-exposed the applicant is under the new rate classes. Computed; released.",
  },
  "derived.topBlockers": {
    bucket: "computed",
    why: "Concrete next actions the applicant can take to improve readiness. Computed from the evidence; released as the actionable summary.",
  },
};

export function askInfoFor(path: FieldPath): AskInfo {
  return ASK_INFO[path];
}
