import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import baselineDataRaw from "../fixtures/dominion-zone-load-90d.json";
import actualsDataRaw from "../fixtures/owl-actuals-2026-05-15-22.json";

/**
 * Forecast chart for Act 4.
 *
 * Three series on one chart:
 *   1. baseline forecast (no Owl spike) — what Dominion would forecast without disclosure
 *   2. disclosure-aware forecast       — baseline + disclosed +70 MW band
 *   3. observed actuals                — what Dominion actually measured
 *
 * The reveal: with disclosure off, the forecast misses the spike. With it
 * on, the forecast anticipates +70 MW; the observed actual is +112 MW
 * (the residual that drives the Coach Skill's recommendation).
 *
 * All data is fixture-loaded — no live network. The fixture's `source`
 * field tells the user whether it's real PJM data or synthetic placeholder.
 */

// Disclosed window from packages/core/src/fixtures/owl-compute.ts
const DISCLOSED_START = "2026-05-15T18:00:00Z";
const DISCLOSED_END = "2026-05-22T02:00:00Z";
const DISCLOSED_DELTA_MW = 70;
const DISCLOSED_CI_MW = 10;

// What Owl actually drew (for demo: undershoot scenario from the original
// Act 4 spec). Real Act 4 will compute this from PJM actuals.
const OBSERVED_DELTA_MW = 112;

interface Row {
  ts: number;        // epoch ms (recharts wants numeric)
  hourLabel: string; // human-readable for tooltip
  baselineMW: number;       // zone load WITHOUT Owl's spike
  disclosedHi: number;      // baseline + (delta + CI)
  disclosedLo: number;      // baseline + (delta - CI)
  disclosedMid: number;     // baseline + delta
  actualMW: number;         // baseline + observed delta
  inWindow: boolean;
}

function inDailyDuty(hourUtc: number): boolean {
  // Owl's disclosed daily duty cycle: 14:00–22:00 ET ≈ 18:00–02:00 UTC.
  return hourUtc >= 18 || hourUtc < 2;
}

function buildRows(): Row[] {
  const rows = (actualsDataRaw as { rows: { timestamp: string; mw: number }[] }).rows;
  const startMs = Date.parse(DISCLOSED_START);
  const endMs = Date.parse(DISCLOSED_END);
  return rows.map((r) => {
    const t = new Date(r.timestamp);
    const ms = t.getTime();
    const hourUtc = t.getUTCHours();
    const inWindow = ms >= startMs && ms < endMs && inDailyDuty(hourUtc);
    const baseline = r.mw;
    return {
      ts: ms,
      hourLabel: `${t.toUTCString().slice(0, 22)}`,
      baselineMW: baseline,
      disclosedMid: baseline + (inWindow ? DISCLOSED_DELTA_MW : 0),
      disclosedHi:
        baseline + (inWindow ? DISCLOSED_DELTA_MW + DISCLOSED_CI_MW : 0),
      disclosedLo:
        baseline + (inWindow ? DISCLOSED_DELTA_MW - DISCLOSED_CI_MW : 0),
      actualMW: baseline + (inWindow ? OBSERVED_DELTA_MW : 0),
      inWindow,
    };
  });
}

interface ForecastChartProps {
  showDisclosure?: boolean;
  height?: number;
}

