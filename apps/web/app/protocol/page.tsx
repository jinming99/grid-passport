import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Protocol · Grid Passport",
  description:
    "The signed disclosure bundle protocol — threat model, primitives, and verify-it-yourself.",
};

const REPO = "https://github.com/jinming99/grid-passport";

const THREATS = [
  {
    id: "T1",
    label: "Projection tampering",
    where: "in transit (email, shared drive, intake clerk)",
    covered: "Ed25519 signature over JCS-canonicalized payload.",
  },
  {
    id: "T2",
    label: "Substitution",
    where: "attacker forwards someone else's bundle as yours",
    covered:
      "Utility pins the applicant's public key on onboarding (SSH known_hosts model). Bundle issuer key must match.",
  },
  {
    id: "T3",
    label: "Policy-hash forgery",
    where: "adversary claims the bundle was produced under a permissive policy",
    covered:
      "Dual policy hash (Rego source + runtime table) is inside the signed payload.",
  },
  {
    id: "T4",
    label: "Audit-chain tamper",
    where: "delete, reorder, or insert events",
    covered:
      "Each event's prevHash links to SHA-256 of the prior event. Entire chain is signed.",
  },
  {
    id: "T5",
    label: "Canonicalization mismatch",
    where: "two honest producers compute different signatures for the same data",
    covered: "RFC 8785 JCS specifies a unique serialization. Tested against the author's official vectors.",
  },
  {
    id: "T6",
    label: "Signing-key theft",
    where: "compromise of the applicant's laptop",
    covered:
      "Private key stored in macOS Keychain / Windows Credential Manager / Linux Secret Service via the Rust keyring crate. Never crosses the Tauri IPC boundary.",
  },
];

const PRIMITIVES = [
  {
    name: "RFC 8785 · JCS",
    what: "Deterministic JSON serialization so signing is reliable across producers.",
    why: "Signatures are over bytes, not objects. Without canonicalization, two honest producers disagree.",
    src: "https://www.rfc-editor.org/rfc/rfc8785",
  },
  {
    name: "RFC 8032 · Ed25519",
    what: "Elliptic-curve signatures on Curve25519. 32-byte keys, 64-byte signatures, deterministic.",
    why: "Deterministic (no nonce-leak failure mode), side-channel safer than ECDSA, NIST-standardized since FIPS 186-5.",
    src: "https://www.rfc-editor.org/rfc/rfc8032",
  },
  {
    name: "FIPS 180-4 · SHA-256",
    what: "The hash primitive underneath the audit chain and policy-hash binding.",
    why: "Ubiquitous, implemented natively by every JS runtime via WebCrypto. Nobody needs to audit our SHA-256.",
    src: "https://csrc.nist.gov/pubs/fips/180-4/upd1/final",
  },
  {
    name: "@noble/ed25519",
    what: "TypeScript Ed25519 library. 5 KB, zero deps.",
    why: "Audited by Cure53 (v1 2022; noble-curves family 2024). Used at scale in Ethereum + crypto-wallet ecosystem.",
    src: "https://github.com/paulmillr/noble-ed25519",
  },
  {
    name: "ed25519-dalek + keyring",
    what: "Rust signing primitive in the desktop app. Secret stored in OS keychain.",
    why:
      "`keyring` is the same crate cargo login uses; `ed25519-dalek` is used by Zcash, Solana, and adjacent production systems.",
    src: "https://docs.rs/ed25519-dalek",
  },
];

const CHECKS = [
  {
    cmd: "pnpm core:test",
    does: "RFC 8785 official test vectors pass through our JCS byte-for-byte.",
    proves: "Canonicalization is spec-correct — including the notorious \"weird\" vector with emoji surrogate pairs.",
  },
  {
    cmd: "pnpm verifier:test",
    does:
      "10 targeted tamper cases + 2000-iteration fuzz of random byte mutations.",
    proves:
      "Every known-threat rejection path works. Arbitrary-mutation acceptance rate is zero.",
  },
  {
    cmd: "pnpm canary:bundle",
    does: "Sign → verify → tamper → reject across all 3 case fixtures.",
    proves: "End-to-end protocol roundtrip holds.",
  },
  {
    cmd: "pnpm canary:roundtrip",
    does:
      "TS signs a bundle. Rust signs the same payload independently. TS + Python verifiers accept both. Tamper either. All reject.",
    proves:
      "Three-way protocol portability: the TS, Rust (ed25519-dalek), and Python (PyCA) stacks agree byte-for-byte. A utility is free to pick any stack.",
  },
  {
    cmd: "pnpm desktop:test",
    does:
      "Rust unit test exercises the actual keyring read/write → ed25519-dalek sign → verify round-trip using keyring's mock backend.",
    proves:
      "The production Tauri signing path (generate → persist in OS keychain → reload → sign) is mechanically correct. No UI automation needed.",
  },
];

