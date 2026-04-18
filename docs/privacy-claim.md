# Grid Passport — the privacy claim

> Truth without disclosure.

This doc is the case for why Grid Passport's privacy story is real and not
hand-wave. Five things, in this order:

1. **What we actually do** — the mechanism, end to end.
2. **How you can check it** — the evidence: canon, runtime mirror, mechanical canary, audit trail.
3. **Why existing methods don't quite fit** — what NDAs, redacted PDFs, ZK, MPC, TEEs, DP, FL get right and where they leave the workflow exposed.
4. **The trust model** — why "trust the third-party platform" is the wrong question, and how local-first dissolves it.
5. **What we are *not* claiming** — so the demo stays honest.

For the broader vision, problem framing, business model, and roadmap,
see `docs/vision.md`. This doc is the privacy mechanism specifically.

---

## 1. The mechanism

Every field that enters the system is **classified once, by hand, into a
named class**: `public`, `private`, or `derived`. That classification is
the entire privacy contract. There are exactly three classes and they
mean what they say:

- **public** — disclosed to every role.
- **private** — sealed in the confidential path; raw value never appears in any non-applicant projection, log, audit string, or wire payload.
- **derived** — computed from raw inputs by a versioned function; released to all roles per policy.

The classification table lives in three places that must agree:

| Location                                    | Role                            |
| ------------------------------------------- | ------------------------------- |
| `packages/policy/grid-passport.rego`        | canonical source of truth (Rego/OPA) |
| `packages/core/src/policy.ts`                    | runtime enforcement (TypeScript)     |
| `apps/api/gridpassport/policy.py`           | parity for the FastAPI worker        |

Drift between any two is a bug. The canary (§2) checks all three on every
run.

The **projection** is a pure function:

```ts
projectForRole(record, role) → ProjectedView
```

It walks every classified field, looks up the policy entry, and writes
either `value` (when the role may see it) or `null` plus a
`redactionReason` (when it may not). There is no other path that can
release a field. The projection is what the API serializes and what the
UI renders.

The **counterfactual slider** is applicant-only — the applicant probes
their own data. The API enforces this server-side: a non-applicant
caller who sends a `flexPercent` override has it silently dropped before
the forecaster runs (`apps/web/app/api/scenario/route.ts`). Defense in
depth: even if an override does reach the audit layer, the audit string
substitutes "(baseline sealed)" for any non-applicant role
(`packages/core/src/audit.ts`).

The **audit trail** records what happened with content-addressed
artifacts (sha-256 of the request bytes, the public evidence bundle, the
derived proof) and human-readable reason codes. Every entry has a
`policyVersion` so a regulator looking at the trail later can pin which
field-class table was in force.

The trail is what gives the regulator something to verify *without*
giving them the raw inputs. They see: input hash, evidence hash, proof
hash, policy version, role projections rendered, sha-256 of the policy
file itself. If any of those would have been different under a different
policy or different inputs, the hash chain breaks.

---

## 2. How you can check it

Three layers of evidence, each independently checkable.

### 2a. Canon you can read

`packages/policy/grid-passport.rego` is plain text, ~100 lines, no
imports, no network. A regulator can open the file, see the
classification table, and check it against the schema. The runtime
displays the file contents and its sha-256 in the regulator panel —
shipping a different policy than the one displayed is detectable.

### 2b. Mirror you can run

`packages/core/src/policy.ts` mirrors the Rego table as TypeScript so the
Next.js runtime can enforce it without an OPA binary. The mirror is
checked against the canon by the canary on every run. Long-term plan
(open item): compile the Rego to WASM, evaluate in-process, drop the TS
mirror entirely.

### 2c. Canary you can run in CI

```sh
pnpm privacy:canary
```

The canary (`apps/web/scripts/privacy-canary.ts`) runs four mechanical
checks:

| Check                                       | What it asserts                                                                                                                                                              |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| structural projection                       | For every fixture × non-applicant role, every private field reports `visible: false` and `value: null`. Visibility never disagrees with the policy.                          |
| audit action scan (baseline)                | For every fixture × non-applicant role, no audit `action` string contains a private value (after subtracting public/derived collisions).                                     |
| audit action scan (with flex override)      | Same as above, but with a counterfactual override applied. This is the surface that regressed once already (the `baseline N%` leak fixed in this commit) — it stays watched. |
| policy mirror drift (TS ↔ Rego ↔ Python)    | All three policy locations declare the same field-path set with the same class.                                                                                              |

