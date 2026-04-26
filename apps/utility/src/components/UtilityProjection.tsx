import type { ProjectedView } from "@grid-passport/core/projection";

/**
 * Render a utility-role `ProjectedView` from a verified bundle.
 *
 * This is a deliberately self-contained renderer — it does NOT pull from
 * `apps/desktop/src/components/` or `apps/web/components/`. The utility
 * binary's write-scope guard (`pnpm canary:utility`) keeps the import
 * graph scoped; duplicating a ~60-line presentation block here is
 * cheaper than hoisting a shared package for one demo-surface.
 *
 * The renderer reads only visible fields (private-bucket fields are
 * always sealed on the utility view by construction — the projection
 * layer has already zeroed them out). Sealed fields are surfaced as a
 * count + a redaction reason, not silenced.
 */

interface UtilityProjectionProps {
  view: ProjectedView;
}

export function UtilityProjection({ view }: UtilityProjectionProps) {
  const header = view.header;
  const pub = view.publicEvidence;
  const d = view.derivedProof;

  const sealedPrivateCount = Object.values(view.privateProfile).filter(
    (f) => !f.visible,
  ).length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        fontSize: 12,
      }}
    >
      <Section title="header">
        <Field label="applicant" value={valOrDash(header.applicantOrg.value)} />
        <Field
          label="requested"
          value={
            header.requestedMW.value !== null
              ? `${header.requestedMW.value} MW`
              : "—"
          }
        />
        <Field label="target COD" value={valOrDash(header.targetCOD.value)} />
        <Field
          label="phases"
          value={
            header.phases.value !== null ? String(header.phases.value) : "—"
          }
        />
        <Field
          label="site"
          value={
            header.site.value
              ? `${header.site.value.displayName} · ${header.site.value.county}, ${header.site.value.state}`
              : "—"
          }
        />
      </Section>

      <Section title="derived proofs (utility view)">
        <Field
          label="firmness score"
          value={
            d.firmnessScore.value !== null
              ? `${d.firmnessScore.value} / 100`
              : sealedLabel(d.firmnessScore.redactionReason)
          }
        />
        <Field
          label="expected peak"
          value={
            d.expectedPeakMW.value
              ? `${d.expectedPeakMW.value[0]}–${d.expectedPeakMW.value[1]} MW`
              : sealedLabel(d.expectedPeakMW.redactionReason)
          }
        />
        <Field
          label="flexibility passport"
          value={
            d.flexibilityPassport.value
              ? `Class ${d.flexibilityPassport.value.responseClass} · ${d.flexibilityPassport.value.mwMin}–${d.flexibilityPassport.value.mwMax} MW · ${d.flexibilityPassport.value.durationHoursMin}–${d.flexibilityPassport.value.durationHoursMax} h`
              : sealedLabel(d.flexibilityPassport.redactionReason)
          }
        />
        <Field
          label="energization band"
          value={valOrSealed(
            d.energizationBand.value,
            d.energizationBand.redactionReason,
          )}
        />
        <Field
          label="site readiness"
          value={valOrSealed(
            d.siteReadinessClass.value,
            d.siteReadinessClass.redactionReason,
          )}
        />
        <Field
          label="cost exposure"
          value={valOrSealed(
            d.costExposureClass.value,
            d.costExposureClass.redactionReason,
          )}
        />
        <Field
          label="top blockers"
          value={
            d.topBlockers.value && d.topBlockers.value.length > 0
              ? d.topBlockers.value.join(" · ")
              : d.topBlockers.value
                ? "none"
                : sealedLabel(d.topBlockers.redactionReason)
          }
        />
      </Section>

      <Section title="public evidence">
        <Field
          label="flood risk"
          value={valOrSealed(pub.floodRisk.value, pub.floodRisk.redactionReason)}
        />
        <Field
          label="permit risk"
          value={valOrSealed(
            pub.permitRisk.value,
            pub.permitRisk.redactionReason,
          )}
        />
        <Field
          label="zoning risk"
          value={valOrSealed(
            pub.zoningRisk.value,
            pub.zoningRisk.redactionReason,
          )}
        />
        <Field
          label="site control"
          value={
            pub.siteControlEvidence.value === null
              ? sealedLabel(pub.siteControlEvidence.redactionReason)
              : pub.siteControlEvidence.value
                ? "on file"
                : "not on file"
          }
        />
        <Field
          label="source refs"
          value={
            pub.sourceRefs.value
              ? `${pub.sourceRefs.value.length} record(s)`
              : sealedLabel(pub.sourceRefs.redactionReason)
          }
        />
      </Section>

      <Section title="sealed fields">
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--amber, #f59e0b)",
            padding: 8,
            border: "1px solid var(--border)",
            background: "var(--bg)",
          }}
        >
          {sealedPrivateCount} applicant private field(s) · redacted per
          release policy · raw values never cross the projection boundary
        </div>
      </Section>

      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          color: "var(--ink-mute, #525252)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        policy · <span style={{ color: "var(--ink-dim, #a3a3a3)" }}>{view.policyVersion}</span>
        {" · "}
        visible {view.stats.visibleCount} / {view.stats.totalClassified}{" · "}
        released proofs {view.stats.releasedProofCount}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--sky)",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: 12,
        alignItems: "baseline",
      }}
    >
      <span
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: "var(--ink-mute, #525252)",
        }}
      >
        {label}
      </span>
      <span style={{ color: "var(--ink)" }}>{value}</span>
    </div>
  );
}

function valOrDash<T>(v: T | null): string {
  return v === null || v === undefined ? "—" : String(v);
}

function valOrSealed<T>(v: T | null, reason: string): string {
  return v === null || v === undefined ? sealedLabel(reason) : String(v);
}

function sealedLabel(reason: string): string {
  return reason ? `[sealed · ${reason}]` : "[sealed]";
}
