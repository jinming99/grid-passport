import { notFound } from "next/navigation";
import { getCase, CASE_METAS } from "@/lib/fixtures";
import { buildRecord } from "@/lib/forecast";
import { projectForRole } from "@/lib/projection";
import { loadPolicySource } from "@/lib/policy-source";
import { buildAuditTrail } from "@/lib/audit";
import { getSiteGeo } from "@/lib/geo/synthetic";
import type { Role } from "@/lib/types";
import { DemoClient } from "@/components/DemoClient";

const INITIAL_ROLE: Role = "utility";

export async function generateStaticParams() {
  return CASE_METAS.map((c) => ({ caseId: c.caseId }));
}

export default async function CaseDemoPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const input = getCase(caseId);
  const geo = getSiteGeo(caseId);
  if (!input || !geo) notFound();

  const baselineRecord = buildRecord(input);
  const initialView = projectForRole(baselineRecord, INITIAL_ROLE);
  const initialAuditEvents = buildAuditTrail(
    input,
    baselineRecord,
    INITIAL_ROLE,
    undefined,
  );

  const meta = CASE_METAS.find((c) => c.caseId === caseId)!;
  const policySource = await loadPolicySource();

  return (
    <DemoClient
      caseId={caseId}
      meta={meta}
      initialRole={INITIAL_ROLE}
      initialView={initialView}
      initialAuditEvents={initialAuditEvents}
      policySource={policySource}
      geo={geo}
    />
  );
}
