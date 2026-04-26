"""Custom Concordia ContextComponents for sim-bench role agents — §5.

Three components on top of Concordia's stock library:

- `LockedPersonaInstructions` — wraps one of the §5 locked role-prompt
  templates with scenario-specific placeholder substitution, exposed to
  the agent via the `Constant` pre-act path.
- `ScenarioContext` — bakes scenario identity, goals, disposition into
  the agent's pre-act context.
- `ParaphrasedPrivateProfile` — the §1.5.2 #6 realism-engineering
  contribution. Holds the raw private profile (technical-expert
  knowledge); on every `pre_act`, serializes it through
  `eval_sim.agents.paraphrase.paraphrase_barrier` with the scenario's
  archetype-specific loss rate, and exposes the **paraphrased** version
  as the pre-act contribution. Both raw + paraphrased are kept in the
  component's own state so the trace-leakage scorer (§8c.iii) can later
  measure what was actually disclosed vs. the floor (paraphrase loss is
  expected; raw verbatim leakage is not).
"""

from __future__ import annotations

from typing import Final

from concordia.components.agent import action_spec_ignored, constant

from eval_sim.agents.paraphrase import (
    ParaphraseResult,
    paraphrase_barrier,
)
from eval_sim.llm import Transport
from eval_sim.schemas.caseinput import PrivateProfile

DEFAULT_UTILITY_NAME: Final[str] = "Dominion Energy"
DEFAULT_REGULATORY_BODY: Final[str] = "SCC / FERC / JLARC staff review"


class LockedPersonaInstructions(constant.Constant):
    """A Concordia Constant component carrying a locked role prompt with
    scenario placeholders pre-substituted.

    The `template` is one of the §5 locked prompts from
    `eval_sim.agents.prompts`. Substitution uses `.format(**fields)` —
    any unmapped placeholder raises KeyError at construction time
    (loud-fail beats silent skip).
    """

    def __init__(
        self,
        *,
        template: str,
        fields: dict[str, str],
        pre_act_label: str,
    ) -> None:
        rendered = template.format(**fields)
        super().__init__(state=rendered, pre_act_label=pre_act_label)


class ScenarioContext(constant.Constant):
    """Baked scenario context — a constant carrying the identity block,
    disposition, and goals so every turn can refer back to them without
    relying on memory retrieval.
    """

    def __init__(
        self,
        *,
        body: str,
        pre_act_label: str = "Scenario context",
    ) -> None:
        super().__init__(state=body, pre_act_label=pre_act_label)


class ParaphrasedPrivateProfile(action_spec_ignored.ActionSpecIgnored):
    """Realism-engineering contribution per sim-bench-design.md §1.5.2 #6.

    Holds the raw private profile (technical-expert knowledge). On each
    `pre_act`, runs the profile through `paraphrase_barrier()` with the
    scenario's archetype-specific loss rate, and contributes the
    **paraphrased** version to the agent's act prompt — modeling the
    contract-handler's lossy summary of the technical team's response.

    Both raw + paraphrased are retained on the component (`raw_text`,
    `last_paraphrase`) so the trace-leakage scorer can audit which
    private values actually crossed into the outbound channel vs. were
    successfully compressed at the inter-persona boundary.

    `seed_key_prefix` is `"{scenario_id}|{seed_index}"`; the component
    appends a per-call counter so each pre_act gets a deterministic but
    distinct paraphrase realization.
    """

    def __init__(
        self,
        *,
        private_profile: PrivateProfile,
        loss_rate: float,
        seed_key_prefix: str,
        transport: Transport | None = None,
        dry_run: bool = True,
        model: str = "claude-sonnet-4-6",
        pre_act_label: str = "Private profile (technical-expert paraphrase)",
    ) -> None:
        super().__init__(pre_act_label)
        self._private_profile: Final[PrivateProfile] = private_profile
        self._loss_rate: Final[float] = loss_rate
        self._seed_key_prefix: Final[str] = seed_key_prefix
        self._transport: Final[Transport | None] = transport
        self._dry_run: Final[bool] = dry_run
        self._model: Final[str] = model
        self._call_counter: int = 0
        self._raw_text: str = self._serialize(private_profile)
        self._last_paraphrase: ParaphraseResult | None = None

    @staticmethod
    def _serialize(profile: PrivateProfile) -> str:
        """Render the typed PrivateProfile as a text block for the
        paraphrase barrier. Field names + units only — the values are
        the load-bearing content the barrier compresses.
        """
        return (
            f"Flexibility commitment: {profile.flexPercent}% of nameplate.\n"
            f"Redundancy shift: {profile.redundancyShiftPercent}% headroom.\n"
            f"Backup generation: {profile.backupGenMW} MW for "
            f"{profile.backupGenHours} hours.\n"
            f"BESS architecture: {profile.bessMW} MW × {profile.bessHours} h.\n"
            f"Internal schedule confidence: {profile.internalScheduleConfidence}.\n"
            f"Workload mix: training={profile.workloadMix.training}, "
            f"inference={profile.workloadMix.inference}."
        )

    @property
    def raw_text(self) -> str:
        """The raw (non-paraphrased) profile serialization. The trace
        scorer compares paraphrased outputs against this to detect
        verbatim leakage.
        """
        return self._raw_text

    @property
    def last_paraphrase(self) -> ParaphraseResult | None:
        """The most recent paraphrase result (or `None` if `pre_act`
        has not run yet). Carries `original`, `paraphrased`, `loss_rate`,
        `added_simulated_days`.
        """
        return self._last_paraphrase

    def _make_pre_act_value(self) -> str:
        self._call_counter += 1
        seed_key = f"{self._seed_key_prefix}|paraphrase-{self._call_counter:03d}"
        result = paraphrase_barrier(
            self._raw_text,
            loss_rate=self._loss_rate,
            seed_key=seed_key,
            transport=self._transport,
            model=self._model,
            dry_run=self._dry_run,
        )
        self._last_paraphrase = result
        return result.paraphrased
