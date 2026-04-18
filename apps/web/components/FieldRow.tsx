import type { ProjectedField } from "@/lib/projection";
import { FieldChip } from "./FieldChip";

interface FieldRowProps<T> {
  f: ProjectedField<T>;
  format?: (v: T) => React.ReactNode;
}

export function FieldRow<T>({ f, format }: FieldRowProps<T>) {
  const rendered =
    f.visible && f.value != null
      ? format
        ? format(f.value)
        : String(f.value)
      : null;

  return (
    <div className="flex items-start justify-between gap-6 py-2.5 border-b border-neutral-900 last:border-0">
      <div className="flex items-center gap-2 text-sm text-neutral-400 min-w-0">
        <FieldChip kind={f.class} />
        <span className="truncate">{f.label}</span>
      </div>
      <div className="text-right text-sm min-w-0">
        {rendered != null ? (
          <span className="text-neutral-100 font-medium tabular-nums">
            {rendered}
          </span>
        ) : (
          <div className="inline-flex flex-col items-end gap-1">
            <span className="text-neutral-500 font-mono tracking-[0.18em] text-[10px] uppercase border border-dashed border-neutral-700 px-2 py-0.5 rounded bg-neutral-950">
              sealed
            </span>
            <span className="text-neutral-500 text-[11px] italic max-w-[20rem] text-right leading-snug">
              {f.redactionReason}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
