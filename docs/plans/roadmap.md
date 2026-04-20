# Grid Passport — Roadmap

> The master plan. What's shipping next, in what order, with mechanical "done" criteria.

This is the single source of truth for "what are we building?" `docs/vision.md` answers *why*; `docs/privacy-claim.md` answers *how the privacy mechanism works*; `docs/plans/handoff.md` answers *what's the current state and what's already decided*. **This doc is the playbook.**

When something here ships:
- Move it from "current sprint" or "near-term" to "done" with the landing date and PR/commit ref.
- Bump anything that became unblocked into "current sprint."
- If a decision in the decision log got resolved, move the resolution into the relevant item and delete the entry.

---

## Current sprint — 2026-04-20 → ~2026-05-18 (demo-ready everything)

**Goal:** close every demo-facing gap so Grid Passport runs as a live end-to-end walkthrough (applicant Tauri → signed bundle → separate utility binary verifies + renders). Pilot evidence wired into `/about` §6 with OPR. Two more Skills run live on desktop via Claude Agent SDK. Derivation correctness gets dedicated unit tests. Sim-bench **main run deferred**; pilot numbers defend the talk.

Full plan: **`docs/plans/sprint-2026-04-20.md`** — track-by-track items, sizes, owners, exit criteria, risk register.

Track summary:

- **Track 1** — empirical evidence into `/about` §6 (~1 wk). P0.1 CandidatePlan extraction → P0.3 spot-check → re-score → §6 wire.
- **Track 2** — Skill runtime on desktop (~2 wks, serial). #7 Interviewer Agent SDK wiring → #13 Explainer Skill on the same pipeline.
- **Track 3** — utility surface + trust UX (parallel, ~1 wk). #11 utility Tauri binary as **separate `apps/utility/` workspace** (option B — import-graph-level write-scope); #12 self-review trust panel.
- **Track 4** — correctness (slot in, 1–2 d). TS unit tests for `forecast.ts` + `audit.ts`.

**Deferred this sprint:** main run (455 runs, $400–1200), P0.2 ledger metadata, #8 Cartographer live-fetch, #2 open-source, Windows/Linux desktop builds.

Entries below retain their full breakdowns as landed-sprint records from the prior wave.

### 1. Privacy Benefit Panel (~1–2 days)

**Status: shipped 2026-04-18.** `apps/web/components/BenefitPanel.tsx` replaces `LeakCounter`. See Done table for details.

> Show the benefit on screen, not in a doc.

**Goal.** A live panel in the demo header that quantifies what the projection layer buys you for the current case × role, alongside a one-line "you don't have to trust the host" framing for the local-first story.

**Why now.** Lowest effort, highest immediate stage value. Closes the "show me the benefit concretely" question you flagged. No dependencies. Sets up the trust narrative that makes the Tauri shell easier to land.

**Success criteria.**
- Header panel renders for every case × role combination.
- Shows: raw competitive fields exposed (X / 6), regulator visibility into redactions (%), policy-versioned audit chain status.
- For non-applicant roles, also shows: "this view was projected on the applicant's machine; the host never sees raw inputs" framing line.
- Numbers come from the live `ProjectedView` and `POLICY` tables — not hardcoded.
- Privacy canary still passes.

**Steps.**
1. New component `BenefitPanel.tsx` next to `LeakCounter.tsx`.
2. Helper in `lib/policy.ts` to count private fields per role (already implicit — extract).
3. Wire into `DemoClient.tsx` above the `LeakCounter`.
4. Replace the existing `LeakCounter` *or* sit alongside (decision in §Decision log).
5. Run `pnpm typecheck && pnpm privacy:canary`.

**Demo moment.** "Look — for this case, the utility view exposes 0 of 6 competitive fields, but preserves all 7 derived signals the utility actually needs. And under the local-first architecture, none of this passed through our infrastructure."

**Decisions needed.** See §Decision log → "Replace LeakCounter or sit alongside?"

**Dependencies.** None. Can start immediately.

---

### 2. Open-source the repo (~1 day)

