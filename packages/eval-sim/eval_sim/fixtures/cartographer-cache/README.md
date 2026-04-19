# Cartographer cache fixtures

One JSON file per scenario (`{scenario_id}.json`), SHA-256 hashed and
committed. See `../../../../../docs/evals/sim-bench-design.md` §6e for the
cache protocol.

**Filled by a single live Cartographer run per scenario in Week 2.** Until
then, each scenario's `ScenarioCard.public_evidence_cache_path` points at
the eventual file; the runner will fail loudly if the file is missing.

The §6e fairness pilot runs a 3-seed check on S1/S3/S7 where both C and D
hit the live SDK — no cache for either — to isolate the packaging-effect
vs validator-effect (see §8d decomposition table).
