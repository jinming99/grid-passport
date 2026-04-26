# GRID PASSPORT

### _Truth without disclosure._

```
        ┌───────────────────────────────┐
        │  ╔═══════════════════════════╗│
        │  ║   GRID · PASSPORT          ║│   "Ma'am, your bundle checks out.
        │  ║ ═════════════════════════  ║│    Ed25519 valid. Policy hash matches.
        │  ║   [ ●● ] SEALED [ ●● ]     ║│    Audit chain intact. Eight private
        │  ║                           ║│    fields sealed under policy §2.1.
        │  ║   policy@0.1.0            ║│    Projection clears — welcome through."
        │  ║   verified · keyId ed25   ║│
        │  ╚═══════════════════════════╝│        — the verifier, at the counter
        │    bundle v1.0.0 · JCS · Ed   │
        └───────────────────────────────┘
```

![license](https://img.shields.io/badge/license-AGPL%20v3-0a0a0a?style=flat-square&labelColor=262626)
![status](https://img.shields.io/badge/status-demo--ready-84cc16?style=flat-square&labelColor=262626)
![gates](https://img.shields.io/badge/canary-15%20%2F%2015-84cc16?style=flat-square&labelColor=262626)
![skills](https://img.shields.io/badge/skills-4%20%C3%97%202%20domains-38bdf8?style=flat-square&labelColor=262626)
![bundle](https://img.shields.io/badge/bundle-RFC%208785%20%2B%20Ed25519-38bdf8?style=flat-square&labelColor=262626)
![node](https://img.shields.io/badge/node-%E2%89%A520.19-262626?style=flat-square)
![tauri](https://img.shields.io/badge/tauri-2.10-ffc107?style=flat-square&labelColor=262626)

**Grid Passport** is a confidential-coordination workflow for large-load electric-grid interconnection. Applicants submit private load, site, and flexibility data into a **local** desktop app. The app runs a policy-bound projection in pure functions and emits a cryptographically signed disclosure bundle. Utilities verify it in a second standalone app and see only what policy releases — derived proofs, source-cited public evidence, sealed private counts.

No shared server. No API key. No trusted third party. The math is deterministic. The policy is the release surface. AI agents do elicitation, evidence fetching, and narration — never the safety-critical math.

> _The schema is the safety case._

---

## Why this exists

Data-center interconnection is stalled on information. Utilities can't commit capacity without seeing load and flexibility details that applicants can't share without leaking competitive intelligence. Regulators can't audit decisions they weren't in the room for. Today's tools — bilateral NDAs, redacted PDFs, third-party data rooms — trade one failure mode for another. We wanted the shape where none of the three stakeholders has to trust a fourth.

```
Owl Compute × same seed, NDA-email baseline vs Grid Passport:

NDA-email (condition B):       11 turns across 37 simulated days · raw fields leaked
Grid Passport (condition D):    7 turns across 10 simulated days · zero raw leaks
                                ─────────────────────────────────
                                3.7× fewer negotiation rounds
                                3.5× fewer simulated days
                                H-null privacy leakage: 0 vs multiple
```

_Pilot — n=1 per cell across three scenarios. Main sweep is budgeted but deferred. §9.1 pre-registered threshold `Rounds(D) ≤ 0.5 × Rounds(B)` cleared on all three scenarios._

---

## A day in the life

```
APPLICANT:   "180 MW training campus in Prince William, Virginia.
              60/40 training-to-inference. Scheduler confidence 0.62/0.48.
              Class B response. Two 10-MW backup gens. Target COD Q4 2028."

INTERVIEWER: [validator-gated Skill, Claude Code subprocess inheriting session auth]
             "Caught the structure. Writing privateProfile + requestMeta.
              Not touching derivedProof — not my write-scope."
             [3 seconds · $0.18 · CaseInput accepted]

CARTOGRAPHER:[public evidence — sources on whitelist or field stays null]
             "FEMA flood overlay · VA DEQ air-permit docket · county zoning.
              Three sourceRefs attached; no invention."

FORECAST:    [pure function · packages/core/src/forecast.ts]
             [firmnessScore: 59, flexibilityPassport: 32–44 MW · 3–4h · class B]
             "Tier bands assigned. No LLM call; deterministic under seed."

APPLICANT:   [reviews applicant | utility | regulator projections side-by-side]
             [TrustPanel: network·0 · inputs at chosen path · sealed·8 · raw released·0]
             [clicks "export bundle"]

BUNDLE:      [JCS-canonicalized · Ed25519-signed · hash-chained audit]
             [keychain-backed signer · key never crosses Tauri IPC boundary]
             [file on disk · crosses via whatever channel the humans already use]

UTILITY:     [separate Tauri binary — structurally cannot import private-bucket types]
             [drops bundle, verifier runs four checks, all pass]
             [renders utility-role projection — derived proofs + public evidence]
             [trust-claim card: network·0 · narrow imports · pubkey pinned]
             "Commitment received. Eight private fields sealed, none released.
              Same policy hash I expected. I can act on this."
```

---

## Quickstart

```sh
pnpm install
pnpm dev              # http://localhost:3000 — landing, /demo, /about, /technical, /protocol
pnpm demo:bundle      # 60-sec end-to-end: sign → verify TS → verify Python → tamper → reject
pnpm desktop:dev      # applicant Tauri window · port 1420
pnpm utility:dev      # utility Tauri window · port 1430
```

Prerequisites: Node ≥20.19, pnpm 10+, Rust toolchain, macOS/Windows/Linux. Claude Code CLI logged in if you want to exercise the live Interviewer/Explainer Skills (not required for the web demo, signed-bundle roundtrip, or utility verifier).

---

## Two binaries, zero servers

| | Applicant app (`apps/desktop/`) | Utility app (`apps/utility/`) |
|---|---|---|
| Job | Intake · project · sign · export | Verify · render · trust-claim |
| Private data? | In-process, sealed from non-applicant views | **Structurally cannot import** private-bucket types — gate 15 fails CI if it tries |
| Network? | Zero for projection + signing; `claude -p` subprocess for live Skills (optional) | Zero, always |
| Key material | Ed25519 private key in OS keychain · never crosses IPC | Public key pinned per counterparty |

---

## Receipts — the A/B, not a claim

Pilot (n=1 per cell · S1 Owl / S2 Lantern / S3 Kraken · conditions A / B / C / D · one seed · 12 cells):

| scenario | OPR Δ (D − B) | Savage regret (D, max) | H-null leakage (D) |
|---|---|---|---|
| S1 Owl — hyperscaler | **+0.328** ✓ clears +0.20 threshold | 0.00 (best) | 0 |
| S2 Lantern — cautious | +0.047 (flat) | 0.40 (ties B) | 0 |
| S3 Kraken — flex-forward | +0.194 (borderline) | 0.20 (ties C lowest) | 0 |

**Cross-family judge spot-check (P0.3).** Three cells re-judged with a different-family model (Sonnet vs Opus). No disagreement greater than one Likert across fifteen dimension-judgments. Sonnet never scores above Opus. Mean Δ ≈ −0.5 Likert. Rank ordering D > B preserved.

**Honest footprint.**
- n=1 per cell; directional, not replicable.
- S1 clears the pre-registered threshold. S2 flat. S3 borderline. Main sweep ($400–1200 SDK, 455 runs) is budgeted but deferred.
- C (mechanically-derived prompt-only baseline) is competitive with D on S2/S3 at n=1 — we engineered C to not be a strawman; the fair comparison is what produces this finding.
- Dominion has not formally reviewed the utility-side spec. Bhawuk Luthra (Dominion Energy · co-conceptualizer) has read. Handshake agenda is public: `docs/design/signed-bundle.md` §9.

Every number traces back to `packages/eval-sim/results/pilot/scores/` and `packages/eval-sim/results/pilot/manifest.json` in the repo. Re-verify yourself.

---

## What's under the hood

```
apps/
  web/          Next.js 16 + TS + Tailwind 4 — landing, /demo/[case], /about, /technical, /protocol
  desktop/      Tauri 2 applicant binary — local intake, projection, signed-bundle export
  utility/      Tauri 2 utility binary — verify, render, trust-claim card
  api/          FastAPI parity scaffold (Phase 2+)
  verifier-py/  30-line Python reference verifier (portability artifact)

packages/
  core/         Pure-TS schema · policy mirror · projection · forecast · audit · crypto
  verifier/     Zero-dep TS verifier + signer library (shared by desktop + utility)
  agents/       Skill validators + mechanically-derived prompt-only baselines (drift-gated)
  eval-sim/     Python multi-agent sim bench (Concordia-based · pre-registered)
  policy/       Canonical Rego (grid-passport.rego)

.claude/skills/ 4 shipping Skills: interviewer · cartographer · explainer · priorauth-interviewer
scripts/        demo-bundle-roundtrip.sh (sign → TS verify → Py verify → tamper → reject)
docs/           Design · research · plans · evaluation — all versioned with the code
```

15 canary gates on every commit — structural invariants, not unit tests. Privacy canary verifies TS policy ↔ Rego ↔ Python are drift-free. Utility canary asserts the utility binary's import graph cannot link private-bucket types. Bundle canary runs the sign / verify / tamper / reject roundtrip across TS + Rust + Python.

---

## Where the AI actually lives

Four Skills across two domains (grid + HIPAA) × two contract axes (write-scope + read-scope). Each has a `SKILL.md` auto-discovered by Claude Code, a paired CI validator, and a mechanically-derived prompt-only baseline with a content-hash drift gate.

| Skill | Domain | Contract | Writes | Reads |
|---|---|---|---|---|
| Interviewer | grid | write | `privateProfile`, `requestMeta` | applicant prose |
| Cartographer | grid | write | `publicEvidence` | `requestMeta.parcel` only |
| Explainer | grid | read | nothing | `ProjectedView` only |
| priorauth-Interviewer | HIPAA | write | PA-request schema | patient prose |

Uniform **−93.8% to −96.4% upfront context savings** versus the prompt-only baseline. Four to six "never" clauses, five to nine "halt" clauses, two to twelve explicit "refuse" rules per Skill. The write-scope contract is the research contribution — prose in `SKILL.md`, enforced at the CI validator, measured in `packages/agents/metrics.md`.

**Deliberately not AI**: projection · forecast · audit · signing · verification. Those are deterministic pure functions with unit tests. Agents propose; pure functions dispose.

---

## Read next

- [`docs/tech-overview.md`](docs/tech-overview.md) — 11-section technical tour · the doc to send a curious developer or utility reviewer.
- [`docs/plans/student-handoff.md`](docs/plans/student-handoff.md) — 30-min onboarding via seven Claude Code prompts · scope is absorb → rehearse → polish.
- [`docs/demo-casebook.md`](docs/demo-casebook.md) — eight case studies for eight killer moments; split into mechanism cases (A–F) and outcome cases (G–H).
- [`docs/hackathon-presentation.md`](docs/hackathon-presentation.md) — 10-min talk plan · 13-slide outline · 15-question Q&A bank · rehearsal checklist.
- [`docs/design/research-thesis.md`](docs/design/research-thesis.md) — four research claims · honest gap inventory.
- [`docs/design/signed-bundle.md`](docs/design/signed-bundle.md) — protocol rationale + threat model.
- [`docs/design/signed-bundle-spec.md`](docs/design/signed-bundle-spec.md) — RFC 2119 normative spec · canonical test vectors.
- [`docs/evals/sim-bench-design.md`](docs/evals/sim-bench-design.md) — pre-registration document · amendment discipline.
- [`docs/evals/sim-bench-results.md`](docs/evals/sim-bench-results.md) — what's measured · what's deferred.

---

## FAQ

**Q: Is this actually privacy-preserving, or just obscuring?**
The privacy canary runs on every commit. It structurally verifies no raw private field ever reaches a non-applicant projection, log, trace, or browser cache. Not a promise — a compile-time check. TS mirror ↔ Rego source ↔ Python reference all agree byte-for-byte.

**Q: Why should a utility accept a derived proof instead of demanding the raw premise?**
Honest answer: we don't know yet. Dominion hasn't formally reviewed. The thesis is that the combination of (policy-versioned hash + audit chain + three-way verifier parity) makes accepting a proof strictly more informative than accepting an NDA + redacted PDF. The Dominion handshake agenda is `docs/design/signed-bundle.md` §9.

**Q: Is the forecaster a real model?**
No. It's a deterministic toy with stylized tier bands. A production deployment replaces `forecast.ts` with a utility-calibrated model; the rest of the architecture is unchanged.

**Q: Is the TEE real?**
No. The confidential-compute boundary is the local process boundary. A production deployment that wanted attestable computation would swap the local binary for a GCP Confidential Space or Intel TDX VM running the same code. Documented as a pivot path in `docs/vision.md` §5.

**Q: What's the weirdest thing in the repo?**
The utility binary's import graph is a compile-time write-scope proof. Gate 15 (`pnpm canary:utility`) walks `apps/utility/src/` and fails CI if any file imports `@grid-passport/core/fixtures`, `forecast`, or `audit`. You cannot write code that silently reconstructs raw private fields on the utility side — you can't link against the types. The schema is the safety case.

---

## Team

- **Ming Jin** · faculty mentor · project lead (VT · ECE) · vision, design, foundation
- **Bhawuk Luthra** · co-conceptualizer · co-developer (Dominion Energy) · utility-side anchor
- **Vikrant Bhati** · co-developer

---

## Hackathon submission

This project is submitted to a Special Competitive Studies Project (SCSP) hackathon. Per the submission terms agreed at registration:

- The team retains ownership of the code and intellectual property created during the hackathon.
- SCSP receives a non-exclusive license to publish the work product.
- SCSP will publish the project metadata — title, description, tech stack, slide links, GitHub repository link, and participant names — on SCSP's GitHub in the event-specific repository.

**Submission metadata** (for SCSP's intake):

| Field | Value |
|---|---|
| Title | Grid Passport |
| One-line description | Confidential-coordination workflow for large-load electric-grid interconnection — applicants disclose only what policy releases; utilities verify a signed bundle locally; no shared server, no trusted third party. |
| Track | Electric Grid |
| Participants | Bhati, Vikrant · Luthra, Bhawuk |
| Faculty advisor | Ming Jin (Virginia Tech · ECE) |
| Tech stack | TypeScript · React 19 · Tauri 2 · Rust · Next.js 16 · Tailwind 4 · FastAPI · Python (uv) · OPA Rego · Ed25519 (`@noble/ed25519` + PyCA cryptography) · JCS (RFC 8785) · Claude Agent SDK · Concordia (multi-agent sim) · pnpm 10 monorepo |
| Datasets / APIs used | Synthetic interconnection-case fixtures, synthetic geo / corridor fixtures, and synthetic utility load fixtures committed in-repo; source-cited public evidence references from FEMA National Flood Hazard Layer, Virginia DEQ air-permit materials, Dominion Energy Facility Interconnection Requirements, Virginia SCC data-center initiatives materials, and Loudoun County zoning context; optional Claude Code / Claude Agent SDK transport for the Interviewer, Cartographer, and Explainer agent flows. |
| Repository | this GitHub repo (link as provided at submission time) |
| License | AGPL v3 — utility forks publish their changes |
| Slide deck | (linked at submission time) |
| Project category | AI agents · grid integration · privacy-preserving coordination · cryptographic disclosure protocols |

License: AGPL v3 — utility forks publish their changes. Trust-story alignment over adoption friction.

---

_Built for an AI-agent-era hackathon where the question was: can a Claude Code Skill be the primitive for a safety-critical workflow? The schema is the safety case. The agents propose. The math disposes._
