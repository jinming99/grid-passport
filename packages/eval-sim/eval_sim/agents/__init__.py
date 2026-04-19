"""Role-persona scaffolding — sim-bench-design.md §5.

Pre-§17-lock this module exposes the locked system-prompt templates
(`prompts.py`) and the `ParaphraseBarrierComponent` pure-function
implementation (`paraphrase.py`). Full Concordia `EntityAgent` wiring
lands Week 2. The shape of each persona is:

- `ApplicantEntity` — two personas (ContractHandler + TechnicalExpert)
  plus `ParaphraseBarrierComponent` (§5a, §1.5.2 #6)
- `UtilityEntity` — two personas (IntakeEngineer + PlanningLead) plus
  coordination delay (§5b)
- `RegulatorEntity` — one persona (§5c)

`JudgeAgent` + `ProbeAgent` live under `eval_sim.scorers` because they
score transcripts rather than participate in them.
"""

from eval_sim.agents.paraphrase import (
    PARAPHRASE_BARRIER_PROMPT,
    ParaphraseResult,
    paraphrase_barrier,
)
from eval_sim.agents.prompts import (
    APPLICANT_CONTRACT_HANDLER_PROMPT,
    APPLICANT_TECHNICAL_EXPERT_PROMPT,
    LOCKED_PROMPTS,
    REGULATOR_PROMPT,
    UTILITY_INTAKE_ENGINEER_PROMPT,
    UTILITY_PLANNING_LEAD_PROMPT,
)

__all__ = [
    "APPLICANT_CONTRACT_HANDLER_PROMPT",
    "APPLICANT_TECHNICAL_EXPERT_PROMPT",
    "LOCKED_PROMPTS",
    "PARAPHRASE_BARRIER_PROMPT",
    "REGULATOR_PROMPT",
    "UTILITY_INTAKE_ENGINEER_PROMPT",
    "UTILITY_PLANNING_LEAD_PROMPT",
    "ParaphraseResult",
    "paraphrase_barrier",
]
