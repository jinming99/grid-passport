# Grid Passport — Roadmap

> The master plan. What's shipping next, in what order, with mechanical "done" criteria.

This is the single source of truth for "what are we building?" `docs/vision.md` answers *why*; `docs/privacy-claim.md` answers *how the privacy mechanism works*; `docs/plans/handoff.md` answers *what's the current state and what's already decided*. **This doc is the playbook.**

When something here ships:
- Move it from "current sprint" or "near-term" to "done" with the landing date and PR/commit ref.
- Bump anything that became unblocked into "current sprint."
- If a decision in the decision log got resolved, move the resolution into the relevant item and delete the entry.

---

## Current sprint — next ~2 weeks

Five items — **#2 is parked this sprint** (repo stays private for now). The four active items parallelize cleanly:
- **#1 Privacy Benefit Panel**, **#3 Landing page**, **#5 Story page** are independent web work.
- **#4 Tauri shell** is the longer pole; starts as soon as #1 lands (the side-by-side review screen reuses the Privacy Benefit Panel component).

With three developers (Ming Jin, Bhawuk Luthra, Vikrant Bhati), the four web items run concurrently while #4 takes the bulk of one developer's time. Sprint duration is gated by Tauri shell.

**Parallel pre-talk track.** Item **#14 (Eval harness, near-term §14)** is flagged pre-talk priority and runs on its own 2–3 week elapsed timeline with three student owners — see §14 for owner allocation. It's deliberately outside the current-sprint numbering because it's a research-track effort that doesn't need sprint-level daily attention, but it should start *now* alongside sprint work. Ming's only blocking input is rubric authoring for the LLM-judge by end of week 1 (see decision log #8).

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

> The talk-arc lives on the website. Demo-day walkthrough is a scroll, not a slide deck. Doubles as public-facing material.

**Goal.** A new route at `/about` (or `/story`) that renders `docs/story.md` as a polished long-scroll page. Same content used for Ming's job talk and the website. Single source so the two cannot drift.

