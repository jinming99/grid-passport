import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

export const metadata: Metadata = {
  title: "Grid Passport — The Story",
  description:
    "The talk-arc behind Grid Passport: the problem, the structural insight, the system, and where it generalizes.",
};

interface Section {
  num: number;
  rawTitle: string;
  title: string;
  isPlaceholder: boolean;
  body: string;
}

function loadStory(): string {
  const candidates = [
    path.join(process.cwd(), "..", "..", "docs", "story.md"),
    path.join(process.cwd(), "docs", "story.md"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate, "utf8");
  }
  throw new Error("docs/story.md not found (tried: " + candidates.join(", ") + ")");
}

function parseTitle(raw: string): { title: string; isPlaceholder: boolean } {
  const isPlaceholder = /placeholder/i.test(raw);
  let title = raw.replace(/\*+/g, "").trim();
  if (isPlaceholder) {
    title = title.replace(/\s*[—-]\s*placeholder[^—-]*$/i, "").trim();
  }
  return { title, isPlaceholder };
}

function splitSections(md: string): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;
  const lines = md.split("\n");
  for (const line of lines) {
    const match = /^##\s+(\d+)\.\s+(.+)$/.exec(line);
    if (match) {
      if (current) sections.push(current);
      const parsed = parseTitle(match[2]);
      current = {
        num: parseInt(match[1], 10),
        rawTitle: match[2],
        title: parsed.title,
        isPlaceholder: parsed.isPlaceholder,
        body: "",
      };
    } else if (current) {
      current.body += line + "\n";
    }
  }
  if (current) sections.push(current);
  for (const s of sections) {
    s.body = s.body.replace(/\n+---\s*$/, "").trim();
  }
  return sections;
}

function countWords(md: string): number {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .split(/\s+/)
    .filter(Boolean).length;
}

// ── ui primitives ──────────────────────────────────────────────────

function Classification() {
  return (
    <div className="border-b border-neutral-800 bg-neutral-950/80 font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-2">
        <span>
          grid-passport <span className="text-neutral-700">/</span> briefing{" "}
          <span className="text-neutral-700">/</span>{" "}
          <span className="text-neutral-300">unclassified-synth</span>
        </span>
        <span className="hidden sm:inline text-neutral-600">
          policy@0.1.0 · last sync 2026-04-18
        </span>
      </div>
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link
          href="/"
          className="font-mono text-[13px] uppercase tracking-[0.22em] text-neutral-300 transition-colors hover:text-white"
        >
          grid<span className="text-sky-400">·</span>passport
        </Link>
        <nav className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          <Link
            href="/demo/owl-compute"
            className="transition-colors hover:text-neutral-200"
          >
            demo
          </Link>
          <span className="text-neutral-700">/</span>
          <Link
            href="/protocol"
            className="transition-colors hover:text-neutral-200"
          >
            protocol
          </Link>
          <span className="text-neutral-700">/</span>
          <span className="text-neutral-200">the story</span>
        </nav>
      </div>
    </header>
  );
}

function Hero({
  words,
  minutes,
  sectionCount,
}: {
  words: number;
  minutes: number;
  sectionCount: number;
}) {
  return (
    <section className="relative border-b border-neutral-900">
      <div className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
        <div className="mb-6 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">
          <span className="inline-block h-[3px] w-6 bg-sky-500" />
          doc · talk-arc · source: docs/story.md
        </div>
        <h1 className="mb-10 animate-scan text-5xl font-semibold leading-[1.02] tracking-[-0.02em] text-neutral-50 sm:text-6xl">
          Truth without
          <br />
          disclosure.
        </h1>
        <div className="grid gap-8 sm:grid-cols-[1.6fr_1fr]">
          <p className="max-w-xl text-lg leading-relaxed text-neutral-400">
            Three roles, one request, a policy-governed projection. What
            follows is the talk-arc behind Grid Passport — why this shape, how
            it holds, and where it generalizes.
          </p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-l border-neutral-800 pl-6 font-mono text-[11px] uppercase tracking-[0.16em]">
            <dt className="text-neutral-600">sections</dt>
            <dd className="text-right text-neutral-200">
              {sectionCount.toString().padStart(2, "0")}
            </dd>
            <dt className="text-neutral-600">words</dt>
            <dd className="text-right text-neutral-200">
              {words.toLocaleString()}
            </dd>
            <dt className="text-neutral-600">read</dt>
            <dd className="text-right text-neutral-200">≈ {minutes} min</dd>
            <dt className="text-neutral-600">policy</dt>
            <dd className="text-right text-neutral-200">0.1.0</dd>
          </dl>
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/demo/owl-compute"
            className="inline-flex items-center gap-3 border border-sky-700 bg-sky-950/50 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-sky-200 transition-colors hover:border-sky-400 hover:bg-sky-950"
          >
            <span className="inline-block h-1.5 w-1.5 animate-pulse bg-sky-400" />
            role toggle · live
            <span className="text-sky-400">›</span>
          </Link>
          <a
            href="#s-1"
            className="inline-flex items-center gap-3 border border-neutral-800 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-neutral-100"
          >
            begin briefing ↓
          </a>
        </div>
      </div>
    </section>
  );
}

