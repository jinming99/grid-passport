export interface PainFraming {
  caseId: string;
  displayName: string;
  county: string;
  requestedMW: number;
  headline: string;
  today: string;
  withGridPassport: string;
}

export const PAIN_FRAMINGS: PainFraming[] = [
  {
    caseId: "owl-compute",
    displayName: "Owl Compute",
    county: "Prince William",
    requestedMW: 180,
    headline: "Hyperscaler vs roadmap exposure",
    today:
      "NDA + redacted PDF. Utility can't see firmness, sites more conservatively, project gets a slower slot.",
    withGridPassport:
      "Firmness score and flexibility band released. Roadmap, workload mix, and BESS sizing stay sealed.",
  },
  {
    caseId: "lantern-cloud",
    displayName: "Lantern Cloud",
    county: "Loudoun",
    requestedMW: 95,
    headline: "Applicant in genuine permit trouble",
    today:
      "Phone calls. Utility pulls or quietly de-prioritizes. Regulator has no visibility into the disposition.",
    withGridPassport:
      "Readiness class and blockers surface before submission. Rejection (if any) is attributable, not discretionary.",
  },
  {
    caseId: "kraken-train",
    displayName: "Kraken Train",
    county: "Fauquier",
    requestedMW: 240,
    headline: "Flexibility commitment without exposure",
    today:
      "Hand-wave a number (utility doesn't trust it) or disclose scheduler architecture (they won't).",
    withGridPassport:
      "Credible Flex MOSAIC-shaped commitment in a shared schema. Underlying scheduler stays sealed.",
  },
];
