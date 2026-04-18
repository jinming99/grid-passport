import type { ProjectedView } from "@/lib/projection";

export function LeakCounter({ view }: { view: ProjectedView }) {
  const { hiddenCount, releasedProofCount, totalClassified } = view.stats;
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-md border border-neutral-800 bg-neutral-950/60 px-5 py-4">
      <div className="flex flex-col">
        <span className="text-3xl font-semibold tabular-nums text-amber-400">
          {hiddenCount}
        </span>
        <span className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-neutral-500">
          fields sealed from {view.role}
        </span>
      </div>
      <div className="h-10 border-l border-neutral-800" />
      <div className="flex flex-col">
        <span className="text-3xl font-semibold tabular-nums text-lime-400">
          {releasedProofCount}
        </span>
        <span className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-neutral-500">
          derived proofs released
        </span>
      </div>
      <div className="h-10 border-l border-neutral-800" />
      <div className="flex flex-col">
        <span className="text-3xl font-semibold tabular-nums text-neutral-200">
          {totalClassified}
        </span>
        <span className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-neutral-500">
          classified fields
        </span>
      </div>
      <div className="ml-auto flex flex-col items-end text-right text-[11px] text-neutral-500">
        <span className="uppercase tracking-[0.16em]">policy</span>
        <span className="mt-0.5 font-mono text-neutral-300">
          {view.policyVersion}
        </span>
      </div>
    </div>
  );
}
