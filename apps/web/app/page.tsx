import Link from "next/link";
import { getCase, CASE_METAS } from "@grid-passport/core/fixtures";
import { buildRecord } from "@grid-passport/core/forecast";
import { projectForRole } from "@grid-passport/core/projection";
import { BenefitPanel } from "@/components/BenefitPanel";
import { PAIN_FRAMINGS } from "@/lib/pain-framings";
import { TEAM } from "@/lib/team";

const TEASER_CASE_ID = "owl-compute";

export default function Home() {
  const teaserInput = getCase(TEASER_CASE_ID)!;
  const teaserRecord = buildRecord(teaserInput);
  const teaserView = projectForRole(teaserRecord, "utility");
  const teaserMeta = CASE_METAS.find((c) => c.caseId === TEASER_CASE_ID)!;

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="font-mono text-[13px] uppercase tracking-[0.22em] text-neutral-300">
            grid<span className="text-sky-400">·</span>passport
          </span>
          <nav className="flex items-center gap-4 text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            <Link href="/about" className="hover:text-neutral-200">
              the story
            </Link>
            <span className="text-neutral-700">·</span>
            <Link href="/technical" className="hover:text-neutral-200">
              technical
            </Link>
            <span className="text-neutral-700">·</span>
            <Link href="/demo/owl-compute" className="hover:text-neutral-200">
              demo
            </Link>
            <span className="text-neutral-700">·</span>
            <Link href="/protocol" className="hover:text-neutral-200">
              protocol
            </Link>
            <span className="text-neutral-700">·</span>
            <Link href="/downloads" className="hover:text-neutral-200">
              desktop
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-16">
        <section className="flex flex-col gap-8">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-neutral-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-lime-400" />
            confidential coordination · grid interconnection
          </span>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight text-neutral-50 sm:text-6xl">
            AI compute wants to plug in.{" "}
            <span className="text-neutral-500">
              The grid moves in years, not quarters.
            </span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-neutral-400">
            Grid Passport turns private load, site, and flexibility data into
            utility-usable proofs — without either side surrendering secrets.
            Policy governs disclosure. The applicant runs the tool locally;
            only signed projections cross the line.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/demo/owl-compute"
              className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-500"
            >
              Run a live request
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 rounded-md border border-neutral-800 px-5 py-2.5 text-sm text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
            >
              Read the briefing
            </Link>
          </div>
        </section>

        <section className="mt-20">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
              release diff · <span className="text-neutral-300">{teaserMeta.displayName}</span> · utility view
            </h2>
            <Link
              href={`/demo/${TEASER_CASE_ID}`}
              className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 hover:text-neutral-200"
            >
              see the live panel →
            </Link>
          </div>
          <BenefitPanel view={teaserView} />
          <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">
            For this case, the utility view exposes{" "}
            <span className="text-lime-400">0 of 6 competitive fields</span>{" "}
            while preserving every derived proof the utility needs to site the
            project. Switch cases and roles live on the{" "}
            <Link href="/demo/owl-compute" className="text-neutral-300 underline-offset-4 hover:underline">
              demo page
            </Link>.
          </p>
        </section>

        <section className="mt-20">
          <h2 className="mb-6 text-[11px] uppercase tracking-[0.22em] text-neutral-500">
            pain-point case studies
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {PAIN_FRAMINGS.map((p) => (
              <Link
                key={p.caseId}
                href={`/demo/${p.caseId}`}
                className="group flex flex-col rounded-md border border-neutral-800 bg-neutral-950/60 p-5 transition-colors hover:border-neutral-700"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[13px] uppercase tracking-[0.2em] text-neutral-200">
                    {p.displayName}
                  </span>
                  <span className="font-mono text-[11px] text-neutral-500">
                    {p.requestedMW} MW
                  </span>
                </div>
                <span className="mt-1 text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                  {p.county} County
                </span>
                <h3 className="mt-4 text-base font-medium leading-snug text-neutral-100">
                  {p.headline}
                </h3>
                <div className="mt-4 flex flex-col gap-3 text-[12px] leading-relaxed">
                  <div>
                    <span className="mr-2 rounded border border-amber-900/60 bg-amber-950/20 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-amber-300">
                      today
                    </span>
                    <span className="text-neutral-400">{p.today}</span>
                  </div>
                  <div>
                    <span className="mr-2 rounded border border-lime-900/60 bg-lime-950/20 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-lime-300">
                      with GP
                    </span>
                    <span className="text-neutral-300">{p.withGridPassport}</span>
                  </div>
                </div>
                <span className="mt-5 text-[11px] uppercase tracking-[0.18em] text-sky-400 group-hover:text-sky-300">
                  open case →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
              verifiable protocol · don't take our word for it
            </h2>
            <Link
              href="/protocol"
              className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 hover:text-neutral-200"
            >
              read the spec →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-md border border-neutral-800 bg-neutral-950/60 p-5">
              <div className="font-mono text-[11px] uppercase tracking-widest text-lime-300">
                RFC 8785 · JCS
              </div>
              <h3 className="mt-2 text-[15px] font-medium text-neutral-100">
                Canonical JSON
              </h3>
              <p className="mt-2 text-[12px] leading-relaxed text-neutral-400">
                Every bundle hashes to the same bytes regardless of producer.
                Tested against the RFC author's six official vectors including
                the emoji surrogate-pair case.
              </p>
            </div>
            <div className="rounded-md border border-neutral-800 bg-neutral-950/60 p-5">
              <div className="font-mono text-[11px] uppercase tracking-widest text-lime-300">
                RFC 8032 · Ed25519
              </div>
              <h3 className="mt-2 text-[15px] font-medium text-neutral-100">
                Signed by the applicant
              </h3>
              <p className="mt-2 text-[12px] leading-relaxed text-neutral-400">
                Private key lives in the OS keychain and never crosses the
                Tauri IPC boundary. Counterparty pins the public key
                once — same trust bootstrap as SSH.
              </p>
            </div>
            <div className="rounded-md border border-neutral-800 bg-neutral-950/60 p-5">
              <div className="font-mono text-[11px] uppercase tracking-widest text-lime-300">
                Three-stack parity
              </div>
              <h3 className="mt-2 text-[15px] font-medium text-neutral-100">
                TS ⇌ Rust ⇌ Python agree
              </h3>
              <p className="mt-2 text-[12px] leading-relaxed text-neutral-400">
                Independent signers in @noble/ed25519, ed25519-dalek, and PyCA
                produce byte-identical signatures; all three verifiers accept
                each other&apos;s bundles and reject every tamper —{" "}
                <code className="font-mono text-neutral-300">pnpm canary:roundtrip</code>.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="mb-6 text-[11px] uppercase tracking-[0.22em] text-neutral-500">
            crew
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {TEAM.map((m) => (
              <div
                key={m.name}
                className="rounded-md border border-neutral-800 bg-neutral-950/60 p-5"
              >
                <div className="font-mono text-[13px] uppercase tracking-[0.18em] text-neutral-200">
                  {m.name}
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                  {m.role}
                </div>
                <div className="mt-4 text-[12px] text-neutral-300">
                  <span className="font-mono text-neutral-400">
                    {m.affiliation}
                  </span>
                  {m.note && (
                    <span className="text-neutral-500"> · {m.note}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <div className="rounded-md border border-neutral-800 bg-neutral-950/60 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                  desktop app · status
                </div>
                <h3 className="mt-2 text-2xl font-semibold text-neutral-100">
                  Run the projection on your own machine.
                </h3>
                <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-neutral-400">
                  The production form of Grid Passport is a native desktop
                  application (Tauri). Raw inputs never leave your device;
                  only signed projection bundles do. Web demo above is the
                  teaching artifact — same projection code, hosted
                  illustration.
                </p>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="rounded-full border border-amber-900/60 bg-amber-950/20 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-amber-300">
                  coming soon
                </span>
                <Link
                  href="/downloads"
                  className="mt-3 text-[11px] uppercase tracking-[0.18em] text-neutral-400 hover:text-neutral-200"
                >
                  join the waitlist →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4 text-[11px] text-neutral-500">
          <span>synthetic composite · illustrative only · policy@0.1.0</span>
          <nav className="flex flex-wrap items-center gap-3">
            <Link href="/about" className="hover:text-neutral-300">
              story
            </Link>
            <span className="text-neutral-700">·</span>
            <Link href="/technical" className="hover:text-neutral-300">
              technical
            </Link>
            <span className="text-neutral-700">·</span>
            <Link href="/demo/owl-compute" className="hover:text-neutral-300">
              demo
            </Link>
            <span className="text-neutral-700">·</span>
            <Link href="/protocol" className="hover:text-neutral-300">
              protocol
            </Link>
            <span className="text-neutral-700">·</span>
            <a
              href="https://github.com/jinming99/grid-passport"
              className="hover:text-neutral-300"
            >
              repo
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
