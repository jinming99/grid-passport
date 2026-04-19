# @grid-passport/verifier-py

Python reference verifier for Grid Passport disclosure bundles v1.0.0.

**Purpose.** Demonstrates that the bundle protocol is portable — any party
with the applicant's pinned Ed25519 public key can independently verify a
bundle using only standards-compliant primitives, with no dependency on
the Grid Passport codebase. A utility intake system that prefers Python
over TypeScript can re-implement verification in ~200 LoC.

See `docs/design/signed-bundle.md` for the design rationale and
`docs/design/signed-bundle-spec.md` for the normative algorithm.

## Dependencies

- Python 3.8+
- [`cryptography`](https://cryptography.io/) ≥ 2.6 (for Ed25519)

No other runtime dependencies. JCS canonicalization, SHA-256, base64, and
the audit-chain check are implemented inline in `grid_passport_verifier.py`
(~250 LoC including docstrings).

## Usage

```bash
python grid_passport_verifier.py <bundle.json> <pubkey.b64-or-hex>
```

Exit codes:
- `0` — bundle valid
- `1` — bundle invalid (signature fails, tampered, key mismatch)
- `2` — malformed input (not JSON, wrong pubkey length, usage error)

## Cross-implementation roundtrip test

```bash
# From repo root:
pnpm --filter @grid-passport/verifier exec tsx scripts/emit-fixture.ts /tmp/gp-fixture
python3 apps/verifier-py/grid_passport_verifier.py /tmp/gp-fixture/bundle.json /tmp/gp-fixture/pubkey.b64
# expect: [verify-py] ok · keyId=<hex> · N audit events
```

The `pnpm canary:roundtrip` script wires this into CI.

## Intentional design choices

- **Single file.** The entire verifier fits on one screen. If a reviewer
  can't read it in an afternoon, we've failed.
- **No Grid Passport imports.** Not even for types. A utility's security
  team should be able to vendor this file into their stack without
  pulling in our workspace.
- **Matches the TS verifier line-by-line.** Every check in
  `packages/verifier/src/index.ts` has a counterpart here with the same
  rejection reason. Divergence is a spec bug, caught by the roundtrip
  canary.
