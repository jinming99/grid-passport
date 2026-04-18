export type FieldClass = "public" | "private" | "derived";
export type Role = "applicant" | "utility" | "regulator";
export type RiskClass = "low" | "medium" | "high";
export type ReadinessClass = "red" | "yellow" | "green";
export type FlexResponseClass = "A" | "B" | "C";
export type RequestStatus = "draft" | "submitted" | "reviewed" | "approved";

export interface SiteContext {
  state: string;
  county: string;
  parcelId: string;
  displayName: string;
}

export interface WorkloadMix {
  training: number;
  inference: number;
}

export interface PrivateProfile {
  flexPercent: number;
  redundancyShiftPercent: number;
  backupGenHours: number;
  backupGenMW: number;
  bessMW: number;
  bessHours: number;
  internalScheduleConfidence: number;
  workloadMix: WorkloadMix;
}

export interface SourceRef {
  label: string;
  url?: string;
}

export interface PublicEvidence {
  floodRisk: RiskClass;
  permitRisk: RiskClass;
  zoningRisk: RiskClass;
  siteControlEvidence: boolean;
  sourceRefs: SourceRef[];
  notes: string[];
}

export interface FlexibilityPassport {
  mwMin: number;
  mwMax: number;
  durationHoursMin: number;
  durationHoursMax: number;
  responseClass: FlexResponseClass;
}

export interface DerivedProof {
  firmnessScore: number;
  expectedPeakMW: [number, number];
  flexibilityPassport: FlexibilityPassport;
  siteReadinessClass: ReadinessClass;
  energizationBand: string;
  costExposureClass: RiskClass;
  topBlockers: string[];
  generatedFromPolicyVersion: string;
}

export interface CaseInput {
  id: string;
  caseId: string;
  applicantOrg: string;
  site: SiteContext;
  requestedMW: number;
  targetCOD: string;
  phases: number;
  status: RequestStatus;
  privateProfile: PrivateProfile;
  publicEvidence: PublicEvidence;
  policyVersion: string;
}

export interface RequestRecord extends CaseInput {
  derivedProof: DerivedProof;
}

export interface ScenarioOverride {
  flexPercent?: number;
}

export type FieldPath =
  | "request.requestedMW"
  | "request.targetCOD"
  | "request.phases"
  | "request.applicantOrg"
  | "request.site"
  | "private.flexPercent"
  | "private.redundancyShiftPercent"
  | "private.backupGenHours"
  | "private.backupGenMW"
  | "private.bessMW"
  | "private.bessHours"
  | "private.internalScheduleConfidence"
  | "private.workloadMix"
  | "public.floodRisk"
  | "public.permitRisk"
  | "public.zoningRisk"
  | "public.siteControlEvidence"
  | "public.sourceRefs"
  | "public.notes"
  | "derived.firmnessScore"
  | "derived.expectedPeakMW"
  | "derived.flexibilityPassport"
  | "derived.siteReadinessClass"
  | "derived.energizationBand"
  | "derived.costExposureClass"
  | "derived.topBlockers";

export interface FieldDescriptor {
  path: FieldPath;
  label: string;
  class: FieldClass;
  visibleTo: Role[];
  redactionReason?: string;
}