function SectionPlate({
  num,
  title,
  isPlaceholder,
}: {
  num: number;
  title: string;
  isPlaceholder: boolean;
}) {
  return (
    <header className="mb-10">
      <div className="mb-4 flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.22em]">
        <span className="text-sky-400">§{num.toString().padStart(2, "0")}</span>
        <span className="h-px flex-1 bg-neutral-800" />
        {isPlaceholder ? (
          <span className="inline-flex items-center gap-2 text-amber-300">
            <span className="inline-block h-1.5 w-1.5 animate-pulse bg-amber-400" />
            status · placeholder
          </span>
        ) : (
          <span className="text-neutral-600">section</span>
        )}
      </div>
      <h2 className="text-3xl font-semibold leading-[1.1] tracking-tight text-neutral-50 sm:text-4xl">
        {title}
      </h2>
    </header>
  );
}

function CanaryTelltale() {
  return (
    <aside className="my-10 border-l-2 border-lime-700 bg-neutral-950/70 px-5 py-4">
      <div className="mb-3 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-lime-300">
        <span className="inline-block h-1.5 w-1.5 animate-pulse bg-lime-400 shadow-[0_0_8px_rgba(132,204,22,0.5)]" />
        mechanical canary · passing
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.16em] sm:grid-cols-4">
        <div>
          <dt className="text-neutral-600">last run</dt>
          <dd className="text-neutral-200">2026-04-18</dd>
        </div>
        <div>
          <dt className="text-neutral-600">ts↔rego↔py</dt>
          <dd className="text-neutral-200">0 drift</dd>
        </div>
        <div>
          <dt className="text-neutral-600">raw leaks</dt>
          <dd className="text-neutral-200">0</dd>
        </div>
        <div>
          <dt className="text-neutral-600">audit scan</dt>
          <dd className="text-neutral-200">pass</dd>
        </div>
        <div>
          <dt className="text-neutral-600">rfc 8785 vectors</dt>
          <dd className="text-neutral-200">6 / 6</dd>
        </div>
        <div>
          <dt className="text-neutral-600">tamper fuzz</dt>
          <dd className="text-neutral-200">2000 / 2000 rejected</dd>
        </div>
        <div>
          <dt className="text-neutral-600">ts⇌rust⇌py</dt>
          <dd className="text-neutral-200">3-way parity</dd>
        </div>
        <div>
          <dt className="text-neutral-600">bundle canary</dt>
          <dd className="text-neutral-200">3 / 3 cases</dd>
        </div>
        <div>
          <dt className="text-neutral-600">keychain round-trip</dt>
          <dd className="text-neutral-200">rust unit test</dd>
        </div>
      </dl>
      <p className="mt-4 border-t border-neutral-900 pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
        verified per commit · <code>pnpm privacy:canary</code> · <code>pnpm core:test</code> · <code>pnpm verifier:test</code> · <code>pnpm canary:roundtrip</code> · <code>pnpm desktop:test</code> · see{" "}
        <Link href="/protocol" className="text-lime-300 hover:text-lime-200">the protocol page →</Link>
      </p>
    </aside>
  );
}

