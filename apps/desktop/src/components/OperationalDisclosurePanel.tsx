import { useCallback, useRef, useState } from "react";
import type {
  CaseInput,
  ForwardOperationalWindow,
} from "@grid-passport/core/types";

/**
 * Operational disclosure panel.
 *
 * Sits between the case-bar (where Round 1+ Interviewer prose lives) and
 * the role-projection columns. Renders the demo's "above the line / below
 * the line" framing:
 *
 *   above the line — what an ERCOT-style filing already requires today
 *                    (filled by the Interviewer chat in Act 1).
 *   below the line — the operational gap that no regulator currently
 *                    requires. Filled progressively in Act 2 by dropping
 *                    structured documents (training calendar, shed
 *                    playbook, gen-test schedule, redundancy memo).
 *
 * v0 scope: the input affordance + the visual split + a fixture-backed
 * "add Owl training window" path so Act 2 has something demoable on stage.
 * Real Cartographer-Documents Skill extraction lands later — when it does,
 * this component is the consumer; the structured `GraphDelta` (or just a
 * `ForwardOperationalWindow`) shows up here without changing the UI seam.
 */

interface Props {
  caseInput: CaseInput;
  onUpdate: (next: CaseInput) => void;
}

// Canonical Owl-training-calendar extraction. Used when the demo needs a
// deterministic, fixture-backed disclosure and we don't want to depend on
// a live LLM call. Matches the value in `packages/core/src/fixtures/
// owl-compute.ts` so Owl-fixture-loaded cases and Interviewer-then-drop
// cases land at the same place.
const OWL_TRAINING_WINDOW: ForwardOperationalWindow = {
  startUtc: "2027-05-10T18:00:00Z",
  endUtc: "2027-06-01T02:00:00Z",
  deltaMW: 118,
  ciPlusMinus: 14,
  confidence: 0.91,
  dailyDutyCycleHours: 16,
  repeats: "daily",
  workloadType: "training",
  sourceDocHash: "sha256:owl-frontier-retrain-2027-q2",
};