function Header() {
  return (
    <header className="border-b border-neutral-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="font-mono text-[13px] uppercase tracking-[0.22em] text-neutral-300 hover:text-neutral-100"
        >
          grid<span className="text-sky-400">·</span>passport
        </Link>
        <nav className="flex items-center gap-4 text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          <Link href="/about" className="hover:text-neutral-200">the story</Link>
          <span className="text-neutral-700">·</span>
          <Link href="/demo/owl-compute" className="hover:text-neutral-200">demo</Link>
          <span className="text-neutral-700">·</span>
          <Link href="/protocol" className="text-sky-400">protocol</Link>
          <span className="text-neutral-700">·</span>
          <Link href="/downloads" className="hover:text-neutral-200">desktop</Link>
        </nav>
      </div>
    </header>
  );
}

export default function ProtocolPage() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <Header />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-24 pt-16">
        {/* Hero */}
        <section className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-neutral-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-lime-400" />
            signed disclosure bundle · v1.0.0
          </span>
          <h1 className="max-w-4xl text-4xl font-semibold leading-[1.1] tracking-tight text-neutral-50 sm:text-5xl">
            Don't trust us.{" "}
            <span className="text-neutral-500">
              The protocol is verifiable with 200 lines of Python.
            </span>
          </h1>
          <p className="max-w-3xl text-[15px] leading-relaxed text-neutral-400">
            When an applicant exports a disclosure bundle from Grid Passport,
            it carries three things: role-projected views, a hash-chained
            audit trail, and an Ed25519 signature from a key that lives only
            on the applicant's machine. A utility with the applicant's pinned
            public key can verify the bundle independently, without running
            our code and without a network call.
          </p>
          <p className="max-w-3xl text-[13px] leading-relaxed text-neutral-500">
            This page is the public face of the protocol. The normative spec,
            design rationale, and every test that backs a claim below live in
            the repo under <code className="font-mono text-neutral-400">docs/design/</code>.
          </p>
        </section>

        {/* Threat model */}
        <section className="mt-20">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
              threat model
            </h2>
            <a
              href={`${REPO}/blob/main/docs/design/signed-bundle.md#2-threat-model`}
              className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 hover:text-neutral-200"
            >
              full rationale →
            </a>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {THREATS.map((t) => (
              <div
                key={t.id}
                className="rounded-md border border-neutral-800 bg-neutral-950/60 p-4"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-amber-300">
                    {t.id}
                  </span>
                  <span className="text-[14px] font-medium text-neutral-100">
                    {t.label}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-neutral-500">
                  attacker surface · {t.where}
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-neutral-300">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-lime-300">
                    covered ·{" "}
                  </span>
                  {t.covered}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Primitives */}
        <section className="mt-20">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
              primitives we rely on
            </h2>
            <span className="text-[11px] text-neutral-600">
              nothing custom · every choice is a standard
            </span>
          </div>
          <div className="overflow-hidden rounded-md border border-neutral-800">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-neutral-900 bg-neutral-950/60 text-left text-[11px] uppercase tracking-widest text-neutral-500">
                  <th className="px-4 py-2 font-medium">Primitive</th>
                  <th className="px-4 py-2 font-medium">What it does</th>
                  <th className="px-4 py-2 font-medium">Why it</th>
                </tr>
              </thead>
              <tbody>
                {PRIMITIVES.map((p) => (
                  <tr key={p.name} className="border-b border-neutral-900 last:border-b-0">
                    <td className="whitespace-nowrap px-4 py-3 align-top">
                      <a
                        href={p.src}
                        className="font-mono text-[12px] text-sky-300 hover:text-sky-200"
                      >
                        {p.name}
                      </a>
                    </td>
                    <td className="px-4 py-3 align-top text-neutral-300">{p.what}</td>
                    <td className="px-4 py-3 align-top text-neutral-400">{p.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Verify it yourself */}
        <section className="mt-20">
          <div className="mb-4">
            <h2 className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
              verify it yourself
            </h2>
            <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-neutral-400">
              Every claim in the spec is backed by a runnable command. Clone the
              repo, run these, and read the source. Total wall-clock: ~30
              seconds.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {CHECKS.map((c) => (
              <div
                key={c.cmd}
                className="rounded-md border border-neutral-800 bg-neutral-950/60 p-4"
              >
                <code className="block font-mono text-[13px] text-lime-300">
                  $ {c.cmd}
                </code>
                <p className="mt-2 text-[13px] text-neutral-300">
                  <span className="text-neutral-500">does · </span>
                  {c.does}
                </p>
                <p className="mt-1 text-[13px] text-neutral-400">
                  <span className="text-neutral-500">proves · </span>
                  {c.proves}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Stage demo */}
        <section className="mt-20">
          <h2 className="mb-4 text-[11px] uppercase tracking-[0.22em] text-neutral-500">
            the stage demo · 60 seconds
          </h2>
          <ol className="flex flex-col gap-3 text-[13px] leading-relaxed text-neutral-300">
            {[
              "Open the desktop app. Watch Activity Monitor — zero network activity.",
              "Load a case, click `export signed bundle.json`. Bundle writes to disk.",
              "`cat bundle.json` — the signature is right there in plain text; the payload is human-readable; the audit chain reads top-to-bottom.",
              "`pnpm canary:roundtrip` — independent TS and Python verifiers both accept it.",
              "Flip one byte: `sed -i 's/180/999/' bundle.json`. Both verifiers reject.",
            ].map((step, i) => (
              <li
                key={i}
                className="flex gap-3 rounded border border-neutral-900 bg-neutral-950/40 p-3"
              >
                <span className="font-mono text-[11px] text-neutral-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Docs */}
        <section className="mt-20">
          <h2 className="mb-4 text-[11px] uppercase tracking-[0.22em] text-neutral-500">
            read the spec
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <a
              href={`${REPO}/blob/main/docs/design/signed-bundle.md`}
              className="rounded-md border border-neutral-800 bg-neutral-950/60 p-4 hover:border-neutral-700"
            >
              <div className="font-mono text-[11px] uppercase tracking-widest text-sky-300">
                signed-bundle.md
              </div>
              <div className="mt-2 text-[14px] font-medium text-neutral-100">
                Design rationale
              </div>
              <div className="mt-1 text-[13px] text-neutral-400">
                Threat model, eight design decisions, alternatives considered,
                rejected options + reasons, 10-Q demo defense, post-quantum
                migration path.
              </div>
            </a>
            <a
              href={`${REPO}/blob/main/docs/design/signed-bundle-spec.md`}
              className="rounded-md border border-neutral-800 bg-neutral-950/60 p-4 hover:border-neutral-700"
            >
              <div className="font-mono text-[11px] uppercase tracking-widest text-sky-300">
                signed-bundle-spec.md
              </div>
              <div className="mt-2 text-[14px] font-medium text-neutral-100">
                Normative specification
              </div>
              <div className="mt-1 text-[13px] text-neutral-400">
                Wire format, sign/verify algorithms, test vectors, conformance
                checklist for new implementations, versioning policy,
                reproducibility commands.
              </div>
            </a>
            <a
              href={`${REPO}/tree/main/packages/verifier`}
              className="rounded-md border border-neutral-800 bg-neutral-950/60 p-4 hover:border-neutral-700"
            >
              <div className="font-mono text-[11px] uppercase tracking-widest text-sky-300">
                packages/verifier/
              </div>
              <div className="mt-2 text-[14px] font-medium text-neutral-100">
                TypeScript reference verifier
              </div>
              <div className="mt-1 text-[13px] text-neutral-400">
                Zero framework deps. ~300 LoC single file. Tested against
                tamper matrix + 2000-iteration fuzz.
              </div>
            </a>
            <a
              href={`${REPO}/tree/main/apps/verifier-py`}
              className="rounded-md border border-neutral-800 bg-neutral-950/60 p-4 hover:border-neutral-700"
            >
              <div className="font-mono text-[11px] uppercase tracking-widest text-sky-300">
                apps/verifier-py/
              </div>
              <div className="mt-2 text-[14px] font-medium text-neutral-100">
                Python reference verifier
              </div>
              <div className="mt-1 text-[13px] text-neutral-400">
                Single file, PyCA cryptography only. Proves the protocol is
                not locked into our stack.
              </div>
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4 text-[11px] text-neutral-500">
          <span>synthetic composite · illustrative only · bundle v1.0.0</span>
          <nav className="flex flex-wrap items-center gap-3">
            <Link href="/about" className="hover:text-neutral-300">story</Link>
            <span className="text-neutral-700">·</span>
            <Link href="/demo/owl-compute" className="hover:text-neutral-300">demo</Link>
            <span className="text-neutral-700">·</span>
            <a href={REPO} className="hover:text-neutral-300">repo</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
