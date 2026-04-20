# Example — utility narration for Lantern Cloud

Canonical worked example. Utility voice (third-person, operational, passport-first). Permit-risk-heavy case (95 MW, Loudoun VA, publicEvidence flags high permit risk + missing site control). This example demonstrates **sealed-input absence as structural**, not as "data we don't have" — the utility projection zeros out the raw privateProfile by policy, and the narration names the absence in the vocabulary of the contract, not in the vocabulary of data gaps.

**Reference fixture:** `packages/core/src/fixtures/lantern-cloud.ts`.
**Reference projection:** `projectForRole(buildRecord(lanternCloud), "utility")` — exposes 17 of 25 classified fields; privateProfile bucket fully sealed.

---

## Input

- `role`: `"utility"`
- `ProjectedView`:
  - `caseId`: `"lantern-cloud"`
  - `policyVersion`: `"grid-passport-policy@0.1.0"`
  - header: Lantern Cloud · 95 MW · 1 phase · target COD 2028-06-01 · Loudoun, VA
  - privateProfile: all 8 fields **sealed** (`{value: null, redactionReason: "applicant-owned sensitive self-report, released only as derived proof"}`)
  - publicEvidence (visible): flood low · permit **high** · zoning medium · site-control **FALSE** · 2 source refs
  - derivedProof (visible): firmnessScore 45 · expectedPeakMW [38, 71] · flexibilityPassport {mwMin 9.5, mwMax 19, duration 2–4 h, class C} · siteReadinessClass **red** · energizationBand `"Q3 2028 – Q3 2029"` · costExposureClass high · topBlockers ["Air-permit review tier likely requires full modeling pass", "Site control evidence not yet on file"]
  - stats: visible 17, hidden 8, total 25, releasedProofCount 7

## Output (narration)

> The applicant (Lantern Cloud) has filed a 95 MW interconnection request in Loudoun County, VA, with a target commercial operation date of 2028-06-01 across one phase. The forecaster places the energization band at Q3 2028 – Q3 2029 and reports a firmness score of 45 on the quantized scale, with a red site-readiness class driven by high permit risk and missing site-control evidence on the publicEvidence side. The flexibility passport lands in Class C with a 9.5–19 MW band over the 2–4 h duration tier, and the expected-peak band is 38–71 MW.
>
> Raw flex commit, redundancy shift, backup-generation nameplate, BESS nameplate, schedule confidence, and workload mix are out of scope for this projection — the utility is operating against derived proofs, not applicant self-reports. Cost-exposure class is high. The two top blockers surfaced by the forecaster are an air-permit review tier that likely requires a full modeling pass, and site-control evidence not yet on file. The signed disclosure bundle's payload commits every released value above to the applicant's Ed25519 key under policy `grid-passport-policy@0.1.0`; the hash chain links intake through role projection across six audit events for independent verification.

---

## Why this narration is compliant

- **Third-person throughout.** `"The applicant"` / `"Lantern Cloud"` — never `"your"`, never `"we"`. The utility is the reader; the applicant is the referent.
- **Every referenced number is from `derivedProof` or `publicEvidence`.** 95 MW, firmness 45, passport 9.5–19 MW, duration 2–4 h, expected-peak 38–71 MW, permit high, site-control false, siteReadiness red — all visible in the utility's view.
- **Sealed private fields named as a bucket-level structural absence.** "Raw flex commit, redundancy shift..., schedule confidence, and workload mix are out of scope for this projection — the utility is operating against derived proofs, not applicant self-reports." This names the six sealed fields *without inventing values for them*, and frames the absence as policy-driven, not as a data gap.
- **No speculation from tone.** Nothing about the applicant's hedginess, confidence, or posture; the Skill sees a projection, not a person.
- **`policyVersion` verbatim.** `grid-passport-policy@0.1.0` quoted.
- **No recommendations.** Nothing about "you may want to work with the applicant on the permit" or "flag for committee review". Narration only; next-steps are the utility's decision.
