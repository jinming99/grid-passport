# Pilot scores — summary

Cells scored: **12**

## Per-scorer totals (subset)

| scorer | calls | prompt tokens (est) | completion tokens (est) | wall (s) |
|---|---:|---:|---:|---:|
| `robustness` | 12 | 78,604 | 645 | 156.8 |
| `direct` | 60 | 83,055 | 4,429 | 502.3 |
| `efficiency` | 0 | 0 | 0 | 0.0 |
| `judge` | 24 | 215,316 | 36,767 | 1358.3 |
| `mechanical` | 0 | 0 | 0 | 0.0 |
| `trace` | 90 | 140,445 | 9,304 | 770.9 |

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

## §8b robustness — OPR per condition (vs Oracle)

| scenario | seed | condition | OPR scalar | band_acc | firm_pres | flex_acc | block_recall | reg_comp |
|---|---|---|---:|---:|---:|---:|---:|---:|
| `S1` | `seed00` | `B` | 0.8678 | 1.0 | 0.9444 | 1.0 | 1.0 | 0.3947 |
| `S1` | `seed00` | `C` | 1.1848 | 1.7692 | 0.9444 | 1.0 | 1.0 | 1.2105 |
| `S1` | `seed00` | `D` | 1.196 | 1.7692 | 1.0 | 1.0 | 1.0 | 1.2105 |
| `S2` | `seed00` | `B` | 0.9477 | 0.8077 | 1.3077 | 1.0 | 1.0 | 0.623 |
| `S2` | `seed00` | `C` | 1.0359 | 1.0 | 0.8462 | 1.3333 | 1.0 | 1.0 |
| `S2` | `seed00` | `D` | 0.9949 | 1.0 | 1.3077 | 1.0 | 0.6667 | 1.0 |
| `S3` | `seed00` | `B` | 0.9217 | 1.0 | 1.0 | 1.0 | 1.0 | 0.6087 |
| `S3` | `seed00` | `C` | 1.147 | 1.5556 | 0.875 | 1.0 | 1.0 | 1.3043 |
| `S3` | `seed00` | `D` | 1.1164 | 1.2778 | 1.0 | 1.0 | 1.0 | 1.3043 |

### Savage regret (range-normalized, across all conditions per seed)

| scenario | seed | condition | max | mean | hurwicz(α=0.5) |
|---|---|---|---:|---:|---:|
| `S1` | `seed00` | `A` | 0.3455 | 0.1818 | 0.2636 |
| `S1` | `seed00` | `B` | 0.6 | 0.5333 | 0.5667 |
| `S1` | `seed00` | `C` | 0.2 | 0.2 | 0.2 |
| `S1` | `seed00` | `D` | 0.0 | 0.0 | 0.0 |
| `S2` | `seed00` | `A` | 0.3333 | 0.1833 | 0.2583 |
| `S2` | `seed00` | `B` | 0.6 | 0.3 | 0.45 |
| `S2` | `seed00` | `C` | 0.2 | 0.2 | 0.2 |
| `S2` | `seed00` | `D` | 0.4 | 0.25 | 0.325 |
| `S3` | `seed00` | `A` | 0.3 | 0.2222 | 0.2611 |
| `S3` | `seed00` | `B` | 0.4 | 0.3333 | 0.3667 |
| `S3` | `seed00` | `C` | 0.2 | 0.2 | 0.2 |
| `S3` | `seed00` | `D` | 0.2 | 0.0667 | 0.1333 |

## Deferred (v0 batch)

- `privacy.inferential` (§8c.ii): needs Presidio-anonymized public-only baseline + Staab probe runs. Separate lift.
- `mechanical.h_workflow / h_spec / h_trigger` (§8d): need per-turn validator-pass + source_refs metadata that is not persisted on ledgers today. Ledger-shape extension + rescore.

