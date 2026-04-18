import type { AuditActor, AuditEvent, AuditReason } from "@grid-passport/core/audit";

const ACTOR_TONE: Record<AuditActor, string> = {
  interviewer: "text-sky-300",
  cartographer: "text-emerald-300",
  notary: "text-amber-300",
  forecaster: "text-lime-300",
  referee: "text-violet-300",
  system: "text-neutral-300",
};

const REASON_LABEL: Record<AuditReason, string> = {
  case_created: "case_created",
  evidence_refreshed: "evidence_refreshed",
  proof_generated: "proof_generated",
  policy_evaluated: "policy_evaluated",
  role_projection: "role_projection",
  scenario_override: "scenario_override",
};

function formatStamp(iso: string): string {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d
    .toISOString()
    .slice(11, 16)}Z`;
}

export function AuditTrail({ events }: { events: AuditEvent[] }) {
  const sorted = [...events].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
  return (
    <section className="rounded-md border border-sky-900/40 bg-sky-950/10 overflow-hidden">
      <header className="border-b border-neutral-900 bg-neutral-950 px-5 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
          audit trail · signed events
        </h3>
        <p className="mt-0.5 text-xs text-neutral-500">
          Every release decision is attributable to a policy rule, a named
          agent, and an artifact hash.
        </p>
      </header>
      <ol className="divide-y divide-neutral-900 text-xs">
        {sorted.map((e) => (
          <li
            key={e.id}
            className="grid grid-cols-[auto_auto_1fr_auto] items-baseline gap-x-4 px-5 py-3"
          >
            <span className="font-mono text-[11px] text-neutral-500 tabular-nums">
              {formatStamp(e.timestamp)}
            </span>
            <span
              className={`font-mono text-[11px] uppercase tracking-[0.12em] ${ACTOR_TONE[e.actor]}`}
            >
              {e.actor}
            </span>
            <span className="text-neutral-200">{e.action}</span>
            <span className="text-right">
              <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500">
                {REASON_LABEL[e.reasonCode]}
              </span>
              <span className="block font-mono text-[11px] text-neutral-400">
                {e.artifactHash}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <footer className="border-t border-neutral-900 bg-neutral-950 px-5 py-2 text-[10px] uppercase tracking-[0.16em] text-neutral-500">
        <span>policy · {sorted[0]?.policyVersion}</span>
        <span className="float-right">{sorted.length} events</span>
      </footer>
    </section>
  );
}
