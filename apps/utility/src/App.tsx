import { useCallback, useEffect, useState } from "react";
import type { VerifyResult } from "@grid-passport/verifier";
import { loadAndVerifyBundle } from "./lib/bundle-loader";
import { UtilityProjection } from "./components/UtilityProjection";
import { ComposeShedRequest } from "./components/ComposeShedRequest";
import { ForecastChart } from "./components/ForecastChart";
import { ReasoningPanel } from "./components/ReasoningPanel";

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

type SessionTone = "ready" | "loading" | "ok" | "error";

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
  const session = sessionStatus(state);

  return (
    <div className="shell">
      <header className="banner">
        <div className="banner-brand">
          <span className="brand">
            grid<span className="brand-dot">·</span>passport
          </span>
          <span className="stamp">utility · v0</span>
        </div>
        <div className={`telltale is-${session.tone}`}>
          <span className="telltale-dot" /> verifier · local only ·{" "}
          <span className="telltale-text">{session.label}</span>
        </div>
      </header>

      <main className="stage utility-stage">
        <section className="utility-hero">
          <div className="utility-hero-copy">
            <div className="utility-eyebrow">utility review surface</div>
            <TypeOnHeadline text="Verify the disclosure before you plan against it." />
            <p className="utility-sub">
              Paste the applicant&apos;s issuer key, open the signed bundle,
              and inspect only the projection the utility is allowed to see.
              Signature verification, policy checks, and projection rendering
              all happen locally on this machine.
            </p>
          </div>
        </section>

        <section className="verify-workbench">
          <div className="verify-workbench-copy">
            <h2 className="verify-workbench-title">
              Pin the issuer key, then open the disclosure bundle.
            </h2>
            <p className="verify-workbench-sub">
              If the signature, issuer key, or policy envelope do not line up,
              the utility view stays blocked. Successful verification unlocks
              the proof-only projection and the downstream operations tools.
            </p>
            <div className="verify-checklist">
              <div className="verify-check-item">
                <span className="verify-check-num">01</span>
                <span>paste the applicant&apos;s Ed25519 public key</span>
              </div>
              <div className="verify-check-item">
                <span className="verify-check-num">02</span>
                <span>open the signed bundle.json from the handoff</span>
              </div>
              <div className="verify-check-item">
                <span className="verify-check-num">03</span>
                <span>render the utility projection only after local verify</span>
              </div>
            </div>
          </div>

          <div className="verify-panel">
            <div className="verify-panel-head">
              <div>
                <div className="verify-panel-title">Issuer Key + Bundle</div>
                <div className="verify-panel-sub">
                  base64 public key for this verification session
                </div>
              </div>
              <div className={`verify-state-pill is-${session.tone}`}>
                {session.label}
              </div>
            </div>

            <label htmlFor="issuer-pubkey" className="verify-label">
              issuer public key
            </label>
            <textarea
              id="issuer-pubkey"
              value={pubKeyInput}
              onChange={(e) => setPubKeyInput(e.target.value)}
              placeholder="MCowBQYDK2VwAyEA... paste applicant pubkey"
              className="verify-input"
              spellCheck={false}
              rows={4}
            />

            <div className="verify-actions">
              <button
                type="button"
                onClick={onLoad}
                disabled={!canLoad}
                className="utility-button utility-button-primary"
              >
                {state.kind === "loading"
                  ? "verifying…"
                  : "open bundle.json →"}
              </button>
              <div className="verify-action-note">
                Signature verification, policy checks, and utility projection
                rendering all run locally with no network path.
              </div>
            </div>

            <div className="verify-trust-strip">
              <span className="verify-trust-chip">local verify only</span>
              <span className="verify-trust-chip">ed25519 signature gate</span>
              <span className="verify-trust-chip">proof-only release view</span>
            </div>
          </div>
        </section>

        {state.kind === "error" ? (
          <section className="verify-result is-error">
            <div className="verify-result-head">
              <div>
                <div className="verify-result-eyebrow">session blocked</div>
                <div className="verify-result-title">
                  The bundle could not be opened for verification.
                </div>
              </div>
              <div className="verify-result-badge is-error">
                utility view blocked
              </div>
            </div>
            <div className="verify-result-body mono">{state.message}</div>
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
      <section className="verify-result is-error">
        <div className="verify-result-head">
          <div>
            <div className="verify-result-eyebrow">bundle rejected</div>
            <div className="verify-result-title">
              The signed disclosure did not pass verification.
            </div>
          </div>
          <div className="verify-result-badge is-error">
            projection withheld
          </div>
        </div>
        <div className="verify-result-body">
          <div className="verify-source mono" title={path}>
            source · {path}
          </div>
          <ul className="verify-reason-list">
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
      <section className="verify-result is-ok">
        <div className="verify-result-head">
          <div>
            <div className="verify-result-eyebrow">bundle verified</div>
            <div className="verify-result-title">
              {p.issuer.label ?? "Applicant disclosure"} accepted for utility
              review.
            </div>
          </div>
          <div className="verify-result-badge is-ok">
            utility projection unlocked
          </div>
        </div>
        <div className="verify-meta-grid">
          <VerifyMeta label="issuer keyId" value={p.issuer.keyId} />
          <VerifyMeta label="bundle id" value={p.bundleId} />
          <VerifyMeta label="request id" value={p.requestId} />
          <VerifyMeta label="policy version" value={p.policyVersion} />
          <VerifyMeta
            label="policy hash · rego"
            value={compactValue(verify.policyHash?.rego)}
            title={verify.policyHash?.rego}
          />
          <VerifyMeta
            label="policy hash · runtime"
            value={compactValue(verify.policyHash?.runtime)}
            title={verify.policyHash?.runtime}
          />
          <VerifyMeta
            label="audit chain"
            value={`${p.auditChain.length} event(s) · sha-256 prevHash linked`}
          />
          <VerifyMeta
            label="issuer"
            value={p.issuer.label ?? "applicant"}
          />
        </div>
        <div className="verify-source mono" title={path}>
          source · {path}
        </div>
      </section>

      <section className="card">
        <div className="card-title">utility projection</div>
        <div className="card-body">
          <UtilityProjection view={utilityView} />
        </div>
      </section>

      <ForecastChart />

      <ReasoningPanel />

      <ComposeShedRequest
        recipientCaseId={p.caseId}
        recipientRequestId={p.requestId}
        recipientLabel={p.issuer.label || "applicant"}
      />

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

function VerifyMeta({
  label,
  value,
  title,
}: {
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <div className="verify-meta-cell">
      <div className="verify-meta-label">{label}</div>
      <div className="verify-meta-value mono" title={title ?? value}>
        {value}
      </div>
    </div>
  );
}

function sessionStatus(state: LoadState): { tone: SessionTone; label: string } {
  if (state.kind === "loading") {
    return { tone: "loading", label: "verifying bundle" };
  }
  if (state.kind === "error") {
    return { tone: "error", label: "verify blocked" };
  }
  if (state.kind === "loaded") {
    return state.verify.ok
      ? { tone: "ok", label: "bundle verified" }
      : { tone: "error", label: "bundle rejected" };
  }
  return { tone: "ready", label: "ready for bundle" };
}

function compactValue(value: string | undefined): string {
  if (!value) return "—";
  if (value.length <= 28) return value;
  return `${value.slice(0, 18)}…${value.slice(-6)}`;
}

function TypeOnHeadline({ text }: { text: string }) {
  const showPeriod = text.endsWith(".");
  const animatedText = showPeriod ? text.slice(0, -1) : text;
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setVisibleCount(animatedText.length);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setVisibleCount((prev) => {
        if (prev >= animatedText.length) {
          return 0;
        }
        return prev + 1;
      });
    }, visibleCount >= animatedText.length ? 1800 : 28);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [animatedText, visibleCount]);

  const typed = animatedText.slice(0, visibleCount);

  return (
    <h1 className="utility-title" aria-label={text.replace(/\n/g, " ")}>
      <span className="utility-title-sizer" aria-hidden="true">
        {text}
      </span>
      <span className="utility-title-typed" aria-hidden="true">
        {typed}
        {showPeriod && visibleCount >= animatedText.length ? "." : null}
      </span>
    </h1>
  );
}
