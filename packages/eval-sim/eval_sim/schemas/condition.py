"""Experimental-condition enum (sim-bench-design.md §4)."""

from __future__ import annotations

from enum import StrEnum


class Condition(StrEnum):
    """Four experimental conditions — §4 of the bench doc.

    Identity of each:
    - A = Oracle (EVPI reference strategy; shared state; Opus 4.7; §4.1)
    - B = NDA-email baseline (status quo; archetype-specific failure modes +
      3+-round meeting trigger; §4.2 + §6a)
    - C = Prompt-only AI agent (mechanically-derived flat prompt; live
      Cartographer with hallucination risk; Opus 4.7; §4.3 + §6c)
    - D = Grid Passport (Skill substrate + signed bundle + bounded-query
      channel; Cartographer cache shared with A; Opus 4.7; §4.4 + §6b)

    The research claim is scoped per §1.2 to the (C vs D) substrate-
    isolation axis with identical mechanically-derived content. A and B
    are the EVPI reference (upper bound) and status-quo lower bound.
    """

    A_ORACLE = "A"
    B_NDA_EMAIL = "B"
    C_PROMPT_ONLY = "C"
    D_GRID_PASSPORT = "D"

    @property
    def label(self) -> str:
        return {
            Condition.A_ORACLE: "Oracle",
            Condition.B_NDA_EMAIL: "NDA-email",
            Condition.C_PROMPT_ONLY: "Prompt-only",
            Condition.D_GRID_PASSPORT: "Grid Passport",
        }[self]
