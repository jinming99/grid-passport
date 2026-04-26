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

export interface CustomerContact {
  name: string;
  email: string;
  phone?: string;
}

export type LoadType =
  | "data_center"
  | "industrial"
  | "manufacturing"
  | "other";

export interface WorkloadMix {
  training: number;
  inference: number;
}

// Layer-2 operational schema (forward-looking, what utilities can't get today).
// All four are private — utility never sees raw values; instead receives
// derived projections through the forecaster + memory-graph layer.
export interface ForwardOperationalWindow {
  startUtc: string;
  endUtc: string;
  deltaMW: number;
  ciPlusMinus: number;
  confidence: number;
  dailyDutyCycleHours: number;
  repeats: "none" | "daily" | "weekly";
  workloadType?: string;
  sourceDocHash?: string;
}

export interface FlexibilityEnvelope {
  maxShedMW: number;
  maxShedDurationMin: number;
  rampRateMW_per_min: number;
  noticeRequiredMin: number;
  callsPerWeek: number;
}

export interface PlannedTestWindow {
  startUtc: string;
  endUtc: string;
}

export interface BackupGenProfile {
  transitionTimeSec: number;
  capacityMW: number;
  autoTriggerThresholdMW: number;
  plannedTestWindows: PlannedTestWindow[];
}

export type RedundancyClass = "TierI" | "TierII" | "TierIII" | "TierIV";

export interface FailureModeProfile {
  redundancyClass: RedundancyClass;
  P_dropGT100MW_24h: number;
  P_dropGT500MW_24h: number;
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
  // Layer-2 operational additions (optional for backward-compat with existing fixtures).
  forwardOperationalWindows?: ForwardOperationalWindow[];
  flexibilityEnvelope?: FlexibilityEnvelope;
  backupGenProfile?: BackupGenProfile;
  failureModeProfile?: FailureModeProfile;
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
  // Baseline-filing fields (ERCOT-precedent additions). All public class —
  // appear in every role's view. Captured in the Interviewer's Round 2.
  customerContact: CustomerContact;
  loadType: LoadType;
  connectionVoltageKV: number;
  netMetered: boolean;
  nettedGenerationStation?: string;
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
  | "request.customerContact"
  | "request.loadType"
  | "request.connectionVoltageKV"
  | "request.netMetered"
  | "private.flexPercent"
  | "private.redundancyShiftPercent"
  | "private.backupGenHours"
  | "private.backupGenMW"
  | "private.bessMW"
  | "private.bessHours"
  | "private.internalScheduleConfidence"
  | "private.workloadMix"
  | "private.forwardOperationalWindows"
  | "private.flexibilityEnvelope"
  | "private.backupGenProfile"
  | "private.failureModeProfile"
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
