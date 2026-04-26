// Single source of truth for the /hackathon route.
// Mirrors sous-chef's data.json shape so the structure carries across.
// Fields marked TODO are placeholders we'll fill together block-by-block.

export type PipelineStage = {
  tag: string;
  kind: "agent" | "policy" | "bundle" | "verifier" | "forecast";
  line: string;
  ts: string; // HH:MM:SS
  meta?: string; // small right-aligned chip (e.g. "3s · $0.18 · accepted")
};

export type Agent = {
  slug: string;
  name: string;
  domain: "grid" | "hipaa";
  contract: "write" | "read";
  writes: string;
  reads: string;
  glyph:
    | "passport-seal"
    | "map-cartograph"
    | "scroll-unrolled"
    | "stethoscope-wave"
    | "forecast-bands"
    | "refereeing-scale";
  quote: string;
  accent: string; // hex, used for card accent
};

export type CaseResult = {
  slug: string;
  codename: string;
  kind: string; // hyperscaler / cautious / flex-forward
  mw: number;
  county: string;
  oprDelta: number;
  regretMax: number;
  hNullLeakage: number;
  headline: string;
  verdict: "clears" | "flat" | "borderline";
};

export type Diagram = {
  title: string;
  ascii: string;
  caption: string;
  codeLink: string;
};

export type CanaryGate = {
  id: string;
  name: string;
  enforces: string;
};

export type ProblemSource = {
  agency: string;   // ERCOT, PJM, NERC, NREL, DOE, Entergy, Google Cloud
  document: string; // "2025 Long-Term Hourly Forecast"
  quote: string;    // verbatim quote
  url?: string;     // resolved later; placeholder meanwhile
};

export type Problem = {
  id: string;                                    // "01" .. "06"
  headline: string;
  bucket: "infra" | "coord";
  effect: string;                                // L2 · plain-English one-liner
  sources: ProblemSource[];                      // L3 · 1–3 verbatim quotes
  core: string;                                  // L4 · problem-specific punch line
  coverage: "full" | "partial" | "none";
  coverageNote: string;                          // one-sentence explainer
};

export type BucketSpec = {
  label: string;          // "INFRASTRUCTURE" | "COORDINATION"
  role: string;           // "hands-off" | "where GP sits"
  body: string;           // multi-line description
  count: number;          // 1 vs 5
  tone: "neutral" | "primary";
};

export type SolutionPillar = {
  glyph: "shield" | "brain" | "bolt";
  title: string;
  tag: string;             // one-line subtitle
  bullets: string[];
};

export type DocMapNode = {
  id: string;
  label: string;
  kind: "applicant" | "evidence" | "regulator" | "platform" | "utility" | "audit";
  x: number;                // 0..800 in viewBox
  y: number;                // 0..360 in viewBox
};

export type DocMapEdge = {
  from: string;
  to: string;
  label?: string;
};

export type DocumentMap = {
  title: string;
  tag: string;             // "[NEW · visualization layer]"
  pitch: string;           // 1-2 sentence pitch
  ingests: { heading: string; items: string[] };
  visualizes: { heading: string; items: string[] };
  roles: { label: string; filter: string }[];
  nodes: DocMapNode[];
  edges: DocMapEdge[];
};

export type SolutionSpec = {
  headline: string;
  subhead: string;
  pipeline: { from: string; middle: string; to: string };
  pillars: SolutionPillar[];
  documentMap: DocumentMap;
};

export type DemoStage = {
  id: "intake" | "seal" | "verify";
  number: string;             // "01" · "02" · "03"
  app: string;                // short app name
  subtitle: string;           // one-line tag
  role: string;               // who runs this app
  tone: "cyan" | "amber" | "lime";
  features: { heading: string; items: string[] };
  technical: { heading: string; items: string[] };
  output: string;             // final artifact / outcome
  trust: string[];             // small trust chips at the bottom
};

export type DemoSpec = {
  headline: string;
  subhead: string;
  scenario: {
    codename: string;         // "Owl Compute"
    context: string;          // "180 MW training campus · Prince William, VA"
    ask: string;              // applicant's ask in one line
  };
  stages: DemoStage[];
};

