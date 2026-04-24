"use client";

import { useEffect, useState } from "react";
import type {
  BucketSpec,
  HackathonData,
  Problem,
  ProblemSource,
} from "@/lib/hackathon-data";

type Tone = "neutral" | "primary" | "warn";

const COVERAGE_MARK: Record<Problem["coverage"], { glyph: string; label: string; tone: string }> = {
  full: { glyph: "✓", label: "full", tone: "text-lime-300 border-lime-500/50 bg-lime-500/5" },
  partial: { glyph: "~", label: "partial", tone: "text-amber-300 border-amber-500/50 bg-amber-500/5" },
  none: { glyph: "—", label: "not modeled", tone: "text-neutral-400 border-neutral-700 bg-neutral-900/40" },
};

export function Problems({ data }: { data: HackathonData }) {
  const coordProblems = data.problems.filter((p) => p.bucket === "coord");
  const infraProblems = data.problems.filter((p) => p.bucket === "infra");

  // single modal lifted to the top — only one problem open at a time
  const [active, setActive] = useState<Problem | null>(null);

  return (
    <section id="problems" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="w-full text-3xl font-semibold leading-[1.1] tracking-tight text-neutral-50 sm:text-4xl lg:text-[40px]">
          {data.problemsHeadline}
        </h2>

        <p className="mt-5 w-full font-mono text-[14px] leading-relaxed text-neutral-400">
          Two buckets of reasons. One is physics — the grid takes years to build.
          The other is software — coordination between data centers and utilities is broken.
        </p>

        {/* two-bucket split · each bucket contains its own problems (click to reveal) */}
        <div className="mt-8 grid items-start gap-4 md:grid-cols-2">
          <BucketCard
            spec={data.buckets.coord}
            tone="primary"
            problems={coordProblems}
            onOpenProblem={setActive}
          />
          <BucketCard
            spec={data.buckets.infra}
            tone="warn"
            problems={infraProblems}
            onOpenProblem={setActive}
          />
        </div>
      </div>

      {active ? (
        <ProblemModal problem={active} onClose={() => setActive(null)} />
      ) : null}
    </section>
  );
}

