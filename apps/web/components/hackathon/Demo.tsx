import type { DemoStage, HackathonData } from "@/lib/hackathon-data";

const TONE: Record<
  DemoStage["tone"],
  {
    ring: string;
    tick: "cyan" | "amber" | "lime";
    accent: string;       // text color for heading / number
    badge: string;        // border + text + bg for badges
    dot: string;
    glow: string;         // radial-gradient class
    outputBg: string;
    outputText: string;
  }
> = {
  cyan: {
    ring: "border-cyan-400/40",
    tick: "cyan",
    accent: "text-cyan-300",
    badge: "border-cyan-400/40 bg-cyan-500/5 text-cyan-200",
    dot: "bg-cyan-400",
    glow: "bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.08),transparent_75%)]",
    outputBg: "bg-cyan-500/10 border-cyan-400/40",
    outputText: "text-cyan-100",
  },
  amber: {
    ring: "border-amber-400/50",
    tick: "amber",
    accent: "text-amber-300",
    badge: "border-amber-400/40 bg-amber-500/5 text-amber-200",
    dot: "bg-amber-400",
    glow: "bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.10)_0%,transparent_75%)]",
    outputBg: "bg-amber-500/10 border-amber-400/40",
    outputText: "text-amber-100",
  },
  lime: {
    ring: "border-lime-400/45",
    tick: "lime",
    accent: "text-lime-300",
    badge: "border-lime-400/40 bg-lime-500/5 text-lime-200",
    dot: "bg-lime-400",
    glow: "bg-[radial-gradient(ellipse_at_top,rgba(132,204,22,0.10)_0%,transparent_75%)]",
    outputBg: "bg-lime-500/10 border-lime-400/40",
    outputText: "text-lime-100",
  },
};

export function Demo({ data }: { data: HackathonData }) {
  const d = data.demo;
  return (
    <section id="demo" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-cyan-400/80">
          // the demo
        </div>

        <h2 className="mt-4 w-full text-3xl font-semibold leading-[1.1] tracking-tight text-neutral-50 sm:text-4xl lg:text-[40px]">
          {d.headline}
        </h2>

        <p className="mt-5 max-w-3xl font-mono text-[14px] leading-relaxed text-neutral-400">
          {d.subhead}
        </p>

        {/* scenario strip */}
        <div className="mt-8 hud-frame flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-400/80">
              scenario
            </div>
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-[18px] font-medium text-neutral-100">
                {d.scenario.codename}
              </span>
              <span className="font-mono text-[12px] text-neutral-400">
                {d.scenario.context}
              </span>
            </div>
          </div>
          <blockquote className="max-w-xl font-mono text-[12px] italic leading-relaxed text-neutral-300 sm:text-right">
            {d.scenario.ask}
          </blockquote>
        </div>

        {/* 3-stage pipeline */}
        <div className="mt-10 grid items-stretch gap-4 lg:grid-cols-3">
          {d.stages.map((stage, i) => (
            <StageColumn key={stage.id} stage={stage} isLast={i === d.stages.length - 1} />
          ))}
        </div>

        {/* flow summary line · readable at a glance */}
        <div className="mt-10 border-t border-cyan-500/20 pt-6">
          <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
            <span className="text-cyan-300">raw intake</span>
            <span className="text-neutral-600">─▶</span>
            <span className="text-amber-300">sealed bundle</span>
            <span className="text-neutral-600">─▶</span>
            <span className="text-lime-300">commitment-ready proof</span>
            <span className="mx-3 text-neutral-700">·</span>
            <span className="text-neutral-400">zero cloud boundary crossed</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function StageColumn({ stage, isLast }: { stage: DemoStage; isLast: boolean }) {
  const t = TONE[stage.tone];
  return (
    <article className={`relative flex flex-col overflow-hidden border ${t.ring} bg-[#050912]`}>
      <div aria-hidden className={`pointer-events-none absolute inset-0 -z-10 ${t.glow}`} />
      <CornerTicks color={t.tick} />

      {/* header · number + app name + subtitle */}
      <div className="border-b border-current/15 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className={`font-mono text-[11px] uppercase tracking-[0.3em] ${t.accent}`}>
              {stage.number}
            </span>
            <h3 className="font-mono text-[15px] font-medium tracking-wide text-neutral-100">
              {stage.app}
            </h3>
          </div>
          {!isLast && (
            <span className="hidden text-cyan-500/70 lg:inline" aria-hidden>
              ▶
            </span>
          )}
        </div>
        <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.2em] text-neutral-500">
          {stage.subtitle}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${t.dot}`} />
          <span className="font-mono text-[11px] text-neutral-400">{stage.role}</span>
        </div>
      </div>

      {/* features */}
      <Section heading={stage.features.heading} accent={t.accent} items={stage.features.items} />

      {/* technical */}
      <Section
        heading={stage.technical.heading}
        accent={t.accent}
        items={stage.technical.items}
        compact
      />

      {/* output + trust chips */}
      <div className="mt-auto flex flex-col gap-3 border-t border-current/15 px-5 py-4">
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-neutral-500">
            // output
          </div>
          <div className={`mt-1.5 border px-3 py-2 font-mono text-[12.5px] ${t.outputBg} ${t.outputText}`}>
            {stage.output}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {stage.trust.map((chip, i) => (
            <span
              key={i}
              className={`border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.2em] ${t.badge}`}
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function Section({
  heading,
  accent,
  items,
  compact = false,
}: {
  heading: string;
  accent: string;
  items: string[];
  compact?: boolean;
}) {
  return (
    <div className={`px-5 ${compact ? "py-3" : "py-4"}`}>
      <div className={`mb-2 font-mono text-[9.5px] uppercase tracking-[0.28em] ${accent}`}>
        {heading}
      </div>
      <ul className="flex flex-col gap-2 border-l border-current/20 pl-3">
        {items.map((it, i) => (
          <li
            key={i}
            className="font-mono text-[11.5px] leading-relaxed text-neutral-300"
          >
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CornerTicks({
  color = "cyan",
  size = "md",
}: {
  color?: "cyan" | "amber" | "lime";
  size?: "sm" | "md";
}) {
  const c =
    color === "amber"
      ? "border-amber-400"
      : color === "lime"
        ? "border-lime-400"
        : "border-cyan-400";
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
