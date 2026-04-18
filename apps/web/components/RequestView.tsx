import type { ProjectedView } from "@/lib/projection";
import type {
  FlexibilityPassport,
  ReadinessClass,
  RiskClass,
  SiteContext,
  SourceRef,
  WorkloadMix,
} from "@/lib/types";
import { FieldRow } from "./FieldRow";
import { SectionCard } from "./SectionCard";

const riskColor = (r: RiskClass) =>
  ({ low: "text-lime-400", medium: "text-amber-400", high: "text-red-400" })[r];

const readinessColor = (r: ReadinessClass) =>
  ({
    green: "text-lime-400",
    yellow: "text-amber-400",
    red: "text-red-400",
  })[r];

export function RequestView({ view }: { view: ProjectedView }) {
  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        title="Request header"
        subtitle="Public request metadata. Always visible."
        tone="public"
      >
        <FieldRow f={view.header.applicantOrg} />
        <FieldRow
          f={view.header.site}
          format={(s: SiteContext) => s.displayName}
        />
        <FieldRow
          f={view.header.requestedMW}
          format={(n: number) => `${n} MW`}
        />
        <FieldRow f={view.header.targetCOD} />
        <FieldRow f={view.header.phases} />
      </SectionCard>

      <SectionCard
        title="Private profile"
        subtitle="Applicant-submitted raw inputs. Sealed for utility and regulator."
        tone="private"
      >
        <FieldRow
          f={view.privateProfile.flexPercent}
          format={(n: number) => `${n}%`}
        />
        <FieldRow
          f={view.privateProfile.redundancyShiftPercent}
          format={(n: number) => `${n}%`}
        />
        <FieldRow
          f={view.privateProfile.backupGenMW}
          format={(n: number) => `${n} MW`}
        />
        <FieldRow
          f={view.privateProfile.backupGenHours}
          format={(n: number) => `${n} hr`}
        />
        <FieldRow
          f={view.privateProfile.bessMW}
          format={(n: number) => `${n} MW`}
        />
        <FieldRow
          f={view.privateProfile.bessHours}
          format={(n: number) => `${n} hr`}
        />
        <FieldRow
          f={view.privateProfile.internalScheduleConfidence}
          format={(n: number) => `${Math.round(n * 100)}%`}
        />
        <FieldRow
          f={view.privateProfile.workloadMix}
          format={(w: WorkloadMix) =>
            `training ${Math.round(w.training * 100)}% · inference ${Math.round(
              w.inference * 100,
            )}%`
          }
        />
      </SectionCard>

      <SectionCard
        title="Public evidence"
        subtitle="Gathered from parcel, permit, and hazard sources. Visible to all."
        tone="public"
      >
        <FieldRow
          f={view.publicEvidence.floodRisk}
          format={(r: RiskClass) => (
            <span className={riskColor(r)}>{r}</span>
          )}
        />
        <FieldRow
          f={view.publicEvidence.permitRisk}
          format={(r: RiskClass) => (
            <span className={riskColor(r)}>{r}</span>
          )}
        />
        <FieldRow
          f={view.publicEvidence.zoningRisk}
          format={(r: RiskClass) => (
            <span className={riskColor(r)}>{r}</span>
          )}
        />
        <FieldRow
          f={view.publicEvidence.siteControlEvidence}
          format={(v: boolean) => (v ? "on file" : "missing")}
        />
        {view.publicEvidence.notes.visible &&
        view.publicEvidence.notes.value ? (
          <div className="py-3">
            <div className="mb-1 text-[11px] uppercase tracking-[0.14em] text-neutral-500">
              notes
            </div>
            <ul className="list-disc pl-5 text-xs text-neutral-300 space-y-1">
              {view.publicEvidence.notes.value.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {view.publicEvidence.sourceRefs.visible &&
        view.publicEvidence.sourceRefs.value ? (
          <div className="py-3 border-t border-neutral-900">
            <div className="mb-1 text-[11px] uppercase tracking-[0.14em] text-neutral-500">
              sources
            </div>
            <ul className="space-y-1 text-xs">
              {view.publicEvidence.sourceRefs.value.map((s: SourceRef, i) => (
                <li key={i}>
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:text-sky-300 underline underline-offset-2"
                    >
                      {s.label}
                    </a>
                  ) : (
                    <span className="text-neutral-300">{s.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Derived proofs"
        subtitle="Policy-governed transformations of private + public inputs."
        tone="derived"
      >
        <FieldRow
          f={view.derivedProof.firmnessScore}
          format={(n: number) => `${n} / 100`}
        />
        <FieldRow
          f={view.derivedProof.expectedPeakMW}
          format={(b: [number, number]) => `${b[0]}–${b[1]} MW`}
        />
        <FieldRow
          f={view.derivedProof.flexibilityPassport}
          format={(p: FlexibilityPassport) =>
            `${p.mwMin}–${p.mwMax} MW · ${p.durationHoursMin}–${p.durationHoursMax} hr · class ${p.responseClass}`
          }
        />
        <FieldRow
          f={view.derivedProof.siteReadinessClass}
          format={(r: ReadinessClass) => (
            <span className={readinessColor(r)}>{r}</span>
          )}
        />
        <FieldRow f={view.derivedProof.energizationBand} />
        <FieldRow
          f={view.derivedProof.costExposureClass}
          format={(r: RiskClass) => (
            <span className={riskColor(r)}>{r}</span>
          )}
        />
        {view.derivedProof.topBlockers.visible &&
        view.derivedProof.topBlockers.value ? (
          <div className="py-3">
            <div className="mb-1 text-[11px] uppercase tracking-[0.14em] text-neutral-500">
              top blockers
            </div>
            <ol className="list-decimal pl-5 text-xs text-neutral-300 space-y-1">
              {view.derivedProof.topBlockers.value.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ol>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
