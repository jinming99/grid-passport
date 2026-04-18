import { POLICY_VERSION } from "./policy";
import type {
  CaseInput,
  DerivedProof,
  FlexResponseClass,
  FlexibilityPassport,
  PrivateProfile,
  PublicEvidence,
  ReadinessClass,
  RequestRecord,
  RiskClass,
  ScenarioOverride,
} from "./types";

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

const RISK_PENALTY: Record<RiskClass, number> = { low: 0, medium: 8, high: 18 };
const FLOOD_PENALTY: Record<RiskClass, number> = { low: 0, medium: 3, high: 12 };

function firmnessScore(p: PrivateProfile, e: PublicEvidence, requestedMW: number): number {
  const siteBonus = e.siteControlEvidence ? 10 : 0;
  const bessShare = clamp((p.bessMW / requestedMW) * 50, 0, 10);
  const redundancyContribution = clamp(p.redundancyShiftPercent * 0.4, 0, 10);
  const confidenceContribution = p.internalScheduleConfidence * 35;
  const permitPenalty = RISK_PENALTY[e.permitRisk];
  const floodPenalty = FLOOD_PENALTY[e.floodRisk];
  const raw =
    25 +
    confidenceContribution +
    redundancyContribution +
    bessShare +
    siteBonus -
    permitPenalty -
    floodPenalty;
  return Math.round(clamp(raw, 0, 100));
}

function expectedPeakBand(
  p: PrivateProfile,
  requestedMW: number,
): [number, number] {
  const low = 0.55 + p.internalScheduleConfidence * 0.12;
  const high = 0.72 + p.internalScheduleConfidence * 0.1;
  return [Math.round(requestedMW * low), Math.round(requestedMW * high)];
}

function responseClass(flexPercent: number): FlexResponseClass {
  if (flexPercent >= 20) return "B";
  if (flexPercent >= 10) return "C";
  return "C";
}

// Coarse commercial BESS duration tiers. Publishing a band means an
// observer can't invert to the exact private bessHours — [4, 8] matches
// bessHours ∈ {4, 5, 6, 7}. Mirror in apps/api/gridpassport/forecast.py.
function durationBand(bessHours: number): [number, number] {
  if (bessHours < 4) return [2, 4];
  if (bessHours < 8) return [4, 8];
  return [8, 12];
}

function flexibilityPassport(
  p: PrivateProfile,
  requestedMW: number,
): FlexibilityPassport {
  const flexMW = requestedMW * (p.flexPercent / 100);
  const [durationHoursMin, durationHoursMax] = durationBand(p.bessHours);
  return {
    mwMin: Math.round(flexMW * 0.82),
    mwMax: Math.round(flexMW * 1.12),
    durationHoursMin,
    durationHoursMax,
    responseClass: responseClass(p.flexPercent),
  };
}

function siteReadiness(e: PublicEvidence): ReadinessClass {
  if (
    !e.siteControlEvidence ||
    e.permitRisk === "high" ||
    e.zoningRisk === "high"
  ) {
    return "red";
  }
  if (
    e.permitRisk === "medium" ||
    e.floodRisk === "medium" ||
    e.zoningRisk === "medium"
  ) {
    return "yellow";
  }
  return "green";
}

function energizationBand(
  req: CaseInput,
  readiness: ReadinessClass,
  flexPercent: number,
): string {
  const codDate = new Date(req.targetCOD);
  const baseYear = codDate.getUTCFullYear();
  const baseQuarter = Math.floor(codDate.getUTCMonth() / 3) + 1;
  const flexShift = flexPercent >= 20 ? -1 : flexPercent >= 10 ? 0 : 1;
  const readinessSpread = { green: 1, yellow: 2, red: 4 }[readiness];
  const startAbs = baseQuarter + flexShift;
  const endAbs = startAbs + readinessSpread;
  const fmt = (abs: number): string => {
    const y = baseYear + Math.floor((abs - 1) / 4);
    const q = ((((abs - 1) % 4) + 4) % 4) + 1;
    return `Q${q} ${y}`;
  };
  return `${fmt(startAbs)} – ${fmt(endAbs)}`;
}

function costExposureClass(firmness: number, permitRisk: RiskClass): RiskClass {
  const adjusted = firmness - (permitRisk === "high" ? 15 : permitRisk === "medium" ? 6 : 0);
  if (adjusted >= 70) return "low";
  if (adjusted >= 45) return "medium";
  return "high";
}

function topBlockers(
  req: CaseInput,
  readiness: ReadinessClass,
  firmness: number,
): string[] {
  const blockers: string[] = [];
  const { privateProfile: p, publicEvidence: e } = req;
  if (e.permitRisk === "high") {
    blockers.push("Air-permit review tier likely requires full modeling pass");
  } else if (e.permitRisk === "medium") {
    blockers.push("Generator fleet permitting complexity");
  }
  if (!e.siteControlEvidence) {
    blockers.push("Site control evidence not yet on file");
  }
  if (p.internalScheduleConfidence < 0.6) {
    blockers.push("Applicant schedule confidence below planning threshold");
  }
  if (e.floodRisk !== "low") {
    blockers.push(`${e.floodRisk === "high" ? "High" : "Moderate"} flood overlay on parcel envelope`);
  }
  if (readiness === "yellow") {
    blockers.push("Site plan maturity below threshold for fast-track interconnection study");
  }
  if (firmness < 50) {
    blockers.push("Secondary transformer lead-time uncertainty");
  }
  return blockers.slice(0, 3);
}

export function forecast(
  input: CaseInput,
  override?: ScenarioOverride,
): DerivedProof {
  const effectiveProfile: PrivateProfile = {
    ...input.privateProfile,
    flexPercent:
      override?.flexPercent ?? input.privateProfile.flexPercent,
  };
  const adjusted: CaseInput = {
    ...input,
    privateProfile: effectiveProfile,
  };
  const firmness = firmnessScore(
    adjusted.privateProfile,
    adjusted.publicEvidence,
    adjusted.requestedMW,
  );
  const readiness = siteReadiness(adjusted.publicEvidence);
  return {
    firmnessScore: firmness,
    expectedPeakMW: expectedPeakBand(
      adjusted.privateProfile,
      adjusted.requestedMW,
    ),
    flexibilityPassport: flexibilityPassport(
      adjusted.privateProfile,
      adjusted.requestedMW,
    ),
    siteReadinessClass: readiness,
    energizationBand: energizationBand(
      adjusted,
      readiness,
      adjusted.privateProfile.flexPercent,
    ),
    costExposureClass: costExposureClass(
      firmness,
      adjusted.publicEvidence.permitRisk,
    ),
    topBlockers: topBlockers(adjusted, readiness, firmness),
    generatedFromPolicyVersion: POLICY_VERSION,
  };
}

export function buildRecord(
  input: CaseInput,
  override?: ScenarioOverride,
): RequestRecord {
  const effectiveInput: CaseInput = override?.flexPercent !== undefined
    ? {
        ...input,
        privateProfile: {
          ...input.privateProfile,
          flexPercent: override.flexPercent,
        },
      }
    : input;
  return {
    ...effectiveInput,
    derivedProof: forecast(input, override),
  };
}
