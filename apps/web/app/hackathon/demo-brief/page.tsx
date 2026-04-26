import Link from "next/link";
import type { Metadata } from "next";
import { HackathonFooter } from "@/components/hackathon/Shell";

export const metadata: Metadata = {
  title: "Grid Passport · Demo Brief",
  description:
    "A compact Grid Passport story page: rising demand, the federal record, operational disclosure, and the signed coordination loop.",
};

const DEMO_BEATS = [
  {
    time: "0:30",
    title: "Federal record",
    note: "DOE, NERC, and ERCOT are all converging on the same gap: better operational disclosure.",
  },
  {
    time: "2:00",
    title: "Baseline filing",
    note: "Owl Compute completes the static intake and seals competitive fields on-device.",
  },
  {
    time: "1:00",
    title: "The surge",
    note: "A six-week training run is disclosed as a signed delta before it hits the grid.",
  },
  {
    time: "1:00",
    title: "Coordination back",
    note: "The utility can notify the applicant about outages, upgrades, and constraints with the same signed path.",
  },
  {
    time: "0:45",
    title: "Signed memory",
    note: "Residuals become calibration data for the next forecast instead of getting lost in email.",
  },
] as const;

const DEMAND_BARS = [
  { label: "2023 share", value: 4.4, suffix: "%", tone: "cyan" },
  { label: "2028 low case", value: 6.7, suffix: "%", tone: "sky" },
  { label: "2028 high case", value: 12, suffix: "%", tone: "lime" },
] as const;

const PRESSURE_POINTS = [
  {
    label: "U.S. data-center electricity share",
    value: "4.4% → 6.7%–12%",
    detail: "DOE / LBNL framing for 2023 to 2028.",
  },
  {
    label: "Dominion queue pressure",
    value: "~70 GW",
    detail: "Requested demand is arriving faster than planning-grade visibility.",
  },
  {
    label: "NoVA disturbance",
    value: "1,500 MW",
    detail: "Unexpected large-load drop that turned a blind spot into a reliability story.",
  },
] as const;

const RECORD_CARDS = [
  {
    badge: "DOE",
    date: "2024",
    title: "The problem is visibility, not just generation.",
    body:
      "The federal record keeps returning to the same point: planners cannot forecast honestly when proprietary training plans stay invisible or show up only as speculative megawatt requests.",
    quote:
      "Lack of visibility into proprietary private sector planning is a core source of forecast uncertainty.",
  },
  {
    badge: "NERC",
    date: "2025",
    title: "Large-load behavior is now an operations issue.",
    body:
      "After the Northern Virginia event, the conversation shifted from generic queue policy to real operating consequences. Control rooms need advance notice of how big loads ramp, trip, and reconnect.",
    quote:
      "Large-load owners and grid operators have to work collaboratively to identify and mitigate reliability risks.",
  },
  {
    badge: "ERCOT",
    date: "2025+",
    title: "Raw requested MW is not planning-grade data.",
    body:
      "The planning posture changed from taking nameplate requests at face value to discounting, standardizing, and operationalizing them. The form is becoming a forecast instrument.",
    quote:
      "ERCOT's adjusted forecast plans against roughly half the originally requested number for large data-center additions.",
  },
] as const;

const FORM_BUCKETS = [
  {
    title: "Identity and energization",
    fields: [
      "site, parcel, service point",
      "requested MW and service voltage",
      "commercial operation timing",
      "contact and ownership path",
    ],
  },
  {
    title: "Load behavior",
    fields: [
      "ramp and reconnection profile",
      "UPS / protection behavior",
      "step changes by stage or phase",
      "coincident peak expectations",
    ],
  },
  {
    title: "Onsite assets",
    fields: [
      "backup generation details",
      "BESS capacity and duration",
      "islanding capability",
      "black-start or transfer logic",
    ],
  },
  {
    title: "Flexibility commitment",
    fields: [
      "curtailment and shed windows",
      "global workload redistribution",
      "response duration and recovery time",
      "what can move, and how fast",
    ],
  },
] as const;

