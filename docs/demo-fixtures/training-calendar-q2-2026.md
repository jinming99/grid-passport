---
title: "Owl Compute · Q2 2026 Training Schedule"
author: "Operations Planning"
date: "2026-04-22"
geometry: margin=1in
fontsize: 11pt
---

# Owl Compute · Q2 2026 Training Schedule

**Confidential — Internal Distribution Only**

| Field | Value |
|---|---|
| Prepared by | Operations Planning |
| Owner | Sarah Chen — `sarah.chen@owlcompute.example` |
| Document version | v1.3 |
| Approved by | Site Reliability + Capacity Planning |
| Approval date | 2026-04-22 |

## Approved Training Run

| Field | Value |
|---|---|
| Model | Falcon-VL-72B retrain |
| Window | May 15 – May 22, 2026 |
| Daily duty window | 14:00 – 22:00 ET |
| Expected peak delta | +70 MW |
| Confidence | High (~88%) |
| CI band | ±10 MW |
| Repeat pattern | Daily through window |
| Workload class | Training (large-batch) |
| Reference run | Q4 2025 retrain (similar utilization profile) |

## Notes

- Coordinated with site ops; HVAC envelope confirmed for sustained 14:00–22:00 daily peak through the full 8-day window.
- Backup-gen and BESS posture unchanged for the duration. **No flexibility commitments are offered for this window** — the run is throughput-bound and shifting it costs more than the curtailment credit.
- Window concludes 2026-05-22 02:00 UTC (= 22:00 ET on May 21 / 02:00 ET May 22).
- This calendar supersedes the v1.2 placeholder window in the Q2 schedule.

## Disclosure decision

Per Owl Compute's Q2 disclosure policy, this calendar is being shared with Dominion Energy via Grid Passport's signed-disclosure path.

What crosses the boundary:

- Window (start, end)
- Expected delta MW
- Confidence interval (CI ±)

What stays sealed on Owl infrastructure:

- Workload type (training vs. inference)
- Daily duty cycle (8 hr/day)
- Repeat pattern (daily through window)
- Source document hash + filename

---

*This document stays on Owl Compute infrastructure. Only the structured fact (window + delta MW + CI band) is signed and transmitted to Dominion. Original PDF is hashed locally; the hash is the only reference that crosses.*
