"use client";

export function CounterfactualSlider({
  value,
  baseline,
  onChange,
  pending,
}: {
  value: number;
  baseline: number;
  onChange: (v: number) => void;
  pending: boolean;
}) {
  const delta = value - baseline;
  const deltaLabel =
    delta === 0
      ? "baseline"
      : delta > 0
        ? `+${delta} vs baseline`
        : `${delta} vs baseline`;

  return (
    <div className="rounded-md border border-amber-900/40 bg-amber-950/10 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-[0.2em] text-amber-400">
            counterfactual · flexible workload
          </span>
          <span className="mt-0.5 text-xs text-neutral-400">
            Move the slider to see how committing more (or less) flexibility
            reshapes the utility&apos;s planning outputs.
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="tabular-nums text-3xl font-semibold text-amber-300">
              {value}%
            </span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              {deltaLabel}
            </span>
          </div>
          {pending ? (
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-lime-400" />
          ) : null}
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={40}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-amber-500"
        aria-label="flexibility percent"
      />
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-widest text-neutral-600">
        <span>0%</span>
        <span>baseline {baseline}%</span>
        <span>40%</span>
      </div>
    </div>
  );
}
