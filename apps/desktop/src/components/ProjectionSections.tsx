import type React from "react";
import type { FieldPath } from "@grid-passport/core/types";
import type {
  ProjectedField,
  ProjectedView,
} from "@grid-passport/core/projection";
import {
  ASK_INFO,
  type FieldBucket,
} from "@grid-passport/core/ask-reasons";

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number") return v.toString();
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (Array.isArray(v)) {
    if (v.length === 0) return "—";
    if (v.length === 2 && v.every((n) => typeof n === "number")) {
      return `${v[0]}–${v[1]}`;
    }
    if (typeof v[0] === "string") {
      return (v as string[]).join(" · ");
    }
    if (
      typeof v[0] === "object" &&
      v[0] !== null &&
      "startUtc" in (v[0] as Record<string, unknown>) &&
      "endUtc" in (v[0] as Record<string, unknown>) &&
      "deltaMW" in (v[0] as Record<string, unknown>)
    ) {
      return (v as Array<Record<string, unknown>>)
        .map((row) => {
          const start = String(row.startUtc ?? "");
          const end = String(row.endUtc ?? "");
          const delta = row.deltaMW;
          const duty = row.dailyDutyCycleHours;
          const workloadType = row.workloadType;
          return `${compactIso(start)} → ${compactIso(end)} · +${delta} MW${
            duty ? ` · ${duty} hr/day` : ""
          }${workloadType ? ` · ${String(workloadType)}` : ""}`;
        })
        .join(" || ");
    }
    return JSON.stringify(v);
  }
  if (typeof v === "object") {
    return JSON.stringify(v);
  }
  return String(v);
}

function compactIso(iso: string): string {
  return iso.replace(/T(\d{2}:\d{2}):\d{2}Z$/, " $1Z");
}

function Tooltip({
  trigger,
  body,
  className = "",
}: {
  trigger: React.ReactNode;
  body: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`tooltip-wrap ${className}`}>
      {trigger}
      <span className="tooltip-body" role="tooltip">
        {body}
      </span>
    </span>
  );
}

function FieldRow({ f }: { f: ProjectedField<unknown> }) {
  const info = ASK_INFO[f.path];
  return (
    <div className="pr-row">
      <div className="pr-key">
        <span className={`pr-chip chip-${f.class}`}>{f.class}</span>
        <span className="pr-label">{f.label}</span>
        {info ? (
          <Tooltip
            trigger={
              <span
                className="pr-why"
                aria-label={`why we ask: ${info.why}`}
              >
                ⓘ
              </span>
            }
            body={
              <>
                <div className="tt-label">why we ask</div>
                <div className="tt-text">{info.why}</div>
                {!f.visible ? (
                  <>
                    <div className="tt-sep" />
                    <div className="tt-label tt-label-seal">why sealed</div>
                    <div className="tt-text">{f.redactionReason}</div>
                  </>
                ) : null}
              </>
            }
          />
        ) : null}
      </div>
      <div className="pr-value">
        {f.visible ? (
          <span className="pr-val">{formatValue(f.value)}</span>
        ) : (
          <Tooltip
            className="tooltip-red"
            trigger={<span className="pr-red">[sealed]</span>}
            body={
              <>
                <div className="tt-label tt-label-seal">why sealed</div>
                <div className="tt-text">{f.redactionReason}</div>
              </>
            }
          />
        )}
      </div>
    </div>
  );
}

interface BucketSectionProps {
  title: string;
  tagline: string;
  fields: ProjectedField<unknown>[];
}

function BucketSection({ title, tagline, fields }: BucketSectionProps) {
  if (fields.length === 0) return null;
  return (
    <section className="pr-section">
      <div className="pr-section-head">
        <div className="pr-section-title">{title}</div>
        <div className="pr-section-tag">{tagline}</div>
      </div>
      <div className="pr-rows">
        {fields.map((f) => (
          <FieldRow key={f.path} f={f} />
        ))}
      </div>
    </section>
  );
}

function bucket(f: ProjectedField<unknown>): FieldBucket | undefined {
  return ASK_INFO[f.path as FieldPath]?.bucket;
}

export function ProjectionSections({ view }: { view: ProjectedView }) {
  const all: ProjectedField<unknown>[] = [
    ...Object.values(view.header),
    ...Object.values(view.privateProfile),
    ...Object.values(view.publicEvidence),
    ...Object.values(view.derivedProof),
  ];

  const byBucket = (b: FieldBucket) => all.filter((f) => bucket(f) === b);

  return (
    <div className="projection-sections">
      <BucketSection
        title="identity"
        tagline="who · what · where · when"
        fields={byBucket("identity")}
      />
      <BucketSection
        title="operational profile"
        tagline="only you know this · feeds the firmness proofs"
        fields={byBucket("operational")}
      />
      <BucketSection
        title="competitively sensitive"
        tagline="never in a PDF · sealed by policy · enables the MOSAIC passport"
        fields={byBucket("sensitive")}
      />
      <BucketSection
        title="public evidence"
        tagline="look-up-able · provided or Cartographer-fetched"
        fields={byBucket("evidence")}
      />
      <BucketSection
        title="derived proofs"
        tagline="computed · released by policy · what the utility plans against"
        fields={byBucket("computed")}
      />
    </div>
  );
}
