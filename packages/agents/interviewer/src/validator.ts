/**
 * Pure Interviewer-output validator (browser-safe).
 *
 * Moved from `packages/agents/interviewer/scripts/validate_caseinput.ts` so
 * the Tauri webview (apps/desktop/) can import it and gate every CaseInput
 * emission from the Claude Agent SDK transport before it reaches React
 * state — per Track 2.1 of sprint 2026-04-20.
 *
 * Enforces the write-scope contract declared in SKILL.md:
 *   - identity, operational, sensitive bucket fields MAY be populated
 *   - `publicEvidence` MUST be empty / absent (Cartographer's scope)
 *   - `derivedProof` MUST NOT be present (Forecaster's scope)
 *   - `status` MUST be "draft" on Interviewer hand-off
 *   - structural shapes + types must match @grid-passport/core/types CaseInput
 *
 * This module imports types only — no `node:fs`, no `node:process`, no
 * fixtures. Safe to bundle into a webview. The CLI wrapper in
 * scripts/validate_caseinput.ts adds the Node-only runtime (file I/O,
 * fixture-backed self-test).
 */
import type { CaseInput } from "@grid-passport/core/types";

export class InterviewerContractViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InterviewerContractViolation";
  }
}

function requireString(
  obj: Record<string, unknown>,
  key: string,
  ctx: string,
): string {
  const v = obj[key];
  if (typeof v !== "string") {
    throw new InterviewerContractViolation(`${ctx}.${key} must be a string`);
  }
  return v;
}

function requireNumber(
  obj: Record<string, unknown>,
  key: string,
  ctx: string,
): number {
  const v = obj[key];
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new InterviewerContractViolation(
      `${ctx}.${key} must be a finite number`,
    );
  }
  return v;
}

function requireObject(
  obj: Record<string, unknown>,
  key: string,
  ctx: string,
): Record<string, unknown> {
  const v = obj[key];
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    throw new InterviewerContractViolation(`${ctx}.${key} must be an object`);
  }
  return v as Record<string, unknown>;
}

/**
 * Validate an Interviewer hand-off output.
 *
 * Accepts a raw object (typically parsed JSON). Enforces shape, types, and
 * the write-scope contract. Throws `InterviewerContractViolation` on the
 * first violation with a path-scoped message.
 */
export function validateInterviewerOutput(raw: unknown): CaseInput {
  if (typeof raw !== "object" || raw === null) {
    throw new InterviewerContractViolation(
      "top-level value must be a JSON object",
    );
  }
  const r = raw as Record<string, unknown>;

  requireString(r, "applicantOrg", "root");
  requireNumber(r, "requestedMW", "root");
  requireString(r, "targetCOD", "root");
  requireNumber(r, "phases", "root");

  const status = requireString(r, "status", "root");
  if (status !== "draft") {
    throw new InterviewerContractViolation(
      `status must be "draft" on Interviewer hand-off (got "${status}"); ` +
        `Interviewer does not advance workflow state`,
    );
  }

  const site = requireObject(r, "site", "root");
  requireString(site, "state", "site");
  requireString(site, "county", "site");
  requireString(site, "parcelId", "site");
  requireString(site, "displayName", "site");

  // Baseline-filing fields (ERCOT-precedent additions, all public class).
  // These land progressively across Rounds 2 of the chat. The validator
  // accepts a hand-off where any of these are missing or null — the
  // transport synthesizes defaults so the runtime always has a structurally
  // complete CaseInput. If present, shape must be valid (typed correctly)
  // so a malformed value isn't silently accepted.
  if ("customerContact" in r && r.customerContact !== null && r.customerContact !== undefined) {
    if (typeof r.customerContact !== "object" || Array.isArray(r.customerContact)) {
      throw new InterviewerContractViolation(
        "root.customerContact, if present, must be an object with { name, email, phone? }",
      );
    }
    const contact = r.customerContact as Record<string, unknown>;
    requireString(contact, "name", "customerContact");
    requireString(contact, "email", "customerContact");
    if ("phone" in contact && contact.phone !== undefined && contact.phone !== null) {
      requireString(contact, "phone", "customerContact");
    }
  }
  if ("loadType" in r && r.loadType !== null && r.loadType !== undefined) {
    const loadType = r.loadType;
    if (
      loadType !== "data_center" &&
      loadType !== "industrial" &&
      loadType !== "manufacturing" &&
      loadType !== "other"
    ) {
      throw new InterviewerContractViolation(
        `loadType, if present, must be one of "data_center" | "industrial" | "manufacturing" | "other" (got ${JSON.stringify(loadType)})`,
      );
    }
  }
  if ("connectionVoltageKV" in r && r.connectionVoltageKV !== null && r.connectionVoltageKV !== undefined) {
    if (typeof r.connectionVoltageKV !== "number" || !Number.isFinite(r.connectionVoltageKV)) {
      throw new InterviewerContractViolation(
        "root.connectionVoltageKV, if present, must be a finite number",
      );
    }
  }
  if ("netMetered" in r && r.netMetered !== null && r.netMetered !== undefined) {
    if (typeof r.netMetered !== "boolean") {
      throw new InterviewerContractViolation(
        "root.netMetered, if present, must be a boolean",
      );
    }
    if (r.netMetered === true && "nettedGenerationStation" in r && r.nettedGenerationStation !== undefined && r.nettedGenerationStation !== null) {
      requireString(r, "nettedGenerationStation", "root");
    }
  }

  const pp = requireObject(r, "privateProfile", "root");
  const numericPrivateKeys = [
    "flexPercent",
    "redundancyShiftPercent",
    "backupGenHours",
    "backupGenMW",
    "bessMW",
    "bessHours",
    "internalScheduleConfidence",
  ] as const;
  for (const key of numericPrivateKeys) {
    requireNumber(pp, key, "privateProfile");
  }
  const mix = requireObject(pp, "workloadMix", "privateProfile");
  const training = requireNumber(mix, "training", "workloadMix");
  const inference = requireNumber(mix, "inference", "workloadMix");
  const sum = training + inference;
  if (Math.abs(sum - 1.0) > 0.02) {
    throw new InterviewerContractViolation(
      `workloadMix.training + workloadMix.inference must sum to ~1.0 ` +
        `(got ${sum.toFixed(3)}); Interviewer sum-check failed`,
    );
  }

  // Write-scope contract: publicEvidence must be structurally absent or empty.
  // The Interviewer never writes this section; Cartographer does.
  if ("publicEvidence" in r) {
    const pe = r.publicEvidence;
    if (pe !== null && pe !== undefined) {
      if (typeof pe !== "object" || Array.isArray(pe)) {
        throw new InterviewerContractViolation(
          "publicEvidence, if present, must be an empty object {} or null; " +
            "the Interviewer is not allowed to write this section",
        );
      }
      const peKeys = Object.keys(pe as Record<string, unknown>).filter(
        (k) => (pe as Record<string, unknown>)[k] !== undefined,
      );
      if (peKeys.length > 0) {
        throw new InterviewerContractViolation(
          `publicEvidence must be empty on Interviewer hand-off ` +
            `(found keys: ${peKeys.join(", ")}); write-scope violation — ` +
            `that section belongs to Cartographer`,
        );
      }
    }
  }

  // Write-scope contract: derivedProof must not be present at all.
  // That section is Forecaster's / Referee's scope; any value here is a leak.
  if ("derivedProof" in r) {
    throw new InterviewerContractViolation(
      "derivedProof must not be present on Interviewer hand-off; " +
        "that section is populated downstream by Forecaster/Referee",
    );
  }

  return raw as CaseInput;
}
