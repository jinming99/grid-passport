import { POLICY, POLICY_VERSION } from "./policy";
import type {
  BackupGenProfile,
  CustomerContact,
  FailureModeProfile,
  FieldClass,
  FieldPath,
  FlexibilityEnvelope,
  FlexibilityPassport,
  ForwardOperationalWindow,
  LoadType,
  ReadinessClass,
  RequestRecord,
  RiskClass,
  Role,
  SiteContext,
  SourceRef,
  WorkloadMix,
} from "./types";

export interface ProjectedField<T> {
  path: FieldPath;
  label: string;
  class: FieldClass;
  visible: boolean;
  value: T | null;
  redactionReason: string;
}

export interface ProjectedView {
  role: Role;
  caseId: string;
  requestId: string;
  policyVersion: string;
  header: {
    applicantOrg: ProjectedField<string>;
    requestedMW: ProjectedField<number>;
    targetCOD: ProjectedField<string>;
    phases: ProjectedField<number>;
    site: ProjectedField<SiteContext>;
    customerContact: ProjectedField<CustomerContact>;
    loadType: ProjectedField<LoadType>;
    connectionVoltageKV: ProjectedField<number>;
    netMetered: ProjectedField<boolean>;
  };
  privateProfile: {
    flexPercent: ProjectedField<number>;
    redundancyShiftPercent: ProjectedField<number>;
    backupGenHours: ProjectedField<number>;
    backupGenMW: ProjectedField<number>;
    bessMW: ProjectedField<number>;
    bessHours: ProjectedField<number>;
    internalScheduleConfidence: ProjectedField<number>;
    workloadMix: ProjectedField<WorkloadMix>;
    forwardOperationalWindows: ProjectedField<ForwardOperationalWindow[]>;
    flexibilityEnvelope: ProjectedField<FlexibilityEnvelope>;
    backupGenProfile: ProjectedField<BackupGenProfile>;
    failureModeProfile: ProjectedField<FailureModeProfile>;
  };
  publicEvidence: {
    floodRisk: ProjectedField<RiskClass>;
    permitRisk: ProjectedField<RiskClass>;
    zoningRisk: ProjectedField<RiskClass>;
    siteControlEvidence: ProjectedField<boolean>;
    sourceRefs: ProjectedField<SourceRef[]>;
    notes: ProjectedField<string[]>;
  };
  derivedProof: {
    firmnessScore: ProjectedField<number>;
    expectedPeakMW: ProjectedField<[number, number]>;
    flexibilityPassport: ProjectedField<FlexibilityPassport>;
    siteReadinessClass: ProjectedField<ReadinessClass>;
    energizationBand: ProjectedField<string>;
    costExposureClass: ProjectedField<RiskClass>;
    topBlockers: ProjectedField<string[]>;
  };
  stats: {
    hiddenCount: number;
    visibleCount: number;
    totalClassified: number;
    releasedProofCount: number;
  };
}

function field<T>(
  path: FieldPath,
  value: T,
  role: Role,
): ProjectedField<T> {
  const entry = POLICY[path];
  const visible = entry.visibleTo.includes(role);
  return {
    path,
    label: entry.label,
    class: entry.class,
    visible,
    value: visible ? value : null,
    redactionReason: visible ? "" : entry.redactionReason,
  };
}

