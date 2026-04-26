"""PJM Data Miner 2 ingest, with offline-deterministic fallback for the demo.

Three-tier resolution per request:
  1. cache         — 24h TTL JSON in apps/api/cache/pjm/
  2. live          — api.pjm.com/api/v1/hrl_load_metered (requires PJM_API_KEY)
  3. synthetic     — deterministic Dominion-shaped zone load

Every response carries meta.source ∈ {"cache", "live", "synthetic"} so the
caller (and the UI) can show exactly which data is on screen. The CLAUDE.md
demo rule is explicit: synthetic data must be labeled. We obey.

Shape of synthetic load mirrors real PJM Dominion zone behavior:
  - ~18.5 GW baseline
  - diurnal: peak ~15:00 UTC, trough ~04:00 UTC, ±22%
  - weekly: weekday → 1.00, weekend → 0.92
  - seasonal: summer +5%, winter ±0
  - noise: deterministic ±100 MW from sha256(timestamp)
"""

from __future__ import annotations

import hashlib
import json
import math
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Literal

import httpx

PJM_API_BASE = "https://api.pjm.com/api/v1"
PJM_API_KEY = os.environ.get("PJM_API_KEY", "")
CACHE_DIR = Path(__file__).resolve().parent.parent / "cache" / "pjm"
CACHE_TTL_SECONDS = 24 * 60 * 60


def _ensure_cache_dir() -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _cache_key(zone: str, start: datetime, end: datetime) -> str:
    raw = f"{zone}|{start.isoformat()}|{end.isoformat()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _try_cache(key: str) -> dict[str, Any] | None:
    _ensure_cache_dir()
    path = CACHE_DIR / f"{key}.json"
    if not path.exists():
        return None
    try:
        with open(path) as f:
            data = json.load(f)
        ts = datetime.fromisoformat(data["meta"]["fetchedAt"])
        age = (datetime.now(timezone.utc) - ts).total_seconds()
        if age > CACHE_TTL_SECONDS:
            return None
        return data
    except (json.JSONDecodeError, KeyError, ValueError):
        return None


def _write_cache(key: str, data: dict[str, Any]) -> None:
    _ensure_cache_dir()
    path = CACHE_DIR / f"{key}.json"
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def _synthetic_load(start: datetime, end: datetime) -> list[dict[str, Any]]:
    """Deterministic Dominion-zone-shaped hourly load."""
    rows: list[dict[str, Any]] = []
    cur = start
    base_mw = 18500.0
    while cur < end:
        hour = cur.hour
        dow = cur.weekday()
        doy = cur.timetuple().tm_yday

        diurnal = 0.78 + 0.22 * math.sin((hour - 4) * math.pi / 12)
        weekly = 1.0 if dow < 5 else 0.92
        seasonal = 1.0 + 0.025 * (1.0 + math.cos((doy - 200) * 2 * math.pi / 365))

        mw = base_mw * diurnal * weekly * seasonal

        seed_int = int(hashlib.sha256(cur.isoformat().encode()).hexdigest()[:8], 16)
        noise = ((seed_int % 1000) / 1000.0 - 0.5) * 200.0
        mw += noise

        rows.append(
            {
                "datetimeUtc": cur.replace(tzinfo=timezone.utc).isoformat(),
                "loadMW": round(mw, 1),
            }
        )
        cur += timedelta(hours=1)
    return rows


def _fetch_live(
    zone: str, start: datetime, end: datetime
) -> list[dict[str, Any]] | None:
    """Hit api.pjm.com/api/v1/hrl_load_metered. Returns None on any failure."""
    if not PJM_API_KEY:
        return None
    try:
        response = httpx.get(
            f"{PJM_API_BASE}/hrl_load_metered",
            params={
                "rowCount": 50000,
                "startRow": 1,
                "format": "json",
                "zone_name": zone,
                "datetime_beginning_utc": start.isoformat(),
                "datetime_ending_utc": end.isoformat(),
            },
            headers={"Ocp-Apim-Subscription-Key": PJM_API_KEY},
            timeout=15.0,
        )
        response.raise_for_status()
        payload = response.json()
        items = payload.get("items", [])
        return [
            {
                "datetimeUtc": item["datetime_beginning_utc"],
                "loadMW": float(item["mw"]),
            }
            for item in items
        ]
    except (httpx.HTTPError, KeyError, ValueError, TypeError):
        return None


def fetch_load(
    zone: str,
    start: datetime,
    end: datetime,
) -> dict[str, Any]:
    """Fetch hourly load for a PJM zone over a date range.

    Resolution order: cache → live PJM API (if PJM_API_KEY) → synthetic.
    Response always carries meta.source so the UI can label provenance.
    """
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)

    key = _cache_key(zone, start, end)

    cached = _try_cache(key)
    if cached is not None:
        cached["meta"]["source"] = "cache"
        return cached

    source: Literal["live", "synthetic"] = "synthetic"
    rows = _fetch_live(zone, start, end)
    if rows is not None and len(rows) > 0:
        source = "live"
    else:
        rows = _synthetic_load(start, end)

    out = {
        "meta": {
            "zone": zone,
            "start": start.isoformat(),
            "end": end.isoformat(),
            "source": source,
            "fetchedAt": datetime.now(timezone.utc).isoformat(),
            "rowCount": len(rows),
        },
        "rows": rows,
    }
    _write_cache(key, out)
    return out


def fetch_recent(zone: str = "DOMINION", days: int = 7) -> dict[str, Any]:
    """Convenience: last `days` days of hourly load, ending now (UTC)."""
    end = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    start = end - timedelta(days=days)
    return fetch_load(zone, start, end)
