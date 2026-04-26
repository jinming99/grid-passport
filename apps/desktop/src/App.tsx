import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CASE_METAS,
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
import { loadAllSkills, type LoadedSkill } from "./lib/skills-loader";
import { defaultInterviewerTransport } from "./lib/interviewer-transport";
import { ReviewColumn } from "./components/ReviewColumn";
import { IntakePanel } from "./components/IntakePanel";
import { ExplainerPanel } from "./components/ExplainerPanel";
import { OperationalDisclosurePanel } from "./components/OperationalDisclosurePanel";
import { TrustPanel } from "./components/TrustPanel";
import { HandoffCard } from "./components/HandoffCard";

const ROLES: Role[] = ["applicant", "utility", "regulator"];

type Mode = "work" | "review";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "exporting" }
  | {
      kind: "exported";
      path: string;
      issuerPublicKey: string;
      issuerKeyId: string;
    }
  | { kind: "error"; message: string };

function bundledLoaded(caseId: string): LoadedCase {
  const input = getCase(caseId);
  if (!input) throw new Error(`unknown bundled case: ${caseId}`);
  return { input, source: { kind: "bundled", caseId } };
}

export function App() {
  // Start empty — the app boots to a landing view that only reveals the
  // work/review UI once a case is loaded (via Interviewer prose, a case
  // chip, or open-case.json). This matches the demo narrative: the
  // audience sees nothing pre-loaded.
  const [loaded, setLoaded] = useState<LoadedCase | null>(null);
  const [mode, setMode] = useState<Mode>("work");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [interviewerSkill, setInterviewerSkill] =
    useState<LoadedSkill | null>(null);
  const [explainerSkill, setExplainerSkill] = useState<LoadedSkill | null>(
    null,
  );
  const [skillsLoadError, setSkillsLoadError] = useState<string | null>(null);

  // Load shipping Skills into memory on first mount. Fails softly when the
  // Tauri resource path is unavailable (e.g., running `vite` alone without
  // the Tauri host) — panels disable their submit buttons and surface the
  // error reason so the user can fix it (restart Tauri, refresh resource
  // bundle) instead of seeing a silent "skills not loaded" with no signal.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const skills = await loadAllSkills();
        if (cancelled) return;
        setInterviewerSkill(
          skills.find((s) => s.slug === "interviewer") ?? null,
        );
        setExplainerSkill(skills.find((s) => s.slug === "explainer") ?? null);
        setSkillsLoadError(null);
      } catch (err) {
        if (cancelled) return;
        const msg = (err as Error).message ?? String(err);
        // eslint-disable-next-line no-console
        console.error("[skills-loader] loadAllSkills failed:", err);
        setSkillsLoadError(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onInterviewerAccept = useCallback((input: CaseInput) => {
    setLoaded({
      input,
      source: {
        kind: "interviewer",
        transport: defaultInterviewerTransport().label,
        at: new Date().toISOString(),
      },
    });
    setStatus({ kind: "idle" });
  }, []);

  const projections = useMemo<Record<Role, ProjectedView> | null>(() => {
    if (!loaded) return null;
    const record = buildRecord(loaded.input);
    return {
      applicant: projectForRole(record, "applicant"),
      utility: projectForRole(record, "utility"),
      regulator: projectForRole(record, "regulator"),
    };
  }, [loaded]);

  const showOperationalDisclosure = useMemo(() => {
    if (!loaded) return false;
    return loaded.input.privateProfile.workloadMix.training >= 0.5;
  }, [loaded]);

  const onPickBundled = useCallback((caseId: string) => {
    try {
      setLoaded(bundledLoaded(caseId));
      setStatus({ kind: "idle" });
    } catch (err) {
      setStatus({ kind: "error", message: (err as Error).message });
    }
  }, []);

  const onUpdateCaseInput = useCallback((next: CaseInput) => {
    setLoaded((prev) => (prev ? { ...prev, input: next } : prev));
    setStatus({ kind: "idle" });
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
    if (!loaded || !projections) return;
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
      setStatus({
        kind: "exported",
        path: result.path,
        issuerPublicKey: bundle.payload.issuer.publicKey,
        issuerKeyId: bundle.payload.issuer.keyId,
      });
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

  // "New case · clear & start over" — returns the app to the empty landing
  // state, ready for a fresh demo. Clears any exported-bundle or error
  // status. Landing's IntakePanel auto-focuses on next paint.
  const onClearCase = useCallback(() => {
    setLoaded(null);
    setMode("work");
    setStatus({ kind: "idle" });
    requestAnimationFrame(() => {
      const ta = document.querySelector<HTMLTextAreaElement>(
        "#intake-fresh-start textarea",
      );
      ta?.focus();
    });
  }, []);

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
            <span className="telltale-dot" />{" "}
            {loaded
              ? "projection · in-process · no network"
              : "ready · no case loaded"}
          </div>
        </div>
      </header>

      <TrustPanel loaded={loaded} />

      {loaded === null ? (
        <LandingView
          skill={interviewerSkill}
          loadError={skillsLoadError}
          onInterviewerAccept={onInterviewerAccept}
          onPickBundled={onPickBundled}
          onOpenFile={onOpenFile}
          status={status}
        />
      ) : (
        <>
          {mode === "work" ? (
            <section className="case-bar">
              <div className="case-meta">
                <div className="case-title">
                  {loaded.input.applicantOrg}
                  <span className="dim">
                    {" "}
                    · {loaded.input.requestedMW} MW · {loaded.input.site.county},{" "}
                    {loaded.input.site.state}
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
                  ) : loaded.source.kind === "interviewer" ? (
                    <>
                      <span className="source-tag">source · interviewer</span>
                      <span className="source-path mono">
                        transport {loaded.source.transport} · at{" "}
                        {loaded.source.at.slice(11, 19)}
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
              </div>

              {status.kind === "error" ? (
                <div className="status-line status-err">✘ {status.message}</div>
              ) : null}
            </section>
          ) : (
            <section className="review-gate">
              <div className="review-gate-head">
                <div className="review-gate-title">
                  <div className="rg-title">review disclosure</div>
                  <div className="rg-sub">
                    preview three audiences before you export ·{" "}
                    <span className="mono">{loaded.input.applicantOrg}</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {projections ? (
            <main className={`stage mode-${mode}`}>
              {mode === "work" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <ReviewColumn view={projections.applicant} variant="work" />
                  {showOperationalDisclosure ? (
                    <OperationalDisclosurePanel
                      caseInput={loaded.input}
                      onUpdate={onUpdateCaseInput}
                    />
                  ) : null}
                  <ExplainerPanel
                    view={projections.applicant}
                    role="applicant"
                    caseInput={loaded.input}
                    skill={explainerSkill}
                  />
                </div>
              ) : (
                ROLES.map((role) => (
                  <div
                    key={role}
                    style={{ display: "flex", flexDirection: "column", gap: 10 }}
                  >
                    <ReviewColumn view={projections[role]} variant="review" />
                    <ExplainerPanel
                      view={projections[role]}
                      role={role}
                      caseInput={loaded.input}
                      skill={explainerSkill}
                    />
                  </div>
                ))
              )}
            </main>
          ) : null}

          {mode === "work" ? (
            <section className="review-terminus">
              <div className="rt-nav rt-nav-left">
                <button
                  type="button"
                  className="chip chip-primary chip-big"
                  onClick={onClearCase}
                >
                  ← back to landing
                </button>
              </div>
              <div className="rt-copy">
                <div className="rt-title">review this disclosure</div>
                <div className="rt-sub">
                  preview the applicant, utility, and regulator views before
                  you export
                </div>
              </div>
              <div className="rt-nav rt-nav-right">
                <button
                  type="button"
                  className="chip chip-primary chip-big"
                  onClick={enterReview}
                >
                  review disclosure →
                </button>
              </div>
            </section>
          ) : null}

          {mode === "review" ? (
            <section className="review-terminus">
              <div className="rt-nav rt-nav-left">
                <button
                  type="button"
                  className="chip chip-primary chip-big"
                  onClick={exitReview}
                >
                  ← back to work view
                </button>
              </div>
              <div className="rt-copy">
                <div className="rt-title">export this disclosure</div>
                <div className="rt-sub">
                  bundle v1 · Ed25519 signed · audit chain included · verify with{" "}
                  <span className="mono">pnpm canary:bundle</span>
                </div>
              </div>
              <div className="rt-nav rt-nav-right">
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
                <ExportedHandoffCard
                  path={status.path}
                  issuerPublicKey={status.issuerPublicKey}
                  issuerKeyId={status.issuerKeyId}
                />
              ) : null}
            </section>
          ) : null}

          {projections ? (
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
          ) : null}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LandingView — the empty "welcome" state.
//
// Shown when no case is loaded. Renders only the IntakePanel as the primary
// affordance, with a subtle "or try a bundled example" row below. Clicking
// any case chip, opening a file, or submitting Interviewer prose will set
// `loaded` in the parent App, which triggers the work-mode reveal.
// ---------------------------------------------------------------------------

interface LandingViewProps {
  skill: LoadedSkill | null;
  loadError: string | null;
  onInterviewerAccept: (input: CaseInput) => void;
  onPickBundled: (caseId: string) => void;
  onOpenFile: () => void;
  status: Status;
}

function LandingView({
  skill,
  loadError,
  onInterviewerAccept,
  onPickBundled,
  onOpenFile,
  status,
}: LandingViewProps) {
  const steps = [
    {
      num: "01",
      title: "Tell it naturally",
      copy: "Start with the rough request: site, load, timing, and whatever flexibility details you already know.",
    },
    {
      num: "02",
      title: "Answer follow-ups",
      copy: "If the case is incomplete, the interviewer asks for the missing operating details instead of forcing a rigid form.",
    },
    {
      num: "03",
      title: "Review before continuing",
      copy: "A validated draft stays on this screen until you look it over and choose to move into the work view.",
    },
  ];

  return (
    <section className="landing">
      <div className="landing-stack">
        <div className="landing-hero">
          <div className="landing-hero-copy">
            <div className="landing-label">
              private intake · local projection · signed export
            </div>
            <TypeOnHeadline text="Turn your needs into a clear path for the grid." />
            <p className="landing-sub">
              Describe the interconnection request the way you would explain it
              aloud. Grid Passport turns that exchange into a structured case,
              shows the disclosure boundary before anything leaves the machine,
              and prepares the utility handoff when you are ready.
            </p>
          </div>

          <div className="landing-steps" aria-label="how this works steps">
            {steps.map((step) => (
              <div key={step.num} className="landing-step">
                <div className="landing-step-num">{step.num}</div>
                <div className="landing-step-copy">
                  <div className="landing-step-title">{step.title}</div>
                  <div className="landing-step-text">{step.copy}</div>
                </div>
              </div>
            ))}
          </div>

        </div>

        <div className="landing-console-block">
          <IntakePanel
            skill={skill}
            loadError={loadError}
            onAccept={onInterviewerAccept}
            acceptMode="manual"
          />

          <div className="landing-or">
            <span className="landing-or-label">
              or start from a bundled example
            </span>
            <div className="landing-chips">
              {CASE_METAS.map((c) => (
                <button
                  key={c.caseId}
                  type="button"
                  className="chip"
                  onClick={() => onPickBundled(c.caseId)}
                >
                  {c.displayName}
                </button>
              ))}
              <button
                type="button"
                className="chip chip-action"
                onClick={onOpenFile}
                disabled={status.kind === "loading"}
              >
                {status.kind === "loading" ? "opening…" : "open case.json…"}
              </button>
            </div>
            <div className="landing-or-note">
              Bundled cases jump straight into the disclosure flow. The
              interviewer path is the better way to demo how an unstructured
              request becomes a case.
            </div>
            {status.kind === "error" ? (
              <div className="status-line status-err">✘ {status.message}</div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// ExportedHandoffCard — thin wrapper around the shared HandoffCard component
// for the disclosure-bundle export. Same UI as Dominion's shed-request
// handoff (apps/utility/src/components) — both binaries use the same shape.
// ---------------------------------------------------------------------------

function ExportedHandoffCard({
  path,
  issuerPublicKey,
  issuerKeyId,
}: {
  path: string;
  issuerPublicKey: string;
  issuerKeyId: string;
}) {
  return (
    <HandoffCard
      headline="bundle written"
      path={path}
      issuerPublicKey={issuerPublicKey}
      issuerKeyId={issuerKeyId}
      handoffLine="hand off to the utility binary →"
      instructions={
        <>
          Run <code className="mono">pnpm utility:dev</code> in a second
          terminal to open Dominion's binary. Paste the pubkey above into its
          input, click <em>open bundle.json →</em>, and select the file at the
          path above. Verification + utility projection render locally — no
          network.
        </>
      }
    />
  );
}

function TypeOnHeadline({ text }: { text: string }) {
  const showBlinkingPeriod = text.endsWith(".");
  const animatedText = showBlinkingPeriod ? text.slice(0, -1) : text;
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
  const done = visibleCount >= animatedText.length;

  return (
    <h1 className="landing-title" aria-label={text}>
      <span className="landing-title-sizer" aria-hidden="true">
        {text}
      </span>
      <span
        className={`landing-title-typed ${done ? "is-done" : ""}`}
        aria-hidden="true"
      >
        {typed}
        {showBlinkingPeriod && done ? "." : null}
      </span>
    </h1>
  );
}