export function projectForRole(
  req: RequestRecord,
  role: Role,
): ProjectedView {
  const view: ProjectedView = {
    role,
    caseId: req.caseId,
    requestId: req.id,
    policyVersion: POLICY_VERSION,
    header: {
      applicantOrg: field("request.applicantOrg", req.applicantOrg, role),
      requestedMW: field("request.requestedMW", req.requestedMW, role),
      targetCOD: field("request.targetCOD", req.targetCOD, role),
      phases: field("request.phases", req.phases, role),
      site: field("request.site", req.site, role),
      customerContact: field(
        "request.customerContact",
        req.customerContact,
        role,
      ),
      loadType: field("request.loadType", req.loadType, role),
      connectionVoltageKV: field(
        "request.connectionVoltageKV",
        req.connectionVoltageKV,
        role,
      ),
      netMetered: field("request.netMetered", req.netMetered, role),
    },
    privateProfile: {
      flexPercent: field(
        "private.flexPercent",
        req.privateProfile.flexPercent,
        role,
      ),
      redundancyShiftPercent: field(
        "private.redundancyShiftPercent",
        req.privateProfile.redundancyShiftPercent,
        role,
      ),
      backupGenHours: field(
        "private.backupGenHours",
        req.privateProfile.backupGenHours,
        role,
      ),
      backupGenMW: field(
        "private.backupGenMW",
        req.privateProfile.backupGenMW,
        role,
      ),
      bessMW: field("private.bessMW", req.privateProfile.bessMW, role),
      bessHours: field(
        "private.bessHours",
        req.privateProfile.bessHours,
        role,
      ),
      internalScheduleConfidence: field(
        "private.internalScheduleConfidence",
        req.privateProfile.internalScheduleConfidence,
        role,
      ),
      workloadMix: field(
        "private.workloadMix",
        req.privateProfile.workloadMix,
        role,
      ),
      forwardOperationalWindows: field<ForwardOperationalWindow[]>(
        "private.forwardOperationalWindows",
        req.privateProfile.forwardOperationalWindows ?? [],
        role,
      ),
      flexibilityEnvelope: field<FlexibilityEnvelope>(
        "private.flexibilityEnvelope",
        req.privateProfile.flexibilityEnvelope ?? {
          maxShedMW: 0,
          maxShedDurationMin: 0,
          rampRateMW_per_min: 0,
          noticeRequiredMin: 0,
          callsPerWeek: 0,
        },
        role,
      ),
      backupGenProfile: field<BackupGenProfile>(
        "private.backupGenProfile",
        req.privateProfile.backupGenProfile ?? {
          transitionTimeSec: 0,
          capacityMW: 0,
          autoTriggerThresholdMW: 0,
          plannedTestWindows: [],
        },
        role,
      ),
      failureModeProfile: field<FailureModeProfile>(
        "private.failureModeProfile",
        req.privateProfile.failureModeProfile ?? {
          redundancyClass: "TierIII",
          P_dropGT100MW_24h: 0,
          P_dropGT500MW_24h: 0,
        },
        role,
      ),
    },
    publicEvidence: {
      floodRisk: field(
        "public.floodRisk",
        req.publicEvidence.floodRisk,
        role,
      ),
      permitRisk: field(
        "public.permitRisk",
        req.publicEvidence.permitRisk,
        role,
      ),
      zoningRisk: field(
        "public.zoningRisk",
        req.publicEvidence.zoningRisk,
        role,
      ),
      siteControlEvidence: field(
        "public.siteControlEvidence",
        req.publicEvidence.siteControlEvidence,
        role,
      ),
      sourceRefs: field(
        "public.sourceRefs",
        req.publicEvidence.sourceRefs,
        role,
      ),
      notes: field("public.notes", req.publicEvidence.notes, role),
    },
    derivedProof: {
      firmnessScore: field(
        "derived.firmnessScore",
        req.derivedProof.firmnessScore,
        role,
      ),
      expectedPeakMW: field(
        "derived.expectedPeakMW",
        req.derivedProof.expectedPeakMW,
        role,
      ),
      flexibilityPassport: field(
        "derived.flexibilityPassport",
        req.derivedProof.flexibilityPassport,
        role,
      ),
      siteReadinessClass: field(
        "derived.siteReadinessClass",
        req.derivedProof.siteReadinessClass,
        role,
      ),
      energizationBand: field(
        "derived.energizationBand",
        req.derivedProof.energizationBand,
        role,
      ),
      costExposureClass: field(
        "derived.costExposureClass",
        req.derivedProof.costExposureClass,
        role,
      ),
      topBlockers: field(
        "derived.topBlockers",
        req.derivedProof.topBlockers,
        role,
      ),
    },
    stats: { hiddenCount: 0, visibleCount: 0, totalClassified: 0, releasedProofCount: 0 },
  };

  const allFields: ProjectedField<unknown>[] = [
    ...Object.values(view.header),
    ...Object.values(view.privateProfile),
    ...Object.values(view.publicEvidence),
    ...Object.values(view.derivedProof),
  ];
  view.stats.totalClassified = allFields.length;
  view.stats.visibleCount = allFields.filter((f) => f.visible).length;
  view.stats.hiddenCount = allFields.filter((f) => !f.visible).length;
  view.stats.releasedProofCount = Object.values(view.derivedProof).filter(
    (f) => f.visible,
  ).length;

  return view;
}