The canary builds private-value fingerprints per fixture and excludes
collisions with public and derived values, so it doesn't flag
legitimate releases (e.g., the derived `firmnessScore` happening to
share a digit with a private input). False-negative scope is documented
inside the script.

The canary exits non-zero on any finding. A passing run is the literal
machine-checkable form of the claim "no raw private value reaches a
non-applicant".

---

## 3. With vs without — concrete delta

Take the `owl-compute` fixture (180 MW interconnection in Prince William
County, VA — synthetic). The applicant submits 18 fields. After
projection, here is what each role can see.

| Field                            | Class    | Applicant view              | Utility view                | Regulator view                |
| -------------------------------- | -------- | --------------------------- | --------------------------- | ----------------------------- |
| Applicant org                    | public   | Owl Compute                 | Owl Compute                 | Owl Compute                   |
| Requested capacity               | public   | 180 MW                      | 180 MW                      | 180 MW                        |
| Target COD                       | public   | 2028-10-01                  | 2028-10-01                  | 2028-10-01                    |
| Site                             | public   | Prince William, VA          | Prince William, VA          | Prince William, VA            |
| **% deferrable workload**        | private  | **22%**                     | *sealed*                    | *sealed*                      |
| **% shiftable to redundant sites** | private | **12%**                     | *sealed*                    | *sealed*                      |
| **Backup gen (MW × hours)**      | private  | **140 MW × 6h**             | *sealed*                    | *sealed*                      |
| **BESS (MW × hours)**            | private  | **11 MW × 4h**              | *sealed*                    | *sealed*                      |
| **Internal schedule confidence** | private  | **0.68**                    | *sealed*                    | *sealed*                      |
| **Workload mix**                 | private  | **55% train / 45% inf**     | *sealed*                    | *sealed*                      |
| Flood / permit / zoning risk     | public   | low / medium / low          | low / medium / low          | low / medium / low            |
| Site control evidence            | public   | true                        | true                        | true                          |
| Firmness score                   | derived  | 59                          | 59                          | 59                            |
| Expected peak band               | derived  | 114–142 MW                  | 114–142 MW                  | 114–142 MW                    |
| Flexibility passport             | derived  | 32–44 MW · 3–4h · class B   | 32–44 MW · 3–4h · class B   | 32–44 MW · 3–4h · class B     |
| Site readiness                   | derived  | yellow                      | yellow                      | yellow                        |
| Earliest energization band       | derived  | Q3 2028 – Q1 2029           | Q3 2028 – Q1 2029           | Q3 2028 – Q1 2029             |
| Cost exposure class              | derived  | medium                      | medium                      | medium                        |
| **Visibility metadata**          | meta     | —                           | —                           | **8 sealed · 16 visible · policy hash + audit chain** |

Two things to notice.

**The utility makes the same decision either way.** Treatment-band
selection runs off `firmnessScore`, `flexibilityPassport`,
`energizationBand`, `siteReadinessClass`, `costExposureClass`. None of
those required showing the utility that internal schedule confidence is
0.68 or that the deferrable workload share is 22%. The decision is
identical. The disclosure surface is not.

**The regulator gets a different shape of artifact.** They don't get
*more* raw data than the utility — they get the same projection plus a
visibility-metadata layer (counts, policy hash, audit chain). That's
how you audit a confidential system: by checking that the released
quantity matches the policy claim, not by reading the sealed inputs.

Without the projection layer the utility would see 18 raw fields.
Practical consequences:

- The 22% flex appears in utility's email, ticketing system, internal
  reports, and any downstream analytics — none of which the applicant
  has visibility into.
- A subpoena to the utility produces the raw record, including
  competitive information the applicant would not have shared with a
  competitor's customer.
- The utility has access to information they never needed to make the
  decision — and now bears the cost of protecting it.

The point of policy-governed projection is to prevent that broadening
in the first place, not to clean it up after the fact.

---

## 4. Why existing methods don't quite fit

This is the section that gets asked the most. Each existing approach
solves a real problem; none of them is a workflow-level
projection primitive on its own.

