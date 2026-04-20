# Example — applicant narration for Owl Compute

Canonical worked example. Applicant voice (second-person, technical, owns-the-data). Hyperscaler case (180 MW, Prince William VA). This example demonstrates the **"kept confidential by the projection" trust framing** — a sealed field is *named* and *explained as structurally sealed*, not silenced. That's the load-bearing move on the applicant voice: the trust story is made visible to the person who already knows the numbers.

**Reference fixture:** `packages/core/src/fixtures/owl-compute.ts` (authoritative raw values).
**Reference projection:** `projectForRole(buildRecord(owlCompute), "applicant")` — the applicant view exposes all 25 classified fields (nothing sealed for the applicant themselves).

---

## Input

- `role`: `"applicant"`
- `ProjectedView`:
  - `caseId`: `"owl-compute"`
  - `policyVersion`: `"grid-passport-policy@0.1.0"`
  - header: Owl Compute · 180 MW · 2 phases · target COD 2028-10-01 · Prince William, VA
  - privateProfile (visible — applicant sees own data): flex 22% · redundancy-shift 12% · backupGen 140 MW / 6 h · BESS 11 MW / 4 h · schedule confidence 0.68 · workload 55% training / 45% inference
  - publicEvidence (visible): flood low · permit medium · zoning low · site-control TRUE · 3 source refs
  - derivedProof (visible): firmnessScore 60 · expectedPeakMW [108, 144] · flexibilityPassport {mwMin 36, mwMax 72, duration 2–4 h, class B} · siteReadinessClass yellow · energizationBand `"Q3 2028 – Q2 2029"` · costExposureClass medium · topBlockers ["Generator fleet permitting complexity"]
  - stats: visible 25, hidden 0, total 25, releasedProofCount 7

## Output (narration)

> Your Owl Compute campus at 180 MW in Prince William County, VA is queued for a target commercial operation date of 2028-10-01 across two phases. Your internal schedule confidence (0.68), your 22% flexibility commit, and your 12% redundancy-shift commit fold into the forecaster; the published energization band is Q3 2028 – Q2 2029, with a firmness score of 60 on the quantized scale. Your 11 MW × 4-hour BESS and 140 MW × 6-hour backup generation place you in Class B on the flexibility passport with a 36–72 MW band over the 2–4 h duration tier, and your site-readiness class lands at yellow — the top blocker the forecaster flagged is generator fleet permitting complexity on the public-evidence side.
>
> Downstream, the utility's projection will receive seven derived proofs — firmness score, expected-peak band (108–144 MW), flexibility passport, site-readiness class, energization band, cost-exposure class, and the top-blockers list — but never your raw schedule confidence, your 55/45 training/inference split, or the rest of your privateProfile bucket. Those eight fields are kept confidential by the projection: the hash of the projection commits to them without releasing them. The regulator receives the same derived proofs plus the audit chain (six events: intake, evidence refresh, sealing ceremony, proof generation, policy evaluation, role projection) and the `grid-passport-policy@0.1.0` policy hash.

---

## Why this narration is compliant

- **Second-person throughout.** The addressee is the applicant; every sentence treats the case as theirs.
- **All referenced values are present in the projection.** 180 MW, 22%, 0.68, 0.55/0.45, 11 MW × 4 h, 140 MW × 6 h, firmnessScore 60, expectedPeakMW 108–144, passport Class B / 36–72 MW / 2–4 h — all in `ProjectedView`.
- **Sealed fields named explicitly, framed as structural.** "never your raw schedule confidence... eight fields are kept confidential by the projection" makes the trust story visible without softening it to "data we won't share" (which would be euphemistic) or silencing it (which would hide the projection's work).
- **`policyVersion` appears verbatim.** `grid-passport-policy@0.1.0` is quoted, not paraphrased.
- **No recommendations, no next-steps, no cross-case benchmarks.** No "this looks competitive", no "typical hyperscaler", no "you may want to revisit".
- **No invented reasons.** The energization band is narrated as what the forecaster published; the Skill does not explain *why* Q3 2028 vs Q1 2028 because the projection doesn't document that in this view.
