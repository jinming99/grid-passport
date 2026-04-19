import { useCallback, useMemo, useState } from "react";
import {
  CASE_METAS,
  DEFAULT_CASE_ID,
  getCase,
} from "@grid-passport/core/fixtures";
import { buildRecord } from "@grid-passport/core/forecast";
import { projectForRole } from "@grid-passport/core/projection";
import type { CaseInput, Role } from "@grid-passport/core/types";
import type { ProjectedView } from "@grid-passport/core/projection";
import {
  CaseValidationError,
  loadCaseFromFile,
  type LoadedCase,
} from "./lib/case-loader";
import { buildAndSignBundle, exportBundle } from "./lib/bundle";
import { ReviewColumn } from "./components/ReviewColumn";

const ROLES: Role[] = ["applicant", "utility", "regulator"];

type Mode = "work" | "review";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "exporting" }
  | { kind: "exported"; path: string }
  | { kind: "error"; message: string };

function bundledLoaded(caseId: string): LoadedCase {
  const input = getCase(caseId);
  if (!input) throw new Error(`unknown bundled case: ${caseId}`);
  return { input, source: { kind: "bundled", caseId } };
}

export function App() {
  const [loaded, setLoaded] = useState<LoadedCase>(() =>
    bundledLoaded(DEFAULT_CASE_ID),
  );
  const [mode, setMode] = useState<Mode>("work");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const projections = useMemo(() => {
    const record = buildRecord(loaded.input);
    const out: Record<Role, ProjectedView> = {
      applicant: projectForRole(record, "applicant"),
      utility: projectForRole(record, "utility"),
      regulator: projectForRole(record, "regulator"),
    };
    return out;
  }, [loaded]);

  const onPickBundled = useCallback((caseId: string) => {
    try {
      setLoaded(bundledLoaded(caseId));
      setStatus({ kind: "idle" });
    } catch (err) {
      setStatus({ kind: "error", message: (err as Error).message });
    }
  }, []);

  const onOpenFile = useCallback(async () => {
    setStatus({ kind: "loading" });
    try {
      const result = await loadCaseFromFile();
      if (!result) {
        setStatus({ kind: "idle" });
        return;
      }
      setLoaded(result);
      setStatus({ kind: "idle" });
    } catch (err) {
      const msg =
        err instanceof CaseValidationError
          ? err.message
          : `failed to load: ${(err as Error).message}`;
      setStatus({ kind: "error", message: msg });
    }
  }, []);

  const onExport = useCallback(async () => {
    setStatus({ kind: "exporting" });
    try {
      const bundle = await buildAndSignBundle(
        loaded.input,
        projections,
        loaded.input.applicantOrg,
      );
      const result = await exportBundle(bundle);
      if (!result) {
        setStatus({ kind: "idle" });
        return;
      }
      setStatus({ kind: "exported", path: result.path });
    } catch (err) {
      setStatus({
        kind: "error",
        message: `export failed: ${(err as Error).message}`,
      });
    }
  }, [loaded, projections]);

  const enterReview = useCallback(() => {
    setStatus({ kind: "idle" });
    setMode("review");
  }, []);
  const exitReview = useCallback(() => setMode("work"), []);

  const input: CaseInput = loaded.input;

  return (
    <div className="shell">
      <header className="banner">
        <div className="banner-left">
          <div className="brand">
            grid<span className="brand-dot">·</span>passport
          </div>
          <div className="stamp">desktop · v0</div>
        </div>
        <div className="banner-right">
          <div className="telltale">
            <span className="telltale-dot" /> projection · in-process · no
            network
          </div>
        </div>
      </header>

      {mode === "work" ? (
        <section className="case-bar">
          <div className="case-meta">
            <div className="case-title">
              {input.applicantOrg}
              <span className="dim">
                {" "}
                · {input.requestedMW} MW · {input.site.county},{" "}
                {input.site.state}
              </span>
            </div>
            <div className="case-source">
              {loaded.source.kind === "file" ? (
                <>
                  <span className="source-tag">source · file</span>
                  <span
                    className="source-path mono"
                    title={loaded.source.path}
                  >
                    {loaded.source.path}
                  </span>
                </>
              ) : (
                <>
                  <span className="source-tag">source · bundled fixture</span>
                  <span className="source-path mono">
                    {loaded.source.caseId}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="case-controls">
            <div className="control-group">
              <div className="label">bundled</div>
              <div className="chips">
                {CASE_METAS.map((c) => (
                  <button
                    key={c.caseId}
                    type="button"
                    className={`chip ${
                      loaded.source.kind === "bundled" &&
                      loaded.source.caseId === c.caseId
                        ? "on"
                        : ""
                    }`}
                    onClick={() => onPickBundled(c.caseId)}
                  >
                    {c.displayName}
                  </button>
                ))}
              </div>
            </div>
            <div className="control-group">
              <div className="label">or</div>
              <div className="chips">
                <button
                  type="button"
                  className="chip chip-action"
                  onClick={onOpenFile}
                  disabled={status.kind === "loading"}
                >
                  {status.kind === "loading" ? "opening…" : "open case.json…"}
                </button>
              </div>
            </div>
            <div className="control-group control-spacer" />
            <div className="control-group">
              <div className="label">next</div>
              <div className="chips">
                <button
                  type="button"
                  className="chip chip-primary"
                  onClick={enterReview}
                >
                  review disclosure →
                </button>
              </div>
            </div>
          </div>

          {status.kind === "error" ? (
            <div className="status-line status-err">✘ {status.message}</div>
          ) : null}
        </section>
      ) : (
        <section className="review-gate">
          <div className="review-gate-head">
            <button
              type="button"
              className="link-back"
              onClick={exitReview}
            >
              ← back to editing
            </button>
            <div className="review-gate-title">
              <div className="rg-title">review disclosure</div>
              <div className="rg-sub">
                preview three audiences before you export ·{" "}
                <span className="mono">{input.applicantOrg}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      <main className={`stage mode-${mode}`}>
        {mode === "work" ? (
          <ReviewColumn view={projections.applicant} variant="work" />
        ) : (
          ROLES.map((role) => (
            <ReviewColumn
              key={role}
              view={projections[role]}
              variant="review"
            />
          ))
        )}
      </main>

      {mode === "review" ? (
        <section className="review-terminus">
          <div className="rt-copy">
            <div className="rt-title">export this disclosure</div>
            <div className="rt-sub">
              bundle v1 · Ed25519 signed · audit chain included · verify with{" "}
              <span className="mono">pnpm canary:bundle</span>
            </div>
          </div>
          <div className="rt-actions">
            <button
              type="button"
              className="chip chip-primary chip-big"
              onClick={onExport}
              disabled={status.kind === "exporting"}
            >
              {status.kind === "exporting"
                ? "signing + writing…"
                : "export signed bundle.json"}
            </button>
          </div>
          {status.kind === "error" ? (
            <div className="status-line status-err">✘ {status.message}</div>
          ) : null}
          {status.kind === "exported" ? (
            <div className="status-line status-ok">
              ✔ wrote <span className="mono">{status.path}</span>
            </div>
          ) : null}
        </section>
      ) : null}

      <footer className="foot">
        <span>
          policy ·{" "}
          <span className="mono">{projections.applicant.policyVersion}</span>
        </span>
        <span>
          request ·{" "}
          <span className="mono">{projections.applicant.requestId}</span>
        </span>
        <span className="dim">
          all data synthetic · simulated confidential boundary · bundle v1 ·
          Ed25519
        </span>
      </footer>
    </div>
  );
}
