import { createHash } from "node:crypto";
import { POLICY_VERSION } from "@/lib/policy";
import type {
  CaseInput,
  DerivedProof,
  RequestRecord,
  Role,
  ScenarioOverride,
} from "@/lib/types";

export type AuditActor =
  | "interviewer"
  | "cartographer"
  | "notary"
  | "forecaster"
  | "referee"
  | "system";

export type AuditReason =
  | "case_created"
  | "evidence_refreshed"
  | "proof_generated"
  | "policy_evaluated"
  | "role_projection"
  | "scenario_override";

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: AuditActor;
  action: string;
  reasonCode: AuditReason;
  artifactHash: string;
  policyVersion: string;
  details: Record<string, string | number | null>;
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value))
    .digest("hex");
}

const CASE_ANCHOR: Record<string, string> = {
  "owl-compute": "2026-03-18T14:12:00Z",
  "lantern-cloud": "2026-03-25T09:44:00Z",
  "kraken-train": "2026-03-11T16:05:00Z",
};

function isoMinus(anchor: string, minutes: number): string {
  const t = new Date(anchor).getTime() - minutes * 60_000;
  return new Date(t).toISOString();
}

function eventId(caseId: string, seq: number): string {
  return `audit_${caseId}_${seq.toString().padStart(3, "0")}`;
}

function proofHash(proof: DerivedProof): string {
  return sha256({
    firmnessScore: proof.firmnessScore,
    expectedPeakMW: proof.expectedPeakMW,
    flexibilityPassport: proof.flexibilityPassport,
    energizationBand: proof.energizationBand,
    siteReadinessClass: proof.siteReadinessClass,
    costExposureClass: proof.costExposureClass,
    topBlockers: proof.topBlockers,
  });
}

export function buildAuditTrail(
  input: CaseInput,
  record: RequestRecord,
  role: Role,
  override: ScenarioOverride | undefined,
): AuditEvent[] {
  const anchor = CASE_ANCHOR[input.caseId] ?? new Date().toISOString();
  const proofHashHex = proofHash(record.derivedProof);
  const evidenceHash = sha256(input.publicEvidence).slice(0, 16);
  const requestHash = sha256({
    id: input.id,
    requestedMW: input.requestedMW,
    targetCOD: input.targetCOD,
    phases: input.phases,
  }).slice(0, 16);

  const events: AuditEvent[] = [
    {
      id: eventId(input.caseId, 1),
      timestamp: anchor,
      actor: "interviewer",
      action: `Structured intake submitted · ${input.requestedMW} MW · ${input.site.county}, ${input.site.state}`,
      reasonCode: "case_created",
      artifactHash: requestHash,
      policyVersion: input.policyVersion,
      details: {
        requestedMW: input.requestedMW,
        phases: input.phases,
        targetCOD: input.targetCOD,
      },
    },
    {
      id: eventId(input.caseId, 2),
      timestamp: isoMinus(anchor, -42),
      actor: "cartographer",
      action: `Public evidence refreshed · ${input.publicEvidence.sourceRefs.length} sources`,
      reasonCode: "evidence_refreshed",
      artifactHash: evidenceHash,
      policyVersion: input.policyVersion,
      details: {
        sourceCount: input.publicEvidence.sourceRefs.length,
        floodRisk: input.publicEvidence.floodRisk,
        permitRisk: input.publicEvidence.permitRisk,
      },
    },
    {
      id: eventId(input.caseId, 3),
      timestamp: isoMinus(anchor, -123),
      actor: "notary",
      action: "Private profile sealed into confidential path",
      reasonCode: "sealed_raw_input" as unknown as AuditReason,
      artifactHash: sha256({
        sealedClasses: [
          "flexPercent",
          "redundancyShiftPercent",
          "backupGenMW",
          "bessMW",
          "internalScheduleConfidence",
          "workloadMix",
        ],
      }).slice(0, 16),
      policyVersion: input.policyVersion,
      details: {
        sealedFieldCount: 8,
      },
    },
    {
      id: eventId(input.caseId, 4),
      timestamp: isoMinus(anchor, -186),
      actor: "forecaster",
      action: `Derived proofs generated · firmness ${record.derivedProof.firmnessScore}`,
      reasonCode: "proof_generated",
      artifactHash: proofHashHex.slice(0, 16),
      policyVersion: POLICY_VERSION,
      details: {
        firmnessScore: record.derivedProof.firmnessScore,
        energizationBand: record.derivedProof.energizationBand,
      },
    },
    {
      id: eventId(input.caseId, 5),
      timestamp: isoMinus(anchor, -244),
      actor: "referee",
      action: `Release policy evaluated · projection for ${role}`,
      reasonCode: "policy_evaluated",
      artifactHash: sha256({ role, policy: POLICY_VERSION }).slice(0, 16),
      policyVersion: POLICY_VERSION,
      details: {
        role,
      },
    },
  ];

  if (override?.flexPercent !== undefined) {
    // Baseline = input.privateProfile.flexPercent. That's a private field;
    // it must not appear in audit text shown to non-applicant roles. The
    // applicant owns it, so they see it.
    const baselineSegment =
      role === "applicant"
        ? `(baseline ${input.privateProfile.flexPercent}%)`
        : "(baseline sealed)";
    events.push({
      id: eventId(input.caseId, 6),
      timestamp: new Date().toISOString(),
      actor: "forecaster",
      action: `Counterfactual scenario · flex ${override.flexPercent}% ${baselineSegment}`,
      reasonCode: "scenario_override",
      artifactHash: proofHashHex.slice(0, 16),
      policyVersion: POLICY_VERSION,
      details: {
        overrideFlexPercent: override.flexPercent,
        newEnergizationBand: record.derivedProof.energizationBand,
        newFirmness: record.derivedProof.firmnessScore,
      },
    });
  }

  events.push({
    id: eventId(input.caseId, events.length + 1),
    timestamp: new Date().toISOString(),
    actor: "referee",
    action: `Role projection rendered · ${role}`,
    reasonCode: "role_projection",
    artifactHash: sha256({ role, proofHashHex }).slice(0, 16),
    policyVersion: POLICY_VERSION,
    details: {
      role,
    },
  });

  return events;
}
