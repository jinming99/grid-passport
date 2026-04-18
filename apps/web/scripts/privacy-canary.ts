// Privacy canary for Grid Passport.
//
// Three independent kinds of evidence:
//
//   (1) STRUCTURAL    — for every fixture × non-applicant role, every
//                       private field reports `visible: false` and a
//                       `null` value. Foundational: this is what the
//                       projection layer is supposed to do, and any
//                       drift here is a bug regardless of payload shape.
//
//   (2) SCAN          — for every fixture × non-applicant role, scan
//                       audit `action` strings for raw private values.
//                       Fingerprints are private values minus public
//                       and derived collisions (those are policy-released,
//                       so a match against them isn't a leak — it's the
//                       releasing field doing its job). Action strings
//                       are the high-risk surface because they are
//                       free-form interpolated text.
//
//   (3) MIRROR DRIFT  — TS POLICY (packages/core/src/policy.ts), the Rego
//                       canon (packages/policy/grid-passport.rego), and
//                       the Python mirror (apps/api/gridpassport/policy.py)
//                       must agree on the field-path set and class.
//
// Limits intentionally not covered (would over-fit on synthetic data):
//   - structural counts in audit details (e.g., sealedFieldCount=8)
//     can collide with private numeric values; we don't scan details.
//   - SHA hex fields and ISO timestamps can substring-match short
//     numeric fingerprints; we don't scan those fields.
//   - derivation-as-near-identity (e.g., Math.max(2, bessHours)) can
//     publish a private value through a derived field. The policy
//     classifies the derived field as released, so this is a derivation-
//     design concern, not a projection-leak concern.
//
// Exit 0 iff every check passes. Findings print deterministically.
// Run from repo root:  pnpm privacy:canary

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { POLICY, POLICY_VERSION } from "@grid-passport/core/policy";
import { listCases } from "@grid-passport/core/fixtures";
import { buildRecord } from "@grid-passport/core/forecast";
import { projectForRole, type ProjectedField } from "@grid-passport/core/projection";
import { buildAuditTrail, type AuditEvent } from "@grid-passport/core/audit";
import type {
  CaseInput,
  FieldClass,
  FieldPath,
  PrivateProfile,
  RequestRecord,
  Role,
} from "@grid-passport/core/types";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const REGO_PATH = join(REPO_ROOT, "packages/policy/grid-passport.rego");
const PY_POLICY_PATH = join(REPO_ROOT, "apps/api/gridpassport/policy.py");

const NON_APPLICANT_ROLES: Role[] = ["utility", "regulator"];
const SCENARIO_OVERRIDE_FLEX = 30;

type FindingCode =
  | "STRUCT_VIS_MISMATCH"
  | "STRUCT_RAW_VALUE_PRESENT"
  | "SCAN_AUDIT_ACTION_LEAK"
  | "DRIFT_MISSING_PATH"
  | "DRIFT_CLASS_MISMATCH"
  | "MIRROR_PARSE_EMPTY";

interface Finding {
  code: FindingCode;
  detail: string;
  caseId?: string;
  role?: Role;
  fieldPath?: string;
}

const findings: Finding[] = [];

function fail(code: FindingCode, detail: string, ctx: Partial<Finding> = {}): void {
  findings.push({ code, detail, ...ctx });
}

// --------------------------------------------------------------------
// (1) STRUCTURAL
// --------------------------------------------------------------------

function structuralCheck(input: CaseInput, role: Role): void {
  const view = projectForRole(buildRecord(input), role);
  const fields: ProjectedField<unknown>[] = [
    ...Object.values(view.header),
    ...Object.values(view.privateProfile),
    ...Object.values(view.publicEvidence),
    ...Object.values(view.derivedProof),
  ];
  for (const f of fields) {
    const path = f.path as FieldPath;
    const entry = POLICY[path];
    const expectedVisible = entry.visibleTo.includes(role);
    if (f.visible !== expectedVisible) {
      fail(
        "STRUCT_VIS_MISMATCH",
        `field reports visible=${f.visible} but policy says ${expectedVisible}`,
        { caseId: input.caseId, role, fieldPath: path },
      );
    }
    if (!expectedVisible && f.value !== null) {
      fail(
        "STRUCT_RAW_VALUE_PRESENT",
        `hidden field has non-null value ${JSON.stringify(f.value)}`,
        { caseId: input.caseId, role, fieldPath: path },
      );
    }
  }
}

