"""Pydantic models for the sim bench.

Re-exports the types that other modules import. Each type's docstring points
back to the §-anchor in docs/evals/sim-bench-design.md.
"""

from eval_sim.schemas.caseinput import (
    CaseInput,
    FlexibilityPassport,
    PrivateProfile,
    PublicEvidence,
    RequestRecord,
    SiteContext,
    SourceRef,
    WorkloadMix,
)
from eval_sim.schemas.channel import (
    Channel,
    ChannelWeight,
    SensitivityWeight,
)
from eval_sim.schemas.condition import Condition
from eval_sim.schemas.judge import Dimension, JudgeOutput, PerDimensionScore
from eval_sim.schemas.role import (
    Disposition,
    ModelTier,
    Role,
    RoleConfig,
)
from eval_sim.schemas.scenario import (
    CITuple,
    ExpertiseGap,
    Future,
    FutureOutcomeScore,
    ScenarioCard,
    SuccessCriteria,
)
from eval_sim.schemas.turn import TurnMessage

__all__ = [
    "CITuple",
    "CaseInput",
    "Channel",
    "ChannelWeight",
    "Condition",
    "Dimension",
    "Disposition",
    "ExpertiseGap",
    "FlexibilityPassport",
    "Future",
    "FutureOutcomeScore",
    "JudgeOutput",
    "ModelTier",
    "PerDimensionScore",
    "PrivateProfile",
    "PublicEvidence",
    "RequestRecord",
    "Role",
    "RoleConfig",
    "ScenarioCard",
    "SensitivityWeight",
    "SiteContext",
    "SourceRef",
    "SuccessCriteria",
    "TurnMessage",
    "WorkloadMix",
]
