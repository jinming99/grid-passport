import { notFound } from "next/navigation";
import { getCase, CASE_METAS } from "@grid-passport/core/fixtures";
import { buildRecord } from "@grid-passport/core/forecast";
import { projectForRole } from "@grid-passport/core/projection";
import { loadPolicySource } from "@/lib/policy-source";
import { buildAuditTrail } from "@grid-passport/core/audit";
import { getSiteGeo } from "@grid-passport/core/geo/synthetic";
import type { Role } from "@grid-passport/core/types";
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
  const initialAuditEvents = await buildAuditTrail(
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
