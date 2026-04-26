import type { HackathonData } from "@/lib/hackathon-data";
import { BlockLabel } from "./Shell";

export function TryIt({ data }: { data: HackathonData }) {
  return (
    <section id="try-it" className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <BlockLabel label="// try it" />
        <h2 className="w-full text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-neutral-50 sm:text-5xl lg:text-[60px]">
          Clone. Install. Roundtrip. No API key. No account. No cloud.
        </h2>
        <p className="mt-3 max-w-2xl font-mono text-[14px] text-neutral-400">
          {data.tryIt.prereqs}
        </p>

        <div className="hud-frame mt-8 overflow-hidden">
          <div className="flex items-center justify-between border-b border-cyan-500/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.28em] text-neutral-500">
            <span>shell · bash</span>
            <span className="text-cyan-300">~ 90 seconds end-to-end</span>
          </div>
          <pre className="overflow-x-auto px-5 py-5 font-mono text-[14px] leading-[1.75] text-neutral-200">
{data.tryIt.commands}
          </pre>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 font-mono text-[13px] text-neutral-500">
          <a
            href="https://github.com/jinming99/grid-passport"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 border border-cyan-500/40 bg-cyan-500/5 px-4 py-2 uppercase tracking-[0.22em] text-cyan-200 transition-colors hover:border-cyan-400 hover:bg-cyan-400/10"
          >
            github →
          </a>
          <span>AGPL v3 · utility forks publish their changes.</span>
        </div>
      </div>
    </section>
  );
}
