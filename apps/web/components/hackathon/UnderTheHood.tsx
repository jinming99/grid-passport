import type { HackathonData } from "@/lib/hackathon-data";
import { BlockLabel } from "./Shell";

export function UnderTheHood({ data }: { data: HackathonData }) {
  return (
    <section id="hood" className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <BlockLabel label="// under the hood" />
        <h2 className="w-full text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-neutral-50 sm:text-5xl lg:text-[60px]">
          The schema is the safety case.
        </h2>
        <p className="mt-3 max-w-2xl font-mono text-[14px] text-neutral-400">
          Not a claim — a compile-time check. Agents write to named buckets. Pure functions
          compute. The bundle is the only release surface. Read the diagrams below; every
          arrow maps to a file you can open.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {data.diagrams.map((d) => (
            <article key={d.title} className="hud-frame flex flex-col p-5">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-cyan-400/80">
                diagram · {d.title}
              </div>
              <pre className="mt-4 overflow-x-auto border border-neutral-800 bg-black/50 px-4 py-3 font-mono text-[13px] leading-[1.55] text-neutral-300">
{d.ascii}
              </pre>
              <p className="mt-4 font-mono text-[13px] leading-relaxed text-neutral-400">
                {d.caption}
              </p>
              <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em]">
                <span className="text-neutral-500">source: </span>
                <code className="text-cyan-300">{d.codeLink}</code>
              </div>
            </article>
          ))}
        </div>

        {/* canary gates strip */}
        <div className="mt-12">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-400/80">
            canary gates · {data.canaryGates.length} of {data.stats.canaryGates} named
          </div>
          <p className="mt-2 font-mono text-[14px] text-neutral-400">
            Every commit runs all {data.stats.canaryGates}. They are structural invariants, not
            unit tests. When a gate fails, you fix the root cause — you don&apos;t disable the
            gate.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.canaryGates.map((g) => (
              <div
                key={g.id}
                className="hud-frame flex items-start gap-3 px-4 py-3"
              >
                <span className="font-mono text-[13px] text-cyan-400/80">{g.id}</span>
                <div>
                  <div className="font-mono text-[14px] text-neutral-100">
                    {g.name}
                  </div>
                  <div className="mt-0.5 font-mono text-[11.5px] leading-snug text-neutral-500">
                    {g.enforces}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
