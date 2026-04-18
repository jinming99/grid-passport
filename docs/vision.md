# Grid Passport — Vision and Design

> The thing this product is, written so future-us doesn't drift away from why we built it.

This doc is the durable record of the **big-picture vision** and the
**design choices** that flow from it. Everything tactical lives in
`docs/plans/handoff.md`; the privacy mechanism case lives in
`docs/privacy-claim.md`; the AI-agent architecture and research
connection live in `docs/agents.md`; this doc is the *why* underneath
all of them.

If you read only one section, read **§5 — The trust pivot**. It's the
architectural decision everything else hangs on.

---

## 0. Team and origins

Grid Passport was started by a team that combines academic foundation
work with direct industry context.

- **Ming Jin** — faculty mentor and project lead. Built the foundation of the project, the design principles, and the vision. Research agenda focuses on calibrating agent skills for alignment with workflow, human preferences, and domain specifications (see `docs/agents.md` §6).
- **Bhawuk Luthra** — student and Dominion Energy employee. Proposed and co-conceptualized the problem and the solution shape; brings the utility-side perspective that makes the case studies grounded in real interconnection workflow. Co-developing the platform; participating in the hackathon.
- **Vikrant Bhati** — co-developer and hackathon participant.

That second name is load-bearing for the credibility story. Bhawuk's
Dominion Energy affiliation means the case studies (Owl Compute,
Lantern Cloud, Kraken Train — all in Dominion territory) are not
guesses about how a utility thinks; they are informed by someone whose
day job is inside one. The utility-side framing in §1 ("won't share
what they don't legally need to take custody of") comes from that
proximity, not from desk research.

---

## 1. The problem we're solving

There is a widening gap between two clocks.

- **AI compute demand is doubling fast.** Hyperscalers and AI tenants are filing interconnection requests at unprecedented scale: [Dominion alone has ~70 GW of new demand in its queue](https://www.datacenterdynamics.com/en/news/dominion-files-large-load-connection-queue-plan-with-state-regulators/) as of early 2026; [JLARC projects Virginia's electricity demand will double within a decade](https://jlarc.virginia.gov/landing-2024-data-centers-in-virginia.asp), with data centers as the primary driver.
- **Power infrastructure scales slowly.** New transmission takes 7–15 years; new generation 4–10 years; permitting overlays (DEQ Tier-2 reviews, Loudoun special-exception hearings) add quarters per gate.

The mismatch creates an urgent need for **coordination and alignment**
across three stakeholder groups whose interests are real, legitimate,
and partially in tension:

| Stakeholder      | Wants                                                                                        | Won't share                                                  |
| ---------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| AI tenant / hyperscaler | Fast interconnection slot; ability to commit flexibility for better treatment.               | Workload mix, training/inference ratio, internal roadmap confidence, BESS sizing. Competitive intelligence.   |
| Utility (Dominion, etc.)| Plan generation, transmission, and queue triage with confidence. Reduce stranded studies.   | Whatever they don't legally need to take custody of (it becomes a CEII handling burden). |
| Regulator (SCC, FERC, JLARC)| Accountability for rate-payer impact and grid reliability; visibility into the *process* of decisions. | They don't want to take custody of competitive data either; they want to verify the workflow.|

When the three can't share information cleanly, the result is the
status quo: queues fill with speculative projects, utilities hedge with
oversized infrastructure, regulators legislate blunt rate-class rules
([SCC's GS-5 ruling, Nov 2025](https://insideclimatenews.org/news/07012026/virginia-regulators-approve-new-dominion-rates/)), and applicants negotiate one-off NDAs in
[~25 of 31 Virginia localities](https://www.nbcnews.com/tech/tech-news/data-center-ai-google-amazon-nda-non-disclosure-agreement-colossus-rcna236423) instead of using a shared protocol.

The bottleneck is not raw compute or raw generation. It is **information
flow under privacy and competitive constraints**.

---

## 2. The barrier — information asymmetry

The reason coordination doesn't happen smoothly today is structural.

Each party holds information the others would benefit from seeing, and
each has principled reasons to withhold it:

- The applicant's flex %, schedule confidence, and workload mix are competitive. Sharing them with a utility that also serves competitor tenants is a real exposure — that's why Microsoft, Amazon, and Google routinely require [NDAs even with the local government](https://www.nbcnews.com/tech/tech-news/data-center-ai-google-amazon-nda-non-disclosure-agreement-colossus-rcna236423).
- The utility's internal capacity reservations, contingency plans, and queue priorities are CEII (Critical Energy Infrastructure Information) and can't be shared with applicants without compromising grid security.
- The regulator's enforcement priorities are policy-sensitive and not appropriate to share laterally with utilities.

The current bridges are fragile:

| Existing practice      | What it gets right                                       | Where it fails                                                                                                                                         |
| ---------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **NDAs**               | Legal accountability if a leak happens.                  | No technical enforcement; raw fields end up in utility databases, internal email, quarterly reports. [Microsoft is publicly backing away from NDA-only practice](https://www.datacenterdynamics.com/en/news/microsoft-swears-off-ndas-for-data-center-projects/); the regulator gets zero visibility into what was redacted. |
| **Redacted PDFs**      | Familiar; works with existing email workflows.           | Manual redaction is famously incomplete (Acrobat redactions leak via revision history; metadata exposes prior versions). No mechanical guarantee.       |
| **Pre-redaction by submitter** | The applicant retains full control of the disclosure decision. | Asymmetric — the utility doesn't know what was hidden, can't compare two requests that redacted differently, can't verify the derivation is trustworthy. No shared schema. |
| **Verbal updates / phone calls** | High bandwidth, low friction.                       | No audit trail, no policy versioning, no mechanism for the regulator to verify what was actually disclosed.                                           |

Each existing practice solves part of the problem. None of them is a
**workflow primitive** that lets every party act on consistent
information without exposing the inputs they're entitled to keep.

---

## 3. Why now

The timing isn't accidental. Multiple parties are publicly trying to
solve adjacent pieces of this problem in 2025–2026:

| Signal                                                      | When                | What it means                                                                                              |
| ----------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| Dominion's [4-stage large-load queue plan](https://www.datacenterdynamics.com/en/news/dominion-files-large-load-connection-queue-plan-with-state-regulators/) | Jan 2026            | Utility-side process redesign for ≥100 MW loads; explicitly demands more rigorous disclosure at each gate.  |
| [FERC orders PJM to file co-located load rules](https://www.bakerbotts.com/thought-leadership/publications/2025/december/ferc-issues-order-providing-guidance-for-co-locating-power-plants-with-data-centers-within-pjm) | Dec 2025 → Feb 2026 | Federal-level rulemaking; the procedural envelope is being rebuilt right now.                              |
| [Virginia SCC GS-5 rate class](https://www.americanactionforum.org/insight/virginias-new-data-center-electricity-rate-class/) | Nov 2025            | Forces large loads to pay 85% of T&D and 60% of generation capacity; raises the cost of disclosure mistakes. |
| [EPRI Flex MOSAIC framework launch](https://dcflex.epri.com/flex-mosaic)         | Mar 2026            | 65+ utilities, hyperscalers, regulators agreed on a *shared classification* for large-load flexibility.    |
| [Google 1 GW demand response milestone](https://blog.google/innovation-and-ai/infrastructure-and-cloud/global-network/demand-response-data-center-milestone/)| Mar 2026            | Hyperscalers actively want to commit flexibility; need a credible way to convey it without exposing roadmap. |
| [Microsoft anti-NDA pivot](https://www.datacenterdynamics.com/en/news/microsoft-swears-off-ndas-for-data-center-projects/) | 2025–2026           | The biggest practitioner is publicly admitting NDAs are not the right primary tool.                        |

Each of these is a partial answer. None of them is a workflow-level
disclosure primitive. **That's the seam Grid Passport sits in.**

---

## 4. The solution shape

The core mechanism is **policy-governed projection** (mechanism details
in `docs/privacy-claim.md`):

1. Every field that enters the system is classified once: `public`, `private`, or `derived`.
2. A pure projection function turns a request into a role-appropriate view; raw `private` fields are replaced with `null` plus a redaction reason for any role not authorized to see them.
3. `derived` fields are computed by a versioned function from raw inputs; the policy explicitly releases them.
4. Every action is hash-anchored and policy-versioned for an audit chain a regulator can verify *without* taking custody of raw inputs.

That's the substrate. The architecture decision in §5 is what makes it
trustworthy at scale.

---

## 5. The trust pivot — local-first, applicant as gatekeeper

> This is the load-bearing decision. Everything below flows from it.

### The problem with the obvious architecture

The obvious version of Grid Passport is a **hosted service** — the
applicant submits raw data to grid-passport.com, our server runs the
projection, and the utility/regulator query our API. This is what the
current web demo simulates.

This architecture has a fatal trust problem: *we are claiming to be the
neutral third party that holds everyone's data*. No hyperscaler is
going to upload their workload mix to a startup's hosted service; no
utility is going to route their queue triage through someone else's
SaaS. Every conversation ends with "and how do we trust you with the
raw data?" — and there is no satisfying answer for an early-stage
project.

You can paper over this with a TEE (`Confidential Space`, Nitro
Enclaves) — and we *can* make it real, see §11 — but TEEs are an
implementation substrate, not a trust story. They answer "the cloud
admin can't read memory"; they don't answer "we, the startup, won't
pivot, get acquired, get subpoena'd, or quietly change our terms."

The trust problem isn't technical. It's structural.

### The pivot: local-first

**Move the projection to the applicant's machine.** Specifically:

- Grid Passport is distributed as a **local desktop application** (Tauri or Electron — Tauri preferred for binary size and Rust core), not a hosted service.
- The applicant installs it. They open their raw inputs *locally*. They see exactly what the projection produces — for the utility view, for the regulator view, for any future role.
- They review the projection in their own UI. **Nothing leaves the laptop until they explicitly export.**
- What they export is a signed bundle: the projected view + the audit chain + the policy hash. Raw private inputs never leave.
- The utility receives the bundle through their existing intake (Dominion's Delivery Point Exchange platform, email, portal — whatever they use today). The utility's tool verifies the signature and the policy hash, then ingests the projection.
- The regulator's view is the same bundle plus the visibility metadata; they don't even need a separate channel.

### What this changes

| Question                                          | Hosted-service answer                                  | Local-first answer                                                                  |
| ------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| "Why do I trust *you* with my data?"              | TEE attestation, audits, certifications. Slow, weak.   | **You don't have to. The data never leaves your machine.**                           |
| "What if you change your privacy policy?"         | Trust + legal recourse.                                | Irrelevant — we don't have your data.                                               |
| "What if you get subpoena'd?"                     | We'd produce what's in our DB.                         | We have nothing to produce.                                                         |
| "What about the utility — do *they* trust this?"  | They trust our backend.                                | They verify a signed bundle against a published policy hash. No service trust needed. |
| "How does the regulator verify?"                  | Audit our service.                                     | Audit the policy file (it's open-source) and the signed bundles.                    |
| "Where does the TEE fit?"                         | Critical — protects the host server.                   | Optional — only relevant for utility-side delegated verification, not core path.     |
| "What about NDAs?"                                | The tool tries to replace them.                        | NDAs sit *on top of* the tool. They cover liability if disclosure fails; the tool reduces the surface where failure is possible. They compose. |

### Architecture under local-first

```
┌─────────────────────────────────────────────────────────────┐
│  Applicant's machine                                         │
│                                                              │
│   Raw private inputs ──┐                                     │
│                        │                                     │
│   Public evidence ─────┼──► Grid Passport local app          │
│                        │     (projection · forecaster ·       │
│                        │      audit · policy enforcement)    │
│                        │                                     │
│   ┌────────────────────▼──────────────────────────┐         │
│   │  Applicant reviews projections side-by-side:   │         │
│   │   · what utility will see                      │         │
│   │   · what regulator will see                    │         │
│   │   · what's sealed                              │         │
│   └────────────────────┬──────────────────────────┘         │
│                        │                                     │
│                        ▼                                     │
│             Signed disclosure bundle                         │
│             (projection + audit + policy hash)               │
└─────────────────────────────┬───────────────────────────────┘
                              │  applicant explicitly exports
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Existing utility intake (Dominion DPE, email, portal)       │
│  Verifies signature + policy hash.                          │
│  Renders the utility projection — never sees raw inputs.    │
└─────────────────────────────────────────────────────────────┘

Regulator views the same signed bundle through their existing channels.
Policy file is published openly; verification is public-key crypto.
```

The web demo at `https://grid-passport.vercel.app` is **a teaching
artifact** — it lets a stage audience see all three projections of the
same case in one browser. The production form is the desktop app.

### NDA composition, explicitly

NDAs are not the enemy. They are the *liability backstop*:

- The local app reduces the surface where unintended disclosure can happen at all.
- The NDA still governs what happens if it does.
- Together they're stronger than either alone.

Grid Passport doesn't replace the NDA conversation between hyperscaler
and utility. It makes that conversation shorter, because most of what
the NDA used to need to cover is no longer in scope.

---

## 5b. The reliability triad — how we answer "but what if the AI hallucinates?"

The local-first pivot answers the *who has the data* question. The
reliability triad answers the *what if the agent misbehaves* question.
Three structural properties, each testable independently of model
behavior. This is the framing for the talk and the website.

**Auditable.** Every action in the system is content-addressed (sha-256 of request, evidence, proof) and tagged with a policy version. Every audit event records actor, reason code, deterministic timestamp anchor. A regulator presented with a signed bundle and the open-source policy file can verify the projection released matches what the policy mandates — without any third-party service. Auditability is not a logging strategy; it is a property of the wire format.

**Constrained.** The projection layer is a pure function from `(policy, request, role)` to `ProjectedView`. Implemented in `packages/core/src/projection.ts`, mirrored in Rego, verified by `pnpm privacy:canary` on every commit. There is no path through the system where a private field reaches a non-applicant projection. Agents that produce outputs feed *into* this layer; they cannot bypass it. The architecture makes the failure mode unrepresentable. This is the answer to "what if the model hallucinates?" — it doesn't matter; structure forbids it.

**Calibratable.** Each AI agent ships as a [Claude Agent Skill](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) — a filesystem directory with explicit `SKILL.md` constraints. Skills are *inspectable* (markdown, not weights), *versionable* (compare two versions on the same eval), and *progressively-disclosed* (light context cost). Calibration along three named dimensions — workflow alignment, human-preference alignment, domain-spec compliance — is empirically tractable. See `docs/agents.md` §6 for the full framework.

The triad is what makes the system *reliable* in a way that is
defensible to a sophisticated audience. Each property is mechanically
checkable; none requires us to "trust the model."

---

## 5c. The fourth property — agents propose, humans dispose

The triad answers the model-reliability question. It does not answer
the *workflow* question of who decides. **No agent in Grid Passport
autonomously releases data.**

Every agent action — Interviewer parsing prose into `CaseInput`,
Cartographer fetching public evidence, Notary computing audit anchors,
Explainer narrating projections — surfaces a *proposal* to the
applicant. The applicant reviews, accepts, edits, or rejects. The
export step is always a human-confirmed click; no agent presses it.

This is the human-AI collaboration model, encoded as a design
constraint:

- Agents are not given authority. They are given a job: propose well-formed structured outputs the human can accept quickly when they are right and reject cheaply when they are wrong.
- The reliability of the agent layer is judged on how well it accelerates the human's confirmation, not on whether it can take actions independently.
- The closest analog from a different domain: tax-preparation software. The local app fills out your return; you review every line; you press the file button. Grid Passport applies the same shape to a higher-stakes multi-stakeholder workflow.

Why this matters for the talk: "agents propose, humans dispose" is the
sound-bite version of the design. It defuses the most common
skepticism about agent-driven systems ("but what if the AI takes a
wrong action?") by making the answer structural — the AI doesn't take
actions, it produces candidate outputs that the human commits.

For the agent-layer details, see `docs/agents.md`. For the talk-arc
narrative that uses these framings end-to-end, see `docs/story.md`.

---

## 6. Analogies from other industries

Local-first, third-party-protocol-not-third-party-custodian is not a
new pattern. We're applying a known shape:

| Industry                  | Pattern                                                                                  | What it solves                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Tax preparation (US)**  | IRS-approved local software (TurboTax, FreeFile Fillable Forms) computes returns on the user's machine; only the filed return touches IRS infrastructure. | User trusts the protocol (the IRS-published schema), not the vendor's servers, with raw financial data. |
| **E-discovery**           | Litigation-support tools (Relativity, Reveal) run inside the law firm's perimeter; vendor never sees the raw documents. | Privilege is preserved without the vendor becoming a trusted custodian. |
| **PGP / S/MIME email**    | Encryption happens at the endpoint; the mail server is a transport, not a custodian.    | "The provider can't read your mail" is a structural property, not a promise. |
| **Sealed-bid auctions**   | Bidders commit to a hash of their bid before reveal; auctioneer never sees bids prematurely. | Removes the auctioneer's ability to leak or front-run.                |
| **SWIFT (interbank messaging)** | Member banks run software that produces compliant messages; SWIFT routes them; the network operator doesn't hold the underlying transactions. | Trusted protocol with no central custodian of the substantive data.  |
| **Open-banking PSD2 (EU)** | The bank holds the data; the third-party app gets a scoped, time-bounded, user-authorized projection. | User stays the gatekeeper; app gets only what's needed for the stated purpose. |

Grid Passport is the same structural move: **protocol, not custodian**.
The applicant is to disclosure-of-private-load-data what the taxpayer is
to disclosure-of-financial-data.

---

## 7. Business model

The product can be packaged in three ways. Listing them with
tradeoffs; the durable answer probably combines (a) and (c).

**(a) Utility-distributed.** The utility (Dominion, Tennessee Valley
Authority, etc.) licenses Grid Passport and *gives it to applicants* as
part of the queue intake. The utility pays for the license; applicants
get a polished tool free. This is the cleanest distribution model: it
matches the Dominion DPE rollout, it gives the utility a reason to
adopt (queue triage gets cheaper), and it sidesteps the
"who's-our-customer" question for the small-applicant case.

- **Pros:** Single buyer per region; aligns with utilities' need to triage 70 GW queues; rides the Dominion/PJM compliance timeline.
- **Cons:** Long sales cycle; utility regulatory approval may be needed; one cancellation = lose a region.

**(b) Per-applicant custom engagements.** A hyperscaler asks for a
customized version that integrates with their internal data systems
(DCIM, capacity-planning tools). High-touch consulting model.

- **Pros:** Higher revenue per engagement; deep relationships.
- **Cons:** Doesn't scale; conflicts with the open-protocol pitch; two custom forks become a maintenance disaster.

**(c) Open-source core, hosted regulator/utility add-ons.** The local
app is open source. Anyone can install it. Revenue comes from
regulator/utility hosted services that *receive and verify* bundles —
dashboards, queue management, comparative analytics across applicants.

- **Pros:** Maximum trust (the applicant tool is auditable code); revenue from the side of the market that wants aggregation; aligns with EPRI/SCC's preference for open standards.
- **Cons:** Open-source pricing is hard; competing tools could fork.

**Likely target market is small.** There are maybe 30–50 utilities in
the US that handle large-load interconnection at meaningful scale; PJM,
ERCOT, MISO, CAISO, and a handful of vertically-integrated utilities
(Dominion, Duke, Southern, TVA). The hyperscaler side is even more
concentrated — perhaps 6–10 buyers (the big three clouds plus Meta,
Apple, Oracle, ByteDance, Tencent for international). This is a niche
B2B/B2G product with high deal sizes, not a SaaS volume play.

**My current recommendation:** start with (c). Open-source the
applicant tool early — it's the trust story. Sell utility-side
verification and regulator-side dashboards. Avoid (b) until the open
protocol is established.

---

## 8. Pain-point scenarios

Each of our three case studies maps to a pain pattern that's real in
the field today.

### 8a. Owl Compute — hyperscaler vs. roadmap exposure

**Pain:** A 180 MW hyperscaler campus needs an interconnection slot in
Prince William County. To get into a fast tier, they need to demonstrate
firmness and some flexibility. But sharing the underlying inputs —
internal schedule confidence, training/inference mix, BESS sizing —
exposes competitive intelligence to a utility that also serves their
direct competitors.

**Today:** They negotiate an NDA; share a redacted PDF that omits the
sensitive fields; the utility makes a more conservative siting decision
because they don't see firmness; the project gets a slower slot or a
larger contingency.

**With Grid Passport:** The applicant runs the local tool, exports a
signed bundle containing `firmnessScore: 59`, `flexibilityPassport:
32–44 MW · 3–4h · class B`, `energizationBand: Q3 2028 – Q1 2029`. The
utility makes the same decision they would have with raw data, faster.
The regulator can audit the policy version that produced the
projection. The hyperscaler's roadmap stays sealed.

### 8b. Lantern Cloud — applicant in genuine trouble

**Pain:** A 95 MW build in Loudoun County (which since [March 2025
no longer permits by-right data center development](https://www.hklaw.com/en/insights/publications/2025/04/loudoun-county-virginia-eliminates-by-right-data-center-development))
has unrecorded site control and a Tier-2 air permit pending.
Applicant's options today: (i) over-disclose and look bad; (ii)
under-disclose and get rejected later; (iii) negotiate informally and
hope.

**Today:** Lots of phone calls. Utility might pull the application or
quietly de-prioritize it. Regulator has no visibility into the
disposition — "informally not progressing" doesn't show up in any docket.

**With Grid Passport:** The local tool surfaces the actual blockers:
`siteReadinessClass: yellow`, `topBlockers: ["Generator fleet
permitting complexity", "Site plan maturity below threshold for
fast-track interconnection study"]`. The applicant sees this *before
they submit* — they can choose to delay, fix, or proceed knowing the
likely outcome. The utility receives a signed projection that already
reflects the blockers. The regulator sees that the policy correctly
identified the pre-existing issues; the rejection (if it happens) is
attributable to the blockers, not to discretionary triage.

### 8c. Kraken Train — flexibility commitment without exposure

**Pain:** A 240 MW AI training campus in Fauquier County is willing to
commit aggressive demand response — 34% deferrable workload — but the
underlying capability rests on shifting training jobs across regions,
which is exactly the kind of operational detail they don't want
disclosed. Without a credible commitment they can't access faster
interconnection (the new EPRI Flex MOSAIC framework is built around
exactly this kind of commitment).

**Today:** The applicant can either (i) hand-wave a flexibility number
in a one-page summary (utility doesn't trust it) or (ii) share the
underlying scheduler architecture (competitive disclosure they won't
make).

**With Grid Passport:** The local tool produces a `flexibilityPassport`
that conforms to (a stylized version of) Flex MOSAIC: `mwMin: 67,
mwMax: 91, durationHoursMin: 3, durationHoursMax: 4, responseClass:
"B"`. The utility receives a credible, policy-anchored commitment in a
shared schema; the underlying scheduler stays sealed; the applicant gets
the faster slot.

---

## 9. Benefit metrics

Concrete numbers anchor the pitch. These are **simulated** numbers
grounded in published industry data; the demo should label them as
"illustrative" but the framing is real.

| Metric                                       | Without Grid Passport (industry baseline)                                                                         | With Grid Passport                                                  | Grounding                                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Raw competitive fields exposed per request   | 6 of 18 (workload mix, schedule confidence, redundancy %, BESS sizing, backup gen sizing, flex %)                | **0 of 18**                                                         | Field count from this repo's `packages/core/src/types.ts` — directly inspectable.                          |
| Decision-relevant signal preserved           | All of it (utility makes decision from raw fields).                                                              | **All of it** (7 derived proofs cover the same decision surface).   | `packages/core/src/forecast.ts` — derivation maintains decision parity by construction.                    |
| Regulator visibility into what was redacted  | 0% (NDAs do not provide regulator visibility into redactions)                                                   | **100%** (every redaction has a policy reason code + sha-256 anchor) | `docs/privacy-claim.md` §1; verifiable via `pnpm privacy:canary`.                                     |
| Cross-applicant comparability                | Low — each applicant redacts differently; utility cannot rank apples-to-apples                                  | **High** — every projection follows the same policy version         | Property of the shared policy table.                                                                  |
| Time spent on NDA + redaction back-and-forth | 4–8 weeks per gate (industry estimate; see [Dominion 4-stage queue plan](https://www.datacenterdynamics.com/en/news/dominion-files-large-load-connection-queue-plan-with-state-regulators/) — disclosure friction is a named bottleneck) | **Hours** (signed bundle is generated locally, exported once)       | Process redesign opportunity; needs a named utility partner to validate.                              |
| Utility data-custody burden                  | High (utility takes custody of raw competitive data, must apply CEII handling)                                  | **None** (utility receives projection only)                          | Structural property of local-first.                                                                   |
| TEE-attestation requirement to trust the platform | High (without TEE, applicant must trust the host)                                                          | **None** (no host)                                                  | Structural property of local-first.                                                                   |

The 4-8-week gate-disclosure-friction estimate is the only one I'd
flag as needing utility-partner validation before putting on stage.
The rest are mechanical properties of the architecture.

These should also become a **"what changes" panel in the demo** — show
the visitor the count delta in real time, alongside the leak counter
that already ships.

---

## 10. Two surfaces, two jobs — web demo *and* desktop app

The product has two faces, and they have different jobs. They coexist.

### 10a. Web demo at `https://grid-passport.vercel.app` — public landing page

The web demo is the **public-facing landing page**. Its job is:

- Tell a first-time visitor what the problem is and why it matters.
- Walk them through the three pain-point case studies (`docs/vision.md` §8) with a "click to see the projections" path into `/demo/<caseId>`.
- Show the benefit metrics live (the Privacy Benefit Panel).
- Funnel serious users to the **download page** for the desktop app.
- Surface the team, the docs, and the code repository.
- Run the privacy canary as a demoable pass-fail check on stage.

The web demo is *not* where production users disclose real data. The
public version is honest about that — every page labels itself
"synthetic composite · illustrative only" and points serious adopters
to the desktop app download. The case-study pages remain the heart of
the demo experience; the home page becomes a marketing front door.

### 10b. Tauri desktop app — the production form

For real disclosure, users install a **local desktop app**:

- Native installer (DMG / MSI / AppImage).
- Single binary, ~10 MB (Rust core) plus the web frontend bundle.
- File-based input: open a JSON or YAML or filled-out form locally.
- All projection computation happens in-process — verifiably offline-capable.
- Export = "Save signed bundle as…" — the user picks the destination.
- Side-by-side review screen: applicant sees what utility AND regulator will see, before any export.
- Embedded AI agents (next subsection).

The desktop app is the answer to the "how do they trust us?" question.
The download lives behind a CTA on the web demo's landing page; once
installed, the desktop app is self-contained.

### 10c. AI agents inside the desktop app

The local app's UX is what makes the local-first trust model
commercially viable — without agents, the app is a glorified form.
With them, the applicant can speak normally, have public evidence
gathered automatically, get plain-English explanations of every
projection, and review side-by-side before exporting.

The full agent design — trust principles, per-agent roles, Claude
Agent Skills implementation, and the connection to Ming Jin's research
agenda on calibrating agent skills for workflow / human-preference /
domain-spec alignment — lives in **`docs/agents.md`**. Read that doc
for the agent architecture in depth.

The shipping order (see `docs/plans/roadmap.md` for full detail):
**Interviewer** (form-filling via NL) and **Cartographer** (public-
evidence fetch) ship first because they are the friction-reducing UX
wedge. **Explainer** comes second. **Notary**, **Forecaster**, and
**Referee** are shipping today as pure functions; they become Skills
when calibration evals demand it.

---

## 11. What we are *not* claiming (and the path to claim it)

Carrying the honesty list forward from `docs/privacy-claim.md` and
extending with the local-first context:

| Claim                                          | Demo today                                                                                       | What it'd take to make real                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| TEE protects the worker                        | Not relevant in local-first — the worker is the applicant's machine.                            | Re-introduce only if utility-side delegated verification is wanted; GCP Confidential Space is the path. |
| Flex MOSAIC compliance                         | `responseClass: A | B | C` — single ordinal bucket, narrative alignment only.                    | Adopt the published MOSAIC schema once it stabilizes; re-emit `flexibilityPassport` with full multi-axis fields. ~2–3 days. |
| Forecast accuracy                              | Hand-tuned linear formula in `forecast.ts`. Deterministic. No uncertainty bands.                | Replace with a probabilistic model trained on historical Dominion/PJM interconnection outcomes; emit P10/P50/P90. Multi-week effort and needs real data. |
| Production-grade desktop app                   | Web demo only.                                                                                  | Tauri scaffold + native installer + file-based input. ~1–2 weeks for a usable v0.                       |
| Real signed-bundle protocol                    | The bundle exists conceptually; signing isn't wired.                                            | Pick a signature scheme (Ed25519); publish the verification spec; ship the verifier as a small library that utilities embed. ~3–5 days. |
| Real OPA WASM runtime                          | TS mirror still enforces; canary checks drift.                                                  | Compile `grid-passport.rego` → WASM; load in-process. Already in handoff Open items.                    |
| Eval harness                                   | Privacy canary only.                                                                            | promptfoo + deepeval per the spec; covers role-leakage, counterfactual responsiveness, evidence recall. |
| Real public-evidence integration               | Synthetic GeoJSON; manually authored notes/sources.                                             | Cartographer agent that hits VA DEQ, FEMA NFHL, county GIS endpoints.                                   |

None of these is architectural blocker. Each has a path. The vision
doc is itself the commitment to keep the path visible.

---

## 12. Roadmap

The prioritized roadmap, current sprint, decision log, and "done"
history live in **`docs/plans/roadmap.md`** — that is the single source
of truth for "what are we building next?" The headline:

- **Current sprint.** Privacy Benefit Panel (#1, ~1–2 days), Open-source the repo (#2, ~1 day), Tauri shell of the local app (#3, ~1 week). Items #1 and #3 together change the pitch from "look at the role toggle" to "install this, run it locally, export a bundle, watch the canary stay green." That's the inflection.
- **Near-term.** Signed disclosure bundle, Interviewer agent, Cartographer agent, Real Flex MOSAIC schema, Pain-first case framing, Utility-side example app, Trust panel.
- **Backlog.** OPA WASM, eval harness, LLM Explainer, regulator PDF export, TS test suite, derivation transparency review, probabilistic forecaster, TEE for utility-side delegated verification.

Don't duplicate the roadmap here — it will drift. If you find yourself
adding plan-level detail to this doc, that's a sign the content
belongs in `roadmap.md` instead.

---

## 13. Conventions for updating this doc

Treat this doc the same way as `docs/plans/handoff.md`:

- When a vision-level thing changes (e.g., we decide local-first isn't right after all), update this doc *and* the architecture decision pointer in the handoff. The roadmap usually has to change too — flag it.
- When a benefit metric becomes measurable rather than illustrative, replace the entry in §9 with the measured number plus the source of measurement.
- Keep the "why now" timeline (§3) current — the regulatory landscape moves quarterly; an out-of-date timeline is worse than no timeline.
- **Roadmap items live in `docs/plans/roadmap.md`, not here.** §12 is a pointer; resist the urge to inline.

The point of this doc is to be the answer to "why are we building
this, and why this shape?" — six months from now, in a session with
fresh context. Keep it that.
