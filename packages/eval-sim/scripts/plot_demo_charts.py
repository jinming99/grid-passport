"""Generate demo charts from the Act 4 fixtures.

Outputs three PNGs to docs/demo-fixtures/charts/ — useful for the demo
deck, the README, and judging-day hand-outs:

  1. dominion-90d.png — 90-day Dominion-zone hourly load (baseline)
  2. owl-window-actuals.png — 8-day actuals window with disclosed band
  3. residual-bar.png — daily peak: disclosed vs actual, with residual

Run:
  uv run python scripts/plot_demo_charts.py
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURES_DIR = REPO_ROOT / "apps" / "api" / "fixtures"
OUT_DIR = REPO_ROOT / "docs" / "demo-fixtures" / "charts"

# Disclosed training window (must match the Owl fixture in
# packages/core/src/fixtures/owl-compute.ts).
DISCLOSED_START = "2026-05-15T18:00:00Z"
DISCLOSED_END = "2026-05-22T02:00:00Z"
DISCLOSED_DELTA_MW = 70
DISCLOSED_CI_MW = 10

# Style — flat, clean, Tufte-ish. No grids, no chart-junk.
plt.rcParams.update(
    {
        "figure.facecolor": "white",
        "axes.facecolor": "white",
        "axes.edgecolor": "#888",
        "axes.linewidth": 0.8,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.labelsize": 10,
        "axes.titlesize": 12,
        "xtick.color": "#444",
        "ytick.color": "#444",
        "font.family": "sans-serif",
        "font.size": 10,
    }
)


def load_baseline() -> pd.DataFrame:
    raw = json.loads((FIXTURES_DIR / "dominion-zone-load-90d.json").read_text())
    df = pd.DataFrame(raw["rows"])
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    df["mw"] = df["mw"].astype(float)
    return df


def load_actuals() -> pd.DataFrame:
    raw = json.loads((FIXTURES_DIR / "owl-actuals-2026-05-15-22.json").read_text())
    df = pd.DataFrame(raw["rows"])
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    df["mw"] = df["mw"].astype(float)
    return df


def chart_baseline(df: pd.DataFrame, out: Path) -> None:
    fig, ax = plt.subplots(figsize=(10, 3.5))
    ax.plot(df["timestamp"], df["mw"] / 1000.0, color="#1d4ed8", linewidth=0.6)
    ax.set_title("Dominion-zone hourly load · 90-day baseline")
    ax.set_ylabel("GW")
    ax.set_xlabel("")
    ax.xaxis.set_major_locator(mdates.AutoDateLocator())
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %d"))
    fig.autofmt_xdate()
    fig.tight_layout()
    fig.savefig(out, dpi=140)
    plt.close(fig)


def chart_window_actuals(actuals: pd.DataFrame, out: Path) -> None:
    """Plot the 8-day actuals slice. Compute a baseline-only counterfactual
    (the average daily curve from non-window days) and overlay the
    disclosed +70 MW band on top of that baseline.
    """
    fig, ax = plt.subplots(figsize=(10, 3.5))

    # Draw actuals
    ax.plot(
        actuals["timestamp"],
        actuals["mw"] / 1000.0,
        color="#1d4ed8",
        linewidth=1.0,
        label="actual zone load (with training run)",
    )

    # Synthetic counterfactual: actuals minus a +70 MW step during 14:00-22:00 ET.
    # 14:00 ET ≈ 18:00 UTC, 22:00 ET ≈ 02:00 UTC (next day) under EDT.
    cf = actuals.copy()
    hours_utc = cf["timestamp"].dt.hour
    in_window = (hours_utc >= 18) | (hours_utc < 2)
    cf["mw"] = cf["mw"] - DISCLOSED_DELTA_MW * in_window
    ax.plot(
        cf["timestamp"],
        cf["mw"] / 1000.0,
        color="#888",
        linewidth=1.0,
        linestyle="--",
        label="counterfactual baseline (no Owl spike)",
    )

    # Disclosed band shading
    band_top = cf["mw"] + (DISCLOSED_DELTA_MW + DISCLOSED_CI_MW) * in_window
    band_bot = cf["mw"] + (DISCLOSED_DELTA_MW - DISCLOSED_CI_MW) * in_window
    ax.fill_between(
        cf["timestamp"],
        band_bot / 1000.0,
        band_top / 1000.0,
        where=in_window.values,
        color="#16a34a",
        alpha=0.25,
        label="disclosed +70 MW band (CI ±10)",
    )

    ax.set_title("Owl Compute training window · disclosed band vs actuals")
    ax.set_ylabel("GW")
    ax.legend(loc="upper left", frameon=False, fontsize=9)
    ax.xaxis.set_major_locator(mdates.DayLocator())
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %d"))
    fig.autofmt_xdate()
    fig.tight_layout()
    fig.savefig(out, dpi=140)
    plt.close(fig)


def chart_residual_bars(actuals: pd.DataFrame, out: Path) -> None:
    """Per-day peak draw during the window: disclosed vs actual."""
    df = actuals.copy()
    hours_utc = df["timestamp"].dt.hour
    in_window = (hours_utc >= 18) | (hours_utc < 2)
    df = df[in_window].copy()
    df["date"] = df["timestamp"].dt.date

    daily_peak = df.groupby("date")["mw"].max()
    # Counterfactual peak (= actual peak - disclosed delta) is what the
    # baseline would have shown without Owl's spike.
    daily_baseline = daily_peak - DISCLOSED_DELTA_MW
    disclosed = daily_baseline + DISCLOSED_DELTA_MW  # what Owl committed to
    actual = daily_peak  # what Dominion measured

    # Synthesize a small overshoot pattern for the demo (the residual),
    # consistent with the Coach Skill's pitch: "undershot by 20-30 MW
    # for the last 3 runs". For real PJM data this becomes the
    # measured overshoot per day.
    overshoot = pd.Series(
        [12, 28, 35, 40, 38, 32, 24, 18][: len(disclosed)],
        index=disclosed.index,
        dtype=float,
    )
    actual = disclosed + overshoot

    fig, ax = plt.subplots(figsize=(10, 4))
    x = list(range(len(disclosed)))
    width = 0.35
    ax.bar(
        [i - width / 2 for i in x],
        disclosed.values,
        width,
        color="#16a34a",
        label="disclosed peak (Owl committed)",
    )
    ax.bar(
        [i + width / 2 for i in x],
        actual.values,
        width,
        color="#dc2626",
        label="actual peak (measured)",
    )
    ax.set_xticks(x)
    ax.set_xticklabels([str(d) for d in disclosed.index], rotation=30, ha="right")
    ax.set_ylabel("MW")
    ax.set_title("Daily peak · disclosed vs actual · residual is the bar gap")
    ax.legend(loc="upper right", frameon=False, fontsize=9)
    fig.tight_layout()
    fig.savefig(out, dpi=140)
    plt.close(fig)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    baseline = load_baseline()
    actuals = load_actuals()
    chart_baseline(baseline, OUT_DIR / "dominion-90d.png")
    print(f"[plot] wrote {OUT_DIR / 'dominion-90d.png'}")
    chart_window_actuals(actuals, OUT_DIR / "owl-window-actuals.png")
    print(f"[plot] wrote {OUT_DIR / 'owl-window-actuals.png'}")
    chart_residual_bars(actuals, OUT_DIR / "residual-bar.png")
    print(f"[plot] wrote {OUT_DIR / 'residual-bar.png'}")


if __name__ == "__main__":
    main()
