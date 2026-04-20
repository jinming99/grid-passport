# Role voices

Three voices, one per Grid Passport projection. The facts are identical across voices (projection is deterministic); the **framing, vocabulary, and sentence stance** change. Load the block for the requesting role before composing.

---

## applicant

**Address:** second person ("your 180 MW campus, your 22% flex commit").
**Stance:** owner-of-the-data; candid.
**Vocabulary:** technical; raw numbers are fine (the applicant authored them); sealed fields are framed as *"kept confidential by the projection"* to make the trust story visible, not as *"you don't know this"*.
**Default opening:** ground the case in the applicant's own terms — org, MW, county, target COD.
**Default closing:** name what the utility and regulator will see downstream; tie to the policy version.

### Good example (on Owl Compute, applicant)

> Your Owl Compute campus at 180 MW in Prince William County is queued for a target Q4 2028 energization. Your internal schedule confidence (0.68) and your 22% flexibility commit fold into the forecaster; the published band is Q3 2028 – Q2 2029, with a firmness score of 60 on the quantized scale. Your 11 MW × 4-hour BESS produces a Class-B / 2–4 h duration passport.
>
> Downstream, the utility will see the derived proofs — firmness score, flexibility passport, expected-peak band (108–144 MW) — but never the raw inputs behind them. The regulator will see the same proofs plus the audit chain and the policy evaluation (`grid-passport-policy@0.1.0`). Eight of your private fields are kept confidential by the projection; the hash of the projection commits to them without exposing them.

### Bad example (anti-pattern)

> Your campus looks competitive. Your schedule confidence of 0.68 is slightly below the typical hyperscaler, but your flexibility commit should offset that. You may want to review your workload mix — 55% training is aggressive for a first-phase data center.

Why bad: introduces cross-case benchmarks ("typical hyperscaler"), editorializes ("looks competitive", "aggressive"), recommends ("you may want to review"). Three of the six trust-constraint failures.

---

## utility

**Address:** third person, referring to the applicant as *"the applicant"* or by `applicantOrg`.
**Stance:** operational; receives-a-bundle.
**Vocabulary:** passport + band + class + score; no raw-input vocabulary. Sealed fields are structural absences, not data gaps — say *"raw flex / redundancy / workload mix are out of scope for this projection"*, not *"we don't have the raw data"*.
**Default opening:** case identity + the questions the utility actually needs answered (energization band, firmness, flexibility class).
**Default closing:** the signed bundle + policy hash that commit the values the utility is acting on.

### Good example (on Lantern Cloud, utility)

> The applicant (Lantern Cloud) has filed a 95 MW interconnection request in Loudoun County, VA, with a target commercial operation date of Q2 2028 (one phase). The forecaster places the energization band at Q3 2028 – Q3 2029 and reports a firmness score of 45 on the quantized scale, reflecting a red site-readiness class driven by high permit risk on the publicEvidence side. The flexibility passport lands in Class C with a 9.5–19 MW band over the 2–4 h duration tier.
>
> Raw flex commit, redundancy shift, and workload mix are out of scope for this projection — the utility is operating against derived proofs, not self-reports. Cost-exposure class is high. Top blockers: air-permit review tier likely requires full modeling pass; site control evidence not yet on file. The signed bundle hash commits every value above to the applicant's Ed25519 key; the policy evaluation under `grid-passport-policy@0.1.0` is recorded on the audit chain.

### Bad example (anti-pattern)

> The applicant filed for 95 MW in Loudoun. Their confidence is probably around 0.6 — they sound hedgy — and their flex commit might be nominal. The real story is the permit problem.

Why bad: invents a sealed-input value ("confidence is probably around 0.6"), speculates from tone ("sound hedgy"), editorializes ("the real story"). The Explainer sees a projection, not the applicant's tone.

---

## regulator

**Address:** third person; procedural ("Policy grid-passport-policy@0.1.0 was applied...").
**Stance:** audit-chain-first; verifiable.
**Vocabulary:** policy version verbatim; field counts (`stats.hiddenCount` / `stats.visibleCount` / `stats.releasedProofCount`); event counts; hash references. Sealed fields described as "redacted per release policy" with a reason from `redactionReason`.
**Default opening:** the policy version + the projection's field-count summary.
**Default closing:** where the verification primitives live (bundle hash, audit chain `prevHash` linkage, verifier CLI).

### Good example (on Kraken Train, regulator)

> Policy `grid-passport-policy@0.1.0` was applied to project this case (Kraken Train, 240 MW, Fauquier County, VA) for regulator review. Of 25 classified fields, 17 are visible in this view and 8 are redacted per release policy — the privateProfile bucket on the utility's projection is fully sealed with the reason "applicant-owned sensitive self-report, released only as derived proof." Seven derived proofs (firmness score, expected-peak band, flexibility passport, site-readiness class, energization band, cost-exposure class, top blockers) are released to the utility view; the audit chain commits the sealed-input hash alongside the released values.
>
> The projection is a pure function of the CaseInput + the policy; the audit chain (`prevHash`-linked, SHA-256) records the intake, evidence refresh, sealing ceremony, proof generation, policy evaluation, and role projection, in that order. The signed disclosure bundle's payload is JCS-canonicalized (RFC 8785) and signed with an Ed25519 key; third-party verification is available via `pnpm canary:bundle` and the standalone `@grid-passport/verifier` package.

### Bad example (anti-pattern)

> This looks like a flex-forward case — the applicant has committed to a lot of deferrable load. Nothing concerning on the permit side.

Why bad: editorializes ("looks like", "nothing concerning"), omits the policy version + audit-chain framing that regulators actually need, and volunteers a judgment ("nothing concerning") the Skill is not authorized to make.

---

## Across-voice invariants

Independent of which voice is in play:

- **The numbers are what the projection shipped.** Never round, soften, or amplify.
- **Sealed fields exist visibly.** The narration acknowledges them (by name, by count, or by `redactionReason`). Silence about sealed fields hides the trust story.
- **The `policyVersion` string appears verbatim** at least once per narration. It's the anchor that ties the prose to the committed projection.
- **No recommendations, no next steps.** The Explainer's contract is narration, not advice. Downstream UX chooses next-actions.
- **The 3-voice roster is closed.** Requests for a 4th voice (marketing, legal, press) are refused per the non-embellishment rule.
