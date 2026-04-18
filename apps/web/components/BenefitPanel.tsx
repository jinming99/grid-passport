import type { ProjectedView } from "@/lib/projection";

export function BenefitPanel({ view }: { view: ProjectedView }) {
  const privateFields = Object.values(view.privateProfile);
  const privateVisible = privateFields.filter((f) => f.visible).length;
  const privateTotal = privateFields.length;

  const derivedFields = Object.values(view.derivedProof);
  const derivedReleased = derivedFields.filter((f) => f.visible).length;
  const derivedTotal = derivedFields.length;

  const hiddenFields = [
    ...Object.values(view.header),
    ...privateFields,
    ...Object.values(view.publicEvidence),
    ...derivedFields,
  ].filter((f) => !f.visible);
  const hiddenWithReasons = hiddenFields.filter((f) => f.redactionReason).length;
  const auditablePercent = hiddenFields.length
    ? Math.round((hiddenWithReasons / hiddenFields.length) * 100)
    : 100;

  const isApplicant = view.role === "applicant";
  const exposureColor = isApplicant
    ? "text-sky-400"
    : privateVisible === 0
      ? "text-lime-400"
      : "text-amber-400";

  const framing = isApplicant
    ? "your raw private profile stays on your machine. only the signed projection bundle leaves."
    : `this view was projected on the applicant's machine. the host never sees raw inputs — only what policy permits for ${view.role}.`;

  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-950/60 px-5 py-4">
      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        <div className="flex flex-col">
          <span
            className={`text-3xl font-semibold tabular-nums ${exposureColor}`}
          >
            {privateVisible}
            <span className="mx-1 text-neutral-600">/</span>
            {privateTotal}
          </span>
          <span className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-neutral-500">
            {isApplicant
              ? "competitive fields visible to you"
              : `competitive fields exposed to ${view.role}`}
          </span>
        </div>
        <div className="h-10 border-l border-neutral-800" />
        <div className="flex flex-col">
          <span className="text-3xl font-semibold tabular-nums text-lime-400">
            {derivedReleased}
            <span className="mx-1 text-neutral-600">/</span>
            {derivedTotal}
          </span>
          <span className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-neutral-500">
            derived proofs released
          </span>
        </div>
        <div className="h-10 border-l border-neutral-800" />
        <div className="flex flex-col">
          <span className="text-3xl font-semibold tabular-nums text-neutral-200">
            {auditablePercent}%
          </span>
          <span className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-neutral-500">
            regulator-auditable redactions
          </span>
        </div>
        <div className="ml-auto flex flex-col items-end text-right text-[11px] text-neutral-500">
          <span className="uppercase tracking-[0.16em]">policy · sealed</span>
          <span className="mt-0.5 font-mono text-neutral-300">
            {view.policyVersion}
          </span>
        </div>
      </div>
      <div className="mt-3 border-t border-neutral-900 pt-3">
        <p className="text-[11px] leading-relaxed text-neutral-500">
          <span className="mr-1 text-sky-400">◆</span>
          {framing}
        </p>
      </div>
    </div>
  );
}
