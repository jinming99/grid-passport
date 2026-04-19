# Prior-authorization Interviewer — Field Reference

Minimal `PriorAuthCase` catalog. This is a substrate-transfer demonstration, not a full HIPAA product — the fields are enough to run a realistic intake and show the Skill recipe applies to a non-grid domain. For the research thesis tie-in, see `docs/design/research-thesis.md` §6 (generalization to healthcare prior-auth is the canonical non-grid replication target).

## Bucketing

| Bucket | Interviewer write scope | Meaning |
|---|---|---|
| `identity` | writable from confirmed prose | Counterparty + procedure basics; stays on the record. |
| `clinical-justification` | writable via explicit confirmation turn | Medical-necessity claim + alternatives + frequency; must come from the provider, not an inference. |
| `phi` | **NOT writable by this skill** | Raw patient health information; rejected at intake. |
| `payer-decision` | **NOT writable by this skill** | Payer's scope. |
| `billing-code` | **NOT writable by this skill** | Claim-coding agent's scope. |

## Identity bucket

| Field | Type | Example | Ask-reason |
|---|---|---|---|
| `providerOrg` | string | `"Acme Cardiology Group"` | Who is filing. Payers need the counterparty to open a PA case. |
| `providerNPI` | string (10-digit NPI) | `"1234567890"` | Provider identity on the record. |
| `patientPseudoId` | string | `"pt-2026-0412-ab3"` | Pseudonymous patient id assigned by the provider's intake system. **Never a real MRN, DOB, name, or address.** If the provider pastes PHI, the skill declines and asks for the pseudonymized summary. |
| `procedureCode` | string (CPT/HCPCS) | `"93458"` (left heart cath) | The procedure being requested. Feeds payer's coverage-rule lookup. |
| `primaryDiagnosis` | string (ICD-10) | `"I25.10"` (atherosclerotic heart disease) | The primary diagnosis driving the procedure. |
| `siteOfCare` | enum | `"outpatient"` | One of: `inpatient` · `outpatient` · `ASC` · `office` · `telehealth`. Affects PA criteria. |
| `requestedDate` | ISO date | `"2026-05-15"` | Scheduled procedure date; payers require advance notice. |

## Clinical-justification bucket (explicit confirmation)

Ask each as a direct question. Do not propose clinical language. Do not suggest stronger phrasings.

| Field | Type | Example | Ask-reason |
|---|---|---|---|
| `medicalNecessityClaim` | string (one sentence) | `"Recurrent exertional angina not controlled with maximal medical therapy; indication for diagnostic left heart cath per ACC/AHA 2021 guideline."` | The clinical rationale. The provider writes this; the skill does not suggest phrasings. |
| `alternativesConsidered[]` | array of `{treatment, code, outcome}` | `[{treatment: "Maximal medical therapy — beta-blocker + nitrate + statin", code: "drug-regimen", outcome: "failed — persistent symptoms"}]` | Conservative treatments tried or explicitly ruled out. Payers distinguish *untried* from *failed*; the skill asks for both. |
| `expectedDurationOrFrequency` | number + unit | `{value: 1, unit: "episode"}` | Quantitative commitment — not "often" or "regularly". The skill asks for a number. |

## PHI bucket — NOT writable

If the provider pastes any of the following into the transcript, the skill **must refuse** and ask for pseudonymization:

- Patient name, DOB, address, phone, email
- Full MRN
- Full SSN or insurance ID
- Free-text chart notes containing any of the above
- Uploaded images or PDFs that might carry PHI

Accept only: the `patientPseudoId` the provider's intake system assigns.

## Payer-decision bucket — NOT writable

`payerDecision` · `coverageReason` · `appealsText` are payer-scoped. If the provider asks the skill to draft appeal language preemptively, refuse; that's the appeal skill's scope (not yet shipped — out of scope for v0 substrate-transfer demo).

## Billing-code bucket — NOT writable

`claimCode` · `billingModifier` · `revenueCode` are claim-coding-scope. If the provider asks the skill to "add the modifier for outpatient observation", refuse; that's a separate coding agent.

## Common mistakes to avoid

1. **Writing `patientName` because the provider pasted a chart note.** → Refuse; ask for pseudonymized summary.
2. **Inferring `medicalNecessityClaim` from the diagnosis alone** ("I25.10 means angina, so write 'refractory angina'"). → Refuse; ask the provider to state the clinical claim.
3. **Suggesting "maximal medical therapy" phrasing when the provider says "we tried some stuff".** → Refuse; ask for the specific treatments and their outcomes.
4. **Accepting "the patient needs this regularly" as `expectedDurationOrFrequency`.** → Refuse; ask for a number.
5. **Drafting appeal-preemptive language** ("in case this gets denied, frame it as..."). → Refuse; that's a different scope.

## Why so much overlap with the grid `gridpassport-interviewer` shape?

Intentional. The substrate recipe is:
1. Identity bucket (from prose; confirm + diff).
2. Sensitive bucket (explicit confirmation; no inference from adjacent prose; no suggestion of stronger phrasings).
3. Never-writable buckets with sibling-agent refusal messages.
4. Trust-constraint checklist the skill runs every turn.
5. Worked example(s) under `examples/`.
6. Bundled REFERENCE.md for field-level detail.

The schema differs (grid: MW + flex % + workload mix; PA: CPT + ICD + medical-necessity claim). The **discipline** is identical. That's the substrate-as-safety-case claim made legible across domains.

## Version

Substrate-transfer proof. Minimal HIPAA schema; not a full PA product. When the healthcare line gets past demo-hood, this REFERENCE.md gains a typed `PriorAuthCase` backing schema in `packages/agents/priorauth/types.ts` and a paired CI validator.