// --------------------------------------------------------------------
// (2) SCAN
// --------------------------------------------------------------------

function privateValueStrings(p: PrivateProfile): string[] {
  return [
    String(p.flexPercent),
    String(p.redundancyShiftPercent),
    String(p.backupGenHours),
    String(p.backupGenMW),
    String(p.bessMW),
    String(p.bessHours),
    String(p.internalScheduleConfidence),
    String(p.workloadMix.training),
    String(p.workloadMix.inference),
  ];
}

function publicValueStrings(input: CaseInput): string[] {
  const out: string[] = [
    input.applicantOrg,
    input.id,
    input.caseId,
    input.targetCOD,
    String(input.requestedMW),
    String(input.phases),
    input.status,
    input.policyVersion,
    input.site.state,
    input.site.county,
    input.site.parcelId,
    input.site.displayName,
    input.publicEvidence.floodRisk,
    input.publicEvidence.permitRisk,
    input.publicEvidence.zoningRisk,
    String(input.publicEvidence.siteControlEvidence),
    String(input.publicEvidence.sourceRefs.length),
  ];
  for (const ref of input.publicEvidence.sourceRefs) {
    out.push(ref.label);
    if (ref.url) out.push(ref.url);
  }
  out.push(...input.publicEvidence.notes);
  return out;
}

function derivedValueStrings(record: RequestRecord): string[] {
  const d = record.derivedProof;
  return [
    String(d.firmnessScore),
    String(d.expectedPeakMW[0]),
    String(d.expectedPeakMW[1]),
    String(d.flexibilityPassport.mwMin),
    String(d.flexibilityPassport.mwMax),
    String(d.flexibilityPassport.durationHoursMin),
    String(d.flexibilityPassport.durationHoursMax),
    d.flexibilityPassport.responseClass,
    d.siteReadinessClass,
    d.energizationBand,
    d.costExposureClass,
    ...d.topBlockers,
    d.generatedFromPolicyVersion,
  ];
}

