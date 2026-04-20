import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import type { CaseInput } from "@grid-passport/core/types";

export interface LoadedCase {
  input: CaseInput;
  source:
    | { kind: "file"; path: string }
    | { kind: "bundled"; caseId: string }
    | { kind: "interviewer"; transport: string; at: string };
}

export class CaseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaseValidationError";
  }
}

function requireString(obj: Record<string, unknown>, key: string, ctx: string) {
  const v = obj[key];
  if (typeof v !== "string") {
    throw new CaseValidationError(`${ctx}.${key} must be a string`);
  }
  return v;
}

function requireNumber(obj: Record<string, unknown>, key: string, ctx: string) {
  const v = obj[key];
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new CaseValidationError(`${ctx}.${key} must be a finite number`);
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
    throw new CaseValidationError(`${ctx}.${key} must be an object`);
  }
  return v as Record<string, unknown>;
}

// Structural validation. Keeps the bundle small (no ajv) and the error
// messages readable. Full schema validation can move to #6 (signed bundle).
export function validateCaseInput(raw: unknown): CaseInput {
  if (typeof raw !== "object" || raw === null) {
    throw new CaseValidationError("top-level value must be a JSON object");
  }
  const r = raw as Record<string, unknown>;
  requireString(r, "id", "root");
  requireString(r, "caseId", "root");
  requireString(r, "applicantOrg", "root");
  requireNumber(r, "requestedMW", "root");
  requireString(r, "targetCOD", "root");
  requireNumber(r, "phases", "root");
  requireString(r, "status", "root");
  requireString(r, "policyVersion", "root");

  const site = requireObject(r, "site", "root");
  requireString(site, "state", "site");
  requireString(site, "county", "site");
  requireString(site, "parcelId", "site");
  requireString(site, "displayName", "site");

  const pp = requireObject(r, "privateProfile", "root");
  for (const key of [
    "flexPercent",
    "redundancyShiftPercent",
    "backupGenHours",
    "backupGenMW",
    "bessMW",
    "bessHours",
    "internalScheduleConfidence",
  ] as const) {
    requireNumber(pp, key, "privateProfile");
  }
  const mix = requireObject(pp, "workloadMix", "privateProfile");
  requireNumber(mix, "training", "workloadMix");
  requireNumber(mix, "inference", "workloadMix");

  const pe = requireObject(r, "publicEvidence", "root");
  requireString(pe, "floodRisk", "publicEvidence");
  requireString(pe, "permitRisk", "publicEvidence");
  requireString(pe, "zoningRisk", "publicEvidence");
  if (typeof pe.siteControlEvidence !== "boolean") {
    throw new CaseValidationError(
      "publicEvidence.siteControlEvidence must be a boolean",
    );
  }
  if (!Array.isArray(pe.sourceRefs)) {
    throw new CaseValidationError("publicEvidence.sourceRefs must be an array");
  }
  if (!Array.isArray(pe.notes)) {
    throw new CaseValidationError("publicEvidence.notes must be an array");
  }

  // The struct-level shape matches CaseInput. Field-class values (risk tiers,
  // status strings) are trusted to match the declared types — projection and
  // forecaster treat unknown enum values as the empty case.
  return raw as CaseInput;
}

export async function loadCaseFromFile(): Promise<LoadedCase | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Grid Passport Case", extensions: ["json"] }],
  });
  if (selected === null) return null;
  const path = typeof selected === "string" ? selected : null;
  if (!path) {
    throw new CaseValidationError("dialog returned an unrecognized path shape");
  }
  const text = await readTextFile(path);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new CaseValidationError(
      `file is not valid JSON: ${(err as Error).message}`,
    );
  }
  const input = validateCaseInput(parsed);
  return { input, source: { kind: "file", path } };
}
