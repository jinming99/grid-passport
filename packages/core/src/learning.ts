/**
 * Forecaster + memory helpers for Act 4.
 *
 * Two responsibilities, both pure-function:
 *
 *   1. Forecast — given a baseline hourly load history, produce a
 *      next-N-hours forecast band (mean + CI). Apply disclosure overlay
 *      (signed `ForwardOperationalWindow`s) on top of that band so the
 *      "with" / "without" comparison is the same model + same data,
 *      differing only by the overlay.
 *
 *   2. Memory + reasoning — turn a stream of disclosure events + actuals
 *      into typed `MemoryEvent`s, compute residuals, run a conjugate
 *      Bayesian-flavored CI updater, and surface deterministic insights
 *      a downstream Coach Skill can either pass through directly or
 *      enrich with LLM reasoning.
 *
 * No I/O, no fixtures, no DOM. Caller passes the data in; functions
 * return values. Designed for both browser (apps/utility, apps/desktop)
 * and Node-side tooling (canary, tests) without environment branches.
 */

import type { ForwardOperationalWindow } from "./types";

// ---------------------------------------------------------------------------
// Hourly load + forecast types
// ---------------------------------------------------------------------------

export interface HourlyLoad {
  /** ISO 8601 UTC. */
  timestamp: string;
  /** Megawatts. */
  mw: number;
}

export interface ForecastPoint {
  timestamp: string;
  mean: number;
  ciLow: number;
  ciHigh: number;
}

export type ForecastSeries = ForecastPoint[];

// ---------------------------------------------------------------------------
// Baseline forecaster — lag-7-day same-hour + day-of-week + hour-of-day.
//
// Intentionally simple. The brief explicitly allows "a simple regression
// baseline." The contribution is the disclosure overlay on top, not the
// forecaster itself. Pure, deterministic, fixture-friendly.
// ---------------------------------------------------------------------------

/**
 * Forecast the next `targetHours` from a history of hourly loads.
 *
 * Method (matches the brief's "lag-7-days same-hour" hint):
 *   mean[t]   = average of history[t - 7d], history[t - 14d], history[t - 21d]
 *   ciLow[t]  = mean[t] - sigmaMW
 *   ciHigh[t] = mean[t] + sigmaMW
 *
 * where sigmaMW is the residual standard deviation across the lag-7
 * predictions on the historical data. Single number for the whole series
 * (good enough for demo; future: time-varying CI).
 */
export function forecastBaseline(
  history: HourlyLoad[],
  targetHours: number,
  startTimestamp?: string,
): ForecastSeries {
  if (history.length < 24 * 21) {
    // Not enough lag-7 history; return empty series rather than guessing.
    return [];
  }
  const sorted = [...history].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
  const lastIso = sorted[sorted.length - 1]!.timestamp;
  const startIso = startTimestamp ?? lastIso;
  const startMs = Date.parse(startIso);
  if (!Number.isFinite(startMs)) return [];

  // Build a quick lookup: ISO → mw.
  const byTs = new Map<string, number>();
  for (const r of sorted) byTs.set(r.timestamp, r.mw);

  // Compute residuals on the historical lag-7 predictions to estimate sigma.
  let sumSq = 0;
  let countSq = 0;
  for (let i = 24 * 21; i < sorted.length; i++) {
    const t = Date.parse(sorted[i]!.timestamp);
    const lags: number[] = [];
    for (const w of [7, 14, 21]) {
      const ago = new Date(t - w * 24 * 3600 * 1000).toISOString();
      const v = byTs.get(ago);
      if (v !== undefined) lags.push(v);
    }
    if (lags.length === 0) continue;
    const mean = lags.reduce((a, b) => a + b, 0) / lags.length;
    const r = sorted[i]!.mw - mean;
    sumSq += r * r;
    countSq++;
  }
  const sigmaMW = countSq > 0 ? Math.sqrt(sumSq / countSq) : 0;

  // Project forward.
  const series: ForecastSeries = [];
  for (let h = 1; h <= targetHours; h++) {
    const t = startMs + h * 3600 * 1000;
    const tIso = new Date(t).toISOString();
    const lags: number[] = [];
    for (const w of [7, 14, 21]) {
      const ago = new Date(t - w * 24 * 3600 * 1000).toISOString();
      const v = byTs.get(ago);
      if (v !== undefined) lags.push(v);
    }
    if (lags.length === 0) continue;
    const mean = lags.reduce((a, b) => a + b, 0) / lags.length;
    series.push({
      timestamp: tIso,
      mean,
      ciLow: mean - sigmaMW,
      ciHigh: mean + sigmaMW,
    });
  }
  return series;
}