// Private value strings minus collisions with policy-released values.
// A collision is not a leak — the released field is meant to be visible.
function leakFingerprints(
  input: CaseInput,
  record: RequestRecord,
): Set<string> {
  const priv = new Set(privateValueStrings(input.privateProfile));
  const allowed = new Set([
    ...publicValueStrings(input),
    ...derivedValueStrings(record),
  ]);
  const out = new Set<string>();
  for (const v of priv) if (!allowed.has(v)) out.add(v);
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Match a numeric/string literal with non-digit, non-dot guards so
// "22" matches in `baseline 22%` but not in `122` or `22.5`.
function fingerprintRegex(fp: string): RegExp {
  return new RegExp(`(^|[^0-9.])${escapeRegExp(fp)}([^0-9.]|$)`);
}

function scanAuditActions(
  input: CaseInput,
  role: Role,
  flexOverride: number | undefined,
): void {
  const override =
    flexOverride !== undefined ? { flexPercent: flexOverride } : undefined;
  const record = buildRecord(input, override);
  const events: AuditEvent[] = buildAuditTrail(input, record, role, override);
  const fingerprints = leakFingerprints(input, record);
  for (const ev of events) {
    for (const fp of fingerprints) {
      if (fingerprintRegex(fp).test(ev.action)) {
        fail(
          "SCAN_AUDIT_ACTION_LEAK",
          `audit action "${ev.action}" exposes private value "${fp}"`,
          { caseId: input.caseId, role, fieldPath: ev.reasonCode },
        );
      }
    }
  }
}

// --------------------------------------------------------------------
// (3) MIRROR DRIFT
// --------------------------------------------------------------------

type MirrorMap = Record<string, FieldClass>;

function buildTsMirror(): MirrorMap {
  const m: MirrorMap = {};
  for (const [path, entry] of Object.entries(POLICY)) m[path] = entry.class;
  return m;
}

function parseRegoMirror(): MirrorMap {
  const text = readFileSync(REGO_PATH, "utf8");
  const m: MirrorMap = {};
  // Lines look like:  "request.requestedMW":   "public",
  const re = /"([a-z]+\.[A-Za-z]+)"\s*:\s*"(public|private|derived)"/g;
  for (const match of text.matchAll(re)) {
    m[match[1]] = match[2] as FieldClass;
  }
  if (Object.keys(m).length === 0) {
    fail("MIRROR_PARSE_EMPTY", `no entries parsed from ${REGO_PATH}`);
  }
  return m;
}

function parsePythonMirror(): MirrorMap {
  const text = readFileSync(PY_POLICY_PATH, "utf8");
  const m: MirrorMap = {};
  // Lines look like:  "request.requestedMW": PolicyEntry("public", ...
  const re =
    /"([a-z]+\.[A-Za-z]+)"\s*:\s*PolicyEntry\(\s*\n?\s*"(public|private|derived)"/g;
  for (const match of text.matchAll(re)) {
    m[match[1]] = match[2] as FieldClass;
  }
  if (Object.keys(m).length === 0) {
    fail("MIRROR_PARSE_EMPTY", `no entries parsed from ${PY_POLICY_PATH}`);
  }
  return m;
}

function compareMirrors(
  a: MirrorMap,
  b: MirrorMap,
  aLabel: string,
  bLabel: string,
): void {
  const aPaths = new Set(Object.keys(a));
  const bPaths = new Set(Object.keys(b));
  for (const p of aPaths) {
    if (!bPaths.has(p)) {
      fail("DRIFT_MISSING_PATH", `${aLabel} declares ${p} but ${bLabel} does not`, {
        fieldPath: p,
      });
      continue;
    }
    if (a[p] !== b[p]) {
      fail(
        "DRIFT_CLASS_MISMATCH",
        `${p}: ${aLabel}="${a[p]}" but ${bLabel}="${b[p]}"`,
        { fieldPath: p },
      );
    }
  }
  for (const p of bPaths) {
    if (!aPaths.has(p)) {
      fail("DRIFT_MISSING_PATH", `${bLabel} declares ${p} but ${aLabel} does not`, {
        fieldPath: p,
      });
    }
  }
}

// --------------------------------------------------------------------
// runner
// --------------------------------------------------------------------

interface Section {
  name: string;
  run: () => void;
}

function main(): void {
  const sections: Section[] = [
    {
      name: "structural projection",
      run: () => {
        for (const input of listCases())
          for (const role of NON_APPLICANT_ROLES) structuralCheck(input, role);
      },
    },
    {
      name: "audit action scan (baseline)",
      run: () => {
        for (const input of listCases())
          for (const role of NON_APPLICANT_ROLES)
            scanAuditActions(input, role, undefined);
      },
    },
    {
      name: "audit action scan (with flex override)",
      run: () => {
        for (const input of listCases())
          for (const role of NON_APPLICANT_ROLES)
            scanAuditActions(input, role, SCENARIO_OVERRIDE_FLEX);
      },
    },
    {
      name: "policy mirror drift (TS ↔ Rego ↔ Python)",
      run: () => {
        const ts = buildTsMirror();
        const rego = parseRegoMirror();
        const py = parsePythonMirror();
        compareMirrors(ts, rego, "TS", "Rego");
        compareMirrors(ts, py, "TS", "Python");
      },
    },
  ];

  for (const s of sections) {
    const before = findings.length;
    s.run();
    const added = findings.length - before;
    const status = added === 0 ? "pass" : `${added} finding(s)`;
    process.stdout.write(`[canary] ${s.name}: ${status}\n`);
  }

  if (findings.length === 0) {
    process.stdout.write(`\n[canary] all clear · policy ${POLICY_VERSION}\n`);
    process.exit(0);
  }

  process.stderr.write(`\n[canary] ${findings.length} finding(s):\n`);
  for (const f of findings) {
    const ctx = [
      f.caseId ? `case=${f.caseId}` : null,
      f.role ? `role=${f.role}` : null,
      f.fieldPath ? `field=${f.fieldPath}` : null,
    ]
      .filter(Boolean)
      .join(" ");
    process.stderr.write(`  [${f.code}] ${ctx ? "(" + ctx + ") " : ""}${f.detail}\n`);
  }
  process.exit(1);
}

main();
