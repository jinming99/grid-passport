import type {
  DocMapEdge,
  DocMapNode,
  DocumentMap,
  HackathonData,
  SolutionPillar,
} from "@/lib/hackathon-data";

const NODE_STYLE: Record<
  DocMapNode["kind"],
  { stroke: string; fill: string; label: string }
> = {
  applicant: { stroke: "#38bdf8", fill: "rgba(56,189,248,0.08)",  label: "text-cyan-200"    },
  evidence:  { stroke: "#84cc16", fill: "rgba(132,204,22,0.08)",  label: "text-lime-200"    },
  regulator: { stroke: "#fbbf24", fill: "rgba(251,191,36,0.08)",  label: "text-amber-200"   },
  platform:  { stroke: "#f472b6", fill: "rgba(244,114,182,0.10)", label: "text-fuchsia-200" },
  utility:   { stroke: "#c084fc", fill: "rgba(192,132,252,0.08)", label: "text-violet-200"  },
  audit:     { stroke: "#94a3b8", fill: "rgba(148,163,184,0.08)", label: "text-slate-200"   },
};

export function Solution({ data }: { data: HackathonData }) {
  const sol = data.solution;
  return (
    <section id="solution" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-cyan-400/80">
          {"// the solution"}
        </div>

        <h2 className="mt-4 w-full text-3xl font-semibold leading-[1.1] tracking-tight text-neutral-50 sm:text-4xl lg:text-[40px]">
          {sol.headline}
        </h2>

        <p className="mt-5 max-w-3xl font-mono text-[14px] leading-relaxed text-neutral-400">
          {sol.subhead}
        </p>

        {/* pipeline visual */}
        <div className="mt-10 hud-frame flex items-center justify-between gap-4 px-6 py-5 font-mono text-[13px] uppercase tracking-[0.2em]">
          <div className="flex flex-col items-start">
            <span className="text-[10px] text-neutral-500">raw demand</span>
            <span className="mt-1 text-cyan-100">{sol.pipeline.from}</span>
          </div>
          <div className="flex-1 border-t border-dashed border-cyan-500/30" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-cyan-300">secure translation</span>
            <span className="mt-1 rounded-sm border border-cyan-400/50 bg-cyan-500/10 px-3 py-1 text-cyan-100">
              {sol.pipeline.middle}
            </span>
          </div>
          <div className="flex-1 border-t border-dashed border-cyan-500/30" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-neutral-500">planning-ready</span>
            <span className="mt-1 text-cyan-100 text-right">{sol.pipeline.to}</span>
          </div>
        </div>

        {/* 3 pillars */}
        <div className="mt-8 grid items-stretch gap-4 lg:grid-cols-3">
          {sol.pillars.map((p) => (
            <PillarCard key={p.title} pillar={p} />
          ))}
        </div>

        {/* Document Map · featured callout */}
        <DocumentMapCallout map={sol.documentMap} />
      </div>
    </section>
  );
}

