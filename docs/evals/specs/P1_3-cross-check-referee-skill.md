# Spec P1.3 — Cross-check Referee Skill (verifiable-field subset)

> **Student follow-on.** Owner: engine student. Review gates: Ming (write-scope contract + CI-validator authoring). ~3–4 weeks total. Unblocks: the partial revelation-principle piece of research-thesis §3.2 (verifiable-field subset).

## Goal

Ship a new Skill that reads `privateProfile` + `publicEvidence` and emits inconsistency flags to `derivedProof.consistencyFlag[]`. The Skill's write-scope is constrained so it **cannot** mutate `privateProfile` or `publicEvidence` — only append flags. This closes the verifiable-field-subset half of the §3.2 three-mechanism composition.

## Write-scope contract (for `SKILL.md`)

- **MAY write:** `derivedProof.consistencyFlag[]` — append-only list of `ConsistencyFlag` objects.
- **MUST NEVER write:** `privateProfile.*`, `publicEvidence.*`, `auditChain[]`, or any existing field of `derivedProof` except `consistencyFlag[]`.
- **MUST NEVER:** coach the applicant on how to make flags go away. The flag is the finding; resolving it is the applicant's (or utility's) decision.
- **MUST:** cite the `publicEvidence.sourceRefs[]` entry that grounds each flag. A flag without a cited public-record source is malformed and MUST be refused by the CI validator.

## Data schema (add to `packages/core/src/types.ts`)

```ts
type ConsistencyFlag = {
  privateField: string;         // e.g. "privateProfile.siteControlStatus"
  privateClaim: string;         // e.g. "signed"
  publicEvidenceSource: string; // e.g. "publicEvidence.parcelRecords[0].sourceRef"
  publicFinding: string;        // e.g. "no deed recorded as of 2026-03-15"
  severity: "info" | "warning" | "material";
  reasoning: string;            // one sentence; audit trail
};
```

## Flags the Skill must detect

Minimum viable set, for each of S1–S6:

| Private claim | Public source | Flag when |
|---|---|---|
| `privateProfile.siteControlStatus = "signed"` | `publicEvidence.parcelRecords[*].deedStatus` | No deed present for `publicEvidence.parcelId`; flag severity = "material" |
| `privateProfile.financingStatus = "LOI"` or `"committed"` | `publicEvidence.financingOfRecord[*]` | No bank letter or SEC filing; flag severity = "warning" |
| `privateProfile.floodRisk = "low"` | `publicEvidence.floodOverlay.zone` | FEMA zone is AE or higher; flag severity = "material" |
| `privateProfile.permitStatus = "clear"` | `publicEvidence.permitDocket[*].status` | DEQ docket shows open review; flag severity = "warning" |

## Paired CI validator

At `packages/agents/referee/scripts/validate_consistencyflags.ts`. Mirrors the `interviewer` and `cartographer` validator pattern:

- 3 positive self-tests (known inconsistency → flag emitted)
- 4 negative self-tests (known consistency → no flag emitted)
- 1 write-scope refusal test (Skill attempts to write `privateProfile` → validator refuses)
- 1 missing-source refusal test (flag without cited source → validator refuses)

## SKILL.md structure (mirror existing Skills)

```
.claude/skills/referee/
├── SKILL.md                   frontmatter + write-scope + non-coaching rule + checklist
├── REFERENCE.md               field-claim vs public-source mapping table
├── SOURCES.md                 (symlink or pointer to cartographer's SOURCES.md)
└── examples/
    ├── lantern-cloud.md       flood overlay inconsistency
    ├── adversarial-talon.md   site-control misreport
    └── multi-phase.md         no inconsistencies (baseline)
```

## Hypothesis

**H-CC (cross-check sensitivity).** On held-out scenarios with pre-planted inconsistencies (adversarial S5 + constructed S2 variants), the Skill detects ≥ 80% of inconsistencies at flag severity = "material".

**H-CC-specificity.** On scenarios with no planted inconsistencies (S1/S3 baseline + consistent S2 variant), the Skill emits zero "material"-severity flags (false-positive rate = 0).

## Integration with existing bench

- Runs after Cartographer populates `publicEvidence`; before Forecaster (which reads `derivedProof` and would benefit from knowing of inconsistency flags).
- In Condition D (Grid Passport), the signed disclosure bundle carries consistency flags as part of `derivedProof`. Utility sees them in the projection; regulator sees them in the audit chain.
- In Condition C (prompt-only), the flat-prompt Referee baseline is the comparison — does the Skill-packaged Referee detect more inconsistencies than the flat prompt?

## Benchmark add-on

Author 30 "inconsistency ground-truth" scenarios: 15 with planted inconsistencies (adversarial), 15 without (baseline). Run Referee Skill + Referee-flat-prompt on each. Measure detection rate + false-positive rate.

## Deliverables

1. **`.claude/skills/referee/`** directory with SKILL.md + REFERENCE.md + 3 examples
2. **`packages/agents/referee/scripts/validate_consistencyflags.ts`** paired CI validator
3. **`packages/agents/referee/baselines/prompt-only.md`** mechanically-derived flat-prompt baseline (via `pnpm agents:baseline`)
4. **30-scenario inconsistency ground-truth set** at `packages/eval-sim/eval_sim/scenarios/referee/`
5. **Batch script** at `packages/eval-sim/scripts/referee_benchmark.py`
6. **Report section** added to `sim-bench-results.md` as "§3.2 cross-check evidence (verifiable subset)"

## Cost estimate

30 scenarios × 2 substrates × ~5k tokens Opus = $15–25 SDK.

## What this spec does NOT cover

- Unverifiable-field cross-check. That's P1.4 (proper-scoring-rule calibration) — see separate spec.
- Live Cartographer fetching vs cached. Reuses Cartographer's existing cache infrastructure.
- Multi-round disambiguation. If Referee detects an inconsistency, it flags; it does NOT initiate a round-trip to the applicant. Round-trips happen in the existing bounded-query channel if the utility asks.