export function OperationalDisclosurePanel({ caseInput, onUpdate }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [stagedSource, setStagedSource] = useState<string | null>(null);
  const [stagedWindow, setStagedWindow] =
    useState<ForwardOperationalWindow | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const windows = caseInput.privateProfile.forwardOperationalWindows ?? [];
  const hasStagedWindowInCase =
    stagedWindow !== null &&
    windows.some((w) => w.sourceDocHash === stagedWindow.sourceDocHash);
  const windowLabel =
    windows.length === 0
      ? "no forward training window in case yet"
      : `${windows.length} forward window${windows.length === 1 ? "" : "s"} in case`;
  const applicant = caseInput.applicantOrg;

  const stageOwlTrainingWindow = useCallback((source: string) => {
    setStagedSource(source);
    setStagedWindow(OWL_TRAINING_WINDOW);
  }, []);

  const addStagedWindowToCase = useCallback(() => {
    if (!stagedWindow) return;
    if (windows.some((w) => w.sourceDocHash === stagedWindow.sourceDocHash)) {
      return;
    }
    const next: CaseInput = {
      ...caseInput,
      privateProfile: {
        ...caseInput.privateProfile,
        forwardOperationalWindows: [
          ...(caseInput.privateProfile.forwardOperationalWindows ?? []),
          stagedWindow,
        ],
      },
    };
    onUpdate(next);
    setStagedSource(null);
    setStagedWindow(null);
  }, [caseInput, onUpdate, stagedWindow, windows]);

  const handleFile = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      // v0 demo behavior: any file lands the canonical Owl training
      // window. Real extraction (Cartographer-Documents Skill + ingest
      // endpoint) replaces this with a hash-keyed delta.
      stageOwlTrainingWindow(file.name);
    },
    [stageOwlTrainingWindow],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFile(e.dataTransfer.files?.[0]);
    },
    [handleFile],
  );

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFile(e.target.files?.[0]);
      // Reset so re-selecting the same file fires onChange again.
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [handleFile],
  );

  const triggerFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <section
      className="op-disclosure"
      style={{
        margin: "12px 0",
        padding: 18,
        border: "1px solid var(--border)",
        borderRadius: 4,
        background: "var(--panel-soft, #0f0f0f)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10.5,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--sky, #38bdf8)",
        }}
      >
        act 2 · operational disclosure
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            fontFamily: "var(--sans)",
            fontSize: 24,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            color: "var(--ink)",
          }}
        >
          Fast-forward a year.
        </div>
        <div style={{ color: "var(--ink)", lineHeight: 1.65 }}>
          {applicant} wins a contract to retrain a frontier model for a major
          partner.
        </div>
        <div style={{ color: "var(--ink)", lineHeight: 1.65 }}>
          They have a real surge coming: bigger than the last one, sustained
          over weeks.
        </div>
        <div style={{ color: "var(--ink-dim, #a3a3a3)", lineHeight: 1.65 }}>
          If they do not communicate it, this is exactly the kind of failure
          NERC flagged. This is the moment where a local PDF turns into a
          structured forward-operational disclosure.
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          padding: 16,
          border: `1px dashed ${dragOver ? "var(--lime, #a3e635)" : "var(--border)"}`,
          background: dragOver
            ? "rgba(163, 230, 53, 0.06)"
            : "rgba(255,255,255,0.02)",
          transition: "all 120ms ease",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10.5,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--ink)",
          }}
        >
          read training schedule
        </div>
        <div style={{ color: "var(--ink-dim, #a3a3a3)", lineHeight: 1.6 }}>
          Drop a training calendar or load-schedule PDF. In the demo, any file
          resolves to Owl&apos;s future retraining surge packet and lands as a
          staged forward window.
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.xlsx,.txt,.md,application/pdf"
          onChange={onFileInputChange}
          style={{ display: "none" }}
        />

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          <button
            type="button"
            className="chip chip-primary"
            onClick={triggerFilePicker}
            style={{ fontSize: 11, padding: "5px 12px" }}
          >
            select pdf…
          </button>
          <span style={{ color: "var(--ink-mute, #525252)" }}>or drop here</span>
          <span style={{ color: "var(--border)" }}>·</span>
          <button
            type="button"
            className="chip"
            onClick={() => {
              stageOwlTrainingWindow("demo · Owl frontier retraining packet");
            }}
            style={{
              fontSize: 11,
              padding: "4px 10px",
              background: "transparent",
            }}
          >
            use demo · Owl retraining surge
          </button>
        </div>

        {stagedSource && stagedWindow ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10.5,
                color: "var(--lime, #a3e635)",
              }}
            >
              staged extraction · {stagedSource}
            </div>
            <WindowCard w={stagedWindow} />
            <div>
              <button
                type="button"
                className="chip chip-primary"
                onClick={addStagedWindowToCase}
                disabled={hasStagedWindowInCase}
                style={{ fontSize: 11, padding: "5px 12px" }}
              >
                {hasStagedWindowInCase
                  ? "already in case"
                  : "add extracted window →"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10.5,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--amber, #f59e0b)",
            }}
          >
            forward windows in case
          <span
            style={{
              color: "var(--ink-mute, #525252)",
              marginLeft: 10,
              textTransform: "none",
              letterSpacing: "0.04em",
            }}
          >
            · {windowLabel}
          </span>
        </div>
        {windows.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {windows.map((w, i) => (
              <WindowCard key={i} w={w} />
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: 12,
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.02)",
              color: "var(--ink-mute, #888)",
            }}
          >
            No structured forward window has been added to the case yet.
          </div>
        )}
      </div>
    </section>
  );
}

function WindowCard({ w }: { w: ForwardOperationalWindow }) {
  return (
    <div
      style={{
        padding: 8,
        border: "1px solid var(--border)",
        background: "rgba(163, 230, 53, 0.04)",
        fontFamily: "var(--mono)",
        fontSize: 10.5,
        lineHeight: 1.5,
      }}
    >
      <div style={{ color: "var(--lime, #a3e635)" }}>
        {fmtDate(w.startUtc)} → {fmtDate(w.endUtc)}
      </div>
      <div>
        Δ +{w.deltaMW} MW (CI ±{w.ciPlusMinus} MW)
        {w.workloadType ? ` · ${w.workloadType}` : ""}
      </div>
      <div style={{ color: "var(--ink-mute, #888)" }}>
        duty cycle {w.dailyDutyCycleHours} hr/day · repeats {w.repeats}
        {w.sourceDocHash ? ` · ${w.sourceDocHash.slice(0, 24)}…` : ""}
      </div>
    </div>
  );
}

function fmtDate(iso: string): string {
  // Strip seconds + Z; keep date + HH:MM.
  return iso.replace(/T(\d{2}:\d{2}):\d{2}Z$/, " $1Z");
}
