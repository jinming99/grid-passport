# Pilot scores — summary

Cells scored: **12**

## Per-scorer totals (subset)

| scorer | calls | prompt tokens (est) | completion tokens (est) | wall (s) |
|---|---:|---:|---:|---:|
| `mechanical` | 0 | 0 | 0 | 0.0 |
| `judge` | 24 | 215,316 | 36,767 | 1358.3 |
| `direct` | 60 | 83,055 | 4,429 | 502.3 |
| `trace` | 90 | 140,445 | 9,304 | 770.9 |
| `efficiency` | 0 | 0 | 0 | 0.0 |

## Per-cell headline scores

| cell | rounds | days | h_null | direct (wls) | trace (n/wls) | judge (sa/pd/pi/ra/ae) |
|---|---:|---:|---:|---:|---|---|
| `S1_A_seed00` | 2 | 0.0 | 1 | 2.6019 | 3 / 2.001 | 4/4/2/4/2 |
| `S1_B_seed00` | 10 | 37.0 | 4 | 3.4938 | 0 / 0.0 | 3/3/2/2/2 |
| `S1_C_seed00` | 6 | 10.0 | 1 | 0.0 | 0 / 0.0 | 2/2/4/2/3 |
| `S1_D_seed00` | 6 | 10.0 | 0 | 0.0 | 0 / 0.0 | 4/4/4/4/4 |
| `S2_A_seed00` | 2 | 0.0 | 0 | 1.3275 | 0 / 0.0 | 2/4/1/3/2 |
| `S2_B_seed00` | 10 | 37.0 | 4 | 0.0 | 0 / 0.0 | 4/3/4/3/4 |
| `S2_C_seed00` | 5 | 8.0 | 0 | 0.0 | 0 / 0.0 | 2/3/4/4/2* |
| `S2_D_seed00` | 6 | 10.0 | 0 | 0.0 | 0 / 0.0 | 5/4/5/4/4 |
| `S3_A_seed00` | 2 | 0.0 | 1 | 1.791 | 3 / 1.805 | 5/4/2/3/4 |
| `S3_B_seed00` | 5 | 27.0 | 0 | 0.0 | 0 / 0.0 | 2/3/4/3/2* |
| `S3_C_seed00` | 6 | 10.0 | 0 | 0.0 | 0 / 0.0 | 3/4/5/4/4 |
| `S3_D_seed00` | 6 | 10.0 | 0 | 0.0 | 0 / 0.0 | 4/4/5/5/4 |

## Deferred (v0 batch)

- `privacy.inferential` (§8c.ii): needs Presidio-anonymized public-only baseline + Staab probe runs. Separate lift.
- `robustness` (§8b): needs CandidatePlan extraction from each run's artifacts + per-future scoring (§7.7). Separate lift.
- `mechanical.h_workflow / h_spec / h_trigger` (§8d): need per-turn validator-pass + source_refs metadata that is not persisted on ledgers today. Ledger-shape extension + rescore.
- `judge` swap-augmentation (§5d): v0 runs one Opus call per ledger; two-run + disagreement detection is a follow-up.

