# Grid Passport

**Truth without disclosure.**

Grid Passport is a confidential-coordination workflow for large-load electric-grid interconnection. Applicants submit private load / site / flexibility inputs into a **local** desktop app. The app runs a schema-bound projection in-process and emits a cryptographically **signed disclosure bundle**. Utilities verify the signature in a second standalone app and see only what policy releases — derived proofs, source-cited public evidence, and role-specific projections. Regulators see the audit trail.

No shared server. No trusted third party. No data collected by us. The math is deterministic and the policy is the release surface; AI agents do elicitation, evidence fetch, and narration — never the safety-critical math.

This repo is the hackathon prototype and ongoing research program. See [`docs/tech-overview.md`](docs/tech-overview.md) for the full technical story, [`docs/design/research-thesis.md`](docs/design/research-thesis.md) for the research claims, and [`docs/plans/student-handoff.md`](docs/plans/student-handoff.md) if you're new to the repo.

---

## What's in the repo

```
grid-passport/
├── apps/
│   ├── web/            Next.js 16 + TS + Tailwind 4 — public landing, 3 case demos, /about, /technical, /protocol
│   ├── desktop/        Tauri 2 applicant binary — local intake, policy-bound projection, signed-bundle export
│   ├── utility/        Tauri 2 utility binary — drop-in verify, utility-role projection, trust-claim card
│   ├── api/            FastAPI parity scaffold (Phase 2+ target, not on hot path)
│   └── verifier-py/    Standalone Python reference verifier (portability artifact)
├── packages/
│   ├── core/           Pure-TS schema · policy mirror · projection · forecast · audit · crypto primitives
│   ├── verifier/       Zero-dep TS verifier + signer library shared by desktop + utility
│   ├── agents/         Interviewer / Cartographer / Explainer Skill validators + prompt-only baselines
│   ├── eval-sim/       Python multi-agent simulation bench (Concordia-based) — pre-registered eval harness
│   └── policy/         Canonical Rego policy (grid-passport.rego)
├── .claude/skills/     4 shipping Skills: interviewer, cartographer, explainer, priorauth-interviewer
├── docs/               Design · research · plans · evaluation — all versioned with the code
├── scripts/            demo-bundle-roundtrip.sh (sign → verify TS + Py → tamper → reject)
└── grid-passport-harness/   Original spec documents + subagent prompts (historical)
```

## Live surfaces

| Surface | URL / command | What you see |
|---|---|---|
| Public landing | `pnpm dev` → http://localhost:3000 | Problem hero · live BenefitPanel teaser · 3 case studies · crew · desktop CTA |
| Three demo walkthroughs | `/demo/owl-compute` · `/demo/lantern-cloud` · `/demo/kraken-train` | Role toggle (applicant / utility / regulator) · counterfactual slider · MapLibre evidence panel · signed audit trail |
| Story page | `/about` | Long-scroll narrative rendered from `docs/story.md`; carries the pilot OPR numbers (§6) + signed-bundle canary telltale |
| Protocol page | `/protocol` | Threat model · primitives · verify-it-yourself commands |
| Technical deep-dive | `/technical` | Architecture, privacy mechanism, Skills + write-scope contracts — rendered from `docs/tech-overview.md` |
| Applicant desktop app | `pnpm desktop:dev` (dev) or `pnpm desktop:build` → DMG | Load case from disk or intake prose via Interviewer Skill · side-by-side review · TrustPanel · export signed bundle |
| Utility desktop app | `pnpm utility:dev` (dev) or `pnpm utility:build` → DMG | Paste trusted applicant pubkey · drop in a bundle · verifier runs · utility-role projection renders · trust-claim card |
| Bundle roundtrip demo | `pnpm demo:bundle` | Signs owl-compute · verifies TS · verifies Python · tampers one byte · both reject |

## Prerequisites

- **Node 20+**, **pnpm 10+** (via `corepack enable pnpm`)
- **Rust toolchain + `rust-analyzer`** (for Tauri apps; `rustup component add rust-analyzer`)
- **Python 3.12+** + **uv** (only if you touch `apps/api/` or `packages/eval-sim/`)
- **Claude Code CLI** installed + logged in (only needed for live Interviewer / Explainer Skill transport from inside the desktop app)

## Install + run

```sh
# one-time
pnpm install

# web demo
pnpm dev                    # http://localhost:3000

# desktop applicant app
pnpm desktop:dev            # Tauri window · port 1420 · hot reload
pnpm desktop:build          # produces src-tauri/target/release/bundle/*.dmg (macOS)

# utility verifier app
pnpm utility:dev            # Tauri window · port 1430 · hot reload
pnpm utility:build          # produces src-tauri/target/release/bundle/*.dmg (macOS)

# signed-bundle end-to-end demo
pnpm demo:bundle            # sign → verify TS → verify Py → tamper → reject
```

## The 15 canary gates

Every commit is verified against 15 gates. Green on all = the tree is in a demo-able state.

