"""Concordia EntityAgent factories for sim-bench role agents — §5.

Three builder functions, one per role, all returning a
`concordia.agents.entity_agent_with_logging.EntityAgentWithLogging`:

- `build_applicant(scenario, transport, …)`  — §5a, two-persona model
  (contract-handler + technical-expert) with the
  `ParaphrasedPrivateProfile` component sitting at the inter-persona
  boundary (§1.5.2 #6).
- `build_utility(scenario, transport, …)`    — §5b, two-persona model
  (intake-engineer + planning-lead) with no private-profile component
  (utility plans from disclosed fields only).
- `build_regulator(scenario, transport, …)`  — §5c, single persona;
  reads bundle + audit chain.

All agents:
- Use `TransportLanguageModel` (claude-agent-sdk under the hood).
- Carry a `LockedPersonaInstructions` per persona, formatted from the
  scenario card.
- Carry a `ScenarioContext` with identity + goals + disposition.
- Carry an `AssociativeMemory` (deterministic embedder per
  `eval_sim.agents.embedder`) + `ObservationToMemory` for multi-turn
  recall.
- Use Concordia's `ConcatActComponent` as the canonical actor.

Per §5e: applicant + utility + regulator use Sonnet 4.6 (user-sim
side). Caller passes `model_tier` to override (e.g. for the §6e
fairness pilot's both-live runs).
"""

from __future__ import annotations

from typing import Final

from concordia.agents import entity_agent_with_logging
from concordia.associative_memory import basic_associative_memory
from concordia.components.agent import (
    concat_act_component,
)
from concordia.components.agent import (
    memory as memory_component,
)
from concordia.components.agent import (
    observation as observation_component,
)
from concordia.typing import entity_component

from eval_sim.agents.components import (
    DEFAULT_REGULATORY_BODY,
    DEFAULT_UTILITY_NAME,
    LockedPersonaInstructions,
    ParaphrasedPrivateProfile,
    ScenarioContext,
)
from eval_sim.agents.embedder import deterministic_embedder
from eval_sim.agents.language_model import TransportLanguageModel
from eval_sim.agents.prompts import (
    APPLICANT_CONTRACT_HANDLER_PROMPT,
    APPLICANT_TECHNICAL_EXPERT_PROMPT,
    REGULATOR_PROMPT,
    UTILITY_INTAKE_ENGINEER_PROMPT,
    UTILITY_PLANNING_LEAD_PROMPT,
)
from eval_sim.config import MODEL_TIERS
from eval_sim.llm import Transport
from eval_sim.schemas.scenario import ScenarioCard

# §5e — applicant / utility / regulator are user-sim agents (Sonnet 4.6).
# StrEnum value coerces to the canonical model name string.
USER_SIM_MODEL: Final[str] = str(MODEL_TIERS["user-sim"])


# ────────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────────


def _scenario_context_body(scenario: ScenarioCard) -> str:
    """Serialize the §7 identity + disposition + goals block into the
    constant scenario-context body that every persona sees on every turn.
    """
    goals_text = "\n".join(f"  - {g}" for g in scenario.goals)
    return (
        f"Scenario {scenario.scenario_id} ({scenario.domain} domain).\n"
        f"Applicant: {scenario.applicant_org}\n"
        f"Site: {scenario.site.displayName} "
        f"({scenario.site.county}, {scenario.site.state}; "
        f"parcel {scenario.site.parcelId}).\n"
        f"Requested capacity: {scenario.requested_mw} MW.\n"
        f"Target COD: {scenario.target_cod}.\n"
        f"Phases: {scenario.phases}.\n"
        f"Disclosure disposition: {scenario.disposition.value}.\n"
        f"Goals (in priority order):\n{goals_text}\n"
        f"Complication: {scenario.complication}"
    )


def _make_memory_component() -> memory_component.AssociativeMemory:
    """One memory bank per build call — deterministic embedder so seeds
    reproduce. Concordia keys this in the entity under '__memory__' by
    convention; `ObservationToMemory` reads + writes via that key.
    """
    bank = basic_associative_memory.AssociativeMemoryBank(
        sentence_embedder=deterministic_embedder,
    )
    return memory_component.AssociativeMemory(memory_bank=bank)


# ────────────────────────────────────────────────────────────────────────
# Applicant — two personas + paraphrase barrier
# ────────────────────────────────────────────────────────────────────────