function BucketCard({
  spec,
  tone,
  problems,
  onOpenProblem,
}: {
  spec: BucketSpec;
  tone: Tone;
  problems: Problem[];
  onOpenProblem: (p: Problem) => void;
}) {
  const [open, setOpen] = useState(false);

  const style = bucketStyle(tone);

  return (
    <div
      className={`hud-frame relative overflow-hidden p-5 ${style.border}`}
      style={{ borderWidth: 1, borderStyle: "solid" }}
    >
      <div aria-hidden className={`pointer-events-none absolute inset-0 -z-10 ${style.glow}`} />
      <CornerTicks color={style.tick} />

      <div className="flex items-center justify-between">
        <div className={`font-mono text-[10px] uppercase tracking-[0.3em] ${style.label}`}>
          {spec.label}
        </div>
        <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-neutral-500">
          {spec.role}
        </div>
      </div>

      <p className="mt-4 font-mono text-[14px] leading-relaxed text-neutral-300">
        {spec.body}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[11.5px] uppercase tracking-[0.2em]">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${style.dot}`} />
          <span className={style.count}>
            {spec.count} {spec.count === 1 ? "problem" : "problems"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`font-mono text-[11.5px] uppercase tracking-[0.22em] transition-colors ${style.btn}`}
        >
          {open ? `◂ close · ${problems.length}` : `▸ open · ${problems.length}`}
        </button>
      </div>

      {open && (
        <div
          className="mt-5 flex flex-col gap-3 border-t border-dashed border-current/20 pt-5"
          style={{ animation: "hud-peel-in 260ms ease-out both" }}
        >
          {problems.map((p, i) => (
            <ProblemRow
              key={p.id}
              problem={p}
              index={i}
              bucketTone={tone}
              onOpen={() => onOpenProblem(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProblemRow({
  problem,
  index,
  bucketTone,
  onOpen,
}: {
  problem: Problem;
  index: number;
  bucketTone: Tone;
  onOpen: () => void;
}) {
  const tickColor = bucketTone === "warn" ? ("red" as const) : ("cyan" as const);
  const borderColor = bucketTone === "warn" ? "border-red-500/30" : "border-cyan-400/25";
  const idColor = bucketTone === "warn" ? "text-red-300/80" : "text-neutral-500";
  const openColor =
    bucketTone === "warn"
      ? "text-red-300 hover:text-red-200"
      : "text-cyan-300 hover:text-cyan-200";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative flex flex-col gap-2 overflow-hidden border ${borderColor} bg-[#0a0f1c]/70 p-4 text-left transition-colors hover:bg-[#0f1626]/80`}
      style={{
        animation: "hud-line-in 260ms ease-out both",
        animationDelay: `${index * 70}ms`,
      }}
    >
      <CornerTicks color={tickColor} />

      <div className="flex items-start justify-between gap-3">
        <div className={`font-mono text-[10px] uppercase tracking-[0.28em] ${idColor}`}>
          [ {problem.id} / 06 ]
        </div>
        <div
          className={`font-mono text-[10px] uppercase tracking-[0.22em] transition-colors ${openColor}`}
        >
          ▸ open
        </div>
      </div>

      <h3 className="font-mono text-[14px] font-medium leading-snug text-neutral-100">
        {problem.headline}
      </h3>
    </button>
  );
}

function ProblemModal({ problem, onClose }: { problem: Problem; onClose: () => void }) {
  // ESC to close + scroll lock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const mark = COVERAGE_MARK[problem.coverage];
  const isInfra = problem.bucket === "infra";
  const theme = isInfra
    ? {
        tick: "red" as const,
        panelBorder: "border-red-500/45",
        panelShadow: "shadow-[0_0_48px_rgba(239,68,68,0.18)]",
        headerBorder: "border-red-500/25",
        headerTag: "text-red-300/90",
        closeHover: "hover:border-red-400/60 hover:text-red-200",
        sectionBorder: "border-red-500/25",
        sectionLabel: "text-red-300/80",
        coreText: "text-red-100",
      }
    : {
        tick: "cyan" as const,
        panelBorder: "border-cyan-400/40",
        panelShadow: "shadow-[0_0_48px_rgba(56,189,248,0.18)]",
        headerBorder: "border-cyan-500/20",
        headerTag: "text-cyan-400/80",
        closeHover: "hover:border-cyan-400/60 hover:text-cyan-200",
        sectionBorder: "border-cyan-500/20",
        sectionLabel: "text-cyan-400/70",
        coreText: "text-cyan-100",
      };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {/* backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        style={{ animation: "hud-peel-in 180ms ease-out both" }}
      />

      {/* modal panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden border bg-[#050912] ${theme.panelBorder} ${theme.panelShadow}`}
        style={{ animation: "hud-peel-in 240ms ease-out both" }}
      >
        <CornerTicks color={theme.tick} />

        {/* header · sticky at top */}
        <div className={`flex items-start justify-between gap-4 border-b bg-[#020510]/80 px-5 py-4 ${theme.headerBorder}`}>
          <div className="min-w-0 flex-1">
            <div className={`font-mono text-[10px] uppercase tracking-[0.3em] ${theme.headerTag}`}>
              [ {problem.id} / 06 ] · documented failure
            </div>
            <h3 className="mt-2 font-mono text-[18px] font-medium leading-snug text-neutral-100">
              {problem.headline}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className={`shrink-0 border border-neutral-700 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400 transition-colors ${theme.closeHover}`}
          >
            ✕ close
          </button>
        </div>

        {/* scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* EFFECT */}
          <ModalSection label="// effect" borderClass={theme.sectionBorder} labelClass={theme.sectionLabel}>
            <p className="font-mono text-[13px] leading-relaxed text-neutral-300">
              {problem.effect}
            </p>
          </ModalSection>

          {/* EVIDENCE */}
          <ModalSection
            label={`// evidence · ${problem.sources.length} source${problem.sources.length === 1 ? "" : "s"}`}
            borderClass={theme.sectionBorder}
            labelClass={theme.sectionLabel}
          >
            <div className="flex flex-col gap-4">
              {problem.sources.map((s, i) => (
                <SourceBlock key={i} source={s} tone={isInfra ? "warn" : "primary"} />
              ))}
            </div>
          </ModalSection>

          {/* CORE */}
          <ModalSection label="// core" borderClass={theme.sectionBorder} labelClass={theme.sectionLabel}>
            <p className={`font-mono text-[14px] font-medium leading-relaxed ${theme.coreText}`}>
              {problem.core}
            </p>

            <div className="mt-4 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] ${mark.tone}`}
              >
                <span className="font-bold">{mark.glyph}</span>
                GP coverage · {mark.label}
              </span>
            </div>

            <p className="mt-3 font-mono text-[11.5px] leading-relaxed text-neutral-400">
              {problem.coverageNote}
            </p>
          </ModalSection>
        </div>
      </div>
    </div>
  );
}

function ModalSection({
  label,
  borderClass,
  labelClass,
  children,
}: {
  label: string;
  borderClass: string;
  labelClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`mb-5 border-l pl-4 last:mb-0 ${borderClass}`}>
      <div className={`mb-2 font-mono text-[9.5px] uppercase tracking-[0.3em] ${labelClass}`}>
        {label}
      </div>
      {children}
    </div>
  );
}

function SourceBlock({
  source,
  tone = "primary",
}: {
  source: ProblemSource;
  tone?: Tone;
}) {
  const isWarn = tone === "warn";
  const accent = isWarn ? "border-red-400/45" : "border-cyan-400/40";
  const agencyColor = isWarn ? "text-red-300" : "text-cyan-300";
  const linkColor = isWarn
    ? "text-red-400 hover:text-red-200"
    : "text-cyan-400 hover:text-cyan-200";

  return (
    <div className={`border-l-2 pl-3 ${accent}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className={`font-mono text-[11.5px] uppercase tracking-[0.22em] ${agencyColor}`}>
          {source.agency}
          <span className="ml-2 text-neutral-500 normal-case tracking-normal">
            · {source.document}
          </span>
        </div>
      </div>
      <blockquote className="mt-1.5 font-mono text-[13px] leading-relaxed text-neutral-300">
        &ldquo;{source.quote}&rdquo;
      </blockquote>
      {source.url ? (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-1.5 inline-block font-mono text-[10px] uppercase tracking-[0.22em] transition-colors ${linkColor}`}
        >
          verify ↗
        </a>
      ) : null}
    </div>
  );
}

function bucketStyle(tone: Tone) {
  if (tone === "primary") {
    return {
      border: "border-cyan-400/35",
      tick: "cyan" as const,
      label: "text-cyan-300",
      dot: "bg-cyan-400",
      count: "text-cyan-200",
      glow: "bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.08),transparent_70%)]",
      btn: "text-cyan-300 hover:text-cyan-200",
    };
  }
  if (tone === "warn") {
    return {
      border: "border-red-500/45",
      tick: "red" as const,
      label: "text-red-300",
      dot: "bg-red-400",
      count: "text-red-200",
      glow: "bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.12),transparent_70%)]",
      btn: "text-red-300 hover:text-red-200",
    };
  }
  return {
    border: "border-neutral-700/60",
    tick: "neutral" as const,
    label: "text-neutral-400",
    dot: "bg-neutral-500",
    count: "text-neutral-400",
    glow: "",
    btn: "text-neutral-300 hover:text-neutral-100",
  };
}

function CornerTicks({
  color = "cyan",
  size = "md",
}: {
  color?: "cyan" | "neutral" | "red";
  size?: "sm" | "md";
}) {
  const c =
    color === "cyan"
      ? "border-cyan-400"
      : color === "red"
        ? "border-red-400"
        : "border-neutral-500";
  const s = size === "sm" ? "h-2 w-2" : "h-3 w-3";
  return (
    <>
      <span aria-hidden className={`pointer-events-none absolute left-0 top-0 ${s} border-l border-t ${c}`} />
      <span aria-hidden className={`pointer-events-none absolute right-0 top-0 ${s} border-r border-t ${c}`} />
      <span aria-hidden className={`pointer-events-none absolute bottom-0 left-0 ${s} border-b border-l ${c}`} />
      <span aria-hidden className={`pointer-events-none absolute bottom-0 right-0 ${s} border-b border-r ${c}`} />
    </>
  );
}
