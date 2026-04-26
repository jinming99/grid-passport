import type { HackathonData } from "@/lib/hackathon-data";
import { BlockLabel } from "./Shell";

export function Infrastructure({ data }: { data: HackathonData }) {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <BlockLabel label="// the stack" />
        <h2 className="w-full text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-neutral-50 sm:text-5xl lg:text-[60px]">
          {data.infrastructure.heading}
        </h2>
        <p className="mt-3 max-w-3xl font-mono text-[14px] leading-relaxed text-neutral-400">
          {data.infrastructure.body}
        </p>

        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {data.infrastructure.stack.map((s) => (
            <div key={s.label} className="hud-frame px-5 py-4">
              <div className="font-mono text-[11.5px] uppercase tracking-[0.22em] text-cyan-300">
                {s.label}
              </div>
              <p className="mt-2 font-mono text-[13px] leading-relaxed text-neutral-300">
                {s.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