export function ForecastChart({
  showDisclosure: initialShowDisclosure = true,
  height = 320,
}: ForecastChartProps) {
  const [showDisclosure, setShowDisclosure] = useState(initialShowDisclosure);
  const rows = useMemo(buildRows, []);
  const source =
    (baselineDataRaw as { source: string }).source ?? "unknown";
  const isReal = source.toLowerCase().includes("real");

  // Y-axis: just MW directly (these are zone-level numbers, ~17,000-20,000)
  const allValues = rows.flatMap((r) => [
    r.baselineMW,
    r.actualMW,
    r.disclosedHi,
    r.disclosedLo,
  ]);
  const yMin = Math.floor(Math.min(...allValues) / 100) * 100;
  const yMax = Math.ceil(Math.max(...allValues) / 100) * 100;

  return (
    <section
      className="card"
      style={{ borderColor: "var(--sky, #38bdf8)" }}
    >
      <div
        className="card-title"
        style={{
          color: "var(--sky, #38bdf8)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        forecast view
        <span
          style={{
            fontSize: 10,
            color: "var(--ink-mute)",
            letterSpacing: "0.06em",
            textTransform: "none",
          }}
        >
          · {isReal ? "real PJM Dominion-zone load" : "synthetic placeholder"}{" "}
          · disclosed window May 15 → May 22
        </span>
        <button
          type="button"
          className="chip"
          onClick={() => setShowDisclosure((v) => !v)}
          style={{
            marginLeft: "auto",
            fontSize: 10.5,
            padding: "4px 10px",
            background: showDisclosure
              ? "rgba(163, 230, 53, 0.15)"
              : "rgba(220, 38, 38, 0.10)",
            color: showDisclosure
              ? "var(--lime, #a3e635)"
              : "var(--rose, #fb7185)",
            border: `1px solid ${
              showDisclosure ? "var(--lime, #a3e635)" : "var(--rose, #fb7185)"
            }`,
          }}
        >
          {showDisclosure ? "with disclosure ON" : "with disclosure OFF"} ·
          toggle
        </button>
      </div>

      <div className="card-body">
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={rows}
            margin={{ top: 10, right: 20, left: 0, bottom: 4 }}
          >
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(t: number) =>
                new Date(t).toUTCString().slice(5, 11) // "15 May" / "22 May"
              }
              tick={{ fill: "#888", fontSize: 10 }}
              stroke="#444"
            />
            <YAxis
              domain={[yMin, yMax]}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)} GW`}
              tick={{ fill: "#888", fontSize: 10 }}
              stroke="#444"
              width={64}
            />
            <Tooltip
              labelFormatter={(t: number) => new Date(t).toUTCString()}
              formatter={(v: number, name: string) => [
                `${(v / 1000).toFixed(2)} GW`,
                name,
              ]}
              contentStyle={{
                background: "rgba(15, 15, 15, 0.95)",
                border: "1px solid var(--border)",
                color: "var(--ink)",
                fontFamily: "var(--mono)",
                fontSize: 11,
              }}
            />
            <Legend
              wrapperStyle={{ fontFamily: "var(--mono)", fontSize: 10.5 }}
            />

            {/* Disclosed window highlight */}
            <ReferenceArea
              x1={Date.parse(DISCLOSED_START)}
              x2={Date.parse(DISCLOSED_END)}
              fill="rgba(56, 189, 248, 0.06)"
              stroke="rgba(56, 189, 248, 0.3)"
              strokeDasharray="2 4"
              label={{
                value: "Owl Compute training window (signed)",
                position: "insideTop",
                fill: "rgba(56, 189, 248, 0.7)",
                fontSize: 10,
                fontFamily: "var(--mono)",
              }}
            />

            {/* Disclosed band (only when toggle is on) */}
            {showDisclosure ? (
              <Area
                type="monotone"
                dataKey="disclosedHi"
                stackId="band"
                stroke="none"
                fill="rgba(163, 230, 53, 0.20)"
                name="disclosed CI band (high)"
                isAnimationActive={false}
              />
            ) : null}
            {showDisclosure ? (
              <Area
                type="monotone"
                dataKey="disclosedLo"
                stackId="band-lo"
                stroke="none"
                fill="rgba(15,15,15,0.85)"
                name="disclosed CI band (low)"
                isAnimationActive={false}
                legendType="none"
              />
            ) : null}

            {/* Baseline (no spike) — always visible */}
            <Line
              type="monotone"
              dataKey="baselineMW"
              stroke="#888"
              strokeDasharray="4 3"
              strokeWidth={1.4}
              dot={false}
              name="baseline forecast (no disclosure)"
              isAnimationActive={false}
            />

            {/* Disclosure-aware forecast (only when toggle is on) */}
            {showDisclosure ? (
              <Line
                type="monotone"
                dataKey="disclosedMid"
                stroke="#a3e635"
                strokeWidth={1.8}
                dot={false}
                name="disclosure-aware forecast (+70 MW band)"
                isAnimationActive={false}
              />
            ) : null}

            {/* Actuals — solid blue, the ground truth */}
            <Line
              type="monotone"
              dataKey="actualMW"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
              name="observed actuals"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div
          style={{
            marginTop: 12,
            fontFamily: "var(--mono)",
            fontSize: 10.5,
            color: "var(--ink-mute)",
            lineHeight: 1.6,
          }}
        >
          {showDisclosure ? (
            <>
              ✓ disclosed: <span style={{ color: "var(--lime, #a3e635)" }}>+
              {DISCLOSED_DELTA_MW} MW (CI ±{DISCLOSED_CI_MW})</span> · observed:{" "}
              <span style={{ color: "var(--sky, #38bdf8)" }}>+
              {OBSERVED_DELTA_MW} MW</span> · residual:{" "}
              <span style={{ color: "var(--amber, #f59e0b)" }}>
                +{OBSERVED_DELTA_MW - DISCLOSED_DELTA_MW} MW (undershoot)
              </span>
              {" · "}
              <strong>recommended action</strong>: pre-position{" "}
              {DISCLOSED_DELTA_MW + 130} MW reserves Tue–Sun 12:00–22:00 ET
            </>
          ) : (
            <>
              <span style={{ color: "var(--rose, #fb7185)" }}>
                ✘ no disclosure → forecast misses +{OBSERVED_DELTA_MW} MW
                spike during May 15–22
              </span>{" "}
              · operator plans blind · pre-position recommendation: none
            </>
          )}
        </div>
      </div>
    </section>
  );
}
