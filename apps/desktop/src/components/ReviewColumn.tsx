import type { Role } from "@grid-passport/core/types";
import type { ProjectedView } from "@grid-passport/core/projection";
import { MiniBenefit } from "./MiniBenefit";
import { ProjectionSections } from "./ProjectionSections";

const WORK_TAGLINE: Record<Role, string> = {
  applicant: "your plaintext · nothing has left this machine",
  utility: "",
  regulator: "",
};

const REVIEW_TITLE: Record<Role, string> = {
  applicant: "you",
  utility: "utility sees",
  regulator: "regulator sees",
};

const REVIEW_TAGLINE: Record<Role, string> = {
  applicant: "full plaintext (your own data)",
  utility: "proof-only · private fields sealed",
  regulator: "redactions + reasons · audit chain",
};

export function ReviewColumn({
  view,
  variant = "review",
}: {
  view: ProjectedView;
  variant?: "work" | "review";
}) {
  const role = view.role;
  const title = variant === "work" ? role : REVIEW_TITLE[role];
  const tagline =
    variant === "work" ? WORK_TAGLINE[role] : REVIEW_TAGLINE[role];
  return (
    <div className={`review-col role-${role} variant-${variant}`}>
      <header className="rc-head">
        <div className="rc-role">{title}</div>
        {tagline ? <div className="rc-tag">{tagline}</div> : null}
      </header>
      <MiniBenefit view={view} />
      <ProjectionSections view={view} />
    </div>
  );
}