**Why now.** Demo day uses this page as the live walkthrough. The job talk pulls from the same source. The eval results (when they land from #14 below) update one place and propagate to both. Pre-talk, this page is also the artifact a visitor reads to understand "why does this exist?" without a stage presence.

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

**Demo moment.** On demo day, walk the audience through `/about` end-to-end. Click the embedded role-toggle teaser, click into a case study, scroll back, show the canary status, scroll to the team. The scroll IS the talk.

**Decisions needed.**
- `/about` vs `/story` URL — recommendation: `/about` because it's conventional and SEO-discoverable; reserve `/story` for a playful name later if needed.
- Markdown source: copy `docs/story.md` into `apps/web/app/about/` at build time, or read directly via `fs.readFile`? Recommendation: read directly — single source of truth.

**Dependencies.** Story doc itself is shipping with this session (`docs/story.md`). Open-source the repo (#2) ideally before this lands so links resolve publicly. Eval harness (#14) needed to fill the §6 placeholder, but the page can ship before with a "coming soon" placeholder.

---

## Near-term — next ~4–6 weeks after current sprint

Items in priority order. Each is one paragraph; full breakdown when promoted to "current sprint."

### 6. Signed disclosure bundle protocol (~3–5 days)

Define the on-wire format (JSON Schema) for the bundle: `{projection, auditChain, policyHash, applicantSig}`. Pick a signature scheme (recommendation: Ed25519 — small keys, fast, modern). Ship the signer in the Tauri app and a 200-line standalone verifier library (TypeScript first; Python parity if FastAPI worker stays alive). **Demo moment:** export a bundle from the Tauri app, verify it from a separate process / browser tab, tamper one byte, watch verification fail.

### 7. Interviewer agent — first Claude Skill (~3–5 days)

> Trust + human-collaboration anchor; first agent shipped as a Claude Agent Skill.

Natural-language form filling: applicant types "We're planning a 180 MW campus in Prince William, target COD October 2028, two phases" and the agent populates the structured `CaseInput`. Implemented as a [Claude Agent Skill](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) — `packages/agents/interviewer/SKILL.md` with frontmatter, a `REFERENCE.md` for field schemas, an `examples/` directory with NL→CaseInput pairs, and a `validate_caseinput.ts` script. **Trust constraint baked into the skill body:** never invents private values; always asks the user for ambiguous fields; writes only to fields the user explicitly approves. **Why first:** highest UX-wedge value for early adopters (it's the first thing a user touches), and the cleanest place to test the calibration thesis from `docs/agents.md` §6 — does an explicit-constraint Skill produce more workflow-aligned behavior than the same prompt without the Skill packaging? **Packaging (decided):** SKILL.md is the single source of truth. The desktop build invokes it locally via the Claude Agent SDK (raw inputs stay on-device); the web demo uploads the same SKILL.md to the Claude API for hosted execution. Cross-surface SKILL.md sync is a copy-from-source operation, not a shared runtime.

**LLM call routing (decided 2026-04-18):** no direct Anthropic-API key management in either surface. The desktop app expects to run *inside a Claude Code session* (or against the Claude Agent SDK when running headless) — the host session is the LLM transport. The web demo uses the same SDK path server-side. Upside: zero API-key UX for applicants, no key-rotation burden, and the trust story stays "this runs on your machine" rather than "this phones home to a vendor you configured." Downside: applicants who aren't Claude Code users need an SDK-backed fallback packaged with the desktop build — scope that as part of item #7.

### 8. Cartographer agent — second Claude Skill (~3–5 days)

> Public-evidence fetcher; second agent in the Skills track.

Auto-fetches public evidence: VA DEQ permits index, FEMA NFHL flood overlay, county zoning data, parcel records. Implemented as a Skill at `packages/agents/cartographer/` with bundled fetch scripts and a `SOURCES.md` registry. Packaging follows the #7 convention: local-SDK on desktop, hosted-API on the web demo. Cartographer is the one case where the two surfaces behave differently — the hosted API runtime has no outbound network, so on the web demo we fall back to a pre-fetched evidence cache (labeled "cache, not live"). Composable with the Interviewer — Interviewer extracts site location → Cartographer fetches evidence for that location. Each fetch labeled with source URL + timestamp. **Trust constraint:** writes only to `publicEvidence` section; cannot touch `privateProfile`. **Calibration angle:** does the Skill maintain domain-spec compliance (correct DEQ tier classifications, FEMA flood zone codes) when the upstream sources change format?

### 9. Real Flex MOSAIC schema (~2–3 days)

Replace the `responseClass: "A" | "B" | "C"` ordinal bucket with EPRI's published MOSAIC multi-axis descriptor (magnitude / timing / duration / frequency). Gated on EPRI publishing the v1 schema in a stable form — currently in voluntary-adopter phase. Once they publish: 2-3 days to swap the type, update the forecaster, add the canary check. **Watch:** [dcflex.epri.com/flex-mosaic](https://dcflex.epri.com/flex-mosaic).

### 10. Pain-first case framing in the demo header (~1 day)

Each case study currently shows `displayName · MW · county`. Add a one-line pain framing per case (drawn from `docs/vision.md` §8) so the visitor sees *why this case matters* before clicking through projections. Owl Compute → "hyperscaler vs roadmap exposure"; Lantern Cloud → "applicant in genuine permit trouble"; Kraken Train → "flexibility commitment without exposure". Small UX item, high pedagogical lift. Pulls from `lib/pain-framings.ts` — same source as the landing page (#3) so the two stay in sync.

### 11. Utility-side example application (~3–5 days)

A second tiny app (could be a CLI, could be another desktop window) that simulates what a utility intake portal would do: receives a signed bundle, verifies signature + policy hash, renders the utility projection. Proves the protocol composes with existing utility infrastructure. **Demo moment:** export bundle from applicant Tauri app → drop into utility CLI → see the utility's view. End-to-end, no network in between.

### 12. Self-review trust panel in the desktop app (~1–2 days)

Inside the Tauri app, a persistent "trust" panel that shows: "this app makes 0 network calls during projection", "your raw inputs are at `/path/to/your/file.json`", "the bundle you're about to export is `<hash>` and contains 0 raw private fields". Bakes the trust story into the UX itself, not a separate doc.

### 13. Explainer agent — third Claude Skill (~3–5 days)

> Role-conditional narration; the human-preference-alignment exemplar.

Generates plain-English narration of a `ProjectedView`, conditioned on the requesting role. Implemented as a Skill at `packages/agents/explainer/` with a `ROLE_VOICES.md` resource describing how to address applicants vs utilities vs regulators. Packaging follows the #7 convention: local-SDK on desktop, hosted-API on the web demo. **Trust constraint:** consumes only `ProjectedView`, never the raw `CaseInput` — by construction cannot leak. **Calibration angle:** does the Skill produce role-appropriate prose that scores well against a graded human-preference rubric (per `docs/agents.md` §6b)? This agent is the cleanest evaluation target for the human-preference-alignment dimension of the research.

### 14. Eval harness for agent Skills — *promoted from backlog; pre-talk priority* (~2–3 weeks elapsed; parallelizable across 2–3 owners)

> The empirical-results slide for Ming's job talk. Without this, the methodology claim has no numbers. With it, the talk has a 4×3 score matrix + baseline delta.

Build the harness described in `docs/agents.md` §7 (just expanded with concrete N-targets and a student-handoff task breakdown). Output: per-Skill JSON results + a markdown summary table that drops directly into the talk and into `docs/story.md` §6.

**Targets.** Role-leakage (N=60), workflow alignment (N=20 per Skill = 60 total), human-preference alignment (N=60), domain-spec compliance (N=20). Approximately 200 evaluations on the eval grid. Plus a prompt-only baseline for each Skill, run on the same grid, for the comparison delta.

**Owners.** Per `docs/agents.md` §7c — three-owner allocation: Owner A on eval scaffolding + analysis (weeks 1, 3); Owner B on Interviewer Skill + workflow eval (weeks 1–2); Owner C on Cartographer Skill + domain-spec eval (week 2); Owner A or B on Explainer Skill + human-preference eval (weeks 2–3). Single blocker that needs Ming: rubric authoring for the LLM-judge (week 1, end-of-week).

**Demo moment.** Run `pnpm eval:agents`. Output prints the score matrix in the terminal. The markdown summary file is the talk slide.

**Why pre-talk.** Without empirical results, the talk is a system demo, not a research talk. With them, the methodology claim ("Skill-as-substrate beats prompt-only on workflow / spec alignment") has a number attached. Highest-leverage item for the research positioning.

---

## Backlog — deferred, in rough priority

Stuff that's planned but not next. Each is one line. When something here gets promoted, expand it into the format above.

- **Notary Skill** — seals the private profile, computes audit anchors. Currently lives as logic in `audit.ts`; promote to a Skill once the Tauri app needs explicit user-confirmation for sealing.
- **Switchboard Skill (stretch)** — orchestrator. Per CLAUDE.md "no autonomous swarms" rule, this only ships if it can demonstrate clear value over the workflow-driven default. Not a current priority.
- **OPA WASM runtime** — replace TS mirror with WASM-compiled Rego. Engineering hygiene; canary covers drift today.
- **Regulator PDF export** — snapshot bundle + audit chain + policy as a single PDF for offline review. Useful when a real regulator partner shows up.
- **TS unit/integration test suite** — vitest for `forecast.ts`, `audit.ts`, `route.ts`. CLAUDE.md mandates tests for projection/policy changes; canary covers the privacy invariant but not the derivation correctness.
- **Derivation transparency review (part 2)** — `flexibilityPassport.durationHoursMin/Max` was fixed 2026-04-18 (coarse BESS tier bands). Remaining work: audit `mwMin/Max` (monotone-invertible from `flexPercent` given public `requestedMW`), `firmnessScore` (components weighted from private inputs), and `expectedPeakMW` for the same "observer can invert the derivation" class of leak. Settle on a shared band-design pattern so every derived field is many-to-one.
- **Probabilistic forecaster** — replace linear formulas with a model emitting P10/P50/P90. Multi-week, needs partner data, not a hackathon item. Gated on a real utility partnership.
- **TEE for utility-side delegated verification** — Phase 5+. Only relevant if a utility wants to delegate bundle verification to a separate trust domain. GCP Confidential Space is the path. Not on critical path under local-first.
- **Multi-applicant aggregation** — MPC across applicants for joint demand-response bidding. Adjacent product, not core. Long-term.
- **Desktop packaging polish** — (a) branded icon from a real source (current one is upscaled placeholder); (b) narrow `fs:allow-read-text-file` / `fs:allow-write-text-file` scopes from `**` to user-selected dir + app data dir before distribution; (c) code signing on macOS (Developer ID + notarization) and Windows (Authenticode); (d) Windows MSI + Linux AppImage builds alongside macOS DMG; (e) auto-update plumbing. Unblocks distribution to real applicants — currently v0 ships unsigned, which means Gatekeeper friction on first open.

---

## Done

In landing order. Newest at top. PR/commit ref where relevant.

| Date       | Item                                                                                              | Ref       |
| ---------- | ------------------------------------------------------------------------------------------------- | --------- |
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
| 2026-04-18 | Story doc (`docs/story.md`) — talk-arc narrative used both for Ming's job talk and the website /about page. Vision §5b reliability triad + §5c agents-propose-humans-dispose. Agents §7 expanded with concrete eval N-targets, baselines, and student-handoff task breakdown. Roadmap: Tauri decision resolved with design direction, Story page added to current sprint as #5, eval harness promoted from backlog to near-term as #14. | this session |
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
