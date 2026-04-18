"use client";

import type { Role } from "@/lib/types";

const roles: { id: Role; label: string; hint: string }[] = [
  { id: "applicant", label: "Applicant", hint: "Your raw data" },
  { id: "utility", label: "Utility", hint: "Released proofs only" },
  { id: "regulator", label: "Regulator", hint: "Visibility matrix" },
];

export function RoleToggle({
  value,
  onChange,
}: {
  value: Role;
  onChange: (r: Role) => void;
}) {
  return (
    <div className="inline-flex flex-col gap-1">
      <div
        role="tablist"
        className="inline-flex rounded-md border border-neutral-700 bg-neutral-950 p-1 text-sm"
      >
        {roles.map((r) => (
          <button
            key={r.id}
            role="tab"
            aria-selected={value === r.id}
            type="button"
            onClick={() => onChange(r.id)}
            className={`rounded px-3 py-1.5 transition-colors ${
              value === r.id
                ? "bg-sky-700 text-white"
                : "text-neutral-400 hover:text-neutral-100"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <span className="text-[11px] uppercase tracking-wider text-neutral-500">
        {roles.find((r) => r.id === value)?.hint}
      </span>
    </div>
  );
}
