import { useMemo } from "react";
import {
  computeInsights,
  type Insight,
  type MemoryEvent,
} from "@grid-passport/core/learning";

/**
 * Reasoning panel for Act 4.
 *
 * Surfaces structured insights computed from a memory log of signed
 * events. Each insight cites the underlying signed bundle hashes — so
 * "the system noticed" is always grounded in evidence the viewer can
 * independently verify.
 *
 * v0 scope: a deterministic insight engine (`computeInsights`) that runs
 * on a typed memory event stream. The Coach Skill (next iteration) will
 * call into this same function and wrap the structured insights with
 * LLM-generated prose. The structural property holds either way: the
 * underlying facts come from signed events, not free-text reasoning.
 *
 * For the demo: we synthesize a small memory stream that represents the
 * Act 4 narrative state (3 prior runs that all undershot, 1 gen-test
 * window that overlaps peak, 1 posterior CI update). Production will
 * feed real memory events from the local memory.jsonl log.
 */

const DEMO_MEMORY: MemoryEvent[] = [
  {
    ts: "2026-04-22T03:00:00Z",
    caseId: "owl-compute",
    kind: "residual_computed",
    windowStart: "2026-04-15T18:00:00Z",
    disclosedDeltaMW: 60,
    observedDeltaMW: 88,
    residualMW: 28,
    residualPercent: 47,
  },
  {
    ts: "2026-04-29T03:00:00Z",
    caseId: "owl-compute",
    kind: "residual_computed",
    windowStart: "2026-04-22T18:00:00Z",
    disclosedDeltaMW: 65,
    observedDeltaMW: 91,
    residualMW: 26,
    residualPercent: 40,
  },
  {
    ts: "2026-05-06T03:00:00Z",
    caseId: "owl-compute",
    kind: "residual_computed",
    windowStart: "2026-04-29T18:00:00Z",
    disclosedDeltaMW: 70,
    observedDeltaMW: 99,
    residualMW: 29,
    residualPercent: 41,
  },
  {
    ts: "2026-05-06T03:01:00Z",
    caseId: "owl-compute",
    kind: "posterior_update",
    priorCI: 10,
    posteriorCI: 24,
    basisEventCount: 3,
  },
  // Stub gen-test disclosure that overlaps grid peak (15:00 ET = 19:00 UTC)
  {
    ts: "2026-05-04T12:00:00Z",
    caseId: "owl-compute",
    kind: "disclosure_in",
    bundleHash: "sha256:gentest-2026-05-w19-abcd1234",
    windowStart: "2026-05-12T19:00:00Z",
    windowEnd: "2026-05-12T21:00:00Z",
    deltaMW: 30,
    ciPlusMinus: 5,
    workloadType: "gentest-monthly",
    dailyDutyCycleHours: 2,
    repeats: "monthly",
  },
];

const SEVERITY_COLOR: Record<Insight["severity"], string> = {
  info: "var(--sky, #38bdf8)",
  warn: "var(--amber, #f59e0b)",
  critical: "var(--rose, #fb7185)",
};

const SEVERITY_GLYPH: Record<Insight["severity"], string> = {
  info: "▸",
  warn: "▲",
  critical: "✘",
};

interface Props {
  /** Override the default demo memory (e.g., when piping in a real log). */
  memory?: MemoryEvent[];
}

export function ReasoningPanel({ memory = DEMO_MEMORY }: Props) {
  const insights = useMemo(() => computeInsights(memory), [memory]);

  return (
    <section
      className="card"
      style={{ borderColor: "var(--violet, #8b5cf6)" }}
    >
      <div
        className="card-title"
        style={{
          color: "var(--violet, #8b5cf6)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        reasoning · structured insights from memory
        <span
          style={{
            fontSize: 10,
            color: "var(--ink-mute)",
            letterSpacing: "0.06em",
            textTransform: "none",
          }}
        >
          · {memory.length} signed events · {insights.length} pattern
          {insights.length === 1 ? "" : "s"} surfaced
        </span>
      </div>
      <div className="card-body">
        <p style={{ marginTop: 0, color: "var(--ink-mute)", fontSize: 12 }}>
          The reasoning engine reads a memory log of signed events
          (disclosures, actuals, residuals, posterior updates) and surfaces
          patterns. Every insight cites the bundle hashes it's based on —
          you can independently verify the underlying receipts. The Coach
          Skill (next iteration) wraps these structured insights with
          LLM-generated prose; the underlying facts stay deterministic.
        </p>

        {insights.length === 0 ? (
          <div
            style={{
              padding: 12,
              border: "1px dashed var(--border)",
              color: "var(--ink-mute)",
              fontFamily: "var(--mono)",
              fontSize: 11,
            }}
          >
            no patterns yet · need ≥3 residual events for trend detection
          </div>
        ) : (
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {insights.map((ins) => (
              <InsightRow key={ins.id} insight={ins} />
            ))}
          </ul>
        )}

        <details style={{ marginTop: 14 }}>
          <summary
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10.5,
              color: "var(--ink-mute)",
              letterSpacing: "0.06em",
              cursor: "pointer",
            }}
          >
            inspect underlying memory ({memory.length} events)
          </summary>
          <pre
            style={{
              marginTop: 8,
              padding: 10,
              background: "var(--bg)",
              border: "1px solid var(--border)",
              fontFamily: "var(--mono)",
              fontSize: 10,
              lineHeight: 1.5,
              maxHeight: 240,
              overflow: "auto",
              color: "var(--ink-mute)",
            }}
          >
            {memory.map((ev, i) => `${i + 1}. ${JSON.stringify(ev)}`).join("\n")}
          </pre>
        </details>
      </div>
    </section>
  );
}

function InsightRow({ insight }: { insight: Insight }) {
  const color = SEVERITY_COLOR[insight.severity];
  const glyph = SEVERITY_GLYPH[insight.severity];
  return (
    <li
      style={{
        padding: 12,
        border: `1px solid ${color}`,
        background: "rgba(255, 255, 255, 0.02)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11,
          color,
          letterSpacing: "0.04em",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span>{glyph}</span>
        <span>{insight.headline}</span>
      </div>
      <div
        style={{
          fontFamily: "var(--sans)",
          fontSize: 12,
          color: "var(--ink)",
          lineHeight: 1.5,
        }}
      >
        {insight.body}
      </div>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          color: "var(--ink-mute)",
          marginTop: 2,
        }}
      >
        cites:{" "}
        {insight.citations.map((c, i) => (
          <span key={c}>
            {i > 0 ? " · " : ""}
            <code>{c}</code>
          </span>
        ))}
      </div>
    </li>
  );
}
