import type { CaseResult, HackathonData } from "@/lib/hackathon-data";
import { BlockLabel } from "./Shell";

const VERDICT_STYLE: Record<CaseResult["verdict"], { badge: string; label: string }> = {
  clears: {
    badge: "border-lime-500/50 bg-lime-500/10 text-lime-300",
    label: "✓ clears threshold",
  },
  flat: {
    badge: "border-neutral-700 bg-neutral-800/40 text-neutral-300",
    label: "— flat",
  },
  borderline: {
    badge: "border-amber-500/50 bg-amber-500/10 text-amber-300",
    label: "◆ borderline",
  },
};

export function CaseStudies({ data }: { data: HackathonData }) {
  return (
    <section id="cases" className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <BlockLabel label="// case studies" />
        <h2 className="w-full text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-neutral-50 sm:text-5xl lg:text-[60px]">
          Three scenarios. One pre-registered threshold. Every number traces
          back to the repo.
        </h2>
        <p className="mt-3 max-w-2xl font-mono text-[14px] text-neutral-400">
          Pilot · n=1 per cell · four conditions A/B/C/D · one seed · twelve cells.
          Results live in{" "}
          <code className="text-cyan-300">packages/eval-sim/results/pilot/</code>.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {data.cases.map((c) => (
            <CaseCard key={c.slug} c={c} />
          ))}
        </div>

        <p className="mt-6 font-mono text-[13px] leading-relaxed text-neutral-500">
          <span className="text-amber-300">Honest footprint.</span> n=1 per cell — directional,
          not replicable. S1 clears the pre-registered{" "}
          <code className="text-neutral-300">Rounds(D) ≤ 0.5 × Rounds(B)</code> threshold. S2
          flat. S3 borderline. Main sweep ($400–1200 SDK, 455 runs) is budgeted but deferred.
          Cross-family judge spot-check (Sonnet vs Opus) preserves D &gt; B rank ordering with
          no disagreement greater than one Likert.
        </p>
      </div>
    </section>
  );
}

function CaseCard({ c }: { c: CaseResult }) {
  const v = VERDICT_STYLE[c.verdict];
  return (
    <article className="hud-frame flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.3em] text-neutral-500">
            {c.kind}
          </div>
          <div className="mt-1 font-mono text-[18px] font-medium tracking-wide text-neutral-100">
            {c.codename} <span className="text-neutral-600">·</span>{" "}
            <span className="text-cyan-200">{c.mw} MW</span>
          </div>
          <div className="mt-0.5 font-mono text-[13px] text-neutral-500">{c.county}</div>
        </div>
        <span
          className={`shrink-0 border px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.22em] ${v.badge}`}
        >
          {v.label}
        </span>
      </div>

      <p className="font-mono text-[14px] leading-relaxed text-neutral-300">{c.headline}</p>

      <dl className="grid grid-cols-3 gap-2 border-t border-neutral-800 pt-4">
        <Metric label="OPR Δ (D−B)" value={c.oprDelta > 0 ? `+${c.oprDelta.toFixed(3)}` : c.oprDelta.toFixed(3)} tone={c.verdict} />
        <Metric label="regret (max)" value={c.regretMax.toFixed(2)} tone="neutral" />
        <Metric label="H-null leak" value={String(c.hNullLeakage)} tone={c.hNullLeakage === 0 ? "good" : "bad"} />
      </dl>
    </article>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "clears" | "flat" | "borderline" | "good" | "bad" | "neutral";
}) {
  const color =
    tone === "clears" || tone === "good"
      ? "text-lime-300"
      : tone === "borderline"
        ? "text-amber-300"
        : tone === "bad"
          ? "text-rose-300"
          : "text-neutral-200";
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </div>
      <div className={`mt-1 font-mono text-[14px] ${color}`}>{value}</div>
    </div>
  );
}
