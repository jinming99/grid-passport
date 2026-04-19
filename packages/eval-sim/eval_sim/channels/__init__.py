"""Per-condition Concordia Game Masters — sim-bench-design.md §6.

One GM per condition. Wiring deferred to Week 2 per §12.2.
- `OracleChannelGM` (A) — shared-state; Cartographer reads cache; §6d
- `EmailChannelGM` (B) — typed Email / Meeting structs + archetype-specific
  failure-mode sampler + 3+-round meeting trigger; §6a
- `PromptOnlyBundleChannelGM` (C) — bundle + live Cartographer with
  hallucination risk; §6c
- `SkillBundleChannelGM` (D) — bundle + cached Cartographer + bounded-query
  channel; §6b + §6e
"""

__all__: list[str] = []
