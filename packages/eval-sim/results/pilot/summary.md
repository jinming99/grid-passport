# Pilot scores — summary

Cells scored: **12**

## Per-scorer totals (subset)

| scorer | calls | prompt tokens (est) | completion tokens (est) | wall (s) |
|---|---:|---:|---:|---:|
| `judge` | 12 | 107,658 | 17,944 | 651.5 |
| `mechanical` | 0 | 0 | 0 | 0.0 |
| `direct` | 60 | 83,055 | 6,293 | 1059.8 |
| `trace` | 90 | 111,151 | 12,604 | 2768.0 |
| `efficiency` | 0 | 0 | 0 | 0.0 |

## Per-cell headline scores

| cell | rounds | days | h_null | direct (wls) | trace (n/wls) | judge (sa/pd/pi/ra/ae) |
|---|---:|---:|---:|---:|---|---|
| `S1_A_seed00` | 2 | 0.0 | 1 | 2.6019 | 3 / 2.053 | 5/4/2/4/3 |
| `S1_B_seed00` | 10 | 37.0 | 4 | 3.4857 | 6 / 3.1375 | 3/2/3/2/3 |
| `S1_C_seed00` | 6 | 10.0 | 1 | 0.0 | 1 / 0.415 | 1/2/5/2/3 |
| `S1_D_seed00` | 6 | 10.0 | 0 | 0.0 | 2 / 0.86 | 5/4/5/4/4 |
| `S2_A_seed00` | 2 | 0.0 | 0 | 1.3365 | 1 / 0.679 | 3/4/2/3/2 |
| `S2_B_seed00` | 10 | 37.0 | 4 | 0.0 | 4 / 2.095 | 3/3/4/3/3 |
| `S2_C_seed00` | 5 | 8.0 | 0 | 0.0 | 1 / 0.665 | 2/3/4/4/3 |
| `S2_D_seed00` | 6 | 10.0 | 0 | 0.0 | 4 / 2.082 | 5/4/5/4/4 |
| `S3_A_seed00` | 2 | 0.0 | 1 | 2.1519 | 3 / 1.876 | 5/4/3/3/3 |
| `S3_B_seed00` | 5 | 27.0 | 0 | 0.0 | 1 / 0.36 | 4/3/3/4/4 |
| `S3_C_seed00` | 6 | 10.0 | 0 | 0.0 | 3 / 1.502 | 4/3/5/4/4 |
| `S3_D_seed00` | 6 | 10.0 | 0 | 0.0 | 2 / 0.825 | 4/4/5/4/4 |

## Deferred (v0 batch)

- `privacy.inferential` (§8c.ii): needs Presidio-anonymized public-only baseline + Staab probe runs. Separate lift.
- `robustness` (§8b): needs CandidatePlan extraction from each run's artifacts + per-future scoring (§7.7). Separate lift.
- `mechanical.h_workflow / h_spec / h_trigger` (§8d): need per-turn validator-pass + source_refs metadata that is not persisted on ledgers today. Ledger-shape extension + rescore.
- `judge` swap-augmentation (§5d): v0 runs one Opus call per ledger; two-run + disagreement detection is a follow-up.

