import { POLICY_VERSION } from "./policy";
import { sha256Hex } from "./crypto";
import type {
  CaseInput,
  DerivedProof,
  RequestRecord,
  Role,
  ScenarioOverride,
} from "./types";

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
  | "sealed_raw_input"
  | "proof_generated"
  | "policy_evaluated"
  | "role_projection"
  | "scenario_override";

/**
 * Tamper-evident audit-log entry. `prevHash` is the SHA-256 of the
 * JCS-canonicalized prior event (including its own prevHash), or null for the
 * first event. See docs/design/signed-bundle.md §3.5.
 */
export interface AuditEvent {
  seq: number;
  id: string;
  timestamp: string;
  actor: AuditActor;
  action: string;
  reasonCode: AuditReason;
  artifactHash: string;
  policyVersion: string;
  details: Record<string, string | number | null>;
  prevHash: string | null;
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

async function proofHash(proof: DerivedProof): Promise<string> {
  return sha256Hex({
    firmnessScore: proof.firmnessScore,
    expectedPeakMW: proof.expectedPeakMW,
    flexibilityPassport: proof.flexibilityPassport,
    energizationBand: proof.energizationBand,
    siteReadinessClass: proof.siteReadinessClass,
    costExposureClass: proof.costExposureClass,
    topBlockers: proof.topBlockers,
  });
}

type RawEvent = Omit<AuditEvent, "seq" | "prevHash">;

/**
 * Compose events in order, then link them into a hash chain. Each event's
 * prevHash is the SHA-256 of the JCS(previous-event). The chain is covered
 * by the bundle signature in bundle.ts, so any tamper reveals itself at
 * verification.
 */
async function chainLink(raws: RawEvent[]): Promise<AuditEvent[]> {
  const out: AuditEvent[] = [];
  let prevHash: string | null = null;
  for (let i = 0; i < raws.length; i++) {
    const full: AuditEvent = {
      seq: i + 1,
      ...raws[i],
      prevHash,
    };
    out.push(full);
    prevHash = `sha256:${await sha256Hex(full)}`;
  }
  return out;
}

export async function buildAuditTrail(
  input: CaseInput,
  record: RequestRecord,
  role: Role,
  override: ScenarioOverride | undefined,
): Promise<AuditEvent[]> {
  const anchor = CASE_ANCHOR[input.caseId] ?? new Date().toISOString();
  const proofHashHex = await proofHash(record.derivedProof);
  const evidenceHash = (await sha256Hex(input.publicEvidence)).slice(0, 16);
  const requestHash = (
    await sha256Hex({
      id: input.id,
      requestedMW: input.requestedMW,
      targetCOD: input.targetCOD,
      phases: input.phases,
    })
  ).slice(0, 16);
  const sealedHash = (
    await sha256Hex({
      sealedClasses: [
        "flexPercent",
        "redundancyShiftPercent",
        "backupGenMW",
        "bessMW",
        "internalScheduleConfidence",
        "workloadMix",
      ],
    })
  ).slice(0, 16);
  const policyEvalHash = (await sha256Hex({ role, policy: POLICY_VERSION })).slice(0, 16);
  const roleRenderHash = (await sha256Hex({ role, proofHashHex })).slice(0, 16);

  const raws: RawEvent[] = [
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
      reasonCode: "sealed_raw_input",
      artifactHash: sealedHash,
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
      artifactHash: policyEvalHash,
      policyVersion: POLICY_VERSION,
      details: {
        role,
      },
    },
  ];

  if (override?.flexPercent !== undefined) {
    const baselineSegment =
      role === "applicant"
        ? `(baseline ${input.privateProfile.flexPercent}%)`
        : "(baseline sealed)";
    raws.push({
      id: eventId(input.caseId, raws.length + 1),
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

  raws.push({
    id: eventId(input.caseId, raws.length + 1),
    timestamp: new Date().toISOString(),
    actor: "referee",
    action: `Role projection rendered · ${role}`,
    reasonCode: "role_projection",
    artifactHash: roleRenderHash,
    policyVersion: POLICY_VERSION,
    details: {
      role,
    },
  });

  return chainLink(raws);
}