### 4a. NDAs and email-based redacted PDFs

The current state of practice. Legal layer, no enforcement at request
time. Manual redaction is famously incomplete (Adobe Acrobat redactions
commonly leave the original text in the document's revision history; PDF
metadata leaks editor names, originating paths, prior versions). The
NDA deters and makes a leak actionable in court, but doesn't prevent
inadvertent forwarding, screenshotting, or accidental inclusion in a
quarterly report. The regulator gets no visibility into what was
hidden — they see only what the applicant chose to show, and they have
no way to verify that the utility's decision was based on what it
claims to be based on.

**Where it fits:** as a fallback. **Where it doesn't:** there is no
machine-checkable record that policy was applied, and there is no
counterfactual the regulator can run.

### 4b. Pre-redaction by the submitter

The applicant decides what to share before submission. Same problem from
the other direction: the disclosure rule is asymmetric. The utility
doesn't know what was redacted, can't reason about whether a missing
field changes the decision, can't compare two requests that redacted
different fields. If two applicants in similar situations choose to
redact differently, the utility ends up with two non-comparable
applications. There is no shared schema for "enough disclosure".

**Where it fits:** when the disclosure rule is genuinely the
applicant's call. **Where it doesn't:** when the workflow needs role
projections that are consistent across applicants and inspectable by a
third party.

### 4c. Zero-knowledge proofs

Mathematically rigorous: prove a statement about your private data
without revealing the data. Beautiful for narrow predicates — "I have
at least 30 MW of dispatchable load," "my BESS round-trip efficiency
exceeds 85%". Tooling cost is high (circuit design is non-trivial), the
predicate has to be fixed in advance, and a typical interconnection
disclosure has a dozen overlapping predicates that evolve with policy
revisions.

**Where it fits:** as targeted attestations *inside* the projection
layer, e.g., the flexibility passport could include a ZK proof that the
applicant can dispatch ≥ X MW. **Where it doesn't:** as the primary
disclosure substrate for a messy multi-dimensional submission with
free-text evidence and a workflow that changes quarterly.

### 4d. Multi-party computation

Multiple parties jointly compute a result over their private inputs
without any party seeing the others'. Right tool for joint demand-response
scheduling across utilities, joint capacity auctions, joint forecast
ensembles. Wrong tool for a single-applicant interconnection request,
which has one input party.

**Where it fits:** later, when Grid Passport coordinates across multiple
applicants jointly bidding flexibility into the same wholesale market.
**Where it doesn't:** the single-applicant case we showcase today.

### 4e. Confidential computing and TEEs (SEV-SNP, TDX, Confidential Space)

Hardware-attested execution environments. Code runs on data inside an
enclave that the cloud admin and the host operator cannot read. This is
the *right substrate* for the derivation step — keeps raw inputs sealed
even from the operator. GCP Confidential Space is the production target
for the forecaster.

But TEEs answer a different question. They say "this code, attested by
this measurement, ran on this data, and the host couldn't see it." They
do **not** say "the resulting projection is the role-appropriate one."
The policy/projection layer sits *above* the TEE: the TEE makes sure
the worker can't be tampered with; the projection layer makes sure the
worker's output goes to the right role with the right fields stripped.
The two compose.

**Where it fits:** the implementation substrate for the worker that
holds raw inputs. **Where it doesn't:** as a substitute for the
policy/projection layer itself.

### 4f. Differential privacy

Add calibrated noise so individual contributions can't be inferred from
aggregate releases. Designed for population statistics and large-N
queries. A single interconnection request is N=1; a noisy answer to "is
this site interconnectable?" is operationally useless.

**Where it fits:** publishing aggregate flexibility statistics across a
fleet of applicants. **Where it doesn't:** a per-request decision.

### 4g. Federated learning

Train a model where the data stays at the edge. Useful if multiple
utilities wanted to jointly train a forecaster without pooling their
proprietary outage data. Orthogonal to per-request disclosure.

**Where it fits:** the eventual shared-forecaster product. **Where it
doesn't:** the disclosure workflow we're building today.

### 4h. Homomorphic encryption (FHE)

