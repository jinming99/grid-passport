import Link from "next/link";

export default function DownloadsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="font-mono text-[13px] uppercase tracking-[0.22em] text-neutral-300 hover:text-neutral-100"
          >
            grid<span className="text-sky-400">·</span>passport
          </Link>
          <nav className="flex items-center gap-4 text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            <Link href="/about" className="hover:text-neutral-200">
              story
            </Link>
            <span className="text-neutral-700">·</span>
            <Link href="/demo/owl-compute" className="hover:text-neutral-200">
              demo
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-20">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-900/60 bg-amber-950/20 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-amber-300">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
          status · pre-release
        </span>
        <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-neutral-50">
          The Grid Passport desktop app is being built.
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-neutral-400">
          It wraps the same projection code you see in the web demo, but runs
          it entirely on your machine. Raw inputs never leave your device.
          Only signed projection bundles do. Web demo is the teaching
          artifact; the desktop app is the production form.
        </p>

        <section className="mt-10 rounded-md border border-neutral-800 bg-neutral-950/60 p-6">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
            build plan · roadmap §4
          </h2>
          <ul className="mt-4 space-y-3 font-mono text-[12px] text-neutral-300">
            <li className="flex items-start gap-3">
              <span className="w-16 shrink-0 text-neutral-500">macOS</span>
              <span>.dmg · code-signed · first target</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-16 shrink-0 text-neutral-500">Windows</span>
              <span>.msi · follows macOS</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-16 shrink-0 text-neutral-500">Linux</span>
              <span>.AppImage · follows Windows</span>
            </li>
          </ul>
        </section>

        <section className="mt-6 rounded-md border border-neutral-800 bg-neutral-950/60 p-6">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
            why a local app, not a SaaS
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed text-neutral-300">
            A hosted service would have to earn the applicant&apos;s trust for
            every field they type. A local app inverts that — the applicant
            runs the projection, sees the three role views side-by-side, and
            only exports what they choose to export. &ldquo;You don&apos;t
            have to trust us&rdquo; is a product shape, not a marketing line.
          </p>
        </section>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            href="/demo/owl-compute"
            className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-500"
          >
            Try the web demo first
            <span aria-hidden>→</span>
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center gap-2 rounded-md border border-neutral-800 px-5 py-2.5 text-sm text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
          >
            Read the briefing
          </Link>
        </div>
      </main>

      <footer className="border-t border-neutral-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 text-[11px] text-neutral-500">
          <span>synthetic composite · illustrative only</span>
          <Link href="/" className="hover:text-neutral-300">
            ← back
          </Link>
        </div>
      </footer>
    </div>
  );
}
