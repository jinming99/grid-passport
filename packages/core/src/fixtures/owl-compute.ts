import type { CaseInput } from "../types";

export const owlCompute: CaseInput = {
  id: "req_owl_compute_001",
  caseId: "owl-compute",
  applicantOrg: "Owl Compute",
  site: {
    state: "VA",
    county: "Loudoun",
    parcelId: "demo-loudoun-001",
    displayName: "Owl Compute Campus — Loudoun, VA",
  },
  requestedMW: 180,
  targetCOD: "2027-09-01",
  phases: 2,
  status: "submitted",
  customerContact: {
    name: "Sarah Chen",
    email: "sarah.chen@owlcompute.example",
  },
  loadType: "data_center",
  connectionVoltageKV: 230,
  netMetered: false,
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
    // Layer-2 operational disclosures (the high-value forward-looking layer
    // that no DC shares on paper today). Drives the disclosure-aware
    // forecaster + the memory graph.
    forwardOperationalWindows: [
      {
        startUtc: "2026-05-15T18:00:00Z",
        endUtc: "2026-05-22T02:00:00Z",
        deltaMW: 70,
        ciPlusMinus: 10,
        confidence: 0.88,
        dailyDutyCycleHours: 16,
        repeats: "daily",
        workloadType: "training",
        sourceDocHash: "sha256:owl-train-cal-2026-05",
      },
    ],
    flexibilityEnvelope: {
      maxShedMW: 32,
      maxShedDurationMin: 115,
      rampRateMW_per_min: 8,
      noticeRequiredMin: 35,
      callsPerWeek: 2,
    },
    backupGenProfile: {
      transitionTimeSec: 5,
      capacityMW: 140,
      autoTriggerThresholdMW: 80,
      plannedTestWindows: [
        { startUtc: "2026-05-05T06:00:00Z", endUtc: "2026-05-05T08:00:00Z" },
        { startUtc: "2026-05-12T06:00:00Z", endUtc: "2026-05-12T08:00:00Z" },
        { startUtc: "2026-05-19T06:00:00Z", endUtc: "2026-05-19T08:00:00Z" },
        { startUtc: "2026-05-26T06:00:00Z", endUtc: "2026-05-26T08:00:00Z" },
      ],
    },
    failureModeProfile: {
      redundancyClass: "TierIV",
      P_dropGT100MW_24h: 0.004,
      P_dropGT500MW_24h: 0.0001,
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