// ---------------------------------------------------------------------------
// Disclosure overlay — bend the forecast band by the disclosed delta MW
// during each window's hours.
// ---------------------------------------------------------------------------

/**
 * Apply each `ForwardOperationalWindow`'s `deltaMW` to the forecast
 * during the hours that fall inside the window. The CI gets widened by
 * the disclosed `ciPlusMinus` to reflect the disclosure's own
 * uncertainty.
 */
export function applyDisclosureOverlay(
  baseline: ForecastSeries,
  windows: ForwardOperationalWindow[],
): ForecastSeries {
  if (windows.length === 0) return baseline;
  return baseline.map((p) => {
    const t = Date.parse(p.timestamp);
    let addMean = 0;
    let addCI = 0;
    for (const w of windows) {
      const ws = Date.parse(w.startUtc);
      const we = Date.parse(w.endUtc);
      if (t >= ws && t < we) {
        // Apply only during the window's daily duty cycle if specified.
        // For v0 we apply to every hour in the window; refining to duty
        // cycle is a follow-up.
        addMean += w.deltaMW;
        addCI = Math.max(addCI, w.ciPlusMinus);
      }
    }
    return {
      timestamp: p.timestamp,
      mean: p.mean + addMean,
      ciLow: p.ciLow + addMean - addCI,
      ciHigh: p.ciHigh + addMean + addCI,
    };
  });
}

// ---------------------------------------------------------------------------
// Memory events
// ---------------------------------------------------------------------------

export type MemoryEventKind =
  | "disclosure_in"
  | "disclosure_out"
  | "shed_request_in"
  | "shed_request_out"
  | "acknowledgment_in"
  | "acknowledgment_out"
  | "actuals_in"
  | "residual_computed"
  | "posterior_update"
  | "coach_suggestion";

interface BaseMemoryEvent {
  ts: string;
  caseId: string;
  kind: MemoryEventKind;
}

export interface DisclosureMemoryEvent extends BaseMemoryEvent {
  kind: "disclosure_in" | "disclosure_out";
  bundleHash: string;
  windowStart: string;
  windowEnd: string;
  deltaMW: number;
  ciPlusMinus: number;
  workloadType?: string;
  dailyDutyCycleHours?: number;
  repeats?: string;
}

export interface ActualsMemoryEvent extends BaseMemoryEvent {
  kind: "actuals_in";
  sourceBundleHash: string;
  windowStart: string;
  windowEnd: string;
  peakActualMW: number;
  meanActualMW: number;
  source: string;
}

export interface ResidualMemoryEvent extends BaseMemoryEvent {
  kind: "residual_computed";
  windowStart: string;
  disclosedDeltaMW: number;
  observedDeltaMW: number;
  residualMW: number;
  residualPercent: number;
}

export interface PosteriorUpdateEvent extends BaseMemoryEvent {
  kind: "posterior_update";
  priorCI: number;
  posteriorCI: number;
  basisEventCount: number;
}

export interface CoachSuggestionEvent extends BaseMemoryEvent {
  kind: "coach_suggestion";
  suggestionId: string;
  basis: string;
  recommendation: Record<string, unknown>;
}

export type MemoryEvent =
  | DisclosureMemoryEvent
  | ActualsMemoryEvent
  | ResidualMemoryEvent
  | PosteriorUpdateEvent
  | CoachSuggestionEvent
  | (BaseMemoryEvent & {
      kind:
        | "shed_request_in"
        | "shed_request_out"
        | "acknowledgment_in"
        | "acknowledgment_out";
      bundleHash: string;
      [key: string]: unknown;
    });

// ---------------------------------------------------------------------------
// Residual + posterior CI updater
// ---------------------------------------------------------------------------

export function computeResidual(
  disclosed: { deltaMW: number; ciPlusMinus: number; windowStart: string },
  observed: { peakDeltaMW: number; windowStart: string; caseId: string },
): ResidualMemoryEvent {
  const r = observed.peakDeltaMW - disclosed.deltaMW;
  return {
    ts: new Date().toISOString(),
    caseId: observed.caseId,
    kind: "residual_computed",
    windowStart: disclosed.windowStart,
    disclosedDeltaMW: disclosed.deltaMW,
    observedDeltaMW: observed.peakDeltaMW,
    residualMW: r,
    residualPercent: disclosed.deltaMW === 0 ? 0 : (100 * r) / disclosed.deltaMW,
  };
}

