"""Per-role Concordia `EntityAgent` classes — sim-bench-design.md §5.

Wiring deferred to Week 2 per §12.2. This module will expose:
- `ApplicantEntity` — two `ContextComponent`s (ContractHandler + TechnicalExpert)
  plus `ParaphraseBarrierComponent` (§5a, §1.5.2 #6)
- `UtilityEntity` — two `ContextComponent`s (IntakeEngineer + PlanningLead)
  plus a coordination-delay component (§5b)
- `RegulatorEntity` — one `ContextComponent` (§5c)
- `JudgeAgent` — Prometheus-style judge orchestration (§5d)
- `ProbeAgent` — Staab-style inferential-leakage probe (§8c.ii)

No live LLM calls before §17 sign-off.
"""

__all__: list[str] = []
