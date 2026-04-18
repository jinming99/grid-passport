import { NextResponse } from "next/server";
import { getCase } from "@/lib/fixtures";
import { buildRecord } from "@/lib/forecast";
import { projectForRole } from "@/lib/projection";
import { buildAuditTrail } from "@/lib/audit";
import type { Role, ScenarioOverride } from "@/lib/types";

const VALID_ROLES: readonly Role[] = ["applicant", "utility", "regulator"];

interface ScenarioRequest {
  caseId: string;
  role: Role;
  flexPercent?: number;
}

function isRole(x: unknown): x is Role {
  return typeof x === "string" && (VALID_ROLES as readonly string[]).includes(x);
}

function isScenarioRequest(body: unknown): body is ScenarioRequest {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.caseId !== "string") return false;
  if (!isRole(b.role)) return false;
  if (b.flexPercent !== undefined && typeof b.flexPercent !== "number")
    return false;
  return true;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!isScenarioRequest(body)) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const input = getCase(body.caseId);
  if (!input) {
    return NextResponse.json({ error: "unknown case" }, { status: 404 });
  }

  const override: ScenarioOverride = {};
  if (body.flexPercent !== undefined) {
    override.flexPercent = Math.max(0, Math.min(60, body.flexPercent));
  }

  const record = buildRecord(input, override);
  const view = projectForRole(record, body.role);
  const auditEvents = buildAuditTrail(input, record, body.role, override);

  return NextResponse.json({
    caseId: body.caseId,
    role: body.role,
    override,
    view,
    auditEvents,
    // Only reveal the raw baseline to the applicant — it IS their private input.
    baselineFlexPercent:
      body.role === "applicant" ? input.privateProfile.flexPercent : null,
  });
}
