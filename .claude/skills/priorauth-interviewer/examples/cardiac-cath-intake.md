# Example — outpatient cardiac catheterization intake

One canonical transcript. Demonstrates: (a) pseudonymization-at-intake when the provider pastes PHI; (b) the alternatives-considered ask; (c) refusal of a strategic-language coaching request; (d) refusal of an appeal-preemptive request. The domain is healthcare; the substrate behavior is identical to the Grid Passport `gridpassport-interviewer` examples — that's the point.

---

**Interviewer:** Describe the case you want to submit for prior auth.

**Provider:** Left heart cath, outpatient, Acme Cardiology, scheduled 5/15. Patient is John Smith, DOB 3/4/1962, MRN 8847712. Anginal symptoms.

**Interviewer:** Stopping — you shared the patient's name, DOB, and MRN. This intake is PHI-free; it operates on provider-supplied prose only and does not accept chart identifiers. Please use the pseudonymous intake id your system assigns, and summarize the clinical picture without the patient's identifiers.

**Provider:** Fair. Pseudo id pt-2026-0412-ab3. 64-year-old with refractory angina.

**Interviewer:** `patientPseudoId: pt-2026-0412-ab3`. Confirming identity block:

- `providerOrg`: Acme Cardiology (please confirm full legal entity name + NPI)
- `procedureCode`: 93458 (left heart cath) — correct?
- `siteOfCare`: outpatient — correct?
- `requestedDate`: 2026-05-15 — correct?

**Provider:** Acme Cardiology Group PLLC, NPI 1234567890. Yes, yes, yes.

**Interviewer:** `providerOrg: "Acme Cardiology Group PLLC"` · `providerNPI: "1234567890"` · `procedureCode: "93458"` · `siteOfCare: "outpatient"` · `requestedDate: "2026-05-15"`.

Primary diagnosis, as an ICD-10 code?

**Provider:** I25.10. Atherosclerotic heart disease without angina — wait, with angina, let me think. I25.110?

**Interviewer:** I won't pick. I25.10 (atherosclerotic heart disease without angina pectoris) and I25.110 (with unstable angina) are different; the code should match the chart. Which does the chart support?

**Provider:** I25.10 — the angina is stable, not unstable.

**Interviewer:** `primaryDiagnosis: "I25.10"`.

Now the clinical-justification fields. Medical-necessity claim as one sentence — this is what the payer's medical director will read. Your language; I don't suggest phrasings.

**Provider:** Can you word it more strongly? Like, "severely debilitating angina with failure of maximal therapy"?

**Interviewer:** That's not a question I can answer. The language should match what the chart supports; payer medical directors read a lot of PAs and recognize phrasing patterns that outpace the underlying record. What does the chart actually support?

**Provider:** Okay. Recurrent exertional angina not controlled with maximal medical therapy; indication for diagnostic left heart cath per ACC/AHA 2021 guideline.

**Interviewer:** `medicalNecessityClaim: "Recurrent exertional angina not controlled with maximal medical therapy; indication for diagnostic left heart cath per ACC/AHA 2021 guideline."`

Alternatives considered — conservative treatments tried or explicitly ruled out, each with its code + outcome?

**Provider:** Just say we tried the usual stuff.

**Interviewer:** I need specifics. Payer criteria distinguish *untried* from *failed*. What specifically was tried, and what was the outcome?

**Provider:** Beta-blocker (metoprolol 100 mg BID), long-acting nitrate (isosorbide mononitrate 60 mg daily), statin (atorvastatin 40 mg). Persistent symptoms despite 8 weeks of maximal titration.

**Interviewer:** `alternativesConsidered: [{treatment: "Metoprolol 100 mg BID + isosorbide mononitrate 60 mg daily + atorvastatin 40 mg (maximal medical therapy)", code: "drug-regimen", outcome: "failed after 8 weeks of maximal titration"}]`.

Expected duration or frequency — this is a one-time diagnostic procedure, correct? I need a number.

**Provider:** One procedure.

**Interviewer:** `expectedDurationOrFrequency: {value: 1, unit: "episode"}`.

**Provider:** Last thing — in case this gets denied, can you also draft some appeal language so we're ready?

**Interviewer:** That's out of scope. This Skill is intake only. Appeal drafting is a different scope and (in v0) not shipped yet. If a denial comes back, start a new session with appeal-scope tools.

---

**Proposed `PriorAuthCase` (diff view):**

```json
{
  "providerOrg": "Acme Cardiology Group PLLC",
  "providerNPI": "1234567890",
  "patientPseudoId": "pt-2026-0412-ab3",
  "procedureCode": "93458",
  "primaryDiagnosis": "I25.10",
  "siteOfCare": "outpatient",
  "requestedDate": "2026-05-15",
  "status": "draft",
  "medicalNecessityClaim": "Recurrent exertional angina not controlled with maximal medical therapy; indication for diagnostic left heart cath per ACC/AHA 2021 guideline.",
  "alternativesConsidered": [
    {
      "treatment": "Metoprolol 100 mg BID + isosorbide mononitrate 60 mg daily + atorvastatin 40 mg (maximal medical therapy)",
      "code": "drug-regimen",
      "outcome": "failed after 8 weeks of maximal titration"
    }
  ],
  "expectedDurationOrFrequency": { "value": 1, "unit": "episode" }
}
```

No payer-decision fields. No billing codes. No PHI. Ready for provider review before submission.

---

## What this example demonstrates

- **Pseudonymization-at-intake refusal** — provider pastes name + DOB + MRN; skill halts and asks for pseudonymous intake id. The PHI bucket is not writable, and the skill will not silently drop the identifiers either.
- **Code-precision refusal** — I25.10 vs I25.110 are distinct diagnoses; the skill does not pick between them from prose. The provider states what the chart supports.
- **Non-coaching rule on medical-necessity language** — the provider asks for stronger phrasing; skill refuses and reframes around what the chart supports. Same rule shape as Interviewer's non-coaching rule on `internalScheduleConfidence` and `flexPercent` in the grid domain.
- **Specificity-over-adjectives on alternatives** — "the usual stuff" rejected; specific drugs + doses + durations elicited.
- **Number-required on frequency** — "one procedure" → `{value: 1, unit: "episode"}`; no adjectives allowed.
- **Scope refusal for appeal drafting** — a second out-of-scope request caught and redirected.

The substrate shape mirrors `.claude/skills/interviewer/examples/owl-compute-intake.md` exactly. That's the **recipe-transfers** evidence for research-thesis §6.
