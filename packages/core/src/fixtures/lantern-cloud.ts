import type { CaseInput } from "../types";

export const lanternCloud: CaseInput = {
  id: "req_lantern_cloud_001",
  caseId: "lantern-cloud",
  applicantOrg: "Lantern Cloud",
  site: {
    state: "VA",
    county: "Loudoun",
    parcelId: "demo-parcel-002",
    displayName: "Lantern Cloud Phase II — Loudoun, VA",
  },
  requestedMW: 95,
  targetCOD: "2028-04-01",
  phases: 1,
  status: "submitted",
  customerContact: {
    name: "Theo Park",
    email: "theo.park@lanterncloud.example",
  },
  loadType: "data_center",
  connectionVoltageKV: 138,
  netMetered: false,
  privateProfile: {
    flexPercent: 9,
    redundancyShiftPercent: 4,
    backupGenHours: 4,
    backupGenMW: 72,
    bessMW: 4,
    bessHours: 2,
    internalScheduleConfidence: 0.55,
    workloadMix: {
      training: 0.25,
      inference: 0.75,
    },
  },
  publicEvidence: {
    floodRisk: "medium",
    permitRisk: "high",
    zoningRisk: "medium",
    siteControlEvidence: false,
    sourceRefs: [
      {
        label: "VA DEQ — Issued air permits for data centers",
        url: "https://www.deq.virginia.gov/news-info/shortcuts/permits/air/issued-air-permits-for-data-centers",
      },
      {
        label: "Loudoun County — Data-center zoning overlay",
      },
      {
        label: "FEMA — National Flood Hazard Layer",
        url: "https://www.fema.gov/flood-maps/national-flood-hazard-layer",
      },
    ],
    notes: [
      "Site partially inside a 500-yr flood overlay; grading strategy unresolved.",
      "Air permit application would require Tier-2 modeling; 14–22 month typical runway.",
      "Site control via option-to-purchase; deed-of-trust not recorded.",
    ],
  },
  policyVersion: "grid-passport-policy@0.1.0",
};