**Status: parked (2026-04-18).** Repo stays private for this sprint. Revisit when the open-source push is green-lit; the work itself is ready to execute. Until this lands, anything downstream (#3 public doc links, §1-hook "audit the source yourself" framing) routes around it.

**License: AGPL v3** (decided 2026-04-18). Utility forks must publish their changes — trust-story alignment wins over adoption friction. Legal teams on the utility side will read the license; that's a feature, not a bug, since it forces the protocol conversation.

> The local-first trust story requires auditable code. Without this, "you don't have to trust us" is just words.

**Goal.** Public GitHub repo with a license, a README that explains the trust pivot, and a CONTRIBUTING that frames the project as protocol-not-product.

**Why now.** Trust-story prereq. The Tauri shell pitch ("install this, run it locally, your data stays on your machine") is a much harder sell when the source is in a private repo. Has to land before, not after, the Tauri work.

**Success criteria.**
- Repo flipped to public on GitHub.
- `LICENSE` file added (default recommendation: Apache 2.0; AGPL is the alternative — see decision log).
- `README.md` rewritten as the public face: what the project is, why local-first, how to run the canary, link to the live demo, link to vision/privacy-claim docs.
- All `docs/` contents readable in-place from the GitHub web UI.
- No secrets, internal credentials, or auth tokens in any commit (audit before flipping).

**Steps.**
1. Decide on license (decision log entry).
2. Write `LICENSE`.
3. Audit history for accidental secrets: run `gitleaks detect --source . --log-opts="--all"` as the primary check. Cross-check with `git log --all -p | grep -i -E '(key|secret|token|password)'` for anything gitleaks' rule set might miss.
4. Rewrite `README.md` from scratch — current one is a Next.js stock template (verify and replace).
5. Add `CONTRIBUTING.md` — frames Grid Passport as a protocol, with a clear "fork-and-modify is encouraged for utility-side adaptations" stance.
6. Flip repo to public.
7. Update Vercel project settings if needed (it's already a public hackathon demo, so likely no change).

**Demo moment.** "Here's the source. Audit the projection function yourself. Run the canary on your machine."

**Decisions needed.** License choice (Apache 2.0 vs AGPL — see Decision log).

**Dependencies.** None. Can run in parallel with #1.

---

### 3. Landing page expansion (~2–3 days)

**Status: v1 shipped 2026-04-18.** Rewritten `apps/web/app/page.tsx` with hero (problem-first), static BenefitPanel teaser for Owl Compute × utility, three pain-point cards from `lib/pain-framings.ts`, crew strip from `lib/team.ts` (Bhawuk's Dominion affiliation prominent), desktop-app CTA linking to new `/downloads` placeholder, footer with repo link. Typecheck + canary pass. See Done table.

> Make the public web app a real first impression — pain studies, team, downloads, doc links — not just a hero card.

**Goal.** Rewrite `apps/web/app/page.tsx` so first-time visitors arrive on a page that surfaces the problem, the three pain-point case studies, the team, the benefit metrics, links to all four docs (`vision.md`, `agents.md`, `privacy-claim.md`, `roadmap.md`), and a download CTA for the desktop app (placeholder while Tauri is in flight).

**Why now.** The web demo's role just got upgraded from "teaching artifact" to "public landing page." Without this work, a visitor who lands on https://grid-passport.vercel.app sees a vague hero and has to guess what to do. With it, they land into a story that funnels them either into a case study or into a desktop-app download.

**Success criteria.**
- Hero section leads with the problem (one-sentence framing of AI compute vs grid lag), not a product slogan.
- Three pain-point cards (one per case study) each link into `/demo/<caseId>` with a one-line pain framing pulled from `docs/vision.md` §8.
- Team section (Ming Jin, Bhawuk Luthra, Vikrant Bhati) with Bhawuk's Dominion Energy affiliation prominent.
- "Get the desktop app" CTA — placeholder section labeled "coming soon · join waitlist" until Tauri ships, then becomes real download links.
- Links to all four docs in the footer (rendered from GitHub).
- "Synthetic composite · illustrative only" honesty stays in the footer.
- Mobile-responsive (Tailwind defaults are enough; spot-check 375px width).

**Steps.**
1. Sketch the page sections in order: hero → problem → pain-point cards → benefit metrics summary → team → desktop-app CTA → footer with doc links.
2. Replace `app/page.tsx` content; reuse the existing `DiffRow` component as one piece of evidence in the hero or move it to a "see it on the demo page" CTA.
3. Pull pain framings into a `lib/pain-framings.ts` so the case-study cards stay in sync with `vision.md` §8.
4. Team section as data: `lib/team.ts` with name, role, affiliation, and optional link.
5. Add a `/downloads` route as a placeholder page (will be wired to Tauri release artifacts later).
6. Run `pnpm typecheck`. Visual review at desktop and mobile widths.

**Demo moment.** Show the public URL to a stakeholder. They land, scan, click into a case study, come back, see the team and the trust framing, click "get the desktop app," see "coming soon" with the actual roadmap timeline.

**Decisions made.**
- **Embed the Privacy Benefit Panel as a static teaser on the landing page** (decided 2026-04-18). Use Owl Compute as the canonical case. Render the three live metrics with a "see the live panel for any case" CTA into `/demo/owl-compute`. Keeps the public-facing first impression dense.
- Doc links point to public GitHub renderings once #2 unparks; until then, links resolve in-app or are hidden.

**Dependencies.** Open-source the repo (#2) — the doc links should resolve publicly. Privacy Benefit Panel (#1) is optional but nice to embed.

---

### 4. Tauri shell of the local app (~1 week)

**Status: v0 shipped 2026-04-18.** All Steps 1–7 landed: scaffold (Vite + React + TS), Tauri dialog + fs plugins, local-file case loader with structural validation against `CaseInput`, three-column side-by-side review screen (applicant / utility / regulator) with role-tinted headers + mini-BenefitPanel + section renderer, export-bundle JSON (v0 — audit chain + signing deferred to #6), desktop canary that asserts `@grid-passport/core` imports + projection invariant, macOS unsigned DMG artifact. See Done table for details. Follow-up polish (branded icon, fs-scope narrowing, Windows/Linux builds, code signing) is in backlog as `desktop packaging polish`.

> Make the local-first pitch demonstrable end-to-end. Framework decision is settled (Tauri 2.x); design quality is where the differentiation lives.

**Goal.** A native desktop application (macOS DMG / Windows MSI / Linux AppImage) that wraps the existing Next.js UI, takes raw inputs from a local file or in-app form, runs the projection in-process, and exports a disclosure bundle to a chosen path. **No network calls for the disclosure pipeline.**

**Why now.** Without this, "we are local-first" is a doc claim, not a demonstrated capability. The trust story collapses to a slide. The Tauri shell + signed bundle (#6) together complete the v0 of the actual product.

**Why Tauri (decided).** Tauri 2.x. Rust core gives us memory safety on the trust-critical projection path *and* the nerdy aesthetic. ~10MB binary vs Electron's ~100MB+. Strong code-signing story across all three platforms. Tauri's IPC model is more security-conscious than Electron's. Web-tech UI means our existing Next.js code transfers as-is. Electron remains the conservative fallback if Rust intimidates the team; PWA-with-File-System-Access is ultra-light but Chromium-only and weaker enterprise trust signal.

**Plugin skills to leverage.** See `CLAUDE.md` § "Available Claude Code plugin skills" for the canonical list; for this track specifically:
- `/frontend-design:frontend-design` (installed) — apply to the side-by-side review screen, export-bundle flow, any new chrome. The `/about` page's classified-briefing × SCADA aesthetic is the visual reference; reuse the BenefitPanel + SectionPlate language.
- `dchuk/claude-code-tauri-skills` / `tauri-plugins` — install at start of sprint via `npx playbooks add skill dchuk/claude-code-tauri-skills --skill tauri-plugins`. Covers Rust core, JS bindings, platform-specific code (macOS/Windows/Linux), permissions, lifecycle.
- `actionbook/rust-skills` — install via `/plugin marketplace add actionbook/rust-skills && /plugin install rust-skills@rust-skills`. Idiomatic Rust patterns for the trust-critical projection code hoisted into `packages/core/`.
- `rust-analyzer-lsp` (installed) — activate with `rustup component add rust-analyzer` before first edit of the Rust core.
- `P3GLEG/tauri-plugin-mcp` — optional, post-scaffold. Embeds an MCP server in the running Tauri app so Claude can drive it for debug/test (screenshots, DOM access, input simulation) — useful when iterating on the side-by-side review screen without manual clicking.

**Design direction — "sharp, professional, weird, fun, nerdy."** The framework choice doesn't make a UI weird; the design layer does. Anchor on these principles:

- **Mono-everywhere typography.** JetBrains Mono or IBM Plex Mono for headers and labels; system sans only for long-form prose. Already partially in place via the existing demo's `font-mono` use.
- **Mechanical-feeling animations.** Avoid easing curves that feel like marketing pages (no spring physics, no big fades). Prefer hard cuts, instant state transitions, occasional 60–120ms slides for affordance — the aesthetic of a flight-ops console, not a slick consumer app.
- **Terminal-flavored microcopy.** "sealed" / "released" / "policy@0.1.0" / "scenario · flex 30%" — already present in the demo. Lean further into it. Hashes shown in mono. Status lines that look like log output. Easter eggs: console.log a Grid Passport ASCII banner on app open.
- **Color palette.** Already correct: deep neutral background (#0a0a0a / neutral-950), sealed-amber, released-lime, public-sky, error-red. Don't introduce more hues. Restraint signals "this is a tool for serious people."
- **Empty states with personality.** "No public evidence loaded — try the Cartographer agent or paste a county/parcel." Not "Loading…".
- **Reference UIs to study:** Linear changelog, Rauno Freiberg's portfolio (rauno.me), Vercel templates, Modular's Mojo docs. Avoid: TurboTax (functional but visually dated), generic SaaS hero pages.

**Success criteria.**
- `pnpm tauri dev` opens a window with the Grid Passport UI.
- The UI loads a case fixture from a local JSON/YAML file (path picker), not from a bundled fixture set.
- All projection / forecaster / audit logic runs in-process — verifiable by going offline and confirming the app still works.
- Side-by-side review screen: applicant sees what utility, regulator, and themselves will see, before any export.
- "Export bundle" button writes a JSON file to a user-chosen path.
- Privacy canary still passes against the same projection code.
- Build artifact for at least macOS (other platforms can come later).
- Design review against the "weird/nerdy" reference UIs before declaring done.

**Steps.**
1. ~~Add `apps/desktop/` workspace with Tauri scaffold (Tauri 2.x; Rust core + Vite + React + TS frontend)~~ — **done 2026-04-18.** Frontend-stack decision resolved: Vite + React over reusing the Next.js app (Tauri expects SPA not SSR; small binary; cleaner dev loop). `apps/desktop/` wired with `@grid-passport/core` as workspace dep; `src-tauri/` identifier `app.gridpassport.desktop`, crate `grid-passport-desktop` (lib `grid_passport_desktop_lib`), `tauri 2.10.3` + `tauri-plugin-log 2`. v0 `App.tsx` is a proof-of-wire: picks case × role, calls `buildRecord` + `projectForRole` from core in the webview, renders the `ProjectedView` as JSON. Shared display components (`BenefitPanel`, `RequestView`, `RoleToggle`, `FieldRow`, `FieldChip`, `SectionCard`, `AuditTrail`, `PolicyPanel`) still live in `apps/web/components/`; hoisting to `packages/ui/` is deferred to the next desktop session once we know which ones the side-by-side screen composes.
2. ~~Hoist projection/forecaster/audit/policy into a shared package (`packages/core/`)~~ — **done 2026-04-18** (`b1b2493`). Desktop imports `@grid-passport/core/{types,policy,projection,forecast,audit,fixtures,geo}` directly. Note: `policy-source.ts` stayed in `apps/web/lib/` (cwd-dep); desktop needs a separate design decision for Rego-file loading (options: skip it since `POLICY` table is encoded in core, pass path via Tauri config, or bundle as asset).
3. ~~Replace the desktop app's fixture loader with `@tauri-apps/api/fs` for local file IO~~ — **done 2026-04-18.** `apps/desktop/src/lib/case-loader.ts` uses `@tauri-apps/plugin-dialog` + `@tauri-apps/plugin-fs` with a structural validator over `CaseInput` (no ajv dep; keeps the bundle small). Bundled fixtures remain selectable via the `CASE_METAS` chips; file-load is the "or" path.
4. ~~Build the side-by-side review screen~~ — **done 2026-04-18.** Three columns in `apps/desktop/src/components/`: `ReviewColumn` (role-tinted header + tagline) × `MiniBenefit` (private-exposed / derived-released / redaction-audited) × `ProjectionSections` (request / private / public / derived with field-class chips and `[sealed]` redaction affordance). Tailwind is not yet adopted on desktop — styles are vanilla CSS under `src/styles.css` with the existing `amber/lime/sky` tokens.
5. ~~Wire the "Export bundle" button~~ — **done 2026-04-18.** `apps/desktop/src/lib/bundle.ts` defines `DisclosureBundle` (schema `grid-passport/bundle`, version `0.0.1-v0`, fields = `{caseId, requestId, policyVersion, generatedAt, projections: {applicant, utility, regulator}, note}`). The explicit `note` field flags that v0 is unsigned and has no audit chain (both land in #6). Export goes through `dialog.save` + `fs.writeTextFile`.
6. ~~macOS build via `pnpm tauri build`~~ — **done 2026-04-18.** Icons generated via `cargo tauri icon` from a placeholder source; unsigned DMG produced under `src-tauri/target/release/bundle/`. Gatekeeper will flag the first open (right-click → Open to bypass); signing lands in packaging polish.
7. ~~Run `pnpm typecheck && pnpm privacy:canary` + add `pnpm canary:desktop`~~ — **done 2026-04-18.** New root script `pnpm canary:desktop` runs `apps/desktop/scripts/canary-desktop.ts` which (a) walks `apps/desktop/src` and asserts at least one file imports from `@grid-passport/core` (guards against projection duplication), (b) runs `projectForRole(buildRecord(getCase(c)), r)` for all 3 cases × 3 roles and asserts the `utility`/`regulator` private-visible count is 0 and the `applicant` count is 8. All four checks green: web typecheck, desktop typecheck, privacy canary, desktop canary.

**Demo moment.** Open the DMG. Drag-drop a case-study JSON. Watch the side-by-side review render. Click "export bundle." Show the file. Disconnect from wifi and do it again to prove no network calls.

**Decisions needed.** Whether v0 includes Interviewer/Cartographer agents (recommendation: ship without; agents land in #7/#8 right after). One more open sub-decision from the scaffold session: whether to hoist shared components into `packages/ui/` before the side-by-side screen (cleaner, more up-front work) or duplicate into `apps/desktop/src/components/` first and hoist when a second desktop surface needs them (pragmatic, risks divergence).

**Dependencies.** Privacy Benefit Panel (#1) — its component is reused in the side-by-side review screen. Not blocked by Landing (#3) or Story (#5), but both ship first chronologically (shorter poles).

---

### 5. Story page (/about) — render docs/story.md as a long-scroll narrative (~2–3 days)

**Status: v1 shipped 2026-04-18.** `/about` renders `docs/story.md` at build time (`react-markdown` + `@tailwindcss/typography`), with a classified-briefing × SCADA-panel design pass applied via `/frontend-design:frontend-design` — grid backdrop, scan-reveal hero, §NN section plates, `mechanical canary · passing` telltale in §4, 3-card crew manifest in §9, "end of briefing" stamp. Cross-linked from landing + demo header. **Blocked:** §6 4×3 score matrix (needs #14 eval harness — currently flagged as `status · placeholder` on the page).

> The research narrative lives on the website. Demo walkthrough is a scroll, not a slide deck. Doubles as public-facing material.

**Goal.** A new route at `/about` (or `/story`) that renders `docs/story.md` as a polished long-scroll page. Same content used for public presentations and for the website. Single source so the two cannot drift.

**Why now.** Demo walkthrough uses this page. Public presentations pull from the same source. The eval results (when they land from #14 below) update one place and propagate to both. Until then, this page is also the artifact a visitor reads to understand "why does this exist?" without needing to speak to anyone.

**Success criteria.**
- New route `/about` renders the story narrative.
- Section structure mirrors `docs/story.md` (hook, problem, why-hard-for-agents, reliability triad, system, empirical results, generalization, future, team).
- Embedded interactive elements at appropriate beats:
  - §1 hook: live role-toggle teaser (a mini version of the demo, or a clear "see it live" CTA into `/demo/owl-compute`).
  - §4 reliability triad: a live status indicator showing "canary: passing · X commits ago" (pulled from CI or static).
  - §5 system: link into the actual demo with a "click here to see this happen" affordance.
  - §6 empirical results: when the eval harness ships (#14), embed the 4×3 score matrix.
  - §9 team: link to repo + each team member's profile.
- Long-scroll layout, mobile-responsive, follows the design direction in #4.
- Loaded from `docs/story.md` via build-time markdown parsing — editing the markdown file updates the page on next build. Don't dual-maintain.

**Steps.**
1. Pick the markdown rendering approach: `next-mdx-remote` or `@next/mdx` for Next 16. Whichever supports build-time rendering of arbitrary markdown files outside `app/`.
2. Build a `app/about/page.tsx` server component that reads `docs/story.md` from disk at build time and renders it.
3. Add typography styles (likely use `@tailwindcss/typography` plugin or hand-rolled prose styles per the design direction).
4. Add the embedded interactive components at the marked beats (separate React components imported into the MDX).
5. Cross-link from the landing page (#3) hero or a navigation item.
6. Verify at desktop + mobile widths. Run `pnpm typecheck`.

**Demo moment.** Walk the audience through `/about` end-to-end. Click the embedded role-toggle teaser, click into a case study, scroll back, show the canary status, scroll to the team. The scroll IS the narrative.

**Decisions needed.**
- `/about` vs `/story` URL — recommendation: `/about` because it's conventional and SEO-discoverable; reserve `/story` for a playful name later if needed.
- Markdown source: copy `docs/story.md` into `apps/web/app/about/` at build time, or read directly via `fs.readFile`? Recommendation: read directly — single source of truth.

**Dependencies.** Story doc itself is shipping with this session (`docs/story.md`). Open-source the repo (#2) ideally before this lands so links resolve publicly. Eval harness (#14) needed to fill the §6 placeholder, but the page can ship before with a "coming soon" placeholder.

---

## Near-term — next ~4–6 weeks after current sprint

Items in priority order. Each is one paragraph; full breakdown when promoted to "current sprint."

### What to work on next (2026-04-20)

Current-sprint plan: **`docs/plans/sprint-2026-04-20.md`** — demo-ready everything, ~4 weeks, main run deferred. Headline: P0.1 CandidatePlan → OPR into `/about` §6 → Interviewer/Explainer SDK wiring → separate utility Tauri binary → trust panel → forecast/audit unit tests.

Rationale for main-run deferral: pilot's 12-subset already produced directional evidence (D wins every judge Likert cell; D=0 on H-null; post-A-5 trace classifier clean). Spending $400–1200 before the demo loop is visible-to-users is the wrong order. Close the demo gaps, land OPR from pilot ledgers (not new SDK spend), and run main when the demo artifact itself needs it.

What NOT to do this sprint:
- Main run (§14 step 7) — deferred.
- P0.2 ledger metadata — deferred with main run; H-null suffices for §6.
- §3.2 student track (P1.2/P1.3/P1.4) — specs ready; land when a student is assigned.
- #8 Cartographer live-fetch — cache-only works for demo.
- #2 open-source — parked.
- #9 EPRI MOSAIC — gated on EPRI external schedule.

### 6. Signed disclosure bundle protocol — *shipped 2026-04-18*

**Status: shipped 2026-04-18.** Bundle v1.0.0 protocol implemented end-to-end with a grounded design justification in `docs/design/signed-bundle.md` (threat model, 8 design decisions each with alternatives + rejection reasons + IETF/W3C citations, schema spec, sign/verify algorithms, 10-Q demo defense, post-quantum migration path). See Done table for landing details. Follow-up: Dominion onboarding handshake (§9 seams — non-code, waiting on Bhawuk intro); narrow `fs` capabilities to user-selected dirs (tracked as desktop packaging polish); Rego-asset loading in desktop so `policyHash.rego` isn't a placeholder (tracked in backlog).

### 7. Interviewer agent — first Claude Skill

**Status: v0 shipped 2026-04-18 at the spec-compliant path.** Authoring source at `.claude/skills/interviewer/` (discovered by Claude Code as `/gridpassport-interviewer`). SKILL.md with `when_to_use` + write-scope contract + non-coaching rule + 5-check trust-constraint checklist; REFERENCE.md mirrors `@grid-passport/core/ask-reasons`; three canonical intakes (Owl · Lantern · Kraken). Paired CI validator at `packages/agents/interviewer/scripts/validate_caseinput.ts` (3 positive + 3 negative self-tests). Mechanically-derived prompt-only baseline at `packages/agents/interviewer/baselines/prompt-only.md` (32KB, drift-gated). Tauri skills-loader (`apps/desktop/src/lib/skills-loader.ts`) + `bundle.resources` in `tauri.conf.json` bundle the Skill source into the desktop binary. See Done table 2026-04-18 entries for full landing details.

**Remaining under #7 (post-v0):**
- ~~**Desktop Interviewer transport architecture**~~ — ✅ landed 2026-04-20 (Track 2.1a of sprint 2026-04-20). Pure validator extracted to `@grid-passport/agents/interviewer/validator` (browser-safe); `InterviewerTransport` seam in `apps/desktop/src/lib/interviewer-transport.ts` with `FakeInterviewerTransport` (default v0) + `ClaudeAgentSDKInterviewerTransport` stub; `IntakePanel` React component wired into desktop work mode; `canary:desktop` extended to 5 guards exercising the full prose→validator→CaseInput pipeline end-to-end. The seam is designed so the real Claude Agent SDK transport is a drop-in replacement for the stub's `query()` body — nothing above it changes.
- **Real Claude Agent SDK transport (Track 2.1b)** — open. Drop-in replacement for `ClaudeAgentSDKInterviewerTransport.query()`. Substrate decision pending: recommend new Rust Tauri command (e.g., `invoke("interviewer_query", { transcript, skillSource })`) that shells out to a subprocess carrying the Claude Code session env (matches eval-sim's `ClaudeAgentSDKTransport` pattern; preserves "no API-key UX" decision). 2–3 d once substrate is picked.
- **HIPAA substrate-transfer demo** (`.claude/skills/priorauth-interviewer/`) — shipped 2026-04-18 as a methodological demonstration that the Interviewer recipe transfers cross-domain. Not production HIPAA; no paired validator. See Done table.

**Decided (kept for historical reference):**
- Packaging route — local SDK on desktop, hosted API on web demo (per SDK spec at `docs/agents.md` §5c).
- LLM call routing — no direct Anthropic-API key management in either surface; host Claude Code session OR Claude Agent SDK as transport. Zero API-key UX for applicants.

### 8. Cartographer agent — second Claude Skill

**Status: v0 shipped 2026-04-18.** `.claude/skills/cartographer/` (discovered as `/gridpassport-cartographer`). SKILL.md with write-scope contract (`publicEvidence` only; never `privateProfile` or `derivedProof`) + non-fabrication rule + source-whitelist enforcement + 6-check trust-constraint checklist. SOURCES.md is the **endpoint registry whitelist** (FEMA NFHL · VA DEQ air/water · Loudoun/Prince William/Fauquier GIS · VA Land Records · EPRI DCFlex · Dominion FIR · VA SCC fact sheet · Google DCFlex primary disclosure — 11 URLs total). Three canonical public-evidence transcripts demonstrating baseline retrieval, multi-source-disagreement handling, multi-topic source reuse + applicant-upload. Paired CI validator at `packages/agents/cartographer/scripts/validate_publicevidence.ts` (3 positive + 4 negative self-tests including provenance-whitelist enforcement — URLs not in SOURCES.md → contract violation). Mechanically-derived prompt-only baseline at `packages/agents/cartographer/baselines/prompt-only.md` (35KB, drift-gated). See Done table 2026-04-18.

**Remaining under #8 (post-v0):**
- **Live fetch implementation** — SKILL.md currently supports "cache-only" (web-demo) and documents a "live fetch" path (desktop); live fetch not yet implemented. ~2-3 days once a desktop Tauri Cartographer UI is scoped.
- **Multi-state expansion** — SOURCES.md is VA-specific in v0. Adding states (TX for ERCOT large-load, WA/OR for PNW hyperscaler interest) is a follow-up per partner demand.

**Decided:** web demo uses pre-fetched cache labeled "cache, not live"; desktop uses live fetch when implemented. Both surfaces share SKILL.md + SOURCES.md as single source.

### 9. Real Flex MOSAIC schema (~2–3 days)

Replace the `responseClass: "A" | "B" | "C"` ordinal bucket with EPRI's published MOSAIC multi-axis descriptor (magnitude / timing / duration / frequency). Gated on EPRI publishing the v1 schema in a stable form — currently in voluntary-adopter phase. Once they publish: 2-3 days to swap the type, update the forecaster, add the canary check. **Watch:** [dcflex.epri.com/flex-mosaic](https://dcflex.epri.com/flex-mosaic).

### 10. Pain-first case framing in the demo header (~1 day)

Each case study currently shows `displayName · MW · county`. Add a one-line pain framing per case (drawn from `docs/vision.md` §8) so the visitor sees *why this case matters* before clicking through projections. Owl Compute → "hyperscaler vs roadmap exposure"; Lantern Cloud → "applicant in genuine permit trouble"; Kraken Train → "flexibility commitment without exposure". Small UX item, high pedagogical lift. Pulls from `lib/pain-framings.ts` — same source as the landing page (#3) so the two stay in sync.

### 11. Utility-side example application — *scaffold shipped 2026-04-20*

**Status: scaffold landed (Track 3.1 of sprint 2026-04-20).** `apps/utility/` is a separate pnpm workspace (Vite + React + TS + Tauri 2.10.3; crate `grid-passport-utility`, port 1430, identifier `app.gridpassport.utility`). Verifier-only — no `keyring`/`ed25519-dalek`/signing binary; capabilities scoped to dialog + fs read-only. Placeholder paste+verify UI proves the import chain; gate 15 `pnpm canary:utility` enforces the write-scope import contract (forbids `@grid-passport/core/{fixtures,forecast,audit}` in `apps/utility/src`) plus a sign+verify+tamper+reject e2e on a fresh owl-compute bundle. **Demo moment (applicant → utility end-to-end) waits on 3.1-polish**: real drop-zone via `@tauri-apps/plugin-dialog` + `plugin-fs`, verified-bundle state carrying keyId + policy-hash display, utility-pinned `BenefitPanel` rendering `payload.projections.utility`. ~3–4 days of follow-up; no new canaries needed since gate 15 already covers the structural contract.

### 12. Self-review trust panel in the desktop app (~1–2 days)

Inside the Tauri app, a persistent "trust" panel that shows: "this app makes 0 network calls during projection", "your raw inputs are at `/path/to/your/file.json`", "the bundle you're about to export is `<hash>` and contains 0 raw private fields". Bakes the trust story into the UX itself, not a separate doc.

### 13. Explainer agent — third Claude Skill (~3–5 days)

> Role-conditional narration; the human-preference-alignment exemplar.

Generates plain-English narration of a `ProjectedView`, conditioned on the requesting role. Implemented as a Skill at `packages/agents/explainer/` with a `ROLE_VOICES.md` resource describing how to address applicants vs utilities vs regulators. Packaging follows the #7 convention: local-SDK on desktop, hosted-API on the web demo. **Trust constraint:** consumes only `ProjectedView`, never the raw `CaseInput` — by construction cannot leak. **Calibration angle:** does the Skill produce role-appropriate prose that scores well against a graded human-preference rubric (per `docs/agents.md` §6b)? This agent is the cleanest evaluation target for the human-preference-alignment dimension of the research.

### 14. Stakeholder-alignment simulation bench — *engine + pilot shipped 2026-04-20; main run deferred pending P0 measurement-integrity blockers*

> The empirical-results artifact for #14. Multi-agent simulation of the applicant ↔ utility ↔ regulator workflow under four conditions — **(A) Oracle** (upper bound), **(B) NDA-email** (status-quo lower bound), **(C) Prompt-only AI agent**, **(D) Grid Passport (Skill-based)** — scoring efficiency, outcome-preservation vs oracle, privacy leakage (direct / inferential / trace), mechanical compliance, and stakeholder-alignment quality (Opus-as-judge with pre-registered rubric) across 7 diverse applicant archetypes (S1–S6 grid + S7 HIPAA priorauth cross-domain).

**Full design + pre-registration: `docs/evals/sim-bench-design.md`.** Read that before starting work. Pre-registration locked 2026-04-19 with Amendments A-1 + A-2; post-lock changes require a §3.2 amendment.

**Implementation status (2026-04-20, engine + pilot complete in 12 commits; Amendments A-3/A-4/A-5/A-6 landed):**

| Step | Subject | Status |
|---|---|---|
| 1 | LLM transport (`eval_sim/llm.py`) — claude-agent-sdk; rides parent Claude Code session, no API key | ✅ done · live smoke 13.7s Sonnet |
| 2 | Flip 6 LLM-gated scorers + paraphrase barrier to use Transport | ✅ done · live smoke 33s Opus judge |
| 3 | Concordia agents (`eval_sim/agents/{language_model,embedder,components,builders}.py`) — `EntityAgent` + `ContextComponent` + `AssociativeMemoryBank` substrate, with `ParaphrasedPrivateProfile` as the §1.5.2 #6 realism component | ✅ done · live smoke realistic Dominion intake letter |
| 4 | Four condition Game Masters (`eval_sim/channels/{base,oracle,skill_bundle,prompt_bundle,email}.py`) — thin orchestrator, NOT Concordia's `Engine`; runner dispatch | ✅ done in 5 sub-commits · live smokes Oracle 3 turns + SkillBundle 7 turns + 4-condition dispatch 27 min |
| — | Amendment A-3 — pre-pilot reconciliation + Oracle `cartographer_mode='cached'` fix | ✅ done (`ab9ba87`) |
| 5 | Live Cartographer cache generation (7 fixtures + SHA-256 manifest committed) | ✅ done (`552d898`) · all 7 scenarios validated on attempt 1/3 |
| 6a | Pilot wiring + 12-subset validation (S1/S2/S3 × A/B/C/D × seed=0, all 12 `ok`) | ✅ done (`2d09b3d`) |
| 6c | Fairness pilot plumbing — `runner.run()` `cartographer_mode_override` kwarg; `pilot.py --fairness` real dispatch | ✅ code done (`ce38241`) · 12 fairness runs not yet executed |
| 6d | Scorer-over-ledger batch (`scripts/score_ledgers.py`) — deterministic + LLM-gated axes with per-scorer budget tracking, idempotent per-cell merge, swap-augmentation wired (A-6) | ✅ done (`ce38241` + `8ea8725`) · 12-subset scored under A-5/A-6 (`6cd07ce`) |
| — | Amendment A-4 — token hygiene + H-null word-boundary | ✅ done (`ce38241`) |
| — | Amendment A-5 — trace classifier prompt tightening (raw-vs-derived + transmission-leg scope) | ✅ done (`8ea8725`) |
| — | Amendment A-6 — all LLM judges unified to Opus 4.7; swap-augmentation mandatory | ✅ done (`8ea8725` + `6cd07ce`) |
| 6b | Seed expansion — 16+ runs to reach §9 n=5 coverage on S1–S6 | **deferred** — gated on P0 blockers; ~2.5–4 hrs + $40–80 |
| 7 | Main (140 condition + 35 oracle + 280 judge = 455 runs) | **deferred** — gated on P0 blockers; ~$400–1200 |

**P0 blockers before main run (2026-04-20):** the 12-subset pilot produced direction-only evidence (D wins every judge-Likert cell, D=0 on H-null, trace classifier clean post-A-5). But the primary §9.1 claim `OPR(D) − OPR(B) ≥ 0.20` requires the §8b Robustness axis, which is currently stubbed. Running the main sweep without unblocking Robustness = collecting data that can't support the headline. Order of operations:

| P0 | Item | Size | Owner |
|---|---|---|---|
| P0.1 | **`CandidatePlan` extraction** — per-condition plan extraction from ledger artifacts. Spec: `docs/evals/specs/candidate-plan-extraction.md`. Unblocks §8b Robustness (OPR + Savage regret) — the headline metric for §9.1. | ~2–3 days | student follow-on |
| P0.2 | **Ledger-metadata extension** — persist `validator_pass_per_turn` + `source_refs[]` on each ledger. Unblocks §8d H-workflow + H-spec + H-trigger. | ~2 days | student follow-on |
| P0.3 | **Different-family judge spot-check** — re-judge 2–3 cells with Claude 3.5 Sonnet judge. Quantifies the Opus-Opus same-family self-preference risk (Panickssery 2024) on D's Likert numbers. | ~30 min, ~$2 | Ming or student |

When P0.1–P0.3 land, the main run is defensible spend. Without them, the Likert signal stands but the OPR headline and the §8d compliance axes cannot be reported.

**Post-main-run student track (§3.2 direct measurement — not gating but high-leverage):**

| P1 | Item | Spec | Owner |
|---|---|---|---|
| P1.2 | Strategic-misreport benchmark (non-amplification evidence) | [`specs/P1_2-strategic-misreport-benchmark.md`](../evals/specs/P1_2-strategic-misreport-benchmark.md) | student |
| P1.3 | Cross-check Referee Skill (verifiable-field subset) | [`specs/P1_3-cross-check-referee-skill.md`](../evals/specs/P1_3-cross-check-referee-skill.md) | student |
| P1.4 | Proper-scoring-rule calibration (unverifiable-field subset) | [`specs/P1_4-proper-scoring-rule-calibration.md`](../evals/specs/P1_4-proper-scoring-rule-calibration.md) | student |

These three together instantiate the three-mechanism composition of §3.2 (see `docs/design/research-roadmap.md` §1). Each produces direct empirical evidence that the current bench axes proxy for.

**Architectural call made during step 4** (recorded in `docs/plans/handoff.md` Now §4 + `eval_sim/channels/base.py` docstring): we use Concordia's `EntityAgent` substrate but **not** `concordia.environment.engines.Sequential` — the latter is itself LLM-driven (every step uses an LLM to decide whose turn is next, format observations, resolve actions), which would add ~3,360 wasted Sonnet calls in main run with no decision-theoretic content for our deterministic-routing setting (§6 specifies typed channels + seed-hashed failure-mode sampling + fixed meeting protocol). Substrate claim per §1.4 is preserved; loop is ours. Reviewers can `pip install gdm-concordia` and verify `EntityAgent`/`ContextComponent`/`AssociativeMemoryBank` are real Concordia subclasses.

**Tests: 258 pass, ruff + pyright clean** as of Track 1 land (`625f7cf`; +19 `plan_extraction` + 10 `robustness` + 5 `runner` override + 2 `score_ledgers` over the `2d09b3d` 222 baseline). Pilot.py wiring is deliberately thin on unit tests — the meaningful test IS the live 12-subset run; manifest + per-run ledgers are the durable proof.

**Why re-scoped from the prior substrate-only design.** A pointed review (Ming, 2026-04-19) flagged that the earlier rubric-based design (`docs/evals/rubric.md`, `docs/evals/owner-briefs.md`) measured substrate *properties* on canned fixtures. What the talk actually needs is the *system outcome*: does Grid Passport compress the real applicant↔utility↔regulator workflow, close more of the gap to the no-privacy-constraint ideal, and reduce on-record leakage that today accumulates in email threads despite NDA? The old 4-axis rubric is not discarded — it is folded into §8d of the new design as the "mechanical compliance" axis, scored on live simulation turns rather than canned inputs. The shipped substrate metrics at `packages/agents/metrics.md` become the *leading-indicator* side; this bench is the *behavioral* side.

**Four conditions (see `docs/evals/sim-bench-design.md` §4):**
- **A — Oracle.** All information freely shared; no privacy constraint. Defines the ceiling.
- **B — NDA-email.** Parties sign NDAs; multi-round email + meetings; private values accumulate on-record through paraphrase-loss, wrong CC, attachment reuse, expertise-gap friction (contract-handler ≠ technical-expert). Status-quo baseline.
- **C — Prompt-only AI agent.** Applicant uses the mechanically-derived flat-prompt baseline from `packages/agents/*/baselines/prompt-only.md`; signed-bundle protocol for output. Same content as D, different packaging.
- **D — Grid Passport.** Applicant runs local Skills (Interviewer → Cartographer → Forecaster/Referee) + exports signed bundle. One-to-two rounds, all information collected locally, shared through policy-bound projection with no raw private fields leaving the machine.

**Six scenarios (see §7):** Owl-like (sophisticated hyperscaler · strategic), Lantern-like (real trouble · honest-cautious), Kraken-like (flexibility-forward · aggressive), First-timer (overwhelmed-new-filer · maximum expertise-gap), Adversarial (phantom-project · deceptive — pre-registered critical test for the substrate claim; if D < B on misreport detection here it's a publishable finding not a failure), Multi-phase (staged filing · audit-chain stress test).

**Metrics (see §8):**
- **Efficiency** — rounds, simulated elapsed days, artifact count, words exchanged
- **Outcome-preservation ratio** — weighted convergence of each condition's plan to the oracle's (energization band, firmness score, flexibility class, blocker recall, regulator completeness)
- **Privacy leakage** — three distinct types: direct (exact value appears), inferential (reconstructable from released artifacts by a probe-LLM), trace (on-record in email/meetings/attachments regardless of NDA — the framing of "eliminates the record, not the legal protection")
- **Mechanical compliance** (the old 4-axis rubric, folded in)
- **Opus-as-judge qualitative** — 5 Likert dimensions with rationales + counterfactual; blind-judged; 2 independent Opus runs per transcript; disagreement > 1 Likert spot-checked

**Pre-registered success criteria (see §9):**
- OPR(D) − OPR(B) ≥ 0.20 (close ≥20% of the oracle/status-quo gap)
- OPR(D) − OPR(C) ≥ 0.05 (Skill substrate beats prompt-only with identical content)
- N_trace_leaks(B) ≥ 5× N_trace_leaks(D); N_trace_leaks(D) expected = 0 by construction
- Rounds(D) ≤ 0.5 × Rounds(B) (half the communication rounds)
- Plus four explicit falsification conditions so results that would contradict the claim get reported, not hidden

**Honest design points (see §11 + §14).** LLM-roleplayed utility / regulator, failure-rate parameters (not measurements; sensitivity analysis at 0.5× / 2×), oracle-is-also-an-LLM, email-base-rates pre-registered with as-empirical-as-possible grounding, NDA-legal-remediation not modeled. All enumerated in the design doc's honest-limits table which becomes the talk's honest-limits slide verbatim.

**Owners (hybrid per design §13).** Ming owns scenario cards + role prompts + judge rubric + analysis + case-study writeups + talk integration. One student owner (former Owner A or B from `docs/evals/owner-briefs.md`, re-scoped — work expands from canned-fixture eval to multi-agent simulation) owns `packages/eval-sim/` engine + pilot + main run + aggregation. One external dependency: Bhawuk's ~1-hour review of the utility-LLM role prompt before Week 2.

**Timeline.** Week 1: lock the design doc — *done 2026-04-19, §17 signed off*. Week 2: build `packages/eval-sim/` + pilot — *engine + channels done as steps 1–4 above; pilot pending*. Week 3: main run + sensitivity analysis + human spot-check. Week 4: case studies + figures + docs integration.

**Cost.** Estimated $400–$1200 API budget depending on transcript verbosity. Approve before Week 3.

**Demo moment.** `pnpm eval:sim` prints the scenario × condition matrix to the terminal. `docs/evals/sim-bench-results.md` (auto-generated) drops into `docs/story.md` §6 as the empirical-results section. The honest-limits slide runs alongside.

**Why this matters.** Without this bench, the narrative is a system demo + substrate-property argument. With it, the research claim — *Grid Passport compresses the workflow, preserves more of the no-privacy-constraint outcome, and reduces on-record leakage simultaneously* — has numbers attached. Highest-leverage item for the research contribution; the substrate-metrics shipped already are the leading indicators and explanation.

**Relationship to superseded artifacts.** `docs/evals/rubric.md` (judge rubric base shape) and `docs/evals/owner-briefs.md` (prior 3-owner allocation) are not invalidated — the rubric's core (H-workflow / H-spec / H-trigger / H-null) is folded into §8d; the owner briefs need an addendum noting the re-scope. Keep both as historical artifacts until this bench ships; then move to an `archived/` subdirectory.

---

## Backlog — deferred, in rough priority

Stuff that's planned but not next. Each is one line. When something here gets promoted, expand it into the format above.

- **Notary Skill** — seals the private profile, computes audit anchors. Currently lives as logic in `audit.ts`; promote to a Skill once the Tauri app needs explicit user-confirmation for sealing.
- **Switchboard Skill (stretch)** — orchestrator. Per CLAUDE.md "no autonomous swarms" rule, this only ships if it can demonstrate clear value over the workflow-driven default. Not a current priority.
- **OPA WASM runtime** — replace TS mirror with WASM-compiled Rego. Engineering hygiene; canary covers drift today.
- **Regulator PDF export** — snapshot bundle + audit chain + policy as a single PDF for offline review. Useful when a real regulator partner shows up.
- **TS unit/integration test suite** — vitest for `forecast.ts`, `audit.ts`, `route.ts`. CLAUDE.md mandates tests for projection/policy changes; canary covers the privacy invariant but not the derivation correctness.
- ~~**Derivation transparency review (part 2)**~~ — shipped 2026-04-20. `mwMin/Max` now class-keyed tier bands (3 tiers split at flex=10% and flex=20%); `expectedPeakMW` now confidence-class-keyed tier bands (3 tiers split at conf=0.55 and conf=0.75); `firmnessScore` now quantized to nearest 5 (blurs the linear-combination inversion). All three use the many-to-one tier-band pattern established by `durationHoursMin/Max`. Mirror in TS + Python; web + privacy canary + desktop canary green.
- **Probabilistic forecaster** — replace linear formulas with a model emitting P10/P50/P90. Multi-week, needs partner data, not a hackathon item. Gated on a real utility partnership.
- **TEE for utility-side delegated verification** — Phase 5+. Only relevant if a utility wants to delegate bundle verification to a separate trust domain. GCP Confidential Space is the path. Not on critical path under local-first.
- **Multi-applicant aggregation** — MPC across applicants for joint demand-response bidding. Adjacent product, not core. Long-term.
- **Desktop packaging polish** — (a) branded icon from a real source (current one is upscaled placeholder); (b) narrow `fs:allow-read-text-file` / `fs:allow-write-text-file` scopes from `**` to user-selected dir + app data dir before distribution; (c) code signing on macOS (Developer ID + notarization) and Windows (Authenticode); (d) Windows MSI + Linux AppImage builds alongside macOS DMG; (e) auto-update plumbing. Unblocks distribution to real applicants — currently v0 ships unsigned, which means Gatekeeper friction on first open.

---

## Done

In landing order. Newest at top. PR/commit ref where relevant.

| Date       | Item                                                                                              | Ref       |
| ---------- | ------------------------------------------------------------------------------------------------- | --------- |
| 2026-04-20 | #14 sim-bench engine + pilot shipped, research-framing recalibration, derivation-transparency part 2 — (a) **Steps 6c + 6d + Amendments A-4/A-5/A-6** landed: 6c fairness dispatch (`runner.cartographer_mode_override` kwarg + `pilot.py --fairness` real loop); 6d scorer-over-ledger batch (`scripts/score_ledgers.py` — efficiency, mechanical H-null, direct T1+T2+T3, trace classifier, Prometheus judge with swap-augmentation). A-4 (token hygiene + H-null word-boundary, schema validator), A-5 (trace classifier prompt: raw-vs-derived + transmission-leg scope), A-6 (all LLM judges unified to Opus 4.7). 12-subset scored twice: pre- and post-A-5/A-6. **Key signal** (n=1 per cell, directional): D wins every cell on Prometheus median Likert (D=4.2 vs B=3.0, C=3.2, A=3.0); D is most stable under swap-augmentation (all 3 D cells max |Δ|=1, zero disagreed dimensions — B/C show privacy_integrity ambiguity); D=0 on H-null across all scenarios; post-A-5 trace classifier clean on all B/C/D, only A (Oracle) registers violations as pre-registered. S2_D anomaly fully resolved (WLS 2.08 → 0.00 under amended classifier). (b) **Research-framing recalibration** — softened "revelation-principle" / "structurally incapable" / "capability-based security" overclaims across research-thesis.md, story.md, agents.md, vision.md, CLAUDE.md, signed-bundle.md, rubric.md, sim-bench-design.md. §3.2 rewritten as non-amplification + asymmetric-verifiability (three-mechanism composition: cross-check for verifiable subset / proper-scoring-rule for unverifiable subset / non-amplification across both). §3.4 rewritten as object-capability pattern at validator layer (softer enforcement than kernel-mediated seL4). (c) **New living docs** — `docs/evals/sim-bench-results.md` (directional tables + Early-signal appendix), `docs/design/research-roadmap.md` (competitive-positioning snapshot + paired-lead recommendation + priority queue). Rewrote `docs/evals/owner-briefs.md` post-§17 with Day-1 orient + priority queue linking to student specs. (d) **Student-follow-on specs** at `docs/evals/specs/`: P1.2 strategic-misreport benchmark, P1.3 cross-check Referee Skill, P1.4 proper-scoring-rule calibration, CandidatePlan extraction. Each self-contained with goal + hypothesis + protocol + deliverables + rubric. (e) **Derivation transparency part 2** shipped: firmnessScore quantized to nearest 5; expectedPeakMW confidence-class-keyed tier bands (3 tiers); flexibilityPassport.mwMin/Max class-keyed tier bands. TS + Python mirrors. All 3 derived fields now use the many-to-one tier-band pattern established by durationHoursMin/Max. **Gates: 239 pytest + web typecheck + privacy canary + desktop canary + bundle gates all green.** | `ce38241` `b1aa3a9` `8ea8725` `6cd07ce` |
| 2026-04-19 | Simulation bench design + #14 re-scope — (a) `docs/evals/sim-bench-design.md` drafted as pre-registration document: four-condition multi-agent simulation (Oracle / NDA-email / Prompt-only AI / Grid Passport) × 6 applicant archetypes (Owl / Lantern / Kraken / First-timer / Adversarial / Multi-phase) × 5 seeds = 120 runs + 30 oracle + 240 judge runs; 5-category metrics (efficiency · outcome-preservation vs oracle · privacy leakage [direct/inferential/trace] · mechanical compliance · Opus-as-judge Likert+rationale); pre-registered success thresholds (OPR(D)−OPR(B) ≥ 0.20 · OPR(D)−OPR(C) ≥ 0.05 · N_trace_leaks(D) = 0 · Rounds(D) ≤ 0.5×Rounds(B)); four explicit falsification conditions; honest-limits table locked for talk-slide reuse; amendment protocol for post-lock edits. (b) Roadmap #14 re-scoped from "canned-fixture rubric-based eval" to "stakeholder-alignment simulation bench" — old 4-axis rubric folded into §8d mechanical-compliance axis, scored on live simulation turns instead of canned inputs. Prior `docs/evals/rubric.md` + `docs/evals/owner-briefs.md` remain as historical artifacts; noted as superseded. (c) Ownership split: hybrid — Ming owns scenario design + role prompts + rubric + analysis + writeup; one student owner builds `packages/eval-sim/` engine + runs pilot + main + aggregation. One external dependency: Bhawuk's ~1-hour utility-prompt review before Week 2. (d) Substrate metrics (shipped 2026-04-18) are the leading-indicator side; this bench is the behavioral side. Combined: leading-indicator metrics predict behavioral deltas → behavioral deltas land on the slide. | this session |
| 2026-04-18 | Substrate-metrics panel + HIPAA substrate-transfer demo + Tauri skills-loader — (a) **Substrate metrics** shipped: `packages/agents/scripts/compute_metrics.ts` measures every shipping Skill's context-cost delta, discovery-signal density, write-scope enforcement density, navigable-structure count, and mechanical-derivation discipline vs its prompt-only baseline. Outputs `packages/agents/metrics.md` (slide-source) + `metrics.json` (harness input). Drift-gated at `pnpm agents:metrics:check` (new gate 14). **Concrete numbers that land on the research slide:** three Skills across two domains all independently show −93.8% / −95.8% / −96.4% upfront context saving; 5–6 "never" clauses; 5–9 "halt" clauses; 2–12 "refuse" clauses; 3–4 contract-violations refused by paired validators; 11-URL source whitelist on Cartographer. The pattern replicating across three Skills in two domains is what lets these numbers support a *substrate* claim rather than a single-skill fluke. (b) **HIPAA substrate-transfer demo** — `.claude/skills/priorauth-interviewer/` (SKILL.md + REFERENCE.md + one worked example: cardiac-cath intake demonstrating pseudonymization-at-intake, non-coaching refusal on medical-necessity phrasing, out-of-scope refusal of appeal drafting). Same recipe as `gridpassport-interviewer`, entirely different schema + domain. Substrate claim is now methodological, not grid-specific. (c) **Baseline derivation generalized** — `export_prompt_only.ts` now takes a Skill name (or `--all`), produces per-Skill baselines; `pnpm agents:baseline` iterates the shipping roster. (d) **Tauri skills-loader** — `apps/desktop/src/lib/skills-loader.ts` reads bundled `.claude/skills/` from packaged resources at runtime via `@tauri-apps/api/path::resolveResource` + `plugin-fs::readDir`, returns `LoadedSkill[]` ready for the Claude Agent SDK integration. Parse + frontmatter-validation logic mirrors the baseline export script exactly, so runtime + baseline interpret Skills identically. `canary-desktop.ts` now parse-checks each shipping SKILL.md's frontmatter in CI; runtime loader cannot hard-fail on parse. (e) Doc updates: `docs/story.md` §6 (was placeholder; now carries the substrate-metrics table + behavioral-hypothesis wiring for #14) + §7 (HIPAA substrate-transfer proof) · `docs/design/research-thesis.md` §6a (new metrics slide-source) + §6 (HIPAA replication) · `docs/agents.md` §5a (three-Skill roster) · handoff architecture tree + §Now + gate list · `.claude/skills/README.md` roster. All 14 gates green. | this session |
| 2026-04-18 | Spec-compliant relocation + #8 Cartographer v0 + prompt-only research baseline + Tauri skill-bundling — (a) **Skills moved to `.claude/skills/<name>/`** per [agentskills.io](https://agentskills.io) / [Claude Code spec](https://code.claude.com/docs/en/skills); auto-discovered as `/gridpassport-interviewer` and `/gridpassport-cartographer` with live reload. Frontmatter tightened: `when_to_use` added with trigger phrases + explicit NOT-use-for lists pointing at sibling Skills. `.gitignore` narrowed to ship project-shared `.claude/skills/`, `.claude/agents/`, `.claude/commands/` while keeping `.claude/settings.local.json` ignored. (b) **Cartographer v0** — SKILL.md (write-scope = `publicEvidence` only; non-fabrication rule; source-whitelist enforcement; 6-check trust-constraint checklist) + SOURCES.md (endpoint registry whitelist: FEMA NFHL · VA DEQ air/water · county GIS for Loudoun/Prince William/Fauquier · VA Land Records · EPRI DCFlex · Dominion FIR · VA SCC fact sheet · Google DCFlex primary disclosure) + 3 canonical public-evidence transcripts (baseline + no-adjacent-context inference · multi-source-disagreement + stale-record marking · multi-topic source reuse + applicant-upload). Paired validator `packages/agents/cartographer/scripts/validate_publicevidence.ts` — 3+4 self-tests including provenance-whitelist enforcement (URLs not in SOURCES.md → contract violation). (c) **Prompt-only research baseline** as case-study artifact — `packages/agents/interviewer/scripts/export_prompt_only.ts` mechanically concatenates SKILL.md + REFERENCE.md + examples/*.md into a 32KB flat prompt at `packages/agents/interviewer/baselines/prompt-only.md`; content-hash header + drift gate (`pnpm agents:baseline:check`) fail CI if committed baseline doesn't match Skill source. Case-study framing + methodology + honest-limits list at `baselines/README.md`; research thesis §6b elaborates. Fair-comparison discipline is the research move: same content, different packaging, no hand-tuning advantage either side. (d) **Tauri skill-bundling** — `tauri.conf.json` adds `bundle.resources` mapping `../../../.claude/skills/**/*.md → skills/`; `canary:desktop` grows a skills-bundle guard that fails if a shipping Skill's SKILL.md is missing. (e) Two new root scripts: `pnpm agents:baseline` + `pnpm agents:baseline:check`. Two new gates (13 + the internal skills-bundle guard). Docs: research-thesis §6b · agents.md §5a + §7b · handoff architecture tree + §Now + gate list · CLAUDE.md research-framing reflex. All 14 gates green. | this session |
| 2026-04-18 | Research thesis doc + #7 Interviewer v0 scaffold — (a) `docs/design/research-thesis.md` as living single-source for the "schema is the safety case" framing (4 claims tied to literature gaps · per-agent write-scope table · 3 spin-out research questions · honest gap inventory of what #14 must measure · adjacent communities to cite). CLAUDE.md + handoff + memory wired to keep engaging with it. (b) `packages/agents/` workspace + Interviewer SKILL.md encoding write-scope contract (identity from prose · operational via numbered confirmation · sensitive only with competitive-sensitivity acknowledgment · never publicEvidence/derivedProof) + non-coaching rule + 5-check trust-constraint checklist. REFERENCE.md mirrors `@grid-passport/core/ask-reasons` by bucket. 3 canonical intakes (Owl Compute · Lantern Cloud · Kraken Train) each demoing a different contract edge: sensitive-bucket acknowledgment, write-scope refusal for volunteered public evidence, prose-to-number refusal under self-flattering prose. Structural + contract-violation validator via `pnpm agents:validate` (3 positive + 3 negative self-tests); new `pnpm agents:typecheck`. All 12 gates green. | this session | 
| 2026-04-18 | Signed-bundle protocol · Rust signing parity + keychain round-trip — (a) **`gp-sign` standalone Rust binary** at `apps/desktop/src-tauri/src/bin/gp-sign.rs` — reads payload + secret, JCS-canonicalizes via `serde_json_canonicalizer`, signs with `ed25519-dalek`, emits full bundle envelope to stdout. Proves the exact Rust crypto primitives used by the Tauri app produce verifier-compatible output. (b) **Keychain unit test** in `signer.rs::tests::mock_keyring_roundtrip` — uses `keyring::mock::default_credential_builder()` to drive the *real* production code path (generate → persist → reload → sign → verify) without touching the user's OS keychain. Required a small refactor to cache Entry via `OnceLock` (also a prod perf improvement — one keychain handle, not one per sign call). (c) **Roundtrip extended to 3-way** — `scripts/demo-bundle-roundtrip.sh` now has 10 stages: TS-sign + TS-verify + Py-verify + tamper-reject + Rust-sign + TS-verify + Py-verify + tamper-reject. `pnpm canary:roundtrip` runs the whole thing in ~6s. (d) **Public surface updated** — landing "verifiable protocol" tile now reads "TS ⇌ Rust ⇌ Python agree"; /protocol page adds a `pnpm desktop:test` block explaining the keychain unit-test; /about telltale adds `ts⇌rust⇌py · 3-way parity` and `keychain round-trip · rust unit test` lines; spec doc §6.4 has a signer×verifier matrix. (e) **New gate: `pnpm desktop:test`** wired into root scripts. All 10 gates green: web typecheck, privacy canary, desktop typecheck, desktop canary, core tests (9 RFC 8785), verifier tests (11 incl. 2000-fuzz), bundle canary (3 cases), 3-way roundtrip, desktop keychain test, cargo check. | this session |
| 2026-04-18 | Signed-bundle protocol · verification evidence + public surface — (a) **RFC 8785 conformance**: official Erdtman/IETF test vectors bundled under `packages/core/test-vectors/rfc8785/` (arrays, french, structures, unicode, values, weird — the last exercises UTF-16 code-unit sort across BMP + supplementary planes/emoji surrogate pairs); `pnpm core:test` runs all 6 through our JCS, byte-for-byte match. (b) **Fuzz test**: `packages/verifier/src/fuzz.test.ts` — 2000-iteration random byte-flip inside payload region; verifier rejects every mutation (0 false positives). (c) **Python reference verifier**: `apps/verifier-py/grid_passport_verifier.py` — single-file ~250 LoC, PyCA cryptography + stdlib only, inline JCS with UTF-16 code-unit ordering; README with usage + roundtrip instructions. (d) **E2E roundtrip script**: `scripts/demo-bundle-roundtrip.sh` + `pnpm canary:roundtrip` — TS signs bundle → TS verifier ok → Python verifier ok → tamper → both reject. Single command reproduces the stage demo. (e) **Normative spec**: `docs/design/signed-bundle-spec.md` — RFC 2119 conformance language, wire format, sign/verify algorithms step-by-step, canonical test vectors, conformance checklist for new implementations, versioning policy, reproducibility commands. Complements `signed-bundle.md` (rationale) + `signed-bundle-spec.md` (normative) pair. (f) **Public surface**: new `/protocol` page at `apps/web/app/protocol/page.tsx` — threat model digest (T1–T6), primitives table with citations, "verify it yourself" copy-pastable command block, 60-second stage demo script, doc cross-links; navigation updated on landing + footer + `/about` header. (g) **Reliability triad telltale extended** in `/about` §4 — adds RFC 8785 vectors / tamper fuzz / TS↔Py parity / bundle canary lines next to the existing privacy canary stats. All gates green. | this session |
| 2026-04-18 | Signed disclosure bundle protocol v1.0.0 (#6) — (a) `docs/design/signed-bundle.md` — threat model (T1–T6), 8 design decisions (JCS canonicalization per RFC 8785, Ed25519 signatures, embedded-proof model per W3C VC Data Integrity, long-lived key in OS keychain, hash-chain audit per Crosby & Wallach USENIX 2009, dual policy-hash binding, semver schema, zero-dep library choices), bundle schema, sign/verify algorithms, deferred items (revocation/expiry/multi-sig/PQ), post-quantum migration path, 10-Q demo defense, full references. (b) `packages/core/src/crypto.ts` — inline RFC 8785 JCS (faithful to Erdtman's reference), WebCrypto SHA-256, base64/hex helpers. (c) `packages/core/src/audit.ts` — async WebCrypto migration (drops `node:crypto`), added `seq` + `prevHash` chain linkage; callers in web + privacy-canary awaited. (d) `packages/core/src/bundle.ts` — v1.0.0 schema (`BUNDLE_SCHEMA` + `BUNDLE_VERSION`), `BundleSigner` interface, `signBundle()`, `localSigner()`, `newBundleId()` (ULID-style). (e) `packages/verifier/` — new workspace package, zero-framework deps, `verifyBundle(bytes, pubkey)` ~300 LoC single file, CLI at `bin/verify.js`. (f) `apps/desktop/src-tauri/src/signer.rs` — `keyring` crate + `ed25519-dalek` v2; two Tauri commands (`applicant_public_key`, `applicant_sign`); private key stored in macOS Keychain / Windows Credential Manager / Linux Secret Service, never crosses IPC. (g) `apps/desktop/src/lib/signer.ts` + `bundle.ts` — `tauriSigner()` wires Tauri IPC into `BundleSigner`; desktop export now produces a signed v1 bundle with JCS-canonicalized payload + Ed25519 signature + chained audit trail. (h) 10 tamper-detection tests in `packages/verifier/src/index.test.ts` (T1 projection / T2 key substitution / T3 policy / T4 audit-chain mutations / T4b prevHash break / schema drift / malformed JSON / keyId fingerprint). (i) `pnpm canary:bundle` end-to-end script: sign → verify → tamper → reject across all 3 cases. All six checks green: web typecheck, privacy canary, desktop typecheck, desktop canary, bundle canary, verifier tests (10/10). | this session |
| 2026-04-18 | Desktop UX reframe + schema-justification doc — (a) two-mode desktop: default "work" view = single applicant column (filling); "review disclosure →" gates the three-column comparison (YOU / UTILITY SEES / REGULATOR SEES) + export terminus. Fixes conflation of "demo framing" with "stakeholder-centric workflow" — the three-panel view is the applicant's pre-export review, not a multi-user dashboard. (b) Schema-justification section added as `docs/vision.md` §4b — the 5-test filter (utility-need traceable · asymmetric knowledge · business-answerable · discriminating · demo-legible) with tier assignments per field + commitment to Interviewer owning squishy fields. (c) `packages/core/src/ask-reasons.ts` hoisted as single-source for per-field "why we ask" narratives + bucket labels (identity / operational / sensitive / evidence / computed); desktop UI renders as ⓘ tooltips on every row; tier-based sub-sections in `ProjectionSections`. (d) Talk-arc story.md §5a cross-refs vision §4b. All 4 checks green. | this session |
| 2026-04-18 | Tauri shell v0 — everything else under item #4 (Steps 3–7): Tauri `plugin-dialog` + `plugin-fs` registered (capabilities scoped `**` for dev; narrow in packaging polish). `apps/desktop/src/lib/case-loader.ts` opens JSON with structural validation over `CaseInput`. `apps/desktop/src/lib/bundle.ts` writes `DisclosureBundle@0.0.1-v0` (projections + policyVersion + timestamp; audit chain + Ed25519 signing deferred to #6, flagged in an explicit `note` field). Three-column side-by-side review screen under `apps/desktop/src/components/`: `ReviewColumn` × `MiniBenefit` × `ProjectionSections`, role-tinted (applicant sky / utility amber / regulator lime). Vanilla CSS with the established tokens — Tailwind on desktop deferred until `packages/ui/` hoist is triggered. `pnpm canary:desktop` (new) asserts (a) desktop imports `@grid-passport/core` and (b) projection invariant holds for 3 cases × 3 roles. `cargo tauri icon` ran on placeholder PNG; unsigned macOS DMG produced. Web typecheck + desktop typecheck + privacy canary + desktop canary + desktop vite build all green. | this session |
| 2026-04-18 | Tauri scaffold (#4 Step 1) — new `apps/desktop/` workspace with Vite 7 + React 19 + TS frontend + Tauri 2.10.3 Rust core (`grid-passport-desktop` crate, identifier `app.gridpassport.desktop`, window 1180×760). v0 `App.tsx` imports `@grid-passport/core` in the webview and renders `projectForRole(buildRecord(case), role)` for case × role. Root scripts: `pnpm desktop:dev/build/typecheck`. Frontend-stack decision resolved in favor of A (Vite) over B (Next.js static-export). | this session |
| 2026-04-18 | Landing page v1 — rewrote `apps/web/app/page.tsx` with hero (problem-first "AI compute wants to plug in"), static BenefitPanel teaser (Owl Compute × utility), 3 pain-point cards from new `lib/pain-framings.ts`, crew strip from new `lib/team.ts`, desktop-app CTA, footer with repo link. New `/downloads` placeholder page. Typecheck + canary pass. | `fd1897c` |
| 2026-04-18 | Eval-harness owner briefs — `docs/evals/owner-briefs.md` with per-owner (A/B/C) acceptance, dependencies, escalation path, and open-question defaults. Unblocks students to start against the approved rubric. | this session |
| 2026-04-18 | Decision sweep — license (AGPL v3), landing-page BenefitPanel teaser (yes, Owl Compute canonical), Interviewer LLM routing (host via Claude Code session / Agent SDK; no API-key UX), first utility partner (Dominion via Bhawuk), and eval rubric approved + promoted to `docs/evals/rubric.md` with expanded axis-C voice specs + pilot→bucket free-text workflow. Decision log now empty. | this session |
| 2026-04-18 | `packages/core/` hoist — moved the pure projection layer (types, policy, projection, forecast, audit, fixtures, geo) from `apps/web/lib/` to `packages/core/src/` as `@grid-passport/core` with subpath exports. `policy-source.ts` stays in `apps/web/lib/` (cwd-dependent, web-only). 11 files `git mv`ed, 23 consumer files rewritten (perl). `transpilePackages: ["@grid-passport/core"]` added to `next.config.ts`. Prep for the Tauri scaffold — desktop app will import the same projection code unchanged. typecheck + canary + `pnpm build` all pass. | this session |
| 2026-04-18 | Derivation-band fix for `flexibilityPassport.durationHoursMin/Max` — replaced `max(2, bessHours)` identity with a coarse tier band (`[2,4]` / `[4,8]` / `[8,12]`) in `packages/core/src/forecast.ts` and `apps/api/gridpassport/forecast.py`. Observer can no longer invert the published band to the exact private `bessHours`. Canary + typecheck both pass. | this session |
| 2026-04-18 | Decision fold — Tauri bundle format → JSON (folded into item #4); agent packaging → local SDK on desktop, hosted API on web demo (folded into items #7/#8/#13). Decision log slimmed from 9 to 6 open entries. | this session |
| 2026-04-18 | Privacy Benefit Panel (`apps/web/components/BenefitPanel.tsx`) — three live metrics (competitive fields exposed / derived proofs released / regulator-auditable redactions) + role-aware trust framing + policy version chip. Replaces `LeakCounter`. Helpers `PRIVATE_FIELD_COUNT` / `DERIVED_FIELD_COUNT` / `countPrivateVisibleTo(role)` added to `lib/policy.ts` for reuse. | this session |
| 2026-04-18 | Story doc (`docs/story.md`) — research narrative used both for public presentations and the website /about page. Vision §5b reliability triad + §5c agents-propose-humans-dispose. Agents §7 expanded with concrete eval N-targets, baselines, and student-handoff task breakdown. Roadmap: Tauri decision resolved with design direction, Story page added to current sprint as #5, eval harness promoted from backlog to near-term as #14. | this session |
| 2026-04-18 | Agent architecture doc (`docs/agents.md`) — trust principles, agent roster, Claude Agent Skills implementation, calibration research connection. Vision §0 team section + §10 web-as-landing-page reframe. Roadmap landing-page item + Skills-based agent track elevated. | this session |
| 2026-04-18 | Master plan doc (`docs/plans/roadmap.md`) — current sprint, near-term, backlog, decision log. Vision §12 + handoff Open items slimmed to point to it. | this session |
| 2026-04-18 | Vision + trust-model pivot doc (`docs/vision.md`); local-first architecture decision; handoff updated | this session |
| 2026-04-18 | Privacy canary (`pnpm privacy:canary`) — structural + audit-action scan + TS↔Rego↔Python drift; audit baseline-flex leak fixed; `docs/privacy-claim.md` | this session |
| 2026-04-17 | Vercel deploy live at https://grid-passport.vercel.app                                            | `d75a087` |
| 2026-04-17 | Git init + private GitHub push                                                                    | `03d8b57` |
| 2026-04-17 | MapLibre evidence panel, signed audit trail with 5 named actors                                   | Phase 2   |
| 2026-04-17 | Server-side projection · Rego canon · regulator panel · FastAPI parity                            | Phase 1   |
| 2026-04-17 | Three case studies, counterfactual slider, deterministic forecaster                               | Phase 0.5–0.6 |
| 2026-04-17 | Next.js scaffold, dual-view role toggle, sealed placeholders                                      | Phase 0   |

---

## Decision log — open questions awaiting your input

These are things I shouldn't decide unilaterally. Each one is blocking a roadmap item or has architectural consequence. When a decision lands, fold the resolution into the relevant item and remove the log entry.

*(No open entries — all resolved 2026-04-18. Add new ones here as they arise.)*

### Resolved this session

- ~~**Frontend-stack decision for Tauri (#4 Step 1)**~~ → **Vite + React + TS** in a new `apps/desktop/` workspace, not reusing `apps/web/` via static-export. Reasons: Tauri expects SPA (not SSR) so the Next.js server components + `/api/scenario` route would need to be unwound; static-export of a pnpm-workspaced Next.js app has known rough edges; a fresh Vite frontend keeps the binary small and the dev loop fast, and the projection layer is already pure TS in `packages/core/` so no reuse is lost. Folded into item #4 Step 1.
- ~~**`packages/ui/` hoist timing**~~ → **Scaffold first, hoist later.** Duplicate only the components the side-by-side screen actually needs, and hoist once we know the final set. Prevents premature abstraction.
- ~~**License choice (#2)**~~ → **AGPL v3.** Forces utility forks to publish changes; trust-story alignment over adoption friction. Folded into item #2.
- ~~**Embed Privacy Benefit Panel on landing page (#3)?**~~ → **Yes, static teaser with Owl Compute as canonical case + CTA into `/demo/owl-compute`.** Folded into item #3.
- ~~**Story page URL — `/about` vs `/story`**~~ → **`/about`.** v1 shipped 2026-04-18 under `/about`; URL sticks.
- ~~**Interviewer LLM call routing (#7)**~~ → **Run inside a Claude Code session or against the Claude Agent SDK; no direct Anthropic-API key management in either surface.** The host session is the LLM transport. Desktop ships with an SDK-backed fallback for non-Claude-Code users. Folded into item #7.
- ~~**LLM-judge rubric for human-preference eval (#14)**~~ → **Approved 2026-04-18.** Axis C voices expanded with good/bad examples per role; free-text uses pilot→bucket workflow (raw for first 20, then Owner A promotes recurring themes to buckets); 3-case fixture set stays for v1 (add a 4th only if inter-rater variance is case-dominated). Rubric promoted to `docs/evals/rubric.md`.
- ~~**First utility partner (#6 / Signed Bundle)**~~ → **Dominion via Bhawuk.** Ming's relationship work; lean on Bhawuk's existing Dominion affiliation rather than waiting for the bundle protocol to harden. Co-design the on-wire format with the Dominion intake team from day one.
- ~~**Tauri bundle file format**~~ → **JSON** for v0; `.gpcase` wrapper deferred to Phase 5+. Folded into item #4 Steps #3.
- ~~**Agent packaging route (#7/#8/#13)**~~ → **Local SDK on desktop, hosted API on web demo.** SKILL.md is the single source of truth; cross-surface copy/upload, not shared runtime. Cartographer is the one surface-specific case (web demo uses a pre-fetched evidence cache because the hosted API runtime has no outbound network). Folded into items #7, #8, #13.
- ~~**Privacy Benefit Panel — replace LeakCounter or sit alongside (#1)?**~~ → **Replace.** Shipped 2026-04-18.
- ~~**Should the Tauri app be the *only* form?**~~ → Resolved (`docs/vision.md` §10): web demo *and* desktop app coexist with explicit roles. Web is the public landing/teaching artifact; Tauri is the production form.
- ~~**Tauri vs Electron vs PWA**~~ → Resolved: Tauri 2.x. Rationale folded into roadmap item #4.
- ~~**Skills calibration eval cadence — batch or ship-alongside?**~~ → Resolved: ship eval scaffolding *alongside* the first Skill (#7 Interviewer), so each Skill is measured as it lands rather than waiting for all three. Promoted from backlog to near-term as item #14.
- ~~**Talk timing vs eval completion**~~ → Resolved: no time pressure. Build the eval harness properly; the talk waits for real results. Quality over speed for this project.
- ~~**Hackathon end date / pitch milestone**~~ → Resolved: same — take the time we need.

---

## What this doc is *not*

It is not a Gantt chart. It is not a status report. It is the answer to "if I sat down for a day, what would I work on, and how would I know I was done?"

Keep entries terse. When something ships, move it to Done. When a decision lands, fold it into the relevant item and clear the log entry.
