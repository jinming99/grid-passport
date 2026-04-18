import type { FieldClass } from "@/lib/types";

const styles: Record<FieldClass, string> = {
  public: "border-slate-600 text-slate-300",
  private: "border-amber-700 text-amber-400",
  derived: "border-lime-600 text-lime-400",
};

export function FieldChip({ kind }: { kind: FieldClass }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] border rounded-sm font-mono ${styles[kind]}`}
    >
      {kind}
    </span>
  );
}
