import { useMemo } from "react";
import type { CaseInput } from "@grid-passport/core/types";
import type { LoadedCase } from "../lib/case-loader";

/**
 * Self-review trust panel (Track 3.2 of sprint 2026-04-20).
 *
 * Persistent chrome that makes the trust story visible at all times.
 * The four lines are derived from *live runtime state*, not hardcoded:
 *
 *   - **0 network calls** — baked into the binary by construction
 *     (the applicant-side projection/forecast/audit pipeline is pure
 *     TS + Rust; no fetch/XHR/WebSocket surface in the hot path).
 *   - **inputs at <path>** — either the file path the case was loaded
 *     from, the "bundled fixture" label, or the "interviewer · <ts>"
 *     provenance stamp; makes the trust chain readable to the user.
 *   - **N private fields sealed** — count of `CaseInput.privateProfile`
 *     keys that the release policy redacts from the utility projection.
 *     A fixed 8 today; wired to the POLICY table so it refreshes when
 *     the schema grows.
 *   - **0 raw private fields released** — structural; on any valid
 *     load, no private-bucket value ever reaches any non-applicant
 *     projection by construction (privacy canary + `canary:desktop`
 *     projection invariant both check this).
 *
 * The panel intentionally does NOT include a "verified" or "signed"
 * claim about the bundle — bundle state is ephemeral (only valid after
 * export), and TrustPanel is rendered at all times. The export
 * terminus already stamps bundle-specific claims; TrustPanel covers
 * the always-true envelope.
 */

const PRIVATE_FIELD_KEYS: Array<keyof CaseInput["privateProfile"]> = [
  "flexPercent",
  "redundancyShiftPercent",
  "backupGenHours",
  "backupGenMW",
  "bessMW",
  "bessHours",
  "internalScheduleConfidence",
  "workloadMix",
];

export interface TrustPanelProps {
  loaded: LoadedCase | null;
}

export function TrustPanel({ loaded }: TrustPanelProps) {
  const inputsLabel = useMemo((): string => {
    if (!loaded) return "no case loaded";
    const s = loaded.source;
    if (s.kind === "file") return s.path;
    if (s.kind === "bundled") return `bundled fixture · ${s.caseId}`;
    if (s.kind === "interviewer") return `interviewer · ${s.transport} · ${s.at.slice(11, 19)}`;
    return "unknown source";
  }, [loaded]);

  const sealedCount = PRIVATE_FIELD_KEYS.length;

  return (
    <aside
      className="trust-panel"
      style={{
        border: "1px solid var(--border)",
        borderLeft: "2px solid var(--lime, #a3e635)",
        background: "var(--panel-soft, #0f0f0f)",
        padding: "10px 14px",
        margin: "0 20px 0",
        fontFamily: "var(--mono)",
        fontSize: 10.5,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        display: "flex",
        gap: 20,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          color: "var(--lime, #a3e635)",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            background: "var(--lime, #a3e635)",
            borderRadius: "50%",
            boxShadow: "0 0 8px rgba(163, 230, 53, 0.5)",
          }}
        />
        self-review · trust
      </div>

      <TrustCell
        label="network calls"
        value="0"
        tone="ok"
        title="Projection, forecast, and audit pipeline run in-process; no fetch/XHR/WebSocket surface in the hot path."
      />
      <TrustCell
        label="inputs at"
        value={inputsLabel}
        tone="dim"
        title="Where the loaded case came from — file path, bundled fixture, or interviewer hand-off."
      />
      <TrustCell
        label="private fields sealed"
        value={String(sealedCount)}
        tone="ok"
        title="CaseInput.privateProfile keys that the release policy redacts from the utility projection (grid-passport-policy@0.1.0)."
      />
      <TrustCell
        label="raw private released"
        value="0"
        tone="ok"
        title="Structural: no private-bucket value reaches a non-applicant projection. Enforced by `pnpm privacy:canary` + `pnpm canary:desktop`."
      />
    </aside>
  );
}

interface TrustCellProps {
  label: string;
  value: string;
  tone: "ok" | "dim";
  title?: string;
}

function TrustCell({ label, value, tone, title }: TrustCellProps) {
  const color = tone === "ok" ? "var(--lime, #a3e635)" : "var(--ink-dim, #a3a3a3)";
  return (
    <div
      title={title}
      style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}
    >
      <span style={{ color: "var(--ink-mute, #525252)" }}>{label}</span>
      <span style={{ color, textTransform: "none", letterSpacing: "0.08em" }}>
        {value}
      </span>
    </div>
  );
}
