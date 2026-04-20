import { useState } from "react";
import { verifyBundle, type VerifyResult } from "@grid-passport/verifier";

// Track 3.1 scaffold. The full drop-zone + projection-render UX lands in a
// follow-up; this v0 just proves the import chain compiles end-to-end and
// the verifier is callable from the utility surface.
//
// Write-scope contract (enforced structurally by `pnpm canary:utility`):
//   - imports ONLY @grid-passport/verifier + @grid-passport/core/{types,
//     projection, bundle} (the last two as `import type` in practice);
//   - MUST NOT import @grid-passport/core/{fixtures, forecast, audit},
//     since those are the applicant-side writers for derived proofs and
//     raw private profiles. The utility has no source of raw CaseInput and
//     therefore no capability to reconstruct one.

export function App() {
  const [paste, setPaste] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);

  async function onVerify() {
    // Placeholder: in the scaffold there's no public-key plumbing, so a
    // dummy 32-byte key will fail signature verification. This exercises the
    // import path; the real UX lands with the drop-zone + keyId display.
    const dummyKey = new Uint8Array(32);
    try {
      const r = await verifyBundle(paste, dummyKey);
      setResult(r);
    } catch (err) {
      setResult({ ok: false, reasons: [(err as Error).message] });
    }
  }

  return (
    <div className="shell">
      <header className="banner">
        <div>
          grid<span className="brand-dot">·</span>passport
          <span className="stamp">utility · v0</span>
        </div>
        <div className="telltale">
          <span className="telltale-dot" /> verifier · ready
        </div>
      </header>

      <main className="stage">
        <section className="card">
          <div className="card-title">drop a disclosure bundle</div>
          <div className="card-body">
            <p>
              The full drop-zone lands in the follow-up chunk. For now, paste
              a bundle JSON below and click verify. A production drop-zone will
              read the applicant's issuer public key from a trust store and
              render <span className="mono">verified · keyId · policy@hash</span>{" "}
              before exposing the utility projection.
            </p>
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={6}
              placeholder='{"schema":"grid-passport/bundle", ...}'
              style={{
                width: "100%",
                fontFamily: "var(--mono)",
                fontSize: 11,
                background: "var(--bg)",
                color: "var(--ink)",
                border: "1px solid var(--border)",
                padding: 10,
              }}
            />
            <button
              type="button"
              onClick={onVerify}
              disabled={!paste}
              style={{
                marginTop: 10,
                fontFamily: "var(--mono)",
                fontSize: 11,
                padding: "8px 14px",
                background: "transparent",
                color: "var(--ink)",
                border: "1px solid var(--border)",
                cursor: paste ? "pointer" : "not-allowed",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              verify bundle →
            </button>
          </div>
        </section>

        {result ? (
          <section className="card">
            <div className="card-title">
              {result.ok ? "verified" : "rejected"}
            </div>
            <div className="card-body">
              {result.ok ? (
                <p>
                  keyId <span className="mono">{result.payload?.issuer.keyId}</span>{" "}
                  · policy@
                  <span className="mono">
                    {result.policyHash?.runtime?.slice(0, 24)}…
                  </span>
                </p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {result.reasons.map((r) => (
                    <li key={r} className="mono">
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : null}
      </main>

      <footer className="foot">
        <span>bundle v1.0.0 · Ed25519</span>
        <span>no network · verify-only</span>
      </footer>
    </div>
  );
}
