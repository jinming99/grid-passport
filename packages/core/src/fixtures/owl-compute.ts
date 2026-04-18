import type { CaseInput } from "../types";

export const owlCompute: CaseInput = {
  id: "req_owl_compute_001",
  caseId: "owl-compute",
  applicantOrg: "Owl Compute",
  site: {
    state: "VA",
    county: "Prince William",
    parcelId: "demo-parcel-001",
    displayName: "Owl Compute Campus — Prince William, VA",
  },
  requestedMW: 180,
  targetCOD: "2028-10-01",
  phases: 2,
  status: "submitted",
  privateProfile: {
    flexPercent: 22,
    redundancyShiftPercent: 12,
    backupGenHours: 6,
    backupGenMW: 140,
    bessMW: 11,
    bessHours: 4,
    internalScheduleConfidence: 0.68,
    workloadMix: {
      training: 0.55,
      inference: 0.45,
    },
  },
  publicEvidence: {
    floodRisk: "low",
    permitRisk: "medium",
    zoningRisk: "low",
    siteControlEvidence: true,
    sourceRefs: [
      {
        label: "VA DEQ — Issued air permits for data centers",
        url: "https://www.deq.virginia.gov/news-info/shortcuts/permits/air/issued-air-permits-for-data-centers",
      },
      {
        label: "Dominion — Facility Interconnection Requirements",
        url: "https://www.dominionenergy.com/-/media/content/large-business-services/pdfs/virginia/facility-interconnection-requirements.pdf",
      },
      {
        label: "VA SCC — Data center initiatives fact sheet (Feb 2026)",
        url: "https://www.scc.virginia.gov/media/sccvirginiagov-home/about-the-scc/fact-sheets/scc-data-center-initiatives-02-2026.pdf",
      },
    ],
    notes: [
      "Parcel sits outside FEMA 100-yr flood boundary.",
      "Air permit review expected; generator fleet size places application in moderate-complexity tier.",
      "Zoning compatible with by-right industrial use.",
    ],
  },
  policyVersion: "grid-passport-policy@0.1.0",
};