function PillarCard({ pillar }: { pillar: SolutionPillar }) {
  return (
    <article className="hud-frame relative flex flex-col gap-4 p-5">
      <CornerTicks color="cyan" />

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-cyan-400/40 bg-cyan-500/5 text-cyan-300">
          <PillarGlyph glyph={pillar.glyph} />
        </div>
        <div>
          <h3 className="font-mono text-[15px] font-medium tracking-wide text-neutral-100">
            {pillar.title}
          </h3>
          <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.2em] text-cyan-400/80">
            {pillar.tag}
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-2 border-t border-neutral-800 pt-3">
        {pillar.bullets.map((b, i) => (
          <li key={i} className="flex gap-2 font-mono text-[12.5px] leading-relaxed text-neutral-300">
            <span className="mt-[7px] inline-block h-1 w-1 shrink-0 rounded-full bg-cyan-400/70" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function PillarGlyph({ glyph }: { glyph: SolutionPillar["glyph"] }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 22,
    height: 22,
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (glyph) {
    case "shield":
      return (
        <svg {...common} aria-hidden>
          <path d="M12 3 L20 6 V12 C20 17 16 20 12 21 C8 20 4 17 4 12 V6 Z" />
          <path d="M9 12 L11 14 L15 10" />
        </svg>
      );
    case "brain":
      return (
        <svg {...common} aria-hidden>
          <path d="M9 5 C6 5 5 7 5 9 C3 10 3 13 5 14 C5 17 7 19 10 18 L10 6 C10 5 9 5 9 5 Z" />
          <path d="M15 5 C18 5 19 7 19 9 C21 10 21 13 19 14 C19 17 17 19 14 18 L14 6 C14 5 15 5 15 5 Z" />
          <line x1="12" y1="5" x2="12" y2="19" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...common} aria-hidden>
          <polygon points="13,2 4,14 11,14 10,22 20,10 13,10 13,2" />
        </svg>
      );
  }
}

function DocumentMapCallout({ map }: { map: DocumentMap }) {
  return (
    <section
      aria-label={map.title}
      className="relative mt-14 overflow-hidden border border-cyan-400/40 bg-[#050912] shadow-[0_0_48px_rgba(56,189,248,0.14)]"
    >
      <CornerTicks color="cyan" size="md" />

      {/* header strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 bg-[#020510]/70 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center border border-cyan-400/50 bg-cyan-500/5 text-cyan-300">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="6" cy="6" r="2.5" />
              <circle cx="18" cy="6" r="2.5" />
              <circle cx="6" cy="18" r="2.5" />
              <circle cx="18" cy="18" r="2.5" />
              <circle cx="12" cy="12" r="2.5" />
              <line x1="7.8" y1="7.8" x2="10.2" y2="10.2" />
              <line x1="16.2" y1="7.8" x2="13.8" y2="10.2" />
              <line x1="7.8" y1="16.2" x2="10.2" y2="13.8" />
              <line x1="16.2" y1="16.2" x2="13.8" y2="13.8" />
            </svg>
          </div>
          <div>
            <h3 className="font-mono text-[16px] font-medium tracking-wide text-neutral-100">
              {map.title}
            </h3>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">
              {map.tag}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {map.roles.map((r) => (
            <span
              key={r.label}
              className="border border-cyan-400/30 bg-cyan-500/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300"
              title={r.filter}
            >
              {r.label} · {r.filter}
            </span>
          ))}
        </div>
      </div>

      {/* body · pitch + two-col ingest/visualize + graph */}
      <div className="px-6 py-6">
        <p className="max-w-4xl font-mono text-[13px] leading-relaxed text-neutral-300">
          {map.pitch}
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          {/* ingests + visualizes */}
          <div className="flex flex-col gap-5">
            <ListSection heading={map.ingests.heading} items={map.ingests.items} />
            <ListSection heading={map.visualizes.heading} items={map.visualizes.items} />
          </div>

          {/* graph · SVG */}
          <div className="relative border border-cyan-400/20 bg-[#020510]/70 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-cyan-400/70">
                {"// case map · preview"}
              </div>
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-500">
                <LegendDot color="#38bdf8" label="applicant" />
                <LegendDot color="#84cc16" label="evidence" />
                <LegendDot color="#fbbf24" label="regulator" />
                <LegendDot color="#f472b6" label="platform" />
                <LegendDot color="#c084fc" label="utility" />
              </div>
            </div>
            <DocMapSvg map={map} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ListSection({ heading, items }: { heading: string; items: string[] }) {
  return (
    <div>
      <div className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.3em] text-cyan-400/70">
        {heading}
      </div>
      <ul className="flex flex-col gap-1.5 border-l border-cyan-500/20 pl-3">
        {items.map((it, i) => (
          <li key={i} className="font-mono text-[12px] leading-relaxed text-neutral-300">
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function DocMapSvg({ map }: { map: DocumentMap }) {
  const nodeById = new Map(map.nodes.map((n) => [n.id, n]));

  return (
    <svg
      viewBox="0 0 800 360"
      className="block h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 Z" fill="rgba(148,163,184,0.7)" />
        </marker>
      </defs>

      {/* edges first so nodes draw over them */}
      {map.edges.map((e, i) => (
        <EdgeLine key={i} edge={e} from={nodeById.get(e.from)!} to={nodeById.get(e.to)!} />
      ))}

      {/* nodes */}
      {map.nodes.map((n) => (
        <NodeRect key={n.id} node={n} />
      ))}
    </svg>
  );
}

function EdgeLine({ edge, from, to }: { edge: DocMapEdge; from: DocMapNode; to: DocMapNode }) {
  // slight curve: control point shifted toward the platform (center-ish)
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const mx = from.x + dx / 2;
  const my = from.y + dy / 2 + (Math.abs(dx) < 80 ? 0 : -12);
  const path = `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke="rgba(148,163,184,0.35)"
        strokeWidth="1"
        strokeDasharray="3 3"
        markerEnd="url(#arrow)"
      />
      {edge.label ? (
        <text
          x={mx}
          y={my - 4}
          textAnchor="middle"
          fontSize="9"
          fontFamily="ui-monospace, 'JetBrains Mono', monospace"
          fill="rgba(148,163,184,0.65)"
        >
          {edge.label}
        </text>
      ) : null}
    </g>
  );
}

function NodeRect({ node }: { node: DocMapNode }) {
  const style = NODE_STYLE[node.kind];
  const w = 116;
  const h = 36;
  const x = node.x - w / 2;
  const y = node.y - h / 2;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={4}
        ry={4}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth="1"
      />
      {/* corner ticks (tiny, top-left + bottom-right for HUD feel) */}
      <polyline
        points={`${x + 2},${y + 5} ${x + 2},${y + 2} ${x + 5},${y + 2}`}
        fill="none"
        stroke={style.stroke}
        strokeWidth="1.2"
      />
      <polyline
        points={`${x + w - 5},${y + h - 2} ${x + w - 2},${y + h - 2} ${x + w - 2},${y + h - 5}`}
        fill="none"
        stroke={style.stroke}
        strokeWidth="1.2"
      />
      <text
        x={node.x}
        y={node.y + 4}
        textAnchor="middle"
        fontSize="12"
        fontFamily="ui-monospace, 'JetBrains Mono', monospace"
        fill={style.stroke}
      >
        {node.label}
      </text>
    </g>
  );
}

function CornerTicks({
  color = "cyan",
  size = "md",
}: {
  color?: "cyan" | "neutral";
  size?: "sm" | "md";
}) {
  const c = color === "cyan" ? "border-cyan-400" : "border-neutral-500";
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
