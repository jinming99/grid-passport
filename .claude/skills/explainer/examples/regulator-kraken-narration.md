# Example — regulator narration for Kraken Train

Canonical worked example. Regulator voice (third-person, procedural, policy-version-first). Flex-forward case (240 MW, Fauquier VA, DCFlex-ready). This example demonstrates **policy-version-as-evidence framing** and **field-count summary as audit-signal** — the regulator doesn't read the case to evaluate the applicant; they read the projection to evaluate *the workflow*. The narration fronts the policy hash + the `stats` block because those are the audit primitives.

**Reference fixture:** `packages/core/src/fixtures/kraken-train.ts`.
**Reference projection:** `projectForRole(buildRecord(krakenTrain), "regulator")` — exposes 17 of 25 classified fields; privateProfile sealed; audit chain visible.

---

## Input

- `role`: `"regulator"`
- `ProjectedView`:
  - `caseId`: `"kraken-train"`
  - `policyVersion`: `"grid-passport-policy@0.1.0"`
  - header: Kraken Train · 240 MW · 3 phases · target COD 2029-03-01 · Fauquier, VA
  - privateProfile: all 8 fields sealed (`{value: null, redactionReason: "applicant-owned sensitive self-report, released only as derived proof"}`)
  - publicEvidence (visible): flood low · permit low · zoning low · site-control TRUE · 4 source refs
  - derivedProof (visible): firmnessScore 70 · expectedPeakMW [144, 192] · flexibilityPassport {mwMin 48, mwMax 96, duration 4–8 h, class B} · siteReadinessClass green · energizationBand `"Q1 2029 – Q3 2029"` · costExposureClass low · topBlockers []
  - stats: visible 17, hidden 8, total 25, releasedProofCount 7
  - Audit chain (6 events): `case_created` → `evidence_refreshed` → `sealed_raw_input` → `proof_generated` → `policy_evaluated` → `role_projection`

## Output (narration)

> Policy `grid-passport-policy@0.1.0` was applied to project this case (Kraken Train, 240 MW, Fauquier County, VA, target commercial operation 2029-03-01 across three phases) for regulator review. Of 25 classified fields, 17 are visible in this view and 8 are redacted per release policy — the privateProfile bucket is fully sealed with the reason "applicant-owned sensitive self-report, released only as derived proof." Seven derived proofs (firmness score 70, expected-peak band 144–192 MW, flexibility passport Class B / 48–96 MW / 4–8 h duration, site-readiness class green, energization band Q1 2029 – Q3 2029, cost-exposure class low, top blockers list) are released in full; the top-blockers list is empty, which the forecaster publishes directly.
>
> The projection is a pure function of the CaseInput plus the policy; the audit chain (`prevHash`-linked, SHA-256, six events) records intake, public-evidence refresh, sealing of the private profile, proof generation, policy evaluation, and role projection, in that order. The signed disclosure bundle's payload is JCS-canonicalized (RFC 8785) and signed with an Ed25519 key committed to the bundle's `issuer.keyId`; third-party verification is available via the standalone `@grid-passport/verifier` package and the `pnpm canary:bundle` / `pnpm canary:roundtrip` gates. The role-projection event carries `role: "regulator"` and a hash of the rendered view, binding this specific narration's underlying projection to the audit chain.

---

## Why this narration is compliant

- **`policyVersion` fronts the opening.** The regulator needs to know *which* policy the projection ran under before anything else; the narration makes that the first fact.
- **`stats` used as audit signal.** "Of 25 classified fields, 17 are visible in this view and 8 are redacted per release policy" — direct readout from `ProjectedView.stats.{totalClassified, visibleCount, hiddenCount}` with the `redactionReason` attached.
- **No invented numbers.** firmness 70, expected-peak 144–192, passport 48–96 / 4–8 h / Class B — all from `derivedProof`. The empty top-blockers list is narrated as published, not inflated into "no concerns found".
- **Audit-chain framing.** Six events named by `reasonCode`, the `prevHash` linkage + SHA-256 algorithm stated as the chain property. The Skill doesn't compute the hash (that's `@grid-passport/core/audit`); it narrates the shape.
- **Verification primitives pointed at.** `@grid-passport/verifier`, `pnpm canary:bundle`, `pnpm canary:roundtrip` — the regulator can re-verify independently.
- **No editorializing.** No "this applicant has strong fundamentals" or "low risk profile"; the projection says low cost-exposure and green readiness, the narration repeats those labels without amplification.
- **No recommendations, no precedent comparisons.** The regulator's conclusions are theirs to draw; the Skill narrates the view, not the verdict.
