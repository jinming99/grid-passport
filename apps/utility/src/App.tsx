import { useCallback, useState } from "react";
import type { VerifyResult } from "@grid-passport/verifier";
import { loadAndVerifyBundle } from "./lib/bundle-loader";
import { UtilityProjection } from "./components/UtilityProjection";

// Track 3.1-polish. Real drop-zone + projection render + trust-claim stamp.
//
// Write-scope contract (enforced structurally by `pnpm canary:utility`):
//   - imports ONLY @grid-passport/verifier + @grid-passport/core/{types,
//     projection, bundle} (the last as `import type` in practice);
//   - MUST NOT import @grid-passport/core/{fixtures, forecast, audit},
//     since those are the applicant-side writers. The utility has no
//     source of raw CaseInput and therefore no capability to reconstruct
//     one.

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "loaded";
      path: string;
      verify: VerifyResult;
    }
  | { kind: "error"; message: string };

export function App() {
  const [pubKeyInput, setPubKeyInput] = useState("");
  const [state, setState] = useState<LoadState>({ kind: "idle" });

  const onLoad = useCallback(async () => {
    setState({ kind: "loading" });
    const result = await loadAndVerifyBundle(pubKeyInput);
    if (result.kind === "cancelled") {
      setState({ kind: "idle" });
      return;
    }
    if (result.kind === "error") {
      setState({ kind: "error", message: result.message });
      return;
    }
    setState({ kind: "loaded", path: result.path, verify: result.verify });
  }, [pubKeyInput]);

  const canLoad = pubKeyInput.trim().length > 0 && state.kind !== "loading";

  return (
    <div className="shell">
      <header className="banner">
        <div>
          grid<span className="brand-dot">·</span>passport
          <span className="stamp">utility · v0</span>
        </div>
        <div className="telltale">
          <span className="telltale-dot" /> verifier · ready · no network
        </div>
      </header>

      <main className="stage">
        <section className="card">
          <div className="card-title">open a disclosure bundle</div>
          <div className="card-body">
            <p>
              Paste the applicant's issuer public key (base64), then open the
              bundle JSON. Verification happens locally — nothing leaves this
              machine. The utility view is only rendered when the signature
              checks out.
            </p>

            <label
              style={{
                display: "block",
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                marginBottom: 6,
              }}
            >
              issuer public key (base64, 32-byte Ed25519)
            </label>
            <input
              type="text"
              value={pubKeyInput}
              onChange={(e) => setPubKeyInput(e.target.value)}
              placeholder="MCowBQYDK2VwAyEA... (paste applicant pubkey)"
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

            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={onLoad}
                disabled={!canLoad}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  padding: "8px 14px",
                  background: "transparent",
                  color: "var(--ink)",
                  border: "1px solid var(--border)",
                  cursor: canLoad ? "pointer" : "not-allowed",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                {state.kind === "loading"
                  ? "verifying…"
                  : "open bundle.json →"}
              </button>
            </div>
          </div>
        </section>

        {state.kind === "error" ? (
          <section className="card" style={{ borderColor: "var(--rose, #fb7185)" }}>
            <div
              className="card-title"
              style={{ color: "var(--rose, #fb7185)" }}
            >
              error
            </div>
            <div className="card-body mono">{state.message}</div>
          </section>
        ) : null}

        {state.kind === "loaded" ? (
          <BundleView path={state.path} verify={state.verify} />
        ) : null}
      </main>

      <footer className="foot">
        <span>bundle v1.0.0 · Ed25519 · JCS (RFC 8785)</span>
        <span>verify-only · no network · utility surface</span>
      </footer>
    </div>
  );
}

function BundleView({
  path,
  verify,
}: {
  path: string;
  verify: VerifyResult;
}) {
  if (!verify.ok || !verify.payload) {
    return (
      <section
        className="card"
        style={{ borderColor: "var(--rose, #fb7185)" }}
      >
        <div
          className="card-title"
          style={{ color: "var(--rose, #fb7185)" }}
        >
          rejected
        </div>
        <div className="card-body">
          <div
            className="mono"
            style={{ fontSize: 10, color: "var(--ink-mute)" }}
            title={path}
          >
            source · {path}
          </div>
          <ul style={{ margin: "8px 0 0 18px" }}>
            {verify.reasons.map((r) => (
              <li key={r} className="mono">
                {r}
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  const p = verify.payload;
  const utilityView = p.projections.utility;

  return (
    <>
      <section
        className="card"
        style={{ borderColor: "var(--lime, #a3e635)" }}
      >
        <div
          className="card-title"
          style={{ color: "var(--lime, #a3e635)" }}
        >
          verified
        </div>
        <div className="card-body" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
          <div>
            keyId <span className="mono">{p.issuer.keyId}</span>
            {p.issuer.label ? (
              <>
                {" · "}issuer <span className="mono">{p.issuer.label}</span>
              </>
            ) : null}
          </div>
          <div style={{ marginTop: 4 }}>
            bundle <span className="mono">{p.bundleId}</span>
          </div>
          <div style={{ marginTop: 4 }}>
            policy @ <span className="mono">{p.policyVersion}</span>
          </div>
          <div style={{ marginTop: 4 }}>
            policy hash · rego{" "}
            <span className="mono">
              {verify.policyHash?.rego?.slice(0, 22)}…
            </span>{" "}
            · runtime{" "}
            <span className="mono">
              {verify.policyHash?.runtime?.slice(0, 22)}…
            </span>
          </div>
          <div style={{ marginTop: 4 }}>
            audit events{" "}
            <span className="mono">{p.auditChain.length}</span> · chained via
            SHA-256 prevHash
          </div>
          <div
            style={{
              marginTop: 6,
              color: "var(--ink-mute)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
            title={path}
          >
            source · {path}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-title">utility projection</div>
        <div className="card-body">
          <UtilityProjection view={utilityView} />
        </div>
      </section>

      <section
        className="card"
        style={{ borderLeft: "2px solid var(--lime, #a3e635)" }}
      >
        <div
          className="card-title"
          style={{ color: "var(--lime, #a3e635)" }}
        >
          trust claim
        </div>
        <div
          className="card-body mono"
          style={{ fontSize: 11, lineHeight: 1.6 }}
        >
          <div>
            • verification ran locally · no network calls during verify
          </div>
          <div>
            • this binary imports only{" "}
            <span style={{ color: "var(--ink)" }}>
              @grid-passport/verifier + @grid-passport/core/{"{"}types,
              projection, bundle{"}"}
            </span>
          </div>
          <div>
            • raw applicant privateProfile never crosses this projection's
            boundary by construction (enforced at import graph by{" "}
            <span style={{ color: "var(--ink)" }}>pnpm canary:utility</span>)
          </div>
          <div>
            • pinned to keyId{" "}
            <span style={{ color: "var(--ink)" }}>{p.issuer.keyId}</span> for
            this session
          </div>
        </div>
      </section>
    </>
  );
}
