"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Role } from "@/lib/types";
import type { ProjectedView } from "@/lib/projection";
import type { CaseMeta } from "@/lib/fixtures";
import type { PolicySource } from "@/lib/policy-source";
import type { AuditEvent } from "@/lib/audit";
import type { SiteGeo } from "@/lib/geo/types";
import { RoleToggle } from "./RoleToggle";
import { RequestView } from "./RequestView";
import { LeakCounter } from "./LeakCounter";
import { CaseSelector } from "./CaseSelector";
import { CounterfactualSlider } from "./CounterfactualSlider";
import { PolicyPanel } from "./PolicyPanel";
import { EvidencePanel } from "./EvidencePanel";
import { AuditTrail } from "./AuditTrail";

interface ScenarioResponse {
  view: ProjectedView;
  baselineFlexPercent: number | null;
  auditEvents: AuditEvent[];
  override: { flexPercent?: number };
}

export function DemoClient({
  caseId,
  meta,
  initialRole,
  initialView,
  initialAuditEvents,
  policySource,
  geo,
}: {
  caseId: string;
  meta: CaseMeta;
  initialRole: Role;
  initialView: ProjectedView;
  initialAuditEvents: AuditEvent[];
  policySource: PolicySource;
  geo: SiteGeo;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  const [view, setView] = useState<ProjectedView>(initialView);
  const [auditEvents, setAuditEvents] =
    useState<AuditEvent[]>(initialAuditEvents);
  const [baselineFlexPercent, setBaselineFlexPercent] = useState<number | null>(
    null,
  );
  const [flexPercent, setFlexPercent] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const hasBaseline = baselineFlexPercent !== null;
  const isCounterfactual =
    hasBaseline && flexPercent !== null && flexPercent !== baselineFlexPercent;

  useEffect(() => {
    setRole(initialRole);
    setView(initialView);
    setAuditEvents(initialAuditEvents);
    setBaselineFlexPercent(null);
    setFlexPercent(null);
  }, [caseId, initialRole, initialView, initialAuditEvents]);

  useEffect(() => {
    const isInitialBaseline =
      role === initialRole && (flexPercent === null || !isCounterfactual);
    if (isInitialBaseline && !hasBaseline) {
      setView(initialView);
      setAuditEvents(initialAuditEvents);
      return;
    }
    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setPending(true);
      try {
        const payload: Record<string, unknown> = { caseId, role };
        if (flexPercent !== null) payload.flexPercent = flexPercent;
        const res = await fetch("/api/scenario", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`scenario ${res.status}`);
        const body = (await res.json()) as ScenarioResponse;
        setView(body.view);
        setAuditEvents(body.auditEvents);
        if (body.baselineFlexPercent !== null) {
          setBaselineFlexPercent(body.baselineFlexPercent);
          if (flexPercent === null) setFlexPercent(body.baselineFlexPercent);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") console.error(err);
      } finally {
        setPending(false);
      }
    }, 120);
    return () => clearTimeout(handle);
  }, [
    caseId,
    role,
    flexPercent,
    initialRole,
    initialView,
    initialAuditEvents,
    hasBaseline,
    isCounterfactual,
  ]);

  const scenarioBanner = (() => {
    if (!isCounterfactual || flexPercent === null) return null;
    const resetToBaseline = () => {
      if (baselineFlexPercent !== null) setFlexPercent(baselineFlexPercent);
    };
    return (
      <span className="inline-flex items-center gap-2 rounded-md border border-lime-900/60 bg-lime-950/40 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-lime-300">
        {role === "applicant"
          ? `scenario · flex ${flexPercent}% (baseline ${baselineFlexPercent}%)`
          : `applicant counterfactual · flex ${flexPercent}%`}
        <button
          type="button"
          onClick={resetToBaseline}
          className="ml-2 rounded border border-lime-800 bg-lime-950 px-1.5 py-0.5 text-[10px] text-lime-100 hover:bg-lime-900"
        >
          reset
        </button>
      </span>
    );
  })();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-baseline gap-4">
            <Link
              href="/"
              className="font-mono text-[13px] uppercase tracking-[0.22em] text-neutral-300 hover:text-white"
            >
              grid<span className="text-sky-400">·</span>passport
            </Link>
            <span className="text-xs text-neutral-500">
              {meta.displayName} ·{" "}
              <span className="text-neutral-300">
                {meta.requestedMW} MW · {meta.county}, VA
              </span>
            </span>
          </div>
          <RoleToggle value={role} onChange={setRole} />
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 pb-4">
          <CaseSelector currentCaseId={caseId} />
          <div className="flex items-center gap-3">
            {pending ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-lime-400">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-lime-400" />
                projecting…
              </span>
            ) : null}
            {scenarioBanner}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <LeakCounter view={view} />
        </div>

        <div className="mb-6 rounded-md border border-neutral-800 bg-neutral-950 p-5">
          <p className="text-sm leading-relaxed text-neutral-400">
            Same request object. Three roles. Visibility is decided by policy —
            not by which prompt the frontier model sees.
            {role === "applicant" ? (
              <span className="ml-1 text-neutral-500">
                Move the slider below to see how a flexibility commitment
                shifts the utility view — without revealing raw training mix
                or roadmap.
              </span>
            ) : (
              <span className="ml-1 text-neutral-500">
                Private inputs never leave the confidential path; the utility
                still gets enough to plan.
              </span>
            )}
          </p>
        </div>

        {role === "applicant" && hasBaseline && flexPercent !== null ? (
          <div className="mb-6">
            <CounterfactualSlider
              value={flexPercent}
              baseline={baselineFlexPercent!}
              onChange={setFlexPercent}
              pending={pending}
            />
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <RequestView view={view} />
          <EvidencePanel geo={geo} />
        </div>

        {role === "regulator" ? (
          <div className="mt-6 grid gap-6">
            <AuditTrail events={auditEvents} />
            <PolicyPanel source={policySource} />
          </div>
        ) : null}

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-900 pt-5 text-[11px] text-neutral-500">
          <span>
            request id ·{" "}
            <span className="font-mono text-neutral-400">{view.requestId}</span>
          </span>
          <span>
            policy ·{" "}
            <span className="font-mono text-neutral-400">
              {view.policyVersion}
            </span>
          </span>
          <span className="uppercase tracking-[0.16em]">
            all data synthetic · simulated confidential boundary
          </span>
        </footer>
      </main>
    </div>
  );
}
