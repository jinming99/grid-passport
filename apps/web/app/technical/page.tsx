import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

export const metadata: Metadata = {
  title: "Grid Passport — Technical Overview",
  description:
    "A single-doc tour through Grid Passport: the problem, the architectural decisions, the privacy mechanism end-to-end, where the AI actually lives, how we evaluate, and the honest limits.",
};

interface Section {
  num: number;
  title: string;
  body: string;
}

function loadTechOverview(): string {
  const candidates = [
    path.join(process.cwd(), "..", "..", "docs", "tech-overview.md"),
    path.join(process.cwd(), "docs", "tech-overview.md"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate, "utf8");
  }
  throw new Error(
    "docs/tech-overview.md not found (tried: " + candidates.join(", ") + ")",
  );
}

function splitSections(md: string): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;
  const lines = md.split("\n");
  for (const line of lines) {
    const match = /^##\s+(\d+)\.\s+(.+)$/.exec(line);
    if (match) {
      if (current) sections.push(current);
      current = {
        num: parseInt(match[1], 10),
        title: match[2].replace(/\*+/g, "").trim(),
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
          grid-passport <span className="text-neutral-700">/</span> technical{" "}
          <span className="text-neutral-700">/</span>{" "}
          <span className="text-neutral-300">architecture + mechanism</span>
        </span>
        <span className="hidden sm:inline text-neutral-600">
          policy@0.1.0 · 15 gates · mechanical canary · passing
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
            href="/about"
            className="transition-colors hover:text-neutral-200"
          >
            the story
          </Link>
          <span className="text-neutral-700">/</span>
          <Link
            href="/protocol"
            className="transition-colors hover:text-neutral-200"
          >
            protocol
          </Link>
          <span className="text-neutral-700">/</span>
          <span className="text-neutral-200">technical</span>
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
          doc · technical overview · source: docs/tech-overview.md
        </div>
        <h1 className="mb-10 animate-scan text-5xl font-semibold leading-[1.02] tracking-[-0.02em] text-neutral-50 sm:text-6xl">
          The schema
          <br />
          is the safety case.
        </h1>
        <div className="grid gap-8 sm:grid-cols-[1.6fr_1fr]">
          <p className="max-w-xl text-lg leading-relaxed text-neutral-400">
            One document that walks through what Grid Passport is, why it has
            this shape, how the privacy mechanism actually works, where the AI
            lives, and what the honest limits are. Written for developers,
            utility reviewers, and anyone who wants the technical depth in one
            place.
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
            <dt className="text-neutral-600">gates</dt>
            <dd className="text-right text-neutral-200">15 · all green</dd>
          </dl>
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/protocol"
            className="inline-flex items-center gap-3 border border-sky-700 bg-sky-950/50 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-sky-200 transition-colors hover:border-sky-400 hover:bg-sky-950"
          >
            <span className="inline-block h-1.5 w-1.5 animate-pulse bg-sky-400" />
            verify it yourself
            <span className="text-sky-400">›</span>
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center gap-3 border border-neutral-800 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-neutral-100"
          >
            the story →
          </Link>
          <a
            href="#s-1"
            className="inline-flex items-center gap-3 border border-neutral-800 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-neutral-100"
          >
            begin ↓
          </a>
        </div>
      </div>
    </section>
  );
}

function SectionPlate({ num, title }: { num: number; title: string }) {
  return (
    <header className="mb-10">
      <div className="mb-4 flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.22em]">
        <span className="text-sky-400">§{num.toString().padStart(2, "0")}</span>
        <span className="h-px flex-1 bg-neutral-800" />
        <span className="text-neutral-600">section</span>
      </div>
      <h2 className="text-3xl font-semibold leading-[1.1] tracking-tight text-neutral-50 sm:text-4xl">
        {title}
      </h2>
    </header>
  );
}

function EndStamp() {
  return (
    <footer className="border-t border-neutral-800">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-6 font-mono text-[11px] uppercase tracking-[0.2em]">
          <div className="flex flex-col gap-1.5">
            <span className="text-neutral-200">
              end of overview · source docs/tech-overview.md
            </span>
            <span className="text-neutral-600">
              synthetic numbers · illustrative only
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

export default function TechnicalPage() {
  const raw = loadTechOverview();
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
        <Hero
          words={words}
          minutes={minutes}
          sectionCount={sections.length}
        />

        <article className="mx-auto max-w-5xl px-6 py-20">
          {sections.map((s) => (
            <section
              key={s.num}
              id={`s-${s.num}`}
              className="mb-24 scroll-mt-24 last:mb-0"
            >
              <SectionPlate num={s.num} title={s.title} />
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
                  prose-ul:my-4
                  prose-table:text-sm
                  prose-th:text-neutral-200 prose-th:font-medium
                  prose-td:text-neutral-300"
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={proseComponents}
                >
                  {s.body}
                </ReactMarkdown>
              </div>
            </section>
          ))}
        </article>

        <EndStamp />
      </div>
    </div>
  );
}