function TeamCrew() {
  const crew = [
    {
      id: "01",
      name: "Ming Jin",
      role: "Faculty mentor · project lead",
      org: "VT · ECE",
      note: "Vision, design, foundation. Research: calibrating agent skills to workflow, preference, and spec.",
    },
    {
      id: "02",
      name: "Bhawuk Luthra",
      role: "Co-conceptualizer · co-developer",
      org: "Dominion Energy",
      note: "Utility-side anchor. The load-bearing credibility that makes the case studies real.",
    },
    {
      id: "03",
      name: "Vikrant Bhati",
      role: "Co-developer",
      org: "hackathon",
      note: "",
    },
  ];
  return (
    <div className="my-10 grid gap-px bg-neutral-800 sm:grid-cols-3">
      {crew.map((m) => (
        <div
          key={m.id}
          className="flex flex-col bg-neutral-950 p-5 transition-colors hover:bg-neutral-900"
        >
          <div className="mb-6 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
            <span>crew · {m.id}</span>
            <span className="inline-block h-1.5 w-1.5 bg-sky-400" />
          </div>
          <div className="mb-1 text-lg font-semibold text-neutral-50">
            {m.name}
          </div>
          <div className="mb-3 text-sm text-neutral-300">{m.role}</div>
          <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-sky-300">
            {m.org}
          </div>
          {m.note ? (
            <p className="mt-auto border-t border-neutral-900 pt-3 text-[13px] leading-relaxed text-neutral-400">
              {m.note}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function EndStamp() {
  return (
    <footer className="border-t border-neutral-800">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-6 font-mono text-[11px] uppercase tracking-[0.2em]">
          <div className="flex flex-col gap-1.5">
            <span className="text-neutral-200">
              end of briefing · 2026-04-18
            </span>
            <span className="text-neutral-600">
              synthetic composite · illustrative only
            </span>
            <span className="text-neutral-600">
              grid-passport · policy@0.1.0
            </span>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Link
              href="/demo/owl-compute"
              className="inline-flex items-center gap-3 border border-neutral-800 px-4 py-2 text-neutral-300 transition-colors hover:border-sky-600 hover:text-sky-200"
            >
              run the demo
              <span className="text-sky-400">›</span>
            </Link>
            <Link
              href="/"
              className="text-neutral-600 transition-colors hover:text-neutral-200"
            >
              ← back to surface
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── prose overrides ────────────────────────────────────────────────

const proseComponents: Components = {
  h3: ({ children, ...props }) => (
    <h3
      className="mt-12 mb-4 border-l-2 border-sky-600 pl-4 text-xl font-semibold tracking-tight text-neutral-50"
      {...props}
    >
      {children}
    </h3>
  ),
};

// ── page ───────────────────────────────────────────────────────────

export default function AboutPage() {
  const raw = loadStory();
  const sections = splitSections(raw);
  const words = countWords(raw);
  const minutes = Math.max(1, Math.round(words / 220));

  return (
    <div className="relative min-h-screen bg-neutral-950 text-neutral-100">
      <div
        aria-hidden
        className="grid-backdrop pointer-events-none fixed inset-0"
      />
      <div className="relative">
        <Classification />
        <SiteHeader />
        <Hero words={words} minutes={minutes} sectionCount={sections.length} />

        <article className="mx-auto max-w-5xl px-6 py-20">
          {sections.map((s) => (
            <section
              key={s.num}
              id={`s-${s.num}`}
              className="mb-24 scroll-mt-24 last:mb-0"
            >
              <SectionPlate
                num={s.num}
                title={s.title}
                isPlaceholder={s.isPlaceholder}
              />
              <div
                className="prose prose-invert max-w-3xl
                  prose-p:text-neutral-300 prose-p:leading-[1.75]
                  prose-strong:text-neutral-50 prose-strong:font-medium
                  prose-em:not-italic prose-em:font-medium prose-em:text-neutral-100
                  prose-blockquote:border-l-2 prose-blockquote:border-sky-700 prose-blockquote:bg-neutral-950/40
                  prose-blockquote:py-2 prose-blockquote:pl-6 prose-blockquote:pr-4 prose-blockquote:my-6
                  prose-blockquote:not-italic prose-blockquote:font-normal prose-blockquote:text-neutral-200
                  prose-code:font-mono prose-code:text-sky-300 prose-code:text-[0.88em]
                  prose-code:before:content-none prose-code:after:content-none
                  prose-a:text-sky-400 prose-a:no-underline prose-a:border-b prose-a:border-sky-900
                  hover:prose-a:text-sky-200 hover:prose-a:border-sky-500
                  prose-hr:hidden
                  prose-li:text-neutral-300 prose-li:leading-[1.7]
                  prose-ul:my-4"
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={proseComponents}
                >
                  {s.body}
                </ReactMarkdown>
              </div>
              {s.num === 4 ? <CanaryTelltale /> : null}
              {s.num === 9 ? <TeamCrew /> : null}
            </section>
          ))}
        </article>

        <EndStamp />
      </div>
    </div>
  );
}