Compute on encrypted data, decrypt the result. Same theoretical power
as ZK + MPC combined. Performance is improving (CKKS, BFV) but still
far from practical for a workflow with messy inputs and policy that
changes quarterly. May replace the TEE substrate someday.

**Where it fits:** future substrate. **Where it doesn't:** today's
budget.

---

## 5. Trust model — local-first

The mechanism above (§1) describes *how* private fields are kept out of
non-applicant projections. This section is about *who runs the
mechanism*, and why that question dissolves the "trust the third party"
problem entirely.

### The naive architecture has a fatal trust problem

The obvious shape of Grid Passport is a hosted service: applicants
upload raw data, our servers run the projection, utilities and
regulators query our API for role-appropriate views. **The current web
demo at `https://grid-passport.vercel.app` is exactly this shape, for
teaching purposes.** It is *not* the architecture we recommend for
production.

In a hosted-service model, every conversation with a hyperscaler ends
with: "and how do we trust *you* with raw competitive data?" There is
no satisfying answer. Even with TEE attestation:

- We could change our terms.
- We could be acquired.
- We could be subpoena'd.
- We could pivot.
- A determined insider with database access could exfiltrate.

TEEs answer "the cloud admin can't read enclave memory." They do not
answer "the startup operating the service won't betray us in five
years." The trust gap is structural, not technical.

### The pivot: applicant runs the projection locally

Grid Passport is distributed as a **local desktop application** (Tauri
preferred). The applicant installs it; raw inputs live on their
machine; the projection runs in-process; nothing leaves the laptop
until the applicant explicitly exports a **signed disclosure bundle**
containing only the projected view, audit chain, and policy hash.

What this changes:

| Question                                          | Hosted-service answer                                  | Local-first answer                                                                  |
| ------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| "Why do I trust *you* with my data?"              | TEE attestation, audits, certifications.               | **You don't have to. The data never leaves your machine.**                           |
| "What if you change your privacy policy?"         | Trust + legal recourse.                                | We don't have your data.                                                            |
| "What if you get subpoena'd?"                     | We'd produce what's in our DB.                         | We have nothing to produce.                                                         |
| "How does the utility verify?"                    | They trust our backend.                                | They verify a signed bundle against the published policy hash. No service trust needed. |
| "Where does the TEE fit now?"                     | Critical — protects the host server.                   | Optional — only relevant if a utility wants delegated verification, not core path.   |
| "What about NDAs?"                                | The tool tries to replace them.                        | NDAs sit *on top of* the tool. They cover liability if disclosure fails; the tool reduces the surface where failure can happen. They compose. |

### The applicant becomes the gatekeeper, by construction

In the local-first model, every non-applicant projection is one the
applicant has already reviewed locally and explicitly chosen to export.
No surprise disclosure is possible — there is no surprise channel.

This also means the regulator's projection (which adds visibility
metadata: counts, policy hash, audit chain) is something the applicant
sees in the same UI before any export. The applicant knows exactly
what each downstream party will see.

### The web demo is a teaching artifact, not the product

The hosted demo lets a stage audience see all three projections in one
browser tab — that's its job. The production form is the local app, and
the canary check still applies the same way: the projection layer is
the same code regardless of where it runs.

See `docs/vision.md` §5 for the full architecture diagram, the
business-model implications, and the analogies from other industries
(IRS-approved tax software, e-discovery, sealed-bid auctions, PSD2
open banking) that have made the same protocol-not-custodian move.

---

## 6. Where Grid Passport sits

The picture under local-first, top to bottom:

```
┌──────────────────────────────────────────────────────────┐
│  Disclosure workflow (per role: applicant, utility,       │
│  regulator) — what we are                                  │
│                                                           │
│   • policy-governed projection (this layer)                │
│   • role-appropriate views                                 │
│   • content-addressed audit trail                          │
│   • runs in the applicant's local app — no server custody  │
└──────────────────────────────────────────────────────────┘
                          ↑↓
┌──────────────────────────────────────────────────────────┐
│  Signed disclosure bundle — the wire format               │
│   • projection + audit chain + policy hash                 │
│   • Ed25519-signed by the applicant                        │
│   • verified by utility/regulator without re-running       │
└──────────────────────────────────────────────────────────┘
                          ↑↓
┌──────────────────────────────────────────────────────────┐
│  Targeted attestations — composable, optional             │
│   • ZK proofs of specific predicates                       │
│   • Third-party signed evidence (DEQ, FEMA, county GIS)    │
└──────────────────────────────────────────────────────────┘
                          ↑↓
┌──────────────────────────────────────────────────────────┐
│  Local execution — the applicant's machine                │
│   • TEE no longer load-bearing for disclosure              │
│   • Optional: utility-side TEE for delegated verification  │
│     (Confidential Space, Nitro Enclaves) — Phase 5+        │
└──────────────────────────────────────────────────────────┘
```

