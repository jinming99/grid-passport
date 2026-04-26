import { BlockLabel } from "./Shell";

const STEPS = [
  { cmd: "$ pnpm demo:bundle", kind: "cmd" as const },
  { line: "▸ forging signer keypair (ed25519) · OS keychain simulated", kind: "info" as const },
  { line: "▸ building fixture · case = owl-compute · role = utility", kind: "info" as const },
  { line: "▸ JCS-canonicalizing payload · RFC 8785", kind: "info" as const },
  { line: "▸ signing · Ed25519 · 64 bytes", kind: "info" as const },
  { line: "  bundle.sig = 3a9f…d4e2 · policy@0.1.0 · payload_sha256 = 7e1c…b83a", kind: "dim" as const },
  { line: "✓ TS verifier   · @noble/ed25519       · accepted", kind: "ok" as const },
  { line: "✓ Rust verifier · ed25519-dalek        · accepted · bytes match", kind: "ok" as const },
  { line: "✓ Py verifier   · cryptography (PyCA)  · accepted · bytes match", kind: "ok" as const },
  { line: "▸ tampering · flipping one bit in derivedProof.firmness", kind: "info" as const },
  { line: "✗ TS verifier   · rejected · signature invalid",  kind: "bad" as const },
  { line: "✗ Rust verifier · rejected · signature invalid",  kind: "bad" as const },
  { line: "✗ Py verifier   · rejected · signature invalid",  kind: "bad" as const },
  { line: "─────────────────────────────────────────────────────────", kind: "rule" as const },
  { line: "15 / 15 canary gates green · roundtrip 48.7s · wall-clock", kind: "done" as const },
];

const COLOR: Record<string, string> = {
  cmd: "text-cyan-200",
  info: "text-neutral-300",
  dim: "text-neutral-500",
  ok: "text-lime-300",
  bad: "text-rose-300",
  rule: "text-neutral-700",
  done: "text-amber-200",
};

export function Roundtrip() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <BlockLabel label="// what happens when you run it" />
        <h2 className="w-full text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-neutral-50 sm:text-5xl lg:text-[60px]">
          One command. Sign, verify across three languages, tamper, reject —
          on your laptop, in under a minute.
        </h2>
        <p className="mt-3 max-w-2xl font-mono text-[14px] text-neutral-400">
          No shared server. No API key. No trusted third party.
          <span className="text-cyan-300"> pnpm demo:bundle</span> exercises the full release surface
          across TypeScript, Rust, and Python.
        </p>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="hud-frame font-mono text-[14px] leading-[1.7]">
            <div className="flex items-center justify-between border-b border-cyan-500/15 px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-neutral-500">
              <span>terminal · roundtrip</span>
              <span className="flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500/70" />
                <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                <span className="h-2 w-2 rounded-full bg-lime-400/70" />
              </span>
            </div>
            <pre className="overflow-x-auto px-4 py-4 text-[14px]">
{STEPS.map((s, i) => (
  <span key={i} className={`block ${COLOR[s.kind]}`}>
    {"cmd" in s && s.cmd ? s.cmd : "line" in s ? s.line : ""}
  </span>
))}
              <span className="text-cyan-400 hud-caret">▮</span>
            </pre>
          </div>

          <div className="grid gap-3">
            <Tile
              big="48.7s"
              label="wall-clock · sign + verify × 3 languages + tamper + reject"
            />
            <Tile big="15 / 15" label="canary gates on the branch · zero disabled" />
            <Tile big="0 kb" label="network traffic during projection + signing" />
            <Tile
              big="3 / 3"
              label="verifiers accept · TS @noble · Rust dalek · Py PyCA"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Tile({ big, label }: { big: string; label: string }) {
  return (
    <div className="hud-frame px-4 py-4">
      <div className="font-mono text-[24px] leading-none text-cyan-200">{big}</div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </div>
    </div>
  );
}
