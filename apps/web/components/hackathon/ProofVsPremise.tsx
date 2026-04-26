import type { HackathonData } from "@/lib/hackathon-data";
import { BlockLabel } from "./Shell";

export function ProofVsPremise({ data }: { data: HackathonData }) {
  const { baseline, gridPassport, seedNote, quote } = data.ab;
  const roundsFactor = (baseline.turns / gridPassport.turns).toFixed(1);
  const daysFactor = (baseline.days / gridPassport.days).toFixed(1);

  return (
    <section id="receipts" className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <BlockLabel label="// receipts — the a/b, not a claim" />
        <h2 className="w-full text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-neutral-50 sm:text-5xl lg:text-[60px]">
          Utility sees the proof, not the premise.
        </h2>
        <p className="mt-3 max-w-2xl font-mono text-[14px] text-neutral-400">
          Same scenario (Owl Compute). Same seed. NDA-email baseline (condition B) vs. Grid
          Passport (condition D). Ran in a multi-agent simulator with adversarial privacy probes.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <AbColumn
            tone="bad"
            tag="condition B"
            label={baseline.label}
            turns={baseline.turns}
            days={baseline.days}
            leakage={baseline.rawLeakage}
            note="Bilateral NDAs. Redacted PDFs. One stakeholder emails another stakeholder a spreadsheet. Eventually, raw fields land in inboxes."
          />

          <div className="hidden items-center justify-center lg:flex">
            <div className="flex flex-col items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-300">
              <span className="text-2xl">⇢</span>
              <span>same seed</span>
              <span className="text-neutral-500">same scenario</span>
            </div>
          </div>

          <AbColumn
            tone="good"
            tag="condition D"
            label={gridPassport.label}
            turns={gridPassport.turns}
            days={gridPassport.days}
            leakage={gridPassport.rawLeakage}
            note="Applicant runs the tool locally. Signed bundle crosses the line. Utility verifies offline and sees the role-projected view only."
          />
        </div>

        {/* delta strip */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Delta big={`${roundsFactor}×`} label="fewer negotiation rounds" />
          <Delta big={`${daysFactor}×`} label="fewer simulated days" />
          <Delta big="0 vs multiple" label="H-null raw-field leakage" />
        </div>

        <blockquote className="mt-10 border-l-2 border-cyan-400/60 pl-5 font-mono text-[14px] italic text-cyan-100">
          &ldquo;{quote}&rdquo;
        </blockquote>

        <p className="mt-4 font-mono text-[11.5px] text-neutral-500">{seedNote}</p>
      </div>
    </section>
  );
}

function AbColumn({
  tone,
  tag,
  label,
  turns,
  days,
  leakage,
  note,
}: {
  tone: "good" | "bad";
  tag: string;
  label: string;
  turns: number;
  days: number;
  leakage: string;
  note: string;
}) {
  const headColor = tone === "good" ? "text-lime-300" : "text-rose-300";
  const border =
    tone === "good"
      ? "border-lime-500/30"
      : "border-rose-500/30";
  return (
    <div className={`hud-frame flex flex-col gap-4 border ${border} p-5`}>
      <div>
        <div className={`font-mono text-[9.5px] uppercase tracking-[0.3em] ${headColor}`}>
          {tag}
        </div>
        <div className="mt-1 font-mono text-[14px] text-neutral-100">{label}</div>
      </div>
      <div className="grid grid-cols-2 gap-3 border-y border-neutral-800 py-4">
        <NumTile big={String(turns)} unit="turns" tone={tone} />
        <NumTile big={String(days)} unit="sim-days" tone={tone} />
      </div>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          H-null leakage
        </div>
        <div className={`mt-1 font-mono text-[13px] ${headColor}`}>{leakage}</div>
      </div>
      <p className="font-mono text-[13px] leading-relaxed text-neutral-400">{note}</p>
    </div>
  );
}

function NumTile({
  big,
  unit,
  tone,
}: {
  big: string;
  unit: string;
  tone: "good" | "bad";
}) {
  const color = tone === "good" ? "text-lime-200" : "text-rose-200";
  return (
    <div>
      <div className={`font-mono text-[36px] leading-none ${color}`}>{big}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
        {unit}
      </div>
    </div>
  );
}

function Delta({ big, label }: { big: string; label: string }) {
  return (
    <div className="hud-frame px-4 py-4">
      <div className="font-mono text-[24px] leading-none text-cyan-200">{big}</div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </div>
    </div>
  );
}
