import Link from "next/link";

export function HackathonHeader() {
  return (
    <header className="border-b border-cyan-500/15 bg-[#05080f]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/hackathon"
          className="flex items-center gap-3 font-mono text-[14px] uppercase tracking-[0.28em] text-cyan-200"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center border border-cyan-400/50 text-[9px] text-cyan-300">
            ⬡
          </span>
          grid<span className="text-cyan-500">·</span>passport
          <span className="hidden text-neutral-600 sm:inline">//</span>
          <span className="hidden text-[10px] tracking-[0.32em] text-neutral-500 sm:inline">
            hackathon channel
          </span>
        </Link>
        <nav className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
          <a href="#agents" className="hover:text-cyan-200">
            agents
          </a>
          <span className="text-neutral-700">·</span>
          <a href="#cases" className="hover:text-cyan-200">
            cases
          </a>
          <span className="text-neutral-700">·</span>
          <a href="#receipts" className="hover:text-cyan-200">
            receipts
          </a>
          <span className="text-neutral-700">·</span>
          <a href="#hood" className="hover:text-cyan-200">
            hood
          </a>
          <span className="text-neutral-700">·</span>
          <a href="#try-it" className="hover:text-cyan-200">
            try it
          </a>
          <span className="hidden text-neutral-700 sm:inline">·</span>
          <a
            href="https://github.com/jinming99/grid-passport"
            target="_blank"
            rel="noopener"
            className="hidden text-cyan-300 hover:text-cyan-200 sm:inline"
          >
            github →
          </a>
        </nav>
      </div>
    </header>
  );
}

export function HackathonFooter() {
  return (
    <footer className="mt-24 border-t border-cyan-500/15 bg-[#05080f]/80">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5 font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-600">
        <span>
          synthetic composite · illustrative only · policy@0.1.0
        </span>
        <span>
          the schema is the safety case
        </span>
        <Link href="/" className="text-cyan-400/70 hover:text-cyan-200">
          ← back to main site
        </Link>
      </div>
    </footer>
  );
}

export function BlockLabel({ label }: { label: string }) {
  return (
    <div className="mb-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-cyan-400/80">
      <span className="h-px flex-1 max-w-[2.5rem] bg-cyan-500/30" />
      <span>{label}</span>
      <span className="h-px flex-1 bg-cyan-500/10" />
    </div>
  );
}
