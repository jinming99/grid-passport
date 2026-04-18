import type { CaseInput } from "../types";

export const krakenTrain: CaseInput = {
  id: "req_kraken_train_001",
  caseId: "kraken-train",
  applicantOrg: "Kraken Train",
  site: {
    state: "VA",
    county: "Fauquier",
    parcelId: "demo-parcel-003",
    displayName: "Kraken Train AI Campus — Fauquier, VA",
  },
  requestedMW: 240,
  targetCOD: "2029-01-01",
  phases: 3,
  status: "submitted",
  privateProfile: {
    flexPercent: 34,
    redundancyShiftPercent: 28,
    backupGenHours: 8,
    backupGenMW: 180,
    bessMW: 36,
    bessHours: 4,
    internalScheduleConfidence: 0.81,
    workloadMix: {
      training: 0.78,
      inference: 0.22,
    },
  },
  publicEvidence: {
    floodRisk: "low",
    permitRisk: "low",
    zoningRisk: "low",
    siteControlEvidence: true,
    sourceRefs: [
      {
        label: "EPRI DCFlex — Flex MOSAIC framework",
        url: "https://dcflex.epri.com/flex-mosaic",
      },
      {
        label: "Dominion — Facility Interconnection Requirements",
        url: "https://www.dominionenergy.com/-/media/content/large-business-services/pdfs/virginia/facility-interconnection-requirements.pdf",
      },
      {
        label: "Google — 1 GW data-center demand response (Mar 2026)",
        url: "https://blog.google/innovation-and-ai/infrastructure-and-cloud/global-network/demand-response-data-center-milestone/",
      },
    ],
    notes: [
      "Parcel surveyed; full site control recorded.",
      "Air permit tier expected at Tier-1; 8–12 month runway.",
      "Operator pre-enrolled for EPRI DCFlex demonstration.",
    ],
  },
  policyVersion: "grid-passport-policy@0.1.0",
};
