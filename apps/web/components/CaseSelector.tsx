import Link from "next/link";
import { CASE_METAS } from "@grid-passport/core/fixtures";

export function CaseSelector({ currentCaseId }: { currentCaseId: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
        case
      </span>
      <div className="inline-flex flex-wrap gap-1">
        {CASE_METAS.map((c) => {
          const active = c.caseId === currentCaseId;
          return (
            <Link
              key={c.caseId}
              href={`/demo/${c.caseId}`}
              prefetch={false}
              className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                active
                  ? "border-sky-600 bg-sky-950/40 text-sky-200"
                  : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-100"
              }`}
              title={c.tagline}
            >
              <span className="font-medium">{c.displayName}</span>
              <span className="ml-2 font-mono text-[10px] text-neutral-500">
                {c.requestedMW} MW
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