const LOOP_STAGES = [
  {
    step: "Act 1",
    title: "Complete the baseline without leaking the playbook",
    body:
      "Owl Compute files a 180 MW campus in Virginia. The Interviewer captures identity, baseline form fields, firm-power numerics, and sensitive self-reports while keeping the raw values on the applicant's machine.",
    outcome:
      "Static disclosure is complete. Competitive fields stay sealed. The utility still needs operational truth below the line.",
  },
  {
    step: "Act 2",
    title: "Disclose the six-week surge before it lands",
    body:
      "A frontier-model retraining contract creates a real demand spike. The Cartographer extracts the delta, the bundle signs, and Dominion receives notice weeks in advance instead of learning about it when the load appears.",
    outcome:
      "The operator gets a signed warning window, not a surprise.",
  },
  {
    step: "Act 3",
    title: "Let the utility coordinate back",
    body:
      "Coordination has to be bidirectional. Substation work, transmission upgrades, and scheduled outages need to flow back to the applicant as signed, role-projected notices rather than phone trees or scattered emails.",
    outcome:
      "Applicant disclosure, utility notice, and applicant acknowledgment all hash to each other.",
  },
  {
    step: "Act 4",
    title: "Turn misses into calibration data",
    body:
      "If Owl discloses +70 MW and the actual peak lands at +112 MW, the residual cannot disappear into institutional memory. Signed history is what lets the next disclosure widen the interval and improve the recommendation.",
    outcome:
      "Every disclosure, actual, and residual becomes evidence for the next round.",
  },
] as const;