The biggest architectural shift from the original framing: the bottom
layer used to be "Confidential execution substrate (TEE / Confidential
Space) for the worker." Under local-first, the worker runs on the
applicant's own hardware — they own the data, so the trust boundary
is theirs. TEEs become relevant only on the receiving side, and only
if the utility wants to delegate verification of a bundle to a separate
trust domain. Not the critical path.

Policy-governed projection is the workflow's privacy layer. It is
*orthogonal* to the cryptographic layers above it: ZK attestations can
prove specific predicates about the projection; signed bundles
guarantee integrity in transit; the projection layer decides what
counts as "appropriate to release given a role and a policy version."

---

## 7. What we are *not* claiming

The honest list, so the demo doesn't oversell.

- **The web demo is a hosted service** — that's a teaching artifact, not the production architecture. The real product is the local desktop app described in §5; under that architecture there is no third-party data custody to worry about.
- **The signed disclosure bundle is conceptual.** The bundle exists in the architecture; the signing/verification step (Ed25519, public-key registry for utilities) isn't wired yet. Until it is, the privacy claim relies on the integrity of the projection function, not on cryptographic transit guarantees.
- **TEE is no longer the critical-path future work.** Under local-first, raw inputs never leave the applicant's machine, so a hardware-attested execution environment isn't required for the disclosure layer. TEE re-enters only if a utility wants delegated verification (Phase 5+) or for utility-side aggregate analytics across many bundles.
- **Flex MOSAIC compliance is stylized.** Our `responseClass: A | B | C` is a single-axis ordinal bucket inspired by [EPRI's Flex MOSAIC framework](https://dcflex.epri.com/flex-mosaic) (launched March 23, 2026), not an implementation of the published multi-axis ladder. Adopting the real schema is a 2–3 day swap once it stabilizes.
- **The forecaster is a deterministic toy.** `firmnessScore` and `expectedPeakMW` come from hand-tuned linear formulas in `packages/core/src/forecast.ts`, not a probabilistic model. A real forecaster would emit P10/P50/P90 uncertainty bands trained on historical interconnection outcomes.
- **The audit trail is sha-256 anchored, not zero-knowledge.** A regulator can verify that a hash matches a payload, but the payload itself isn't proved without disclosure. ZK attestations of specific fields are an extension, not the baseline.
- **Fixtures are synthetic.** Every number in the demo is fabricated for the case study. We do not claim utility-grade forecast accuracy.
- **The policy is small.** ~20 fields. A production version would have hundreds, with cross-cutting rules (e.g., "redact any field whose classification has changed in the last 90 days unless re-attested"). The mechanism scales; the policy currently does not.
- **Counterfactual scenarios are deterministic and bounded.** A real forecaster would return uncertainty intervals; ours returns a single band per scenario.
- **The Rego is canon but the runtime evaluator is the TS mirror.** Until the OPA WASM swap lands, the canary is what guarantees the two agree.

These constraints are demo-scope, not architectural. Each one has a
plan to remove it (see `docs/vision.md` §11–12 and `docs/plans/handoff.md` → Open items).

---

## 8. Run the canary

```sh
pnpm privacy:canary
```

When it passes:

```
[canary] structural projection: pass
[canary] audit action scan (baseline): pass
[canary] audit action scan (with flex override): pass
[canary] policy mirror drift (TS ↔ Rego ↔ Python): pass

[canary] all clear · policy grid-passport-policy@0.1.0
```

When it doesn't, the failure is precise — case, role, field path, the
exact action string that exposed a value. The fix that landed in this
commit (audit baseline redaction + server-side override drop) was
diagnosed by the canary in one run.

That is the privacy claim, made literal.