```sh
pnpm typecheck              && \
pnpm privacy:canary         && \
pnpm desktop:typecheck      && \
pnpm canary:desktop         && \
pnpm utility:typecheck      && \
pnpm canary:utility         && \
pnpm core:test              && \
pnpm verifier:test          && \
pnpm canary:bundle          && \
pnpm canary:roundtrip       && \
pnpm desktop:test           && \
pnpm agents:typecheck       && \
pnpm agents:validate        && \
pnpm agents:baseline:check  && \
pnpm agents:metrics:check
```

Each gate is a **structural invariant**, not a unit test:

| Gate | Enforces |
|---|---|
| `privacy:canary` | TS policy ↔ Rego ↔ Python policy drift-free; structural scan asserts no raw private field ever reaches non-applicant HTML / logs / traces |
| `canary:desktop` | Applicant binary imports core pure-functions (no projection duplication); 3 cases × 3 roles release-count invariants hold; Interviewer intake path reaches validator |
| `canary:utility` | Utility binary's import graph **cannot** pull `@grid-passport/core/{fixtures,forecast,audit}` (write-scope enforced at compile time); sign+verify+tamper+reject roundtrip passes |
| `core:test` | 57 unit tests: schema round-trips, quantized firmness, hash-chained audit integrity, per-actor policy-version binding |
| `verifier:test` | TS verifier passes 10 targeted tamper cases + 2000-iteration fuzz |
| `canary:roundtrip` | 3-way TS ↔ Rust ↔ Python parity on signed bundles |
| `agents:validate` | Interviewer / Cartographer / Explainer CI validators reject their 3–4 contract-violation self-tests each |
| `agents:baseline:check` | Mechanically-derived prompt-only baseline files are content-hash-gated; drift fails CI |
| `agents:metrics:check` | Substrate-metrics panel (`packages/agents/metrics.md`) auto-generated from Skill source; drift fails CI |

## How to navigate the docs

Read in this order if you're new:

1. [`docs/tech-overview.md`](docs/tech-overview.md) — the technical innovation story, written for anyone (developer, utility reviewer, research panel)
2. [`docs/vision.md`](docs/vision.md) — why this shape; §4b is the 5-test filter every new `CaseInput` field passes through
3. [`docs/design/research-thesis.md`](docs/design/research-thesis.md) — the four research claims and the honest gap inventory (§7)
4. [`docs/design/signed-bundle.md`](docs/design/signed-bundle.md) + [`docs/design/signed-bundle-spec.md`](docs/design/signed-bundle-spec.md) — threat model, protocol, canonical test vectors
5. [`docs/evals/sim-bench-design.md`](docs/evals/sim-bench-design.md) — pre-registered eval harness (Concordia-based, 4 conditions × 7 scenarios × 5 seeds)
6. [`docs/evals/sim-bench-results.md`](docs/evals/sim-bench-results.md) — what's measured so far (12-subset pilot)
7. [`docs/plans/handoff.md`](docs/plans/handoff.md) — current state, decisions, what's next
8. [`docs/plans/roadmap.md`](docs/plans/roadmap.md) — the build queue
9. [`docs/plans/student-handoff.md`](docs/plans/student-handoff.md) — hackathon-ready onboarding: seven Claude Code prompts you paste in order, no commands to run, scope is "absorb, rehearse, polish" — not research. Start here if you are new to the team.
10. [`docs/demo-casebook.md`](docs/demo-casebook.md) — eight case studies mapped to eight "killer moments" (sealed/released toggle, two-binary handshake, tamper reject, Skill contract refusal, cross-domain transfer, efficiency delta, outcome-preservation evidence, honest limits). Each case has pre-flight commands, step-by-step demo flow, expected observations, and a reproducible Claude Code prompt.
11. [`docs/hackathon-presentation.md`](docs/hackathon-presentation.md) — 10-minute talk plan + 13-slide outline + two demo scripts + 15-question Q&A bank + rehearsal checklist.

## Honest limits

- **n=1 per cell on the sim-bench.** Pilot is directional. S1 clears the pre-registered +0.20 OPR threshold; S2/S3 are borderline. Main sweep (455 runs, ~$400–1200 SDK) is deferred.
- **Forecaster is a deterministic toy.** Firmness / flexibility bands are stylized; the MOSAIC-aligned response class ladder is a stylization, not the official classification.
- **TEE is simulated.** The confidential-compute boundary is the local process boundary, not Intel TDX / AMD SEV / GCP Confidential Space. Pivot path to real TEE is documented in `docs/vision.md` §5.
- **Dominion has not reviewed the utility-side spec.** Bhawuk's intro is the gating step; see `docs/design/signed-bundle.md` §9 for the handshake agenda.
- **Referee cross-check Skill is unshipped.** Non-amplification (the §3.2 research claim) is the hypothesis; the verifiable-field cross-check is a student spec at `docs/evals/specs/P1_3-cross-check-referee-skill.md`.

All numbers on the web demo are synthetic. The policy-governed release layer is real.

## License

AGPL v3 — utility forks must publish their changes. Trust-story alignment over adoption friction.

## Team

- **Ming Jin** — faculty mentor, project lead (VT · ECE). Vision, design, foundation.
- **Bhawuk Luthra** — co-conceptualizer, co-developer (Dominion Energy). Utility-side anchor.
- **Vikrant Bhati** — co-developer (hackathon).