def build_applicant(
    *,
    scenario: ScenarioCard,
    transport: Transport,
    seed_index: int = 0,
    dry_run: bool = False,
    model_tier: str = USER_SIM_MODEL,
) -> entity_agent_with_logging.EntityAgentWithLogging:
    """Build the applicant `EntityAgent` per §5a.

    Two locked-persona components (contract-handler + technical-expert)
    plus the §1.5.2 #6 paraphrase-barrier component, all concatenated
    into one acting prompt by `ConcatActComponent`. The applicant has
    a private profile by construction; on `priorauth` scenarios this
    will need a parallel build for `PriorAuthProfile` (S7) — out of
    scope for the v1 grid agents.
    """
    if scenario.private_profile is None:
        raise ValueError(
            f"build_applicant requires a grid-domain scenario with a "
            f"private_profile; got {scenario.scenario_id} domain={scenario.domain}"
        )

    lm = TransportLanguageModel(transport=transport, model=model_tier)
    agent_name = f"{scenario.applicant_org} (applicant)"

    ch_fields = {
        "applicant_org": scenario.applicant_org,
        "requested_mw": str(scenario.requested_mw),
        "site_display_name": scenario.site.displayName,
        "target_cod": scenario.target_cod,
        "disposition": scenario.disposition.value,
        "goals": "\n".join(f"  - {g}" for g in scenario.goals),
    }
    contract_handler = LockedPersonaInstructions(
        template=APPLICANT_CONTRACT_HANDLER_PROMPT,
        fields=ch_fields,
        pre_act_label="Contract-handler persona (applicant outbound voice)",
    )

    te_fields = {
        "applicant_org": scenario.applicant_org,
        "private_profile": "(see paraphrased disclosure component)",
    }
    technical_expert = LockedPersonaInstructions(
        template=APPLICANT_TECHNICAL_EXPERT_PROMPT,
        fields=te_fields,
        pre_act_label="Technical-expert persona (applicant internal voice)",
    )

    paraphrase = ParaphrasedPrivateProfile(
        private_profile=scenario.private_profile,
        loss_rate=scenario.expertise_gap.paraphrase_loss_rate,
        seed_key_prefix=f"{scenario.scenario_id}|seed-{seed_index}",
        transport=transport,
        dry_run=dry_run,
        model=model_tier,
    )

    components: dict[str, entity_component.ContextComponent] = {
        "scenario": ScenarioContext(body=_scenario_context_body(scenario)),
        "contract_handler": contract_handler,
        "technical_expert": technical_expert,
        "private_profile_paraphrased": paraphrase,
        "__memory__": _make_memory_component(),
        "observation_to_memory": observation_component.ObservationToMemory(),
    }
    return entity_agent_with_logging.EntityAgentWithLogging(
        agent_name=agent_name,
        act_component=concat_act_component.ConcatActComponent(model=lm),
        context_components=components,
    )


# ────────────────────────────────────────────────────────────────────────
# Utility — two personas, no private profile
# ────────────────────────────────────────────────────────────────────────


def build_utility(
    *,
    scenario: ScenarioCard,
    transport: Transport,
    utility_name: str = DEFAULT_UTILITY_NAME,
    dry_run: bool = False,
    model_tier: str = USER_SIM_MODEL,
) -> entity_agent_with_logging.EntityAgentWithLogging:
    """Build the utility `EntityAgent` per §5b.

    Two locked-persona components (intake-engineer + planning-lead). No
    private-profile component — the utility plans from disclosed fields
    only. The §5b coordination-delay (intake → planning approval) is
    modeled at the GM level (step 4), not here.
    """
    lm = TransportLanguageModel(transport=transport, model=model_tier)
    agent_name = f"{utility_name} (utility)"

    intake = LockedPersonaInstructions(
        template=UTILITY_INTAKE_ENGINEER_PROMPT,
        fields={"utility_name": utility_name},
        pre_act_label="Intake-engineer persona (utility first-line)",
    )
    planning = LockedPersonaInstructions(
        template=UTILITY_PLANNING_LEAD_PROMPT,
        fields={"utility_name": utility_name},
        pre_act_label="Planning-lead persona (utility tier-routing authority)",
    )

    components: dict[str, entity_component.ContextComponent] = {
        "scenario": ScenarioContext(body=_scenario_context_body(scenario)),
        "intake_engineer": intake,
        "planning_lead": planning,
        "__memory__": _make_memory_component(),
        "observation_to_memory": observation_component.ObservationToMemory(),
    }
    return entity_agent_with_logging.EntityAgentWithLogging(
        agent_name=agent_name,
        act_component=concat_act_component.ConcatActComponent(model=lm),
        context_components=components,
    )


# ────────────────────────────────────────────────────────────────────────
# Regulator — single persona
# ────────────────────────────────────────────────────────────────────────


def build_regulator(
    *,
    scenario: ScenarioCard,
    transport: Transport,
    regulatory_body: str = DEFAULT_REGULATORY_BODY,
    dry_run: bool = False,
    model_tier: str = USER_SIM_MODEL,
) -> entity_agent_with_logging.EntityAgentWithLogging:
    """Build the regulator `EntityAgent` per §5c.

    Single persona; reads the bundle + audit chain + policy version.
    No private-profile component — regulator plans from policy-bound
    projection by construction.
    """
    lm = TransportLanguageModel(transport=transport, model=model_tier)
    agent_name = f"{regulatory_body} (regulator)"

    persona = LockedPersonaInstructions(
        template=REGULATOR_PROMPT,
        fields={"regulatory_body": regulatory_body},
        pre_act_label="Regulator persona (process-integrity reviewer)",
    )

    components: dict[str, entity_component.ContextComponent] = {
        "scenario": ScenarioContext(body=_scenario_context_body(scenario)),
        "regulator_persona": persona,
        "__memory__": _make_memory_component(),
        "observation_to_memory": observation_component.ObservationToMemory(),
    }
    return entity_agent_with_logging.EntityAgentWithLogging(
        agent_name=agent_name,
        act_component=concat_act_component.ConcatActComponent(model=lm),
        context_components=components,
    )
