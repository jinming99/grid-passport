import type { FieldClass, FieldPath, Role } from "@/lib/types";

interface PolicyEntry {
  class: FieldClass;
  visibleTo: Role[];
  label: string;
  redactionReason: string;
}

const ALL: Role[] = ["applicant", "utility", "regulator"];
const APPLICANT_ONLY: Role[] = ["applicant"];

export const POLICY_VERSION = "grid-passport-policy@0.1.0";

export const POLICY: Record<FieldPath, PolicyEntry> = {
  "request.applicantOrg": {
    class: "public",
    visibleTo: ALL,
    label: "Applicant",
    redactionReason: "",
  },
  "request.requestedMW": {
    class: "public",
    visibleTo: ALL,
    label: "Requested capacity (MW)",
    redactionReason: "",
  },
  "request.targetCOD": {
    class: "public",
    visibleTo: ALL,
    label: "Target COD",
    redactionReason: "",
  },
  "request.phases": {
    class: "public",
    visibleTo: ALL,
    label: "Build phases",
    redactionReason: "",
  },
  "request.site": {
    class: "public",
    visibleTo: ALL,
    label: "Site",
    redactionReason: "",
  },

  "private.flexPercent": {
    class: "private",
    visibleTo: APPLICANT_ONLY,
    label: "% deferrable workload",
    redactionReason:
      "Raw flex % is sealed. Utility sees the derived flexibility passport.",
  },
  "private.redundancyShiftPercent": {
    class: "private",
    visibleTo: APPLICANT_ONLY,
    label: "% shiftable to redundant sites",
    redactionReason: "Raw redundancy ratio is sealed; feeds derived proofs only.",
  },
  "private.backupGenHours": {
    class: "private",
    visibleTo: APPLICANT_ONLY,
    label: "Backup generation (hours)",
    redactionReason: "Backup detail feeds derived proofs only.",
  },
  "private.backupGenMW": {
    class: "private",
    visibleTo: APPLICANT_ONLY,
    label: "Backup generation (MW)",
    redactionReason: "Backup detail feeds derived proofs only.",
  },
  "private.bessMW": {
    class: "private",
    visibleTo: APPLICANT_ONLY,
    label: "BESS capacity (MW)",
    redactionReason: "BESS detail feeds derived proofs only.",
  },
  "private.bessHours": {
    class: "private",
    visibleTo: APPLICANT_ONLY,
    label: "BESS duration (hours)",
    redactionReason: "BESS detail feeds derived proofs only.",
  },
  "private.internalScheduleConfidence": {
    class: "private",
    visibleTo: APPLICANT_ONLY,
    label: "Internal schedule confidence",
    redactionReason:
      "Roadmap confidence stays sealed; utility receives a firmness score instead.",
  },
  "private.workloadMix": {
    class: "private",
    visibleTo: APPLICANT_ONLY,
    label: "Workload mix",
    redactionReason: "Training/inference mix is sealed.",
  },

  "public.floodRisk": {
    class: "public",
    visibleTo: ALL,
    label: "Flood risk",
    redactionReason: "",
  },
  "public.permitRisk": {
    class: "public",
    visibleTo: ALL,
    label: "Permit risk",
    redactionReason: "",
  },
  "public.zoningRisk": {
    class: "public",
    visibleTo: ALL,
    label: "Zoning risk",
    redactionReason: "",
  },
  "public.siteControlEvidence": {
    class: "public",
    visibleTo: ALL,
    label: "Site control evidence",
    redactionReason: "",
  },
  "public.sourceRefs": {
    class: "public",
    visibleTo: ALL,
    label: "Sources",
    redactionReason: "",
  },
  "public.notes": {
    class: "public",
    visibleTo: ALL,
    label: "Evidence notes",
    redactionReason: "",
  },

  "derived.firmnessScore": {
    class: "derived",
    visibleTo: ALL,
    label: "Firmness score",
    redactionReason: "",
  },
  "derived.expectedPeakMW": {
    class: "derived",
    visibleTo: ALL,
    label: "Expected peak band (MW)",
    redactionReason: "",
  },
  "derived.flexibilityPassport": {
    class: "derived",
    visibleTo: ALL,
    label: "Flexibility passport",
    redactionReason: "",
  },
  "derived.siteReadinessClass": {
    class: "derived",
    visibleTo: ALL,
    label: "Site readiness",
    redactionReason: "",
  },
  "derived.energizationBand": {
    class: "derived",
    visibleTo: ALL,
    label: "Earliest energization band",
    redactionReason: "",
  },
  "derived.costExposureClass": {
    class: "derived",
    visibleTo: ALL,
    label: "Cost exposure class",
    redactionReason: "",
  },
  "derived.topBlockers": {
    class: "derived",
    visibleTo: ALL,
    label: "Top blockers",
    redactionReason: "",
  },
};

export function isVisible(path: FieldPath, role: Role): boolean {
  return POLICY[path].visibleTo.includes(role);
}