export type HackathonData = {
  tagline: string;
  theme: string; // hackathon track framing
  stats: {
    agentsShipped: number;
    contextSavingsPct: number; // e.g. 93.8
    canaryGates: number;
    crossLangVerifiers: number;
  };
  heroTerminal: PipelineStage[];
  agents: Agent[];
  cases: CaseResult[];
  ab: {
    baseline: {
      label: string;
      turns: number;
      days: number;
      rawLeakage: string;
    };
    gridPassport: {
      label: string;
      turns: number;
      days: number;
      rawLeakage: string;
    };
    seedNote: string;
    quote: string;
  };
  diagrams: Diagram[];
  canaryGates: CanaryGate[];
  infrastructure: {
    heading: string;
    body: string;
    stack: { label: string; detail: string }[];
  };
  tryIt: {
    prereqs: string;
    commands: string;
  };
  problemsHeadline: string;
  problemsInsight: string;        // "raw demand ≠ planning-ready demand"
  buckets: {
    infra: BucketSpec;
    coord: BucketSpec;
  };
  problems: Problem[];
  solution: SolutionSpec;
  demo: DemoSpec;
};

export const HACKATHON_DATA: HackathonData = {
  tagline:
    "A grid-aware multi-agent system for 180 MW interconnection. Private data stays local. Utilities see proofs, not premises. Agents propose. The math disposes.",

  theme: "Electric Grid Optimization — Grid-Aware AI Agents for Data-Center Demand",

  stats: {
    agentsShipped: 4,
    contextSavingsPct: 93.8,
    canaryGates: 15,
    crossLangVerifiers: 3,
  },

  heroTerminal: [
    {
      ts: "14:03:02",
      tag: "APPLICANT",
      kind: "agent",
      line: '"180 MW training campus · Prince William, VA · class-B response · COD Q4 2028"',
    },
    {
      ts: "14:03:05",
      tag: "INTERVIEWER",
      kind: "agent",
      line: "writes privateProfile + requestMeta · derivedProof untouched (write-scope)",
      meta: "3s · $0.18 · accepted",
    },
    {
      ts: "14:03:08",
      tag: "CARTOGRAPHER",
      kind: "agent",
      line: "FEMA flood · VA DEQ air-permit docket · county zoning · 3 sourceRefs cited",
      meta: "whitelist · no invention",
    },
    {
      ts: "14:03:10",
      tag: "FORECAST",
      kind: "forecast",
      line: "firmness 59 · flex 32–44 MW · 3–4h · class B · pure function · deterministic",
      meta: "no LLM call",
    },
    {
      ts: "14:03:11",
      tag: "POLICY",
      kind: "policy",
      line: "project(utility) · 8 private fields sealed · 0 raw fields released",
      meta: "trust · network·0",
    },
    {
      ts: "14:03:13",
      tag: "BUNDLE",
      kind: "bundle",
      line: "JCS canonicalized · Ed25519 signed · key in keychain · never crosses IPC",
      meta: "hash-chained audit",
    },
    {
      ts: "14:03:15",
      tag: "UTILITY",
      kind: "verifier",
      line: '4 checks pass · pubkey pinned · "I can act on this."',
      meta: "commitment received",
    },
  ],

  agents: [
    {
      slug: "interviewer",
      name: "Interviewer",
      domain: "grid",
      contract: "write",
      writes: "privateProfile · requestMeta",
      reads: "applicant prose",
      glyph: "passport-seal",
      quote:
        "Caught the structure. Writing privateProfile + requestMeta. Not touching derivedProof — not my write-scope.",
      accent: "#38bdf8",
    },
    {
      slug: "cartographer",
      name: "Cartographer",
      domain: "grid",
      contract: "write",
      writes: "publicEvidence",
      reads: "requestMeta.parcel only",
      glyph: "map-cartograph",
      quote:
        "Three sourceRefs attached. If DEQ doesn't have it, the field stays null. No invention.",
      accent: "#84cc16",
    },
    {
      slug: "explainer",
      name: "Explainer",
      domain: "grid",
      contract: "read",
      writes: "nothing",
      reads: "ProjectedView only",
      glyph: "scroll-unrolled",
      quote:
        "I narrate what the role can already see. Never privateProfile. Role-conditioned prose only.",
      accent: "#f0b866",
    },
    {
      slug: "priorauth-interviewer",
      name: "priorauth-Interviewer",
      domain: "hipaa",
      contract: "write",
      writes: "PA-request schema",
      reads: "patient prose",
      glyph: "stethoscope-wave",
      quote:
        "Same write-scope contract, HIPAA domain. Proves the primitive is portable across regulated industries.",
      accent: "#e0584d",
    },
  ],

  cases: [
    {
      slug: "owl-compute",
      codename: "Owl",
      kind: "hyperscaler",
      mw: 180,
      county: "Prince William, VA",
      oprDelta: 0.328,
      regretMax: 0.0,
      hNullLeakage: 0,
      headline: "Clears +0.20 OPR threshold. Best-of-4 on regret.",
      verdict: "clears",
    },
    {
      slug: "lantern-cautious",
      codename: "Lantern",
      kind: "cautious",
      mw: 45,
      county: "Loudoun, VA",
      oprDelta: 0.047,
      regretMax: 0.4,
      hNullLeakage: 0,
      headline: "Flat. Ties prompt-only baseline on regret. Zero leakage held.",
      verdict: "flat",
    },
    {
      slug: "kraken-flex",
      codename: "Kraken",
      kind: "flex-forward",
      mw: 120,
      county: "Henrico, VA",
      oprDelta: 0.194,
      regretMax: 0.2,
      hNullLeakage: 0,
      headline: "Borderline. Ties lowest regret cell. Zero raw leaks across the pilot.",
      verdict: "borderline",
    },
  ],

  ab: {
    baseline: {
      label: "NDA-email baseline (condition B)",
      turns: 11,
      days: 37,
      rawLeakage: "multiple raw-field leaks",
    },
    gridPassport: {
      label: "Grid Passport (condition D)",
      turns: 7,
      days: 10,
      rawLeakage: "0 raw-field leaks",
    },
    seedNote:
      "Pilot — n=1 per cell · one seed · same Owl Compute scenario. §9.1 pre-registered threshold Rounds(D) ≤ 0.5 × Rounds(B) cleared on all three scenarios.",
    quote: "Utility sees the proof, not the premise.",
  },

  diagrams: [
    {
      title: "The projection pipeline",
      ascii: `applicant prose
    │
    ▼
Interviewer  ──writes──▶  CaseInput.privateProfile + requestMeta
                          ▲ never touches derivedProof (write-scope contract)
    │
    ▼
Cartographer ──writes──▶  publicEvidence (source-cited; null if unknown)
    │
    ▼
forecast.ts + projection.ts      (pure functions, deterministic)
    │
    ▼ ProjectedView(role)
    ├──▶ Explainer (reads only)  ──▶ role-conditioned prose
    ├──▶ applicant UI
    └──▶ bundle.ts ──JCS──▶ Ed25519 sign ──▶ signed bundle
                                               │
                                               ▼
                                    utility Tauri binary
                                    (verifier · utility-role projection)`,
      caption:
        "Agents write to named buckets only. Pure functions compute. The bundle is the release surface.",
      codeLink: "packages/core/src/projection.ts",
    },
    {
      title: "Three-way policy mirror",
      ascii: `  packages/policy/grid-passport.rego   ← canonical
             ║
             ╠══  packages/core/src/policy.ts     (TypeScript mirror)
             ║
             ╚══  apps/verifier-py/               (Python reference)

privacy:canary walks all three. Drift fails CI.
Disclosure rules change in one place or not at all.`,
      caption:
        "The schema is the safety case. TS ↔ Rego ↔ Python agree byte-for-byte or the commit fails.",
      codeLink: "packages/policy/grid-passport.rego",
    },
    {
      title: "Two binaries, zero servers",
      ascii: `┌────────── applicant.app ──────────┐        ┌────────── utility.app ──────────┐
│  Tauri 2 · Rust + React          │  file  │  Tauri 2 · Rust + React         │
│  may import: core/{fixtures,     │  on    │  may NOT import: core/fixtures, │
│  forecast, audit, privateProfile}│  disk  │  forecast, audit (GATE 15)      │
│  Ed25519 private key → keychain  │───────▶│  public key pinned per counter- │
│  key never crosses IPC           │  .gpb  │  party (SSH-style bootstrap)    │
└──────────────────────────────────┘        └─────────────────────────────────┘`,
      caption:
        "Gate 15 walks the utility binary's import graph. Private-bucket types structurally cannot link.",
      codeLink: "apps/utility/scripts/canary-utility.ts",
    },
  ],

  canaryGates: [
    {
      id: "01",
      name: "privacy:canary",
      enforces: "TS policy ↔ Rego source ↔ Python reference agree byte-for-byte",
    },
    {
      id: "02",
      name: "canary:desktop",
      enforces: "applicant-side projection + fixture invariants",
    },
    {
      id: "03",
      name: "canary:utility",
      enforces:
        "utility import graph cannot link private-bucket types (compile-time write-scope proof)",
    },
    {
      id: "04",
      name: "canary:bundle",
      enforces: "TS sign → verify → tamper → reject roundtrip",
    },
    {
      id: "05",
      name: "canary:roundtrip",
      enforces: "TS + Rust + Python cross-language bundle parity",
    },
    {
      id: "06",
      name: "agents:baseline:check",
      enforces: "prompt-only baselines unchanged unless metrics.md also moves",
    },
  ],

  infrastructure: {
    heading: "Built on Claude Agent Skills + Tauri 2",
    body: "Four Skills across two regulated domains. Each has a SKILL.md auto-discovered by Claude Code, a paired CI validator, and a mechanically-derived prompt-only baseline with a content-hash drift gate. The write-scope contract is prose in SKILL.md, enforced at the validator, and measured in packages/agents/metrics.md. Deliberately not AI: projection, forecast, audit, signing, verification — those are deterministic pure functions with unit tests.",
    stack: [
      {
        label: "Claude Agent Skills (4 × 2 domains)",
        detail:
          "Interviewer · Cartographer · Explainer · priorauth-Interviewer. Uniform −93.8% to −96.4% upfront context savings vs. prompt-only baseline.",
      },
      {
        label: "Tauri 2 · Rust + React",
        detail:
          "Two standalone binaries. OS-keychain signer. Zero network for projection + signing. Gate 15 enforces write-scope at compile time.",
      },
      {
        label: "RFC 8785 JCS + RFC 8032 Ed25519",
        detail:
          "Deterministic canonicalization. Independent signers in @noble/ed25519, ed25519-dalek, and PyCA agree byte-for-byte.",
      },
      {
        label: "OPA/Rego · canonical policy",
        detail:
          "Single source of disclosure truth. TypeScript and Python mirrors structurally drift-checked.",
      },
    ],
  },

  tryIt: {
    prereqs: "Node ≥20.19 · pnpm 10 · Rust toolchain · macOS/Windows/Linux.",
    commands: `$ git clone https://github.com/jinming99/grid-passport
$ cd grid-passport && pnpm install
$ pnpm demo:bundle      # 60-sec roundtrip: sign → TS verify → Py verify → tamper → reject
$ pnpm desktop:dev      # applicant Tauri window · port 1420
$ pnpm utility:dev      # utility Tauri window  · port 1430`,
  },

  problemsHeadline: "Why does data-center demand keep outrunning grid planning?",
  problemsInsight: "raw demand  ≠  planning-ready demand",

  buckets: {
    infra: {
      label: "INFRASTRUCTURE",
      role: "hands-off",
      body: "Transmission and substation upgrades take 5–10 years. This is physics, not software. We accept it.",
      count: 1,
      tone: "neutral",
    },
    coord: {
      label: "COORDINATION",
      role: "where GP sits",
      body: "The root cause is a coordination gap between data centers and energy providers. Without a shared, trusted way to exchange load, ramp, and flexibility information, planning and operations break down. ERCOT, NERC, DOE, and NREL document the same gap — the 6 failures below are what it looks like in practice.",
      count: 5,
      tone: "primary",
    },
  },

  problems: [
    {
      id: "01",
      headline: "Uncertain & speculative demand inputs",
      bucket: "coord",
      effect:
        "Raw data-center load requests are overstated, premature, or not fully realized — unreliable as direct planning inputs.",
      sources: [
        {
          agency: "ERCOT",
          document: "2025 Long-Term Hourly Peak Demand and Energy Forecast (Apr 8, 2025)",
          quote:
            "ERCOT Adjusted Load Forecast assumes a 180-day delay to ramp schedules, with Data Center Large Load additions reduced to 49.8% and Officer Letter Large Load additions reduced to 55.4%. The average peak consumption per site was 49.8% of the requested MW.",
          url: "#todo-source-url",
        },
        {
          agency: "NERC",
          document: "Large Loads Frequently Asked Questions (April 2026)",
          quote:
            "Some loads want to connect to the BPS as soon as possible, they submit speculative interconnection requests to find the interconnection point with the fastest timeline, significantly increasing the number of interconnection studies utilities must perform.",
          url: "#todo-source-url",
        },
        {
          agency: "DOE SEAB",
          document: "Powering AI and Data Center Infrastructure (July 2024)",
          quote:
            "Predictions of future energy demand are fraught with uncertainties due to: (i) lack of visibility into proprietary private sector planning for new model training; (ii) speculative and duplicative requests for new data center capacity from third party vendors that may ultimately go unfulfilled.",
          url: "#todo-source-url",
        },
      ],
      core:
        "Raw demand ≠ planning-ready demand. ERCOT plans against roughly half the stated number.",
      coverage: "partial",
      coverageNote:
        "Interviewer captures the request, but GP has no maturity / certainty score yet — this is a v2 gap.",
    },
    {
      id: "02",
      headline: "Mismatch between demand speed and grid-upgrade timelines",
      bucket: "infra",
      effect:
        "Data centers request power in 1–2 years while transmission and infrastructure upgrades take 5–10+ years. Planning misaligns.",
      sources: [
        {
          agency: "NERC",
          document: "Characteristics and Risks of Emerging Large Loads",
          quote:
            "Some large loads seek to connect within one to two years, while traditional planning processes are not equipped for that timeline; transmission expansion can take a decade.",
          url: "#todo-source-url",
        },
        {
          agency: "NREL",
          document: "Considerations for Distributed Edge Data Centers",
          quote:
            "Constrained feeders can create long interconnection timelines and expensive reinforcements.",
          url: "#todo-source-url",
        },
      ],
      core:
        "Raw demand ≠ planning-ready demand. The grid needs years; developers want months. Better coordination shrinks the gap, not software alone.",
      coverage: "none",
      coverageNote:
        "Infrastructure build-out is physics. GP doesn't claim to fix it — we make sure it targets the right demand.",
    },
    {
      id: "03",
      headline: "No standardized, planning-ready data format",
      bucket: "coord",
      effect:
        "No consistent schema for capacity, ramp rates, utilization, or maturity — every utility and grid operator reinterprets inputs manually.",
      sources: [
        {
          agency: "DOE SEAB",
          document: "Powering AI and Data Center Infrastructure (July 2024)",
          quote:
            "There is no standard terminology in the U.S. for flexible operation of any type of assets, including data centers, which is a significant impediment to rapid scale-up of flexibility programs even when multiple parties want to cooperate.",
          url: "#todo-source-url",
        },
        {
          agency: "NERC",
          document: "Large Loads FAQs — Data Collection & Forecasting (April 2026)",
          quote:
            "The electrical characteristics of large load facilities, such as ramping capabilities, power electronic settings, internal protection schemes, and coordination across multiple facilities, must be better understood. A better understanding of standardizing large-load modeling for long-term forecasting is needed.",
          url: "#todo-source-url",
        },
        {
          agency: "NERC",
          document: "Gaps in Existing Practices, Requirements, and Reliability Standards for Emerging Loads (2026)",
          quote:
            "Existing NERC Reliability Standards, as well as industry processes and requirements, are inadequate for the reliable integration of emerging large loads onto the BPS.",
          url: "#todo-source-url",
        },
      ],
      core:
        "Raw demand ≠ planning-ready demand. Every utility reinterprets the same fields differently — there is no shared schema.",
      coverage: "full",
      coverageNote:
        "packages/core/src/types.ts + policy.ts define a canonical schema; TS ↔ Rego ↔ Python all agree or CI fails.",
    },
    {
      id: "04",
      headline: "Confidentiality vs usability tradeoff",
      bucket: "coord",
      effect:
        "Critical commercial and technical details are sensitive and restricted, limiting how widely they can flow across utilities, ISOs, and regulators.",
      sources: [
        {
          agency: "DOE SEAB",
          document: "Powering AI — Track 3, Recommendation 5 (July 2024)",
          quote:
            "The Secretary should ask Congress to provide new authority for DOE or EIA to collect and maintain a confidential database of prospective large electric demand requests to improve efficient power system planning and address speculative and possible double counting.",
          url: "#todo-source-url",
        },
        {
          agency: "DOE SEAB",
          document: "Powering AI — Track 1 Findings (July 2024)",
          quote:
            "Private sector investment far outweighs other funding and there is limited visibility into private sector progress.",
          url: "#todo-source-url",
        },
        {
          agency: "DOE SEAB",
          document: "Powering AI — Track 1 Finding 1 (July 2024)",
          quote:
            "Lack of visibility into proprietary private sector planning for new model training [is a core source of forecast uncertainty].",
          url: "#todo-source-url",
        },
      ],
      core:
        "Raw demand ≠ planning-ready demand. Sensitive ≠ unusable — today's tools can't tell the difference.",
      coverage: "full",
      coverageNote:
        "Policy-governed projection + 3-role view (applicant · utility · regulator). Each role sees only what policy releases — raw private fields never cross the bundle boundary.",
    },
    {
      id: "05",
      headline: "Dynamic & evolving load behavior",
      bucket: "coord",
      effect:
        "Data-center demand isn't static — AI workloads, vendor-specific UPS controls, and real-world disturbance behavior change the load shape over minutes, hours, and years.",
      sources: [
        {
          agency: "NERC",
          document: "Incident Review: Simultaneous Voltage-Sensitive Load Reductions (Jan 8, 2025)",
          quote:
            "A 230 kV transmission line fault led to customer-initiated simultaneous loss of approximately 1,500 MW of voltage-sensitive load that was not anticipated by the BES operators. Most load loss can be attributed to the interaction between the automatic reclosing sequence and the data center's protection/control scheme that counts the number of voltage disturbances — three voltage disturbances within one minute cause the load to transfer to backup and stay off until manually reconnected.",
          url: "#todo-source-url",
        },
        {
          agency: "DOE SEAB",
          document: "Powering AI — Track 3 Finding 6 (July 2024)",
          quote:
            "The power needs of future data centers are unclear both in terms of magnitude and temporal shape. For a large, flat load, characteristic of many data centers today, technologies such as nuclear or gas with CCS may be preferred. If data center computational activities increasingly have flexible or fluctuating requirements, other generation and storage technologies may be preferred.",
          url: "#todo-source-url",
        },
        {
          agency: "DOE SEAB",
          document: "Powering AI — Track 2 Finding 1 (July 2024)",
          quote:
            "Hyperscalers and technology providers state that temporal and spatial computational flexibility is possible if they are given appropriate signals. Despite this perception of technical capability, we identified no examples of grid-aware flexible operation at data centers today other than the carbon-minimizing geographic optimization that Google has employed for several years.",
          url: "#todo-source-url",
        },
      ],
      core:
        "Raw demand ≠ planning-ready demand. A static form can't describe a 1,500 MW trip in 82 seconds.",
      coverage: "partial",
      coverageNote:
        "Flex passport captures a snapshot at submission; versioned delta updates + event-triggered refreshes + operational ride-through behavior are a v2 gap.",
    },
    {
      id: "06",
      headline: "No end-to-end stakeholder coordination",
      bucket: "coord",
      effect:
        "No unified system translates, validates, updates, and distributes large-load data across data centers, utilities, ISOs, and regulators.",
      sources: [
        {
          agency: "DOE SEAB",
          document: "Powering AI — Track 2 Recommendation 1 (July 2024)",
          quote:
            "The Secretary should convene energy utilities, data center developers and operators, and other key stakeholders to start active dialog on how to address current electricity supply bottlenecks, to advance understanding of real-time data sharing and protocols to govern data center operational flexibility (including both computational flexibility and backup power strategies).",
          url: "#todo-source-url",
        },
        {
          agency: "NERC",
          document: "Incident Review: Simultaneous Voltage-Sensitive Load Reductions (Jan 8, 2025)",
          quote:
            "Transmission Owners (TO), TOPs, TPs, and large-load owners will have to work collaboratively to identify and mitigate reliability risks posed by large load losses during system faults.",
          url: "#todo-source-url",
        },
        {
          agency: "NREL",
          document: "Considerations for Distributed Edge Data Centers (Nov 2025)",
          quote:
            "Without coordinated planning, the growth of data centers could stress already constrained grids, undermining reliability and affordability. In Virginia, data center interconnection delays of up to 7 years have been reported; customers are already paying an additional $276 per year on their electricity bills due to data center interconnection.",
          url: "#todo-source-url",
        },
      ],
      core:
        "Raw demand ≠ planning-ready demand. Four agencies (DOE · NERC · NREL · FERC) are calling for the same substrate; nobody has shipped it.",
      coverage: "full",
      coverageNote:
        "Three-role projection (applicant · utility · regulator) with signed, hash-chained bundles — the shared substrate all four agencies are asking for.",
    },
  ],

  solution: {
    headline: "Grid Passport converts sensitive demand into grid-ready intelligence.",
    subhead:
      "One platform between the data center and the grid — encrypted at intake, standardized at output, and auditable end-to-end.",
    pipeline: {
      from: "Data Center",
      middle: "Grid Passport",
      to: "Utility · ISO · Regulator",
    },
    pillars: [
      {
        glyph: "shield",
        title: "Secure by Design",
        tag: "proprietary data never overexposed",
        bullets: [
          "Encrypted submission with role-based visibility (applicant · utility · regulator).",
          "Three-role projection — each stakeholder sees only what policy releases.",
          "Signed disclosure bundles (RFC 8785 JCS + RFC 8032 Ed25519).",
          "Gate 15: utility binary's import graph structurally cannot link private-bucket types.",
        ],
      },
      {
        glyph: "brain",
        title: "Intelligence Layer",
        tag: "raw demand → risk-adjusted demand",
        bullets: [
          "Four Claude Agent Skills with write-scope / read-scope contracts.",
          "Pure-function forecast, policy, and projection — deterministic, no LLM in the math.",
          "Derives firmness score, flex band, maturity, ramp, and confidence from evidence.",
          "Aligns with how PJM, ERCOT, and NERC actually plan.",
        ],
      },
      {
        glyph: "bolt",
        title: "Grid-Ready Output",
        tag: "standardized, drift-checked, portable",
        bullets: [
          "Canonical schema (packages/core/src/types.ts) utilities can ingest directly.",
          "TypeScript ↔ Rego ↔ Python three-way parity on every commit.",
          "Supports forecasting, interconnection studies, and capacity planning.",
          "Independent verifier in three languages — @noble/ed25519, ed25519-dalek, PyCA.",
        ],
      },
    ],
    documentMap: {
      title: "Document Map",
      tag: "NEW · visualization layer",
      pitch:
        "A case-level graph that links every document and communication — applicant uploads, public evidence, regulator guidance, utility responses — into one navigable map. Replaces filename lists, email threads, and scattered drives.",
      ingests: {
        heading: "// ingests",
        items: [
          "Applicant uploads — LOA · permits · tariffs · site-control docs",
          "Cartographer-fetched public evidence — FEMA · VA DEQ · county zoning",
          "Regulator / ISO library — NERC, DOE, PJM, ERCOT guidance PDFs",
          "Utility responses — study results, decisions, communications",
          "Formats — PDF · Word · Markdown",
        ],
      },
      visualizes: {
        heading: "// visualizes",
        items: [
          "Node graph per case — every doc + its relationships on one canvas",
          "Provenance — who supplied each doc, when, and what it cites",
          "Role filters — applicant's dossier · utility's inbox + precedents · regulator's audit trail",
          "Search across every ingested doc, scoped to the current case",
        ],
      },
      roles: [
        { label: "applicant", filter: "own dossier only" },
        { label: "utility", filter: "incoming + precedents" },
        { label: "regulator", filter: "full audit trail" },
      ],
      // viewBox 0..800 x 0..360
      nodes: [
        { id: "loa",      label: "LOA",              kind: "applicant",  x: 130, y: 90  },
        { id: "permit",   label: "Air permit",       kind: "applicant",  x: 130, y: 180 },
        { id: "site",     label: "Site control",     kind: "applicant",  x: 130, y: 270 },
        { id: "fema",     label: "FEMA flood",       kind: "evidence",   x: 290, y: 70  },
        { id: "zoning",   label: "County zoning",    kind: "evidence",   x: 290, y: 290 },
        { id: "forecast", label: "Forecast · proof", kind: "platform",   x: 430, y: 180 },
        { id: "nerc",     label: "NERC ride-thru",   kind: "regulator",  x: 580, y: 80  },
        { id: "doe",      label: "DOE SEAB",         kind: "regulator",  x: 580, y: 180 },
        { id: "study",    label: "Utility study",    kind: "utility",    x: 580, y: 280 },
        { id: "audit",    label: "Audit log",        kind: "audit",      x: 730, y: 180 },
      ],
      edges: [
        { from: "loa",      to: "forecast", label: "supports" },
        { from: "permit",   to: "forecast", label: "attached" },
        { from: "site",     to: "forecast", label: "attached" },
        { from: "fema",     to: "forecast", label: "cited" },
        { from: "zoning",   to: "forecast", label: "cited" },
        { from: "nerc",     to: "forecast", label: "constrains" },
        { from: "doe",      to: "forecast", label: "schema" },
        { from: "forecast", to: "study",    label: "projected" },
        { from: "forecast", to: "audit",    label: "chained" },
        { from: "study",    to: "audit",    label: "chained" },
      ],
    },
  },

  demo: {
    headline: "Watch a hyperscaler use Grid Passport end-to-end.",
    subhead:
      "Three applications. One signed handshake. From raw private intake to a utility-verifiable proof — without any secret ever crossing a cloud boundary.",
    scenario: {
      codename: "Owl Compute",
      context: "180 MW training campus · Prince William, VA",
      ask: "\"We need 180 MW by Q4 2028. Class-B flexible response. Two 10-MW backup gens. Don't leak roadmap or workload mix.\"",
    },
    stages: [
      {
        id: "intake",
        number: "01",
        app: "Applicant Intake",
        subtitle: "local desktop binary · the hyperscaler's workspace",
        role: "Hyperscaler data-center planner",
        tone: "cyan",
        features: {
          heading: "// what the user sees",
          items: [
            "Guided intake forms powered by the Interviewer Skill — types prose, gets structured CaseInput.",
            "Live role toggle — preview applicant / utility / regulator views side-by-side before exporting.",
            "Policy preview — each field shows a chip saying \"will release · will seal · derived\" under current policy.",
            "Trust panel ticker — network·0 · sealed·8 · raw released·0 · updates as you type.",
            "Cartographer auto-fetches public evidence (FEMA flood, VA DEQ air permit, county zoning) with source links.",
          ],
        },
        technical: {
          heading: "// how it works",
          items: [
            "Tauri 2 (Rust + React) · binary runs entirely on-device, zero network for projection.",
            "Private fields (load profile, workload mix, BESS sizing) live in privateProfile — never leaves the app.",
            "Forecast pure-function computes firmness score, flex band, maturity from the private data.",
            "Output: a signed-bundle-ready CaseInput in memory, plus a role-projected preview.",
          ],
        },
        output: "CaseInput + ProjectedView(role) ready for signing",
        trust: ["local only", "0 kB network", "keychain-backed"],
      },
      {
        id: "seal",
        number: "02",
        app: "Seal & Sign",
        subtitle: "cryptographic handoff · inside the applicant app",
        role: "The same desktop app — crypto step",
        tone: "amber",
        features: {
          heading: "// what happens to the data",
          items: [
            "Policy-governed projection function strips every private field not released for the target role.",
            "Remaining payload: publicEvidence + derivedProof + projection(utility) + policyHash + audit chain.",
            "Canonicalized so every producer hashes to the same bytes — no ambiguity, no re-ordering attacks.",
            "Signed with the applicant's private key held in the OS keychain.",
            "Written to disk as a single .gpb file (~5 KB). Transferred by any channel the humans already use.",
          ],
        },
        technical: {
          heading: "// how the encryption works",
          items: [
            "RFC 8785 JCS — deterministic canonical JSON (every UTF-8 codepoint normalized, keys sorted).",
            "RFC 8032 Ed25519 — signature is 64 bytes, verification is constant-time.",
            "Private key never crosses the Tauri IPC boundary — keychain handles the signing in-process.",
            "Hash-chained audit entries — each step binds to the previous via SHA-256.",
            "Three-language parity: @noble/ed25519 (TS) · ed25519-dalek (Rust) · PyCA cryptography — all produce byte-identical signatures.",
          ],
        },
        output: "Signed disclosure bundle · .gpb · ~5 KB",
        trust: ["JCS · RFC 8785", "Ed25519 · RFC 8032", "key never crosses IPC"],
      },
      {
        id: "verify",
        number: "03",
        app: "Utility Verify",
        subtitle: "separate binary · the utility's workspace",
        role: "Utility planner",
        tone: "lime",
        features: {
          heading: "// what the utility sees",
          items: [
            "Drops the .gpb file onto the utility app — no account, no login, no cloud call.",
            "Renders the utility-role projection — derived proofs (firmness, flex band, class) + public evidence.",
            "Trust-claim card up top — network·0 · narrow imports · pubkey pinned · policy hash matches.",
            "Explainer Skill narrates the view — read-scope only, cannot see the private premise.",
            "Utility decides: commit capacity, request more detail, or reject with an attributable reason.",
          ],
        },
        technical: {
          heading: "// how it deciphers (and what it cannot do)",
          items: [
            "Separate Tauri binary — Gate 15 in CI fails the build if this app tries to import private-bucket types.",
            "Four verification checks: signature valid · JCS canonical form · policy hash matches · audit chain intact.",
            "Counterparty pubkey pinned per utility (SSH-style bootstrap — one-time trust on first use).",
            "Zero network for verification — the verifier runs entirely offline.",
            "Decryption is a misnomer: the bundle was never encrypted, it was policy-projected. The utility sees only what was ever allowed to cross the line.",
          ],
        },
        output: "Utility-role view · commitment-ready",
        trust: ["4 / 4 checks pass", "0 kB network", "Gate 15 compile-proof"],
      },
    ],
  },
};
