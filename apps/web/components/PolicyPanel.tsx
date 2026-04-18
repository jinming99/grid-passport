"use client";

import { useState } from "react";
import type { PolicySource } from "@/lib/policy-source";

export function PolicyPanel({ source }: { source: PolicySource }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-md border border-sky-900/40 bg-sky-950/10 overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-900 bg-neutral-950 px-5 py-3">
        <div className="flex flex-col">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
            canonical release policy
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500">
            {source.path} · {source.lineCount} lines
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <div className="flex flex-col items-end">
            <span className="uppercase tracking-[0.16em] text-neutral-500">
              sha-256
            </span>
            <span className="font-mono text-neutral-300">
              {source.sha256.slice(0, 12)}…{source.sha256.slice(-8)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-[11px] uppercase tracking-wider text-neutral-300 hover:border-neutral-700 hover:text-white"
          >
            {open ? "hide rego" : "show rego"}
          </button>
        </div>
      </header>
      {open ? (
        <pre className="overflow-x-auto bg-neutral-950 px-5 py-4 font-mono text-[11px] leading-relaxed text-neutral-300">
          {source.text}
        </pre>
      ) : (
        <div className="px-5 py-4 text-xs text-neutral-400 leading-relaxed">
          Every release decision in this view was evaluated against the rules in{" "}
          <span className="font-mono text-neutral-200">{source.path}</span>.
          The TS runtime at{" "}
          <span className="font-mono text-neutral-200">
            apps/web/lib/policy.ts
          </span>{" "}
          mirrors these rules; a future build swaps it for a real OPA call
          without changing the API surface.
        </div>
      )}
    </section>
  );
}
