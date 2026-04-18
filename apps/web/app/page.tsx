import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="font-mono text-[13px] uppercase tracking-[0.22em] text-neutral-300">
            grid<span className="text-sky-400">·</span>passport
          </span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            truth without disclosure
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-20">
        <section className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="flex flex-col gap-8">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-neutral-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-lime-400" />
              confidential coordination OS
            </span>
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-neutral-50 sm:text-6xl">
              A 500 MW request <br className="hidden sm:inline" />
              <span className="text-neutral-500">is not a forecast.</span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-neutral-400">
              Grid Passport turns private load, site, and flexibility data into
              utility-usable proofs — without requiring either side to surrender
              secrets. Policy, not prompt text, governs what crosses the line.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-500"
              >
                Run the request
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-md border border-neutral-800 px-5 py-2.5 text-sm text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
              >
                See utility mode
              </Link>
            </div>
          </div>

          <aside className="rounded-md border border-neutral-800 bg-neutral-950/60 p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                release diff · preview
              </span>
              <span className="font-mono text-[11px] text-neutral-500">
                policy@0.1.0
              </span>
            </div>
            <div className="space-y-3 text-sm">
              <DiffRow
                label="internal schedule confidence"
                left="68%"
                leftTone="sealed"
                right="firmness score 74"
                rightTone="released"
              />
              <DiffRow
                label="workload mix"
                left="training 55% / inference 45%"
                leftTone="sealed"
                right="expected peak 110–135 MW"
                rightTone="released"
              />
              <DiffRow
                label="deferrable %"
                left="22%"
                leftTone="sealed"
                right="flexibility 18–24 MW · 3–4 hr · class B"
                rightTone="released"
              />
            </div>
            <div className="mt-5 border-t border-neutral-900 pt-4 text-[11px] text-neutral-500 leading-relaxed">
              Utility sees the proof, not the premise. Regulator sees the
              release, and why. Applicant sees the sealed envelope.
            </div>
          </aside>
        </section>
      </main>

      <footer className="border-t border-neutral-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 text-[11px] text-neutral-500">
          <span>synthetic composite · illustrative only</span>
          <span>
            <Link href="/demo" className="hover:text-neutral-300">
              demo →
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

function DiffRow({
  label,
  left,
  leftTone,
  right,
  rightTone,
}: {
  label: string;
  left: string;
  leftTone: "sealed" | "released";
  right: string;
  rightTone: "sealed" | "released";
}) {
  const tone = (t: "sealed" | "released") =>
    t === "sealed"
      ? "border-amber-900/60 bg-amber-950/20 text-amber-300"
      : "border-lime-900/60 bg-lime-950/20 text-lime-300";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </span>
      <div className="grid grid-cols-2 gap-2 text-[12px]">
        <div className={`rounded border px-3 py-2 font-mono ${tone(leftTone)}`}>
          <div className="mb-0.5 text-[10px] uppercase tracking-widest opacity-70">
            applicant
          </div>
          {left}
        </div>
        <div
          className={`rounded border px-3 py-2 font-mono ${tone(rightTone)}`}
        >
          <div className="mb-0.5 text-[10px] uppercase tracking-widest opacity-70">
            utility
          </div>
          {right}
        </div>
      </div>
    </div>
  );
}
