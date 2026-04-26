import type { Agent, HackathonData } from "@/lib/hackathon-data";
import { BlockLabel } from "./Shell";

export function Agents({ data }: { data: HackathonData }) {
  return (
    <section id="agents" className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <BlockLabel label="// meet the agents" />
        <h2 className="w-full text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-neutral-50 sm:text-5xl lg:text-[60px]">
          Four Skills. Two domains. Two contract axes.
        </h2>
        <p className="mt-3 max-w-2xl font-mono text-[14px] text-neutral-400">
          Each Skill has a <span className="text-cyan-300">SKILL.md</span> auto-discovered by
          Claude Code, a paired CI validator, and a content-hash-gated prompt-only baseline.
          <span className="text-cyan-300"> Write-scope</span> agents populate a named bucket and
          nothing else. <span className="text-cyan-300">Read-scope</span> agents consume a
          projected view and cannot see the private premise.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {data.agents.map((a) => (
            <AgentCard key={a.slug} agent={a} />
          ))}
        </div>

        <p className="mt-8 font-mono text-[13px] text-neutral-500">
          <span className="text-amber-300">Deliberately not AI</span> — projection, forecast,
          audit, signing, verification. Those are deterministic pure functions with unit tests.
          Agents propose. The math disposes.
        </p>
      </div>
    </section>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const contractLabel =
    agent.contract === "write" ? "WRITE-SCOPE" : "READ-SCOPE";
  const contractColor =
    agent.contract === "write" ? "text-cyan-300" : "text-amber-300";
  const borderColor =
    agent.contract === "write"
      ? "border-cyan-500/25"
      : "border-amber-500/25";

  return (
    <article
      className={`hud-frame relative flex flex-col gap-4 border ${borderColor} p-5`}
      style={{ ["--accent" as string]: agent.accent }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`font-mono text-[9.5px] uppercase tracking-[0.3em] ${contractColor}`}>
            {contractLabel} · {agent.domain}
          </div>
          <div className="mt-2 font-mono text-[15px] font-medium tracking-wide text-neutral-100">
            {agent.name}
          </div>
        </div>
        <div
          className="flex h-16 w-16 items-center justify-center border border-neutral-800 bg-black/40"
          style={{ color: agent.accent }}
        >
          <AgentGlyph slug={agent.glyph} />
        </div>
      </div>

      <p className="font-mono text-[14px] leading-relaxed text-neutral-300">
        &ldquo;{agent.quote}&rdquo;
      </p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-neutral-800 pt-3 font-mono text-[13px]">
        <dt className="text-neutral-500">writes</dt>
        <dd className="text-cyan-200">{agent.writes}</dd>
        <dt className="text-neutral-500">reads</dt>
        <dd className="text-neutral-300">{agent.reads}</dd>
      </dl>
    </article>
  );
}

function AgentGlyph({ slug }: { slug: Agent["glyph"] }) {
  const common = {
    viewBox: "0 0 64 64",
    width: 40,
    height: 40,
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (slug) {
    case "passport-seal":
      // booklet with hexagonal seal
      return (
        <svg {...common} aria-hidden>
          <rect x="12" y="10" width="36" height="44" rx="2" />
          <line x1="20" y1="20" x2="40" y2="20" />
          <line x1="20" y1="26" x2="36" y2="26" />
          <polygon points="32,36 40,40 40,48 32,52 24,48 24,40" />
          <circle cx="32" cy="44" r="2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "map-cartograph":
      // folded map with pin
      return (
        <svg {...common} aria-hidden>
          <path d="M 10 18 L 24 14 L 40 18 L 54 14 L 54 50 L 40 54 L 24 50 L 10 54 Z" />
          <line x1="24" y1="14" x2="24" y2="50" />
          <line x1="40" y1="18" x2="40" y2="54" />
          <circle cx="32" cy="28" r="3" fill="currentColor" stroke="none" />
          <line x1="32" y1="31" x2="32" y2="40" />
        </svg>
      );
    case "scroll-unrolled":
      // rolled scroll with waveform
      return (
        <svg {...common} aria-hidden>
          <path d="M 14 18 C 14 14 20 14 22 18 L 22 46 C 22 50 16 50 14 46 Z" />
          <path d="M 42 18 C 42 14 48 14 50 18 L 50 46 C 50 50 44 50 42 46 Z" />
          <line x1="22" y1="24" x2="42" y2="24" />
          <path d="M 24 34 q 3 -6 6 0 t 6 0 t 6 0 t 6 0" />
        </svg>
      );
    case "stethoscope-wave":
      // stethoscope tube with ECG blip
      return (
        <svg {...common} aria-hidden>
          <path d="M 16 14 L 16 28 a 8 8 0 0 0 16 0 L 32 14" />
          <circle cx="44" cy="34" r="5" />
          <path d="M 32 28 q 0 12 12 12" />
          <polyline points="12,50 22,50 26,42 30,56 34,48 44,48" />
        </svg>
      );
    case "forecast-bands":
      return (
        <svg {...common} aria-hidden>
          <polyline points="10,44 20,36 30,40 40,28 54,32" />
          <line x1="10" y1="20" x2="54" y2="20" strokeDasharray="2 3" />
          <line x1="10" y1="52" x2="54" y2="52" strokeDasharray="2 3" />
        </svg>
      );
    case "refereeing-scale":
      return (
        <svg {...common} aria-hidden>
          <line x1="32" y1="14" x2="32" y2="50" />
          <line x1="16" y1="20" x2="48" y2="20" />
          <path d="M 12 20 L 20 36 L 4 36 Z" />
          <path d="M 52 20 L 60 36 L 44 36 Z" />
          <rect x="26" y="50" width="12" height="4" />
        </svg>
      );
  }
}
