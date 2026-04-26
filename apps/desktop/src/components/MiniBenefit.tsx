import type { ProjectedView } from "@grid-passport/core/projection";

export function MiniBenefit({ view }: { view: ProjectedView }) {
  const privateFields = Object.values(view.privateProfile);
  const privateVisible = privateFields.filter((f) => f.visible).length;
  const privateTotal = privateFields.length;

  const derivedFields = Object.values(view.derivedProof);
  const derivedReleased = derivedFields.filter((f) => f.visible).length;

  const hidden = [
    ...Object.values(view.header),
    ...privateFields,
    ...Object.values(view.publicEvidence),
    ...derivedFields,
  ].filter((f) => !f.visible);
  const audited = hidden.filter((f) => f.redactionReason).length;
  const auditablePercent = hidden.length
    ? Math.round((audited / hidden.length) * 100)
    : 100;

  const exposureTone =
    view.role === "applicant"
      ? "tone-self"
      : privateVisible === 0
        ? "tone-sealed"
        : "tone-leaked";

  return (
    <div className="mini-benefit">
      <div className={`mb-stat ${exposureTone}`}>
        <span className="mb-num">
          {privateVisible}
          <span className="mb-slash">/</span>
          {privateTotal}
        </span>
        <span className="mb-label">
          {view.role === "applicant"
            ? "private fields you see"
            : "private fields exposed"}
        </span>
      </div>
      <div className="mb-sep" />
      <div className="mb-stat tone-proof">
        <span className="mb-num">{derivedReleased}</span>
        <span className="mb-label">derived released</span>
      </div>
      <div className="mb-sep" />
      <div className="mb-stat tone-audit">
        <span className="mb-num">{auditablePercent}%</span>
        <span className="mb-label">redactions audited</span>
      </div>
    </div>
  );
}