/**
 * Conjugate-flavored CI updater. Widens the CI band toward the running
 * RMS of recent residuals, weighted by sample count. Simple, monotone
 * in residual magnitude, easy to explain.
 *
 * Real Bayesian update over a normal-inverse-gamma prior is the
 * follow-up; this is the demo-grade version.
 */
export function updateCIBand(
  priorCI: number,
  recentResiduals: ResidualMemoryEvent[],
  weight = 0.5,
): number {
  if (recentResiduals.length === 0) return priorCI;
  const rmsResidual = Math.sqrt(
    recentResiduals.reduce((acc, r) => acc + r.residualMW * r.residualMW, 0) /
      recentResiduals.length,
  );
  // Weighted average of prior and observed residual RMS.
  return Math.round(priorCI * (1 - weight) + rmsResidual * weight);
}

// ---------------------------------------------------------------------------
// Deterministic insights — what a Coach Skill would surface, computed
// without any LLM call. The Coach Skill's job upstream is to wrap these
// with prose; the LLM does NOT generate the underlying data.
// ---------------------------------------------------------------------------

export interface Insight {
  /** Stable id so the UI can dedupe / animate. */
  id: string;
  severity: "info" | "warn" | "critical";
  /** One-line summary fit for a headline. */
  headline: string;
  /** Multi-line body with concrete numbers and recommended action. */
  body: string;
  /** Underlying signed events the insight cites. */
  citations: string[];
}

export function computeInsights(events: MemoryEvent[]): Insight[] {
  const out: Insight[] = [];

  // Insight 1: systematic undershoot pattern.
  const residuals = events.filter(
    (e): e is ResidualMemoryEvent => e.kind === "residual_computed",
  );
  if (residuals.length >= 3) {
    const last3 = residuals.slice(-3);
    const avgResidual =
      last3.reduce((acc, r) => acc + r.residualMW, 0) / last3.length;
    if (avgResidual > 15) {
      const recommend = Math.round(
        last3[last3.length - 1]!.disclosedDeltaMW + avgResidual,
      );
      out.push({
        id: "systematic_undershoot",
        severity: "warn",
        headline: `Last ${last3.length} runs undershot CI by ${Math.round(avgResidual)} MW`,
        body:
          `Disclosed peaks averaged ${Math.round(
            last3.reduce((a, r) => a + r.disclosedDeltaMW, 0) / last3.length,
          )} MW; observed averaged ${Math.round(
            last3.reduce((a, r) => a + r.observedDeltaMW, 0) / last3.length,
          )} MW. Recommend disclosing +${recommend} MW for similar workloads. ` +
          `Posterior CI should widen toward ±${Math.round(avgResidual * 1.2)} MW.`,
        citations: last3.map((r) => `residual@${r.windowStart}`),
      });
    }
  }

  // Insight 2: gen-test windows overlapping observed peak hours (deterministic
  // pattern detection — does not need LLM).
  const disclosures = events.filter(
    (e): e is DisclosureMemoryEvent =>
      e.kind === "disclosure_in" || e.kind === "disclosure_out",
  );
  const peakHours = [14, 15, 16, 17, 18, 19, 20]; // ET afternoon/evening peak
  for (const d of disclosures) {
    const startHourEt = (new Date(d.windowStart).getUTCHours() - 4 + 24) % 24;
    if (peakHours.includes(startHourEt) && d.workloadType?.includes("gentest")) {
      out.push({
        id: `gentest_overlap_${d.bundleHash.slice(7, 15)}`,
        severity: "info",
        headline: `Gen-test window at ${startHourEt}:00 ET overlaps grid peak`,
        body:
          `Rescheduling to 02:00–06:00 ET would avoid grid peak hours and ` +
          `qualify for off-peak demand-response credit (~$1,200/event).`,
        citations: [`bundle:${d.bundleHash}`],
      });
    }
  }

  // Insight 3: posterior CI growth (just a fact-surfacing one).
  const posteriors = events.filter(
    (e): e is PosteriorUpdateEvent => e.kind === "posterior_update",
  );
  if (posteriors.length > 0) {
    const last = posteriors[posteriors.length - 1]!;
    if (last.posteriorCI > last.priorCI * 1.5) {
      out.push({
        id: `posterior_widened_${last.ts}`,
        severity: "info",
        headline: `Posterior CI widened ${last.priorCI} → ${last.posteriorCI} MW`,
        body:
          `Based on ${last.basisEventCount} residual event(s). The forecaster ` +
          `now expects more uncertainty for similar workload disclosures.`,
        citations: [`posterior@${last.ts}`],
      });
    }
  }

  return out;
}
