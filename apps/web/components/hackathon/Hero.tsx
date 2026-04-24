import type { HackathonData, PipelineStage } from "@/lib/hackathon-data";

const TAG_COLOR: Record<PipelineStage["kind"], string> = {
  agent: "text-cyan-300",
  forecast: "text-sky-300",
  policy: "text-amber-300",
  bundle: "text-lime-300",
  verifier: "text-fuchsia-300",
};

export function Hero({ data }: { data: HackathonData }) {
  return (
    <section className="relative px-6 pt-20 pb-16 sm:pt-28">
      <div className="mx-auto max-w-6xl">
        {/* ─── 1 · TAGLINE · full-width headline above the hero image ─── */}
        <h1 className="w-full text-balance text-center text-4xl font-semibold leading-[1.1] tracking-tight text-neutral-50 sm:text-5xl lg:text-[60px]">
          Securely translate data center demand into{" "}
          <span className="text-cyan-300">grid-ready power insights.</span>
        </h1>

        {/* ─── 2 · BIG HERO IMAGE ─── */}
        <div className="relative mt-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-6 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.28),transparent_70%)] blur-2xl"
          />
          <div className="relative overflow-hidden border border-cyan-400/25 bg-[#0a0f1c]/60 shadow-[0_0_48px_rgba(56,189,248,0.18)]">
            {/* corner HUD ticks */}
            <span aria-hidden className="pointer-events-none absolute left-0 top-0 h-4 w-4 border-l border-t border-cyan-400" />
            <span aria-hidden className="pointer-events-none absolute right-0 top-0 h-4 w-4 border-r border-t border-cyan-400" />
            <span aria-hidden className="pointer-events-none absolute left-0 bottom-0 h-4 w-4 border-l border-b border-cyan-400" />
            <span aria-hidden className="pointer-events-none absolute right-0 bottom-0 h-4 w-4 border-r border-b border-cyan-400" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hackathon/hackathon-grid-hero.png"
              alt="Raw data-center demand flows through an AI-powered confidential platform and emerges as grid-ready insights"
              className="block h-auto w-full object-contain"
            />
          </div>
        </div>

        {/* ─── 3 · DESCRIPTION · single-line status readout, left-aligned, full width ─── */}
        <p className="mt-10 w-full text-left font-mono text-[14px] leading-relaxed text-neutral-400">
          {data.tagline}
        </p>

        {/* ─── 4 · SHELL + PASSPORT CONSOLE · side-by-side ─── */}
        <div className="mt-12 grid gap-5 lg:grid-cols-[1.35fr_1fr] lg:items-stretch">
          {/* LEFT · pipeline shell — live trace with staggered cascade */}
          <div className="hud-frame flex flex-col overflow-hidden font-mono text-[13px] leading-[1.7]">
            <div className="flex items-center justify-between border-b border-cyan-500/15 bg-[#020510]/60 px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-neutral-500">
              <span className="flex items-center gap-2">
                <span className="text-cyan-300/80">gridpassport$</span>
                <span className="hidden text-neutral-400 sm:inline">pnpm demo:case owl-compute</span>
              </span>
              <span className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-lime-400"
                  style={{ animation: "hud-dot-pulse 1.4s ease-in-out infinite" }}
                />
                <span className="text-lime-300/80">live</span>
              </span>
            </div>
            <div className="flex-1 px-4 py-4">
              {data.heroTerminal.map((stage, i) => {
                const isLast = i === data.heroTerminal.length - 1;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-x-3 py-1"
                    style={{
                      animation: "hud-line-in 260ms ease-out both",
                      animationDelay: `${i * 90}ms`,
                    }}
                  >
                    {/* status dot */}
                    <span
                      className={`mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full ${
                        isLast ? "bg-cyan-300" : "bg-lime-400/70"
                      }`}
                      style={
                        isLast
                          ? { animation: "hud-dot-pulse 1.2s ease-in-out infinite" }
                          : undefined
                      }
                    />

                    {/* tag · fixed width so prose aligns */}
                    <span
                      className={`w-[7.5rem] shrink-0 font-medium tracking-wider ${TAG_COLOR[stage.kind]}`}
                    >
                      [{stage.tag}]
                    </span>

                    {/* line · fills remaining, wraps, can shrink */}
                    <span className="min-w-0 flex-1 break-words text-neutral-300">
                      {stage.line}
                      {stage.meta ? (
                        <span className="ml-2 text-neutral-600">· {stage.meta}</span>
                      ) : null}
                    </span>
                  </div>
                );
              })}

              {/* live cursor line */}
              <div
                className="mt-2 flex items-baseline gap-2 text-cyan-300"
                style={{
                  animation: "hud-line-in 260ms ease-out both",
                  animationDelay: `${data.heroTerminal.length * 90 + 80}ms`,
                }}
              >
                <span className="text-cyan-300/70">gridpassport$</span>
                <span className="hud-caret">▮</span>
              </div>
            </div>
          </div>

          {/* RIGHT · passport console */}
          <PassportCard />
        </div>

        {/* ─── 4 · STAT STRIP ─── */}
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat big={`${data.stats.agentsShipped}`} label="claude agent skills · 2 domains" />
          <Stat
            big={`−${data.stats.contextSavingsPct}%`}
            label="upfront context vs prompt-only baseline"
          />
          <Stat big={`${data.stats.canaryGates}`} label="structural canary gates on every commit" />
          <Stat
            big={`${data.stats.crossLangVerifiers}×`}
            label="cross-language verifiers agree byte-for-byte"
          />
        </div>
      </div>
    </section>
  );
}

function Stat({ big, label }: { big: string; label: string }) {
  return (
    <div className="hud-frame px-4 py-4">
      <div className="font-mono text-[26px] leading-none text-cyan-200">{big}</div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </div>
    </div>
  );
}

function PassportCard() {
  return (
    <div className="relative h-full">
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.18),transparent_70%)] blur-2xl"
      />
      <div className="hud-frame flex h-full flex-col overflow-hidden p-5">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-300/80">
          <span>grid · passport</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-400 shadow-[0_0_6px_rgba(132,204,22,0.9)]" />
            sealed
          </span>
        </div>

        <div className="mt-5 border border-cyan-400/15 bg-[#030610]/70 p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
            case · owl compute
          </div>
          <div className="mt-1 font-mono text-[13px] text-neutral-500">prince william, va</div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-mono text-5xl font-medium tracking-tight text-cyan-200">
              180 <span className="text-lg text-cyan-400/70">MW</span>
            </span>
            <span className="border border-lime-500/40 bg-lime-500/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-lime-300">
              class B
            </span>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-y-3 font-mono text-[13px] leading-snug">
            <dt className="text-neutral-500">firmness</dt>
            <dd className="text-right text-neutral-200">59 / 100</dd>
            <dt className="text-neutral-500">flex passport</dt>
            <dd className="text-right text-neutral-200">32–44 MW · 3–4h</dd>
            <dt className="text-neutral-500">private fields sealed</dt>
            <dd className="text-right text-cyan-200">8 / 8</dd>
            <dt className="text-neutral-500">raw released</dt>
            <dd className="text-right text-lime-300">0</dd>
          </dl>

          <div className="mt-5 flex items-center justify-between border-t border-cyan-500/10 pt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
            <span>policy@0.1.0</span>
            <span className="text-cyan-400/70">ed25519 · jcs</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.3em] text-neutral-600">
          <span>bundle v1.0.0</span>
          <span>[ ●● ]</span>
          <span>keyid ed25</span>
        </div>
      </div>
    </div>
  );
}