export default function DemoBriefPage() {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-cyan-500/15 bg-[#05080f]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.28em] text-cyan-200">
            <span className="inline-flex h-5 w-5 items-center justify-center border border-cyan-400/50 text-[9px] text-cyan-300">
              ⬡
            </span>
            Grid Passport
            <span className="text-neutral-600">{"//"}</span>
            <span className="text-neutral-500">demo brief</span>
          </div>
          <nav className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
            <a href="#pressure" className="hover:text-cyan-200">
              demand
            </a>
            <span className="text-neutral-700">·</span>
            <a href="#record" className="hover:text-cyan-200">
              federal record
            </a>
            <span className="text-neutral-700">·</span>
            <a href="#form" className="hover:text-cyan-200">
              disclosure form
            </a>
            <span className="text-neutral-700">·</span>
            <a href="#loop" className="hover:text-cyan-200">
              coordination loop
            </a>
            <span className="text-neutral-700">·</span>
            <Link href="/hackathon" className="text-cyan-300 hover:text-cyan-200">
              hackathon →
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-12">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-300">
              5-minute narrative
            </div>
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold leading-[1.04] tracking-tight text-neutral-50 sm:text-6xl">
                Grid Passport turns private load plans into{" "}
                <span className="text-cyan-300">planning-grade grid disclosures.</span>
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-relaxed text-neutral-400">
                This page is the talk track in HTML. It starts with rising
                demand, shows what the federal record is actually asking for,
                then lands on the core claim: this is not only a forecasting
                problem. It is a data-sharing problem.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {PRESSURE_POINTS.map((point) => (
                <div
                  key={point.label}
                  className="hud-frame rounded-xl px-4 py-4"
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-500">
                    {point.label}
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-neutral-100">
                    {point.value}
                  </div>
                  <div className="mt-2 text-sm leading-relaxed text-neutral-400">
                    {point.detail}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/demo/owl-compute"
                className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-2.5 text-sm font-medium text-slate-950 transition-colors hover:bg-cyan-400"
              >
                Open live demo
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/hackathon"
                className="inline-flex items-center gap-2 rounded-md border border-cyan-500/20 px-5 py-2.5 text-sm text-neutral-300 transition-colors hover:border-cyan-400/40 hover:text-white"
              >
                Back to hackathon page
              </Link>
            </div>
          </div>

          <div className="hud-frame rounded-2xl p-5">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-500">
              <span>demo structure</span>
              <span className="text-cyan-300">05:15 total</span>
            </div>
            <div className="mt-5 space-y-4">
              {DEMO_BEATS.map((beat) => (
                <div key={beat.title} className="rounded-xl border border-cyan-500/10 bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300">
                      {beat.title}
                    </div>
                    <div className="font-mono text-[11px] text-neutral-400">
                      {beat.time}
                    </div>
                  </div>
                  <div className="mt-2 text-sm leading-relaxed text-neutral-300">
                    {beat.note}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-lime-500/15 bg-lime-500/5 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-lime-300">
                thesis
              </div>
              <p className="mt-2 text-sm leading-relaxed text-neutral-300">
                The data center keeps the playbook. The utility gets the
                answer. The regulator verifies the chain.
              </p>
            </div>
          </div>
        </section>

        <section id="pressure" className="pt-24">
          <SectionLabel label="Demand Pressure" />
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="hud-frame rounded-2xl p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-neutral-100">
                    Increasing demand is real, but utilities do not plan from raw asks.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-400">
                    The queue is clogged with uncertainty, not just megawatts.
                    U.S. data-center demand is climbing fast, while planners are
                    already discounting raw requests because requested MW is not
                    the same thing as realized load.
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-xl border border-cyan-500/10 bg-white/[0.02] p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                    U.S. electricity share
                  </div>
                  <div className="mt-6 flex h-56 items-end justify-between gap-4">
                    {DEMAND_BARS.map((bar) => (
                      <div key={bar.label} className="flex flex-1 flex-col items-center gap-3">
                        <div className="flex h-44 items-end">
                          <div
                            className={`w-16 rounded-t-2xl ${
                              bar.tone === "cyan"
                                ? "bg-gradient-to-t from-cyan-600 to-cyan-300"
                                : bar.tone === "sky"
                                  ? "bg-gradient-to-t from-sky-700 to-sky-300"
                                  : "bg-gradient-to-t from-lime-700 to-lime-300"
                            }`}
                            style={{ height: `${(bar.value / 12) * 176}px` }}
                          />
                        </div>
                        <div className="text-center">
                          <div className="font-mono text-lg text-neutral-100">
                            {bar.value}
                            {bar.suffix}
                          </div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                            {bar.label}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-cyan-500/10 bg-white/[0.02] p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                    why the number cannot be taken at face value
                  </div>
                  <div className="mt-5 space-y-5">
                    <Meter
                      label="Illustrative requested load"
                      value={100}
                      suffix=" MW"
                      tone="cyan"
                    />
                    <Meter
                      label="ERCOT-style adjusted planning view"
                      value={49.8}
                      suffix=" MW"
                      tone="lime"
                    />
                    <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
                      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">
                        planning takeaway
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-neutral-300">
                        The grid is not asking for a bigger spreadsheet. It is
                        asking for demand that is specific enough to study, safe
                        enough to share, and honest enough to update.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hud-frame rounded-2xl p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                the operational warning sign
              </div>
              <h3 className="mt-3 text-2xl font-semibold text-neutral-100">
                The NoVA event is the story of a control room planning blind.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                The July 10, 2024 Northern Virginia disturbance turned the
                abstract disclosure gap into an operating-system problem. Large
                load vanished fast enough to matter, and the operator did not
                have the right mental model before the event.
              </p>

              <div className="mt-6 rounded-xl border border-cyan-500/10 bg-[#020611] p-4">
                <svg
                  viewBox="0 0 420 170"
                  className="h-auto w-full"
                  role="img"
                  aria-label="Stylized chart showing a sudden loss of 1500 megawatts"
                >
                  <defs>
                    <linearGradient id="eventFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(56,189,248,0.45)" />
                      <stop offset="100%" stopColor="rgba(56,189,248,0.02)" />
                    </linearGradient>
                  </defs>
                  <g stroke="rgba(56,189,248,0.12)" strokeWidth="1">
                    <line x1="30" y1="25" x2="390" y2="25" />
                    <line x1="30" y1="70" x2="390" y2="70" />
                    <line x1="30" y1="115" x2="390" y2="115" />
                    <line x1="30" y1="150" x2="390" y2="150" />
                  </g>
                  <path
                    d="M30 48 L175 48 L190 52 L203 118 L217 126 L390 126 L390 150 L30 150 Z"
                    fill="url(#eventFill)"
                  />
                  <polyline
                    fill="none"
                    points="30,48 175,48 190,52 203,118 217,126 390,126"
                    stroke="#67e8f9"
                    strokeWidth="4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <line x1="203" y1="28" x2="203" y2="140" stroke="#f59e0b" strokeDasharray="6 6" />
                  <text x="214" y="38" fill="#fcd34d" fontSize="12" fontFamily="var(--font-geist-mono)">
                    1,500 MW drop
                  </text>
                  <text x="30" y="18" fill="#94a3b8" fontSize="11" fontFamily="var(--font-geist-mono)">
                    load online
                  </text>
                  <text x="315" y="144" fill="#94a3b8" fontSize="11" fontFamily="var(--font-geist-mono)">
                    post-transfer
                  </text>
                </svg>
              </div>

              <div className="mt-5 rounded-xl border border-cyan-500/10 bg-white/[0.02] p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                  core message
                </div>
                <p className="mt-2 text-sm leading-relaxed text-neutral-300">
                  This is why the page should frame Grid Passport as a
                  coordination layer, not a load-forecasting widget. The missing
                  capability is a standing channel for signed operational facts.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="record" className="pt-24">
          <SectionLabel label="Federal Record" />
          <div className="grid gap-5 lg:grid-cols-3">
            {RECORD_CARDS.map((card) => (
              <article
                key={card.title}
                className="hud-frame rounded-2xl p-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="rounded-full border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                    {card.badge}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                    {card.date}
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-semibold text-neutral-100">
                  {card.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                  {card.body}
                </p>
                <div className="mt-5 rounded-xl border border-cyan-500/10 bg-[#020611] p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                    shorthand for the slide
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-300">
                    {card.quote}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-lime-500/15 bg-lime-500/5 p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-lime-300">
              outcome of the DOE conversation
            </div>
            <p className="mt-3 max-w-4xl text-base leading-relaxed text-neutral-200">
              The outcome is not merely “build more generation.” It is a push
              toward structured information sharing: utilities want earlier
              warning, operators want standardized behavior data, and regulators
              want a disclosure chain they can verify without taking custody of
              every competitive detail.
            </p>
          </div>
        </section>

        <section id="form" className="pt-24">
          <SectionLabel label="Disclosure Form" />
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="hud-frame rounded-2xl p-6">
              <h2 className="text-2xl font-semibold text-neutral-100">
                What ERCOT-style large-load disclosure is really asking for
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-400">
                The form is not just an administrative hurdle. It is the grid
                operator&apos;s attempt to learn how a data center will behave once it
                exists. Dominion already asks for many of the same operational
                details. The problem is that the most useful facts are also the
                ones applicants least want to expose in plaintext.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {FORM_BUCKETS.map((bucket) => (
                  <div
                    key={bucket.title}
                    className="rounded-xl border border-cyan-500/10 bg-white/[0.02] p-5"
                  >
                    <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-300">
                      {bucket.title}
                    </div>
                    <ul className="mt-4 space-y-2 text-sm leading-relaxed text-neutral-300">
                      {bucket.fields.map((field) => (
                        <li key={field} className="flex items-start gap-2">
                          <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-cyan-300" />
                          <span>{field}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="hud-frame rounded-2xl p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">
                  static form
                </div>
                <h3 className="mt-3 text-xl font-semibold text-neutral-100">
                  Necessary, but not sufficient
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                  Baseline forms tell the utility who the applicant is and what
                  the nameplate request looks like. They do not explain a sudden
                  six-week retraining surge, a backup-power transfer pattern, or
                  a widening confidence interval over time.
                </p>
              </div>

              <div className="hud-frame rounded-2xl p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-lime-300">
                  grid passport layer
                </div>
                <h3 className="mt-3 text-xl font-semibold text-neutral-100">
                  Show the proof, not the secret
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                  Grid Passport sits below the baseline filing. It adds signed
                  updates, role-based views, and a memory of actual outcomes so
                  the next disclosure is calibrated by evidence instead of hope.
                </p>
              </div>

              <div className="hud-frame rounded-2xl p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                  one-line pitch
                </div>
                <p className="mt-3 text-lg leading-relaxed text-neutral-100">
                  ERCOT can mandate a form. Grid Passport makes the form
                  operational.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="loop" className="pt-24">
          <SectionLabel label="Coordination Loop" />
          <div className="grid gap-5 lg:grid-cols-2">
            {LOOP_STAGES.map((stage) => (
              <article key={stage.title} className="hud-frame rounded-2xl p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300">
                  {stage.step}
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-neutral-100">
                  {stage.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                  {stage.body}
                </p>
                <div className="mt-5 rounded-xl border border-lime-500/15 bg-lime-500/5 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-lime-300">
                    what the audience should remember
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-200">
                    {stage.outcome}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <ClosingCard
              title="The data center keeps the playbook"
              body="Raw training plans, scheduler confidence, and competitive load shape remain local unless policy explicitly releases a derived fact."
            />
            <ClosingCard
              title="The utility gets the answer"
              body="It receives planning-grade proofs, deltas, and notices early enough to act instead of reconstructing events after the fact."
            />
            <ClosingCard
              title="The regulator verifies the chain"
              body="Bundles, acknowledgments, and residuals carry hashes that let an auditor reconstruct the workflow without trusting either side's memory."
            />
          </div>
        </section>

        <section className="pt-24">
          <div className="rounded-2xl border border-cyan-500/15 bg-[#05080f]/90 p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-500">
              grounding for this page
            </div>
            <p className="mt-3 max-w-4xl text-sm leading-relaxed text-neutral-400">
              Built from the repo&apos;s own narrative and notes: DOE/LBNL demand
              growth framing, Dominion queue pressure, DOE SEAB 2024
              recommendations, the NERC Northern Virginia incident review, and
              the Grid Passport hackathon story already captured in
              <code className="mx-1 text-neutral-200">grid-passport-harness/08-research-notes-and-sources.md</code>
              and
              <code className="mx-1 text-neutral-200">apps/web/lib/hackathon-data.ts</code>.
            </p>
          </div>
        </section>
      </main>

      <HackathonFooter />
    </>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-cyan-400/80">
      <span className="h-px flex-1 max-w-[2.5rem] bg-cyan-500/30" />
      <span>{label}</span>
      <span className="h-px flex-1 bg-cyan-500/10" />
    </div>
  );
}

function Meter({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: number;
  suffix: string;
  tone: "cyan" | "lime";
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4 font-mono text-[11px]">
        <span className="uppercase tracking-[0.18em] text-neutral-400">
          {label}
        </span>
        <span className="text-neutral-200">
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className={`h-full rounded-full ${
            tone === "cyan"
              ? "bg-gradient-to-r from-cyan-700 to-cyan-300"
              : "bg-gradient-to-r from-lime-700 to-lime-300"
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function ClosingCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="hud-frame rounded-2xl p-5">
      <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-300">
        {title}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-neutral-400">
        {body}
      </p>
    </div>
  );
}
